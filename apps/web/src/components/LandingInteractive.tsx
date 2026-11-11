"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ShieldCheck,
  Calendar,
  MapPin,
  Tag,
  X,
  FileText,
  Search,
} from "lucide-react";

export interface MemoryPreview {
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

export function LandingInteractive({
  memories,
}: {
  memories: readonly MemoryPreview[];
}) {
  const [activeMediaModal, setActiveMediaModal] = useState<MemoryPreview | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const openModal = (memory: MemoryPreview, trigger?: HTMLElement | null) => {
    openerRef.current = trigger || (document.activeElement as HTMLElement | null);
    setActiveMediaModal(memory);
  };

  const closeModal = () => {
    setActiveMediaModal(null);
    requestAnimationFrame(() => {
      openerRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!activeMediaModal) return;

    const mainRegion = document.getElementById("landing-main-surface");
    if (mainRegion) {
      mainRegion.setAttribute("inert", "");
    }
    closeBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (mainRegion) {
        mainRegion.removeAttribute("inert");
      }
    };
  }, [activeMediaModal]);

  return (
    <>
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
          <button
            type="button"
            onClick={(e) => openModal(memories[0], e.currentTarget)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E2DA] text-xs font-medium text-[#20242C] hover:border-[#8D857A] shadow-xs transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#5C5955]" />
            Inspect Sample Entry
          </button>
          <span className="text-xs font-medium text-[#5F735E] bg-[#EEF2ED] px-3 py-1 rounded-full border border-[#B6DBC7]">
            {memories.length} Memories Preserved
          </span>
        </div>
      </div>

      {/* Cards Grid: Accessible native button actions inside semantic article */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {memories.map((mem) => (
          <article
            key={mem.id}
            className="group bg-white rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs hover:shadow-md hover:border-[#8D857A] transition-all flex flex-col justify-between"
          >
            <div>
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
                  <span aria-hidden="true">•</span>
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
                    &ldquo;{mem.ocrSnippet}&rdquo;
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 border-t border-[#E7E2DA] flex items-center justify-between gap-2">
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
              <button
                type="button"
                onClick={(e) => openModal(mem, e.currentTarget)}
                aria-label={`View memory: ${mem.title}`}
                className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold text-[#76556F] hover:bg-[#F4EEF3] focus:outline-none focus:ring-2 focus:ring-[#76556F] transition-colors cursor-pointer shrink-0"
              >
                View →
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* WCAG 2.2 AA Accessible Lightbox Modal (Portaled outside #landing-main-surface so inert does not lock modal) */}
      {activeMediaModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="memoria-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1E]/95 backdrop-blur-md p-4 sm:p-8"
            onClick={closeModal}
          >
          <div
            ref={dialogRef}
            className="relative max-w-4xl w-full bg-[#1A1A1E] text-[#F7F4EE] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
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
                ref={closeBtnRef}
                type="button"
                onClick={closeModal}
                className="absolute top-4 left-4 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white focus:outline-none focus:ring-2 focus:ring-white transition-all cursor-pointer"
                aria-label="Close viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full md:w-80 p-6 bg-[#FFFFFF] text-[#28272A] flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#E7E2DA]">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#76556F]">
                    Archival Entry Details
                  </span>
                  <h3
                    id="memoria-modal-title"
                    className="font-serif text-lg font-bold text-[#20242C] mt-1 leading-snug"
                  >
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
                      &ldquo;{activeMediaModal.ocrSnippet}&rdquo;
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
                  type="button"
                  onClick={closeModal}
                  className="w-full py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#76556F] transition-all cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
