"use client";

import dynamic from "next/dynamic";

const ExperienceCanvas = dynamic(
  () => import("@/components/3d/ExperienceCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-2xl border border-[#E7E2DA] flex items-center justify-center bg-[#FFFFFF] shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#76556F] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-serif text-[#20242C]">
            Opening Memoria 3D Archival Reader...
          </p>
        </div>
      </div>
    ),
  }
);

export function ClientStudioMount({
  bookId = "sample",
  refreshKey = 0,
}: {
  bookId?: string;
  refreshKey?: string | number;
}) {
  return <ExperienceCanvas bookId={bookId} refreshKey={refreshKey} />;
}
