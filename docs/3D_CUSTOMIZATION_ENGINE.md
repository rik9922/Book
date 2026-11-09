# Memoria — 3D Book Customization Engine

**Product**: Memoria  
**Component**: Interactive Archival Book Studio  

---

## 1. User Experience & Real-Time Feedback

The 3D Customization Engine allows families, archivists, and editors to preview their physical keepsake before sending it to press:

1. **Cover Material Selection**:
   Instantaneous PBR leather shader color swapping (`Heirloom Emerald`, `Archival Navy`, `Vintage Burgundy`, `Midnight Onyx`).
2. **Foil Stamping Selection**:
   Dynamic metallic reflectance tuning (`Champagne Gold`, `Rose Gold`, `Sterling Silver`).
3. **Live Vector Embossing**:
   Real-time debossed 3D typographic rendering via `@react-three/drei` vector text.
4. **Articulable Cover Inspection**:
   Users can click the book or the "Open Book / Close Cover" button to observe the volume opening along its spine hinge.
5. **Interactive Orbit Controls**:
   Full 360-degree rotation, constrained vertical elevation ($0^\circ$ to $105^\circ$), and smooth zoom bounds.

---

## 2. State Synchronization Contract

The customizer emits specifications compatible with the print commerce order pipeline:

```typescript
export interface BookPrintSpec {
  coverColorHex: string;
  coverLeatherType: "morocco_emerald" | "navy_archival" | "vintage_burgundy" | "midnight_onyx";
  foilStampingType: "gold_leaf" | "rose_gold" | "silver_foil";
  embossedTitle: string;
  embossedSubtitle: string;
  pageCount: number;
  format: "square_8x8" | "portrait_8x10" | "landscape_11x8";
}
```

This guarantees 100% visual fidelity between the on-screen 3D interactive preview and the physically bound volume.
