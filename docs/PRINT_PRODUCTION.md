# Physical Print Production & Preflight Pipeline

## 1. Automated Preflight Verification Rules

Prior to freezing a book edition for physical manufacturing, the preflight engine validates:

1. **Page Count**: Must be a multiple of 4 (standard book signature requirement).
2. **Trim & Bleed Geometry**:
   - Standard 0.125 inch (3.175 mm) bleed on all exterior page margins.
   - 0.500 inch (12.7 mm) safe margin for all text and vital visual elements.
   - Gutter allowance: 0.750 inch (19.0 mm) on inner binding edges.
3. **Image Resolution**: Every raster photograph must provide $\ge 300$ DPI at its placed physical dimensions. Warnings are emitted if an image falls between 200–299 DPI; hard errors below 200 DPI.
4. **Color Conversion**: CMYK color gamut checking for print fidelity without clipping out-of-gamut tones.

## 2. Immutable Edition Freeze
- The exact state of the book document is hashed using SHA-256 (`frozenEditionHash`).
- The edition status is marked `isFrozenForPrint = true`.
- Any subsequent user edits automatically fork into a new draft edition (`version + 1`), preserving the print order's integrity forever.

## 3. Supplier Integration Sandboxing
- Integrations with physical printers (e.g., Peecho, Gelato, Prodigi) are accessed via modular supplier adapters.
- In zero-budget development mode, orders run against verified sandbox mock endpoints generating certified PDF proofs without charging real payment methods.

