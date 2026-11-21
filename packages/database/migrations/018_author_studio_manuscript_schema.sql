-- 018_author_studio_manuscript_schema.sql
-- Memoria Author Studio: Semantic ManuscriptDocument, rich-text chapters, revisions,
-- exact resume checkpoints, and auditable import/export job records.
-- Strictly additive & backward-compatible with existing books, book_spreads, book_chapters, and book_editions.

CREATE TABLE IF NOT EXISTS book_manuscripts (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL UNIQUE,
    space_id UUID NOT NULL,
    schema_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    trim_size VARCHAR(64) NOT NULL DEFAULT '6x9_trade',
    typography_preset VARCHAR(64) NOT NULL DEFAULT 'living_archive_serif',
    theme_preset VARCHAR(64) NOT NULL DEFAULT 'living_archive_ivory',
    language_code VARCHAR(16) NOT NULL DEFAULT 'en',
    author_name VARCHAR(255) NOT NULL DEFAULT '',
    dedication TEXT NOT NULL DEFAULT '',
    epigraph TEXT NOT NULL DEFAULT '',
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_word_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_manuscripts_space ON book_manuscripts(space_id);

-- Extend existing book_chapters table additively for semantic Author Studio chapters
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS section_type VARCHAR(32) NOT NULL DEFAULT 'chapter';
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS slug VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS content_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb;
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS content_html TEXT NOT NULL DEFAULT '<p></p>';
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS content_text TEXT NOT NULL DEFAULT '';
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS word_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'draft';
ALTER TABLE book_chapters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_book_chapters_book_order ON book_chapters(book_id, sort_order ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS book_revisions (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL,
    created_by UUID NOT NULL,
    label VARCHAR(255) NOT NULL DEFAULT 'Manual checkpoint',
    source_type VARCHAR(32) NOT NULL DEFAULT 'manual',
    snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    word_count INTEGER NOT NULL DEFAULT 0,
    checksum_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_revisions_book_created ON book_revisions(book_id, created_at DESC);

CREATE TABLE IF NOT EXISTS book_editor_state (
    book_id UUID NOT NULL,
    user_id UUID NOT NULL,
    active_environment VARCHAR(32) NOT NULL DEFAULT 'write',
    active_chapter_id UUID,
    cursor_offset INTEGER NOT NULL DEFAULT 0,
    scroll_offset INTEGER NOT NULL DEFAULT 0,
    panel_state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (book_id, user_id)
);

CREATE TABLE IF NOT EXISTS book_import_jobs (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL,
    space_id UUID NOT NULL,
    created_by UUID NOT NULL,
    format VARCHAR(32) NOT NULL,
    source_filename VARCHAR(255) NOT NULL,
    merge_strategy VARCHAR(32) NOT NULL DEFAULT 'append',
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    chapters_imported INTEGER NOT NULL DEFAULT 0,
    word_count INTEGER NOT NULL DEFAULT 0,
    warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_import_jobs_book ON book_import_jobs(book_id, created_at DESC);

CREATE TABLE IF NOT EXISTS book_export_jobs (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL,
    space_id UUID NOT NULL,
    created_by UUID NOT NULL,
    format VARCHAR(32) NOT NULL,
    edition_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    checksum_sha256 VARCHAR(64) NOT NULL,
    byte_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_export_jobs_book ON book_export_jobs(book_id, created_at DESC);
