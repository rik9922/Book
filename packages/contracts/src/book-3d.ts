import { z } from "zod";
import rawManifest from "./book-3d-manifest.json";

// ==============================================================================
// 1. CANONICAL SCENE GRAPH NODE HIERARCHY
// ==============================================================================

export const BOOK_3D_HIERARCHY = {
  root: "HeirloomBookRoot",
  spine: "Spine",
  backCover: "BackCover",
  textBlock: "TextBlock",
  ribbon: "SilkRibbonBookmark",
  frontCoverHinge: "FrontCoverHinge",
  frontCover: "FrontCover",
  emblem: "TreeOfLifeEmblem",
  cornerGuards: "CornerGuards",
  turningPageHinge: "TurningPageHinge",
  turningPageLeaf: "TurningPageLeaf",
} as const;

export const BOOK_3D_REQUIRED_NODES = [
  BOOK_3D_HIERARCHY.root,
  BOOK_3D_HIERARCHY.spine,
  BOOK_3D_HIERARCHY.backCover,
  BOOK_3D_HIERARCHY.textBlock,
  BOOK_3D_HIERARCHY.ribbon,
  BOOK_3D_HIERARCHY.frontCoverHinge,
  BOOK_3D_HIERARCHY.frontCover,
  BOOK_3D_HIERARCHY.emblem,
  BOOK_3D_HIERARCHY.cornerGuards,
  BOOK_3D_HIERARCHY.turningPageHinge,
  BOOK_3D_HIERARCHY.turningPageLeaf,
] as const;

// ==============================================================================
// 2. MANIFEST SCHEMA & VALIDATED SINGLE SOURCE OF TRUTH
// ==============================================================================

export const Book3DMaterialEntrySchema = z.object({
  color: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  metallic: z.number().min(0).max(1),
  roughness: z.number().min(0).max(1),
  description: z.string(),
});

export const Book3DAssetEntrySchema = z.object({
  relativePath: z.string(),
  byteSize: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  targetPlatform: z.string(),
});

export const Book3DManifestSchema = z.object({
  version: z.string(),
  modelId: z.string(),
  generator: z.string(),
  updatedAt: z.string(),
  dimensions: z.object({
    bookWidth: z.number().positive(),
    bookHeight: z.number().positive(),
    boardThickness: z.number().positive(),
    textblockThickness: z.number().positive(),
    unit: z.literal("meters"),
  }),
  topology: z.object({
    totalVertices: z.number().int().positive(),
    totalTriangles: z.number().int().positive(),
    subdivisions: z.object({
      spineSteps: z.number().int().positive(),
      emblemSegments: z.number().int().positive(),
      pageCurlSteps: z.number().int().positive(),
    }),
  }),
  materials: z.record(z.string(), Book3DMaterialEntrySchema),
  assets: z.object({
    glb: Book3DAssetEntrySchema,
    usdz: Book3DAssetEntrySchema,
  }),
  kinematics: z.object({
    hingeAxis: z.enum(["X", "Y", "Z"]),
    hingePivot: z.tuple([z.number(), z.number(), z.number()]),
    maxOpenAngleRadians: z.number(),
    pageTurnMaxAngleRadians: z.number(),
    easing: z.string(),
  }),
});

export type Book3DManifest = z.infer<typeof Book3DManifestSchema>;
export const CANONICAL_BOOK_3D_MANIFEST: Book3DManifest = Book3DManifestSchema.parse(rawManifest);

// ==============================================================================
// 3. LIVING ARCHIVE LEATHER & FOIL SWATCHES + PBR MATERIAL ADAPTERS
// ==============================================================================

export const BookLeatherSwatchIdSchema = z.enum(["plum", "navy", "burgundy", "onyx", "emerald"]);
export type BookLeatherSwatchId = z.infer<typeof BookLeatherSwatchIdSchema>;

export const BookFoilSwatchIdSchema = z.enum(["gold", "rose", "silver", "blind_emboss"]);
export type BookFoilSwatchId = z.infer<typeof BookFoilSwatchIdSchema>;

