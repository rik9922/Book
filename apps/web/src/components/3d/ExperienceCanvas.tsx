"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  useGLTF,
  ContactShadows,
  Text,
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

const GLB_MODEL_URL = `/models/memoria_heirloom_book.glb?v=${CANONICAL_BOOK_3D_MANIFEST.version}`;

export const LEATHER_SWATCHES = BOOK_LEATHER_SWATCHES;
export const FOIL_SWATCHES = BOOK_FOIL_SWATCHES;

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
  const turningPageHingeRef = useRef<THREE.Object3D | null>(null);
  const turningPageMeshRef = useRef<THREE.Mesh | null>(null);
  const openProgressRef = useRef<number>(isOpen ? 1 : 0);
  const turnProgressRef = useRef<number>(0);
  const lastTurnNonceRef = useRef<number>(pageTurnNonce);
  const basePagePositionsRef = useRef<Float32Array | null>(null);
  const [hovered, setHovered] = useState(false);

  const { scene } = useGLTF(GLB_MODEL_URL);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const leatherSwatch = useMemo(() => resolveLeatherSwatch(leatherId), [leatherId]);
  const foilSwatch = useMemo(() => resolveFoilSwatch(foilId), [foilId]);

  const materialsBundle = useMemo(() => {
    const leatherParams = toThreeMaterialParams(buildLeatherMaterialSpec(leatherSwatch));
    const foilParams = toThreeMaterialParams(buildFoilMaterialSpec(foilSwatch, leatherSwatch));
    const paperParams = toThreeMaterialParams(ARCHIVAL_PAPER_MATERIAL_SPEC);
    const ribbonParams = toThreeMaterialParams(SILK_RIBBON_MATERIAL_SPEC);

    return {
      leather: new THREE.MeshPhysicalMaterial({
        ...leatherParams,
        side: THREE.DoubleSide,
      }),
      foil: new THREE.MeshPhysicalMaterial({
        ...foilParams,
        side: THREE.DoubleSide,
      }),
      paper: new THREE.MeshStandardMaterial({
        ...paperParams,
        side: THREE.DoubleSide,
      }),
      ribbon: new THREE.MeshPhysicalMaterial({
        ...ribbonParams,
        side: THREE.DoubleSide,
      }),
    };
  }, [leatherSwatch, foilSwatch]);

  useEffect(() => {
    return () => {
      materialsBundle.leather.dispose();
      materialsBundle.foil.dispose();
      materialsBundle.paper.dispose();
      materialsBundle.ribbon.dispose();
    };
  }, [materialsBundle]);

  // Bind canonical node references and apply synchronized PBR materials
  useEffect(() => {
    let foundFrontHinge: THREE.Object3D | null = null;
    let foundPageHinge: THREE.Object3D | null = null;
    let foundPageMesh: THREE.Mesh | null = null;

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
        } else if (
          nodeName === BOOK_3D_HIERARCHY.turningPageLeaf ||
          parentName === BOOK_3D_HIERARCHY.turningPageLeaf
        ) {
          mesh.material = materialsBundle.paper;
          foundPageMesh = mesh;
          if (!basePagePositionsRef.current && mesh.geometry.attributes.position) {
            basePagePositionsRef.current = new Float32Array(
              mesh.geometry.attributes.position.array as Float32Array
            );
          }
        } else if (
          nodeName === BOOK_3D_HIERARCHY.textBlock ||
          parentName === BOOK_3D_HIERARCHY.textBlock
        ) {
          mesh.material = materialsBundle.paper;
        }
      }
    });

    frontHingeRef.current = foundFrontHinge;
    turningPageHingeRef.current = foundPageHinge;
    turningPageMeshRef.current = foundPageMesh;
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
      rootGroupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.04;
    } else if (rootGroupRef.current && reducedMotion) {
      rootGroupRef.current.rotation.y = 0;
    }

    // 1. Cover Hinge Kinematics (+Z rotation swings cover up & left cleanly)
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

    if (frontHingeRef.current) {
      frontHingeRef.current.rotation.z = computeCoverHingeAngle(openProgressRef.current);
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
      const idleWave =
        isOpen && !reducedMotion ? Math.sin(state.clock.elapsedTime * 2.0) * 0.025 + 0.04 : 0;
      const turnAngle =
        turnProgressRef.current > 0
          ? computePageTurnAngle(turnProgressRef.current)
          : idleWave;
      turningPageHingeRef.current.rotation.z = turnAngle;
    }

    // Apply subtle vertex curl modulation during active turns
    const pageMesh = turningPageMeshRef.current;
    const basePositions = basePagePositionsRef.current;
    if (pageMesh && basePositions && pageMesh.geometry.attributes.position) {
      const posAttr = pageMesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const activeProgress =
        turnProgressRef.current > 0 ? turnProgressRef.current : isOpen ? 0.15 : 0;
      const bookWidth = CANONICAL_BOOK_3D_MANIFEST.dimensions.bookWidth;

      for (let i = 0; i < arr.length; i += 3) {
        const bx = basePositions[i];
        const by = basePositions[i + 1];
        const normX = Math.max(0, Math.min(1, bx / bookWidth));
        const curlLift = computePageCurlDisplacement(
          normX,
          BOOK_ANIMATION_CONTRACT.pageCurlAmplitude * 0.75,
          activeProgress
        );
        arr[i + 1] = by * 0.35 + curlLift;
      }
      posAttr.needsUpdate = true;
    }
  });

  const foilHex = buildFoilMaterialSpec(foilSwatch, leatherSwatch).baseColorHex;
  const openSpreadVisible = isOpen;
  const textBlockTopY = CANONICAL_BOOK_3D_MANIFEST.dimensions.textblockThickness / 2 + 0.0008;

  return (
    <Float
      speed={reducedMotion ? 0 : 1.1}
      rotationIntensity={reducedMotion ? 0 : 0.2}
      floatIntensity={reducedMotion ? 0 : 0.35}
    >
      <group
        ref={rootGroupRef}
        position={[-0.04, 0, 0]}
        rotation={[0.16, -0.25, 0.02]}
        scale={hovered ? 1.02 : 1.0}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onToggleOpen();
        }}
      >
        <primitive object={clonedScene} />

        {/* Dynamic Foil-Stamped Cover Typography synced to FrontCoverHinge */}
        {frontHingeRef.current && (
          <group rotation={[0, 0, computeCoverHingeAngle(isOpen ? 1 : 0)]} visible={!isOpen}>
            <Text
              position={[0.104, 0.016, 0.068]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.0105}
              color={foilHex}
              anchorX="center"
              anchorY="middle"
              maxWidth={0.16}
            >
              {title.toUpperCase()}
            </Text>
            <Text
              position={[0.104, 0.016, -0.072]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.0058}
              color={foilHex}
              anchorX="center"
              anchorY="middle"
              maxWidth={0.17}
              letterSpacing={0.06}
            >
              {subtitle.toUpperCase()}
            </Text>
          </group>
        )}

        {/* Active Open Spread Content on TextBlock Surface */}
        {openSpreadVisible && (
          <group position={[0.10, textBlockTopY, 0]}>
            <Text
              position={[0, 0.001, -0.088]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.0055}
              color="#76556F"
              anchorX="center"
              anchorY="middle"
              maxWidth={0.16}
            >
              {currentSpread.chapterTitle.toUpperCase()}
            </Text>
            <Text
              position={[0, 0.001, -0.055]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.0085}
              color="#20242C"
              anchorX="center"
              anchorY="middle"
              maxWidth={0.155}
            >
              {currentSpread.rightHeading}
            </Text>
            <Text
              position={[0, 0.001, 0.01]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.0056}
              color="#28272A"
              anchorX="center"
              anchorY="middle"
              maxWidth={0.155}
              lineHeight={1.45}
            >
              {currentSpread.rightBody}
            </Text>
            <Text
              position={[0.065, 0.001, 0.102]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.005}
              color="#78736E"
              anchorX="right"
              anchorY="middle"
            >
              {`p. ${currentSpread.rightPageNumber}`}
            </Text>
          </group>
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
  initialTitle?: string;
  initialSubtitle?: string;
  initialLeatherId?: BookLeatherSwatchId;
  initialFoilId?: BookFoilSwatchId;
}

export default function ExperienceCanvas({
  initialTitle = "The Bennett Heritage",
  initialSubtitle = "1948 — 2026 • Memoria Volume I",
  initialLeatherId = "plum",
  initialFoilId = "gold",
}: ExperienceCanvasProps) {
  const [selectedLeather, setSelectedLeather] = useState(() =>
    resolveLeatherSwatch(initialLeatherId)
  );
  const [selectedFoil, setSelectedFoil] = useState(() =>
    resolveFoilSwatch(initialFoilId)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [subtitle] = useState(initialSubtitle);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [pageTurnNonce, setPageTurnNonce] = useState(0);
  const [pageTurnDirection, setPageTurnDirection] = useState<1 | -1>(1);
  const [dragTurnOffset, setDragTurnOffset] = useState(0);
  const [cameraPresetId, setCameraPresetId] = useState<BookCameraPresetId>("hero");
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [is2DMode, setIs2DMode] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const pageDragStartXRef = useRef<number | null>(null);
  const totalSpreads = CANONICAL_SAMPLE_SPREADS.length;
  const activeSpread = CANONICAL_SAMPLE_SPREADS[spreadIndex];

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
    setIsOpen((prev) => {
      const next = !prev;
      setCameraPresetId(next ? "open_spread" : "hero");
      setCameraResetNonce((n) => n + 1);
      return next;
    });
  }, []);

  const handleTurnPage = useCallback(
    (direction: 1 | -1) => {
      if (!isOpen) {
        setIsOpen(true);
        setCameraPresetId("open_spread");
        setCameraResetNonce((n) => n + 1);
      }
      setPageTurnDirection(direction);
      setSpreadIndex((prev) => {
        const next = Math.max(0, Math.min(totalSpreads - 1, prev + direction));
        if (next !== prev) {
          setPageTurnNonce((n) => n + 1);
        }
        return next;
      });
    },
    [isOpen, totalSpreads]
  );

  const handleSelectCameraPreset = useCallback((id: BookCameraPresetId) => {
    setCameraPresetId(id);
    setCameraResetNonce((n) => n + 1);
  }, []);

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
      className="relative w-full rounded-2xl overflow-hidden border border-[#E7E2DA] bg-[#F7F4EE] shadow-md flex flex-col lg:flex-row focus:outline-none focus:ring-2 focus:ring-[#76556F]"
    >
      {/* Screen-reader live state announcer */}
      <div className="sr-only" aria-live="polite">
        {is2DMode
          ? `2D Spread Reader active. ${activeSpread.chapterTitle}, pages ${activeSpread.leftPageNumber} to ${activeSpread.rightPageNumber}.`
          : `3D Book Studio active. Book is ${isOpen ? "open" : "closed"}. Leather: ${selectedLeather.name}. Foil: ${selectedFoil.name}.`}
      </div>

      {/* Viewport Area */}
      <div className="relative flex-1 min-h-[480px] md:min-h-[640px] w-full bg-gradient-to-b from-[#F7F4EE] to-[#EDE7DC]">
        {is2DMode ? (
          <AccessibleSpreadReader
            title={title}
            subtitle={subtitle}
            coverHex={selectedLeather.hex}
            foilHex={effectiveFoilHex}
            spreads={CANONICAL_SAMPLE_SPREADS}
            currentSpreadIndex={spreadIndex}
            onChangeSpread={setSpreadIndex}
            onSwitchTo3D={webglError ? undefined : () => setIs2DMode(false)}
            fallbackReason={webglError}
          />
        ) : (
          <>
            {/* Top Floating HUD */}
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

            {/* Bottom Camera Preset Strip */}
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

            <LoadingProgressOverlay />

            {/* Interactive Page-Edge Drag Strip when Book is Open */}
            {isOpen && (
              <div
                aria-label="Drag horizontally to preview page turn curl"
                onPointerDown={(e) => {
                  pageDragStartXRef.current = e.clientX;
                }}
                onPointerMove={(e) => {
                  if (pageDragStartXRef.current === null) return;
                  const dx = pageDragStartXRef.current - e.clientX;
                  const normalized = Math.max(0, Math.min(1, dx / 140));
                  setDragTurnOffset(normalized);
                }}
                onPointerUp={() => {
                  if (pageDragStartXRef.current !== null && dragTurnOffset > 0.45) {
                    handleTurnPage(1);
                  }
                  pageDragStartXRef.current = null;
                  setDragTurnOffset(0);
                }}
                onPointerLeave={() => {
                  pageDragStartXRef.current = null;
                  setDragTurnOffset(0);
                }}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-40 rounded-xl bg-white/75 hover:bg-white/95 border border-[#E7E2DA] items-center justify-center text-[#76556F] shadow-xs cursor-ew-resize select-none"
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
                  spreads={CANONICAL_SAMPLE_SPREADS}
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
                shadows="percentage"
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
                  gl.domElement.addEventListener("webglcontextlost", (event) => {
                    event.preventDefault();
                    setWebglError("WebGL context lost. Showing Accessible 2D Spread Reader.");
                    setIs2DMode(true);
                  });
                }}
                className="w-full h-[480px] md:h-[640px] cursor-grab active:cursor-grabbing"
              >
                <ambientLight intensity={BOOK_LIGHTING_INTENT.ambientIntensity} />
                <directionalLight
                  position={BOOK_LIGHTING_INTENT.keyLight.position}
                  intensity={BOOK_LIGHTING_INTENT.keyLight.intensity}
                  color={BOOK_LIGHTING_INTENT.keyLight.colorHex}
                  castShadow
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

                <ContactShadows
                  position={[0, -0.055, 0]}
                  opacity={BOOK_LIGHTING_INTENT.shadowOpacity}
                  scale={1.2}
                  blur={1.9}
                  far={0.5}
                  color="#20242C"
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
      <aside className="w-full lg:w-84 p-6 border-t lg:border-t-0 lg:border-l border-[#E7E2DA] bg-[#FFFFFF] flex flex-col justify-between gap-6">
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
                  onClick={() => setSelectedLeather(swatch)}
                  className={`min-h-[44px] flex items-center gap-2.5 p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    selectedLeather.id === swatch.id
                      ? "border-[#76556F] bg-[#F4EEF3] text-[#20242C] font-semibold shadow-xs"
                      : "border-[#E7E2DA] bg-[#F7F4EE] text-[#5C5955] hover:border-[#8D857A] hover:text-[#28272A]"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span className="truncate">{swatch.name}</span>
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
                  onClick={() => setSelectedFoil(swatch)}
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
              onChange={(e) => setTitle(e.target.value)}
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
    </div>
  );
}
