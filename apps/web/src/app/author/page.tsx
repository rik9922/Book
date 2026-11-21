"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AuthorStudioWorkspace } from "@/components/author/AuthorStudioWorkspace";
import { mapLegacyStudioTabToEnvironment } from "@/lib/author-spread-utils";

function AuthorStudioContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId") || undefined;
  const spaceId = searchParams.get("spaceId") || undefined;
  const initialEnv =
    mapLegacyStudioTabToEnvironment(searchParams.get("env") || searchParams.get("tab")) || undefined;
  return (
    <AuthorStudioWorkspace
      initialBookId={bookId}
      initialSpaceId={spaceId}
      initialEnvironment={initialEnv}
    />
  );
}

export default function AuthorStudioPage() {
  return (
    <AppShell
      title="Author Studio"
      subtitle="Write manuscripts, curate Memory Archive photo books, design heirloom covers, preview in 3D Book Theater, and publish."
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
