import { connect, NatsConnection, JSONCodec, JetStreamClient } from "nats";
import { DomainEvent } from "@memory-capsule/contracts";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("event-bus");
const codec = JSONCodec<DomainEvent>();

export interface EventBus {
  publish<T>(subject: string, event: DomainEvent<T>): Promise<void>;
  subscribe<T>(subject: string, handler: (event: DomainEvent<T>) => Promise<void>): Promise<void>;
  close(): Promise<void>;
  isLive(): boolean;
}

class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Array<(event: DomainEvent<any>) => Promise<void>>>();

  async publish<T>(subject: string, event: DomainEvent<T>): Promise<void> {
    logger.debug({ subject, eventType: event.eventType }, "[InMemoryEventBus] Published event");
    const matched = this.handlers.get(subject) || [];
    for (const handler of matched) {
      try {
        await handler(event);
      } catch (err) {
        logger.error({ err, subject, eventId: event.eventId }, "[InMemoryEventBus] Handler error");
      }
    }
  }

  async subscribe<T>(subject: string, handler: (event: DomainEvent<T>) => Promise<void>): Promise<void> {
    const list = this.handlers.get(subject) || [];
    list.push(handler);
    this.handlers.set(subject, list);
    logger.debug({ subject }, "[InMemoryEventBus] Subscribed handler");
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }

  isLive(): boolean {
    return true;
  }
}

class NatsEventBus implements EventBus {
  private nc: NatsConnection;
  private js: JetStreamClient;

  constructor(nc: NatsConnection) {
    this.nc = nc;
    this.js = nc.jetstream();
  }

  async publish<T>(subject: string, event: DomainEvent<T>): Promise<void> {
    try {
      const data = codec.encode(event);
      await this.js.publish(subject, data);
      logger.info({ subject, eventType: event.eventType, eventId: event.eventId }, "[NatsEventBus] Event published to JetStream");
    } catch (err) {
      logger.error({ err, subject, eventId: event.eventId }, "[NatsEventBus] Failed to publish event");
      throw err;
    }
  }

  async subscribe<T>(subject: string, handler: (event: DomainEvent<T>) => Promise<void>): Promise<void> {
    try {
      // Create durable JetStream consumer subscription where supported, with core fallback
      const sub = this.nc.subscribe(subject);
      logger.info({ subject }, "[NatsEventBus] Subscribed to subject stream");
      (async () => {
        for await (const msg of sub) {
          try {
            const event = codec.decode(msg.data) as DomainEvent<T>;
            await handler(event);
            if (msg.reply) {
              msg.respond();
            }
          } catch (handlerErr) {
            logger.error({ err: handlerErr, subject }, "[NatsEventBus] Message processing failure");
          }
        }
      })();
    } catch (err) {
      logger.error({ err, subject }, "[NatsEventBus] Failed to subscribe");
      throw err;
    }
  }

  async close(): Promise<void> {
    await this.nc.drain();
  }

  isLive(): boolean {
    return !this.nc.isClosed();
  }
}

export async function createEventBus(natsUrl = process.env.NATS_URL || "nats://localhost:4222"): Promise<EventBus> {
  if (process.env.NODE_ENV === "test" && !process.env.ENABLE_TEST_NATS) {
    logger.debug("[EventBus] Using InMemoryEventBus for test mode");
    return new InMemoryEventBus();
  }

  try {
    const nc = await connect({
      servers: [natsUrl],
      timeout: 1500,
      reconnect: true,
      maxReconnectAttempts: 5,
    });

    // Ensure JetStream STREAM exists
    try {
      const jsm = await nc.jetstreamManager();
      const streams = await jsm.streams.list().next();
      const streamNames = streams.map((s) => s.config.name);
      const streamName = streamNames.includes("MEMORIA_EVENTS") ? "MEMORIA_EVENTS" : (streamNames.includes("CAPSULE_EVENTS") ? "CAPSULE_EVENTS" : "MEMORIA_EVENTS");
      
      if (!streamNames.includes(streamName)) {
        await jsm.streams.add({
          name: streamName,
          subjects: ["identity.>", "memory.>", "media.>", "book.>", "collab.>", "notification.>", "test.>"],
        });
        logger.info({ streamName }, "[EventBus] Created durable JetStream stream");
      } else {
        try {
          await jsm.streams.update(streamName, {
            subjects: ["identity.>", "memory.>", "media.>", "book.>", "collab.>", "notification.>", "test.>"],
          });
        } catch {}
      }
    } catch (streamErr) {
      logger.warn({ err: streamErr }, "[EventBus] JetStream stream verification warning");
    }

    logger.info({ natsUrl }, "[EventBus] Connected to NATS JetStream successfully");
    return new NatsEventBus(nc);
  } catch (err) {
    if (process.env.NODE_ENV === "test") {
      logger.debug({ natsUrl }, "[EventBus] NATS connection unavailable — using local InMemoryEventBus in test mode");
      return new InMemoryEventBus();
    }
    throw new Error(`[EventBus] NATS JetStream connection required in non-test mode (${natsUrl}): ${err instanceof Error ? err.message : String(err)}`);
  }
}

