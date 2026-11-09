import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

export interface SyntheticPhotoSpec {
  filename: string;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  dateStr: string;
  theme: "family_gathering" | "travel_expedition" | "personal_milestone" | "daily_lifestyle";
  palette: {
    skyTop: string;
    skyBottom: string;
    ground: string;
    accent: string;
    glow: string;
  };
  cameraModel: string;
  locationName: string;
}

export const PHOTO_SPECS: SyntheticPhotoSpec[] = [
  {
    filename: "family_anniversary_portrait.jpg",
    width: 2048,
    height: 1536,
    title: "Golden Anniversary Celebration",
    subtitle: "Arthur & Eleanor Bennett — 50 Years of Devotion",
    dateStr: "June 15, 2024 • Mill Valley, CA",
    theme: "family_gathering",
    palette: {
      skyTop: "#1A1A24",
      skyBottom: "#4A3B32",
      ground: "#231812",
      accent: "#E2B755",
      glow: "#FFD97D",
    },
    cameraModel: "iPhone 15 Pro",
    locationName: "Mill Valley, California",
  },
  {
    filename: "lake_tahoe_sunrise.jpg",
    width: 2400,
    height: 1600,
    title: "Emerald Bay Sunrise Mist",
    subtitle: "Lucas & David early morning canoe journey",
    dateStr: "July 22, 2025 • Lake Tahoe, CA",
    theme: "travel_expedition",
    palette: {
      skyTop: "#0A2239",
      skyBottom: "#53A2BE",
      ground: "#132E35",
      accent: "#E9D985",
      glow: "#FFF1C5",
    },
    cameraModel: "Sony Alpha A7 IV",
    locationName: "Emerald Bay, Lake Tahoe",
  },
  {
    filename: "maya_graduation_portrait.jpg",
    width: 1600,
    height: 2000,
    title: "Maya's University Commencement",
    subtitle: "Summa Cum Laude in Comparative Literature",
    dateStr: "May 18, 2024 • Stanford Quad",
    theme: "personal_milestone",
    palette: {
      skyTop: "#1E2A38",
      skyBottom: "#8C1515",
      ground: "#2D181C",
      accent: "#D4AF37",
      glow: "#F8ECC2",
    },
    cameraModel: "Fujifilm X-T5",
    locationName: "Stanford Memorial Quad",
  },
  {
    filename: "autumn_veranda_baking.jpg",
    width: 2048,
    height: 1536,
    title: "Autumn Homestead Baking",
    subtitle: "Eleanor's slow-leavened artisan sourdough & spiced pears",
    dateStr: "October 12, 2024 • Petaluma, CA",
    theme: "daily_lifestyle",
    palette: {
      skyTop: "#2C1D11",
      skyBottom: "#8D4E2A",
      ground: "#3F2010",
      accent: "#E8984E",
      glow: "#FAD899",
    },
    cameraModel: "iPhone 15 Pro",
    locationName: "Bennett Homestead, Petaluma",
  },
  {
    filename: "lucas_birthday_cake.jpg",
    width: 2048,
    height: 1536,
    title: "Lucas 7th Astronomy Party",
    subtitle: "Blowing out solar system candles with childhood wonder",
    dateStr: "September 4, 2024 • Mill Valley, CA",
    theme: "family_gathering",
    palette: {
      skyTop: "#0C1427",
      skyBottom: "#283E68",
      ground: "#101622",
      accent: "#48CAE4",
      glow: "#CAF0F8",
    },
    cameraModel: "iPhone 15 Pro Max",
    locationName: "Mill Valley, California",
  },
  {
    filename: "kyoto_bamboo_walk.jpg",
    width: 1600,
    height: 2400,
    title: "Dawn Walk in Arashiyama",
    subtitle: "First rays of light piercing emerald bamboo columns",
    dateStr: "November 5, 2023 • Kyoto, Japan",
    theme: "travel_expedition",
    palette: {
      skyTop: "#0E2419",
      skyBottom: "#2D5A27",
      ground: "#09170E",
      accent: "#8FBC8F",
      glow: "#D1E7DD",
    },
    cameraModel: "Leica Q2",
    locationName: "Arashiyama, Kyoto",
  },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function generateSyntheticPhotos(outputDir: string): Promise<Array<{ filename: string; filePath: string; checksum: string; size: number }>> {
  await fs.mkdir(outputDir, { recursive: true });
  const results = [];

  for (const spec of PHOTO_SPECS) {
    const destPath = path.join(outputDir, spec.filename);

    const safeTitle = escapeXml(spec.title);
    const safeSubtitle = escapeXml(spec.subtitle);
    const safeDateStr = escapeXml(spec.dateStr);
    const safeCameraModel = escapeXml(spec.cameraModel);

    // Create an evocative, high-fidelity SVG canvas with organic lighting, framing, and typography
    const svgOverlay = `
      <svg width="${spec.width}" height="${spec.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${spec.palette.skyTop}" />
            <stop offset="50%" stop-color="${spec.palette.skyBottom}" />
            <stop offset="100%" stop-color="${spec.palette.ground}" />
          </linearGradient>

          <radialGradient id="sunGlow" cx="65%" cy="35%" r="50%">
            <stop offset="0%" stop-color="${spec.palette.glow}" stop-opacity="0.85" />
            <stop offset="40%" stop-color="${spec.palette.accent}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${spec.palette.skyBottom}" stop-opacity="0" />
          </radialGradient>

          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stop-color="#000000" stop-opacity="0" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.65" />
          </radialGradient>

          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Base photographic gradient -->
        <rect width="${spec.width}" height="${spec.height}" fill="url(#bgGrad)" />

        <!-- Atmospheric Sun/Golden Glow -->
        <circle cx="${spec.width * 0.65}" cy="${spec.height * 0.35}" r="${Math.min(spec.width, spec.height) * 0.5}" fill="url(#sunGlow)" />

        <!-- Mountain / Landscape Silhouette Layers -->
        <path d="M0,${spec.height * 0.72} Q${spec.width * 0.25},${spec.height * 0.62} ${spec.width * 0.5},${spec.height * 0.68} T${spec.width},${spec.height * 0.65} L${spec.width},${spec.height} L0,${spec.height} Z" fill="${spec.palette.skyBottom}" opacity="0.5" />
        <path d="M0,${spec.height * 0.8} Q${spec.width * 0.35},${spec.height * 0.74} ${spec.width * 0.7},${spec.height * 0.78} T${spec.width},${spec.height * 0.76} L${spec.width},${spec.height} L0,${spec.height} Z" fill="${spec.palette.ground}" opacity="0.85" />

        <!-- Simulated Heirloom Border Frame -->
        <rect x="30" y="30" width="${spec.width - 60}" height="${spec.height - 60}" fill="none" stroke="${spec.palette.accent}" stroke-width="1.5" opacity="0.4" rx="12" />
        <rect x="42" y="42" width="${spec.width - 84}" height="${spec.height - 84}" fill="none" stroke="${spec.palette.accent}" stroke-width="0.5" opacity="0.2" rx="8" />

        <!-- Golden Tree of Life Heritage Emblem -->
        <g transform="translate(${spec.width - 140}, 60) scale(0.6)" opacity="0.75" filter="url(#glowFilter)">
          <circle cx="50" cy="50" r="45" fill="none" stroke="${spec.palette.accent}" stroke-width="3" />
          <path d="M50 82 V48 M50 48 Q35 35 25 45 M50 48 Q65 35 75 45 M50 40 Q38 25 32 30 M50 40 Q62 25 68 30 M50 30 Q45 18 50 15 M50 30 Q55 18 50 15" stroke="${spec.palette.accent}" stroke-width="3" stroke-linecap="round" fill="none" />
        </g>

        <!-- Lens Vignette -->
        <rect width="${spec.width}" height="${spec.height}" fill="url(#vignette)" />

        <!-- Archival Memory Typography Overlay -->
        <g transform="translate(80, ${spec.height - 180})">
          <!-- Translucent scrim banner for legibility -->
          <rect x="-30" y="-35" width="${spec.width * 0.75}" height="180" rx="12" fill="#000000" opacity="0.45" />

          <!-- Category pill -->
          <rect x="0" y="-18" width="130" height="26" rx="13" fill="${spec.palette.accent}" opacity="0.9" />
          <text x="65" y="-1" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', serif" font-size="12" font-weight="700" fill="#111111" text-anchor="middle" letter-spacing="1.5">
            ${spec.theme.toUpperCase().replace("_", " ")}
          </text>

          <!-- Memory Title -->
          <text x="0" y="38" font-family="Georgia, Cambria, 'Times New Roman', serif" font-size="36" font-weight="bold" fill="#FFFFFF" letter-spacing="0.5" filter="url(#glowFilter)">
            ${safeTitle}
          </text>

          <!-- Subtitle / Story Caption -->
          <text x="0" y="72" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="20" fill="${spec.palette.glow}" opacity="0.95">
            ${safeSubtitle}
          </text>

          <!-- Archival Date & Location Badge -->
          <text x="0" y="104" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="16" font-weight="500" fill="${spec.palette.accent}" opacity="0.9">
            ${safeDateStr}  •  ${safeCameraModel}
          </text>
        </g>
      </svg>
    `;

    // Process with sharp: add high-quality JPEG compression and realistic image buffer
    const imageBuffer = await sharp(Buffer.from(svgOverlay))
      .jpeg({
        quality: 92,
        chromaSubsampling: "4:4:4",
        mozjpeg: true,
      })
      .toBuffer();

    await fs.writeFile(destPath, imageBuffer);

    const hash = crypto.createHash("sha256").update(imageBuffer).digest("hex");
    results.push({
      filename: spec.filename,
      filePath: destPath,
      checksum: hash,
      size: imageBuffer.length,
    });
  }

  return results;
}
