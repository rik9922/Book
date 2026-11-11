"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthFlowPanel } from "@/components/AuthFlowPanel";

function VerifyEmailContent() {
  const sp = useSearchParams();
  return <AuthFlowPanel initialMode="verify" initialToken={sp.get("token") || ""} />;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F4EE]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
