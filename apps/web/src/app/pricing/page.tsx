import React from "react";
import Link from "next/link";
import { CheckCircle2, HardDrive, Lock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default function PricingPage() {
  return (
    <AppShell
      title="Zero-Budget Principles & Print Transparency"
      subtitle="Memoria is built on an absolute $0 cloud-subscription policy. Your family archive belongs to you—never behind a recurring paywall."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2ED] border border-[#B6DBC7] text-xs font-semibold text-[#22593E]">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Digital Archive • $0 Forever
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#20242C]">
            Local-First Self-Hosted Vault
          </h2>
          <p className="text-sm text-[#5C5955] leading-relaxed">
            Runs on PostgreSQL 17, Redis, NATS JetStream, and LocalDiskStorageDriver with zero credit-card cloud dependencies.
          </p>
          <ul className="space-y-2.5 text-xs text-[#28272A]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
              500 MB atomic quota per free memory space (50 MB per original file)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
              SHA-256 cryptographic verification &amp; lossless WebP derivatives
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
              One-click portable JSON archive export &amp; pg_dump backups
            </li>
          </ul>
          <Link
            href="/onboarding"
            className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#20242C] text-white text-xs font-semibold"
          >
            Start Free Family Vault
          </Link>
        </section>

        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6F8] border border-[#76556F]/30 text-xs font-semibold text-[#76556F]">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Physical Printing • Zero Markup
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#20242C]">
            Pass-Through Heirloom Press
          </h2>
          <p className="text-sm text-[#5C5955] leading-relaxed">
            Pay only physical paper, binding, and carrier shipping when you freeze an edition for print.
          </p>
          <div className="space-y-2 text-xs text-[#28272A]">
            <div className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between">
              <span>Square 8×8&quot; Linen Hardcover (140gsm Matte)</span>
              <span className="font-mono font-semibold">$42.00</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between">
              <span>Standard 8×10&quot; Linen Hardcover (170gsm Lustre)</span>
              <span className="font-mono font-semibold">$52.00</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between">
              <span>Grand 12×12&quot; French-Morocco Leather</span>
              <span className="font-mono font-semibold">$88.00</span>
            </div>
          </div>
          <Link
            href="/billing"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
          >
            <HardDrive className="w-4 h-4" aria-hidden="true" />
            Open Print Estimator &amp; Billing
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
