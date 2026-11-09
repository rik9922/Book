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
      const sub = this.nc.subscribe(subject);
      logger.info({ subject }, "[NatsEventBus] Subscribed to subject");
      (async () => {
        for await (const msg of sub) {
          try {
            const event = codec.decode(msg.data) as DomainEvent<T>;
            await handler(event);
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
  try {
    const nc = await connect({
      servers: [natsUrl],
      timeout: 1000,
      reconnect: true,
      maxReconnectAttempts: 5,
    });
    logger.info({ natsUrl }, "[EventBus] Connected to NATS JetStream successfully");
    return new NatsEventBus(nc);
  } catch (err) {
    logger.warn({ natsUrl }, "[EventBus] NATS connection unavailable — falling back to local InMemoryEventBus");
    return new InMemoryEventBus();
  }
}