export interface LeatherSwatchSpec {
  id: BookLeatherSwatchId;
  name: string;
  hex: string;
  accentHex: string;
  metallic: number;
  roughness: number;
  clearcoat: number;
  description: string;
}

export interface FoilSwatchSpec {
  id: BookFoilSwatchId;
  name: string;
  shortLabel: string;
  hex: string;
  metallic: number;
  roughness: number;
  description: string;
}

export const BOOK_LEATHER_SWATCHES: readonly LeatherSwatchSpec[] = [
  {
    id: "plum",
    name: "Muted Plum",
    hex: "#76556F",
    accentHex: "#63445C",
    metallic: 0.04,
    roughness: 0.80,
    clearcoat: 0.08,
    description: "Living Archive signature French-morocco goatskin in Muted Plum",
  },
  {
    id: "navy",
    name: "Archival Navy",
    hex: "#16233B",
    accentHex: "#253A5E",
    metallic: 0.04,
    roughness: 0.80,
    clearcoat: 0.08,
    description: "Deep archival indigo-navy cloth-grained leather",
  },
  {
    id: "burgundy",
    name: "Vintage Burgundy",
    hex: "#3B141C",
    accentHex: "#5C202C",
    metallic: 0.04,
    roughness: 0.82,
    clearcoat: 0.08,
    description: "Warm oxblood heirloom morocco leather",
  },
  {
    id: "onyx",
    name: "Midnight Onyx",
    hex: "#1C1C1E",
    accentHex: "#2C2C2E",
    metallic: 0.05,
    roughness: 0.78,
    clearcoat: 0.10,
    description: "Charcoal-black library binding with subtle sheen",
  },
  {
    id: "emerald",
    name: "Heirloom Emerald",
    hex: "#1B382B",
    accentHex: "#304C43",
    metallic: 0.04,
    roughness: 0.80,
    clearcoat: 0.08,
    description: "Deep botanical forest green archival leather",
  },
] as const;

export const BOOK_FOIL_SWATCHES: readonly FoilSwatchSpec[] = [
  {
    id: "gold",
    name: "Metallic Gold Foil",
    shortLabel: "Gold",
    hex: "#D4AF37",
    metallic: 0.92,
    roughness: 0.25,
    description: "24-karat hot-stamped gold leaf foil and brass brackets",
  },
  {
    id: "rose",
    name: "Rose Gold Foil",
    shortLabel: "Rose",
    hex: "#B76E79",
    metallic: 0.90,
    roughness: 0.26,
    description: "Warm copper-rose archival leaf foil",
  },
  {
    id: "silver",
    name: "Sterling Silver Foil",
    shortLabel: "Silver",
    hex: "#C0C0C0",
    metallic: 0.94,
    roughness: 0.22,
    description: "Polished sterling silver hot foil stamping",
  },
  {
    id: "blind_emboss",
    name: "Blind Emboss",
    shortLabel: "Emboss",
    hex: "#5A4154",
    metallic: 0.06,
    roughness: 0.88,
    description: "Heat-debossed tone-on-tone impression without metallic leaf",
  },
] as const;

export const PbrMaterialSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  rgba: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  metallic: z.number().min(0).max(1),
  roughness: z.number().min(0).max(1),
  clearcoat: z.number().min(0).max(1).default(0),
  clearcoatRoughness: z.number().min(0).max(1).default(0.4),
  doubleSided: z.boolean().default(true),
});
export type PbrMaterialSpec = z.infer<typeof PbrMaterialSpecSchema>;

export interface ThreeMaterialParams {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

export interface RealityKitMaterialParams {
  baseColorRgba: [number, number, number, number];
  baseColorHex: string;
  metallic: number;
  roughness: number;
  clearcoat: number;
}

export function hexToNormalizedRgba(hex: string, alpha = 1.0): [number, number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return [0.463, 0.333, 0.435, alpha];
  }
  const r = Number((parseInt(clean.slice(0, 2), 16) / 255).toFixed(4));
  const g = Number((parseInt(clean.slice(2, 4), 16) / 255).toFixed(4));
  const b = Number((parseInt(clean.slice(4, 6), 16) / 255).toFixed(4));
  return [r, g, b, alpha];
}

