# Memoria Backup & Disaster Recovery

**Primary Components:**
- `scripts/backup.ts`
- `scripts/restore.ts`
- `tests/backup-restore.test.ts`

## 1. Fail-Closed Backup Pipeline (`scripts/backup.ts`)
- Dumps all configured service PostgreSQL databases (`memory_db`, `identity_db`, `media_db`, `collab_db`, `book_db`, `commerce_db`, `notification_db`) via `pg_dump`.
- Archives `storage_data/` into `media_archive.tar.gz` and verifies archive integrity with `tar -tzf`.
- Computes SHA-256 checksums for every database dump, the media archive, and every individual file in `assetManifest`.
- Records `schemaVersion`, `fileCount`, `archiveSizeBytes`, `timestamp`, and `status` (`COMPLETE` only if every step succeeds; `FAILED` on any error).

## 2. Safe Restore & Isolated Rehearsal (`scripts/restore.ts`)
- **Verification (`--verify-only`):** Validates `status === "COMPLETE"`, verifies SHA-256 checksums of all DB dumps and `media_archive.tar.gz`, extracts the tar archive to a temporary directory to verify readability and every `assetManifest` entry's SHA-256. Fails closed on any mismatch or missing file.
- **Live Overwrite Guard:** Refuses to overwrite live databases/storage unless `--confirm-live-restore` is explicitly passed.
- **Isolated Rehearsal (`--target-db-suffix`, `--target-storage-dir`, `--create-target-dbs`):** Restores dumps into isolated suffixed databases and an isolated storage directory, then validates post-restore row counts, SHA-256 checksums, and memory-to-media references, emitting a machine-readable `RestorationReport` JSON.
