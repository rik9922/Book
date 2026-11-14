# Memoria Memory Data Durability & Offline Synchronization

**Primary Components:**
- `apps/ios/Memoria/Sources/Memoria/Services/LocalStorageService.swift`
- `apps/ios/Memoria/Sources/Memoria/Services/OfflineSyncService.swift`
- `apps/ios/Memoria/Sources/Memoria/Services/MemoriaAPIClient.swift`
- `apps/ios/Memoria/Sources/Memoria/Views/MemoryCreateView.swift`
- `packages/database/migrations/015_memory_sync_idempotency_and_revisions.sql`

## 1. Durable Storage Layout (iOS)
- **Offline Memory Records:** Persisted atomically in `Application Support/MemoriaArchive/OfflineMemories/` (`DurableOfflineMemoryRecord`), never in disposable `Caches/`.
- **Original Media Assets:** Copied immediately into `Application Support/MemoriaArchive/Originals/` (`LocalMediaAsset`) with byte size, MIME type, and SHA-256 checksum (`CryptoKit`). Originals are never deleted on failed upload or cache eviction.
- **Sync Queue:** Persisted in `Application Support/MemoriaArchive/PendingMutations/` (`PendingMutation`) with `idempotencyKey`, `ownerAccountId`, `state` (`waiting`, `syncing`, `failed`, `conflict`), `retryCount`, `nextRetryAt`, and `lastError`.

## 2. Synchronization & Conflict Semantics
1. **Ordered Dependency Sync:** Media assets upload via `POST /api/v1/media/upload-session` (with `Idempotency-Key`) and complete via `/complete` before `POST /api/v1/spaces/:spaceId/memories` (with `clientMutationId`) creates the memory referencing those `mediaIds`.
2. **Versioned Conflict Detection:** `memories.revision` increments on every server update (`PostgresMemoryRepository`). `PATCH /api/v1/memories/:memoryId` checks `expectedRevision` and returns `409 VERSION_CONFLICT` if stale; `OfflineSyncService` preserves a `SyncConflictRecord` for explicit user resolution rather than silently overwriting.
3. **Account Isolation:** `PendingMutation.ownerAccountId` scopes queue processing and feed display to the active authenticated account, preventing cross-account leakage on logout/switch.
4. **Crash Recovery:** `resetInterruptedInProgressMutations()` resets any `syncing` items left mid-flight on app termination back to `waiting` at startup.
