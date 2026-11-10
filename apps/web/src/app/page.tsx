import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  Heart,
  Users,
  Printer,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { ClientStudioMount } from "@/components/3d/ClientStudioMount";
import { LandingInteractive, MemoryPreview } from "@/components/LandingInteractive";

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
    ocrSnippet:
      "My dearest Mother & Father — Do not worry about me. The cider apples must be sweet this year.",
    verifiedSha256: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#28272A] flex flex-col justify-between selection:bg-[#76556F]/20 selection:text-[#20242C]">
      <div id="landing-main-surface" className="flex-1 flex flex-col justify-between">
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

            <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C5955]">
              <Link href="/dashboard" className="hover:text-[#20242C] transition-colors">
                Dashboard
              </Link>
              <Link href="/archive" className="hover:text-[#20242C] transition-colors">
                Timeline Archive
              </Link>
              <Link href="/studio" className="hover:text-[#20242C] transition-colors">
                3D Book Studio
              </Link>
              <Link href="/circles" className="hover:text-[#20242C] transition-colors">
                Family Circles
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E2DA] bg-white text-xs font-semibold text-[#20242C] hover:border-[#8D857A] shadow-xs transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#5F735E]" />
                Admin Portal
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/auth"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E2DA] text-xs font-medium text-[#20242C] hover:border-[#8D857A] shadow-xs transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/archive"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold tracking-wide shadow-sm transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Preserve Memory
              </Link>
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
              <Link
                href="/archive"
                className="px-6 py-3 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white font-semibold text-sm tracking-wide shadow-sm transition-all flex items-center gap-2"
              >
                Explore Family Archive
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/studio"
                className="px-6 py-3 rounded-xl bg-white hover:bg-[#F0ECE1] border border-[#E7E2DA] text-[#20242C] font-semibold text-sm transition-all shadow-xs flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#76556F]" />
                Open 3D Book Studio
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-xs text-[#5C5955]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#5F735E]" />
                Local-First &amp; Offline Capable
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
            <ClientStudioMount bookId="sample" />
          </section>

          {/* 4. Living Archive: Photography-First Memory Timeline */}
          <section id="archive" className="scroll-mt-28">
            <LandingInteractive memories={SAMPLE_MEMORIES} />
          </section>

          {/* 5. Product Pillars */}
          <section id="spaces" className="grid grid-cols-1 md:grid-cols-3 gap-6 scroll-mt-28">
            <Link
              href="/archive"
              className="p-8 rounded-2xl border border-[#E7E2DA] bg-white shadow-xs hover:border-[#8D857A] transition-colors block"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F4EEF3] border border-[#E7E2DA] flex items-center justify-center text-[#76556F] mb-5">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#20242C] mb-2">Life Story Archives</h3>
              <p className="text-xs text-[#5C5955] leading-relaxed">
                Preserve milestones, family histories, and handwritten recipes with zero compression loss. Local-first storage guarantees your memories never disappear.
              </p>
            </Link>

            <Link
              href="/circles"
              className="p-8 rounded-2xl border border-[#E7E2DA] bg-white shadow-xs hover:border-[#8D857A] transition-colors block"
            >
              <div className="w-12 h-12 rounded-xl bg-[#EEF2ED] border border-[#B6DBC7] flex items-center justify-center text-[#5F735E] mb-5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#20242C] mb-2">Collaborative Circles</h3>
              <p className="text-xs text-[#5C5955] leading-relaxed">
                Invite parents, siblings, and grandchildren to contribute photos and audio reflections into a shared chronological timeline with strict family role security.
              </p>
            </Link>

            <Link
              href="/studio"
              className="p-8 rounded-2xl border border-[#E7E2DA] bg-white shadow-xs hover:border-[#8D857A] transition-colors block"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F0ECE1] border border-[#E7E2DA] flex items-center justify-center text-[#20242C] mb-5">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#20242C] mb-2">Physical Book Publishing</h3>
              <p className="text-xs text-[#5C5955] leading-relaxed">
                With a single click, compile digital capsules into heirloom hardcover editions bound in vegetable-tanned cloth with foil-debossed covers and acid-free pages.
              </p>
            </Link>
          </section>
        </main>

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

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#5C5955]">
              <Link href="/dashboard" className="hover:text-[#20242C] font-medium">
                Dashboard
              </Link>
              <Link href="/settings" className="hover:text-[#20242C] font-medium">
                Preferences
              </Link>
              <Link href="/admin" className="hover:text-[#20242C] font-semibold text-[#76556F]">
                Admin Operations
              </Link>
              <span aria-hidden="true">•</span>
              <span>Living Archive Light System</span>
              <span aria-hidden="true">•</span>
              <span>WCAG 2.2 AA Verified</span>
            </div>

            <div className="text-xs text-[#78736E]">
              © {new Date().getFullYear()} Memoria Platform. Absolute $0 Budget Architecture.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
