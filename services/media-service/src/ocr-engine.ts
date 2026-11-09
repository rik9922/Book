import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { createServiceLogger } from "@memory-capsule/logger";

const execFileAsync = promisify(execFile);
const logger = createServiceLogger("ocr-engine");

export interface OcrWordBox {
  text: string;
  confidence: number;
  bbox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  wordCount: number;
  words: OcrWordBox[];
}

export interface OcrProcessingResult {
  pages: OcrPageResult[];
  fullText: string;
  averageConfidence: number;
  totalWords: number;
  durationMs: number;
  engine: string;
}

export class OcrEngine {
  private tesseractPath: string = "";
  private pdftoppmPath: string = "";
  private isAvailable: boolean = false;

  constructor() {
    this.discoverBinaries();
  }

  private discoverBinaries() {
    const candidateTesseract = [
      "/opt/homebrew/bin/tesseract",
      "/usr/local/bin/tesseract",
      "/usr/bin/tesseract",
    ];

    for (const p of candidateTesseract) {
      if (existsSync(p)) {
        this.tesseractPath = p;
        this.isAvailable = true;
        break;
      }
    }

    const candidatePdftoppm = [
      "/opt/homebrew/bin/pdftoppm",
      "/usr/local/bin/pdftoppm",
      "/usr/bin/pdftoppm",
    ];

    for (const p of candidatePdftoppm) {
      if (existsSync(p)) {
        this.pdftoppmPath = p;
        break;
      }
    }
  }

  public getStatus(): { isAvailable: boolean; tesseractPath: string; pdftoppmPath: string } {
    return {
      isAvailable: this.isAvailable,
      tesseractPath: this.tesseractPath,
      pdftoppmPath: this.pdftoppmPath,
    };
  }

  /**
   * Preprocesses an image buffer using Sharp to maximize OCR character recognition:
   * 1. Grayscale
   * 2. Contrast normalization
   * 3. Sharpening filter
   */
  public async preprocessImage(inputBuffer: Buffer): Promise<Buffer> {
    return sharp(inputBuffer)
      .flatten({ background: "#ffffff" })
      .toColourspace("b-w")
      .normalize()
      .sharpen({ sigma: 1.0 })
      .png()
      .toBuffer();
  }

  /**
   * Processes an image file or buffer and extracts text with TSV bounding box data and confidence
   */
  public async processImage(imageBuffer: Buffer, language = "eng"): Promise<OcrPageResult> {
    if (!this.isAvailable) {
      throw new Error(`[OcrEngine] Tesseract executable not found. Please verify installation via brew install tesseract.`);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memoria-ocr-"));
    const preprocessedBuffer = await this.preprocessImage(imageBuffer);
    const tempInput = path.join(tempDir, "input.png");
    await fs.writeFile(tempInput, preprocessedBuffer);

    try {
      // 1. Run Tesseract generating TSV output for word-level confidence
      const { stdout: tsvOutput } = await execFileAsync(this.tesseractPath, [
        tempInput,
        "stdout",
        "-l", language,
        "--psm", "3",
        "tsv",
      ]);

      // 2. Parse TSV
      const lines = tsvOutput.trim().split("\n");
      const words: OcrWordBox[] = [];
      let totalConf = 0;
      let validWordCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split("\t");
        if (cols.length >= 12) {
          const conf = parseFloat(cols[10]);
          const text = cols[11]?.trim();

          if (text && conf >= 0) {
            words.push({
              text,
              confidence: conf,
              bbox: {
                left: parseInt(cols[6], 10),
                top: parseInt(cols[7], 10),
                width: parseInt(cols[8], 10),
                height: parseInt(cols[9], 10),
              },
            });
            totalConf += conf;
            validWordCount++;
          }
        }
      }

      // 3. Plain text extraction
      const { stdout: textOutput } = await execFileAsync(this.tesseractPath, [
        tempInput,
        "stdout",
        "-l", language,
        "--psm", "3",
      ]);

      const cleanedText = textOutput.trim();
      const avgConfidence = validWordCount > 0 ? parseFloat((totalConf / validWordCount).toFixed(2)) : 0;

      return {
        pageNumber: 1,
        text: cleanedText,
        confidence: avgConfidence,
        wordCount: validWordCount,
        words,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Processes a multi-page PDF or image document
   */
  public async processDocument(buffer: Buffer, mimeType: string, language = "eng"): Promise<OcrProcessingResult> {
    const startTime = Date.now();

    if (mimeType === "application/pdf") {
      if (!this.pdftoppmPath) {
        throw new Error("[OcrEngine] pdftoppm (poppler) is required for PDF OCR processing.");
      }

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memoria-pdf-ocr-"));
      const tempPdf = path.join(tempDir, "doc.pdf");
      await fs.writeFile(tempPdf, buffer);

      try {
        // Render PDF pages to PNG at 150 DPI
        await execFileAsync(this.pdftoppmPath, ["-png", "-r", "150", tempPdf, path.join(tempDir, "page")]);

        const files = await fs.readdir(tempDir);
        const pageFiles = files.filter((f) => f.startsWith("page-") && f.endsWith(".png")).sort();

        const pages: OcrPageResult[] = [];
        let totalWords = 0;
        let sumConfidence = 0;

        for (let idx = 0; idx < pageFiles.length; idx++) {
          const pageImgBuffer = await fs.readFile(path.join(tempDir, pageFiles[idx]));
          const pageResult = await this.processImage(pageImgBuffer, language);
          pageResult.pageNumber = idx + 1;
          pages.push(pageResult);
          totalWords += pageResult.wordCount;
          sumConfidence += pageResult.confidence;
        }

        const fullText = pages.map((p) => p.text).filter((t) => t.length > 0).join("\n\n--- Page Break ---\n\n");
        const avgConfidence = pages.length > 0 ? parseFloat((sumConfidence / pages.length).toFixed(2)) : 0;

        return {
          pages,
          fullText,
          averageConfidence: avgConfidence,
          totalWords,
          durationMs: Date.now() - startTime,
          engine: "tesseract-5.5.3-poppler",
        };
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    } else {
      // Standard image
      const pageResult = await this.processImage(buffer, language);
      return {
        pages: [pageResult],
        fullText: pageResult.text,
        averageConfidence: pageResult.confidence,
        totalWords: pageResult.wordCount,
        durationMs: Date.now() - startTime,
        engine: "tesseract-5.5.3",
      };
    }
  }
}
