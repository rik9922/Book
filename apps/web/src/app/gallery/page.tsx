import React from "react";
import Link from "next/link";
import { BOOK_LEATHER_SWATCHES, CANONICAL_SAMPLE_SPREADS } from "@memory-capsule/contracts/book-3d";
import { BookOpen, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const CURATED_EDITIONS = [
  {
    id: "bennett-heritage",
    title: "The Bennett Heritage",
    subtitle: "1948 — 2026 • Memoria Volume I",
    swatch: BOOK_LEATHER_SWATCHES[0],
    foil: "24K Archival Gold",
    pages: 48,
  },
  {
    id: "sonoma-orchard",
    title: "First Steps in Sonoma",
    subtitle: "Clara's Early Years • 1994–1999",
    swatch: BOOK_LEATHER_SWATCHES[4],
    foil: "Sterling Silver",
    pages: 36,
  },
  {
    id: "devon-letters",
    title: "Letters from Devon & Normandy",
    subtitle: "OCR Transcribed Family Correspondence",
    swatch: BOOK_LEATHER_SWATCHES[1],
    foil: "Rose Copper Foil",
    pages: 64,
  },
];

export default function PublicGalleryPage() {
  return (
    <AppShell
      title="Public Heirloom Book Gallery"
      subtitle="Explore curated open-access heirloom editions and inspect sample typographic spreads."
    >
      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CURATED_EDITIONS.map((ed) => (
            <article
              key={ed.id}
              className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 flex flex-col justify-between gap-5 shadow-xs"
            >
              <div className="space-y-4">
                <div
                  className="h-44 rounded-xl border border-black/15 p-5 flex flex-col justify-between text-white shadow-inner"
                  style={{ backgroundColor: ed.swatch.hex }}
                >
                  <span className="text-[10px] uppercase tracking-widest opacity-80">
                    {ed.swatch.name}
                  </span>
                  <div>
                    <h2 className="font-serif text-xl font-bold leading-snug">{ed.title}</h2>
                    <p className="text-[11px] opacity-85 mt-1">{ed.subtitle}</p>
                  </div>
                </div>
                <div className="text-xs text-[#5C5955] space-y-1">
                  <p>
                    <strong className="text-[#20242C]">Foil Finish:</strong> {ed.foil}
                  </p>
                  <p>
                    <strong className="text-[#20242C]">Length:</strong> {ed.pages} acid-free pages
                  </p>
                </div>
              </div>
              <Link
                href="/sample-book"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                Inspect in 3D Reader
              </Link>
            </article>
          ))}
        </div>

        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
            Sample Spread Preview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CANONICAL_SAMPLE_SPREADS.slice(0, 2).map((spread) => (
              <div
                key={spread.spreadIndex}
                className="p-5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#76556F]">
                  {spread.chapterTitle} (Pages {spread.leftPageNumber}–{spread.rightPageNumber})
                </p>
                <h3 className="font-serif text-lg font-bold text-[#20242C]">
                  {spread.rightHeading}
                </h3>
                <p className="text-xs text-[#5C5955] leading-relaxed">{spread.rightBody}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
