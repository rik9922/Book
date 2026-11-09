# System Architecture Specification

## 1. Top-Level Microservices Topology

```
                              [ HTTPS / WSS ]
                                     |
                                     v
                       +----------------------------+
                       |   API Gateway (Fastify)    |  Port 4000
                       | Rate Limit, Auth, Routing  |
                       +--------------+-------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
+------------------+         +------------------+         +------------------+
| Identity Service |         |  Memory Service  |         |  Media Service   |
| Port 4001        |         | Port 4002        |         | Port 4003        |
| DB: identity_db  |         | DB: memory_db    |         | DB: media_db     |
+--------+---------+         +--------+---------+         +--------+---------+
         |                            |                            |
         +----------------------------+----------------------------+
                                      |
                           [ NATS JetStream Event Bus ]
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
+------------------+         +------------------+         +------------------+
|   Book Service   |         |  Collab Service  |         | Commerce Service |
| Port 4005        |         | Port 4004        |         | Port 4007        |
| DB: book_db      |         | DB: collab_db    |         | DB: commerce_db  |
+------------------+         +------------------+         +------------------+
         |                                                         |
         v                                                         v
+------------------+                                      +------------------+
| 3D Asset Service |                                      | Notification Svc |
| Port 4006        |                                      | Port 4008        |
+------------------+                                      +------------------+
```

## 2. Infrastructure Isolation & Portability
- **Zero-Coupling**: Services never perform cross-database queries or shared memory reads.
- **Fail-Safe Operation**: If NATS or Redis is temporarily unavailable, services gracefully degrade to local in-memory event and job queues without fatal termination.
- **Direct-to-Storage Ingestion**: Binary streams go directly to storage endpoints, keeping the API Gateway lean and responsive under heavy loads.

