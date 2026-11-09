# Memoria — Your memories, made timeless.

<p align="center">
  <img src="apps/web/public/branding/memoria-app-icon-512.png" width="160" height="160" alt="Memoria Official App Icon" style="border-radius: 32px; box-shadow: 0 16px 32px rgba(18, 63, 53, 0.4);" />
</p>

<p align="center">
  <strong>An heirloom memory preservation, collaborative storytelling, interactive 3D reading, and museum-grade physical publishing platform.</strong>
</p>

---

## 📖 About Memoria

**Memoria** allows individuals and families to preserve their most meaningful memories in one secure, private home. From everyday childhood stories and milestones to weddings, journeys, voice recordings, and family trees—Memoria crafts enduring personal histories into interactive 3D digital books and professionally printed, cloth-bound physical heirlooms.

### Core Product Capabilities
- **Heirloom Life Story Archives**: Multi-format memories (high-resolution photographs, videos, audio voice notes, letters, and rich markdown narratives).
- **Collaborative Family Spaces**: Multi-user permissions, secure tokenized family invites, and profile tagging for children, parents, and ancestors.
- **Interactive 3D Book Studio**: Realistic book-turning physics, Three.js PBR cloth and leather textures, and foil-stamped typography.
- **Physical Book Publishing**: Frozen cryptographic editions (`sha256`), press-ready PDF layout export, and physical bindery order dispatch.
- **Absolute $0 Budget / Local-First Policy**: Powered by local PostgreSQL 17, Redis 7, NATS JetStream, and `LocalDiskStorageDriver` with zero card-gated services.

---

## 🎨 Visual Identity & Brand Tokens

The Memoria visual language is guided by the **Modern Heirloom** philosophy:

| Color Token | Hex Code | Role |
|---|---|---|
| **Deep Emerald** | `#123F35` | Primary brand accent & PWA theme color |
| **Forest Green** | `#304C43` | Borders & structural cards |
| **Antique Gold** | `#C49A4A` | Tree-of-life foil stamping, luxury badges |
| **Warm Ivory** | `#F7F4ED` | Primary typography & archival paper stock |
| **Dark Ink** | `#0D1714` | Atmospheric background backdrop |
| **Archival Sage** | `#91A593` | Metadata & secondary labels |

*Detailed brand guidelines are documented in [`docs/BRAND_IDENTITY.md`](docs/BRAND_IDENTITY.md).*

---

## 🏛️ Monorepo Architecture

```
├── apps/
│   └── web/                   # Memoria Next.js 16 PWA + Three.js 3D Viewport
├── services/
│   ├── api-gateway/           # Hybrid REST / gRPC Gateway & Security Boundary
│   ├── identity-service/      # Authentication, Sessions, scrypt & gRPC Server
│   ├── memory-service/        # Spaces, Keyset Timeline, GIN Search & gRPC Server
│   ├── media-service/         # Zero-Overhead Binary Streaming & Sharp Processing
│   └── book-service/          # Canonical Book Spreads & Print Edition Freezing
├── packages/
│   ├── proto/                 # Canonical Protocol Buffers & gRPC Loaders
│   ├── database/              # PostgreSQL 17 Repositories, Outbox & Migrations
│   ├── contracts/             # Zod Domain Schemas & HTTP Contracts
│   ├── events/                # NATS JetStream Event Bus
│   ├── jobs/                  # Redis & In-Memory Job Processing
│   ├── storage/               # Zero-Cost LocalDiskStorageDriver
│   └── logger/                # Centralized Structured Pino Logger
└── docs/                      # Formal Architectural Specifications & Audits
```

---

## 🚀 Getting Started (Zero Budget / Local-First)

### Prerequisites
- Node.js >= 20 (Node 26+ supported)
- pnpm >= 9
- PostgreSQL 17 running locally on `localhost:5432`
- Redis running locally on `localhost:6379`
- NATS running locally on `localhost:4222`

### Setup & Run
```bash
# 1. Install workspace dependencies
pnpm install

# 2. Build all packages and applications
pnpm build

# 3. Run the comprehensive test and benchmark suite
pnpm test

# 4. Start the Memoria Web / PWA development server
pnpm dev:web
```

---

## 📄 License & Intellectual Property
Copyright © 2026 Memoria Ecosystem. All rights reserved.
