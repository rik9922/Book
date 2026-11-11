-- 013_platform_expansion_schema.sql
-- Comprehensive schema additions for full PWA-01..82, IOS-01..56, and ADMIN-01..26 support

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'member';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences_json JSONB NOT NULL DEFAULT '{"reducedMotion":false,"language":"en","biometricLock":false}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_json JSONB NOT NULL DEFAULT '{"signedLinkTtlSeconds":3600,"allowPublicGallery":false}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_purpose VARCHAR(50);

CREATE TABLE IF NOT EXISTS user_security_keys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    key_type VARCHAR(30) NOT NULL DEFAULT 'fido2', -- 'fido2', 'totp'
    credential_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY,
    user_id UUID,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'general',
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'waiting_customer', 'resolved'
    priority VARCHAR(30) NOT NULL DEFAULT 'normal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_replies (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id UUID,
    author_name VARCHAR(120) NOT NULL,
    message TEXT NOT NULL,
    internal_note BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_access_requests (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL,
    target_user_id UUID,
    target_space_id UUID,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'revoked', 'expired'
    approver_id UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY,
    reporter_id UUID,
    target_type VARCHAR(50) NOT NULL, -- 'memory', 'space', 'user'
    target_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'dismissed'
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_flags (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    memory_id UUID NOT NULL,
    media_id UUID,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'quarantined'
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS space_roles (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    name VARCHAR(80) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS space_share_links (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    created_by UUID NOT NULL,
    token VARCHAR(128) NOT NULL UNIQUE,
    passphrase_hash VARCHAR(255),
    allow_downloads BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    access_count INTEGER NOT NULL DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_revisions (
    id UUID PRIMARY KEY,
    memory_id UUID NOT NULL,
    space_id UUID NOT NULL,
    editor_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    captured_at TIMESTAMPTZ,
    change_summary VARCHAR(255) NOT NULL DEFAULT 'Updated memory',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_chapters (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_editions (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL,
    edition_number INTEGER NOT NULL DEFAULT 1,
    edition_hash VARCHAR(64) NOT NULL,
    snapshot_json JSONB NOT NULL DEFAULT '{}',
    frozen_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
    template_key VARCHAR(100) PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    html_body TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
    flag_key VARCHAR(100) PRIMARY KEY,
    description TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    rollout_percentage INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS print_catalog_formats (
    format_id VARCHAR(80) PRIMARY KEY,
    label VARCHAR(120) NOT NULL,
    dimensions_cm VARCHAR(60) NOT NULL,
    base_cents INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_rates (
    zone_code VARCHAR(40) PRIMARY KEY,
    label VARCHAR(120) NOT NULL,
    rate_cents INTEGER NOT NULL,
    estimated_days VARCHAR(60) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_refunds (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    amount_cents INTEGER NOT NULL,
    refund_type VARCHAR(40) NOT NULL DEFAULT 'refund', -- 'refund', 'remake'
    reason TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'processed',
    processed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (flag_key, description, enabled, rollout_percentage)
VALUES
  ('webgl_3d_reader', 'Enable interactive Three.js 3D heirloom book reader', TRUE, 100),
  ('tesseract_ocr_pipeline', 'Enable local Tesseract single-pass TSV OCR indexing', TRUE, 100),
  ('offline_sync_queue', 'Enable browser offline mutation queue and Service Worker caching', TRUE, 100),
  ('zero_markup_print_fulfillment', 'Enable pass-through print ordering sandbox', TRUE, 100)
ON CONFLICT (flag_key) DO NOTHING;

INSERT INTO print_catalog_formats (format_id, label, dimensions_cm, base_cents, enabled)
VALUES
  ('hardcover_square_8x8', 'Square Heirloom 8×8"', '20.3 × 20.3 cm', 4200, TRUE),
  ('hardcover_standard_8x10', 'Standard Archive 8×10"', '20.3 × 25.4 cm', 4800, TRUE),
  ('hardcover_grand_12x12', 'Grand Estate 12×12"', '30.5 × 30.5 cm', 6800, TRUE)
ON CONFLICT (format_id) DO NOTHING;

INSERT INTO shipping_rates (zone_code, label, rate_cents, estimated_days)
VALUES
  ('US', 'Domestic Archival Parcel (US)', 900, '5–7 business days'),
  ('INTL', 'International Insured Courier', 2400, '10–14 business days')
ON CONFLICT (zone_code) DO NOTHING;

INSERT INTO email_templates (template_key, subject, html_body)
VALUES
  ('welcome_heirloom', 'Welcome to Memoria — Your Living Archive', '<h1>Your memories, made timeless.</h1><p>Start preserving family stories with local-first privacy.</p>'),
  ('family_invitation', 'You are invited to a Memoria Family Circle', '<h1>Join our shared family archive</h1><p>Accept your invitation token to contribute stories and photographs.</p>'),
  ('print_order_shipped', 'Your Heirloom Book Edition Has Shipped', '<h1>On its way to your bookshelf</h1><p>Track your archival hardcover delivery inside Memoria.</p>')
ON CONFLICT (template_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_revisions_memory ON memory_revisions(memory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_space_share_links_token ON space_share_links(token) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_book_editions_book ON book_editions(book_id, edition_number DESC);
