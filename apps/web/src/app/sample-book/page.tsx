import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ClientStudioMount } from "@/components/3d/ClientStudioMount";

export default function SampleBookPage() {
  return (
    <AppShell
      title="Interactive Sample 3D Heirloom Book"
      subtitle="Open the French-morocco cover, turn pages with realistic conical curl, test camera presets, or switch to the Accessible 2D Proof Reader."
    >
      <div className="space-y-6">
        <ClientStudioMount bookId="sample" />

        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#20242C]">
              Ready to bind your own family edition?
            </h2>
            <p className="text-xs text-[#5C5955] mt-0.5">
              Sign in and open Memoria Author Studio to write manuscripts, curate Memory Archive photo books, customize covers, run preflight, and order hardcover prints.
            </p>
          </div>
          <Link
            href="/author"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold"
          >
            Open Author Studio
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
