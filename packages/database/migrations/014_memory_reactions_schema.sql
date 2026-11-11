-- 014_memory_reactions_schema.sql
-- Memory Service: Server-backed Emotional Reactions (IOS-42 & Web Parity)

CREATE TABLE IF NOT EXISTS memory_reactions (
    id UUID PRIMARY KEY,
    memory_id UUID NOT NULL,
    space_id UUID NOT NULL,
    user_id UUID NOT NULL,
    kind VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (memory_id, user_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_memory_reactions_memory ON memory_reactions(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_reactions_user ON memory_reactions(memory_id, user_id);
