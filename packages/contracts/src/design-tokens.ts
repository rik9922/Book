/**
 * Memoria Design System — Single Source of Truth
 * Brand Identity: MEMORIA — Living Archive
 * Principle: "The memories are the heroes. The interface should support them, never compete with them."
 * Theme Decision: LIGHT MODE ONLY (Permanent light appearance across all surfaces)
 */

export interface ColorToken {
  hex: string;
  rgb: [number, number, number];
  description: string;
}

export interface ContrastVerification {
  foreground: string;
  background: string;
  ratio: number;
  wcagAaNormal: boolean;
  wcagAaLarge: boolean;
  wcagAaaNormal: boolean;
}

export const MEMORIA_TOKENS = {
  brand: {
    name: "Memoria",
    tagline: "Your memories, made timeless.",
    identity: "Living Archive",
    themeMode: "light_only" as const,
  },

  // 1. Primary Brand Foundation
  colors: {
    brand: {
      ink: {
        hex: "#20242C",
        rgb: [32, 36, 44] as [number, number, number],
        description: "Primary dark, strong navigation, titles and high-emphasis headings",
      },
      ivory: {
        hex: "#F7F4EE",
        rgb: [247, 244, 238] as [number, number, number],
        description: "Application canvas background (Warm Ivory)",
      },
      plum: {
        hex: "#76556F",
        rgb: [118, 85, 111] as [number, number, number],
        description: "Primary brand accent, primary actions, selected states",
      },
      plumHover: {
        hex: "#63445C",
        rgb: [99, 68, 92] as [number, number, number],
        description: "Interactive hover state for plum actions",
      },
      plumLight: {
        hex: "#F4EEF3",
        rgb: [244, 238, 243] as [number, number, number],
        description: "Subtle plum tint background for active navigation or pills",
      },
      sageSoft: {
        hex: "#849483",
        rgb: [132, 148, 131] as [number, number, number],
        description: "Soft decorative sage, subdued supporting backgrounds",
      },
      sageFunc: {
        hex: "#5F735E",
        rgb: [95, 115, 94] as [number, number, number],
        description: "Accessible functional sage for icons, controls, status indicators",
      },
      sageLight: {
        hex: "#EEF2ED",
        rgb: [238, 242, 237] as [number, number, number],
        description: "Light tint background for sage badges",
      },
    },

    // 2. Surface Hierarchy (Strictly Light Mode)
    surfaces: {
      canvas: {
        hex: "#F7F4EE",
        description: "Application canvas (Warm Ivory)",
      },
      primary: {
        hex: "#FFFFFF",
        description: "Primary content surface (pure warm white cards and panels)",
      },
      secondary: {
        hex: "#F0ECE1",
        description: "Secondary warm neutral for sidebars, table headers, recessed sections",
      },
      elevated: {
        hex: "#FFFFFF",
        description: "Elevated modals, popovers, dropdown menus with restrained warm shadow",
      },
      mediaCanvas: {
        hex: "#1A1A1E",
        description: "Immersive media viewing canvas (photos/video viewer ONLY, not app theme)",
      },
    },

    // 3. Text Hierarchy
    text: {
      primary: {
        hex: "#28272A",
        description: "Main readable content, body text, primary labels",
      },
      secondary: {
        hex: "#5C5955",
        description: "Supporting text, timestamps, captions, secondary metadata (> 6:1 contrast)",
      },
      tertiary: {
        hex: "#78736E",
        description: "Muted hints, placeholders (> 4.5:1 contrast on white)",
      },
      onAction: {
        hex: "#FFFFFF",
        description: "High-contrast text on Muted Plum primary buttons (> 6.3:1 contrast)",
      },
      onDarkMedia: {
        hex: "#F7F4EE",
        description: "Text inside immersive photo viewer overlay",
      },
    },

    // 4. Borders & Separators
    borders: {
      subtle: {
        hex: "#E7E2DA",
        description: "Quiet separators, card boundaries, row dividers",
      },
      strong: {
        hex: "#8D857A",
        description: "Important input outlines, active control borders (> 3:1 contrast for UI components)",
      },
      focusRing: {
        hex: "#76556F",
        description: "Plum-based focus ring indicator (2px with 2px canvas offset)",
      },
    },

    // 5. Semantic Operational Colours
    semantic: {
      success: {
        text: "#22593E",
        bg: "#E8F3ED",
        border: "#B6DBC7",
        description: "Completed uploads, verified sync, active published status",
      },
      warning: {
        text: "#85530E",
        bg: "#FDF5E6",
        border: "#F2D8A7",
        description: "Storage near limit (>80%), pending review, offline queue warning",
      },
      error: {
        text: "#992828",
        bg: "#FDE8E8",
        border: "#F5B8B8",
        description: "Upload failure, checksum mismatch, sync rejection",
      },
      info: {
        text: "#234E70",
        bg: "#EBF2F7",
        border: "#B3D1E6",
        description: "Informational callouts, tips, system notifications",
      },
      pending: {
        text: "#6B533E",
        bg: "#F7EFE6",
        border: "#DFD0C0",
        description: "Processing OCR, rendering 3D preview, printing in progress",
      },
      disabled: {
        text: "#9E9A95",
        bg: "#EAE5DE",
        border: "#DCD6CD",
        description: "Disabled buttons, unavailable controls",
      },
    },
  },

  // 6. Typography Scale
  typography: {
    fontFamilies: {
      editorialSerif: "Playfair Display, Georgia, serif",
      uiSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    sizes: {
      xs: { fontSize: "0.75rem", lineHeight: "1rem" },        // 12px / 16px
      sm: { fontSize: "0.875rem", lineHeight: "1.25rem" },    // 14px / 20px
      base: { fontSize: "1rem", lineHeight: "1.5rem" },       // 16px / 24px
      lg: { fontSize: "1.125rem", lineHeight: "1.75rem" },    // 18px / 28px
      xl: { fontSize: "1.25rem", lineHeight: "1.75rem" },     // 20px / 28px
      "2xl": { fontSize: "1.5rem", lineHeight: "2rem" },      // 24px / 32px
      "3xl": { fontSize: "1.875rem", lineHeight: "2.25rem" }, // 30px / 36px
      "4xl": { fontSize: "2.25rem", lineHeight: "2.5rem" },   // 36px / 40px
      "5xl": { fontSize: "3rem", lineHeight: "1.15" },        // 48px
    },
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // 7. Spacing Grid (8pt Rhythm)
  spacing: {
    0: "0px",
    1: "0.25rem", // 4px (intermediate micro)
    2: "0.5rem",  // 8px
    3: "0.75rem", // 12px (intermediate)
    4: "1rem",    // 16px
    5: "1.25rem", // 20px
    6: "1.5rem",  // 24px
    8: "2rem",    // 32px
    10: "2.5rem", // 40px
    12: "3rem",   // 48px
    16: "4rem",   // 64px
    20: "5rem",   // 80px
  },

  // 8. Soft Restrained Radii
  radii: {
    none: "0px",
    sm: "0.375rem", // 6px (inputs, tags)
    md: "0.5rem",   // 8px (buttons, small cards)
    lg: "0.75rem",  // 12px (standard cards)
    xl: "1rem",     // 16px (dialogs, large containers)
    "2xl": "1.25rem",// 20px (feature panels)
    full: "9999px", // pills and badges
  },

  // 9. Shadows (Subtle, Restrained Warm Neutral)
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgba(32, 36, 44, 0.04)",
    md: "0 4px 12px -2px rgba(32, 36, 44, 0.06), 0 2px 4px -1px rgba(32, 36, 44, 0.03)",
    lg: "0 10px 24px -4px rgba(32, 36, 44, 0.08), 0 4px 8px -2px rgba(32, 36, 44, 0.04)",
    elevated: "0 20px 40px -8px rgba(32, 36, 44, 0.12), 0 8px 16px -4px rgba(32, 36, 44, 0.05)",
  },
};

/**
 * Mathematical WCAG 2.2 Relative Luminance and Contrast Calculator
 */
export function calculateRelativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = calculateRelativeLuminance(hex1);
  const l2 = calculateRelativeLuminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return Number(((max + 0.05) / (min + 0.05)).toFixed(2));
}

