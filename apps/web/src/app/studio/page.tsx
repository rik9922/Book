"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { mapLegacyStudioTabToEnvironment } from "@/lib/author-spread-utils";

function LegacyStudioRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const targetHref = React.useMemo(() => {
    const params = new URLSearchParams();
    const bookId = searchParams.get("bookId") || searchParams.get("id");
    const spaceId = searchParams.get("spaceId");
    const mappedEnv = mapLegacyStudioTabToEnvironment(
      searchParams.get("env") || searchParams.get("tab")
    );
    if (bookId) params.set("bookId", bookId);
    if (spaceId) params.set("spaceId", spaceId);
    if (mappedEnv) params.set("env", mappedEnv);
    const qs = params.toString();
    return qs ? `/author?${qs}` : "/author";
  }, [searchParams]);

  useEffect(() => {
    router.replace(targetHref);
  }, [router, targetHref]);

  return (
    <div
      data-testid="legacy-studio-redirect"
      className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-10 text-center space-y-4 max-w-xl mx-auto"
    >
      <div className="w-8 h-8 border-2 border-[#76556F] border-t-transparent rounded-full animate-spin mx-auto" />
      <h2 className="font-serif text-xl font-semibold text-[#20242C]">
        Opening Memoria Author Studio…
      </h2>
      <p className="text-xs text-[#5C5955] leading-relaxed">
        All book creation, Photo-Led Memory Books, cover binding, spread composition, 3D Book
        Theater, and print publishing now live in one unified <strong>Author Studio</strong>.
      </p>
      <Link
        href={targetHref}
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#64465E] text-white text-xs font-semibold transition-colors"
      >
        Continue to Author Studio →
      </Link>
    </div>
  );
}

export default function LegacyStudioCompatibilityRedirectPage() {
  return (
    <AppShell
      title="Author Studio"
      subtitle="Redirecting legacy Book Studio link to the unified Memoria Author Studio."
    >
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-10 text-center text-sm font-serif text-[#20242C]">
            Redirecting to Memoria Author Studio…
          </div>
        }
      >
        <LegacyStudioRedirectInner />
      </Suspense>
    </AppShell>
  );
}
