# Service Boundaries and Communication Contracts

## 1. Services Matrix

| Service | Port | Primary Responsibility | Data Store | Key Outbound Events |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | 4000 | Reverse proxy, TLS termination, JWT validation, global rate limiting, correlation ID injection | Redis (Rate limits) | - |
| **Identity Service** | 4001 | User registration, login, multi-factor auth, sessions, password reset, account deletion | `identity_db` | `user.registered`, `user.deleted` |
| **Memory Service** | 4002 | Memory spaces, profiles (family, child, pet), collections, timelines, memory stories | `memory_db` | `memory.created`, `memory.updated`, `memory.deleted` |
| **Media Service** | 4003 | Direct upload session signing, media metadata, asset derivatives, worker orchestration | `media_db` + Object Storage | `media.uploaded`, `media.processed`, `media.failed` |
| **Collaboration Service** | 4004 | Invitations, space membership, RBAC (Owner, Editor, Contributor, Viewer), comments, audit | `collab_db` | `invite.sent`, `member.joined`, `comment.added` |
| **Book Service** | 4005 | Book document model, page/spread layouts, typography, chapters, versioning, digital edition freeze | `book_db` | `book.created`, `book.updated`, `book.edition_frozen` |
| **3D Asset Service** | 4006 | 3D book cover/paper PBR textures, glTF model variants, procedural page mesh configs | Object Storage / CDN cache | `asset3d.compiled` |
| **Commerce & Orders** | 4007 | Physical print catalog, pricing, order placement, shipping quotes, print fulfillment tracking | `commerce_db` | `order.created`, `order.paid`, `order.fulfilled` |
| **Notification Service** | 4008 | User alerts, email dispatch, push notifications (APNs / WebPush), in-app notifications | `notification_db` | `notification.dispatched` |
| **Search Service** | 4009 | Full-text and metadata search index for memories, tags, captions, people, and dates | Search index / `search_db` | - |
| **Admin Operations** | 4010 | Platform telemetry, queue monitoring, storage audits, preflight verification, support actions | `admin_db` | `admin.audit_logged` |

## 2. API Contract Standards

All Fastify microservices adhere to strict typed contracts defined in `@memory-capsule/contracts`:
- Request & Response validation enforced via **Zod** and JSON Schema generation.
- Common response wrapper:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "correlationId": "uuid-v4",
    "timestamp": 1731154800000
  }
}
```
- Error payload schema:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human readable detail",
    "details": []
  },
  "meta": {
    "correlationId": "uuid-v4",
    "timestamp": 1731154800000
  }
}
```
