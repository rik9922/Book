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
  const [verified, setVerified] = useState<{
    spaceId: string;
    allowDownloads: boolean;
    expiresAt: string;
    space?: { id: string; name: string; description?: string; type: string } | null;
    memories?: Array<{ id: string; title: string; content?: string; format: string; location?: string; capturedAt: string }>;
  } | null>(null);
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
      title={verified?.space?.name || "Shared Family Heirloom"}
      subtitle={
        verified?.space?.description ||
        "Enter the family passphrase if required to unlock this read-only archive edition."
      }
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-[#E7E2DA] p-8 space-y-5 shadow-xs">
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
            <div className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Access verified for {verified.space?.name || `Space ${verified.spaceId.slice(0, 8)}`}
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

        {verified && (
          <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C]">
              Shared Family Stories ({verified.memories?.length || 0})
            </h2>
            {!verified.memories || verified.memories.length === 0 ? (
              <p className="text-xs text-[#5C5955]">This shared heirloom archive does not have public stories yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verified.memories.map((m) => (
                  <article key={m.id} className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#76556F] uppercase font-semibold">
                      <span>{m.format}</span>
                      <span>{new Date(m.capturedAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-serif text-base font-bold text-[#20242C]">{m.title}</h3>
                    {m.content && <p className="text-xs text-[#28272A] leading-relaxed">{m.content}</p>}
                    {m.location && <p className="text-[11px] text-[#5C5955]">{m.location}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
