-- 006_performance_and_archive_schema.sql
-- Performance Optimization, Normalization, Soft Deletion, and Keyset Indexing

-- 1. Add Soft Deletion (deleted_at) support
ALTER TABLE memory_spaces ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE space_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Normalized Junction Tables for Relational Integrity
CREATE TABLE IF NOT EXISTS memory_media (
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    media_id UUID NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (memory_id, media_id)
);

CREATE TABLE IF NOT EXISTS memory_profiles (
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES space_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (memory_id, profile_id)
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (space_id, name)
);

CREATE TABLE IF NOT EXISTS memory_tags (
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (memory_id, tag_id)
);

-- 3. Composite B-Tree Indexes for Keyset Pagination & Soft-Deleted Queries
CREATE INDEX IF NOT EXISTS idx_memories_keyset 
    ON memories (space_id, captured_at DESC, id DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_favorites_keyset 
    ON memories (space_id, captured_at DESC, id DESC) 
    WHERE deleted_at IS NULL AND is_favorite = TRUE;

-- 4. GIN Full-Text Search Index on English Lexemes
CREATE INDEX IF NOT EXISTS idx_memories_fts 
    ON memories USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) 
    WHERE deleted_at IS NULL;

-- 5. Foreign Key & Join Indexes
CREATE INDEX IF NOT EXISTS idx_memory_media_media_id ON memory_media(media_id);
CREATE INDEX IF NOT EXISTS idx_memory_profiles_profile_id ON memory_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_memory_tags_tag_id ON memory_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_space_name ON tags(space_id, name);
