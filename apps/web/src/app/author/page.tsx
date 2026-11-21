"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AuthorStudioWorkspace } from "@/components/author/AuthorStudioWorkspace";

function AuthorStudioContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") || undefined;
  return <AuthorStudioWorkspace initialBookId={bookId} />;
}

export default function AuthorStudioPage() {
  return (
    <AppShell
      title="Author Studio"
      subtitle="Write, structure, format, preview in 3D, and publish heirloom manuscripts."
    >
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-12 text-center text-sm font-serif text-[#20242C]">
            Loading Memoria Author Studio…
          </div>
        }
      >
        <AuthorStudioContent />
      </Suspense>
    </AppShell>
  );
}
