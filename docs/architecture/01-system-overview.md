# Memory Capsule System Architecture Overview

## 1. Executive Summary

Memory Capsule is an enterprise-grade platform dedicated to the lifelong preservation of personal and family memories, collaborative storytelling, interactive digital 3D book authoring, and professional physical printing.

## 2. Distributed Microservices Topology

The platform rejects monolithic and tight synchronous coupling in favor of an **Event-Driven Distributed Microservices Architecture** built with **Fastify + TypeScript**, **NATS JetStream** for durable domain events, **BullMQ + Redis** for operational job scheduling, and **PostgreSQL** for transactional persistence.

```
                      +-----------------------------+
                      |   Client Tier (Web & iOS)   |
                      |  Next.js 16 PWA / SwiftUI   |
                      +--------------+--------------+
                                     |
                                     | HTTPS / WSS
                                     v
                      +-----------------------------+
                      |     API Gateway (Fastify)   |
                      | Route Routing, Auth, Rate   |
                      +--------------+--------------+
                                     |
     +-------------------------------+-------------------------------+
     |                               |                               |
     v                               v                               v
+----+--------------+       +--------+----------+       +------------+------+
| Identity Service  |       |  Memory Service   |       |   Media Service   |
| (Auth, Sessions)  |       | (Spaces, Profiles)|       | (Uploads, S3/R2)  |
| DB: identity_db   |       | DB: memory_db     |       | DB: media_db      |
+-------------------+       +-------------------+       +---------+---------+
                                                                  |
                                                                  v (Job)
                                                        +---------+---------+
                                                        | Media Workers     |
                                                        | Sharp / FFmpeg    |
                                                        +-------------------+
                                                                  |
     +------------------------------------------------------------+
     | Domain Events over NATS JetStream
     v
+----+--------------+       +-------------------+       +-------------------+
|  Collaboration    |       |   Book Service    |       |  Commerce/Orders  |
|  (Invites, Roles) |       | (Spreads, Layout) |       | (Prints, Editions)|
| DB: collab_db     |       | DB: book_db       |       | DB: commerce_db   |
+-------------------+       +-------------------+       +-------------------+
     |                               |                               |
     +-------------------------------+-------------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Notification & Search     |
                      |       Admin Operations      |
                      +-----------------------------+
```

## 3. Core Principles

1. **Independent Service Ownership**: Each microservice strictly encapsulates its domain logic and database schema. Cross-service database access is prohibited.
2. **Event-Driven Decoupling**: Inter-service workflows (such as media processing triggering memory status updates, or book orders freezing book editions) communicate asynchronously via NATS JetStream.
3. **Direct-to-Object-Storage Uploads**: Media never blocks the API gateway or application servers. Authorized clients upload directly to Cloudflare R2 / S3 using presigned upload sessions.
4. **Resilient Background Processing**: Media transcoding, thumbnail generation, and print preflight run via BullMQ with Redis, featuring exponential backoff, dead-letter queues, and deterministic idempotency.
5. **Modern Heirloom Design**: Crafted with an archival, tactile aesthetic balancing warmth, timeless typography, and fluid spatial micro-interactions.
