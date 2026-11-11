"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, MailPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiRequest, getStoredSession } from "@/lib/api";

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token || "";
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getStoredSession().accessToken));
  }, []);

  const handleAccept = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/collab/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invitation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Family Circle Invitation"
      subtitle="Join a private generational memory space curated by your family."
    >
      <div className="max-w-xl mx-auto bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 space-y-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FAF6F8] border border-[#E7E2DA] flex items-center justify-center">
            <MailPlus className="w-5 h-5 text-[#76556F]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#20242C]">
              Invitation Token Ready
            </h2>
            <p className="text-xs font-mono text-[#5C5955] break-all">{token}</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
            {error}
          </div>
        )}

        {accepted ? (
          <div className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B] space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Invitation accepted! You are now a member of this Memory Space.
            </div>
            <button
              type="button"
              onClick={() => router.push("/circles")}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#20242C] text-white text-xs font-semibold"
            >
              Open Family Circles
            </button>
          </div>
        ) : !signedIn ? (
          <div className="space-y-3 text-xs text-[#5C5955]">
            <p>Sign in or register first so your membership is bound securely to your account.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#20242C] text-white font-semibold">
                Sign In
              </Link>
              <Link href="/register" className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] text-white font-semibold">
                Create Account
              </Link>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={handleAccept}
            className="min-h-[44px] w-full py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold disabled:opacity-50"
          >
            {busy ? "Accepting Invitation..." : "Accept & Join Memory Space"}
          </button>
        )}
      </div>
    </AppShell>
  );
}
