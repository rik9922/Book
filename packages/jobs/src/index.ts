import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("job-manager");

export interface JobManager {
  addJob<T = any>(queueName: string, jobName: string, data: T, opts?: any): Promise<void>;
  registerWorker<T = any>(
    queueName: string,
    processor: (job: { name: string; data: T; id?: string }) => Promise<any>
  ): void;
  close(): Promise<void>;
}

class InMemoryJobManager implements JobManager {
  private workers = new Map<string, Array<(job: any) => Promise<any>>>();

  async addJob<T>(queueName: string, jobName: string, data: T): Promise<void> {
    logger.debug({ queueName, jobName }, "[InMemoryJobManager] Enqueued job");
    const registered = this.workers.get(queueName) || [];
    setTimeout(async () => {
      for (const worker of registered) {
        try {
          await worker({ name: jobName, data, id: `job-${Date.now()}` });
        } catch (err) {
          logger.error({ err, queueName, jobName }, "[InMemoryJobManager] Job execution failure");
        }
      }
    }, 10);
  }

  registerWorker<T>(queueName: string, processor: (job: { name: string; data: T; id?: string }) => Promise<any>): void {
    const list = this.workers.get(queueName) || [];
    list.push(processor);
    this.workers.set(queueName, list);
    logger.debug({ queueName }, "[InMemoryJobManager] Registered worker");
  }

  async close(): Promise<void> {
    this.workers.clear();
  }
}

class BullMQJobManager implements JobManager {
  private redis: Redis;
  private queues = new Map<string, Queue>();
  private activeWorkers: Worker[] = [];

  constructor(redis: Redis) {
    this.redis = redis;
  }

  private getQueue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });
      this.queues.set(name, q);
    }
    return q;
  }

  async addJob<T>(queueName: string, jobName: string, data: T, opts?: any): Promise<void> {
    const q = this.getQueue(queueName);
    await q.add(jobName, data, opts);
    logger.info({ queueName, jobName }, "[BullMQ] Job enqueued");
  }

  registerWorker<T>(
    queueName: string,
    processor: (job: { name: string; data: T; id?: string }) => Promise<any>
  ): void {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        logger.info({ queueName, jobId: job.id, jobName: job.name }, "[BullMQ] Processing job");
        return processor({ name: job.name, data: job.data, id: job.id });
      },
      { connection: this.redis }
    );

    worker.on("failed", (job, err) => {
      logger.error({ queueName, jobId: job?.id, err }, "[BullMQ] Job failed");
    });

    this.activeWorkers.push(worker);
  }

  async close(): Promise<void> {
    for (const w of this.activeWorkers) {
      await w.close();
    }
    for (const q of this.queues.values()) {
      await q.close();
    }
    await this.redis.quit();
  }
}

export function createJobManager(redisUrl = process.env.REDIS_URL): JobManager {
  // If no REDIS_URL explicitly configured or running in test without redis, use in-memory manager
  if (!redisUrl || process.env.NODE_ENV === "test") {
    return new InMemoryJobManager();
  }

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
      retryStrategy: () => null,
    });

    redis.on("error", (err) => {
      logger.warn({ err: err.message }, "[JobManager] Redis error");
    });

    return new BullMQJobManager(redis);
  } catch {
    return new InMemoryJobManager();
  }
}
