-- 008_operations_and_outbox_schema.sql
-- Transactional Outbox Pattern & Immutable Audit Logging

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'published', 'failed'
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    space_id UUID,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index for high-throughput outbox queue dispatching
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events (created_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_processed ON outbox_events (processed_at) WHERE status = 'published';

-- Composite indexes for audit compliance and security trail inspection
CREATE INDEX IF NOT EXISTS idx_audit_space_time ON audit_logs (space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id, created_at DESC);
