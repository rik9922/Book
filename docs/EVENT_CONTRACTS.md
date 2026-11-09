# NATS JetStream Event Contracts

## 1. Domain Event Envelope

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

## 2. Event Payload Catalog

### `identity.user.registered`
- Producer: `identity-service`
- Subject: `identity.user.registered`
- Payload: `{ userId: string, email: string, fullName: string }`
- Consumers: `notification-service`, `admin-service`

### `memory.space.created`
- Producer: `memory-service`
- Subject: `memory.space.created`
- Payload: `{ spaceId: string, ownerId: string, name: string }`
- Consumers: `collab-service`, `admin-service`

### `media.uploaded`
- Producer: `media-service`
- Subject: `media.uploaded`
- Payload: `{ mediaId: string, spaceId: string, storageKey: string, mimeType: string }`
- Consumers: `media-worker` (BullMQ trigger)

### `media.processed`
- Producer: `media-service`
- Subject: `media.processed`
- Payload: `{ mediaId: string, derivatives: { thumb_sm: string, thumb_lg: string } }`
- Consumers: `memory-service` (cache invalidate), `notification-service`

### `book.created`
- Producer: `book-service`
- Subject: `book.created`
- Payload: `{ bookId: string, spaceId: string, title: string, format: string }`
- Consumers: `admin-service`, `collab-service`

### `book.edition_frozen`
- Producer: `book-service`
- Subject: `book.edition_frozen`
- Payload: `{ bookId: string, editionHash: string, pageCount: number, format: string }`
- Consumers: `commerce-service` (print prep), `notification-service`

