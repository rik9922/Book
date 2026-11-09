# Media Processing & Storage Pipeline

## 1. Storage Drivers & Direct Ingestion

To satisfy the **Zero-Budget / No-Payment-Method Policy**, the media subsystem operates with dual storage drivers:

1. **`LocalDiskStorageDriver` (Default $0 Stack)**:
   - Presigned upload URLs route to Fastify streaming endpoints (`/api/v1/media/local-upload`).
   - Binaries stream directly into the local server's persistent disk path (`./storage_data/`).
   - Zero external cloud provider accounts or payment cards required.
2. **`S3StorageDriver` (Self-Hosted MinIO or Verified S3)**:
   - AWS SDK v3 client generates presigned PUT and GET URLs.

## 2. Derivative Generation Specifications

| Derivative | Resolution | Format | Purpose | Compression |
| :--- | :--- | :--- | :--- | :--- |
| `thumb_sm` | 320x320 | WebP | Timeline thumbnails, masonry grid cards | 80% quality, aspect-fill |
| `thumb_lg` | 1280x1280 | WebP | Fullscreen lightbox, memory detail modal | 85% quality, aspect-fit |
| `book_hi_res` | Original DPI | PNG/WebP | 3D Book spread textures & 300 DPI print files | Lossless / 92% quality |
| `waveform` | 100 points | JSON | Voice-note audio playback visualizer | Peaks normalized [0..1] |

## 3. Background Job Resiliency
- Operational queue: BullMQ on Redis (or in-memory queue when Redis is offline in test).
- Retries: 3 attempts with exponential backoff (1s, 5s, 30s).
- Unrecoverable jobs land in Dead-Letter Queue (DLQ) visible in `ADMIN-12`.

