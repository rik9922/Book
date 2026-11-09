"use client";

import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  useGLTF,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import * as THREE from "three";

function Heirloom3DBook({
  coverColor = "#304C43", // Heirloom Forest
  title = "Bennett Family Heritage",
  year = "1982 — 2026",
}: {
  coverColor?: string;
  title?: string;
  year?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Load the procedurally synthesized anatomical book model
  const { scene } = useGLTF("/models/heirloom_book.glb");

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Subtle organic breath rotation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.6} floatIntensity={0.8}>
      <group
        ref={groupRef}
        rotation={[0.2, -0.4, 0.05]}
        scale={hovered ? 1.05 : 1.0}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Physical Hardcover Book Model */}
        <primitive object={scene.clone()} />

        {/* Gold Foil Debossed Title */}
        <Text
          position={[0.10, 0.019, 0.02]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.012}
          color="#D4AF37" // Metallic Gold Foil
          anchorX="center"
          anchorY="middle"
          maxWidth={0.16}
          font="https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff"
        >
          {title.toUpperCase()}
        </Text>

        <Text
          position={[0.10, 0.019, -0.04]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.007}
          color="#C5A059"
          anchorX="center"
          anchorY="middle"
        >
          {year}
        </Text>
      </group>
    </Float>
  );
}

// Preload GLTF model
useGLTF.preload("/models/heirloom_book.glb");

export default function ExperienceCanvas() {
  return (
    <div className="relative w-full h-[600px] md:h-[700px] rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl shadow-2xl">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700/60 text-xs font-medium text-zinc-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Photorealistic 3D Heirloom Book • Drag to Orbit
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 0.25, 0.45], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 4, 3]} intensity={2.0} castShadow />
        <directionalLight position={[-2, -1, -2]} intensity={0.5} color="#F7F4ED" />
        <spotLight position={[0, 3, 2]} intensity={1.5} angle={0.4} penumbra={0.8} />

        <Heirloom3DBook />

        <ContactShadows
          position={[0, -0.09, 0]}
          opacity={0.65}
          scale={1.2}
          blur={1.8}
          far={0.5}
        />
        <OrbitControls
          enableZoom={true}
          minDistance={0.2}
          maxDistance={0.8}
          maxPolarAngle={Math.PI / 2 + 0.1}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
