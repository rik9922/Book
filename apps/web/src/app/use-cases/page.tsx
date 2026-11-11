import React from "react";
import Link from "next/link";
import { Baby, Compass, Heart, Home, PawPrint, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const USE_CASES = [
  {
    title: "Children Milestones",
    subtitle: "First steps, school drawings, and voice recordings",
    description:
      "Capture year-by-year growth with dedicated child profiles, handwritten artwork scans, and annual hardcover milestone editions.",
    icon: Baby,
    color: "#76556F",
  },
  {
    title: "Family Heritage & Ancestry",
    subtitle: "Multi-generational letters, oral histories & recipes",
    description:
      "Transcribe fragile letters with built-in Tesseract OCR so every surname, town, and date becomes instantly searchable across generations.",
    icon: Home,
    color: "#5F735E",
  },
  {
    title: "Weddings & Anniversaries",
    subtitle: "Collaborative guest stories and vows",
    description:
      "Invite wedding guests or anniversary attendees into an event circle to contribute candid photos and audio toasts into one heirloom volume.",
    icon: Heart,
    color: "#76556F",
  },
  {
    title: "Tribute & Memorial Volumes",
    subtitle: "Quiet, ad-free remembrance archives",
    description:
      "Preserve eulogies, favorite portraits, and family reflections in a respectful, permanent archive free from social-media algorithms.",
    icon: Sparkles,
    color: "#20242C",
  },
  {
    title: "Beloved Pets",
    subtitle: "Dedicated companion profiles and adventures",
    description:
      "Keep every trail walk, adoption anniversary, and playful moment tagged to a dedicated pet profile inside your family space.",
    icon: PawPrint,
    color: "#5F735E",
  },
  {
    title: "Sabbaticals & Journeys",
    subtitle: "Location-indexed travel journals",
    description:
      "Organize postcards, journal entries, and landscape frames chronologically for effortless travelogue book binding.",
    icon: Compass,
    color: "#20242C",
  },
];

export default function UseCasesPage() {
  return (
    <AppShell
      title="Archival Use Cases"
      subtitle="Purpose-built spaces for every chapter worth remembering forever."
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {USE_CASES.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-3 shadow-xs"
              >
                <div
                  className="w-11 h-11 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-center"
                  style={{ color: item.color }}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="font-serif text-xl font-bold text-[#20242C]">{item.title}</h2>
                <p className="text-xs font-medium text-[#76556F]">{item.subtitle}</p>
                <p className="text-xs text-[#5C5955] leading-relaxed">{item.description}</p>
              </article>
            );
          })}
        </div>

        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[#28272A]">
            Choose your starting purpose inside the interactive onboarding flow.
          </p>
          <Link
            href="/onboarding"
            className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-semibold"
          >
            Choose Purpose &amp; Start
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
