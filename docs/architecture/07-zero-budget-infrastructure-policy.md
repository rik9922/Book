# Zero-Budget & No-Payment-Method Infrastructure Policy

## 1. Core Mandate: $0 Absolute Budget

This project operates under a strict **$0 absolute financial boundary**. The developer has explicitly declined to provide credit-card, debit-card, PayPal, or any financial account details.

### Non-Negotiable Directives

1. **Zero Card Requirement**: No service may be introduced that requires a payment method to sign up, activate, or maintain a free tier.
2. **Zero Pay-as-You-Go Risk**: No cloud resources may be configured that can quietly convert to billed consumption or accrue unexpected overage charges.
3. **Local-First & Self-Hosted Default**: The primary development and execution environment relies on free open-source software:
   - Node.js runtime and Fastify microservices.
   - Local PostgreSQL (or containerized Postgres via Docker Compose).
   - Local NATS JetStream (or in-memory fallback).
   - Local Redis for BullMQ (or in-memory worker queue).
   - Local Filesystem Storage Driver / MinIO for object storage (no AWS or Cloudflare account required).
   - Sharp and FFmpeg running locally on CPU.
4. **Hard Quota Enforcement**: Application-level quotas prevent unbounded resource consumption. When a quota is reached, the system halts additions with a clear explanation rather than scaling horizontally into paid tiers.

---

## 2. Infrastructure Provider Suitability Matrix

| Component | Zero-Cost Solution ($0, No Card) | Prohibited Services (Requires Card / Billing Risk) |
| :--- | :--- | :--- |
| **Object Storage** | Local Filesystem Driver / Local MinIO | Cloudflare R2 (Requires Card), AWS S3 Pay-As-You-Go |
| **Database** | Local PostgreSQL 16 / Docker Postgres | Paid RDS, Providers requiring credit cards for free tiers |
| **Event Bus** | Local NATS JetStream / In-Memory Transport | Hosted message brokers with card requirements |
| **Background Jobs** | Local BullMQ on Local Redis / In-Memory Queue | Hosted worker fleets requiring credit cards |
| **Media Compute** | Local Sharp (Images), Local FFmpeg (Audio/Video) | Third-party paid transcoding APIs (e.g. Mux, Cloudinary) |
| **Web Hosting** | Local Next.js Server / Cardless Free Static Hosting | Any platform requiring payment method verification |

---

## 3. Storage Quotas & Safety Controls

1. **Per-Space Quota**: 500 MB default quota per free personal/family memory space.
2. **File Size Limits**:
   - Single Image: Max 15 MB.
   - Single Audio Note: Max 25 MB (up to 15 minutes at 128 kbps).
   - Single Video Clip: Max 50 MB (short clips).
   - Single Document: Max 10 MB.
3. **Derivative Compression**: High-efficiency WebP/AVIF generation reduces storage footprint by ~70% compared to original JPEGs/PNGs.
4. **Transparent Warning Thresholds**:
   - At 80% quota: Warning banner appears in UI.
   - At 100% quota: Further uploads paused with friendly prompt to export or delete unused assets. Existing memories are permanently preserved.
