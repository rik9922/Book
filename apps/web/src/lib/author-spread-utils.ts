import type { BookSpreadPreview } from "@memory-capsule/contracts/book-3d";
import type { AuthorEnvironment } from "@memory-capsule/contracts/author-studio";

export interface RawSpreadElement {
  id: string;
  type: "image" | "text" | "caption" | "heading" | "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: string;
  style?: Record<string, unknown>;
}

export interface RawSpreadPage {
  id: string;
  pageNumber: number;
  layoutType: string;
  backgroundColor: string;
  elements: RawSpreadElement[];
}

export interface RawBookSpread {
  id: string;
  spreadIndex: number;
  leftPage: RawSpreadPage | null;
  rightPage: RawSpreadPage | null;
}

/**
 * Maps legacy /studio?tab=... values to canonical Author Studio environments.
 */
export function mapLegacyStudioTabToEnvironment(tab?: string | null): AuthorEnvironment | null {
  switch ((tab || "").toLowerCase()) {
    case "write":
      return "write";
    case "structure":
    case "curation":
      return "structure";
    case "design":
    case "cover":
      return "design";
    case "preview":
    case "spreads":
    case "theater":
      return "preview";
    case "publish":
    case "preflight":
      return "publish";
    default:
      return null;
  }
}

export type SpreadTemplateLayout = "editorial_classic" | "photo_journal" | "fine_art_spread";
export type SpreadFocalPreset = "50% 50%" | "50% 20%" | "50% 80%";

/**
 * Maps persisted PageLayoutType values back to the Spread Composer template selector.
 */
export function mapPageLayoutToTemplate(layoutType?: string | null): SpreadTemplateLayout {
  switch (layoutType) {
    case "full_bleed_single":
    case "fine_art_spread":
      return "fine_art_spread";
    case "photo_with_story":
    case "two_photo_grid":
    case "photo_journal":
      return "photo_journal";
    default:
      return "editorial_classic";
  }
}

/**
 * Extracts the persisted image/caption focal point from either page of a spread.
 */
export function extractFocalPointFromSpread(
  spread?: {
    leftPage?: { elements?: Array<{ type?: string; style?: Record<string, unknown> }> } | null;
    rightPage?: { elements?: Array<{ type?: string; style?: Record<string, unknown> }> } | null;
  } | null
): SpreadFocalPreset {
  const allElements = [
    ...(spread?.leftPage?.elements || []),
    ...(spread?.rightPage?.elements || []),
  ];
  const imageFirst = [
    ...allElements.filter((el) => el.type === "image"),
    ...allElements.filter((el) => el.type !== "image"),
  ];
  for (const el of imageFirst) {
    const raw =
      (el.style?.focalPoint as string | undefined) ||
      (el.style?.objectPosition as string | undefined);
    if (raw === "50% 50%" || raw === "50% 20%" || raw === "50% 80%") {
      return raw;
    }
  }
  return "50% 50%";
}

/**
 * Converts persisted BookDocument spreads into 3D Book Theater preview spreads.
 */
