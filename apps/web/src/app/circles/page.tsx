"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, MailPlus, Trash2, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  getStoredSession,
  MemorySpaceDTO,
  NotificationDTO,
  SpaceProfileDTO,
} from "@/lib/api";

interface MemberRecord {
  id: string;
  spaceId: string;
  userId: string;
  role: "owner" | "admin" | "contributor" | "viewer";
  joinedAt: string;
}

export default function CirclesPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [profiles, setProfiles] = useState<SpaceProfileDTO[]>([]);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "contributor" | "viewer">("contributor");
  const [redeemToken, setRedeemToken] = useState("");

  // Profile form
  const [profileName, setProfileName] = useState("");
  const [profileRel, setProfileRel] = useState("");
  const [profileType, setProfileType] = useState<SpaceProfileDTO["type"]>("child");

  const loadCircleData = useCallback(async (targetSpaceId: string) => {
    if (!targetSpaceId) return;
    try {
      const [memRes, profRes, notifRes] = await Promise.allSettled([
        apiRequest<{ members?: MemberRecord[]; items?: MemberRecord[] } | MemberRecord[]>(
          `/collab/spaces/${targetSpaceId}/members`
        ),
        apiRequest<{ profiles?: SpaceProfileDTO[]; items?: SpaceProfileDTO[] } | SpaceProfileDTO[]>(
          `/spaces/${targetSpaceId}/profiles`
        ),
        apiRequest<{ notifications?: NotificationDTO[]; items?: NotificationDTO[] } | NotificationDTO[]>(
          "/notifications"
        ),
      ]);

      if (memRes.status === "fulfilled") {
        const val = memRes.value;
        setMembers(Array.isArray(val) ? val : val.members || val.items || []);
      }
      if (profRes.status === "fulfilled") {
        const val = profRes.value;
        setProfiles(Array.isArray(val) ? val : val.profiles || val.items || []);
      }
      if (notifRes.status === "fulfilled") {
        const val = notifRes.value;
        setNotifications(Array.isArray(val) ? val : val.notifications || val.items || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load family circle details.");
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
          await loadCircleData(list[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load family spaces.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadCircleData]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !inviteEmail.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const res = await apiRequest<{ inviteToken?: string; invitation?: { token?: string }; token?: string }>(
        `/collab/spaces/${spaceId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({ inviteeEmail: inviteEmail.trim(), role: inviteRole }),
        }
      );
      const token = res.inviteToken || res.invitation?.token || res.token;
      setInviteEmail("");
      setNotice(
        token
          ? `Invitation created! Share this invite token securely: ${token}`
          : "Invitation dispatched to family member."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation.");
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemToken.trim()) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest("/collab/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: redeemToken.trim() }),
      });
      setRedeemToken("");
      setNotice("Invitation accepted! Refreshing space members...");
      await loadCircleData(spaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!spaceId) return;
    setError(null);
    try {
      await apiRequest(`/collab/spaces/${spaceId}/members/${userId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !profileName.trim()) return;
    setError(null);
    try {
      const created = await apiRequest<{ profile?: SpaceProfileDTO } | SpaceProfileDTO>(
        `/spaces/${spaceId}/profiles`,
        {
          method: "POST",
          body: JSON.stringify({
            name: profileName.trim(),
            relationship: profileRel.trim() || undefined,
            type: profileType,
          }),
        }
      );
      const profile =
        "profile" in created && created.profile ? created.profile : (created as SpaceProfileDTO);
      setProfiles((prev) => [...prev, profile]);
      setProfileName("");
      setProfileRel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile.");
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notification.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "POST", body: JSON.stringify({}) });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark all notifications read.");
    }
  };

  return (
    <AppShell
      title="Family Circles & Profiles"
      subtitle="Collaborate with trusted relatives, assign RBAC roles, and tag loved ones across generations."
    >
      {!signedIn && !loading ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center">
          <p className="text-sm text-[#5C5955] mb-4">Sign in to manage circles and invitations.</p>
          <Link href="/auth" className="inline-flex px-5 py-2.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-sm font-medium">
            Sign In
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="circle-space" className="text-xs font-semibold text-[#20242C]">
                Active Space:
              </label>
              <select
                id="circle-space"
                value={spaceId}
                onChange={(e) => {
                  setSpaceId(e.target.value);
                  loadCircleData(e.target.value);
                }}
                className="px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-medium"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B] break-all">
              {notice}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Members & Invitations */}
            <section className="lg:col-span-6 space-y-6">
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6">
                <h2 className="font-serif text-lg font-bold text-[#20242C] mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  Circle Members ({members.length})
                </h2>
                {members.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">No members fetched for this space yet.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {members.map((m) => (
                      <li
                        key={m.id || m.userId}
                        className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-[#20242C] truncate">{m.userId}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E7E2DA] text-[10px] uppercase font-medium text-[#76556F]">
                            {m.role}
                          </span>
                        </div>
                        {m.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId)}
                            aria-label={`Remove member ${m.userId}`}
                            className="p-2 rounded-lg text-[#B6423E] hover:bg-[#FDF2F2]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <MailPlus className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
                  Invite Family Member
                </h2>
                <form onSubmit={handleCreateInvitation} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="invite-email" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Recipient Email
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="julian@family.local"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="invite-role" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Role
                    </label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as "admin" | "contributor" | "viewer")
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="contributor">Contributor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium hover:bg-[#343A46]"
                    >
                      Generate Invite Token
                    </button>
                  </div>
                </form>

                <form onSubmit={handleAcceptInvite} className="pt-4 border-t border-[#F0ECE1] flex gap-2">
                  <label htmlFor="redeem-token" className="sr-only">
                    Invitation Token to Accept
                  </label>
                  <input
                    id="redeem-token"
                    type="text"
                    value={redeemToken}
                    onChange={(e) => setRedeemToken(e.target.value)}
                    placeholder="Redeem an invite token..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#5F735E] text-[#FFFFFF] text-xs font-medium"
                  >
                    Accept
                  </button>
                </form>
              </div>
            </section>

            {/* Subject Profiles & Notifications */}
            <section className="lg:col-span-6 space-y-6">
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6">
                <h2 className="font-serif text-lg font-bold text-[#20242C] mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  Loved Ones & Milestones Profiles
                </h2>
                {profiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                    {profiles.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]">
                        <p className="text-xs font-bold text-[#20242C]">{p.name}</p>
                        <p className="text-[11px] text-[#5C5955]">
                          {p.type} {p.relationship ? `• ${p.relationship}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleCreateProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="prof-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Name
                    </label>
                    <input
                      id="prof-name"
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Clara Vance"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="prof-type" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Category
                    </label>
                    <select
                      id="prof-type"
                      value={profileType}
                      onChange={(e) => setProfileType(e.target.value as SpaceProfileDTO["type"])}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    >
                      <option value="child">Child</option>
                      <option value="parent">Parent / Elder</option>
                      <option value="individual">Individual</option>
                      <option value="couple">Couple</option>
                      <option value="pet">Pet</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="prof-rel" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Relationship
                    </label>
                    <input
                      id="prof-rel"
                      type="text"
                      value={profileRel}
                      onChange={(e) => setProfileRel(e.target.value)}
                      placeholder="Grandmother"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#76556F] text-[#FFFFFF] text-xs font-medium"
                    >
                      Add Profile
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                    Notifications
                  </h2>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-[#76556F] hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">No notifications yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          n.isRead
                            ? "bg-[#F7F4EE] border-[#E7E2DA]"
                            : "bg-[#FAF6F8] border-[#76556F]/30"
                        }`}
                      >
                        <div className="text-xs">
                          <p className="font-semibold text-[#20242C]">{n.title}</p>
                          <p className="text-[#5C5955] mt-0.5">{n.body}</p>
                        </div>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            aria-label="Mark notification read"
                            className="p-1.5 rounded-lg bg-[#FFFFFF] border border-[#E7E2DA] text-[#5F735E]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
