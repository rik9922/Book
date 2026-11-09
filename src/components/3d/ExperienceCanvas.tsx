"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, MeshDistortMaterial, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

function HeroOrb() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1.2} floatIntensity={1.5}>
      <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1.2, 64, 64]} />
        <MeshDistortMaterial
          color="#3b82f6"
          roughness={0.15}
          metalness={0.8}
          distort={0.35}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

export default function ExperienceCanvas() {
  return (
    <div className="relative w-full h-[600px] md:h-[700px] rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl shadow-2xl">
      <Canvas
        shadows
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#60a5fa" />
        <Environment preset="city" />

        <HeroOrb />

        <ContactShadows
          position={[0, -1.8, 0]}
          opacity={0.65}
          scale={10}
          blur={2.5}
          far={4}
        />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
}

