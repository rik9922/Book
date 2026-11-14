-- 016_ocr_idempotency.sql
-- Ensures idempotent OCR transcript persistence per (media_id, page_number, language).

DELETE FROM media_ocr_transcripts a
USING media_ocr_transcripts b
WHERE a.ctid < b.ctid
  AND a.media_id = b.media_id
  AND a.page_number = b.page_number
  AND a.language = b.language;

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_ocr_unique_page
  ON media_ocr_transcripts (media_id, page_number, language);
