"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Calendar,
  FileText,
  Film,
  Flag,
  Heart,
  History,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Mic,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  addMemoryComment,
  apiRequest,
  deleteMemoryComment,
  enqueueOfflineMutation,
  flagMemoryForModeration,
  getMediaAsset,
  getMediaOcr,
  getMemoryHistory,
  getSpaceCalendar,
  getStoredSession,
  listActiveUploadSessions,
  listMemoryComments,
  MemoryCommentDTO,
  MemoryDTO,
  MemorySpaceDTO,
  retryUploadSession,
  saveMediaNonDestructiveEdits,
  uploadFileToMediaService,
} from "@/lib/api";

type ViewMode = "grid" | "timeline" | "calendar" | "favorites";

export function ArchiveWorkspace({ initialMode = "grid" }: { initialMode?: ViewMode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [memories, setMemories] = useState<MemoryDTO[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ocrResults, setOcrResults] = useState<Array<{ mediaId: string; extractedText: string }>>([]);
  const [calendarData, setCalendarData] = useState<{
    days: Record<string, MemoryDTO[]>;
    anniversaries: Array<{ profileId: string; name: string; relationship?: string; birthDate?: string }>;
  } | null>(null);
  const [activeUploads, setActiveUploads] = useState<
    Array<{ id: string; originalName: string; mimeType: string; sizeBytes: number; status: string }>
  >([]);
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
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Accessible Modal Detail state
  const [activeMemory, setActiveMemory] = useState<MemoryDTO | null>(null);
  const [comments, setComments] = useState<MemoryCommentDTO[]>([]);
  const [revisions, setRevisions] = useState<
    Array<{ id: string; title: string; changeSummary: string; createdAt: string }>
  >([]);
  const [modalTab, setModalTab] = useState<"details" | "media" | "history">("details");
  const [zoomScale, setZoomScale] = useState(1);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [warmth, setWarmth] = useState(0);
  const [cropPreset, setCropPreset] = useState<"original" | "square" | "portrait">("original");
  const [showVideoCaptions, setShowVideoCaptions] = useState(true);
  const [activeMedia, setActiveMedia] = useState<{
    id: string;
    originalName: string;
    mimeType: string;
    publicUrl?: string;
    metadata?: Record<string, any>;
  } | null>(null);
  const [activeOcr, setActiveOcr] = useState<Array<{ id: string; extractedText: string; confidence?: number }>>([]);
  const [commentBody, setCommentBody] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalDialogRef = useRef<HTMLDivElement | null>(null);
  const archiveSurfaceRef = useRef<HTMLDivElement | null>(null);

  const loadMemories = useCallback(async (targetSpaceId: string, onlyFavorites = false) => {
    if (!targetSpaceId) return;
    try {
      const qs = onlyFavorites ? "?limit=50&isFavorite=true" : "?limit=50";
      const [data, uploads, cal] = await Promise.allSettled([
        apiRequest<{ items?: MemoryDTO[] } | MemoryDTO[]>(`/spaces/${targetSpaceId}/memories${qs}`),
        listActiveUploadSessions(targetSpaceId),
        getSpaceCalendar(targetSpaceId),
      ]);
      if (data.status === "fulfilled") {
        setMemories(Array.isArray(data.value) ? data.value : data.value.items || []);
      }
      if (uploads.status === "fulfilled") {
        setActiveUploads(uploads.value || []);
      }
      if (cal.status === "fulfilled") {
        setCalendarData({ days: cal.value.days, anniversaries: cal.value.anniversaries });
      }
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
          await loadMemories(list[0].id, initialMode === "favorites");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize archive.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadMemories, initialMode]);

  useEffect(() => {
    if (!isRecordingAudio) return;
    const timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecordingAudio]);

  // Modal Escape key, Tab focus trap & inert background (WCAG 2.2 AA)
  useEffect(() => {
    if (!activeMemory) {
      setComments([]);
      setRevisions([]);
      setActiveMedia(null);
      setActiveOcr([]);
      setModalTab("details");
      setZoomScale(1);
      setRotateDeg(0);
      setWarmth(0);
      setCropPreset("original");
      return;
    }
    listMemoryComments(activeMemory.id)
      .then((list) => setComments(list))
      .catch(() => setComments([]));
    getMemoryHistory(activeMemory.id)
      .then((hist) => setRevisions(hist))
      .catch(() => setRevisions([]));
    if (activeMemory.mediaIds?.length > 0) {
      const primaryMediaId = activeMemory.mediaIds[0];
      getMediaAsset(primaryMediaId)
        .then((asset) => {
          setActiveMedia(asset);
          const saved = asset.metadata?.nonDestructiveEdits;
          if (saved) {
            if (typeof saved.rotateDegrees === "number") setRotateDeg(saved.rotateDegrees);
            if (typeof saved.warmth === "number") setWarmth(saved.warmth);
          }
        })
        .catch(() => setActiveMedia(null));
      getMediaOcr(primaryMediaId)
        .then((ocr) => setActiveOcr(ocr || []))
        .catch(() => setActiveOcr([]));
    } else {
      setActiveMedia(null);
      setActiveOcr([]);
    }

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
      setIsRecordingAudio(false);
      setRecordSeconds(0);
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

  const handleSaveMediaEdits = async () => {
    if (!activeMemory?.mediaIds?.[0]) return;
    try {
      await saveMediaNonDestructiveEdits(activeMemory.mediaIds[0], {
        rotateDegrees: rotateDeg,
        warmth,
        cropPreset: cropPreset !== "original" ? cropPreset : zoomScale > 1 ? "zoom_center" : "original",
      });
      setNotice("Saved non-destructive archival edits.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save media adjustments.");
    }
  };

  const handleRetryUpload = async (mediaId: string) => {
    try {
      await retryUploadSession(mediaId);
      setNotice(`Refreshed signed upload session for ${mediaId.slice(0, 8)}.`);
      await loadMemories(spaceId, viewMode === "favorites");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry upload session.");
    }
  };

  const displayedMemories = memories.filter((m) => {
    if (viewMode === "favorites" && !m.isFavorite) return false;
    if (formatFilter !== "all" && m.format !== formatFilter) return false;
    return true;
  });

  const timelineByYear = displayedMemories.reduce<Record<string, MemoryDTO[]>>((acc, m) => {
    const ym = new Date(m.capturedAt).toISOString().slice(0, 7);
    acc[ym] = acc[ym] || [];
    acc[ym].push(m);
    return acc;
  }, {});

  return (
    <AppShell
      title="Living Memory Archive"
      subtitle="Browse heirloom stories, scanned letters (OCR), voice notes, calendar anniversaries, and photographs."
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
                      { id: "calendar", label: "Calendar", icon: Calendar },
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

            {/* Format Facet Filter Bar (PWA-36) */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {["all", "story", "image", "audio", "video", "document"].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormatFilter(fmt)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize border ${
                      formatFilter === fmt
                        ? "bg-[#76556F] text-white border-[#76556F]"
                        : "bg-white text-[#5C5955] border-[#E7E2DA]"
                    }`}
                  >
                    {fmt === "all" ? "All Media" : fmt}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#5C5955]">
                <Link href="/archive/timeline" className="hover:underline">Timeline View</Link>
                <span>•</span>
                <Link href="/archive/calendar" className="hover:underline">Calendar View</Link>
                <span>•</span>
                <Link href="/archive/favorites" className="hover:underline">Favorites</Link>
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

            {/* Floating / Inline Upload Queue & Retry Center (PWA-41 / PWA-42) */}
            {activeUploads.length > 0 && (
              <section className="bg-[#FAF6F8] rounded-2xl border border-[#76556F]/30 p-4 space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                  Active Media Upload &amp; Processing Queue ({activeUploads.length})
                </h2>
                <div className="space-y-1.5">
                  {activeUploads.map((u) => (
                    <div key={u.id} className="p-2.5 rounded-xl bg-white border border-[#E7E2DA] flex items-center justify-between text-xs">
                      <span>
                        <strong>{u.originalName}</strong> ({u.status})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRetryUpload(u.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#F0ECE1] text-[11px] font-medium text-[#20242C]"
                      >
                        Retry Session
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Create Memory Composer + Type Selector (PWA-39 / PWA-45 / PWA-46) */}
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

                {/* Type Selection Cards (PWA-39) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: "story", label: "Rich Story", icon: Sparkles },
                      { id: "image", label: "Photo / Scan", icon: ImageIcon },
                      { id: "audio", label: "Voice Note", icon: Mic },
                      { id: "video", label: "Home Video", icon: Film },
                      { id: "document", label: "Document / OCR", icon: FileText },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormat(opt.id)}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                          format === opt.id
                            ? "bg-[#FAF6F8] border-[#76556F] text-[#76556F]"
                            : "bg-[#F7F4EE] border-[#E7E2DA] text-[#28272A]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        {opt.label}
                      </button>
                    );
                  })}
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

                  {format === "audio" && (
                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs">
                        <p className="font-semibold text-[#20242C]">Voice Note Studio (PWA-45)</p>
                        <p className="text-[#5C5955]">
                          {isRecordingAudio ? `Recording oral history... ${recordSeconds}s` : "Capture a voice note timer or attach an audio file."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRecordingAudio((v) => !v)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold ${
                          isRecordingAudio ? "bg-[#B6423E] text-white" : "bg-[#76556F] text-white"
                        }`}
                      >
                        {isRecordingAudio ? "Stop Recording" : "Start Voice Capture"}
                      </button>
                    </div>
                  )}

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

            {/* Calendar View (PWA-35) */}
            {viewMode === "calendar" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-8 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                  <h2 className="font-serif text-xl font-bold text-[#20242C]">
                    Archival Calendar Distribution
                  </h2>
                  {!calendarData || Object.keys(calendarData.days).length === 0 ? (
                    <p className="text-xs text-[#5C5955]">No dated memories in this space yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(calendarData.days).map(([dateKey, items]) => (
                        <div key={dateKey} className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-1.5">
                          <p className="font-mono text-xs font-bold text-[#76556F]">{dateKey}</p>
                          {items.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={(e) => {
                                lastTriggerRef.current = e.currentTarget;
                                setActiveMemory(m);
                              }}
                              className="block text-left text-xs font-semibold text-[#20242C] hover:text-[#76556F]"
                            >
                              • {m.title}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <aside className="lg:col-span-4 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">Family Birthdates &amp; Milestones</h2>
                  {!calendarData || calendarData.anniversaries.length === 0 ? (
                    <p className="text-xs text-[#5C5955]">Add birthdates to Profiles to see milestones here.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {calendarData.anniversaries.map((a) => (
                        <li key={a.profileId} className="p-3 rounded-xl bg-[#FAF6F8] border border-[#E7E2DA]">
                          <p className="font-semibold text-[#20242C]">{a.name}</p>
                          <p className="text-[#5C5955]">{a.birthDate} {a.relationship ? `• ${a.relationship}` : ""}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </aside>
              </div>
            ) : viewMode === "timeline" ? (
              <div className="space-y-6">
                {Object.keys(timelineByYear).length === 0 ? (
                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-10 text-center text-xs text-[#5C5955]">
                    No memories found in timeline yet.
                  </div>
                ) : (
                  Object.entries(timelineByYear).map(([ym, items]) => (
                    <section key={ym} className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                      <h2 className="font-serif text-xl font-bold text-[#76556F]">{ym}</h2>
                      <div className="space-y-2.5">
                        {items.map((mem) => (
                          <button
                            key={mem.id}
                            type="button"
                            onClick={(e) => {
                              lastTriggerRef.current = e.currentTarget;
                              setActiveMemory(mem);
                            }}
                            className="w-full text-left p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] hover:border-[#76556F]"
                          >
                            <p className="font-serif text-base font-bold text-[#20242C]">{mem.title}</p>
                            {mem.content && <p className="text-xs text-[#5C5955] mt-1 line-clamp-2">{mem.content}</p>}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            ) : displayedMemories.length === 0 ? (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-10 text-center text-xs text-[#5C5955]">
                No memories found in this view yet. Click &ldquo;Preserve Memory&rdquo; to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* Accessible Memory Detail, Media Inspector & History Modal (PWA-38 / 43 / 44 / 47 / 54 / 55) */}
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
              className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
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

              <div className="flex gap-2 border-b border-[#F0ECE1] pb-2">
                {(
                  [
                    { id: "details", label: "Story & Annotations" },
                    { id: "media", label: "Media / OCR Inspector" },
                    { id: "history", label: `Revision History (${revisions.length})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      modalTab === t.id ? "bg-[#20242C] text-white" : "bg-[#F7F4EE] text-[#5C5955]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {modalTab === "details" && (
                <>
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
                </>
              )}

              {modalTab === "media" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#20242C] text-white flex flex-col items-center justify-center min-h-[220px] space-y-3 overflow-hidden">
                    {activeMedia?.publicUrl ? (
                      activeMedia.mimeType.startsWith("video/") || activeMemory.format === "video" ? (
                        <div className="w-full space-y-2">
                          <video
                            ref={videoRef}
                            controls
                            src={activeMedia.publicUrl}
                            className="w-full max-h-[260px] rounded-lg bg-black"
                          />
                          {showVideoCaptions && (
                            <p className="text-[11px] text-center bg-black/50 px-3 py-1 rounded">
                              {activeMemory.content || activeMemory.title}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="flex gap-1.5">
                              {[0, 5, 15].map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => {
                                    if (videoRef.current) videoRef.current.currentTime = sec;
                                  }}
                                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                                >
                                  Jump {sec}s
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowVideoCaptions((v) => !v)}
                              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            >
                              {showVideoCaptions ? "Hide Captions" : "Show Captions"}
                            </button>
                          </div>
                        </div>
                      ) : activeMedia.mimeType.startsWith("audio/") || activeMemory.format === "audio" ? (
                        <div className="w-full space-y-3">
                          <div className="flex items-end justify-center gap-1 h-12" aria-hidden="true">
                            {[18, 32, 44, 26, 40, 22, 36, 48, 28, 34, 20, 30].map((h, i) => (
                              <span
                                key={i}
                                className="w-1.5 rounded-full bg-[#D8973C]"
                                style={{ height: `${h}px` }}
                              />
                            ))}
                          </div>
                          <audio controls src={activeMedia.publicUrl} className="w-full" />
                        </div>
                      ) : activeMedia.mimeType === "application/pdf" || activeMemory.format === "document" ? (
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <iframe
                            src={activeMedia.publicUrl}
                            title={`Document preview: ${activeMemory.title}`}
                            className="w-full h-52 rounded-lg bg-white"
                          />
                          <div className="p-3 rounded-lg bg-white/10 text-xs space-y-1.5 overflow-y-auto max-h-52">
                            <p className="font-semibold text-[#D8973C]">Tesseract OCR Transcript</p>
                            <p className="text-[11px] leading-relaxed">
                              {activeOcr[0]?.extractedText || activeMemory.content || "No OCR text extracted yet."}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/20 p-2">
                          <img
                            src={activeMedia.publicUrl}
                            alt={activeMemory.title}
                            className={`max-h-[240px] object-cover transition-transform ${
                              cropPreset === "square"
                                ? "aspect-square w-48"
                                : cropPreset === "portrait"
                                ? "aspect-[4/5] w-44"
                                : "w-auto"
                            }`}
                            style={{
                              transform: `scale(${zoomScale}) rotate(${rotateDeg}deg)`,
                              filter: `sepia(${Math.max(0, warmth * 2)}%) saturate(${100 + warmth * 2}%)`,
                            }}
                          />
                        </div>
                      )
                    ) : (
                      <>
                        <p className="text-xs font-mono opacity-80">
                          Format: {activeMemory.format} • Non-Destructive Preview (Zoom {zoomScale}x • {rotateDeg}°)
                        </p>
                        <p className="text-[11px] opacity-70">
                          {activeMemory.mediaIds.length > 0
                            ? `Attached Media Asset: ${activeMemory.mediaIds[0]}`
                            : "Textual heirloom memory (no binary attachment)."}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setZoomScale((z) => (z >= 2 ? 1 : Number((z + 0.5).toFixed(1))))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0ECE1] font-medium"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> Zoom ({zoomScale}x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotateDeg((d) => (d + 90) % 360)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0ECE1] font-medium"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
                    </button>
                    <select
                      aria-label="Crop aspect preset"
                      value={cropPreset}
                      onChange={(e) => setCropPreset(e.target.value as "original" | "square" | "portrait")}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F0ECE1] font-medium"
                    >
                      <option value="original">Original Crop</option>
                      <option value="square">Square 1:1</option>
                      <option value="portrait">Portrait 4:5</option>
                    </select>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0ECE1]">
                      Warmth
                      <input
                        type="range"
                        min={-20}
                        max={20}
                        value={warmth}
                        onChange={(e) => setWarmth(Number(e.target.value))}
                      />
                    </label>
                    {activeMemory.mediaIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSaveMediaEdits}
                        className="px-3.5 py-1.5 rounded-lg bg-[#76556F] text-white font-semibold"
                      >
                        Save Non-Destructive Edit
                      </button>
                    )}
                  </div>
                </div>
              )}

              {modalTab === "history" && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#20242C] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#76556F]" />
                    Attribution &amp; Revision Trail
                  </h3>
                  {revisions.map((rev) => (
                    <div key={rev.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs">
                      <div className="flex justify-between">
                        <strong className="text-[#20242C]">{rev.changeSummary}</strong>
                        <span className="text-[11px] text-[#5C5955]">{new Date(rev.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[#5C5955] mt-1">Title: {rev.title}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#E7E2DA]">
                <div className="flex flex-wrap gap-2">
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
                    onClick={async () => {
                      try {
                        await flagMemoryForModeration(activeMemory.id, "Archivist review requested");
                        setNotice("Flagged memory for governance moderation review.");
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Unable to flag memory.");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-medium text-[#5C5955]"
                  >
                    <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                    Flag
                  </button>
                  <Link
                    href={`/archive/memories/${activeMemory.id}`}
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-medium text-[#20242C]"
                  >
                    Open Full Page
                  </Link>
                </div>

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
