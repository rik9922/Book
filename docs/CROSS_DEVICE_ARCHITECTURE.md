# Memoria — Cross-Device Architecture Specification

**Product:** Memoria  
**Tagline:** Your memories, made timeless.  
**Audience:** Mobile Engineers, Web Engineers, Distributed Systems Engineers  
**Supported Clients:** Next.js 16 PWA (Web/Desktop/Mobile), Native iOS (iPhone / iPad), Native RealityKit 3D Reader

---

## 1. Unified Client-Server Topology

Memoria ensures identical domain model interpretation, cryptographic security, and data consistency across Web and iOS:

```mermaid
graph TD
    subgraph Clients ["Client Layer"]
        Web["Web / PWA (Next.js 16 + IndexedDB)"]
        iOS["Native iOS (SwiftUI + Durable App Support Store)"]
    end

    subgraph Gateway ["Public API Gateway (Port 4000)"]
        APIGateway["Fastify REST Gateway (Host 0.0.0.0)"]
        CORS["CORS & Origin Whitelist"]
        Auth["JWT Token Validation"]
    end

    subgraph Microservices ["Internal Microservices Layer"]
        Identity["Identity Service (Port 4001, gRPC 50051)"]
        Memory["Memory Service (Port 4002, gRPC 50052)"]
        Media["Media Service (Port 4003)"]
        Book["Book Studio Service (Port 4005)"]
    end

    Web -->|REST / JSON| APIGateway
    iOS -->|REST / JSON (Dynamic Host)| APIGateway
    APIGateway --> CORS
    CORS --> Auth
    Auth --> Identity
    Auth --> Memory
    Auth --> Media
    Auth --> Book
```

---

## 2. Dynamic Host Resolution (Zero-Hardcoded Loopback)

The native iOS client (`MemoriaAPIClient.swift`) never assumes `127.0.0.1` refers to the development machine:

1. **Environment Variable Override**: Checked at runtime (`MEMORIA_API_URL`).
2. **Info.plist Configuration**: Checked for custom development hostname (`MemoriaAPIHost`).
3. **Simulator vs. Physical Device**:
   - iOS Simulator: Routes to `http://127.0.0.1:4000/api/v1`.
   - Physical iPhone/iPad: Routes to `http://<mac-lan-ip>:4000/api/v1` or mDNS `http://mac.local:4000/api/v1`.

The Fastify API Gateway binds to `0.0.0.0` with CORS permissions supporting local LAN addresses:
```text
http://localhost:3000
http://127.0.0.1:3000
http://<mac-lan-ip>:3000
```

---

## 3. Canonical Domain Contracts

All clients communicate using schemas defined in [`@memory-capsule/contracts`](../packages/contracts/src/index.ts):
- `Memory`: Canonical memory entity (`id`, `spaceId`, `authorId`, `title`, `content`, `format`, `capturedAt`, `location`, `tags`, `mediaIds`, `isFavorite`).
- `BookDocument`: Canonical photobook specification (`id`, `title`, `coverMaterial`, `coverColor`, `dimensions`, `pages`, `spreads`, `editionHash`).
- `ApiResponse<T>`: Centralized success/error response envelope with correlation ID tracking.

