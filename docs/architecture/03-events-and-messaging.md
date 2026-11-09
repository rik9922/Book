# Events & Messaging Architecture

## 1. NATS JetStream Domain Events

NATS JetStream provides high-throughput, persistent, at-least-once message delivery for asynchronous inter-service domain events.

### Stream Definitions

- `MEMORY_EVENTS`: subjects `memory.*`
- `MEDIA_EVENTS`: subjects `media.*`
- `BOOK_EVENTS`: subjects `book.*`
- `ORDER_EVENTS`: subjects `order.*`
- `COLLAB_EVENTS`: subjects `collab.*`

### Event Envelope Specification

Every domain event published to NATS adheres to the following envelope:

```typescript
export interface DomainEvent<T = unknown> {
  eventId: string;           // UUIDv4
  eventType: string;         // e.g. "media.processed"
  producer: string;          // service identifier, e.g. "media-service"
  timestamp: string;         // ISO 8601
  correlationId: string;     // Distributed trace correlation ID
  data: T;                   // Strongly typed payload
}
```

### Idempotency & Delivery Rules

1. **Durable Consumers**: Consumer groups use explicit ACK mode (`AckPolicy.Explicit`) with deterministic max delivery counts (default 5).
2. **Exponential Backoff**: Unacknowledged messages redeliver with stepped delays (1s, 5s, 30s, 2m, 10m) before landing in a dead-letter stream.
3. **Idempotency Keys**: Consumers track `eventId` in a deduplication table with a 7-day TTL before mutating domain state.

---

## 2. BullMQ Operational Background Jobs

Operational background tasks (CPU/GPU-heavy, scheduled, or retryable workloads) run through **BullMQ** on Redis.

### Primary Queues

1. `media-processing`: Transcoding, Sharp image derivatives, metadata extraction (EXIF, duration, color palette).
2. `audio-transcription`: Speech-to-text transcription and waveform generation for voice notes.
3. `book-preflight`: Validates print geometry (bleed, DPI, CMYK color space, gutter, spine width).
4. `print-pdf-generation`: Generates immutable, high-resolution PDF/X-1a print files for physical order fulfillment.

