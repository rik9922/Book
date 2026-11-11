"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthFlowPanel } from "@/components/AuthFlowPanel";

function ResetPasswordContent() {
  const sp = useSearchParams();
  return <AuthFlowPanel initialMode="reset" initialToken={sp.get("token") || ""} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F4EE]" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
