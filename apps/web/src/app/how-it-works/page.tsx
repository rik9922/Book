import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Camera, Printer, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const STEPS = [
  {
    step: "01",
    title: "Archive Without Loss",
    description:
      "Upload family photographs, handwritten letters, voice notes, and documents. Originals stay bit-exact with SHA-256 checksums on local-first storage while Tesseract OCR indexes handwritten and printed text.",
    icon: Camera,
    href: "/archive",
    cta: "Open Living Archive",
  },
  {
    step: "02",
    title: "Collaborate Across Generations",
    description:
      "Invite grandparents, siblings, and cousins into private Family Circles with fine-grained Owner, Admin, Contributor, and Viewer permissions.",
    icon: Users,
    href: "/circles",
    cta: "Explore Family Circles",
  },
  {
    step: "03",
    title: "Author in the 3D Heirloom Studio",
    description:
      "Curate chronological chapters, customize French-morocco leather or cloth bindings and hot-foil stamping, and inspect real-time page turns in WebGL 3D or iOS RealityKit.",
    icon: BookOpen,
    href: "/sample-book",
    cta: "Try Sample 3D Book",
  },
  {
    step: "04",
    title: "Freeze & Print at Zero Markup",
    description:
      "Run automated trim, bleed, and 300 DPI preflight checks, freeze an immutable SHA-256 edition hash, and order physical hardcover keepsakes at cost.",
    icon: Printer,
    href: "/billing",
    cta: "View Print Options",
  },
];

export default function HowItWorksPage() {
  return (
    <AppShell
      title="How Memoria Works"
      subtitle="From fragile shoeboxes and voice memos to cryptographically verified digital vaults and tactile hardcover heirlooms."
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <section
                key={item.step}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 flex flex-col justify-between gap-4 shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#76556F]">STEP {item.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-center text-[#76556F]">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#20242C]">{item.title}</h2>
                  <p className="text-sm text-[#5C5955] leading-relaxed">{item.description}</p>
                </div>
                <div>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#76556F] hover:underline min-h-[44px]"
                  >
                    {item.cta}
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </section>
            );
          })}
        </div>

        <div className="bg-[#F0ECE1] rounded-2xl border border-[#E7E2DA] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#20242C]">Ready to begin your archive?</h2>
            <p className="text-xs text-[#5C5955] mt-1">
              Follow the 5-step guided setup wizard to create your first family space and invite relatives.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-[#FFFFFF] text-xs font-semibold"
          >
            Start Guided Onboarding
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
