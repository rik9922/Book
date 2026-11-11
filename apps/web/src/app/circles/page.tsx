"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, Copy, Link2, MailPlus, RefreshCw, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  createCustomRole,
  createShareLink,
  getSpaceActivity,
  getStoredSession,
  listCustomRoles,
  listShareLinks,
  listSpaceInvitations,
  MemorySpaceDTO,
  NotificationDTO,
  resendSpaceInvitation,
  revokeSpaceInvitation,
  SpaceInvitationDTO,
  SpaceProfileDTO,
  updateSpaceMemberRole,
} from "@/lib/api";

interface MemberRecord {
  id: string;
  spaceId: string;
  userId: string;
  role: "owner" | "admin" | "contributor" | "viewer";
  permissions?: Record<string, boolean>;
  joinedAt: string;
}

export default function CirclesPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitationDTO[]>([]);
  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [shareLinks, setShareLinks] = useState<Array<{ id: string; token: string; hasPassphrase: boolean; allowDownloads: boolean; expiresAt: string; accessCount: number }>>([]);
  const [activity, setActivity] = useState<Array<{ id: string; kind: string; title: string; timestamp: string }>>([]);
  const [profiles, setProfiles] = useState<SpaceProfileDTO[]>([]);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "contributor" | "viewer">("contributor");
  const [redeemToken, setRedeemToken] = useState("");

  // Custom role & Share link forms
  const [customRoleName, setCustomRoleName] = useState("");
  const [sharePassphrase, setSharePassphrase] = useState("");
  const [shareAllowDownloads, setShareAllowDownloads] = useState(false);

  // Profile form
  const [profileName, setProfileName] = useState("");
  const [profileRel, setProfileRel] = useState("");
  const [profileType, setProfileType] = useState<SpaceProfileDTO["type"]>("child");

  const loadCircleData = useCallback(async (targetSpaceId: string) => {
    if (!targetSpaceId) return;
    try {
      const [memRes, profRes, notifRes, invRes, roleRes, linkRes, actRes] = await Promise.allSettled([
        apiRequest<{ members?: MemberRecord[]; items?: MemberRecord[] } | MemberRecord[]>(
          `/collab/spaces/${targetSpaceId}/members`
        ),
        apiRequest<{ profiles?: SpaceProfileDTO[]; items?: SpaceProfileDTO[] } | SpaceProfileDTO[]>(
          `/spaces/${targetSpaceId}/profiles`
        ),
        apiRequest<{ notifications?: NotificationDTO[]; items?: NotificationDTO[] } | NotificationDTO[]>(
          "/notifications"
        ),
        listSpaceInvitations(targetSpaceId),
        listCustomRoles(targetSpaceId),
        listShareLinks(targetSpaceId),
        getSpaceActivity(targetSpaceId),
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
      if (invRes.status === "fulfilled") setInvitations(invRes.value || []);
      if (roleRes.status === "fulfilled") setCustomRoles(roleRes.value || []);
      if (linkRes.status === "fulfilled") setShareLinks(linkRes.value || []);
      if (actRes.status === "fulfilled") setActivity(actRes.value || []);
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

  const handleUpdateRole = async (
    userId: string,
    role: "admin" | "contributor" | "viewer",
    permissions?: Record<string, boolean>
  ) => {
    if (!spaceId) return;
    const previous = members;
    setMembers((prev) =>
      prev.map((m) =>
        m.userId === userId
          ? { ...m, role, permissions: permissions ?? m.permissions }
          : m
      )
    );
    try {
      const updated = await updateSpaceMemberRole(spaceId, userId, role, permissions);
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: updated.role, permissions: updated.permissions } : m))
      );
      setNotice(`Updated member role & capabilities (${role}).`);
    } catch (err) {
      setMembers(previous);
      setError(err instanceof Error ? err.message : "Failed to update role.");
    }
  };

  const handleResendInvite = async (invId: string) => {
    if (!spaceId) return;
    try {
      await resendSpaceInvitation(spaceId, invId);
      setNotice("Invitation reminder dispatched.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invite.");
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    if (!spaceId) return;
    try {
      await revokeSpaceInvitation(spaceId, invId);
      setInvitations((prev) => prev.map((i) => (i.id === invId ? { ...i, status: "revoked" } : i)));
      setNotice("Invitation revoked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite.");
    }
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !customRoleName.trim()) return;
    try {
      const created: any = await createCustomRole(spaceId, {
        name: customRoleName.trim(),
        permissions: { can_create_memories: true, can_edit_books: false, can_invite: false },
      });
      setCustomRoles((prev) => [created, ...prev]);
      setCustomRoleName("");
      setNotice(`Created custom role "${created.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create custom role.");
    }
  };

  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId) return;
    try {
      const created = await createShareLink(spaceId, {
        passphrase: sharePassphrase.trim() || undefined,
        allowDownloads: shareAllowDownloads,
        expiresInDays: 30,
      });
      setShareLinks((prev) => [{ ...created, allowDownloads: shareAllowDownloads, accessCount: 0 }, ...prev]);
      setSharePassphrase("");
      setNotice(`Generated share link: /share/${created.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share link.");
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
                        className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-[#20242C] truncate">{m.userId}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E7E2DA] text-[10px] uppercase font-medium text-[#76556F]">
                              {m.role}
                            </span>
                          </div>
                          {m.role !== "owner" && (
                            <div className="flex items-center gap-2">
                              <select
                                aria-label={`Role for ${m.userId}`}
                                value={m.role}
                                onChange={(e) =>
                                  handleUpdateRole(m.userId, e.target.value as "admin" | "contributor" | "viewer")
                                }
                                className="px-2 py-1 rounded-lg bg-white border border-[#E7E2DA] text-[11px]"
                              >
                                <option value="admin">Admin</option>
                                <option value="contributor">Contributor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.userId)}
                                aria-label={`Remove member ${m.userId}`}
                                className="p-2 rounded-lg text-[#B6423E] hover:bg-[#FDF2F2]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {m.role !== "owner" && (
                          <div className="flex flex-wrap gap-3 pt-1 border-t border-[#E7E2DA]/70 text-[11px] text-[#5C5955]">
                            {(
                              [
                                { key: "can_create_memories", label: "Preserve Memories" },
                                { key: "can_edit_books", label: "Edit Books" },
                                { key: "can_invite", label: "Invite Members" },
                              ] as const
                            ).map((cap) => {
                              const currentPerms = m.permissions || {
                                can_create_memories: m.role !== "viewer",
                                can_edit_books: m.role === "admin",
                                can_invite: m.role === "admin",
                              };
                              const checked = Boolean(currentPerms[cap.key]);
                              return (
                                <label key={cap.key} className="inline-flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      handleUpdateRole(m.userId, m.role as "admin" | "contributor" | "viewer", {
                                        ...currentPerms,
                                        [cap.key]: e.target.checked,
                                      })
                                    }
                                  />
                                  <span>{cap.label}</span>
                                </label>
                              );
                            })}
                          </div>
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

          {/* Outbound Invitations, Custom Roles, Passphrase Share Links & Activity Stream (PWA-49..53) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                Outbound Invitations ({invitations.length})
              </h2>
              {invitations.length === 0 ? (
                <p className="text-xs text-[#5C5955]">No invitations issued for this space yet.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#20242C]">{inv.inviteeEmail}</p>
                        <p className="text-[11px] text-[#5C5955] uppercase">{inv.role} • {inv.status}</p>
                      </div>
                      {inv.status === "pending" && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleResendInvite(inv.id)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-[#E7E2DA] text-[11px] font-medium"
                          >
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#FDF2F2] text-[#B6423E] text-[11px] font-medium"
                          >
                            Revoke
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
                Custom Space Roles ({customRoles.length})
              </h2>
              <form onSubmit={handleCreateCustomRole} className="flex gap-2">
                <input
                  type="text"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder="e.g. Junior Contributor"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#20242C] text-white text-xs font-semibold">
                  Create Role
                </button>
              </form>
              {customRoles.length > 0 && (
                <ul className="space-y-1.5 text-xs">
                  {customRoles.map((r) => (
                    <li key={r.id} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] font-semibold text-[#20242C]">
                      {r.name}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                Passphrase-Protected Share Links ({shareLinks.length})
              </h2>
              <form onSubmit={handleCreateShareLink} className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    value={sharePassphrase}
                    onChange={(e) => setSharePassphrase(e.target.value)}
                    placeholder="Optional passphrase"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#20242C]">
                    <input
                      type="checkbox"
                      checked={shareAllowDownloads}
                      onChange={(e) => setShareAllowDownloads(e.target.checked)}
                    />
                    Allow downloads
                  </label>
                </div>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold">
                  Generate Share Link
                </button>
              </form>
              {shareLinks.length > 0 && (
                <ul className="space-y-2 text-xs">
                  {shareLinks.map((l) => (
                    <li key={l.id} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between gap-2">
                      <Link href={`/share/${l.token}`} className="font-mono text-[#76556F] hover:underline truncate">
                        /share/{l.token}
                      </Link>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#5C5955]">
                        <Copy className="w-3 h-3" /> {l.hasPassphrase ? "Protected" : "Open"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#20242C]">
                Space Activity Stream ({activity.length})
              </h2>
              {activity.length === 0 ? (
                <p className="text-xs text-[#5C5955]">No contributions recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-xs max-h-56 overflow-y-auto">
                  {activity.slice(0, 15).map((a) => (
                    <li key={a.id} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between">
                      <span><strong>{a.title}</strong> ({a.kind.replace("_", " ")})</span>
                      <span className="text-[11px] text-[#5C5955]">{new Date(a.timestamp).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
