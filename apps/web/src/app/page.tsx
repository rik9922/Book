"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  Heart,
  Users,
  Printer,
  Calendar,
  MapPin,
  Tag,
  ArrowRight,
  X,
  FileText,
  Search,
  PlusCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";

// Disable SSR for 3D Canvas
const ExperienceCanvas = dynamic(
  () => import("@/components/3d/ExperienceCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-2xl border border-[#E7E2DA] flex items-center justify-center bg-[#FFFFFF] shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#76556F] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-serif text-[#20242C]">Opening Memoria 3D Archival Reader...</p>
        </div>
      </div>
    ),
  }
);

interface MemoryPreview {
  id: string;
  title: string;
  date: string;
  location: string;
  narrative: string;
  tags: string[];
  imageSrc: string;
  imageAlt: string;
  ocrSnippet?: string;
  verifiedSha256: string;
}

const SAMPLE_MEMORIES: MemoryPreview[] = [
  {
    id: "mem-01",
    title: "Eleanor & James: The Golden Anniversary",
    date: "June 14, 1978",
    location: "Villa Bellagio, Lake Como",
    narrative:
      "All three generations gathered under the wisteria pergola. Grandfather wore his tailored tweed jacket, reciting the poem he wrote for Eleanor when they first met in Florence in 1928.",
    tags: ["family", "anniversary", "heritage"],
    imageSrc: "/branding/memoria-app-icon-512.png",
    imageAlt: "Heirloom archival portrait of Eleanor and James",
    ocrSnippet: "To Eleanor, my north star across fifty summers — James, June 1978",
    verifiedSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    id: "mem-02",
    title: "First Steps in the High Orchard",
    date: "September 22, 1994",
    location: "Sonoma Valley Estate",
    narrative:
      "Between the rows of honeycrisp trees, Clara let go of her mother’s hands and took seven steady steps toward the basket of freshly harvested pears. Captured on 35mm Kodachrome.",
    tags: ["milestone", "childhood", "autumn"],
    imageSrc: "/branding/memoria-app-icon-512.png",
    imageAlt: "Childhood photograph in sunny orchard",
    verifiedSha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  },
  {
    id: "mem-03",
    title: "Handwritten Postcard from Normandy",
    date: "August 3, 1944",
    location: "Sainte-Mère-Église, France",
    narrative:
      "Original postcard found inside the cedar chest. Penciled on field stationery, assuring his parents he was safe and asking about the cider harvest back in Devon.",
    tags: ["historical", "letters", "wwii"],
    imageSrc: "/branding/memoria-app-icon-512.png",
    imageAlt: "Vintage handwritten postcard preserved with OCR transcript",
    ocrSnippet: "My dearest Mother & Father — Do not worry about me. The cider apples must be sweet this year.",
    verifiedSha256: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  },
];

