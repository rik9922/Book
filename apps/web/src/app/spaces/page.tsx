"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, FolderPlus, Layers, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  createSpace,
  deleteSpace,
  fetchSpaces,
  getStoredSession,
  MemorySpaceDTO,
  openAuthModal,
  subscribeAuthChange,
  updateSpace,
} from "@/lib/api";

export default function SpacesPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<MemorySpaceDTO["type"]>("family");
  const [newDesc, setNewDesc] = useState("");

  const [editing, setEditing] = useState<MemorySpaceDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<MemorySpaceDTO["type"]>("family");
  const [editDesc, setEditDesc] = useState("");

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memory spaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpaces();
    const unsubscribe = subscribeAuthChange(() => {
      loadSpaces();
    });
    return unsubscribe;
  }, [loadSpaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const created = await createSpace({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        type: newType,
      });
      setSpaces((prev) => [created, ...prev]);
      setNewName("");
      setNewDesc("");
      setNotice(`Created "${created.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create space.");
    }
  };

  const startEdit = (space: MemorySpaceDTO) => {
    setEditing(space);
    setEditName(space.name);
    setEditType(space.type);
    setEditDesc(space.description || "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const updated = await updateSpace(editing.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        type: editType,
      });
      setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditing(null);
      setNotice(`Updated settings for "${updated.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update space.");
    }
  };

  const handleArchive = async (space: MemorySpaceDTO) => {
    setError(null);
    setNotice(null);
    try {
      await deleteSpace(space.id);
      setSpaces((prev) => prev.filter((s) => s.id !== space.id));
      if (editing?.id === space.id) setEditing(null);
      setNotice(`Archived "${space.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive space.");
    }
  };

  return (
    <AppShell
      title="Memory Spaces Directory"
      subtitle="Create, configure, and govern isolated family, personal, event, and journey vaults."
    >
      {!signedIn && !loading ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center max-w-xl mx-auto space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#20242C]">Sign in to manage Memory Spaces</h2>
          <p className="text-xs text-[#5C5955]">Each memory space maintains strict RBAC boundaries and a dedicated 500 MB local quota.</p>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Sign In or Create Account
          </button>
        </div>
      ) : (
        <div className="space-y-8">
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

          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
              Create New Memory Space
            </h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="space-name-input" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Name
                </label>
                <input
                  id="space-name-input"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Summer Heritage Vault"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div>
                <label htmlFor="space-type-input" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Type
                </label>
                <select
                  id="space-type-input"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MemorySpaceDTO["type"])}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                >
                  <option value="family">Family</option>
                  <option value="personal">Personal</option>
                  <option value="event">Event</option>
                  <option value="journey">Journey</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="space-desc-input" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Description
                </label>
                <input
                  id="space-desc-input"
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional dedication"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div className="sm:col-span-4">
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#20242C] text-white text-xs font-semibold"
                >
                  Create Memory Space
                </button>
              </div>
            </form>
          </section>

          {editing && (
            <section className="bg-[#FAF8F4] rounded-2xl border border-[#76556F]/40 p-6 space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#20242C]">
                Edit Space Settings: {editing.name}
              </h2>
              <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="edit-space-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Space Name
                  </label>
                  <input
                    id="edit-space-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="edit-space-type" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Type
                  </label>
                  <select
                    id="edit-space-type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as MemorySpaceDTO["type"])}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E7E2DA] text-xs"
                  >
                    <option value="family">Family</option>
                    <option value="personal">Personal</option>
                    <option value="event">Event</option>
                    <option value="journey">Journey</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-space-desc" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Description
                  </label>
                  <input
                    id="edit-space-desc"
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <button
                    type="submit"
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" aria-hidden="true" />
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-white border border-[#E7E2DA] text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {spaces.map((s) => (
              <article
                key={s.id}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 flex flex-col justify-between gap-4 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EEF2ED] text-[#22593E] text-[10px] font-semibold uppercase">
                      <Layers className="w-3 h-3" aria-hidden="true" />
                      {s.type}
                    </span>
                    <span className="text-[11px] text-[#5C5955]">
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#20242C]">{s.name}</h3>
                  <p className="text-xs text-[#5C5955] leading-relaxed">
                    {s.description || "Private heirloom vault with RBAC isolation."}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F0ECE1] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/spaces/${s.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#76556F] text-white text-xs font-medium"
                    >
                      Open Vault
                    </Link>
                    <Link
                      href="/archive"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F7F4EE] text-xs font-medium text-[#20242C]"
                    >
                      <Archive className="w-3.5 h-3.5 text-[#76556F]" aria-hidden="true" />
                      Timeline
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="px-3 py-1.5 rounded-lg bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                    >
                      Settings
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleArchive(s)}
                    aria-label={`Archive ${s.name}`}
                    className="p-2 rounded-lg bg-[#FDF2F2] text-[#B6423E]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