export function resolveLeatherSwatch(idOrHex?: string): LeatherSwatchSpec {
  if (!idOrHex) return BOOK_LEATHER_SWATCHES[0];
  const normalized = idOrHex.trim().toLowerCase();
  return (
    BOOK_LEATHER_SWATCHES.find((s) => s.id === normalized || s.hex.toLowerCase() === normalized) ||
    BOOK_LEATHER_SWATCHES[0]
  );
}

export function resolveFoilSwatch(idOrHex?: string): FoilSwatchSpec {
  if (!idOrHex) return BOOK_FOIL_SWATCHES[0];
  const normalized = idOrHex.trim().toLowerCase();
  return (
    BOOK_FOIL_SWATCHES.find((s) => s.id === normalized || s.hex.toLowerCase() === normalized) ||
    BOOK_FOIL_SWATCHES[0]
  );
}

export function buildLeatherMaterialSpec(swatch: LeatherSwatchSpec): PbrMaterialSpec {
  return {
    id: `leather_${swatch.id}`,
    name: swatch.name,
    baseColorHex: swatch.hex,
    rgba: hexToNormalizedRgba(swatch.hex, 1.0),
    metallic: swatch.metallic,
    roughness: swatch.roughness,
    clearcoat: swatch.clearcoat,
    clearcoatRoughness: 0.45,
    doubleSided: true,
  };
}

export function buildFoilMaterialSpec(foil: FoilSwatchSpec, leatherSwatch?: LeatherSwatchSpec): PbrMaterialSpec {
  const effectiveHex =
    foil.id === "blind_emboss" && leatherSwatch ? leatherSwatch.accentHex : foil.hex;
  return {
    id: `foil_${foil.id}`,
    name: foil.name,
    baseColorHex: effectiveHex,
    rgba: hexToNormalizedRgba(effectiveHex, 1.0),
    metallic: foil.metallic,
    roughness: foil.roughness,
    clearcoat: foil.id === "blind_emboss" ? 0.05 : 0.25,
    clearcoatRoughness: 0.15,
    doubleSided: true,
  };
}

export const ARCHIVAL_PAPER_MATERIAL_SPEC: PbrMaterialSpec = {
  id: "archival_paper_ivory",
  name: "Archival Paper Ivory",
  baseColorHex: "#F7F4EE",
  rgba: CANONICAL_BOOK_3D_MANIFEST.materials.ArchivalPaperIvory.color,
  metallic: CANONICAL_BOOK_3D_MANIFEST.materials.ArchivalPaperIvory.metallic,
  roughness: CANONICAL_BOOK_3D_MANIFEST.materials.ArchivalPaperIvory.roughness,
  clearcoat: 0.0,
  clearcoatRoughness: 0.8,
  doubleSided: true,
};

export const SILK_RIBBON_MATERIAL_SPEC: PbrMaterialSpec = {
  id: "silk_ribbon_sage",
  name: "Soft Sage Silk Ribbon",
  baseColorHex: "#849483",
  rgba: CANONICAL_BOOK_3D_MANIFEST.materials.SilkRibbonSage.color,
  metallic: CANONICAL_BOOK_3D_MANIFEST.materials.SilkRibbonSage.metallic,
  roughness: CANONICAL_BOOK_3D_MANIFEST.materials.SilkRibbonSage.roughness,
  clearcoat: 0.12,
  clearcoatRoughness: 0.35,
  doubleSided: true,
};

export function toThreeMaterialParams(spec: PbrMaterialSpec): ThreeMaterialParams {
  return {
    color: spec.baseColorHex,
    metalness: spec.metallic,
    roughness: spec.roughness,
    clearcoat: spec.clearcoat,
    clearcoatRoughness: spec.clearcoatRoughness,
  };
}

export function toRealityKitMaterialParams(spec: PbrMaterialSpec): RealityKitMaterialParams {
  return {
    baseColorRgba: spec.rgba,
    baseColorHex: spec.baseColorHex,
    metallic: spec.metallic,
    roughness: spec.roughness,
    clearcoat: spec.clearcoat,
  };
}