export function mapBookSpreadsToTheaterPreview(
  rawSpreads: Array<{
    id?: string;
    spreadIndex?: number;
    leftPage?: {
      pageNumber?: number;
      elements?: Array<{ type?: string; content?: string }>;
    } | null;
    rightPage?: {
      pageNumber?: number;
      elements?: Array<{ type?: string; content?: string }>;
    } | null;
  }>,
  fallbackTitle: string
): BookSpreadPreview[] {
  return rawSpreads.map((sp, idx) => {
    const leftHeadingEl = sp.leftPage?.elements?.find((e) => e.type === "heading");
    const leftCaptionEl = sp.leftPage?.elements?.find((e) => e.type === "caption");
    const leftTextEl = sp.leftPage?.elements?.find((e) => e.type === "text");
    const leftHeading =
      leftHeadingEl?.content ||
      (sp.leftPage ? `Page ${sp.leftPage.pageNumber ?? idx * 2 + 1}` : "Inside Front Cover");
    const leftBody =
      leftCaptionEl?.content ||
      leftTextEl?.content ||
      "Preserved in your Memoria Living Archive.";

    const rightHeadingEl = sp.rightPage?.elements?.find((e) => e.type === "heading");
    const rightCaptionEl = sp.rightPage?.elements?.find((e) => e.type === "caption");
    const rightTextEl = sp.rightPage?.elements?.find((e) => e.type === "text");
    const rightHeading = rightHeadingEl?.content || fallbackTitle;
    const rightBody =
      rightCaptionEl?.content ||
      rightTextEl?.content ||
      "Crafted for generational safekeeping.";

    return {
      spreadIndex: sp.spreadIndex ?? idx,
      chapterTitle: fallbackTitle,
      leftPageNumber: sp.leftPage?.pageNumber ?? idx * 2 + 1,
      leftHeading,
      leftDate: "Archival Edition",
      leftLocation: "Memoria Vault",
      leftBody,
      rightPageNumber: sp.rightPage?.pageNumber ?? idx * 2 + 2,
      rightHeading,
      rightDate: "Archival Edition",
      rightLocation: "Memoria Vault",
      rightBody,
    };
  });
}

/**
 * Non-lossy focal-point updater for pages (such as curated leftPage photo spreads).
 * Preserves every element and style property while updating image objectPosition/focalPoint.
 */
export function updateImageFocalPointsNonLossy(
  existingElements: RawSpreadElement[] | undefined,
  focalPoint: string
): RawSpreadElement[] {
  if (!Array.isArray(existingElements)) return [];
  return existingElements.map((el) => {
    const nextStyle = el.style ? { ...el.style } : undefined;
    if (el.type === "image") {
      return {
        ...el,
        style: {
          ...(nextStyle || {}),
          objectPosition: focalPoint,
          focalPoint,
        },
      };
    }
    return { ...el, style: nextStyle };
  });
}

/**
 * Non-lossy element merger for spread updates.
 * Preserves ALL existing elements (images, shapes, extra captions/text, crops)
 * while updating or appending the primary heading, primary caption, and focal point.
 */
export function mergeSpreadPageElementsNonLossy(
  existingElements: RawSpreadElement[] | undefined,
  updates: {
    heading: string;
    caption: string;
    focalPoint: string;
    createId?: () => string;
  }
): RawSpreadElement[] {
  const genId = updates.createId || (() => crypto.randomUUID());
  const source = Array.isArray(existingElements) ? existingElements.map((el) => ({ ...el, style: el.style ? { ...el.style } : undefined })) : [];

  let updatedHeading = false;
  let updatedCaption = false;

  const merged = source.map((el) => {
    if (el.type === "image") {
      return {
        ...el,
        style: {
          ...(el.style || {}),
          objectPosition: updates.focalPoint,
          focalPoint: updates.focalPoint,
        },
      };
    }
    if (!updatedHeading && el.type === "heading") {
      updatedHeading = true;
      return {
        ...el,
        content: updates.heading.trim(),
      };
    }
    if (!updatedCaption && (el.type === "caption" || el.type === "text")) {
      updatedCaption = true;
      return {
        ...el,
        content: updates.caption.trim(),
        style: {
          ...(el.style || {}),
          focalPoint: updates.focalPoint,
        },
      };
    }
    return el;
  });

  if (!updatedHeading && updates.heading.trim()) {
    merged.push({
      id: genId(),
      type: "heading",
      x: 10,
      y: 20,
      width: 80,
      height: 18,
      rotation: 0,
      zIndex: merged.length + 1,
      content: updates.heading.trim(),
      style: { fontFamily: "serif", fontSize: 28, color: "#20242C" },
    });
  }

  if (!updatedCaption && updates.caption.trim()) {
    merged.push({
      id: genId(),
      type: "caption",
      x: 10,
      y: 44,
      width: 80,
      height: 24,
      rotation: 0,
      zIndex: merged.length + 1,
      content: updates.caption.trim(),
      style: { fontFamily: "sans-serif", fontSize: 16, color: "#5C5955", focalPoint: updates.focalPoint },
    });
  }

  return merged;
}
