-- 015_memory_sync_idempotency_and_revisions.sql
-- Adds idempotency keys and optimistic revision tracking for offline-first sync correctness.

ALTER TABLE IF EXISTS memories
  ADD COLUMN IF NOT EXISTS client_mutation_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_space_client_mutation
  ON memories (space_id, client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;

ALTER TABLE IF EXISTS media_assets
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_space_idempotency
  ON media_assets (space_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