// ==============================================================================
// 4. CAMERA PRESETS & LIGHTING INTENT (SHARED WEB + IOS)
// ==============================================================================

export const BookCameraPresetIdSchema = z.enum([
  "hero",
  "open_spread",
  "spine_detail",
  "emblem_closeup",
  "top_down",
]);
export type BookCameraPresetId = z.infer<typeof BookCameraPresetIdSchema>;

export const CameraPresetSpecSchema = z.object({
  id: BookCameraPresetIdSchema,
  label: z.string(),
  description: z.string(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  target: z.tuple([z.number(), z.number(), z.number()]),
  fovDegrees: z.number().min(20).max(75),
  minDistance: z.number().positive(),
  maxDistance: z.number().positive(),
});
export type CameraPresetSpec = z.infer<typeof CameraPresetSpecSchema>;

export const BOOK_CAMERA_PRESETS: readonly CameraPresetSpec[] = [
  {
    id: "hero",
    label: "Hero 3/4",
    description: "Balanced editorial three-quarter reading presentation",
    position: [0.16, 0.28, 0.42],
    target: [0.06, 0.01, 0.0],
    fovDegrees: 38,
    minDistance: 0.20,
    maxDistance: 0.85,
  },
  {
    id: "open_spread",
    label: "Open Spread",
    description: "Centered reading perspective framed for open two-page spreads",
    position: [0.0, 0.34, 0.28],
    target: [0.0, 0.01, 0.0],
    fovDegrees: 40,
    minDistance: 0.20,
    maxDistance: 0.85,
  },
  {
    id: "spine_detail",
    label: "Spine & Joint",
    description: "Close inspection of cambered French-morocco spine and hinge",
    position: [-0.26, 0.16, 0.28],
    target: [-0.01, 0.0, 0.0],
    fovDegrees: 34,
    minDistance: 0.18,
    maxDistance: 0.75,
  },
  {
    id: "emblem_closeup",
    label: "Foil Medallion",
    description: "Macro reflection inspection of hot-stamped gold foil medallion",
    position: [0.12, 0.21, 0.14],
    target: [0.10, 0.015, 0.0],
    fovDegrees: 32,
    minDistance: 0.15,
    maxDistance: 0.65,
  },
  {
    id: "top_down",
    label: "Flat Proof",
    description: "Orthographic-like overhead proof view for typography alignment",
    position: [0.02, 0.44, 0.04],
    target: [0.02, 0.0, 0.0],
    fovDegrees: 36,
    minDistance: 0.22,
    maxDistance: 0.90,
  },
] as const;

export function resolveCameraPreset(id?: string): CameraPresetSpec {
  return BOOK_CAMERA_PRESETS.find((preset) => preset.id === id) || BOOK_CAMERA_PRESETS[0];
}

export const LightingIntentSpecSchema = z.object({
  presetName: z.string(),
  backgroundHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  ambientIntensity: z.number().min(0).max(5),
  keyLight: z.object({
    position: z.tuple([z.number(), z.number(), z.number()]),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    intensity: z.number().min(0).max(10),
  }),
  fillLight: z.object({
    position: z.tuple([z.number(), z.number(), z.number()]),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    intensity: z.number().min(0).max(10),
  }),
  rimLight: z.object({
    position: z.tuple([z.number(), z.number(), z.number()]),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    intensity: z.number().min(0).max(10),
  }),
  shadowOpacity: z.number().min(0).max(1),
});
export type LightingIntentSpec = z.infer<typeof LightingIntentSpecSchema>;

export const BOOK_LIGHTING_INTENT: LightingIntentSpec = {
  presetName: "LivingArchiveWarmMuseum",
  backgroundHex: "#F7F4EE",
  ambientIntensity: 1.05,
  keyLight: {
    position: [2.5, 4.5, 3.0],
    colorHex: "#FFF8EB",
    intensity: 2.15,
  },
  fillLight: {
    position: [-2.5, 1.5, -2.0],
    colorHex: "#D4E6DF",
    intensity: 0.85,
  },
  rimLight: {
    position: [0.0, 3.5, 2.5],
    colorHex: "#FFF5DF",
    intensity: 1.65,
  },
  shadowOpacity: 0.34,
};

// ==============================================================================
// 5. ANIMATION, KINEMATICS & INTERACTION CONTRACT
// ==============================================================================

export const AnimationContractSchema = z.object({
  hingeNodeName: z.string(),
  pageHingeNodeName: z.string(),
  hingeAxis: z.enum(["X", "Y", "Z"]),
  hingePivot: z.tuple([z.number(), z.number(), z.number()]),
  closedAngleRadians: z.number(),
  openAngleRadians: z.number(),
  pageTurnStartRadians: z.number(),
  pageTurnEndRadians: z.number(),
  coverOpenDurationMs: z.number().int().positive(),
  pageTurnDurationMs: z.number().int().positive(),
  coverLerpSpeed: z.number().positive(),
  pageTurnLerpSpeed: z.number().positive(),
  pageCurlAmplitude: z.number().nonnegative(),
  easing: z.literal("easeInOutCubic"),
});
export type AnimationContract = z.infer<typeof AnimationContractSchema>;

export const BOOK_ANIMATION_CONTRACT: AnimationContract = {
  hingeNodeName: BOOK_3D_HIERARCHY.frontCoverHinge,
  pageHingeNodeName: BOOK_3D_HIERARCHY.turningPageHinge,
  hingeAxis: CANONICAL_BOOK_3D_MANIFEST.kinematics.hingeAxis,
  hingePivot: CANONICAL_BOOK_3D_MANIFEST.kinematics.hingePivot,
  closedAngleRadians: 0,
  openAngleRadians: CANONICAL_BOOK_3D_MANIFEST.kinematics.maxOpenAngleRadians,
  pageTurnStartRadians: 0,
  pageTurnEndRadians: CANONICAL_BOOK_3D_MANIFEST.kinematics.pageTurnMaxAngleRadians,
  coverOpenDurationMs: 650,
  pageTurnDurationMs: 520,
  coverLerpSpeed: 4.5,
  pageTurnLerpSpeed: 6.0,
  pageCurlAmplitude: 0.015,
  easing: "easeInOutCubic",
};

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function evaluateCubicBezierEaseInOut(t: number): number {
  const clamped = clamp01(t);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function computeCoverHingeAngle(
  openProgress: number,
  contract: AnimationContract = BOOK_ANIMATION_CONTRACT
): number {
  const eased = evaluateCubicBezierEaseInOut(openProgress);
  return (
    contract.closedAngleRadians +
    (contract.openAngleRadians - contract.closedAngleRadians) * eased
  );
}

export function computePageTurnAngle(
  turnProgress: number,
  contract: AnimationContract = BOOK_ANIMATION_CONTRACT
): number {
  const eased = evaluateCubicBezierEaseInOut(turnProgress);
  return (
    contract.pageTurnStartRadians +
    (contract.pageTurnEndRadians - contract.pageTurnStartRadians) * eased
  );
}

export function computePageCurlDisplacement(
  normalizedX: number,
  curlFactor = BOOK_ANIMATION_CONTRACT.pageCurlAmplitude,
  turnProgress = 0.5
): number {
  const u = clamp01(normalizedX);
  const dynamicLift = Math.sin(clamp01(turnProgress) * Math.PI);
  return curlFactor * u * u * (0.35 + 0.65 * dynamicLift);
}

// ==============================================================================
// 6. SHARED BOOK 3D CONFIGURATION & SAMPLE ARCHIVAL SPREADS
// ==============================================================================

export const Book3DConfigurationSchema = z.object({
  leatherId: BookLeatherSwatchIdSchema.default("plum"),
  foilId: BookFoilSwatchIdSchema.default("gold"),
  coverTitle: z.string().min(1).max(60).default("The Bennett Heritage"),
  coverSubtitle: z.string().max(80).default("1948 — 2026 • Memoria Volume I"),
  spineText: z.string().max(40).default("MEMORIA VOL. I"),
  isOpen: z.boolean().default(false),
  currentSpreadIndex: z.number().int().min(0).default(0),
  totalSpreads: z.number().int().min(1).default(4),
  cameraPreset: BookCameraPresetIdSchema.default("hero"),
  reducedMotion: z.boolean().default(false),
});
export type Book3DConfiguration = z.infer<typeof Book3DConfigurationSchema>;

export const DEFAULT_BOOK_3D_CONFIGURATION: Book3DConfiguration = Book3DConfigurationSchema.parse({});

export interface BookSpreadPreview {
  spreadIndex: number;
  chapterTitle: string;
  leftPageNumber: number;
  rightPageNumber: number;
  leftHeading: string;
  leftDate: string;
  leftLocation: string;
  leftBody: string;
  rightHeading: string;
  rightDate: string;
  rightLocation: string;
  rightBody: string;
  ocrInscription?: string;
}

export const CANONICAL_SAMPLE_SPREADS: readonly BookSpreadPreview[] = [
  {
    spreadIndex: 0,
    chapterTitle: "Prologue • Family Hearth",
    leftPageNumber: 1,
    rightPageNumber: 2,
    leftHeading: "Ex Libris • The Bennett Archive",
    leftDate: "1948 — 2026",
    leftLocation: "Mill Valley, California",
    leftBody:
      "Compiled by three generations of the Bennett family on acid-free cotton rag stock. Every photograph and letter has been SHA-256 verified for permanence.",
    rightHeading: "Chapter I: The Wisteria Pergola",
    rightDate: "June 14, 1978",
    rightLocation: "Villa Bellagio, Lake Como",
    rightBody:
      "All three generations gathered under the afternoon sun. Grandfather wore his tailored tweed jacket, reciting the poem he wrote for Eleanor in Florence in 1928.",
    ocrInscription: "To Eleanor, my north star across fifty summers — James, June 1978",
  },
  {
    spreadIndex: 1,
    chapterTitle: "Chapter II • Childhood & Orchard",
    leftPageNumber: 3,
    rightPageNumber: 4,
    leftHeading: "First Steps in the High Orchard",
    leftDate: "September 22, 1994",
    leftLocation: "Sonoma Valley Estate",
    leftBody:
      "Between the rows of honeycrisp trees, Clara let go of her mother’s hands and took seven steady steps toward the basket of freshly harvested pears.",
    rightHeading: "Autumn Harvest Notes",
    rightDate: "October 8, 1994",
    rightLocation: "Sonoma Barn Loft",
    rightBody:
      "Pressed 35mm Kodachrome contact sheets preserved alongside Grandmother’s handwritten orchard ledger and cider recipes.",
  },
  {
    spreadIndex: 2,
    chapterTitle: "Chapter III • Letters Across Oceans",
    leftPageNumber: 5,
    rightPageNumber: 6,
    leftHeading: "Postcard from Normandy",
    leftDate: "August 3, 1944",
    leftLocation: "Sainte-Mère-Église, France",
    leftBody:
      "Original postcard found inside the cedar chest. Penciled on field stationery, assuring his parents he was safe and asking about the cider harvest back in Devon.",
    rightHeading: "Archival OCR Transcription",
    rightDate: "Digitized 2026",
    rightLocation: "Local Archive Vault",
    rightBody:
      "Preserved at 600 DPI lossless master resolution with bilingual transcription and original postmark watermarks intact.",
    ocrInscription:
      "My dearest Mother & Father — Do not worry about me. The cider apples must be sweet this year.",
  },
  {
    spreadIndex: 3,
    chapterTitle: "Epilogue • Colophon & Integrity",
    leftPageNumber: 7,
    rightPageNumber: 8,
    leftHeading: "Living Archive Colophon",
    leftDate: "Edition Hash Verified",
    leftLocation: "Local-First Vault",
    leftBody:
      "Bound in vegetable-tanned French morocco leather with 24k hot-stamped foil and 170gsm cotton rag pages.",
    rightHeading: "Continuing the Chronicle",
    rightDate: "2026 & Beyond",
    rightLocation: "Family Circle",
    rightBody:
      "Spaces remain open for future generations to add voice oral histories, heirloom photographs, and milestone letters.",
  },
] as const;
