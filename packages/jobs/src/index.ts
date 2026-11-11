import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("job-manager");

export interface QueueTelemetryStats {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
}

export interface DeadLetterJobSummary {
  queueName: string;
  jobId: string;
  jobName: string;
  failedReason: string;
  attemptsMade: number;
}

export interface JobManager {
  addJob<T = any>(queueName: string, jobName: string, data: T, opts?: any): Promise<void>;
  registerWorker<T = any>(
    queueName: string,
    processor: (job: { name: string; data: T; id?: string }) => Promise<any>
  ): void;
  getQueueTelemetry?(queueNames: string[]): Promise<{
    queues: QueueTelemetryStats[];
    deadLetterJobs: DeadLetterJobSummary[];
  }>;
  retryFailedJob?(queueName: string, jobId?: string): Promise<{ retriedCount: number }>;
  close(): Promise<void>;
}

class InMemoryJobManager implements JobManager {
  private workers = new Map<string, Array<(job: any) => Promise<any>>>();
  private timers = new Set<NodeJS.Timeout>();
  private completedCounts = new Map<string, number>();
  private failedJobs = new Map<string, DeadLetterJobSummary[]>();
  private closed = false;

  async addJob<T>(queueName: string, jobName: string, data: T): Promise<void> {
    if (this.closed) return;
    logger.debug({ queueName, jobName }, "[InMemoryJobManager] Enqueued job");
    const registered = this.workers.get(queueName) || [];
    const timer = setTimeout(async () => {
      this.timers.delete(timer);
      if (this.closed) return;
      for (const worker of registered) {
        if (this.closed) break;
        const jobId = `job-${Date.now()}`;
        try {
          await worker({ name: jobName, data, id: jobId });
          this.completedCounts.set(queueName, (this.completedCounts.get(queueName) || 0) + 1);
        } catch (err) {
          logger.error({ err, queueName, jobName }, "[InMemoryJobManager] Job execution failure");
          const list = this.failedJobs.get(queueName) || [];
          list.push({
            queueName,
            jobId,
            jobName,
            failedReason: err instanceof Error ? err.message : String(err),
            attemptsMade: 1,
          });
          this.failedJobs.set(queueName, list);
        }
      }
    }, 10);
    this.timers.add(timer);
  }

  registerWorker<T>(queueName: string, processor: (job: { name: string; data: T; id?: string }) => Promise<any>): void {
    const list = this.workers.get(queueName) || [];
    list.push(processor);
    this.workers.set(queueName, list);
    logger.debug({ queueName }, "[InMemoryJobManager] Registered worker");
  }

  async getQueueTelemetry(queueNames: string[]) {
    const queues: QueueTelemetryStats[] = queueNames.map((name) => ({
      name,
      active: 0,
      waiting: 0,
      completed: this.completedCounts.get(name) || 0,
      failed: (this.failedJobs.get(name) || []).length,
    }));
    const deadLetterJobs: DeadLetterJobSummary[] = queueNames.flatMap((name) => this.failedJobs.get(name) || []);
    return { queues, deadLetterJobs };
  }

  async retryFailedJob(queueName: string, jobId?: string) {
    const list = this.failedJobs.get(queueName) || [];
    if (!jobId || jobId === "latest") {
      const count = list.length;
      this.failedJobs.set(queueName, []);
      return { retriedCount: count };
    }
    const next = list.filter((j) => j.jobId !== jobId);
    this.failedJobs.set(queueName, next);
    return { retriedCount: list.length - next.length };
  }

  async close(): Promise<void> {
    this.closed = true;
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.workers.clear();
  }
}

class BullMQJobManager implements JobManager {
  private queueRedis: Redis;
  private workerConnections: Redis[] = [];
  private queues = new Map<string, Queue>();
  private activeWorkers: Worker[] = [];

  constructor(queueRedis: Redis) {
    this.queueRedis = queueRedis;
  }

