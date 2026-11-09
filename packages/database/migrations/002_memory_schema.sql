-- 002_memory_schema.sql
-- Memory Service: Spaces, Profiles, Memories, and Collections

CREATE TABLE IF NOT EXISTS memory_spaces (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    space_type VARCHAR(50) NOT NULL DEFAULT 'family',
    cover_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS space_profiles (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL REFERENCES memory_spaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    profile_type VARCHAR(50) NOT NULL DEFAULT 'individual',
    birth_date DATE,
    avatar_media_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL REFERENCES memory_spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    format VARCHAR(50) NOT NULL DEFAULT 'image',
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location VARCHAR(255),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    associated_profile_ids UUID[] DEFAULT '{}',
    media_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_space_captured ON memories(space_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_favorite ON memories(space_id) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_space ON space_profiles(space_id);
