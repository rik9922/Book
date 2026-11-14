# Memoria Security, Privacy & Containment

## 1. Storage Path & Symlink Containment
- `packages/storage/src/index.ts` (`LocalDiskStorageDriver.resolvePath`) rejects empty keys, null bytes, and `..` traversal segments, and resolves `fsSync.realpathSync` on the deepest existing ancestor to block symlink escapes outside `baseDir`.

## 2. Authentication, RBAC & IDOR Protection
- Admin routes (`/api/v1/admin/overview/metrics`, `/api/v1/admin/services/health`, `/api/v1/admin/feature-flags`, `/api/v1/admin/spaces`, `/api/v1/admin/storage/stats`) enforce `verifyAdminJwt` at `api-gateway` and reject unauthenticated (`401`) and non-admin (`403`) callers.
- Space and memory endpoints enforce ownership/membership checks (`assertSpaceAccess`) against `memory_spaces` and collaborators.

## 3. Infrastructure & Secret Hygiene
- `docker-compose.yml` binds PostgreSQL (`5432`), Redis (`6379`), NATS (`4222`, `8222`), and MinIO (`9000`, `9001`) to `127.0.0.1` loopback only.
- `pnpm run check:quality` enforces zero `console.*` calls and zero empty `catch {}` blocks across `services/` and `packages/`.
