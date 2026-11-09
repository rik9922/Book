# Feature to Screen to Microservice Matrix

| Screen ID | Screen Title | Primary Microservice | API Route Dependencies | Data Displayed / Action Performed | Key Interaction States |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PWA-01** | Landing Page | API Gateway | `GET /health` | Platform value proposition, interactive sample book | Default, 3D Hero active |
| **PWA-08** | Sign-Up | Identity Service | `POST /api/v1/auth/register` | Email, password, full name fields | Pristine, Validating, Submitting, Error |
| **PWA-09** | Sign-In | Identity Service | `POST /api/v1/auth/login` | Credentials form, session persistence | Idle, Authenticating, Success redirect |
| **PWA-15** | Create Space | Memory Service | `POST /api/v1/spaces` | Space name, description, space type | Form editing, Saving, Created |
| **PWA-16** | Create Profile | Memory Service | `POST /api/v1/spaces/:id/profiles` | Profile name, relationship, type (child/pet) | Photo upload, Bio input, Saved |
| **PWA-19** | Dashboard | Memory Service | `GET /api/v1/spaces`, `GET /api/v1/memories` | Recent memories, bookshelf snippet, quick actions | Loading skeleton, Populated, Empty state |
| **PWA-33** | Memory Grid | Memory Service | `GET /api/v1/memories` | Masonry grid of photos, videos, and stories | Infinite scroll, Lazy loaded, Filtered |
| **PWA-34** | Timeline | Memory Service | `GET /api/v1/memories?timeline=true` | Chronological grouped memories by year/month | Scroll navigation, Date jump active |
| **PWA-40** | Media Upload | Media Service | `POST /api/v1/media/upload-session` | File picker, direct-to-storage progress bar | Drag-over, Uploading, Processing, Done |
| **PWA-45** | Voice Recorder | Media Service | `POST /api/v1/media/upload-session` | Microphone capture, live waveform visualizer | Ready, Recording, Playback, Uploaded |
| **PWA-56** | Bookshelf | Book Service | `GET /api/v1/books` | 3D interactive book spines on virtual shelf | Idle, Hover open, Select book |
| **PWA-63** | Cover Studio | Book Service | `POST /api/v1/books` | Color picker, cloth/leather PBR swatch, foil stamping | Real-time 3D cover preview |
| **PWA-64** | Spread Editor | Book Service | `PUT /api/v1/books/:id` | 5-panel spread layout, asset placement, typography | Element dragged, Text edited, Auto-saved |
| **PWA-68** | 3D Book Reader | Book Service | `GET /api/v1/books/:id` | Photorealistic 3D book model, page turning controls | Closed, Opening, Turning, Reading cradle |
| **PWA-69** | Print Preflight | Book Service | `POST /api/v1/books/:id/freeze` | Bleed/Trim check, DPI audit, page multiple check | Running audit, Errors flagged, Passed |
| **PWA-73** | Checkout | Commerce Service | `POST /api/v1/commerce/orders` | Order summary, shipping quote, payment form | Validating address, Processing, Confirmed |
| **PWA-80** | Storage Quota | Media Service | `GET /api/v1/media/spaces/:id/quota` | 500 MB quota meter, breakdown by photo/video/audio | Normal (<80%), Warning (80-99%), Full (100%) |
| **ADMIN-01** | Admin Overview | Admin Operations | `GET /api/v1/admin/overview` | Platform storage, active users, queue throughput | Real-time metrics streaming |
| **ADMIN-11** | Queue Monitor | Admin Operations | `GET /api/v1/admin/queues` | BullMQ worker concurrency, active/waiting jobs | Refreshing, Worker paused, Retried |
| **ADMIN-18** | Order Queue | Commerce Service | `GET /api/v1/commerce/orders` | Physical book orders, print supplier status | Filter by status, Details view |
