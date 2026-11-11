"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Heart, History, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  addMemoryComment,
  apiRequest,
  deleteMemoryComment,
  getMediaAsset,
  getMediaOcr,
  getMemoryHistory,
  getMemoryReactions,
  getStoredSession,
  listMemoryComments,
  MemoryCommentDTO,
  MemoryDTO,
  MemoryReactionKind,
  MemoryReactionStateDTO,
  toggleMemoryReaction,
} from "@/lib/api";

const REACTION_OPTIONS: Array<{ kind: MemoryReactionKind; label: string; emoji: string }> = [
  { kind: "heart", label: "Heart", emoji: "♥" },
  { kind: "warmth", label: "Warmth", emoji: "☀" },
  { kind: "tearsOfJoy", label: "Tears of Joy", emoji: "✨" },
  { kind: "gratitude", label: "Gratitude", emoji: "🙏" },
];

export default function MemoryDetailPage() {
  const params = useParams<{ memoryId: string }>();
  const router = useRouter();
  const memoryId = params?.memoryId || "";

  const [memory, setMemory] = useState<MemoryDTO | null>(null);
  const [mediaAsset, setMediaAsset] = useState<{ mimeType: string; publicUrl?: string; originalName: string } | null>(null);
  const [ocrRows, setOcrRows] = useState<Array<{ id: string; extractedText: string }>>([]);
  const [comments, setComments] = useState<MemoryCommentDTO[]>([]);
  const [reactionState, setReactionState] = useState<MemoryReactionStateDTO | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; title: string; changeSummary: string; createdAt: string }>>([]);
  const [commentBody, setCommentBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memoryId || !getStoredSession().accessToken) return;
    Promise.allSettled([
      apiRequest<MemoryDTO>(`/memories/${memoryId}`),
      listMemoryComments(memoryId),
      getMemoryHistory(memoryId),
      getMemoryReactions(memoryId),
    ]).then(([memRes, cmtRes, histRes, reactRes]) => {
      if (memRes.status === "fulfilled") {
        setMemory(memRes.value);
        setEditTitle(memRes.value.title);
        setEditContent(memRes.value.content || "");
        setEditLocation(memRes.value.location || "");
        if (memRes.value.mediaIds?.length > 0) {
          getMediaAsset(memRes.value.mediaIds[0]).then(setMediaAsset).catch(() => setMediaAsset(null));
          getMediaOcr(memRes.value.mediaIds[0]).then(setOcrRows).catch(() => setOcrRows([]));
        }
      } else {
        setError("Unable to load memory.");
      }
      if (cmtRes.status === "fulfilled") setComments(cmtRes.value || []);
      if (histRes.status === "fulfilled") setHistory(histRes.value || []);
      if (reactRes.status === "fulfilled") setReactionState(reactRes.value);
    });
  }, [memoryId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memory || !commentBody.trim()) return;
    setError(null);
    try {
      const user = getStoredSession().user;
      const created = await addMemoryComment(memory.id, commentBody.trim(), user?.fullName || "Family Member");
      setComments((prev) => [...prev, created]);
      setCommentBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!memory) return;
    try {
      await deleteMemoryComment(memory.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove comment.");
    }
  };

  const handleToggleReaction = async (kind: MemoryReactionKind) => {
    if (!memory) return;
    setError(null);
    try {
      const next = await toggleMemoryReaction(memory.id, kind);
      setReactionState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update reaction.");
    }
  };

  const handleToggleFavorite = async () => {
    if (!memory) return;
    setError(null);
    try {
      const updated = await apiRequest<MemoryDTO>(`/memories/${memory.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: !memory.isFavorite }),
      });
      setMemory(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update favorite status.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memory || !editTitle.trim()) return;
    setError(null);
    try {
      const updated = await apiRequest<MemoryDTO>(`/memories/${memory.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim() || null,
          location: editLocation.trim() || null,
        }),
      });
      setMemory(updated);
      setEditing(false);
      setNotice("Saved story updates.");
      getMemoryHistory(updated.id).then(setHistory).catch(() => setHistory([]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update memory.");
    }
  };

  const handleMoveToTrash = async () => {
    if (!memory) return;
    try {
      await apiRequest(`/memories/${memory.id}`, { method: "DELETE" });
      router.push("/trash");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move memory to trash.");
    }
  };

  return (
    <AppShell
      title={memory ? memory.title : "Memory Detail"}
      subtitle="Full archival view with story typography, emotional reactions, annotations, and revision attribution."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/archive" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#76556F] hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to Archive
          </Link>

          {memory && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E7E2DA] text-xs font-medium text-[#20242C]"
              >
                <Heart className="w-3.5 h-3.5 text-[#76556F]" fill={memory.isFavorite ? "currentColor" : "none"} />
                {memory.isFavorite ? "Favorited" : "Favorite"}
              </button>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                {editing ? "Cancel Edit" : "Edit Story"}
              </button>
              <button
                type="button"
                onClick={handleMoveToTrash}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF2F2] text-xs font-medium text-[#B6423E]"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Move to Trash
              </button>
            </div>
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

        {!memory ? (
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-8 text-xs text-[#5C5955]">
            Loading memory or sign in required...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <article className="lg:col-span-7 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#5C5955]">
                <span className="px-2.5 py-0.5 rounded-full bg-[#F0ECE1] uppercase font-semibold text-[#20242C]">
                  {memory.format}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  {new Date(memory.capturedAt).toLocaleString()}
                </span>
              </div>

              {editing ? (
                <form onSubmit={handleSaveEdit} className="space-y-3 p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]">
                  <div>
                    <label htmlFor="detail-edit-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Title
                    </label>
                    <input
                      id="detail-edit-title"
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="detail-edit-location" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Location
                    </label>
                    <input
                      id="detail-edit-location"
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="detail-edit-content" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Narrative
                    </label>
                    <textarea
                      id="detail-edit-content"
                      rows={4}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <>
                  <h2 className="font-serif text-2xl font-bold text-[#20242C]">{memory.title}</h2>
                  {memory.location && <p className="text-xs text-[#5C5955]">Location: {memory.location}</p>}
                  <p className="text-sm text-[#28272A] leading-relaxed whitespace-pre-wrap">
                    {memory.content || "No narrative text attached."}
                  </p>
                </>
              )}

              {mediaAsset?.publicUrl && (
                <div className="pt-2 space-y-3">
                  {mediaAsset.mimeType.startsWith("video/") ? (
                    <video controls src={mediaAsset.publicUrl} className="w-full rounded-xl bg-black max-h-80" />
                  ) : mediaAsset.mimeType.startsWith("audio/") ? (
                    <audio controls src={mediaAsset.publicUrl} className="w-full" />
                  ) : mediaAsset.mimeType === "application/pdf" ? (
                    <iframe src={mediaAsset.publicUrl} title={memory.title} className="w-full h-72 rounded-xl border border-[#E7E2DA]" />
                  ) : (
                    <img src={mediaAsset.publicUrl} alt={memory.title} className="w-full max-h-96 object-contain rounded-xl bg-[#F7F4EE]" />
                  )}
                </div>
              )}
              {ocrRows.length > 0 && (
                <div className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs space-y-1">
                  <p className="font-semibold text-[#76556F]">OCR Extracted Transcript</p>
                  <p className="text-[#28272A] whitespace-pre-wrap">{ocrRows[0].extractedText}</p>
                </div>
              )}
            </article>

            <aside className="lg:col-span-5 space-y-6">
              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C]">Emotional Reactions</h2>
                <div className="flex flex-wrap gap-2">
                  {REACTION_OPTIONS.map((opt) => {
                    const selected = Boolean(reactionState?.selectedKinds?.includes(opt.kind));
                    const count = reactionState?.counts?.[opt.kind] || 0;
                    return (
                      <button
                        key={opt.kind}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleToggleReaction(opt.kind)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          selected
                            ? "bg-[#76556F] text-white border-[#76556F]"
                            : "bg-[#FAF6F8] text-[#76556F] border-[#E7E2DA] hover:border-[#76556F]"
                        }`}
                      >
                        <span aria-hidden="true">{opt.emoji}</span>
                        <span>{opt.label}</span>
                        {count > 0 && <span className="font-mono text-[11px]">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  Discussion ({comments.length})
                </h2>
                <ul className="space-y-2 text-xs">
                  {comments.map((c) => (
                    <li key={c.id} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-start justify-between gap-2">
                      <div>
                        <strong>{c.authorName}:</strong> {c.body}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-[11px] text-[#B6423E] hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a reflection..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                  <button type="submit" className="px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold">
                    Post
                  </button>
                </form>
              </section>

              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
                  Change History ({history.length})
                </h2>
                <ul className="space-y-2 text-xs">
                  {history.map((h) => (
                    <li key={h.id} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]">
                      <p className="font-semibold text-[#20242C]">{h.changeSummary}</p>
                      <p className="text-[11px] text-[#5C5955]">{new Date(h.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
