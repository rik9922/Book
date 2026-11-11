"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  FolderPlus,
  HardDrive,
  Images,
  RefreshCw,
  Users,
  Bell,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  AuthUser,
  BookDTO,
  flushOfflineQueue,
  getOfflineQueue,
  getStoredSession,
  MemorySpaceDTO,
  NotificationDTO,
  openAuthModal,
  subscribeAuthChange,
} from "@/lib/api";

interface QuotaSummary {
  usedBytes: number;
  maxBytes?: number;
  quotaBytes?: number;
  usedPercentage?: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [quota, setQuota] = useState<QuotaSummary | null>(null);
  const [books, setBooks] = useState<BookDTO[]>([]);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Space form state
  const [spaceName, setSpaceName] = useState("");
  const [spaceType, setSpaceType] = useState<MemorySpaceDTO["type"]>("family");
  const [spaceDesc, setSpaceDesc] = useState("");
  const [creatingSpace, setCreatingSpace] = useState(false);

  const loadSpaceDetails = useCallback(async (spaceId: string) => {
    if (!spaceId) return;
    try {
      const [quotaRes, booksRes] = await Promise.allSettled([
        apiRequest<QuotaSummary>(`/media/spaces/${spaceId}/quota`),
        apiRequest<{ books?: BookDTO[]; items?: BookDTO[] } | BookDTO[]>(
          `/spaces/${spaceId}/books`
        ),
      ]);

      if (quotaRes.status === "fulfilled") {
        setQuota(quotaRes.value);
      }
      if (booksRes.status === "fulfilled") {
        const val = booksRes.value;
        const list = Array.isArray(val) ? val : val.books || val.items || [];
        setBooks(list);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load space telemetry.");
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOfflineCount(getOfflineQueue().length);

    const session = getStoredSession();
    setUser(session.user);
    if (!session.accessToken) {
      setLoading(false);
      return;
    }

    try {
      const [spacesRes, notifRes] = await Promise.allSettled([
        apiRequest<{ spaces?: MemorySpaceDTO[]; items?: MemorySpaceDTO[] } | MemorySpaceDTO[]>(
          "/spaces"
        ),
        apiRequest<{ notifications?: NotificationDTO[]; items?: NotificationDTO[] } | NotificationDTO[]>(
          "/notifications"
        ),
      ]);

      if (spacesRes.status === "fulfilled") {
        const val = spacesRes.value;
        const list = Array.isArray(val) ? val : val.spaces || val.items || [];
        setSpaces(list);
        if (list.length > 0) {
          const initialId = list[0].id;
          setSelectedSpaceId(initialId);
          await loadSpaceDetails(initialId);
        }
      }

      if (notifRes.status === "fulfilled") {
        const val = notifRes.value;
        const list = Array.isArray(val) ? val : val.notifications || val.items || [];
        setNotifications(list);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [loadSpaceDetails]);

  useEffect(() => {
    loadDashboard();
    const unsubscribe = subscribeAuthChange(() => {
      loadDashboard();
    });
    return unsubscribe;
  }, [loadDashboard]);

  const handleSelectSpace = async (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    await loadSpaceDetails(spaceId);
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim()) return;
    setCreatingSpace(true);
    setError(null);

    try {
      const created = await apiRequest<{ space?: MemorySpaceDTO } | MemorySpaceDTO>("/spaces", {
        method: "POST",
        body: JSON.stringify({
          name: spaceName.trim(),
          type: spaceType,
          description: spaceDesc.trim() || undefined,
        }),
      });
      const space = "space" in created && created.space ? created.space : (created as MemorySpaceDTO);
      setSpaces((prev) => [space, ...prev]);
      setSelectedSpaceId(space.id);
      setSpaceName("");
      setSpaceDesc("");
      await loadSpaceDetails(space.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create space.");
    } finally {
      setCreatingSpace(false);
    }
  };

  const handleSyncOfflineQueue = async () => {
    const result = await flushOfflineQueue();
    setOfflineCount(result.remaining);
    setSyncMessage(`Synced ${result.synced} queued update(s). ${result.remaining} remaining.`);
    await loadDashboard();
  };

  const effectiveMaxBytes = quota?.maxBytes ?? quota?.quotaBytes ?? 500 * 1024 * 1024;
  const usedMb = quota ? (quota.usedBytes / (1024 * 1024)).toFixed(1) : "0.0";
  const quotaMb = (effectiveMaxBytes / (1024 * 1024)).toFixed(0);
  const pct =
    quota && effectiveMaxBytes > 0
      ? Math.min(100, Math.round((quota.usedBytes / effectiveMaxBytes) * 100))
      : 0;

  return (
    <AppShell
      title={user ? `Welcome back, ${user.fullName}` : "Living Archive Dashboard"}
      subtitle="Manage your private family spaces, track archival storage quota, and jump into your heirloom editions."
    >
      {!user && !loading && (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center shadow-sm">
          <h2 className="font-serif text-xl font-bold text-[#20242C] mb-2">
            Sign in to access your Family Vaults
          </h2>
          <p className="text-sm text-[#5C5955] max-w-md mx-auto mb-5">
            Your private archives, media quota, and print studio live in authenticated Memoria spaces.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-[#FFFFFF] text-sm font-medium cursor-pointer shadow-xs transition-colors"
          >
            Sign In or Create Account
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]"
        >
          {error}
        </div>
      )}

      {syncMessage && (
        <div
          role="status"
          className="mb-6 p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B]"
        >
          {syncMessage}
        </div>
      )}

      {user && (
        <div className="space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5">
              <div className="flex items-center justify-between text-xs text-[#5C5955] mb-2">
                <span>Family Spaces</span>
                <Users className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
              </div>
              <p className="text-2xl font-serif font-bold text-[#20242C]">{spaces.length}</p>
            </div>

            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5">
              <div className="flex items-center justify-between text-xs text-[#5C5955] mb-2">
                <span>Book Editions</span>
                <BookOpen className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
              </div>
              <p className="text-2xl font-serif font-bold text-[#20242C]">{books.length}</p>
            </div>

            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5">
              <div className="flex items-center justify-between text-xs text-[#5C5955] mb-2">
                <span>Archival Quota</span>
                <HardDrive className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-[#20242C]">
                {usedMb} MB / {quotaMb} MB
              </p>
              <div className="mt-2 h-2 rounded-full bg-[#F0ECE1] overflow-hidden">
                <div
                  className="h-full bg-[#5F735E]"
                  style={{ width: `${pct}%` }}
                  aria-label={`Storage usage ${pct}%`}
                />
              </div>
            </div>

            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#5C5955] mb-2">
                <span>Offline Sync Queue</span>
                <RefreshCw className="w-4 h-4 text-[#20242C]" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl font-serif font-bold text-[#20242C]">{offlineCount}</span>
                <button
                  type="button"
                  onClick={handleSyncOfflineQueue}
                  disabled={offlineCount === 0}
                  className="px-3 py-1.5 rounded-lg bg-[#20242C] text-[#FFFFFF] text-xs font-medium disabled:opacity-40"
                >
                  Sync Now
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Spaces Selector + Create Space */}
            <section className="lg:col-span-7 space-y-6">
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">
                    Your Memory Spaces
                  </h2>
                  <Link
                    href="/archive"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#76556F] hover:underline"
                  >
                    <Images className="w-3.5 h-3.5" aria-hidden="true" />
                    Open Archive
                  </Link>
                </div>

                {spaces.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">
                    No spaces yet. Create your first personal or family archive below.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {spaces.map((space) => {
                      const active = space.id === selectedSpaceId;
                      return (
                        <button
                          key={space.id}
                          type="button"
                          onClick={() => handleSelectSpace(space.id)}
                          className={`text-left p-4 rounded-xl border transition-all ${
                            active
                              ? "border-[#76556F] bg-[#FAF6F8] ring-1 ring-[#76556F]"
                              : "border-[#E7E2DA] bg-[#F7F4EE] hover:border-[#8D857A]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-serif font-bold text-sm text-[#20242C]">
                              {space.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-[#FFFFFF] border border-[#E7E2DA] text-[#5C5955]">
                              {space.type}
                            </span>
                          </div>
                          <p className="text-xs text-[#5C5955] line-clamp-2">
                            {space.description || "Curated family vault"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6">
                <h2 className="font-serif text-lg font-bold text-[#20242C] mb-4 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  Create New Memory Space
                </h2>
                <form onSubmit={handleCreateSpace} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="space-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Space Name
                    </label>
                    <input
                      id="space-name"
                      type="text"
                      required
                      value={spaceName}
                      onChange={(e) => setSpaceName(e.target.value)}
                      placeholder="Vance Family Heirloom"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                    />
                  </div>
                  <div>
                    <label htmlFor="space-type" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Space Type
                    </label>
                    <select
                      id="space-type"
                      value={spaceType}
                      onChange={(e) => setSpaceType(e.target.value as MemorySpaceDTO["type"])}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                    >
                      <option value="family">Family Vault</option>
                      <option value="personal">Personal Journal</option>
                      <option value="event">Celebration / Event</option>
                      <option value="journey">Journey / Milestone</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="space-desc" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Description (Optional)
                    </label>
                    <input
                      id="space-desc"
                      type="text"
                      value={spaceDesc}
                      onChange={(e) => setSpaceDesc(e.target.value)}
                      placeholder="Generational photographs, letters, and oral histories"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={creatingSpace}
                      className="px-5 py-2.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium hover:bg-[#343A46] disabled:opacity-50"
                    >
                      {creatingSpace ? "Creating..." : "Create Space"}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* Right Column: Bookshelf & Notifications */}
            <aside className="lg:col-span-5 space-y-6">
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">
                    Recent Editions
                  </h2>
                  <Link href="/studio" className="text-xs font-medium text-[#76556F] hover:underline">
                    Open Studio
                  </Link>
                </div>
                {books.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">
                    No heirloom books crafted for this space yet.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {books.slice(0, 4).map((b) => (
                      <li
                        key={b.id}
                        className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#20242C] truncate">{b.title}</p>
                          <p className="text-[11px] text-[#5C5955]">
                            {b.isFrozenForPrint ? "Edition Frozen for Print" : "Editable Draft"}
                          </p>
                        </div>
                        <span
                          className="w-5 h-5 rounded-full border border-[#E7E2DA] shrink-0"
                          style={{ backgroundColor: b.coverColor }}
                          aria-hidden="true"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                    Activity & Alerts
                  </h2>
                  <Link href="/circles" className="text-xs font-medium text-[#76556F] hover:underline">
                    View All
                  </Link>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">You are all caught up.</p>
                ) : (
                  <ul className="space-y-2">
                    {notifications.slice(0, 5).map((n) => (
                      <li key={n.id} className="p-3 rounded-xl bg-[#F7F4EE] text-xs">
                        <p className="font-semibold text-[#20242C]">{n.title}</p>
                        <p className="text-[#5C5955] mt-0.5">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </AppShell>
  );
}
