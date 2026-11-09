-- 005_collaboration_schema.sql
-- Collaboration Service: Space memberships, roles, permissions, and secure invitations

CREATE TABLE IF NOT EXISTS space_members (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'contributor', -- 'owner', 'admin', 'contributor', 'viewer'
    permissions JSONB NOT NULL DEFAULT '{"can_create_memories": true, "can_edit_books": false, "can_invite": false}',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(space_id, user_id)
);

CREATE TABLE IF NOT EXISTS space_invitations (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    inviter_id UUID NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'contributor',
    token_hash VARCHAR(512) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'revoked', 'expired'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_space_members_user ON space_members(user_id);
CREATE INDEX IF NOT EXISTS idx_space_members_space_role ON space_members(space_id, role);
CREATE INDEX IF NOT EXISTS idx_space_invitations_token ON space_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_space_invitations_email ON space_invitations(invitee_email) WHERE status = 'pending';
