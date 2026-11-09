-- 003_media_schema.sql
-- Media Service: Upload sessions, metadata, derivatives, and zero-budget quotas

CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_upload',
    storage_key TEXT NOT NULL,
    public_url TEXT,
    derivatives JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS space_storage_quotas (
    space_id UUID PRIMARY KEY,
    used_bytes BIGINT NOT NULL DEFAULT 0,
    max_bytes BIGINT NOT NULL DEFAULT 524288000, -- 500 MB Free Tier Quota
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_space_status ON media_assets(space_id, status);
