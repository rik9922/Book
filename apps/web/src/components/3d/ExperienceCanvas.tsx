"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  useGLTF,
  ContactShadows,
  Text,
} from "@react-three/drei";
import * as THREE from "three";
import { BookOpen, Sparkles, Palette, Layers, RefreshCw } from "lucide-react";

// Color palettes for Memoria physical bindings
export const LEATHER_SWATCHES = [
  { id: "emerald", name: "Heirloom Emerald", hex: "#1B382B", accent: "#304C43" },
  { id: "navy", name: "Archival Navy", hex: "#16233B", accent: "#253A5E" },
  { id: "burgundy", name: "Vintage Burgundy", hex: "#3B141C", accent: "#5C202C" },
  { id: "onyx", name: "Midnight Onyx", hex: "#1C1C1E", accent: "#2C2C2E" },
];

export const FOIL_SWATCHES = [
  { id: "gold", name: "Metallic Gold Foil", hex: "#D4AF37" },
  { id: "rose", name: "Rose Gold Foil", hex: "#B76E79" },
  { id: "silver", name: "Sterling Silver Foil", hex: "#C0C0C0" },
];

interface BookProps {
  coverColor: string;
  foilColor: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  title: string;
  subtitle: string;
}

function Heirloom3DBook({
  coverColor,
  foilColor,
  isOpen,
  onToggleOpen,
  title,
  subtitle,
}: BookProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const frontHingeRef = useRef<THREE.Group>(null);
  const turningPageRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Load the multi-part anatomical model
  const { scene } = useGLTF("/models/memoria_heirloom_book.glb");

  // Clone scene for isolated material manipulation
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Apply dynamic PBR materials to nodes
  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const meshName = mesh.name;

        if (meshName.includes("FrontCover") || meshName.includes("BackCover") || meshName.includes("Spine")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(coverColor),
            roughness: 0.82,
            metalness: 0.04,
            bumpScale: 0.002,
          });
        } else if (meshName.includes("Emblem") || meshName.includes("CornerGuards")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(foilColor),
            roughness: 0.25,
            metalness: 0.92,
          });
        } else if (meshName.includes("Ribbon")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(foilColor),
            roughness: 0.55,
            metalness: 0.35,
          });
        } else if (meshName.includes("TextBlock") || meshName.includes("TurningPage")) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#F7F4ED"), // Warm archival ivory
            roughness: 0.95,
            metalness: 0.0,
          });
        }
      }
    });
  }, [clonedScene, coverColor, foilColor]);

  // Separate front articulable elements into a dynamic hinge group
  const { stationaryElements, frontCoverElements, turningPageElement } = useMemo(() => {
    const stationary = new THREE.Group();
    const frontGroup = new THREE.Group();
    let turningPage: THREE.Object3D | null = null;

    clonedScene.children.forEach((child) => {
      // Find nodes
      child.traverse((node) => {
        if (node.name === "FrontCover" || node.name === "TreeOfLifeEmblem" || node.name === "CornerGuards") {
          frontGroup.add(node.clone());
        } else if (node.name === "TurningPageLeaf") {
          turningPage = node.clone();
        } else if (node.name === "Spine" || node.name === "BackCover" || node.name === "TextBlock" || node.name === "SilkRibbonBookmark") {
          stationary.add(node.clone());
        }
      });
    });

    return {
      stationaryElements: stationary,
      frontCoverElements: frontGroup,
      turningPageElement: turningPage,
    };
  }, [clonedScene]);

  // Frame loop for hinge interpolation and natural page flutter
  useFrame((state, delta) => {
    // Gentle idle floating rotation
    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
    }

    // Front cover open/close hinge physics (rotate around hinge axis x = 0)
    if (frontHingeRef.current) {
      const targetAngle = isOpen ? -Math.PI * 0.88 : 0;
      frontHingeRef.current.rotation.z = THREE.MathUtils.lerp(
        frontHingeRef.current.rotation.z,
        targetAngle,
        delta * 3.5
      );
    }

    // Turning page leaf conical curling mechanics when open
    if (turningPageRef.current && isOpen) {
      const wave = Math.sin(state.clock.elapsedTime * 2.2) * 0.04;
      turningPageRef.current.rotation.z = -Math.PI * 0.35 + wave;
    } else if (turningPageRef.current) {
      turningPageRef.current.rotation.z = THREE.MathUtils.lerp(
        turningPageRef.current.rotation.z,
        0,
        delta * 5
      );
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.5}>
      <group
        ref={rootGroupRef}
        rotation={[0.3, -0.4, 0.05]}
        scale={hovered ? 1.03 : 1.0}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onToggleOpen();
        }}
      >
        {/* Stationary elements (Spine, Back Cover, Text Block, Ribbon) */}
        <primitive object={stationaryElements} />

        {/* Dynamic Front Cover Hinge Group */}
        <group ref={frontHingeRef} position={[0, 0, 0]}>
          <primitive object={frontCoverElements} />

          {/* Debossed Foil Stamped Title Text */}
          <Text
            position={[0.10, 0.016, 0.02]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.011}
            color={foilColor}
            anchorX="center"
            anchorY="middle"
            maxWidth={0.16}
            font="https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff"
          >
            {title.toUpperCase()}
          </Text>

          <Text
            position={[0.10, 0.016, -0.05]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.0065}
            color={foilColor}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.1}
          >
            {subtitle.toUpperCase()}
          </Text>
        </group>

        {/* Turning Page Leaf */}
        {turningPageElement && (
          <group ref={turningPageRef} position={[0, 0.011, 0]}>
            <primitive object={turningPageElement} />
          </group>
        )}
      </group>
    </Float>
  );
}

