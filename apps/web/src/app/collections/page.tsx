"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  addMemoryToCollection,
  apiRequest,
  CollectionDTO,
  createCollection,
  deleteCollection,
  fetchSpaces,
  getStoredSession,
  listCollections,
  MemoryDTO,
  MemorySpaceDTO,
  removeMemoryFromCollection,
} from "@/lib/api";

export default function CollectionsPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [collections, setCollections] = useState<CollectionDTO[]>([]);
  const [memories, setMemories] = useState<MemoryDTO[]>([]);
  const [activeCollection, setActiveCollection] = useState<CollectionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memoryToAdd, setMemoryToAdd] = useState("");

  const loadData = useCallback(async (targetSpaceId: string) => {
    if (!targetSpaceId) return;
    try {
      const [cols, memRes] = await Promise.all([
        listCollections(targetSpaceId),
        apiRequest<{ items?: MemoryDTO[] } | MemoryDTO[]>(`/spaces/${targetSpaceId}/memories?limit=50`),
      ]);
      const memList = Array.isArray(memRes) ? memRes : memRes.items || [];
      setCollections(cols);
      setMemories(memList);
      setActiveCollection(cols[0] || null);
      if (memList.length > 0) setMemoryToAdd(memList[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collections.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const session = getStoredSession();
      if (!session.accessToken) {
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
          await loadData(list[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize collections.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !title.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const created = await createCollection(spaceId, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setCollections((prev) => [created, ...prev]);
      setActiveCollection(created);
      setTitle("");
      setDescription("");
      setNotice(`Created collection "${created.title}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection.");
    }
  };

  const handleAddMemory = async () => {
    if (!spaceId || !activeCollection || !memoryToAdd) return;
    setError(null);
    try {
      const updated = await addMemoryToCollection(spaceId, activeCollection.id, memoryToAdd);
      setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setActiveCollection(updated);
      setNotice("Added memory to collection.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add memory.");
    }
  };

  const handleRemoveMemory = async (memId: string) => {
    if (!spaceId || !activeCollection) return;
    setError(null);
    try {
      await removeMemoryFromCollection(spaceId, activeCollection.id, memId);
      const updatedIds = (activeCollection.memoryIds || []).filter((id) => id !== memId);
      const updated = { ...activeCollection, memoryIds: updatedIds };
      setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setActiveCollection(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove memory.");
    }
  };

  const handleDeleteCollection = async (col: CollectionDTO) => {
    if (!spaceId) return;
    setError(null);
    try {
      await deleteCollection(spaceId, col.id);
      const next = collections.filter((c) => c.id !== col.id);
      setCollections(next);
      setActiveCollection(next[0] || null);
      setNotice(`Deleted collection "${col.title}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection.");
    }
  };

  const curatedMemories = (activeCollection?.memoryIds || [])
    .map((id) => memories.find((m) => m.id === id))
    .filter((m): m is MemoryDTO => Boolean(m));

  return (
    <AppShell
      title="Curated Memory Collections"
      subtitle="Group meaningful moments into themed chapters such as 'Summer at the Lake' or 'Year One'."
    >
      {!signedIn && !loading ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center max-w-xl mx-auto space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#20242C]">Sign in to curate Collections</h2>
          <Link
            href="/auth"
            className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
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

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 flex items-center gap-3">
            <label htmlFor="col-space-select" className="text-xs font-semibold text-[#20242C]">
              Space:
            </label>
            <select
              id="col-space-select"
              value={spaceId}
              onChange={(e) => {
                setSpaceId(e.target.value);
                loadData(e.target.value);
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  New Collection
                </h2>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label htmlFor="col-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Title
                    </label>
                    <input
                      id="col-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Summer at Lake Como"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="col-desc" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Description
                    </label>
                    <textarea
                      id="col-desc"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="All stories and portraits from the 1978 gathering"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
                  >
                    Create Collection
                  </button>
                </form>
              </section>

              <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
                  Collections ({collections.length})
                </h2>
                {collections.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">No collections yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {collections.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setActiveCollection(c)}
                          className={`w-full text-left p-3 rounded-xl border ${
                            activeCollection?.id === c.id
                              ? "bg-[#FAF6F8] border-[#76556F]"
                              : "bg-[#F7F4EE] border-[#E7E2DA]"
                          }`}
                        >
                          <p className="font-serif text-sm font-bold text-[#20242C]">{c.title}</p>
                          <p className="text-[11px] text-[#5C5955]">
                            {(c.memoryIds || []).length} curated memories
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-5">
              {activeCollection ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-[#20242C]">{activeCollection.title}</h2>
                      <p className="text-xs text-[#5C5955] mt-1">
                        {activeCollection.description || "Curated chapter grouping."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/collections/${activeCollection.id}?spaceId=${encodeURIComponent(spaceId)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#76556F] text-white text-xs font-medium"
                      >
                        Curate &amp; Order
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(activeCollection)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FDF2F2] text-xs font-medium text-[#B6423E]"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {memories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F0ECE1]">
                      <label htmlFor="add-mem-select" className="sr-only">
                        Select memory to add
                      </label>
                      <select
                        id="add-mem-select"
                        value={memoryToAdd}
                        onChange={(e) => setMemoryToAdd(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                      >
                        {memories.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddMemory}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-[#20242C] text-white text-xs font-medium"
                      >
                        Add to Collection
                      </button>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {curatedMemories.length === 0 ? (
                      <p className="text-xs text-[#5C5955]">No memories added to this collection yet.</p>
                    ) : (
                      curatedMemories.map((m) => (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between gap-3"
                        >
                          <div className="text-xs">
                            <p className="font-semibold text-[#20242C]">{m.title}</p>
                            <p className="text-[#5C5955] line-clamp-1">{m.content}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMemory(m.id)}
                            aria-label={`Remove ${m.title} from collection`}
                            className="p-1.5 rounded-lg bg-white border border-[#E7E2DA] text-[#5C5955]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[#5C5955]">Create or select a collection to organize memories.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
