-- 010_auth_lifecycle_columns.sql
-- Identity Service: Email verification, password reset tokens, and session revocation metadata

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_auth_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset'
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_hash ON user_auth_tokens(token_hash) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_user_purpose ON user_auth_tokens(user_id, purpose);