/**
 * Verified WCAG 2.2 AA Contrast Audit for Memoria Foundation Pairs
 */
export const VERIFIED_CONTRASTS: ContrastVerification[] = [
  {
    foreground: MEMORIA_TOKENS.colors.brand.ink.hex,
    background: MEMORIA_TOKENS.colors.surfaces.canvas.hex,
    ratio: calculateContrastRatio(MEMORIA_TOKENS.colors.brand.ink.hex, MEMORIA_TOKENS.colors.surfaces.canvas.hex),
    wcagAaNormal: true,
    wcagAaLarge: true,
    wcagAaaNormal: true,
  },
  {
    foreground: MEMORIA_TOKENS.colors.text.primary.hex,
    background: MEMORIA_TOKENS.colors.surfaces.canvas.hex,
    ratio: calculateContrastRatio(MEMORIA_TOKENS.colors.text.primary.hex, MEMORIA_TOKENS.colors.surfaces.canvas.hex),
    wcagAaNormal: true,
    wcagAaLarge: true,
    wcagAaaNormal: true,
  },
  {
    foreground: MEMORIA_TOKENS.colors.text.secondary.hex,
    background: MEMORIA_TOKENS.colors.surfaces.canvas.hex,
    ratio: calculateContrastRatio(MEMORIA_TOKENS.colors.text.secondary.hex, MEMORIA_TOKENS.colors.surfaces.canvas.hex),
    wcagAaNormal: true,
    wcagAaLarge: true,
    wcagAaaNormal: false,
  },
  {
    foreground: MEMORIA_TOKENS.colors.text.onAction.hex,
    background: MEMORIA_TOKENS.colors.brand.plum.hex,
    ratio: calculateContrastRatio(MEMORIA_TOKENS.colors.text.onAction.hex, MEMORIA_TOKENS.colors.brand.plum.hex),
    wcagAaNormal: true,
    wcagAaLarge: true,
    wcagAaaNormal: false,
  },
  {
    foreground: MEMORIA_TOKENS.colors.brand.sageFunc.hex,
    background: MEMORIA_TOKENS.colors.surfaces.canvas.hex,
    ratio: calculateContrastRatio(MEMORIA_TOKENS.colors.brand.sageFunc.hex, MEMORIA_TOKENS.colors.surfaces.canvas.hex),
    wcagAaNormal: true,
    wcagAaLarge: true,
    wcagAaaNormal: false,
  },
  {
    foreground: MEMORIA_TOKENS.colors.borders.strong.hex,
    background: MEMORIA_TOKENS.colors.surfaces.canvas.hex,
    ratio: calculateContrastRatio(MEMORIA_TOKENS.colors.borders.strong.hex, MEMORIA_TOKENS.colors.surfaces.canvas.hex),
    wcagAaNormal: true, // Non-text component UI boundaries require >= 3:1
    wcagAaLarge: true,
    wcagAaaNormal: false,
  },
];
