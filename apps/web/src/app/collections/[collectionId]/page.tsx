"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  CollectionDTO,
  curateBookMemories,
  fetchSpaces,
  getCollectionDetail,
  getStoredSession,
  MemoryDTO,
  reorderCollectionMemories,
} from "@/lib/api";

export default function CollectionDetailPage() {
  const params = useParams<{ collectionId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const collectionId = params?.collectionId || "";
  const spaceIdParam = sp.get("spaceId") || "";

  const [spaceId, setSpaceId] = useState(spaceIdParam);
  const [collection, setCollection] = useState<(CollectionDTO & { memories: MemoryDTO[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredSession().accessToken) return;
    (async () => {
      try {
        let targetSpace = spaceIdParam;
        if (!targetSpace) {
          const spaces = await fetchSpaces();
          targetSpace = spaces[0]?.id || "";
        }
        if (!targetSpace) return;
        setSpaceId(targetSpace);
        const detail = await getCollectionDetail(targetSpace, collectionId);
        setCollection(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load collection detail.");
      }
    })();
  }, [collectionId, spaceIdParam]);

  const moveMemory = async (index: number, direction: -1 | 1) => {
    if (!collection || !spaceId) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= collection.memories.length) return;
    const next = [...collection.memories];
    const [item] = next.splice(index, 1);
    next.splice(targetIdx, 0, item);
    setCollection({ ...collection, memories: next, memoryIds: next.map((m) => m.id) });
    try {
      await reorderCollectionMemories(spaceId, collection.id, next.map((m) => m.id));
      setNotice("Saved curated collection order.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save order.");
    }
  };

  const handleCreateBookFromCollection = async () => {
    if (!collection || !spaceId) return;
    setBusy(true);
    setError(null);
    try {
      const book = await apiRequest<{ id: string }>("/books", {
        method: "POST",
        body: JSON.stringify({
          spaceId,
          title: collection.title,
          subtitle: collection.description || "Curated from Collection",
          format: "hardcover_standard_8x10",
          coverColor: "#76556F",
          foilStamping: "gold",
        }),
      });
      if (collection.memories.length > 0) {
        await curateBookMemories(
          book.id,
          collection.memories.map((m) => ({
            id: m.id,
            title: m.title,
            content: m.content,
            capturedAt: m.capturedAt,
          }))
        );
      }
      router.push("/studio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create book from collection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title={collection ? collection.title : "Collection Detail"}
      subtitle={collection?.description || "Curate and reorder memories before compiling them into a printed book."}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/collections" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#76556F] hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            All Collections
          </Link>

          {collection && (
            <button
              type="button"
              disabled={busy}
              onClick={handleCreateBookFromCollection}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold disabled:opacity-50"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              {busy ? "Compiling Book..." : "Create Book from Collection"}
            </button>
          )}
        </div>

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

        {!collection ? (
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-8 text-xs text-[#5C5955]">
            Loading collection...
          </div>
        ) : collection.memories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-8 text-xs text-[#5C5955]">
            No memories curated in this collection yet.
          </div>
        ) : (
          <div className="space-y-3">
            {collection.memories.map((m, idx) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-[#E7E2DA] p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <span className="text-[11px] font-mono text-[#76556F]">#{idx + 1}</span>
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">{m.title}</h2>
                  {m.content && <p className="text-xs text-[#5C5955] mt-0.5 line-clamp-2">{m.content}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Move ${m.title} up`}
                    disabled={idx === 0}
                    onClick={() => moveMemory(idx, -1)}
                    className="p-2 rounded-lg bg-[#F7F4EE] border border-[#E7E2DA] disabled:opacity-40"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${m.title} down`}
                    disabled={idx === collection.memories.length - 1}
                    onClick={() => moveMemory(idx, 1)}
                    className="p-2 rounded-lg bg-[#F7F4EE] border border-[#E7E2DA] disabled:opacity-40"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
