"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { verifyShareLink } from "@/lib/api";

export default function SharedSpaceViewerPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [passphrase, setPassphrase] = useState("");
  const [verified, setVerified] = useState<{ spaceId: string; allowDownloads: boolean; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await verifyShareLink(token, passphrase.trim() || undefined);
      setVerified(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid passphrase or expired share link.");
    }
  };

  return (
    <AppShell
      title="Shared Family Heirloom"
      subtitle="Enter the family passphrase if required to unlock this read-only archive edition."
    >
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-[#E7E2DA] p-8 space-y-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-[#76556F]" aria-hidden="true" />
          <div>
            <h2 className="font-serif text-xl font-bold text-[#20242C]">Restricted Archive Link</h2>
            <p className="text-[11px] font-mono text-[#5C5955] break-all">{token}</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
            {error}
          </div>
        )}

        {verified ? (
          <div className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B] space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Access verified for Space {verified.spaceId.slice(0, 8)}
            </div>
            <p>Downloads permitted: {verified.allowDownloads ? "Yes" : "Read-only viewing"}</p>
            <p>Link expires: {new Date(verified.expiresAt).toLocaleString()}</p>
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-3">
            <div>
              <label htmlFor="share-passphrase" className="block text-xs font-semibold text-[#20242C] mb-1">
                Passphrase (leave blank if public link)
              </label>
              <input
                id="share-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter family passphrase"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
              />
            </div>
            <button type="submit" className="min-h-[44px] w-full py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold">
              Unlock Shared Archive
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
