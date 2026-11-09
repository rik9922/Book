"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { BookOpen, Sparkles, Shield, Heart, Compass, Printer } from "lucide-react";

// Disable SSR for 3D Canvas
const ExperienceCanvas = dynamic(
  () => import("@/components/3d/ExperienceCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] md:h-[700px] rounded-2xl border border-[#304C43]/40 flex items-center justify-center bg-[#123F35]/20 backdrop-blur">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#C49A4A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-serif text-[#C49A4A]">Opening Memoria 3D Archival Reader...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0D1714] via-[#122A23] to-[#0A100E] px-4 sm:px-8 py-10 max-w-7xl mx-auto flex flex-col gap-12 text-[#F7F4ED]">
      {/* Memoria Brand Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#304C43]/40">
        <div className="flex items-center gap-5">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-2xl shadow-[#123F35]/50 border-2 border-[#C49A4A]/40 shrink-0">
            <Image
              src="/branding/memoria-app-icon-512.png"
              alt="Memoria App Icon — Archival Book with Tree of Life"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-medium tracking-wide bg-[#C49A4A]/15 text-[#C49A4A] border border-[#C49A4A]/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Heirloom Memory Preservation
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight bg-gradient-to-r from-[#F7F4ED] via-[#E8DFD0] to-[#C49A4A] bg-clip-text text-transparent">
              Memoria
            </h1>
            <p className="text-[#A4B3A8] mt-1 text-base sm:text-lg font-light tracking-wide">
              Your memories, made timeless.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#123F35]/40 border border-[#C49A4A]/30 text-[#C49A4A] text-sm font-medium shadow-sm">
            <Shield className="w-4 h-4 text-[#C49A4A]" />
            Archival Quality Verified
          </div>
        </div>
      </header>

      {/* 3D Interactive Memory Book Viewport */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#F7F4ED] font-serif font-semibold text-lg">
            <BookOpen className="w-5 h-5 text-[#C49A4A]" />
            Interactive 3D Archival Reader
          </div>
          <span className="text-xs text-[#8A9C8F]">Three.js • PBR Materials • Realistic Turn Physics</span>
        </div>
        <ExperienceCanvas />
      </section>

      {/* Memoria Product Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-[#304C43]/40 bg-[#122A23]/40 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-[#C49A4A]/15 border border-[#C49A4A]/30 flex items-center justify-center text-[#C49A4A] mb-4">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-serif font-semibold text-[#F7F4ED] mb-2">Life Story Archives</h3>
          <p className="text-sm text-[#A4B3A8] leading-relaxed">
            Preserve family milestones, children’s growth, personal stories, voice notes, and heritage photos with zero data degradation.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-[#304C43]/40 bg-[#122A23]/40 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-[#C49A4A]/15 border border-[#C49A4A]/30 flex items-center justify-center text-[#C49A4A] mb-4">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-serif font-semibold text-[#F7F4ED] mb-2">Collaborative Spaces</h3>
          <p className="text-sm text-[#A4B3A8] leading-relaxed">
            Invite parents, grandparents, and loved ones to co-create shared timelines with granular family role permissions.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-[#304C43]/40 bg-[#122A23]/40 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-[#C49A4A]/15 border border-[#C49A4A]/30 flex items-center justify-center text-[#C49A4A] mb-4">
            <Printer className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-serif font-semibold text-[#F7F4ED] mb-2">Physical Heirloom Publishing</h3>
          <p className="text-sm text-[#A4B3A8] leading-relaxed">
            Transform digital capsules into bespoke cloth-bound books with embossed gold foil stamping and museum-grade archival paper.
          </p>
        </div>
      </section>
    </main>
  );
}

