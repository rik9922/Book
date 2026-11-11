"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  useGLTF,
  ContactShadows,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import {
  BookOpen,
  Sparkles,
  Palette,
  Layers,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Camera,
  FileText,
  Accessibility,
} from "lucide-react";
import {
  ARCHIVAL_PAPER_MATERIAL_SPEC,
  BOOK_3D_HIERARCHY,
  BOOK_ANIMATION_CONTRACT,
  BOOK_CAMERA_PRESETS,
  BOOK_FOIL_SWATCHES,
  BOOK_LEATHER_SWATCHES,
  BOOK_LIGHTING_INTENT,
  CANONICAL_BOOK_3D_MANIFEST,
  CANONICAL_SAMPLE_SPREADS,
  SILK_RIBBON_MATERIAL_SPEC,
  buildFoilMaterialSpec,
  buildLeatherMaterialSpec,
  computeCoverHingeAngle,
  computePageCurlDisplacement,
  computePageTurnAngle,
  resolveCameraPreset,
  resolveFoilSwatch,
  resolveLeatherSwatch,
  toThreeMaterialParams,
  type BookCameraPresetId,
  type BookFoilSwatchId,
  type BookLeatherSwatchId,
  type BookSpreadPreview,
} from "@memory-capsule/contracts/book-3d";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { AccessibleSpreadReader } from "./AccessibleSpreadReader";
import { getApiBaseUrl, getStoredSession } from "@/lib/api";

const GLB_MODEL_URL = `/models/memoria_heirloom_book.glb?v=${CANONICAL_BOOK_3D_MANIFEST.version}`;

export const LEATHER_SWATCHES = BOOK_LEATHER_SWATCHES;
export const FOIL_SWATCHES = BOOK_FOIL_SWATCHES;

