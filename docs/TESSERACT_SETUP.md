# Memoria — Tesseract OCR & Document Processing Setup Guide

This guide details the local setup, configuration, and verification of the optical character recognition (OCR) pipeline in **Memoria**.

Memoria utilizes 100% free, cardless, local-first OCR processing for scanned photographs, letters, journals, and archival documents without relying on paid third-party cloud vision APIs.

---

## 1. Prerequisites & Host Binaries

The OCR pipeline relies on two native utilities:
1. **Tesseract OCR (v5.x)**: Open-source optical character recognition engine.
2. **pdftoppm (Poppler)**: High-performance PDF rasterizer used to extract PDF pages as images.

### Installation via Homebrew (macOS)

```bash
# Install Tesseract OCR and English traineddata models
brew install tesseract

# Install Poppler for PDF multi-page rasterization
brew install poppler
```

### Installation Verification

Run the following commands to verify installation:

```bash
# Verify Tesseract version and binary location
tesseract --version
which tesseract
# Default Homebrew Apple Silicon location: /opt/homebrew/bin/tesseract

# Verify Poppler pdftoppm binary location
pdftoppm -v
which pdftoppm
# Default Homebrew Apple Silicon location: /opt/homebrew/bin/pdftoppm
```

### Supported Languages & Traineddata

Tesseract stores language models in the `tessdata` directory. On macOS:
`/opt/homebrew/share/tessdata/`

To inspect installed language packages:
```bash
tesseract --list-langs
```

To install additional historical languages (e.g., French, German, Spanish, Latin):
```bash
brew install tesseract-lang
```

---

## 2. Dynamic Discovery Architecture

Memoria automatically probes known binary locations at service startup without hardcoding absolute paths. The discovery search order is:

1. `/opt/homebrew/bin/tesseract` (macOS Apple Silicon)
2. `/usr/local/bin/tesseract` (macOS Intel)
3. `/usr/bin/tesseract` (Linux / Alpine / Debian)

If native binaries are unavailable on a developer's machine:
- The service starts gracefully.
- Health checks report `isAvailable: false`.
- Endpoints return `503 Service Unavailable` with `OCR_UNAVAILABLE` error code.
- Unit and integration tests gracefully adjust their expectations.

---

## 3. Database Schema

The OCR results are persisted in PostgreSQL in the `media_db` database:

```sql
CREATE TABLE IF NOT EXISTS media_ocr_transcripts (
  id UUID PRIMARY KEY,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  space_id UUID NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  extracted_text TEXT NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  word_count INTEGER NOT NULL DEFAULT 0,
  language VARCHAR(16) NOT NULL DEFAULT 'eng',
  page_number INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by media asset
CREATE INDEX IF NOT EXISTS idx_ocr_transcripts_media_id ON media_ocr_transcripts (media_id);

-- Space-scoped queries
CREATE INDEX IF NOT EXISTS idx_ocr_transcripts_space_id ON media_ocr_transcripts (space_id);

-- PostgreSQL GIN Full-Text Search index
CREATE INDEX IF NOT EXISTS idx_ocr_transcripts_fts
  ON media_ocr_transcripts USING GIN (to_tsvector('english', extracted_text));
```

---

## 4. Operational API Reference

### Check Engine Status
```http
GET /api/v1/media/ocr/status
```
Response:
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "tesseractPath": "/opt/homebrew/bin/tesseract",
    "pdftoppmPath": "/opt/homebrew/bin/pdftoppm"
  }
}
```

### Trigger On-Demand OCR
```http
POST /api/v1/media/:id/ocr
Content-Type: application/json

{
  "language": "eng"
}
```

### Retrieve Transcripts
```http
GET /api/v1/media/:id/ocr
```

### Full-Text Search Across Transcripts
```http
GET /api/v1/media/ocr/search?spaceId=<space-uuid>&q=Tuscany
```

---

## 5. Verification Commands

Run the automated OCR pipeline test suite:
```bash
NODE_ENV=test pnpm tsx --test tests/ocr-pipeline.test.ts
```

