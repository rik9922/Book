"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  fetchSpaces,
  getStoredSession,
  listTrashMemories,
  MemoryDTO,
  MemorySpaceDTO,
  permanentlyDeleteMemory,
  restoreMemory,
} from "@/lib/api";

export default function TrashPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [trashed, setTrashed] = useState<MemoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadTrash = useCallback(async (targetSpaceId: string) => {
    if (!targetSpaceId) return;
    try {
      const items = await listTrashMemories(targetSpaceId);
      setTrashed(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trash.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!getStoredSession().accessToken) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      try {
        const list = await fetchSpaces();
        setSpaces(list);
        if (list.length > 0) {
          setSpaceId(list[0].id);
          await loadTrash(list[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load spaces.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadTrash]);

  const handleRestore = async (mem: MemoryDTO) => {
    setError(null);
    setNotice(null);
    try {
      await restoreMemory(mem.id);
      setTrashed((prev) => prev.filter((m) => m.id !== mem.id));
      setNotice(`Restored "${mem.title}" back into your Living Archive.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    }
  };

  const handlePermanentDelete = async (mem: MemoryDTO) => {
    setError(null);
    setNotice(null);
    try {
      await permanentlyDeleteMemory(mem.id);
      setTrashed((prev) => prev.filter((m) => m.id !== mem.id));
      setNotice(`Permanently removed "${mem.title}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permanent deletion failed.");
    }
  };

  return (
    <AppShell
      title="Trash & 30-Day Recovery"
      subtitle="Restore soft-deleted memories back into your timeline or permanently purge items."
    >
      {!signedIn && !loading ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center max-w-xl mx-auto space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#20242C]">Sign in to view Trash</h2>
          <Link
            href="/auth"
            className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <div className="max-w-4xl space-y-6">
          {error && (
            <div role="alert" className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B]">
              {notice}
            </div>
          )}

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="trash-space-select" className="text-xs font-semibold text-[#20242C]">
                Memory Space:
              </label>
              <select
                id="trash-space-select"
                value={spaceId}
                onChange={(e) => {
                  setSpaceId(e.target.value);
                  loadTrash(e.target.value);
                }}
                className="px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Link href="/archive" className="text-xs font-medium text-[#76556F] hover:underline">
              Back to Archive
            </Link>
          </div>

          {trashed.length === 0 ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-10 text-center text-xs text-[#5C5955]">
              <Trash2 className="w-6 h-6 mx-auto text-[#8D857A] mb-2" aria-hidden="true" />
              No soft-deleted memories in this space.
            </div>
          ) : (
            <ul className="space-y-3">
              {trashed.map((m) => (
                <li
                  key={m.id}
                  className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#76556F]">
                      {m.format} • {new Date(m.capturedAt).toLocaleDateString()}
                    </span>
                    <h2 className="font-serif text-lg font-bold text-[#20242C]">{m.title}</h2>
                    {m.content && <p className="text-xs text-[#5C5955] line-clamp-2">{m.content}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestore(m)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EEF2ED] text-[#22593E] border border-[#B6DBC7] text-xs font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(m)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FDF2F2] text-[#B6423E] text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Purge
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AppShell>
  );
}