  private getQueue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.queueRedis,
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
    // BullMQ Workers issue blocking BRPOPLPUSH/BZPOPMIN commands and MUST own a dedicated connection
    const workerRedis = this.queueRedis.duplicate({ maxRetriesPerRequest: null });
    workerRedis.on("error", (err) => {
      logger.error({ err: err.message, queueName }, "[BullMQ Worker] Redis connection error");
    });
    this.workerConnections.push(workerRedis);

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        logger.info({ queueName, jobId: job.id, jobName: job.name }, "[BullMQ] Processing job");
        return processor({ name: job.name, data: job.data, id: job.id });
      },
      { connection: workerRedis }
    );

    worker.on("failed", (job, err) => {
      logger.error({ queueName, jobId: job?.id, err }, "[BullMQ] Job failed");
    });

    this.activeWorkers.push(worker);
  }

  async getQueueTelemetry(queueNames: string[]) {
    const queues: QueueTelemetryStats[] = [];
    const deadLetterJobs: DeadLetterJobSummary[] = [];

    for (const name of queueNames) {
      const q = this.getQueue(name);
      const [counts, failed] = await Promise.all([
        q.getJobCounts("active", "waiting", "completed", "failed"),
        q.getFailed(0, 24),
      ]);
      queues.push({
        name,
        active: counts.active || 0,
        waiting: counts.waiting || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      });
      for (const job of failed) {
        deadLetterJobs.push({
          queueName: name,
          jobId: String(job.id ?? ""),
          jobName: job.name,
          failedReason: job.failedReason || "Job failed",
          attemptsMade: job.attemptsMade || 1,
        });
      }
    }

    return { queues, deadLetterJobs };
  }

  async retryFailedJob(queueName: string, jobId?: string) {
    const q = this.getQueue(queueName);
    if (!jobId || jobId === "latest") {
      const failed = await q.getFailed(0, 10);
      let retriedCount = 0;
      for (const job of failed) {
        await job.retry();
        retriedCount++;
      }
      return { retriedCount };
    }
    const job = await q.getJob(jobId);
    if (!job) return { retriedCount: 0 };
    await job.retry();
    return { retriedCount: 1 };
  }

  async close(): Promise<void> {
    for (const w of this.activeWorkers) {
      await w.close();
    }
    for (const q of this.queues.values()) {
      await q.close();
    }
    for (const conn of this.workerConnections) {
      await conn.quit().catch(() => conn.disconnect());
    }
    await this.queueRedis.quit().catch(() => this.queueRedis.disconnect());
  }
}

export function createJobManager(redisUrl?: string): JobManager {
  let targetUrl = redisUrl || process.env.REDIS_URL;
  if (!targetUrl && process.env.REDIS_HOST) {
    const auth = process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : "";
    const port = process.env.REDIS_PORT || 6379;
    targetUrl = `redis://${auth}${process.env.REDIS_HOST}:${port}`;
  }

  // Default to standard local Redis if unset in development
  if (!targetUrl && process.env.NODE_ENV !== "test") {
    targetUrl = "redis://127.0.0.1:6379";
  }

  // If in explicit isolated test mode without Redis requested, fallback safely
  if (process.env.NODE_ENV === "test" && !process.env.ENABLE_TEST_REDIS) {
    logger.debug("[JobManager] Using InMemoryJobManager for isolated test execution");
    return new InMemoryJobManager();
  }

  if (!targetUrl) {
    throw new Error("[JobManager] Redis connection required in non-test mode. Specify REDIS_URL or REDIS_HOST:REDIS_PORT.");
  }

  try {
    const redis = new Redis(targetUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redis.on("error", (err) => {
      logger.error({ err: err.message }, "[JobManager] Redis connection error");
    });

    logger.info({ targetUrl: targetUrl.replace(/:[^:@]+@/, ":***@") }, "[JobManager] Connected to BullMQ Redis backend");
    return new BullMQJobManager(redis);
  } catch (err) {
    if (process.env.NODE_ENV === "test") {
      logger.warn({ err }, "[JobManager] Failed to initialize BullMQ Redis — falling back to InMemoryJobManager in test");
      return new InMemoryJobManager();
    }
    throw new Error(`[JobManager] Failed to initialize required Redis backend: ${err instanceof Error ? err.message : String(err)}`);
  }
}
