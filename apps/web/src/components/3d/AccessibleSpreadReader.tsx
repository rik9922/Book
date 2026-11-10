"use client";

import React from "react";
import { BookOpen, ChevronLeft, ChevronRight, Eye, MapPin, Calendar, Quote } from "lucide-react";
import type { BookSpreadPreview } from "@memory-capsule/contracts/book-3d";

interface AccessibleSpreadReaderProps {
  title: string;
  subtitle: string;
  coverHex: string;
  foilHex: string;
  spreads: readonly BookSpreadPreview[];
  currentSpreadIndex: number;
  onChangeSpread: (nextIndex: number) => void;
  onSwitchTo3D?: () => void;
  fallbackReason?: string | null;
}

export function AccessibleSpreadReader({
  title,
  subtitle,
  coverHex,
  foilHex,
  spreads,
  currentSpreadIndex,
  onChangeSpread,
  onSwitchTo3D,
  fallbackReason,
}: AccessibleSpreadReaderProps) {
  const safeIndex = Math.max(0, Math.min(spreads.length - 1, currentSpreadIndex));
  const spread = spreads[safeIndex];

  return (
    <div
      className="flex flex-col justify-between h-full min-h-[480px] md:min-h-[640px] p-5 sm:p-8 bg-[#F7F4EE] text-[#28272A]"
      role="region"
      aria-label="Accessible 2D Archival Book Spread Reader"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E7E2DA]">
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-10 rounded-sm border border-black/15 shrink-0"
            style={{ backgroundColor: coverHex, boxShadow: `inset 0 0 0 1px ${foilHex}55` }}
            aria-hidden="true"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#76556F]">
              {spread.chapterTitle}
            </p>
            <h4 className="font-serif text-lg font-bold text-[#20242C]">{title}</h4>
            <p className="text-xs text-[#5C5955]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E7E2DA] text-xs font-medium text-[#20242C]">
            Pages {spread.leftPageNumber}–{spread.rightPageNumber} of {spreads.length * 2}
          </span>
          {onSwitchTo3D && (
            <button
              type="button"
              onClick={onSwitchTo3D}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Return to 3D View
            </button>
          )}
        </div>
      </div>

      {fallbackReason && (
        <div
          role="status"
          className="my-3 px-4 py-2.5 rounded-xl bg-[#FDF5E6] border border-[#F2D8A7] text-xs text-[#85530E]"
        >
          {fallbackReason}
        </div>
      )}

      {/* Two-Page Archival Spread */}
      <div className="my-4 flex-1 grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-[#E7E2DA] bg-white shadow-md">
        {/* Left Page */}
        <article className="p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E7E2DA] bg-[#FCFBF8]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C5955]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#76556F]" />
                {spread.leftDate}
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#5F735E]" />
                {spread.leftLocation}
              </span>
            </div>
            <h5 className="font-serif text-xl sm:text-2xl font-bold text-[#20242C] leading-snug">
              {spread.leftHeading}
            </h5>
            <p className="text-sm text-[#28272A] leading-relaxed">{spread.leftBody}</p>
          </div>
          <div className="pt-6 text-[11px] font-mono text-[#78736E] flex items-center justify-between">
            <span>{title}</span>
            <span>p. {spread.leftPageNumber}</span>
          </div>
        </article>

        {/* Right Page */}
        <article className="p-6 sm:p-8 flex flex-col justify-between bg-[#FFFFFF]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C5955]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#76556F]" />
                {spread.rightDate}
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#5F735E]" />
                {spread.rightLocation}
              </span>
            </div>
            <h5 className="font-serif text-xl sm:text-2xl font-bold text-[#20242C] leading-snug">
              {spread.rightHeading}
            </h5>
            <p className="text-sm text-[#28272A] leading-relaxed">{spread.rightBody}</p>

            {spread.ocrInscription && (
              <blockquote className="mt-4 p-4 rounded-xl bg-[#F0ECE1]/70 border border-[#E7E2DA] text-xs text-[#20242C] italic flex gap-2.5">
                <Quote className="w-4 h-4 text-[#76556F] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="not-italic block text-[10px] font-semibold uppercase tracking-wider text-[#76556F] mb-1">
                    Archival Inscription
                  </span>
                  &ldquo;{spread.ocrInscription}&rdquo;
                </div>
              </blockquote>
            )}
          </div>
          <div className="pt-6 text-[11px] font-mono text-[#78736E] flex items-center justify-between">
            <span>Living Archive Print Proof</span>
            <span>p. {spread.rightPageNumber}</span>
          </div>
        </article>
      </div>

      {/* Spread Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => onChangeSpread(Math.max(0, safeIndex - 1))}
          disabled={safeIndex === 0}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#8D857A] bg-white text-xs font-semibold text-[#20242C] disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[#F0ECE1] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Spread
        </button>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Select book spread">
          {spreads.map((item, idx) => (
            <button
              key={item.spreadIndex}
              type="button"
              role="tab"
              aria-selected={idx === safeIndex}
              aria-label={`Spread ${idx + 1}: ${item.chapterTitle}`}
              onClick={() => onChangeSpread(idx)}
              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                idx === safeIndex
                  ? "bg-[#76556F] text-white border-[#76556F]"
                  : "bg-white text-[#28272A] border-[#E7E2DA] hover:border-[#8D857A]"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onChangeSpread(Math.min(spreads.length - 1, safeIndex + 1))}
          disabled={safeIndex >= spreads.length - 1}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          Next Spread
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
