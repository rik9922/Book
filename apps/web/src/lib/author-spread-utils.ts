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
    const leftHeading =
      sp.leftPage?.elements?.find((e) => e.type === "heading")?.content ||
      sp.leftPage?.elements?.find((e) => e.type === "text")?.content ||
      (sp.leftPage ? `Page ${sp.leftPage.pageNumber ?? idx * 2 + 1}` : "Inside Front Cover");
    const leftBody =
      sp.leftPage?.elements?.find((e) => e.type === "caption" || e.type === "text")?.content ||
      "Preserved in your Memoria Living Archive.";
    const rightHeading =
      sp.rightPage?.elements?.find((e) => e.type === "heading")?.content ||
      sp.rightPage?.elements?.find((e) => e.type === "text")?.content ||
      fallbackTitle;
    const rightBody =
      sp.rightPage?.elements?.find((e) => e.type === "caption" || e.type === "text")?.content ||
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