useGLTF.preload("/models/memoria_heirloom_book.glb");

export default function ExperienceCanvas() {
  const [selectedLeather, setSelectedLeather] = useState(LEATHER_SWATCHES[0]);
  const [selectedFoil, setSelectedFoil] = useState(FOIL_SWATCHES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("The Bennett Heritage");
  const [subtitle, setSubtitle] = useState("1948 — 2026 • Memoria Volume I");

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#304C43]/40 bg-[#090D0B] shadow-2xl flex flex-col md:flex-row">
      {/* 3D Canvas Viewport */}
      <div className="relative flex-1 h-[480px] md:h-[640px] w-full">
        {/* Interactive Badge & Open/Close Toggle */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1E19]/80 border border-[#304C43]/60 text-xs font-medium text-emerald-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Photorealistic 3D Engine • Three.js R3F
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C49A4A]/20 hover:bg-[#C49A4A]/30 border border-[#C49A4A]/60 text-xs font-semibold text-[#D4AF37] transition-all backdrop-blur-md cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isOpen ? "Close Cover" : "Open Book"}
          </button>
        </div>

        <div className="absolute bottom-4 left-4 z-10 text-[11px] text-zinc-400/80 bg-black/40 px-3 py-1 rounded-md backdrop-blur-sm pointer-events-none">
          Click book or drag to orbit • Scroll to zoom
        </div>

        <Canvas
          shadows
          camera={{ position: [0, 0.28, 0.44], fov: 38 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* Studio Lighting Rig */}
          <ambientLight intensity={1.1} />
          <directionalLight position={[2.5, 4.5, 3]} intensity={2.2} castShadow color="#FFF8EB" />
          <directionalLight position={[-2.5, 1.5, -2]} intensity={0.8} color="#D4E6DF" />
          <spotLight position={[0, 3.5, 2.5]} intensity={1.8} angle={0.45} penumbra={0.7} color="#FFF5DF" />

          <Heirloom3DBook
            coverColor={selectedLeather.hex}
            foilColor={selectedFoil.hex}
            isOpen={isOpen}
            onToggleOpen={() => setIsOpen(!isOpen)}
            title={title}
            subtitle={subtitle}
          />

          <ContactShadows
            position={[0, -0.09, 0]}
            opacity={0.7}
            scale={1.3}
            blur={1.8}
            far={0.5}
            color="#05100B"
          />
          <OrbitControls
            enableZoom={true}
            minDistance={0.22}
            maxDistance={0.85}
            maxPolarAngle={Math.PI / 2 + 0.12}
            dampingFactor={0.06}
          />
        </Canvas>
      </div>

      {/* Interactive Customization Studio Controls */}
      <div className="w-full md:w-80 p-6 border-t md:border-t-0 md:border-l border-[#304C43]/40 bg-[#0B1512]/90 backdrop-blur-xl flex flex-col justify-between">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C49A4A]">
              <Sparkles className="w-3.5 h-3.5" />
              Heirloom 3D Studio
            </div>
            <h3 className="text-lg font-serif font-bold text-white mt-1">Material Customizer</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select archival binding textures and stamped gold finishes in real-time.
            </p>
          </div>

          {/* Leather Colors */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#C49A4A]" />
              Archival Leather Binding
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LEATHER_SWATCHES.map((swatch) => (
                <button
                  key={swatch.id}
                  onClick={() => setSelectedLeather(swatch)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    selectedLeather.id === swatch.id
                      ? "border-[#D4AF37] bg-[#122A23] text-white shadow-sm"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span className="truncate font-medium">{swatch.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Foil Stamping */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#C49A4A]" />
              Hot Foil Stamping
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FOIL_SWATCHES.map((swatch) => (
                <button
                  key={swatch.id}
                  onClick={() => setSelectedFoil(swatch)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                    selectedFoil.id === swatch.id
                      ? "border-[#D4AF37] bg-[#122A23] text-white"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <span className="text-[10px] text-center">{swatch.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title Customizer */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Embossed Cover Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={28}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-800 bg-zinc-900/80 text-white focus:outline-none focus:border-[#C49A4A]"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-6 border-t border-zinc-800/80">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C49A4A] to-[#E5C378] text-[#090D0B] font-semibold text-xs tracking-wide shadow-lg hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            {isOpen ? "Close Heirloom Edition" : "Explore Open Volume"}
          </button>
        </div>
      </div>
    </div>
  );
}
