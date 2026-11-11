"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthFlowPanel, AuthMode } from "@/components/AuthFlowPanel";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as AuthMode) || "login";
  const safeMode: AuthMode = ["login", "register", "forgot", "reset", "verify"].includes(initialMode)
    ? initialMode
    : "login";
  return <AuthFlowPanel initialMode={safeMode} initialToken={searchParams.get("token") || ""} />;
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F4EE] flex items-center justify-center text-sm text-[#5C5955]">
          Loading Memoria authentication...
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