export default function Home() {
  const [activeMediaModal, setActiveMediaModal] = useState<MemoryPreview | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#28272A] flex flex-col justify-between selection:bg-[#76556F]/20 selection:text-[#20242C]">
      {/* 1. Header & Global Navigation */}
      <header className="sticky top-0 z-40 bg-[#F7F4EE]/90 backdrop-blur-md border-b border-[#E7E2DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-[#E7E2DA] shadow-xs group-hover:border-[#76556F] transition-all shrink-0">
                <Image
                  src="/branding/memoria-app-icon-192.png"
                  alt="Memoria Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <span className="font-serif text-2xl font-bold tracking-tight text-[#20242C]">
                  Memoria
                </span>
                <span className="block text-[10px] tracking-wider uppercase text-[#5C5955] font-medium -mt-1">
                  Living Archive
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#5C5955]">
            <a href="#archive" className="hover:text-[#20242C] transition-colors">
              Timeline Archive
            </a>
            <a href="#studio" className="hover:text-[#20242C] transition-colors">
              3D Book Studio
            </a>
            <a href="#spaces" className="hover:text-[#20242C] transition-colors">
              Family Circles
            </a>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E2DA] bg-white text-xs font-semibold text-[#20242C] hover:border-[#8D857A] shadow-xs transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#5F735E]" />
              Admin Portal
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveMediaModal(SAMPLE_MEMORIES[0])}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E2DA] text-xs font-medium text-[#20242C] hover:border-[#8D857A] shadow-xs transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#5C5955]" />
              Search Archive
            </button>
            <a
              href="#archive"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold tracking-wide shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Preserve Memory
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Surfaces */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 flex flex-col gap-16 sm:gap-24">
        {/* 2. Hero Section: Editorial Storytelling */}
        <section className="flex flex-col items-center text-center max-w-3xl mx-auto pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide bg-[#EEF2ED] text-[#5F735E] border border-[#B6DBC7] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Heirloom Memory Preservation
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl text-[#20242C] font-bold tracking-tight leading-[1.15]">
            Your memories, made timeless.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#5C5955] leading-relaxed max-w-2xl font-light">
            A quiet, permanent archive for the stories, photographs, and family voices that shape your life.
            Preserved digitally with cryptographic integrity and bound into bespoke heirloom books.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#archive"
              className="px-6 py-3 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white font-semibold text-sm tracking-wide shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              Explore Family Archive
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#studio"
              className="px-6 py-3 rounded-xl bg-white hover:bg-[#F0ECE1] border border-[#E7E2DA] text-[#20242C] font-semibold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#76556F]" />
              Open 3D Book Studio
            </a>
          </div>

          <div className="mt-8 flex items-center gap-6 text-xs text-[#5C5955]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#5F735E]" />
              Local-First & Offline Capable
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#5F735E]" />
              SHA-256 Verified Storage
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#5F735E]" />
              100% Private ($0 Budget)
            </span>
          </div>
        </section>

        {/* 3. Interactive 3D Book Studio */}
        <section id="studio" className="scroll-mt-28">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                Tactile Experience
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#20242C] mt-1">
                The 3D Archival Reader
              </h2>
            </div>
            <p className="text-xs text-[#5C5955] max-w-md">
              Inspect physical leather bindings, hot-foil embossing, and delicate page curls in a clean neutral environment designed for authentic material evaluation.
            </p>
          </div>
          <ExperienceCanvas />
        </section>

        {/* 4. Living Archive: Photography-First Memory Timeline */}
        <section id="archive" className="scroll-mt-28">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                Living Archive
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#20242C] mt-1">
                Recent Heirloom Entries
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5F735E] bg-[#EEF2ED] px-3 py-1 rounded-full border border-[#B6DBC7]">
                3 Memories Preserved
              </span>
            </div>
          </div>

          {/* Cards Grid: Photography First, Calm Backgrounds */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SAMPLE_MEMORIES.map((mem) => (
              <article
                key={mem.id}
                onClick={() => setActiveMediaModal(mem)}
                className="group bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-md hover:border-[#8D857A] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Image container: no competing gradient, clean photographic frame */}
                  <div className="relative aspect-[4/3] w-full bg-[#F0ECE1] overflow-hidden">
                    <Image
                      src={mem.imageSrc}
                      alt={mem.imageAlt}
                      fill
                      className="object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-[11px] font-medium text-[#5F735E] px-2.5 py-1 rounded-full border border-[#E7E2DA] flex items-center gap-1 shadow-xs">
                      <ShieldCheck className="w-3 h-3 text-[#5F735E]" />
                      Verified
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-3 text-xs text-[#5C5955] mb-2.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#76556F]" />
                        {mem.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#5F735E]" />
                        {mem.location}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-[#20242C] group-hover:text-[#76556F] transition-colors leading-snug">
                      {mem.title}
                    </h3>

                    <p className="mt-2.5 text-xs text-[#5C5955] leading-relaxed line-clamp-3">
                      {mem.narrative}
                    </p>

                    {mem.ocrSnippet && (
                      <div className="mt-4 p-3 rounded-xl bg-[#F0ECE1]/60 border border-[#E7E2DA] text-[11px] text-[#28272A] italic">
                        <span className="not-italic font-semibold block text-[10px] uppercase text-[#76556F] mb-0.5">
                          Extracted Inscription (OCR)
                        </span>
                        "{mem.ocrSnippet}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 border-t border-[#E7E2DA] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {mem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#EEF2ED] text-[#5F735E]"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-[#76556F] group-hover:translate-x-0.5 transition-transform">
                    View →
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 5. Product Pillars */}
        <section id="spaces" className="grid grid-cols-1 md:grid-cols-3 gap-6 scroll-mt-28">
          <div className="p-8 rounded-2xl border border-[#E7E2DA] bg-white shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#F4EEF3] border border-[#E7E2DA] flex items-center justify-center text-[#76556F] mb-5">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#20242C] mb-2">Life Story Archives</h3>
            <p className="text-xs text-[#5C5955] leading-relaxed">
              Preserve milestones, family histories, and handwritten recipes with zero compression loss. Local-first storage guarantees your memories never disappear.
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-[#E7E2DA] bg-white shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#EEF2ED] border border-[#B6DBC7] flex items-center justify-center text-[#5F735E] mb-5">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#20242C] mb-2">Collaborative Circles</h3>
            <p className="text-xs text-[#5C5955] leading-relaxed">
              Invite parents, siblings, and grandchildren to contribute photos and audio reflections into a shared chronological timeline with strict family role security.
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-[#E7E2DA] bg-white shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#F0ECE1] border border-[#E7E2DA] flex items-center justify-center text-[#20242C] mb-5">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#20242C] mb-2">Physical Book Publishing</h3>
            <p className="text-xs text-[#5C5955] leading-relaxed">
              With a single click, compile digital capsules into heirloom hardcover editions bound in vegetable-tanned cloth with foil-debossed covers and acid-free pages.
            </p>
          </div>
        </section>
      </main>

      {/* 6. Immersive Full-Screen Media Presentation (Near-Black Canvas for Media Viewing ONLY) */}
      {activeMediaModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1E]/95 backdrop-blur-md p-4 sm:p-8"
          onClick={() => setActiveMediaModal(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#1A1A1E] text-[#F7F4EE] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Near-black media canvas */}
            <div className="relative flex-1 min-h-[360px] md:min-h-[500px] bg-black/60 flex items-center justify-center p-6">
              <div className="relative w-full h-full max-h-[460px] aspect-[4/3]">
                <Image
                  src={activeMediaModal.imageSrc}
                  alt={activeMediaModal.imageAlt}
                  fill
                  className="object-contain"
                />
              </div>
              <button
                onClick={() => setActiveMediaModal(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer"
                aria-label="Close viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Light-theme metadata panel */}
            <div className="w-full md:w-80 p-6 bg-[#FFFFFF] text-[#28272A] flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#E7E2DA]">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#76556F]">
                    Archival Entry Details
                  </span>
                  <h3 className="font-serif text-lg font-bold text-[#20242C] mt-1 leading-snug">
                    {activeMediaModal.title}
                  </h3>
                  <p className="text-xs text-[#5C5955] mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#76556F]" />
                    {activeMediaModal.date}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E7E2DA]">
                  <h4 className="text-xs font-semibold text-[#20242C] mb-1">Story Narrative</h4>
                  <p className="text-xs text-[#5C5955] leading-relaxed">
                    {activeMediaModal.narrative}
                  </p>
                </div>

                {activeMediaModal.ocrSnippet && (
                  <div className="p-3 rounded-xl bg-[#F0ECE1] border border-[#E7E2DA] text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-[#76556F] text-[11px] mb-1">
                      <FileText className="w-3.5 h-3.5" />
                      OCR Verified Text
                    </div>
                    <p className="text-[#28272A] italic text-[11px]">
                      "{activeMediaModal.ocrSnippet}"
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E7E2DA]">
                  <span className="text-[10px] font-mono text-[#78736E] block truncate">
                    SHA-256: {activeMediaModal.verifiedSha256}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-[#E7E2DA] flex gap-2">
                <button
                  onClick={() => setActiveMediaModal(null)}
                  className="w-full py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Footer */}
      <footer className="border-t border-[#E7E2DA] bg-[#F0ECE1]/50 py-12 px-4 sm:px-8 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#E7E2DA]">
              <Image
                src="/branding/memoria-app-icon-192.png"
                alt="Memoria App Icon"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-serif font-bold text-sm text-[#20242C]">Memoria</span>
              <span className="text-xs text-[#5C5955] block">Your memories, made timeless.</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#5C5955]">
            <Link href="/admin" className="hover:text-[#20242C] font-semibold text-[#76556F]">
              Admin Operations
            </Link>
            <span>•</span>
            <span>Living Archive Light System</span>
            <span>•</span>
            <span>WCAG 2.2 AA Verified</span>
          </div>

          <div className="text-xs text-[#78736E]">
            © {new Date().getFullYear()} Memoria Platform. Absolute $0 Budget Architecture.
          </div>
        </div>
      </footer>
    </div>
  );
}
