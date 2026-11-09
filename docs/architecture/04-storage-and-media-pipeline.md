# Storage & Media Processing Pipeline

## 1. Direct-to-Storage Upload Lifecycle

To ensure API Gateway stability and support high-volume uploads of 4K videos, high-resolution family photos, and audio recordings, clients upload directly to Cloudflare R2 / S3 via authorized presigned sessions.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web / iOS Client
    participant Gateway as API Gateway
    participant Media as Media Service
    participant Storage as Cloudflare R2 / S3
    participant NATS as NATS JetStream
    participant Worker as BullMQ Worker (Sharp)

    Client->>Gateway: POST /api/v1/media/upload-session (mimeType, size, checksum)
    Gateway->>Media: Forward request with User Claims
    Media->>Media: Validate quota & authorize
    Media->>Storage: Generate Presigned PUT URL & key
    Media-->>Client: Return { uploadUrl, mediaId, key, headers }
    Client->>Storage: Direct PUT binary data
    Client->>Gateway: POST /api/v1/media/:id/complete
    Gateway->>Media: Confirm Upload
    Media->>Storage: HeadObject to verify size & checksum
    Media->>NATS: Publish "media.uploaded" event
    Media-->>Client: 200 OK (status: "processing")
    NATS->>Worker: Enqueue "media-processing" job
    Worker->>Storage: Fetch original file
    Worker->>Worker: Extract EXIF, generate WebP/AVIF thumbnails
    Worker->>Storage: Upload derivatives (thumb_sm, thumb_lg, webp)
    Worker->>Media: Update media status to "ready"
    Worker->>NATS: Publish "media.processed" event
```

## 2. Derivative Specifications

- **Raw Original**: Stored in cold/private tier (`originals/{spaceId}/{mediaId}/raw.ext`).
- **Thumbnail (Small)**: 320x320 WebP, aspect-fill, 80% quality for grid and timeline previews.
- **Thumbnail (Large)**: 1280x1280 WebP, max-fit, 85% quality for memory detail viewing.
- **Book Print Master**: 300+ DPI preserved for physical book rendering.
- **Color Palette & Blurhash**: Extracted during worker processing and stored in database for instantaneous layout placeholders.
