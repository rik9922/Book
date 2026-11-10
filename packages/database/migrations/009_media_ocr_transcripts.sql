-- 009_media_ocr_transcripts.sql
-- Media Service: OCR transcripts persistence and full-text search GIN indexing

CREATE TABLE IF NOT EXISTS media_ocr_transcripts (
    id UUID PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    space_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    extracted_text TEXT NOT NULL,
    confidence NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    word_count INTEGER NOT NULL DEFAULT 0,
    language VARCHAR(16) NOT NULL DEFAULT 'eng',
    page_number INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_media_id ON media_ocr_transcripts(media_id);
CREATE INDEX IF NOT EXISTS idx_ocr_space_id ON media_ocr_transcripts(space_id);
CREATE INDEX IF NOT EXISTS idx_ocr_text_tsv
    ON media_ocr_transcripts USING gin (to_tsvector('english', extracted_text));
