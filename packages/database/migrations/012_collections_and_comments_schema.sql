-- 012_collections_and_comments_schema.sql
-- Memory Service: Curated Collections, Memory Annotations/Comments

CREATE TABLE IF NOT EXISTS memory_collections (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_memory_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS collection_memories (
    collection_id UUID NOT NULL,
    memory_id UUID NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, memory_id)
);

CREATE TABLE IF NOT EXISTS memory_comments (
    id UUID PRIMARY KEY,
    memory_id UUID NOT NULL,
    space_id UUID NOT NULL,
    author_id UUID NOT NULL,
    author_name VARCHAR(255) NOT NULL DEFAULT 'Family Member',
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_collections_space ON memory_collections(space_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_collection_memories_memory ON collection_memories(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_memory ON memory_comments(memory_id, created_at ASC) WHERE deleted_at IS NULL;
