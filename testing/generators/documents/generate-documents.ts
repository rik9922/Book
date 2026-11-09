import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function generateSyntheticDocuments(outputDir: string): Promise<Array<{ filename: string; filePath: string; checksum: string; size: number }>> {
  await fs.mkdir(outputDir, { recursive: true });
  const results = [];

  const textFilename = "bennett_heritage_notes.txt";
  const textPath = path.join(outputDir, textFilename);
  const textContent = `=======================================================
THE BENNETT FAMILY HERITAGE & GENEALOGICAL ARCHIVE
Preserved for the Memoria Heirloom Archive (1948 - 2026)
=======================================================

Patriarch: Arthur Bennett (b. 1948, Mill Valley, CA)
Matriarch: Eleanor Bennett (b. 1951, Petaluma, CA)

Core Memories Recorded:
1. 1974 - The Oakridge Estate acquisition.
2. 1978 - David Bennett birth in San Francisco.
3. 2002 - Maya Bennett birth in Palo Alto.
4. 2017 - Lucas Bennett birth in Mill Valley.
5. 2024 - 50th Golden Anniversary of Arthur & Eleanor.

"We do not remember days; we remember moments. In each preserved story, 
the light of our family continues unbroken."

Document Signature: Synthetic Test Fixture / Internal Zero-Budget QA
`;

  await fs.writeFile(textPath, textContent, "utf-8");
  const textBytes = await fs.readFile(textPath);
  results.push({
    filename: textFilename,
    filePath: textPath,
    checksum: crypto.createHash("sha256").update(textBytes).digest("hex"),
    size: textBytes.length,
  });

  // Also write a minimal valid PDF 1.4 document
  const pdfFilename = "bennett_heritage_notes.pdf";
  const pdfPath = path.join(outputDir, pdfFilename);
  const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 120 >> stream
BT
/F1 18 Tf
50 720 Td
(The Bennett Family Heirloom Archive) Tj
/F1 12 Tf
0 -30 Td
(Synthetic test document for Memoria iOS Files import verification.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000416 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
495
%%EOF
`;

  await fs.writeFile(pdfPath, pdfContent, "utf-8");
  const pdfBytes = await fs.readFile(pdfPath);
  results.push({
    filename: pdfFilename,
    filePath: pdfPath,
    checksum: crypto.createHash("sha256").update(pdfBytes).digest("hex"),
    size: pdfBytes.length,
  });

  return results;
}