function createCoverLabelTexture(
  text: string,
  colorHex: string,
  options: { fontSizePx: number; letterSpacing?: number; uppercase?: boolean; weight?: string }
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const content = (options.uppercase ? text.toUpperCase() : text).trim();

  // Subtle deboss shadow underneath the foil for 3D tactile stamping depth
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const scaledSize = options.fontSizePx * 2;
  ctx.font = `${options.weight ?? "600"} ${scaledSize}px Georgia, "Times New Roman", serif`;
  if ("letterSpacing" in ctx && options.letterSpacing) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${options.letterSpacing * 2}px`;
  }
  ctx.fillText(content, canvas.width / 2 + 2, canvas.height / 2 + 3, canvas.width - 96);

  // Main hot-stamped foil text
  ctx.fillStyle = colorHex;
  ctx.fillText(content, canvas.width / 2, canvas.height / 2, canvas.width - 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  return texture;
}

function createSpreadPageTexture(
  spread: BookSpreadPreview,
  side: "left" | "right" = "right"
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const pageNumber = side === "left" ? spread.leftPageNumber : spread.rightPageNumber;
  const pageDate = side === "left" ? spread.leftDate : spread.rightDate;
  const pageLocation = side === "left" ? spread.leftLocation : spread.rightLocation;
  const pageHeading = side === "left" ? spread.leftHeading : spread.rightHeading;
  const pageBody = side === "left" ? spread.leftBody : spread.rightBody;

  // 1. Archival cotton paper base (#FAF7F2)
  ctx.fillStyle = "#FAF7F2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Paper grain texture simulation
  ctx.fillStyle = "rgba(225, 218, 204, 0.25)";
  for (let i = 0; i < 500; i++) {
    const rx = (i * 97) % canvas.width;
    const ry = (i * 137) % canvas.height;
    ctx.fillRect(rx, ry, 2.5, 1);
  }

  // 3. Spine gutter optical depth gradient
  const gutterWidth = 140;
  if (side === "left") {
    const gutterGrad = ctx.createLinearGradient(canvas.width - gutterWidth, 0, canvas.width, 0);
    gutterGrad.addColorStop(0, "rgba(180, 168, 150, 0)");
    gutterGrad.addColorStop(0.7, "rgba(180, 168, 150, 0.22)");
    gutterGrad.addColorStop(1, "rgba(150, 138, 120, 0.42)");
    ctx.fillStyle = gutterGrad;
    ctx.fillRect(canvas.width - gutterWidth, 0, gutterWidth, canvas.height);
  } else {
    const gutterGrad = ctx.createLinearGradient(0, 0, gutterWidth, 0);
    gutterGrad.addColorStop(0, "rgba(150, 138, 120, 0.42)");
    gutterGrad.addColorStop(0.3, "rgba(180, 168, 150, 0.22)");
    gutterGrad.addColorStop(1, "rgba(180, 168, 150, 0)");
    ctx.fillStyle = gutterGrad;
    ctx.fillRect(0, 0, gutterWidth, canvas.height);
  }

  // 4. Archival frame borders
  ctx.strokeStyle = "#E7E2DA";
  ctx.lineWidth = 4;
  ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);

  ctx.strokeStyle = "rgba(215, 206, 192, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(70, 70, canvas.width - 140, canvas.height - 140);

  // 5. Header: Chapter title & date/location
  ctx.fillStyle = "#76556F";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = '600 32px system-ui, -apple-system, sans-serif';
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "4px";
  }
  ctx.fillText(spread.chapterTitle.toUpperCase(), canvas.width / 2, 110, canvas.width - 240);

  ctx.fillStyle = "#5C5955";
  ctx.font = '500 26px system-ui, -apple-system, sans-serif';
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "2px";
  }
  ctx.fillText(`${pageDate}  •  ${pageLocation}`, canvas.width / 2, 164, canvas.width - 240);

  // Gilded separator
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 120, 216);
  ctx.lineTo(canvas.width / 2 + 120, 216);
  ctx.stroke();

  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  }

  if (side === "left") {
    // ==========================================
    // LEFT PAGE: ARCHIVAL PHOTOGRAPH / PASSE-PARTOUT PLATE
    // ==========================================
    const plateX = 140;
    const plateY = 270;
    const plateW = canvas.width - 280;
    const plateH = 760;

    // Outer passe-partout mat
    ctx.fillStyle = "#F3EFE6";
    ctx.fillRect(plateX, plateY, plateW, plateH);
    ctx.strokeStyle = "#DDD5C7";
    ctx.lineWidth = 3;
    ctx.strokeRect(plateX, plateY, plateW, plateH);

    // Inner photo inset with subtle photographic tint
    const photoInsetX = plateX + 36;
    const photoInsetY = plateY + 36;
    const photoInsetW = plateW - 72;
    const photoInsetH = plateH - 72;

    const photoGrad = ctx.createLinearGradient(photoInsetX, photoInsetY, photoInsetX + photoInsetW, photoInsetY + photoInsetH);
    photoGrad.addColorStop(0, "#EAE4D7");
    photoGrad.addColorStop(0.5, "#DFD7C7");
    photoGrad.addColorStop(1, "#D2C7B3");
    ctx.fillStyle = photoGrad;
    ctx.fillRect(photoInsetX, photoInsetY, photoInsetW, photoInsetH);
    ctx.strokeStyle = "#C9BEAD";
    ctx.lineWidth = 2;
    ctx.strokeRect(photoInsetX, photoInsetY, photoInsetW, photoInsetH);

    // Gilded corner ornaments on plate
    const corn = 24;
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3;
    const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * corn, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * corn);
      ctx.stroke();
    };
    drawCorner(photoInsetX + 8, photoInsetY + 8, 1, 1);
    drawCorner(photoInsetX + photoInsetW - 8, photoInsetY + 8, -1, 1);
    drawCorner(photoInsetX + 8, photoInsetY + photoInsetH - 8, 1, -1);
    drawCorner(photoInsetX + photoInsetW - 8, photoInsetY + photoInsetH - 8, -1, -1);

    // Embossed Tree of Life emblem watermark in photo center
    ctx.fillStyle = "rgba(118, 85, 111, 0.28)";
    ctx.font = 'italic 700 36px Georgia, serif';
    ctx.textAlign = "center";
    ctx.fillText("✦  MEMORIA LIVING ARCHIVE  ✦", canvas.width / 2, plateY + plateH / 2 - 20);
    ctx.fillStyle = "rgba(92, 89, 85, 0.35)";
    ctx.font = '500 24px system-ui, sans-serif';
    ctx.fillText("Archival Provenance Plate • SHA-256 Verified", canvas.width / 2, plateY + plateH / 2 + 25);

    // Heading below plate
    let y = plateY + plateH + 70;
    ctx.fillStyle = "#20242C";
    ctx.font = '700 52px Georgia, "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.fillText(pageHeading, canvas.width / 2, y, canvas.width - 240);
    y += 75;

    // Editorial body paragraph
    ctx.fillStyle = "#333135";
    ctx.textAlign = "left";
    ctx.font = '400 34px Georgia, "Times New Roman", serif';
    const words = pageBody.split(" ");
    let line = "";
    const leftMargin = 160;
    const maxLineWidth = canvas.width - 320;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxLineWidth) {
        ctx.fillText(line, leftMargin, y);
        line = word;
        y += 54;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, leftMargin, y);
    }
  } else {
    // ==========================================
    // RIGHT PAGE: EDITORIAL STORY & INSCRIPTION
    // ==========================================
    let y = 290;

    // Heading
    ctx.fillStyle = "#20242C";
    ctx.font = '700 56px Georgia, "Times New Roman", serif';
    ctx.textAlign = "left";
    const headingWords = pageHeading.split(" ");
    let headingLine = "";
    const textLeftMargin = 170; // Clearance for spine gutter on right page
    const textMaxWidth = canvas.width - textLeftMargin - 130;

    for (const word of headingWords) {
      const test = headingLine ? `${headingLine} ${word}` : word;
      if (ctx.measureText(test).width > textMaxWidth) {
        ctx.fillText(headingLine, textLeftMargin, y);
        headingLine = word;
        y += 68;
      } else {
        headingLine = test;
      }
    }
    if (headingLine) {
      ctx.fillText(headingLine, textLeftMargin, y);
      y += 85;
    }

    // Illuminated drop-capital letter
    const firstLetter = pageBody.charAt(0) || "M";
    const remainder = pageBody.slice(1);

    // Drop cap box
    const capSize = 92;
    ctx.fillStyle = "#F3EFE6";
    ctx.fillRect(textLeftMargin, y - 8, capSize, capSize);
    ctx.strokeStyle = "#76556F";
    ctx.lineWidth = 3;
    ctx.strokeRect(textLeftMargin, y - 8, capSize, capSize);

    ctx.fillStyle = "#76556F";
    ctx.font = '700 84px Georgia, serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(firstLetter, textLeftMargin + capSize / 2, y + capSize / 2 - 8);

    // Remaining body text wrapping
    ctx.fillStyle = "#28272A";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = '400 36px Georgia, "Times New Roman", serif';

    const words = remainder.split(" ");
    let line = "";
    let curX = textLeftMargin + capSize + 24;
    let curMaxW = textMaxWidth - capSize - 24;
    let linesDrawn = 0;

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > curMaxW) {
        ctx.fillText(line, curX, y);
        line = word;
        y += 56;
        linesDrawn++;
        if (linesDrawn >= 2) {
          curX = textLeftMargin;
          curMaxW = textMaxWidth;
        }
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, curX, y);
      y += 80;
    }

    // Archival Inscription Box
    if (spread.ocrInscription) {
      y = Math.max(y + 20, 1100);
      const boxW = textMaxWidth;
      const boxH = 340;

      ctx.fillStyle = "#F3EFE6";
      ctx.fillRect(textLeftMargin, y, boxW, boxH);
      ctx.strokeStyle = "#D4AF37";
      ctx.lineWidth = 3;
      ctx.strokeRect(textLeftMargin, y, boxW, boxH);

      // Inner deckle line
      ctx.strokeStyle = "rgba(118, 85, 111, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(textLeftMargin + 10, y + 10, boxW - 20, boxH - 20);

      // Inscription header
      ctx.fillStyle = "#76556F";
      ctx.font = '600 24px system-ui, sans-serif';
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "3px";
      }
      ctx.fillText("ARCHIVAL INSCRIPTION", textLeftMargin + 32, y + 36);
      if ("letterSpacing" in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
      }

      // Inscription text (cursive italic quote)
      ctx.fillStyle = "#20242C";
      ctx.font = 'italic 34px Georgia, serif';
      const inscWords = `“${spread.ocrInscription}”`.split(" ");
      let inscLine = "";
      let iy = y + 95;
      for (const iw of inscWords) {
        const itest = inscLine ? `${inscLine} ${iw}` : iw;
        if (ctx.measureText(itest).width > boxW - 64) {
          ctx.fillText(inscLine, textLeftMargin + 32, iy);
          inscLine = iw;
          iy += 50;
        } else {
          inscLine = itest;
        }
      }
      if (inscLine) {
        ctx.fillText(inscLine, textLeftMargin + 32, iy);
      }

      // Archival verification badge
      ctx.fillStyle = "#5C5955";
      ctx.font = '500 22px system-ui, sans-serif';
      ctx.fillText("Verified Manuscript Transcription • Sealed", textLeftMargin + 32, y + boxH - 45);
    }
  }

  // Footer: Page numerals and archival stamp
  ctx.fillStyle = "#78736E";
  ctx.font = '500 28px Georgia, monospace';
  ctx.textBaseline = "alphabetic";
  if (side === "left") {
    ctx.textAlign = "left";
    ctx.fillText(`p. ${pageNumber}`, 140, canvas.height - 110);
    ctx.textAlign = "right";
    ctx.fillStyle = "#9C9589";
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText("MEMORIA LIVING ARCHIVE", canvas.width - 180, canvas.height - 110);
  } else {
    ctx.textAlign = "left";
    ctx.fillStyle = "#9C9589";
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText("EDITION SHA-256 VERIFIED", 170, canvas.height - 110);
    ctx.textAlign = "right";
    ctx.fillStyle = "#78736E";
    ctx.fillText(`p. ${pageNumber}`, canvas.width - 140, canvas.height - 110);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createArchivalRibbonGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  // 12mm silk ribbon with supple catenary curvature draping over the bottom page edges
  const pathPoints = [
    new THREE.Vector3(0.006, 0.0124, -0.115),
    new THREE.Vector3(0.007, 0.0121, -0.050),
    new THREE.Vector3(0.009, 0.0118,  0.020),
    new THREE.Vector3(0.014, 0.0118,  0.080),
    new THREE.Vector3(0.018, 0.0118,  0.125),
    new THREE.Vector3(0.022, 0.0050,  0.134),
    new THREE.Vector3(0.026, -0.0030, 0.142),
    new THREE.Vector3(0.030, -0.0100, 0.150),
    new THREE.Vector3(0.034, -0.0142, 0.160),
    new THREE.Vector3(0.038, -0.0145, 0.176),
  ];

  const curve = new THREE.CatmullRomCurve3(pathPoints);
  const segments = 40;
  const ribbonWidth = 0.012;
  const halfWidth = ribbonWidth / 2;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(0, 1, 0);
    if (Math.abs(tangent.y) > 0.7) {
      normal.set(0, 0, 1);
    }
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    const correctedNormal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

    const twistAngle = t > 0.6 ? Math.sin((t - 0.6) * Math.PI * 2.5) * 0.15 : 0;
    const rotatedBinormal = binormal.clone().applyAxisAngle(tangent, twistAngle);

    const left = pt.clone().addScaledVector(rotatedBinormal, -halfWidth);
    const right = pt.clone().addScaledVector(rotatedBinormal, halfWidth);

    positions.push(left.x, left.y, left.z);
    positions.push(right.x, right.y, right.z);

    normals.push(correctedNormal.x, correctedNormal.y, correctedNormal.z);
    normals.push(correctedNormal.x, correctedNormal.y, correctedNormal.z);

    uvs.push(0, t * 6);
    uvs.push(1, t * 6);

    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return geom;
}

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color("#FAF7F2");

    const addPanel = (
      pos: [number, number, number],
      lookAt: [number, number, number],
      size: [number, number],
      color: string,
      intensity: number
    ) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), mat);
      mesh.position.set(...pos);
      mesh.lookAt(...lookAt);
      envScene.add(mesh);
      return mesh;
    };

    const panels = [
      addPanel([0, 5.0, 0], [0, 0, 0], [8, 8], "#FFFDF8", 2.0),
      addPanel([3.5, 2.8, 3.2], [0, 0, 0], [5, 4], "#FFF6E5", 2.5),
      addPanel([-3.5, 2.2, -2.5], [0, 0, 0], [5, 4], "#EAEFEA", 1.4),
      addPanel([0, 2.5, 4.2], [0, 0, 0], [6, 3], "#FFFBF2", 1.8),
      addPanel([0, -2.5, 0], [0, 0, 0], [10, 10], "#EFEAE1", 0.9),
    ];

    const renderTarget = pmrem.fromScene(envScene, 0.04);
    scene.environment = renderTarget.texture;
    scene.environmentIntensity = 0.82;

    return () => {
      scene.environment = null;
      renderTarget.dispose();
      pmrem.dispose();
      for (const panel of panels) {
        panel.geometry.dispose();
        (panel.material as THREE.Material).dispose();
      }
    };
  }, [gl, scene]);

  return null;
}

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch (err) {
    return err instanceof Error ? false : false;
  }
}

interface BookSceneProps {
  leatherId: BookLeatherSwatchId;
  foilId: BookFoilSwatchId;
  isOpen: boolean;
  onToggleOpen: () => void;
  title: string;
  subtitle: string;
  currentSpread: BookSpreadPreview;
  pageTurnNonce: number;
  pageTurnDirection: 1 | -1;
  dragTurnOffset: number;
  reducedMotion: boolean;
}

function Heirloom3DBook({
  leatherId,
  foilId,
  isOpen,
  onToggleOpen,
  title,
  subtitle,
  currentSpread,
  pageTurnNonce,
  pageTurnDirection,
  dragTurnOffset,
  reducedMotion,
}: BookSceneProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const frontHingeRef = useRef<THREE.Object3D | null>(null);
  const coverTextGroupRef = useRef<THREE.Group>(null);
  const leftPageGroupRef = useRef<THREE.Group>(null);
  const turningPageHingeRef = useRef<THREE.Object3D | null>(null);
  const turningPageMeshRef = useRef<THREE.Mesh | null>(null);
  const openProgressRef = useRef<number>(isOpen ? 1 : 0);
  const turnProgressRef = useRef<number>(0);
  const lastTurnNonceRef = useRef<number>(pageTurnNonce);
  const basePagePositionsRef = useRef<Float32Array | null>(null);
  const isPageFlatRef = useRef<boolean>(true);
  const [hovered, setHovered] = useState(false);

  const { scene } = useGLTF(GLB_MODEL_URL);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const ribbonGeometry = useMemo(() => createArchivalRibbonGeometry(), []);

  useEffect(() => {
    return () => {
      ribbonGeometry.dispose();
    };
  }, [ribbonGeometry]);

  const leatherSwatch = useMemo(() => resolveLeatherSwatch(leatherId), [leatherId]);
  const foilSwatch = useMemo(() => resolveFoilSwatch(foilId), [foilId]);

  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  const pbrTextures = useMemo(() => {
    const leatherNormal = textureLoader.load("/textures/leather_normal.png");
    leatherNormal.wrapS = leatherNormal.wrapT = THREE.RepeatWrapping;
    leatherNormal.repeat.set(5, 5);

    const leatherRoughness = textureLoader.load("/textures/leather_roughness.png");
    leatherRoughness.wrapS = leatherRoughness.wrapT = THREE.RepeatWrapping;
    leatherRoughness.repeat.set(5, 5);

    const paperTexture = textureLoader.load("/textures/paper_texture.png");
    paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
    paperTexture.repeat.set(2, 2);

    const pageEdges = textureLoader.load("/textures/page_edges.png");
    pageEdges.wrapS = pageEdges.wrapT = THREE.RepeatWrapping;
    pageEdges.repeat.set(1, 4);

    const ribbonTexture = textureLoader.load("/textures/ribbon_texture.png");
    ribbonTexture.wrapS = ribbonTexture.wrapT = THREE.RepeatWrapping;
    ribbonTexture.repeat.set(1, 6);

    return { leatherNormal, leatherRoughness, paperTexture, pageEdges, ribbonTexture };
  }, [textureLoader]);

  useEffect(() => {
    return () => {
      pbrTextures.leatherNormal.dispose();
      pbrTextures.leatherRoughness.dispose();
      pbrTextures.paperTexture.dispose();
      pbrTextures.pageEdges.dispose();
      pbrTextures.ribbonTexture.dispose();
    };
  }, [pbrTextures]);

  const materialsBundle = useMemo(() => {
    const leatherParams = toThreeMaterialParams(buildLeatherMaterialSpec(leatherSwatch));
    const foilParams = toThreeMaterialParams(buildFoilMaterialSpec(foilSwatch, leatherSwatch));
    const paperParams = toThreeMaterialParams(ARCHIVAL_PAPER_MATERIAL_SPEC);

    return {
      leather: new THREE.MeshPhysicalMaterial({
        ...leatherParams,
        normalMap: pbrTextures.leatherNormal,
        normalScale: new THREE.Vector2(0.65, 0.65),
        roughnessMap: pbrTextures.leatherRoughness,
        roughness: 0.76,
        metalness: 0.04,
        clearcoat: 0.22,
        clearcoatRoughness: 0.35,
        sheen: 0.45,
        sheenColor: new THREE.Color(leatherSwatch.accentHex || "#8A6682"),
        side: THREE.DoubleSide,
      }),
      foil: new THREE.MeshPhysicalMaterial({
        ...foilParams,
        metalness: 0.95,
        roughness: 0.16,
        clearcoat: 0.35,
        clearcoatRoughness: 0.20,
        reflectivity: 0.95,
        side: THREE.DoubleSide,
      }),
      paper: new THREE.MeshStandardMaterial({
        ...paperParams,
        map: pbrTextures.paperTexture,
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
      textBlock: new THREE.MeshStandardMaterial({
        color: "#F6F2E9",
        map: pbrTextures.pageEdges,
        roughness: 0.90,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
      ribbon: new THREE.MeshPhysicalMaterial({
        color: "#849483",
        map: pbrTextures.ribbonTexture,
        roughness: 0.35,
        metalness: 0.04,
        clearcoat: 0.45,
        clearcoatRoughness: 0.25,
        sheen: 0.8,
        sheenColor: new THREE.Color("#A8B5A7"),
        side: THREE.DoubleSide,
      }),
    };
  }, [leatherSwatch, foilSwatch, pbrTextures]);

  useEffect(() => {
    return () => {
      materialsBundle.leather.dispose();
      materialsBundle.foil.dispose();
      materialsBundle.paper.dispose();
      materialsBundle.textBlock.dispose();
      materialsBundle.ribbon.dispose();
    };
  }, [materialsBundle]);

  // Bind canonical node references and apply synchronized PBR materials
  useEffect(() => {
    let foundFrontHinge: THREE.Object3D | null = null;
    let foundPageHinge: THREE.Object3D | null = null;
    let foundPageMesh: THREE.Mesh | null = null;
    let clonedPageGeometry: THREE.BufferGeometry | null = null;

    clonedScene.traverse((child) => {
      if (child.name === BOOK_3D_HIERARCHY.frontCoverHinge) {
        foundFrontHinge = child;
      } else if (child.name === BOOK_3D_HIERARCHY.turningPageHinge) {
        foundPageHinge = child;
      }

      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const parentName = mesh.parent?.name ?? "";
        const nodeName = mesh.name;

        if (
          nodeName === BOOK_3D_HIERARCHY.frontCover ||
          nodeName === BOOK_3D_HIERARCHY.backCover ||
          nodeName === BOOK_3D_HIERARCHY.spine ||
          parentName === BOOK_3D_HIERARCHY.frontCover ||
          parentName === BOOK_3D_HIERARCHY.backCover ||
          parentName === BOOK_3D_HIERARCHY.spine
        ) {
          mesh.material = materialsBundle.leather;
        } else if (
          nodeName === BOOK_3D_HIERARCHY.emblem ||
          nodeName === BOOK_3D_HIERARCHY.cornerGuards ||
          parentName === BOOK_3D_HIERARCHY.emblem ||
          parentName === BOOK_3D_HIERARCHY.cornerGuards
        ) {
          mesh.material = materialsBundle.foil;
        } else if (
          nodeName === BOOK_3D_HIERARCHY.ribbon ||
          parentName === BOOK_3D_HIERARCHY.ribbon
        ) {
          mesh.material = materialsBundle.ribbon;
          mesh.geometry = ribbonGeometry;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        } else if (
          nodeName === BOOK_3D_HIERARCHY.turningPageLeaf ||
          parentName === BOOK_3D_HIERARCHY.turningPageLeaf
        ) {
          mesh.material = materialsBundle.paper;
          if (!clonedPageGeometry) {
            clonedPageGeometry = mesh.geometry.clone();
            mesh.geometry = clonedPageGeometry;
          }
          foundPageMesh = mesh;
          if (mesh.geometry.attributes.position) {
            basePagePositionsRef.current = new Float32Array(
              mesh.geometry.attributes.position.array as Float32Array
            );
          }
        } else if (
          nodeName === BOOK_3D_HIERARCHY.textBlock ||
          parentName === BOOK_3D_HIERARCHY.textBlock
        ) {
          mesh.material = materialsBundle.textBlock;
        }
      }
    });

    frontHingeRef.current = foundFrontHinge;
    turningPageHingeRef.current = foundPageHinge;
    turningPageMeshRef.current = foundPageMesh;

    return () => {
      if (clonedPageGeometry) {
        clonedPageGeometry.dispose();
      }
    };
  }, [clonedScene, materialsBundle]);

  // Trigger animated page flip on spread change
  useEffect(() => {
    if (pageTurnNonce !== lastTurnNonceRef.current) {
      lastTurnNonceRef.current = pageTurnNonce;
      turnProgressRef.current = pageTurnDirection > 0 ? 0.02 : 0.98;
    }
  }, [pageTurnNonce, pageTurnDirection]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (rootGroupRef.current && !reducedMotion) {
      if (isOpen) {
        rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(rootGroupRef.current.rotation.y, 0, dt * 5);
        rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(rootGroupRef.current.rotation.x, 0.12, dt * 5);
        rootGroupRef.current.rotation.z = THREE.MathUtils.lerp(rootGroupRef.current.rotation.z, 0, dt * 5);
      } else {
        rootGroupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.04;
        rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(rootGroupRef.current.rotation.x, 0.16, dt * 5);
        rootGroupRef.current.rotation.z = THREE.MathUtils.lerp(rootGroupRef.current.rotation.z, 0.02, dt * 5);
      }
    } else if (rootGroupRef.current && reducedMotion) {
      rootGroupRef.current.rotation.y = 0;
      rootGroupRef.current.rotation.x = isOpen ? 0.12 : 0.16;
      rootGroupRef.current.rotation.z = 0;
    }

    // 1. Cover Hinge Kinematics
    const targetOpen = isOpen ? 1 : 0;
    if (reducedMotion) {
      openProgressRef.current = targetOpen;
    } else {
      openProgressRef.current = THREE.MathUtils.lerp(
        openProgressRef.current,
        targetOpen,
        dt * BOOK_ANIMATION_CONTRACT.coverLerpSpeed
      );
    }

    // Smoothly transition between closed (0 rad) and open (3.06 rad - flat resting archival spread)
    const openAngleTarget = Math.PI * 0.975;
    const coverAngle = openProgressRef.current * openAngleTarget;
    if (frontHingeRef.current) {
      frontHingeRef.current.rotation.z = coverAngle;
    }
    if (coverTextGroupRef.current) {
      coverTextGroupRef.current.rotation.z = coverAngle;
      coverTextGroupRef.current.visible = openProgressRef.current < 0.55;
    }
    if (leftPageGroupRef.current) {
      leftPageGroupRef.current.rotation.z = coverAngle;
      leftPageGroupRef.current.visible = openProgressRef.current > 0.55;
    }

    // 2. Turning Page Kinematics & Dynamic Conical Curl
    if (!isOpen) {
      turnProgressRef.current = 0;
    } else if (Math.abs(dragTurnOffset) > 0.001) {
      turnProgressRef.current = THREE.MathUtils.clamp(dragTurnOffset, 0, 1);
    } else if (turnProgressRef.current > 0 && turnProgressRef.current < 1) {
      const step = dt * (1000 / BOOK_ANIMATION_CONTRACT.pageTurnDurationMs);
      if (reducedMotion) {
        turnProgressRef.current = 0;
      } else if (pageTurnDirection > 0) {
        turnProgressRef.current += step;
        if (turnProgressRef.current >= 1) turnProgressRef.current = 0;
      } else {
        turnProgressRef.current -= step;
        if (turnProgressRef.current <= 0) turnProgressRef.current = 0;
      }
    }

    if (turningPageHingeRef.current) {
      const isActivelyTurning = turnProgressRef.current > 0 && turnProgressRef.current < 1;
      turningPageHingeRef.current.visible = isActivelyTurning;
      if (isActivelyTurning) {
        const turnAngle = computePageTurnAngle(turnProgressRef.current);
        turningPageHingeRef.current.rotation.z = turnAngle;
      }
    }

    // Apply subtle vertex curl modulation only when open/turning; skip GPU re-uploads when closed and flat
    const pageMesh = turningPageMeshRef.current;
    const basePositions = basePagePositionsRef.current;
    if (pageMesh && basePositions && pageMesh.geometry.attributes.position) {
      const posAttr = pageMesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const isBookOpeningOrOpen = isOpen || openProgressRef.current > 0.25;
      const activeProgress =
        turnProgressRef.current > 0 ? turnProgressRef.current : isOpen ? 0.15 : 0;
      const bookWidth = CANONICAL_BOOK_3D_MANIFEST.dimensions.bookWidth;

      if (!isBookOpeningOrOpen) {
        if (!isPageFlatRef.current) {
          for (let i = 0; i < arr.length; i += 3) {
            arr[i + 1] = basePositions[i + 1];
          }
          posAttr.needsUpdate = true;
          pageMesh.geometry.computeVertexNormals();
          isPageFlatRef.current = true;
        }
      } else {
        for (let i = 0; i < arr.length; i += 3) {
          const bx = basePositions[i];
          const by = basePositions[i + 1];
          const normX = Math.max(0, Math.min(1, bx / bookWidth));
          const curlLift = computePageCurlDisplacement(
            normX,
            BOOK_ANIMATION_CONTRACT.pageCurlAmplitude,
            activeProgress
          );
          arr[i + 1] = by + curlLift;
        }
        posAttr.needsUpdate = true;
        pageMesh.geometry.computeVertexNormals();
        isPageFlatRef.current = false;
      }
    }
  });

  const foilHex = buildFoilMaterialSpec(foilSwatch, leatherSwatch).baseColorHex;
  const openSpreadVisible = isOpen;
  const textBlockTopY = CANONICAL_BOOK_3D_MANIFEST.dimensions.textblockThickness / 2 + 0.0008;

  const titleTexture = useMemo(
    () =>
      createCoverLabelTexture(title || "Memoria", foilHex, {
        fontSizePx: 54,
        letterSpacing: 4,
        uppercase: true,
        weight: "700",
      }),
    [title, foilHex]
  );

  const subtitleTexture = useMemo(
    () =>
      createCoverLabelTexture(subtitle, foilHex, {
        fontSizePx: 30,
        letterSpacing: 3,
        uppercase: true,
        weight: "500",
      }),
    [subtitle, foilHex]
  );

  const leftSpreadTexture = useMemo(
    () => createSpreadPageTexture(currentSpread, "left"),
    [currentSpread]
  );

  const rightSpreadTexture = useMemo(
    () => createSpreadPageTexture(currentSpread, "right"),
    [currentSpread]
  );

  useEffect(() => {
    return () => {
      titleTexture?.dispose();
    };
  }, [titleTexture]);

  useEffect(() => {
    return () => {
      subtitleTexture?.dispose();
    };
  }, [subtitleTexture]);

  useEffect(() => {
    return () => {
      leftSpreadTexture?.dispose();
    };
  }, [leftSpreadTexture]);

  useEffect(() => {
    return () => {
      rightSpreadTexture?.dispose();
    };
  }, [rightSpreadTexture]);

  return (
    <Float
      speed={reducedMotion || isOpen ? 0 : 0.8}
      rotationIntensity={reducedMotion || isOpen ? 0 : 0.04}
      floatIntensity={reducedMotion || isOpen ? 0 : 0.05}
      floatingRange={reducedMotion || isOpen ? [0, 0] : [-0.003, 0.003]}
    >
      <group
        ref={rootGroupRef}
        position={[-0.04, 0, 0]}
        rotation={[0.16, -0.25, 0.02]}
        scale={hovered ? 1.015 : 1.0}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onToggleOpen();
        }}
      >
        <primitive object={clonedScene} />

        {/* Dynamic Foil-Stamped Cover Typography synced to FrontCoverHinge */}
        <group ref={coverTextGroupRef}>
          {titleTexture && (
            <mesh position={[0.104, 0.0154, -0.082]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.165, 0.031]} />
              <meshBasicMaterial map={titleTexture} transparent toneMapped={false} />
            </mesh>
          )}
          {subtitleTexture && (
            <mesh position={[0.104, 0.0154, 0.082]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.17, 0.032]} />
              <meshBasicMaterial map={subtitleTexture} transparent toneMapped={false} />
            </mesh>
          )}
        </group>

        {/* Left Open Spread Content synced to FrontCoverHinge */}
        <group ref={leftPageGroupRef}>
          {openSpreadVisible && leftSpreadTexture && (
            <mesh position={[0.098, 0.0118, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
              <planeGeometry args={[0.188, 0.246]} />
              <meshStandardMaterial map={leftSpreadTexture} roughness={0.92} metalness={0.0} />
            </mesh>
          )}
        </group>

        {/* Right Open Spread Content on TextBlock Surface */}
        {openSpreadVisible && rightSpreadTexture && (
          <mesh position={[0.098, textBlockTopY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.188, 0.246]} />
            <meshStandardMaterial map={rightSpreadTexture} roughness={0.92} metalness={0.0} />
          </mesh>
        )}
      </group>
    </Float>
  );
}

useGLTF.preload(GLB_MODEL_URL);

interface CameraRigProps {
  presetId: BookCameraPresetId;
  cameraTransitionNonce: number;
  reducedMotion: boolean;
}

type OrbitControlsLike = React.ComponentRef<typeof OrbitControls>;

function CameraPresetController({
  presetId,
  cameraTransitionNonce,
  reducedMotion,
}: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const animatingRef = useRef<boolean>(false);
  const preset = useMemo(() => resolveCameraPreset(presetId), [presetId]);
  const targetPos = useMemo(() => new THREE.Vector3(...preset.position), [preset]);
  const targetLookAt = useMemo(() => new THREE.Vector3(...preset.target), [preset]);

  useEffect(() => {
    animatingRef.current = true;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = preset.fovDegrees;
      camera.updateProjectionMatrix();
    }
    if (reducedMotion) {
      camera.position.copy(targetPos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt);
        controlsRef.current.update();
      }
      animatingRef.current = false;
    }
  }, [preset, cameraTransitionNonce, camera, targetPos, targetLookAt, reducedMotion]);

  useFrame((_, delta) => {
    if (!animatingRef.current || !controlsRef.current) return;
    const step = Math.min(1, delta * 5.5);
    camera.position.lerp(targetPos, step);
    controlsRef.current.target.lerp(targetLookAt, step);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(targetPos) < 0.004 &&
      controlsRef.current.target.distanceTo(targetLookAt) < 0.004
    ) {
      animatingRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableZoom
      minDistance={preset.minDistance}
      maxDistance={preset.maxDistance}
      maxPolarAngle={Math.PI / 2 + 0.1}
      dampingFactor={0.07}
      onStart={() => {
        animatingRef.current = false;
      }}
    />
  );
}

function LoadingProgressOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-20 flex items-center justify-center bg-[#F7F4EE]/85 backdrop-blur-xs pointer-events-none"
    >
      <div className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-xl bg-white border border-[#E7E2DA] shadow-sm">
        <div className="w-6 h-6 border-2 border-[#76556F] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-[#20242C]">
          Loading 3D Heirloom Edition ({Math.round(progress)}%)
        </p>
      </div>
    </div>
  );
}

export interface ExperienceCanvasProps {
  bookId?: string;
  refreshKey?: string | number;
  initialTitle?: string;
  initialSubtitle?: string;
  initialLeatherId?: BookLeatherSwatchId;
  initialFoilId?: BookFoilSwatchId;
  hideSidebar?: boolean;
  hideHud?: boolean;
  is2DMode?: boolean;
  onToggle2DMode?: (is2D: boolean) => void;
  selectedLeatherId?: BookLeatherSwatchId | string;
  onSelectLeatherId?: (id: BookLeatherSwatchId) => void;
  selectedFoilId?: BookFoilSwatchId | string;
  onSelectFoilId?: (id: BookFoilSwatchId) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  subtitle?: string;
  onSubtitleChange?: (subtitle: string) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  spreads?: readonly BookSpreadPreview[];
  currentSpreadIndex?: number;
  onSpreadIndexChange?: (index: number) => void;
  cameraPreset?: BookCameraPresetId;
  onCameraPresetChange?: (preset: BookCameraPresetId) => void;
  className?: string;
}

export function mapBookSpreadsToPreview(
  rawSpreads: Array<{
    id: string;
    spreadIndex: number;
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
      (sp.leftPage ? `Page ${sp.leftPage.pageNumber ?? idx * 2 + 1}` : "Inside Front Cover");
    const leftBody =
      sp.leftPage?.elements?.find((e) => e.type === "caption" || e.type === "text")?.content ||
      "Preserved in your Memoria Living Archive.";
    const rightHeading =
      sp.rightPage?.elements?.find((e) => e.type === "heading")?.content || fallbackTitle;
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

export default function ExperienceCanvas({
  bookId = "sample",
  refreshKey = 0,
  initialTitle = "The Bennett Heritage",
  initialSubtitle = "1948 — 2026 • Memoria Volume I",
  initialLeatherId = "plum",
  initialFoilId = "gold",
  hideSidebar = false,
  hideHud = false,
  is2DMode: controlled2DMode,
  onToggle2DMode,
  selectedLeatherId,
  onSelectLeatherId,
  selectedFoilId,
  onSelectFoilId,
  title: controlledTitle,
  onTitleChange,
  subtitle: controlledSubtitle,
  onSubtitleChange,
  isOpen: controlledIsOpen,
  onToggleOpen,
  spreads: controlledSpreads,
  currentSpreadIndex: controlledSpreadIndex,
  onSpreadIndexChange,
  cameraPreset: controlledCameraPreset,
  onCameraPresetChange,
  className,
}: ExperienceCanvasProps) {
  const [selectedLeather, setSelectedLeather] = useState(() =>
    resolveLeatherSwatch(selectedLeatherId || initialLeatherId)
  );
  const [selectedFoil, setSelectedFoil] = useState(() =>
    resolveFoilSwatch(selectedFoilId || initialFoilId)
  );
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? false);
  const [title, setTitle] = useState(controlledTitle ?? initialTitle);
  const [subtitle, setSubtitle] = useState(controlledSubtitle ?? initialSubtitle);
  const [spreads, setSpreads] = useState<readonly BookSpreadPreview[]>(
    controlledSpreads ?? CANONICAL_SAMPLE_SPREADS
  );
  const [spreadIndex, setSpreadIndex] = useState(controlledSpreadIndex ?? 0);
  const [pageTurnNonce, setPageTurnNonce] = useState(0);
  const [pageTurnDirection, setPageTurnDirection] = useState<1 | -1>(1);
  const [dragTurnOffset, setDragTurnOffset] = useState(0);
  const [cameraPresetId, setCameraPresetId] = useState<BookCameraPresetId>(
    controlledCameraPreset ?? "hero"
  );
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [internal2DMode, setInternal2DMode] = useState(false);
  const is2DMode = controlled2DMode !== undefined ? controlled2DMode : internal2DMode;
  const setIs2DMode = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof action === "function" ? action(is2DMode) : action;
      setInternal2DMode(next);
      onToggle2DMode?.(next);
    },
    [is2DMode, onToggle2DMode]
  );
  const [webglError, setWebglError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (selectedLeatherId) {
      setSelectedLeather(resolveLeatherSwatch(selectedLeatherId));
    }
  }, [selectedLeatherId]);

  useEffect(() => {
    if (selectedFoilId) {
      setSelectedFoil(resolveFoilSwatch(selectedFoilId));
    }
  }, [selectedFoilId]);

  useEffect(() => {
    if (controlledTitle !== undefined) {
      setTitle(controlledTitle);
    }
  }, [controlledTitle]);

  useEffect(() => {
    if (controlledSubtitle !== undefined) {
      setSubtitle(controlledSubtitle);
    }
  }, [controlledSubtitle]);

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  useEffect(() => {
    if (controlledSpreads !== undefined) {
      setSpreads(controlledSpreads);
    }
  }, [controlledSpreads]);

  useEffect(() => {
    if (controlledSpreadIndex !== undefined) {
      setSpreadIndex(controlledSpreadIndex);
    }
  }, [controlledSpreadIndex]);

  useEffect(() => {
    if (controlledCameraPreset !== undefined) {
      setCameraPresetId(controlledCameraPreset);
    }
  }, [controlledCameraPreset]);

  const pageDragStartXRef = useRef<number | null>(null);
  const totalSpreads = spreads.length;
  const activeSpread = spreads[Math.min(spreadIndex, Math.max(0, totalSpreads - 1))] || CANONICAL_SAMPLE_SPREADS[0];

  useEffect(() => {
    if (typeof window === "undefined" || !bookId) return;
    const apiBase = getApiBaseUrl();
    const controller = new AbortController();
    const { accessToken } = getStoredSession();
    const headers: Record<string, string> = {};
    if (accessToken && bookId !== "sample") {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    fetch(`${apiBase}/books/${encodeURIComponent(bookId)}/3d-model`, {
      signal: controller.signal,
      headers,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.success || !json?.data) return;
        const data = json.data;
        if (data.configuration?.leatherId) {
          setSelectedLeather(resolveLeatherSwatch(data.configuration.leatherId));
        }
        if (data.configuration?.foilId) {
          setSelectedFoil(resolveFoilSwatch(data.configuration.foilId));
        }
        if (data.configuration?.coverTitle) {
          setTitle(data.configuration.coverTitle);
        }
        if (data.configuration?.coverSubtitle) {
          setSubtitle(data.configuration.coverSubtitle);
        }
        if (Array.isArray(data.spreads) && data.spreads.length > 0) {
          setSpreads(
            mapBookSpreadsToPreview(data.spreads, data.configuration?.coverTitle || data.title || "Memoria")
          );
        } else if (Array.isArray(data.sampleSpreads) && data.sampleSpreads.length > 0) {
          setSpreads(data.sampleSpreads);
        }
      })
      .catch(() => {
        // Offline or gateway stopped: continue using canonical sample spreads seamlessly
      });
    return () => controller.abort();
  }, [bookId, refreshKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handler);

    if (!checkWebGLSupport()) {
      setWebglError("WebGL 3D context is unavailable on this browser. Switched to Accessible 2D Proof Reader.");
      setIs2DMode(true);
    }
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleToggleOpen = useCallback(() => {
    if (onToggleOpen) {
      onToggleOpen();
    } else {
      setIsOpen((prev) => {
        const next = !prev;
        setCameraPresetId(next ? "open_spread" : "hero");
        setCameraResetNonce((n) => n + 1);
        return next;
      });
    }
  }, [onToggleOpen]);

  const handleTurnPage = useCallback(
    (direction: 1 | -1) => {
      if (!isOpen) {
        if (onToggleOpen) {
          onToggleOpen();
        } else {
          setIsOpen(true);
        }
        setCameraPresetId("open_spread");
        setCameraResetNonce((n) => n + 1);
      }
      const next = Math.max(0, Math.min(totalSpreads - 1, spreadIndex + direction));
      setPageTurnDirection(direction);
      if (next !== spreadIndex) {
        setSpreadIndex(next);
        setPageTurnNonce((n) => n + 1);
        onSpreadIndexChange?.(next);
      }
    },
    [isOpen, spreadIndex, totalSpreads, onToggleOpen, onSpreadIndexChange]
  );

  const handleSelectCameraPreset = useCallback((id: BookCameraPresetId) => {
    setCameraPresetId(id);
    setCameraResetNonce((n) => n + 1);
    onCameraPresetChange?.(id);
  }, [onCameraPresetChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleTurnPage(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleTurnPage(-1);
      } else if (event.code === "Space") {
        event.preventDefault();
        handleToggleOpen();
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        handleSelectCameraPreset(isOpen ? "open_spread" : "hero");
      } else if (event.key === "2") {
        event.preventDefault();
        setIs2DMode((prev) => !prev);
      }
    },
    [handleTurnPage, handleToggleOpen, handleSelectCameraPreset, isOpen]
  );

  const effectiveFoilHex = buildFoilMaterialSpec(selectedFoil, selectedLeather).baseColorHex;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Interactive Memoria 3D Heirloom Book Studio"
      className={`relative w-full rounded-2xl overflow-hidden border border-[#E7E2DA] bg-[#F7F4EE] shadow-md flex flex-col ${
        hideSidebar ? "" : "lg:flex-row"
      } focus:outline-none focus:ring-2 focus:ring-[#76556F] ${className || ""}`}
    >
      {/* Screen-reader live state announcer */}
      <div className="sr-only" aria-live="polite">
        {is2DMode
          ? `2D Spread Reader active. ${activeSpread.chapterTitle}, pages ${activeSpread.leftPageNumber} to ${activeSpread.rightPageNumber}.`
          : `3D Book Studio active. Book is ${isOpen ? "open" : "closed"}. Leather: ${selectedLeather.name}. Foil: ${selectedFoil.name}.`}
      </div>

      {/* Viewport Area */}
      <div className="relative flex-1 min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] w-full bg-gradient-to-b from-[#F7F4EE] to-[#EDE7DC]">
        {is2DMode ? (
          <AccessibleSpreadReader
            title={title}
            subtitle={subtitle}
            coverHex={selectedLeather.hex}
            foilHex={effectiveFoilHex}
            spreads={spreads}
            currentSpreadIndex={spreadIndex}
            onChangeSpread={setSpreadIndex}
            onSwitchTo3D={webglError ? undefined : () => setIs2DMode(false)}
            fallbackReason={webglError}
          />
        ) : (
          <>
            {/* Top Floating HUD */}
            {!hideHud && (
              <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/95 border border-[#E7E2DA] text-xs font-medium text-[#5F735E] shadow-xs backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-[#5F735E]" />
                    Unified 3D Engine • v{CANONICAL_BOOK_3D_MANIFEST.version}
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleOpen}
                    className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#76556F] hover:bg-[#63445C] text-xs font-semibold text-white transition-all shadow-xs cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {isOpen ? "Close Cover" : "Open Book"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                  <div className="flex items-center rounded-lg bg-white/95 border border-[#E7E2DA] shadow-xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleTurnPage(-1)}
                      disabled={isOpen && spreadIndex === 0}
                      aria-label="Previous spread"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#20242C] hover:bg-[#F0ECE1] disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2.5 text-xs font-medium text-[#20242C]">
                      {isOpen
                        ? `Spread ${spreadIndex + 1}/${totalSpreads}`
                        : "Cover"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTurnPage(1)}
                      disabled={isOpen && spreadIndex >= totalSpreads - 1}
                      aria-label="Next spread"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#20242C] hover:bg-[#F0ECE1] disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectCameraPreset(isOpen ? "open_spread" : "hero")}
                    aria-label="Reset camera view"
                    className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/95 hover:bg-[#F0ECE1] border border-[#E7E2DA] text-xs font-medium text-[#20242C] shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#76556F]" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => setIs2DMode(true)}
                    className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/95 hover:bg-[#F0ECE1] border border-[#E7E2DA] text-xs font-semibold text-[#20242C] shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#5F735E]" />
                    2D Reader
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Camera Preset Strip */}
            {!hideHud && (
              <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-white/90 border border-[#E7E2DA] p-1 rounded-xl shadow-xs backdrop-blur-md">
                  <span className="px-2 text-[11px] font-medium text-[#5C5955] flex items-center gap-1">
                    <Camera className="w-3 h-3 text-[#76556F]" />
                    View:
                  </span>
                  {BOOK_CAMERA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectCameraPreset(preset.id)}
                      className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                        cameraPresetId === preset.id
                          ? "bg-[#76556F] text-white"
                          : "text-[#28272A] hover:bg-[#F0ECE1]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-[#5C5955] bg-white/90 border border-[#E7E2DA] px-3 py-1.5 rounded-lg backdrop-blur-sm pointer-events-none hidden sm:block">
                  Click cover to open • Drag to orbit • Arrows to flip pages
                </div>
              </div>
            )}

            <LoadingProgressOverlay />

            {/* Interactive Page-Edge Drag Strip when Book is Open */}
            {isOpen && (
              <div
                aria-label="Drag horizontally to preview page turn curl"
                onPointerDown={(e) => {
                  pageDragStartXRef.current = e.clientX;
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (pageDragStartXRef.current === null) return;
                  const dx = pageDragStartXRef.current - e.clientX;
                  const normalized = Math.max(0, Math.min(1, dx / 140));
                  setDragTurnOffset(normalized);
                }}
                onPointerUp={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                  if (pageDragStartXRef.current !== null && dragTurnOffset > 0.45) {
                    handleTurnPage(1);
                  }
                  pageDragStartXRef.current = null;
                  setDragTurnOffset(0);
                }}
                onPointerCancel={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                  pageDragStartXRef.current = null;
                  setDragTurnOffset(0);
                }}
                className="flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-36 rounded-xl bg-white/80 hover:bg-white/95 border border-[#E7E2DA] items-center justify-center text-[#76556F] shadow-xs cursor-ew-resize select-none touch-none"
                title="Drag left to turn page"
              >
                <ChevronRight className="w-5 h-5" />
              </div>
            )}

            <CanvasErrorBoundary
              fallback={(err) => (
                <AccessibleSpreadReader
                  title={title}
                  subtitle={subtitle}
                  coverHex={selectedLeather.hex}
                  foilHex={effectiveFoilHex}
                  spreads={spreads}
                  currentSpreadIndex={spreadIndex}
                  onChangeSpread={setSpreadIndex}
                  fallbackReason={
                    err
                      ? `3D rendering fell back to Accessible 2D Proof Reader (${err.message}).`
                      : "Switched to Accessible 2D Proof Reader."
                  }
                />
              )}
            >
              <Canvas
                frameloop={reducedMotion && !isOpen ? "demand" : "always"}
                shadows
                dpr={[1, 2]}
                camera={{
                  position: BOOK_CAMERA_PRESETS[0].position,
                  fov: BOOK_CAMERA_PRESETS[0].fovDegrees,
                }}
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: "high-performance",
                }}
                onCreated={({ gl }) => {
                  gl.toneMapping = THREE.ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.06;
                  gl.domElement.addEventListener("webglcontextlost", (event) => {
                    event.preventDefault();
                    setWebglError("WebGL context lost. Showing Accessible 2D Spread Reader.");
                    setIs2DMode(true);
                  });
                }}
                className="w-full h-[520px] sm:h-[580px] lg:h-[640px] cursor-grab active:cursor-grabbing"
              >
                <StudioEnvironment />
                <ambientLight intensity={BOOK_LIGHTING_INTENT.ambientIntensity} />
                <directionalLight
                  position={BOOK_LIGHTING_INTENT.keyLight.position}
                  intensity={BOOK_LIGHTING_INTENT.keyLight.intensity}
                  color={BOOK_LIGHTING_INTENT.keyLight.colorHex}
                  castShadow
                  shadow-mapSize={[1024, 1024]}
                  shadow-bias={-0.0008}
                  shadow-normalBias={0.015}
                />
                <directionalLight
                  position={BOOK_LIGHTING_INTENT.fillLight.position}
                  intensity={BOOK_LIGHTING_INTENT.fillLight.intensity}
                  color={BOOK_LIGHTING_INTENT.fillLight.colorHex}
                />
                <spotLight
                  position={BOOK_LIGHTING_INTENT.rimLight.position}
                  intensity={BOOK_LIGHTING_INTENT.rimLight.intensity}
                  angle={0.45}
                  penumbra={0.7}
                  color={BOOK_LIGHTING_INTENT.rimLight.colorHex}
                />

                <Suspense fallback={null}>
                  <Heirloom3DBook
                    leatherId={selectedLeather.id}
                    foilId={selectedFoil.id}
                    isOpen={isOpen}
                    onToggleOpen={handleToggleOpen}
                    title={title}
                    subtitle={subtitle}
                    currentSpread={activeSpread}
                    pageTurnNonce={pageTurnNonce}
                    pageTurnDirection={pageTurnDirection}
                    dragTurnOffset={dragTurnOffset}
                    reducedMotion={reducedMotion}
                  />
                </Suspense>

                {/* Archival Museum Display Mat & Surface Grounding */}
                <mesh position={[0, -0.0158, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <planeGeometry args={[1.2, 0.9]} />
                  <meshStandardMaterial color="#EFECE5" roughness={0.92} metalness={0.0} />
                </mesh>

                <ContactShadows
                  position={[0, -0.0152, 0]}
                  opacity={0.56}
                  scale={1.45}
                  blur={2.4}
                  far={0.35}
                  color="#181A20"
                />
                <CameraPresetController
                  presetId={cameraPresetId}
                  cameraTransitionNonce={cameraResetNonce}
                  reducedMotion={reducedMotion}
                />
              </Canvas>
            </CanvasErrorBoundary>
          </>
        )}
      </div>

      {/* Material Customization Studio Sidebar */}
      {!hideSidebar && (
        <aside className="w-full lg:w-[360px] p-6 border-t lg:border-t-0 lg:border-l border-[#E7E2DA] bg-[#FFFFFF] flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                <Sparkles className="w-3.5 h-3.5 text-[#76556F]" />
                Heirloom 3D Studio
              </div>
              <h3 className="text-lg font-serif font-bold text-[#20242C] mt-1">
                Material &amp; Spread Studio
              </h3>
              <p className="text-xs text-[#5C5955] mt-1">
                Physical geometry ({CANONICAL_BOOK_3D_MANIFEST.dimensions.bookWidth * 100}×
                {CANONICAL_BOOK_3D_MANIFEST.dimensions.bookHeight * 100} cm) synced across WebGL &amp; iOS RealityKit.
              </p>
            </div>

            {/* Leather Binding Swatches (Muted Plum default + 4 Archival Swatches) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#28272A] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#76556F]" />
                Archival Leather Binding
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LEATHER_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => {
                      setSelectedLeather(swatch);
                      onSelectLeatherId?.(swatch.id);
                    }}
                    className={`min-h-[44px] flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-[11.5px] transition-all cursor-pointer ${
                      selectedLeather.id === swatch.id
                        ? "border-[#76556F] bg-[#F4EEF3] text-[#20242C] font-semibold shadow-xs"
                        : "border-[#E7E2DA] bg-[#F7F4EE] text-[#5C5955] hover:border-[#8D857A] hover:text-[#28272A]"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="leading-tight">{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hot Foil Stamping */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#28272A] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#76556F]" />
                Hot Foil Stamping
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {FOIL_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => {
                      setSelectedFoil(swatch);
                      onSelectFoilId?.(swatch.id);
                    }}
                    className={`min-h-[44px] flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                      selectedFoil.id === swatch.id
                        ? "border-[#76556F] bg-[#F4EEF3] text-[#20242C] font-semibold"
                        : "border-[#E7E2DA] bg-[#F7F4EE] text-[#5C5955] hover:border-[#8D857A]"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/15"
                      style={{
                        backgroundColor:
                          swatch.id === "blind_emboss" ? selectedLeather.accentHex : swatch.hex,
                      }}
                    />
                    <span className="text-[10px] text-center leading-none">{swatch.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Embossed Cover Title */}
            <div className="space-y-1.5">
              <label htmlFor="memoria-cover-title" className="text-xs font-medium text-[#28272A]">
                Embossed Cover Title
              </label>
              <input
                id="memoria-cover-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  onTitleChange?.(e.target.value);
                }}
                maxLength={28}
                className="w-full min-h-[44px] px-3 py-2 text-xs rounded-lg border border-[#8D857A] bg-white text-[#28272A] focus:outline-none focus:border-[#76556F] focus:ring-1 focus:ring-[#76556F]"
              />
            </div>

            {/* Accessibility & Motion Preferences */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]">
              <span className="text-xs font-medium text-[#28272A] flex items-center gap-1.5">
                <Accessibility className="w-3.5 h-3.5 text-[#5F735E]" />
                Reduced Motion
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={reducedMotion}
                onClick={() => setReducedMotion((prev) => !prev)}
                className={`min-h-[32px] px-3 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  reducedMotion
                    ? "bg-[#5F735E] text-white border-[#5F735E]"
                    : "bg-white text-[#5C5955] border-[#8D857A]"
                }`}
              >
                {reducedMotion ? "On" : "Off"}
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#E7E2DA] space-y-2">
            <button
              type="button"
              onClick={handleToggleOpen}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white font-semibold text-xs tracking-wide shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {isOpen ? "Close Heirloom Edition" : "Explore Open Volume"}
            </button>
            <button
              type="button"
              onClick={() => setIs2DMode((prev) => !prev)}
              className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-[#20242C] font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText className="w-3.5 h-3.5 text-[#5F735E]" />
              {is2DMode ? "Switch to 3D Canvas" : "Open Accessible 2D Spreads"}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
