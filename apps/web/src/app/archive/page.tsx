"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Calendar,
  Heart,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  addMemoryComment,
  apiRequest,
  deleteMemoryComment,
  enqueueOfflineMutation,
  getStoredSession,
  listMemoryComments,
  MemoryCommentDTO,
  MemoryDTO,
  MemorySpaceDTO,
  uploadFileToMediaService,
} from "@/lib/api";

type ViewMode = "grid" | "timeline" | "calendar" | "favorites";

export default function ArchivePage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [memories, setMemories] = useState<MemoryDTO[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [ocrResults, setOcrResults] = useState<Array<{ mediaId: string; extractedText: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create Memory form state
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<MemoryDTO["format"]>("story");
  const [location, setLocation] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Accessible Modal Detail state
  const [activeMemory, setActiveMemory] = useState<MemoryDTO | null>(null);
  const [comments, setComments] = useState<MemoryCommentDTO[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalDialogRef = useRef<HTMLDivElement | null>(null);
  const archiveSurfaceRef = useRef<HTMLDivElement | null>(null);

  const loadMemories = useCallback(async (targetSpaceId: string, onlyFavorites = false) => {
    if (!targetSpaceId) return;
    try {
      const qs = onlyFavorites ? "?limit=50&isFavorite=true" : "?limit=50";
      const data = await apiRequest<{ items?: MemoryDTO[] } | MemoryDTO[]>(
        `/spaces/${targetSpaceId}/memories${qs}`
      );
      setMemories(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load memories.");
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
        const res = await apiRequest<{ spaces?: MemorySpaceDTO[]; items?: MemorySpaceDTO[] } | MemorySpaceDTO[]>(
          "/spaces"
        );
        const list = Array.isArray(res) ? res : res.spaces || res.items || [];
        setSpaces(list);
        if (list.length > 0) {
          setSpaceId(list[0].id);
          await loadMemories(list[0].id, false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize archive.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadMemories]);

  // Modal Escape key, Tab focus trap & inert background (WCAG 2.2 AA)
  useEffect(() => {
    if (!activeMemory) {
      setComments([]);
      return;
    }
    listMemoryComments(activeMemory.id)
      .then((list) => setComments(list))
      .catch(() => setComments([]));
    const shellRoot = document.getElementById("app-shell-root");
    const surface = archiveSurfaceRef.current;
    shellRoot?.setAttribute("inert", "");
    surface?.setAttribute("inert", "");
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setActiveMemory(null);
        lastTriggerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && modalDialogRef.current) {
        const focusables = modalDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      shellRoot?.removeAttribute("inert");
      surface?.removeAttribute("inert");
    };
  }, [activeMemory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId) return;
    setError(null);
    setOcrResults([]);
    if (!searchQuery.trim()) {
      await loadMemories(spaceId, viewMode === "favorites");
      return;
    }

    try {
      const [memRes, ocrRes] = await Promise.allSettled([
        apiRequest<{ items?: MemoryDTO[] } | MemoryDTO[]>(
          `/spaces/${spaceId}/memories/search?q=${encodeURIComponent(searchQuery.trim())}`
        ),
        apiRequest<
          | Array<{ mediaId: string; extractedText: string }>
          | { results?: Array<{ mediaId: string; extractedText: string }> }
        >(
          `/media/ocr/search?q=${encodeURIComponent(searchQuery.trim())}&spaceId=${spaceId}`
        ),
      ]);

      if (memRes.status === "fulfilled") {
        const val = memRes.value;
        setMemories(Array.isArray(val) ? val : val.items || []);
      }
      if (ocrRes.status === "fulfilled") {
        const ocrVal = ocrRes.value;
        setOcrResults(Array.isArray(ocrVal) ? ocrVal : ocrVal.results || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const mediaIds: string[] = [];
      let effectiveFormat = format;
      if (selectedFile) {
        const uploaded = await uploadFileToMediaService(spaceId, selectedFile);
        mediaIds.push(uploaded.mediaId);
        if (effectiveFormat === "story") {
          effectiveFormat = selectedFile.type.startsWith("audio/") ? "audio" : "image";
        }
      }

      const payload = {
        spaceId,
        title: title.trim(),
        content: content.trim() || undefined,
        format: effectiveFormat,
        capturedAt: new Date().toISOString(),
        location: location.trim() || undefined,
        tags,
        mediaIds,
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueOfflineMutation("/memories", "POST", payload);
        setNotice("Offline: Memory queued safely for sync when your connection returns.");
      } else {
        const created = await apiRequest<MemoryDTO>("/memories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMemories((prev) => [created, ...prev]);
        setNotice("Memory archived and encrypted in your vault.");
      }

      setTitle("");
      setContent("");
      setLocation("");
      setTagsText("");
      setSelectedFile(null);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save memory.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFavorite = async (mem: MemoryDTO) => {
    try {
      const updated = await apiRequest<MemoryDTO>(`/memories/${mem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: !mem.isFavorite }),
      });
      setMemories((prev) => prev.map((m) => (m.id === mem.id ? updated : m)));
      if (activeMemory?.id === mem.id) {
        setActiveMemory(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update favorite status.");
    }
  };

  const handleDeleteMemory = async (mem: MemoryDTO) => {
    try {
      await apiRequest(`/memories/${mem.id}`, { method: "DELETE" });
      setMemories((prev) => prev.filter((m) => m.id !== mem.id));
      setActiveMemory(null);
      setNotice("Moved memory to Trash (recoverable for 30 days at /trash).");
      lastTriggerRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete memory.");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMemory || !commentBody.trim()) return;
    try {
      const user = getStoredSession().user;
      const created = await addMemoryComment(
        activeMemory.id,
        commentBody.trim(),
        user?.fullName || "Family Member"
      );
      setComments((prev) => [...prev, created]);
      setCommentBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post annotation.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activeMemory) return;
    try {
      await deleteMemoryComment(activeMemory.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete annotation.");
    }
  };

  const displayedMemories =
    viewMode === "favorites" ? memories.filter((m) => m.isFavorite) : memories;

  return (
    <AppShell
      title="Living Memory Archive"
      subtitle="Browse heirloom stories, scanned letters (OCR), voice notes, and photographs."
    >
      <div ref={archiveSurfaceRef}>
      {!signedIn && !loading ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center">
          <p className="text-sm text-[#5C5955] mb-4">Sign in to browse or add memories.</p>
          <Link
            href="/auth"
            className="inline-flex px-5 py-2.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-sm font-medium"
          >
            Go to Sign In
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls Toolbar */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label htmlFor="archive-space" className="sr-only">
                  Select Space
                </label>
                <select
                  id="archive-space"
                  value={spaceId}
                  onChange={(e) => {
                    setSpaceId(e.target.value);
                    loadMemories(e.target.value, viewMode === "favorites");
                  }}
                  className="px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-medium text-[#20242C]"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div role="tablist" aria-label="Archive display view" className="flex items-center gap-1">
                {(
                  [
                    { id: "grid", label: "Grid", icon: LayoutGrid },
                    { id: "timeline", label: "Timeline", icon: List },
                    { id: "calendar", label: "By Year", icon: Calendar },
                    { id: "favorites", label: "Favorites", icon: Heart },
                  ] as const
                ).map((mode) => {
                  const Icon = mode.icon;
                  const active = viewMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setViewMode(mode.id);
                        loadMemories(spaceId, mode.id === "favorites");
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        active
                          ? "bg-[#20242C] text-[#FFFFFF]"
                          : "bg-[#F7F4EE] text-[#28272A] hover:bg-[#E7E2DA]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <label htmlFor="archive-search" className="sr-only">
                  Search archive and scanned OCR text
                </label>
                <div className="relative">
                  <Search
                    className="w-3.5 h-3.5 text-[#8D857A] absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="archive-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stories & OCR text..."
                    className="pl-8 pr-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C] w-56"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C] hover:bg-[#E7E2DA]"
                >
                  Search
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#76556F] text-[#FFFFFF] text-xs font-medium hover:bg-[#62455B]"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Preserve Memory
              </button>
            </div>
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

          {/* Create Memory Composer */}
          {showCreate && (
            <form
              onSubmit={handleCreateMemory}
              className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-[#20242C]">Preserve New Memory</h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  aria-label="Close memory composer"
                  className="p-1.5 rounded-lg text-[#5C5955] hover:bg-[#F0ECE1]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mem-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Title
                  </label>
                  <input
                    id="mem-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summer at Lake Como"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="mem-format" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Format
                  </label>
                  <select
                    id="mem-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as MemoryDTO["format"])}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  >
                    <option value="story">Story / Reflection</option>
                    <option value="image">Photograph / Scan</option>
                    <option value="audio">Voice Note</option>
                    <option value="video">Video</option>
                    <option value="document">Archival Letter</option>
                    <option value="mixed">Mixed Media</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="mem-content" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Narrative / Story (Optional)
                  </label>
                  <textarea
                    id="mem-content"
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write the story behind this moment..."
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="mem-location" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Location (Optional)
                  </label>
                  <input
                    id="mem-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Kyoto, Japan"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="mem-tags" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    id="mem-tags"
                    type="text"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="family, summer, 2026"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="mem-file" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Attach Photo, Document, or Audio (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="mem-file"
                      type="file"
                      accept="image/*,audio/*,video/*,application/pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="text-xs text-[#5C5955]"
                    />
                    {selectedFile && (
                      <span className="inline-flex items-center gap-1 text-xs text-[#5F735E]">
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        {selectedFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium disabled:opacity-50"
                >
                  {submitting ? "Preserving..." : "Save to Archive"}
                </button>
              </div>
            </form>
          )}

          {/* OCR Search Matches */}
          {ocrResults.length > 0 && (
            <div className="bg-[#F0ECE1] rounded-2xl border border-[#E7E2DA] p-5">
              <h2 className="font-serif text-sm font-bold text-[#20242C] mb-2">
                OCR Letter & Document Matches ({ocrResults.length})
              </h2>
              <ul className="space-y-2">
                {ocrResults.map((match) => (
                  <li key={match.mediaId} className="p-3 rounded-xl bg-[#FFFFFF] text-xs text-[#28272A]">
                    <span className="font-mono text-[10px] text-[#5C5955] block mb-1">
                      Media ID: {match.mediaId}
                    </span>
                    <p className="line-clamp-2">{match.extractedText}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Memories Collection */}
          {displayedMemories.length === 0 ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-10 text-center text-xs text-[#5C5955]">
              No memories found in this view yet. Click &ldquo;Preserve Memory&rdquo; to add one.
            </div>
          ) : (
            <div
              className={
                viewMode === "grid" || viewMode === "favorites"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                  : "space-y-4"
              }
            >
              {displayedMemories.map((mem) => (
                <article
                  key={mem.id}
                  className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 flex flex-col justify-between gap-4 hover:border-[#8D857A] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F0ECE1] text-[10px] uppercase tracking-wider font-medium text-[#28272A]">
                        {mem.format}
                      </span>
                      <span className="text-[11px] text-[#5C5955]">
                        {new Date(mem.capturedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        lastTriggerRef.current = e.currentTarget;
                        setActiveMemory(mem);
                      }}
                      className="text-left group w-full focus:outline-none focus:ring-2 focus:ring-[#76556F] rounded-lg"
                    >
                      <h3 className="font-serif text-lg font-bold text-[#20242C] group-hover:text-[#76556F] transition-colors">
                        {mem.title}
                      </h3>
                      {mem.content && (
                        <p className="mt-1.5 text-xs text-[#5C5955] line-clamp-3 leading-relaxed">
                          {mem.content}
                        </p>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE1]">
                    <div className="flex flex-wrap gap-1.5">
                      {(mem.tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-[#F7F4EE] text-[10px] text-[#5C5955]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(mem)}
                      aria-label={mem.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      className={`p-1.5 rounded-lg transition-colors ${
                        mem.isFavorite
                          ? "text-[#76556F] bg-[#FAF6F8]"
                          : "text-[#8D857A] hover:bg-[#F0ECE1]"
                      }`}
                    >
                      <Heart className="w-4 h-4" fill={mem.isFavorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Accessible Memory Detail Modal */}
      {activeMemory &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-[#20242C]/50 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-memory-title"
            onClick={() => {
              setActiveMemory(null);
              lastTriggerRef.current?.focus();
            }}
          >
            <div
              ref={modalDialogRef}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-xl w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#76556F] font-semibold">
                    {activeMemory.format} • {new Date(activeMemory.capturedAt).toLocaleString()}
                  </span>
                  <h2 id="modal-memory-title" className="font-serif text-2xl font-bold text-[#20242C] mt-1">
                    {activeMemory.title}
                  </h2>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => {
                    setActiveMemory(null);
                    lastTriggerRef.current?.focus();
                  }}
                  aria-label="Close memory details"
                  className="p-2 rounded-xl bg-[#F7F4EE] text-[#20242C] hover:bg-[#E7E2DA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeMemory.location && (
                <p className="text-xs text-[#5C5955]">Location: {activeMemory.location}</p>
              )}

              <p className="text-sm text-[#28272A] leading-relaxed whitespace-pre-wrap">
                {activeMemory.content || "No written narrative attached."}
              </p>

              {activeMemory.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeMemory.tags.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-[#F0ECE1] text-xs text-[#28272A]">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-[#F0ECE1] space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                  Family Reflections &amp; Annotations ({comments.length})
                </h3>
                {comments.length > 0 && (
                  <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                    {comments.map((c) => (
                      <li
                        key={c.id}
                        className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-start justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-[#20242C]">{c.authorName}: </span>
                          <span className="text-[#5C5955]">{c.body}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          aria-label="Delete comment"
                          className="text-[11px] text-[#B6423E] hover:underline shrink-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <label htmlFor="memory-comment-input" className="sr-only">
                    Add family annotation
                  </label>
                  <input
                    id="memory-comment-input"
                    type="text"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a family reflection..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-[#76556F] text-white text-xs font-medium"
                  >
                    Post
                  </button>
                </form>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E7E2DA]">
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(activeMemory)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                >
                  <Heart
                    className="w-3.5 h-3.5 text-[#76556F]"
                    fill={activeMemory.isFavorite ? "currentColor" : "none"}
                  />
                  {activeMemory.isFavorite ? "Favorited" : "Mark Favorite"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteMemory(activeMemory)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FDF2F2] text-xs font-medium text-[#B6423E] hover:bg-[#FADADA]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Memory
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AppShell>
  );
}
