"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, History, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  addMemoryComment,
  apiRequest,
  getMemoryHistory,
  getStoredSession,
  listMemoryComments,
  MemoryCommentDTO,
  MemoryDTO,
} from "@/lib/api";

export default function MemoryDetailPage() {
  const params = useParams<{ memoryId: string }>();
  const memoryId = params?.memoryId || "";

  const [memory, setMemory] = useState<MemoryDTO | null>(null);
  const [comments, setComments] = useState<MemoryCommentDTO[]>([]);
  const [history, setHistory] = useState<Array<{ id: string; title: string; changeSummary: string; createdAt: string }>>([]);
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memoryId || !getStoredSession().accessToken) return;
    Promise.allSettled([
      apiRequest<MemoryDTO>(`/memories/${memoryId}`),
      listMemoryComments(memoryId),
      getMemoryHistory(memoryId),
    ]).then(([memRes, cmtRes, histRes]) => {
      if (memRes.status === "fulfilled") setMemory(memRes.value);
      else setError("Unable to load memory.");
      if (cmtRes.status === "fulfilled") setComments(cmtRes.value || []);
      if (histRes.status === "fulfilled") setHistory(histRes.value || []);
    });
  }, [memoryId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memory || !commentBody.trim()) return;
    try {
      const user = getStoredSession().user;
      const created = await addMemoryComment(memory.id, commentBody.trim(), user?.fullName || "Family Member");
      setComments((prev) => [...prev, created]);
      setCommentBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment.");
    }
  };

  return (
    <AppShell
      title={memory ? memory.title : "Memory Detail"}
      subtitle="Full archival view with story typography, annotations, and revision attribution."
    >
      <div className="space-y-6">
        <Link href="/archive" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#76556F] hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Archive
        </Link>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
            {error}
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
              <h2 className="font-serif text-2xl font-bold text-[#20242C]">{memory.title}</h2>
              {memory.location && <p className="text-xs text-[#5C5955]">Location: {memory.location}</p>}
              <p className="text-sm text-[#28272A] leading-relaxed whitespace-pre-wrap">
                {memory.content || "No narrative text attached."}
              </p>
            </article>

            <aside className="lg:col-span-5 space-y-6">
              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  Discussion ({comments.length})
                </h2>
                <ul className="space-y-2 text-xs">
                  {comments.map((c) => (
                    <li key={c.id} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]">
                      <strong>{c.authorName}:</strong> {c.body}
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
