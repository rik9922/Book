"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Layers, Settings, Shield, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  deleteSpace,
  getSpaceActivity,
  getSpaceTimeline,
  getStoredSession,
  MemoryDTO,
  MemorySpaceDTO,
  SpaceMemberDTO,
  updateSpace,
  updateSpaceMemberRole,
} from "@/lib/api";

export default function SpaceDetailPage() {
  const params = useParams<{ spaceId: string }>();
  const router = useRouter();
  const spaceId = params?.spaceId || "";

  const [tab, setTab] = useState<"overview" | "timeline" | "members" | "settings">("overview");
  const [space, setSpace] = useState<MemorySpaceDTO | null>(null);
  const [timelineGroups, setTimelineGroups] = useState<Array<{ yearMonth: string; year: string; items: MemoryDTO[] }>>([]);
  const [members, setMembers] = useState<SpaceMemberDTO[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; kind: string; title: string; timestamp: string }>>([]);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!spaceId || !getStoredSession().accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sp, tl, mems, act] = await Promise.allSettled([
        apiRequest<MemorySpaceDTO>(`/spaces/${spaceId}`),
        getSpaceTimeline(spaceId),
        apiRequest<SpaceMemberDTO[]>(`/collab/spaces/${spaceId}/members`),
        getSpaceActivity(spaceId),
      ]);
      if (sp.status === "fulfilled") {
        setSpace(sp.value);
        setEditName(sp.value.name);
        setEditDesc(sp.value.description || "");
      }
      if (tl.status === "fulfilled") setTimelineGroups(tl.value.groups || []);
      if (mems.status === "fulfilled") setMembers(mems.value || []);
      if (act.status === "fulfilled") setActivity(act.value || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load space details.");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space || !editName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const updated = await updateSpace(space.id, { name: editName.trim(), description: editDesc.trim() });
      setSpace(updated);
      setNotice("Space settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update space.");
    }
  };

  const handleChangeRole = async (userId: string, role: "admin" | "contributor" | "viewer") => {
    setError(null);
    setNotice(null);
    try {
      const updated = await updateSpaceMemberRole(spaceId, userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? updated : m)));
      setNotice(`Updated member role to ${role}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role.");
    }
  };

  const handleArchiveSpace = async () => {
    if (!space) return;
    try {
      await deleteSpace(space.id);
      router.push("/spaces");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive space.");
    }
  };

  return (
    <AppShell
      title={space ? space.name : "Memory Space Overview"}
      subtitle={space?.description || "Inspect stories, chronological progression, member roles, and vault governance."}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/spaces" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#76556F] hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            All Memory Spaces
          </Link>

          <div role="tablist" aria-label="Space views" className="flex flex-wrap gap-2">
            {(
              [
                { id: "overview", label: "Overview", icon: Layers },
                { id: "timeline", label: "Timeline", icon: Calendar },
                { id: "members", label: "Members & Roles", icon: Users },
                { id: "settings", label: "Space Settings", icon: Settings },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
                    tab === t.id ? "bg-[#20242C] text-white" : "bg-white border border-[#E7E2DA] text-[#28272A]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
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

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-8 text-xs text-[#5C5955]">
            Loading vault telemetry...
          </div>
        ) : !space ? (
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-8 text-center text-xs text-[#5C5955]">
            Sign in to view this memory space.
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                  <h2 className="font-serif text-xl font-bold text-[#20242C]">Recent Activity Stream</h2>
                  {activity.length === 0 ? (
                    <p className="text-xs text-[#5C5955]">No activity recorded yet.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {activity.slice(0, 12).map((act) => (
                        <li key={act.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-[#20242C]">{act.title}</span>
                            <span className="ml-2 text-[11px] uppercase text-[#76556F]">{act.kind.replace("_", " ")}</span>
                          </div>
                          <span className="text-[11px] text-[#5C5955]">{new Date(act.timestamp).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <aside className="lg:col-span-5 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                  <h2 className="font-serif text-xl font-bold text-[#20242C]">Quick Actions</h2>
                  <div className="grid grid-cols-1 gap-2.5 text-xs font-semibold">
                    <Link href="/archive" className="min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#76556F] text-white">
                      <span>Open Living Archive</span>
                      <span>→</span>
                    </Link>
                    <Link href="/studio" className="min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#20242C] text-white">
                      <span>Author Heirloom Book</span>
                      <span>→</span>
                    </Link>
                    <Link href="/circles" className="min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#F0ECE1] text-[#20242C]">
                      <span>Manage Invitations &amp; Share Links</span>
                      <span>→</span>
                    </Link>
                  </div>
                </aside>
              </div>
            )}

            {tab === "timeline" && (
              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-6">
                <h2 className="font-serif text-xl font-bold text-[#20242C]">Chronological Space Timeline</h2>
                {timelineGroups.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">No memories in this timeline yet.</p>
                ) : (
                  <div className="space-y-6">
                    {timelineGroups.map((g) => (
                      <div key={g.yearMonth} className="space-y-2.5 border-l-2 border-[#76556F]/30 pl-4">
                        <h3 className="font-serif text-lg font-bold text-[#76556F]">{g.yearMonth}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {g.items.map((m) => (
                            <div key={m.id} className="p-3.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs">
                              <p className="font-semibold text-[#20242C]">{m.title}</p>
                              <p className="text-[#5C5955] mt-1 line-clamp-2">{m.content || m.format}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "members" && (
              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                <h2 className="font-serif text-xl font-bold text-[#20242C]">Member Roster &amp; RBAC Roles</h2>
                <div className="divide-y divide-[#F0ECE1]">
                  {members.map((m) => (
                    <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-mono text-[#20242C]">{m.userId}</p>
                        <span className="text-[11px] uppercase text-[#76556F] font-semibold">{m.role}</span>
                      </div>
                      {m.role !== "owner" && (
                        <div className="flex gap-2">
                          {(["admin", "contributor", "viewer"] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleChangeRole(m.userId, r)}
                              className={`px-3 py-1.5 rounded-lg capitalize ${
                                m.role === r ? "bg-[#20242C] text-white" : "bg-[#F0ECE1] text-[#20242C]"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "settings" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                  <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                    Space Metadata &amp; Privacy
                  </h2>
                  <form onSubmit={handleSaveSettings} className="space-y-3">
                    <div>
                      <label htmlFor="spd-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Space Name
                      </label>
                      <input
                        id="spd-name"
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="spd-desc" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Description
                      </label>
                      <textarea
                        id="spd-desc"
                        rows={3}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                      />
                    </div>
                    <button type="submit" className="min-h-[44px] px-5 py-2 rounded-xl bg-[#20242C] text-white text-xs font-semibold">
                      Save Space Settings
                    </button>
                  </form>
                </section>
                <section className="lg:col-span-5 bg-white rounded-2xl border border-[#F5C6C6] p-6 space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#B6423E]">Danger Zone</h2>
                  <p className="text-xs text-[#5C5955]">
                    Archiving removes this space from active family views while preserving local export options.
                  </p>
                  <button
                    type="button"
                    onClick={handleArchiveSpace}
                    className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-[#B6423E] text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Archive Memory Space
                  </button>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
