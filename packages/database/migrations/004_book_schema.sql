-- 004_book_schema.sql
-- Book Service: Canonical Book documents, spreads, pages, layout elements, and frozen print editions

CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    format VARCHAR(100) NOT NULL DEFAULT 'hardcover_standard_8x10',
    cover_color VARCHAR(50) NOT NULL DEFAULT '#304C43',
    cover_material VARCHAR(50) NOT NULL DEFAULT 'cloth',
    foil_stamping VARCHAR(50) NOT NULL DEFAULT 'gold',
    cover_title VARCHAR(255) NOT NULL,
    spine_text VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    is_frozen_for_print BOOLEAN NOT NULL DEFAULT FALSE,
    frozen_edition_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_spreads (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    spread_index INTEGER NOT NULL,
    left_page JSONB,
    right_page JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_space ON books(space_id);
CREATE INDEX IF NOT EXISTS idx_spreads_book_index ON book_spreads(book_id, spread_index ASC);
