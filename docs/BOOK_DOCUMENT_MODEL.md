# Canonical Book Document Model

## 1. Universal Document Schema

The 2D editor, the 3D WebGL renderer, the native iOS RealityKit viewport, and the print preflight engine share the exact same canonical JSON document schema.

```typescript
export interface BookDocument {
  id: string;                         // UUIDv4
  spaceId: string;                    // UUIDv4
  title: string;                      // Display title
  subtitle?: string;                  // Optional subtitle
  format: BookFormat;                 // "hardcover_standard_8x10" | "hardcover_square_8x8" | "hardcover_grand_12x12"
  coverColor: string;                 // Hex e.g. "#304C43"
  coverMaterial: string;              // "cloth" | "leather" | "linen" | "matte_paper"
  foilStamping: "gold" | "silver" | "blind_emboss" | "none";
  coverTitle: string;
  spineText?: string;
  spreads: BookSpread[];
  version: number;                    // Incrementing version integer
  isFrozenForPrint: boolean;          // Locked for production
  frozenEditionHash?: string;         // SHA-256 snapshot hash
  createdAt: string;
  updatedAt: string;
}

export interface BookSpread {
  id: string;
  spreadIndex: number;                // 0 = inside cover spread, 1..N = content spreads
  leftPage: BookPage | null;
  rightPage: BookPage | null;
}

export interface BookPage {
  id: string;
  pageNumber: number;
  layoutType: PageLayoutType;         // e.g. "photo_with_story", "two_photo_grid"
  backgroundColor: string;           // Hex e.g. "#F7F4ED"
  elements: PageElement[];
}

export interface PageElement {
  id: string;
  type: "image" | "text" | "heading" | "caption" | "qr_code" | "decorative";
  x: number;                          // Percentage [0..100]
  y: number;                          // Percentage [0..100]
  width: number;                      // Percentage [0..100]
  height: number;                     // Percentage [0..100]
  rotation: number;                   // Degrees
  zIndex: number;
  content?: string;                   // Text string or media asset ID
  style: Record<string, any>;         // Typography, font-size, crop offsets
}
```

