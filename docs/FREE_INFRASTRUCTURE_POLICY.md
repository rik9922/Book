# Free Infrastructure & Zero-Budget Policy

## 1. Absolute Directives
- **Zero Payment Method**: No credit card, debit card, PayPal, or billing account may be required to run, test, or self-host the platform.
- **Local-First Stack**: The platform runs 100% locally on standard developer workstations using Node.js, Fastify, local PostgreSQL, local NATS, local Redis, and the `LocalDiskStorageDriver`.
- **Cardless Cloud Services**: Any cloud hosting evaluated must provide a genuinely cardless, permanently free tier with zero risk of automatic conversion to billed usage.

## 2. Hard Quotas
- 500 MB maximum storage per memory space.
- 50 MB maximum per single file upload.
- Automated WebP/AVIF derivative compression to minimize disk utilization.
- Transparent quota indicators across PWA and iOS settings.
