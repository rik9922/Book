"use client";

import dynamic from "next/dynamic";
import { Layers, Cpu, Sparkles, Box, ShieldCheck, Zap } from "lucide-react";

// Disable SSR for 3D Canvas
const ExperienceCanvas = dynamic(
  () => import("@/components/3d/ExperienceCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] md:h-[700px] rounded-2xl border border-zinc-800 flex items-center justify-center bg-zinc-900/40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-zinc-400">Initializing 3D Engine & WebGL context...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-4 sm:px-8 py-12 max-w-7xl mx-auto flex flex-col gap-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <Cpu className="w-3.5 h-3.5" />
            Supercomputer Core Ready • Next.js 16 + React 19 + Three.js
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Heavy 3D & Full-Stack Engine
          </h1>
          <p className="text-zinc-400 mt-2 text-sm sm:text-base max-w-2xl">
            Architecture configured for heavy 3D asset pipelines, WebGL compute, shader engineering, real-time physics, and high-fidelity UI/UX design.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            Environment Calibrated
          </div>
        </div>
      </header>

      {/* 3D Showcase Viewport */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-300 font-semibold text-lg">
            <Box className="w-5 h-5 text-blue-400" />
            Live WebGL Shader & PBR 3D Testbed
          </div>
          <span className="text-xs text-zinc-500">60 FPS Hardware-Accelerated Viewport</span>
        </div>
        <ExperienceCanvas />
      </section>

      {/* Capabilities & Architecture Matrix */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <Box className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">3D & WebGL Pipeline</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Three.js, React Three Fiber, Drei, custom GLSL shaders, procedural mesh synthesis, and Blender glTF optimization pipelines.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Elite UI/UX & Motion</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Tailwind CSS v4, Framer Motion, strict micro-interactions, responsive typography, and design system tokens.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Enterprise Architecture</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Scalable domain layers, Zustand state store, strict typing with Zod, ADR documentation, and scientific analytical rigour.
          </p>
        </div>
      </section>
    </main>
  );
}

