# AI-Powered Realistic Test Data Generation

**Product**: Memoria  
**Tagline**: *Your memories, made timeless.*  
**Cost Model**: $0 Budget (Cardless & Local-First)  

---

## 1. Principles of Realistic Test Data Generation

To avoid empty screens, generic lorem-ipsum placeholders, or unrepresentative mocks, Memoria utilizes an AI-directed, zero-cost local test data engine:

1. **No External Paid APIs**: All media generation runs 100% locally on the host machine using `sharp` (libvips) and `/opt/homebrew/bin/ffmpeg`.
2. **Cohesive Storylines & Multi-Generational Scenarios**: Data is not generated as random isolated rows. It represents coherent fictional family histories ("The Bennett Family") spanning decades.
3. **Valid File Headers & Native Codecs**:
   - Photos: Valid JPEG with mozjpeg compression, 4:4:4 chroma subsampling, and rich SVG canvas composition.
   - Videos: Valid MP4 container with H.264 High-Profile video and AAC 128k audio streams.
   - Audio: Valid M4A (`ipod` container) with AAC encoding.
   - Documents: Valid PDF 1.4 documents and formatted plain-text archives.
4. **Data Integrity & Determinism**: Every file is cataloged in `testing/fixtures/manifests/synthetic-media-manifest.json` with its SHA-256 checksum and simulated EXIF timestamps.

---

## 2. Generator Modules

```
testing/
  generators/
    image/
      generate-photos.ts        # Renders high-res photos with lighting, vignettes, & typography
    video/
      generate-videos.ts        # Synthesizes test video streams with H.264/AAC via ffmpeg
    audio/
      generate-audio.ts         # Generates audio tones & voice recordings via ffmpeg
    documents/
      generate-documents.ts     # Generates PDF and TXT genealogical documents
    structured-data/
      generate-fictional-family.ts # Assembles The Bennett Family relational models
```

---

## 3. Profiles

### Small Profile (`dataset-profile-small.json`)
- 4 Photos
- For fast smoke tests and CI pipeline verification.

### Standard Profile (`dataset-profile-standard.json`)
- 6 Photos, 2 Videos, 2 Audio Notes, 2 Documents
- Used for full iOS Simulator media injection and end-to-end user journey tests.

### Large Profile
- Generated programmatically for pagination, search indexing, and database latency stress testing.

