"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Save, Trash2, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  createProfile,
  deleteProfile,
  fetchSpaces,
  getStoredSession,
  listProfiles,
  MemoryDTO,
  MemorySpaceDTO,
  SpaceProfileDTO,
  updateProfile,
} from "@/lib/api";

export default function ProfilesPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [profiles, setProfiles] = useState<SpaceProfileDTO[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SpaceProfileDTO | null>(null);
  const [linkedMemories, setLinkedMemories] = useState<MemoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<SpaceProfileDTO["type"]>("child");
  const [relationship, setRelationship] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [editName, setEditName] = useState("");
  const [editRel, setEditRel] = useState("");

  const loadProfiles = useCallback(async (targetSpaceId: string) => {
    if (!targetSpaceId) return;
    try {
      const list = await listProfiles(targetSpaceId);
      setProfiles(list);
      if (list.length > 0) {
        setSelectedProfile(list[0]);
        setEditName(list[0].name);
        setEditRel(list[0].relationship || "");
      } else {
        setSelectedProfile(null);
        setLinkedMemories([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profiles.");
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
          await loadProfiles(list[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load spaces.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadProfiles]);

  useEffect(() => {
    if (!spaceId || !selectedProfile) return;
    apiRequest<{ items?: MemoryDTO[] } | MemoryDTO[]>(
      `/spaces/${spaceId}/memories?limit=25&profileId=${selectedProfile.id}`
    )
      .then((res) => setLinkedMemories(Array.isArray(res) ? res : res.items || []))
      .catch(() => setLinkedMemories([]));
  }, [spaceId, selectedProfile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !name.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const created = await createProfile(spaceId, {
        name: name.trim(),
        type,
        relationship: relationship.trim() || undefined,
        birthDate: birthDate || undefined,
      });
      setProfiles((prev) => [...prev, created]);
      setSelectedProfile(created);
      setEditName(created.name);
      setEditRel(created.relationship || "");
      setName("");
      setRelationship("");
      setBirthDate("");
      setNotice(`Added profile "${created.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !selectedProfile || !editName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const updated = await updateProfile(spaceId, selectedProfile.id, {
        name: editName.trim(),
        relationship: editRel.trim() || null,
      });
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedProfile(updated);
      setNotice(`Updated profile "${updated.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    }
  };

  const handleDelete = async (prof: SpaceProfileDTO) => {
    if (!spaceId) return;
    setError(null);
    setNotice(null);
    try {
      await deleteProfile(spaceId, prof.id);
      const next = profiles.filter((p) => p.id !== prof.id);
      setProfiles(next);
      setSelectedProfile(next[0] || null);
      setNotice(`Removed profile "${prof.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove profile.");
    }
  };

  return (
    <AppShell
      title="People & Profiles Directory"
      subtitle="Organize loved ones, children, elders, couples, and pets to connect every memory across time."
    >
      {!signedIn && !loading ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center max-w-xl mx-auto space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#20242C]">Sign in to view Profiles</h2>
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

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="prof-space-select" className="text-xs font-semibold text-[#20242C]">
                Memory Space:
              </label>
              <select
                id="prof-space-select"
                value={spaceId}
                onChange={(e) => {
                  setSpaceId(e.target.value);
                  loadProfiles(e.target.value);
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
            <span className="text-xs text-[#5C5955]">{profiles.length} profile(s)</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  Add Profile
                </h2>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label htmlFor="new-prof-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Full Name
                    </label>
                    <input
                      id="new-prof-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Eleanor Bennett"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="new-prof-type" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Category
                      </label>
                      <select
                        id="new-prof-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as SpaceProfileDTO["type"])}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                      >
                        <option value="child">Child</option>
                        <option value="parent">Parent</option>
                        <option value="individual">Individual</option>
                        <option value="couple">Couple</option>
                        <option value="pet">Pet</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="new-prof-rel" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Relationship
                      </label>
                      <input
                        id="new-prof-rel"
                        type="text"
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        placeholder="Grandmother"
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="new-prof-dob" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Birthdate (optional)
                    </label>
                    <input
                      id="new-prof-dob"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
                  >
                    Create Profile
                  </button>
                </form>
              </section>

              <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
                  Directory
                </h2>
                {profiles.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">No profiles in this space yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {profiles.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfile(p);
                            setEditName(p.name);
                            setEditRel(p.relationship || "");
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-colors ${
                            selectedProfile?.id === p.id
                              ? "bg-[#FAF6F8] border-[#76556F]"
                              : "bg-[#F7F4EE] border-[#E7E2DA]"
                          }`}
                        >
                          <p className="font-serif text-sm font-bold text-[#20242C]">{p.name}</p>
                          <p className="text-[11px] text-[#5C5955] capitalize">
                            {p.type} {p.relationship ? `• ${p.relationship}` : ""}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-5">
              {selectedProfile ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#76556F]">
                        {selectedProfile.type} Profile
                      </span>
                      <h2 className="font-serif text-2xl font-bold text-[#20242C]">
                        {selectedProfile.name}
                      </h2>
                      {selectedProfile.birthDate && (
                        <p className="text-xs text-[#5C5955] flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                          {selectedProfile.birthDate}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profiles/${selectedProfile.id}?spaceId=${encodeURIComponent(spaceId)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                      >
                        Full Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedProfile)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FDF2F2] text-xs font-medium text-[#B6423E]"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#F0ECE1]">
                    <div>
                      <label htmlFor="edit-prof-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Edit Name
                      </label>
                      <input
                        id="edit-prof-name"
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-prof-rel" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Edit Relationship
                      </label>
                      <input
                        id="edit-prof-rel"
                        type="text"
                        value={editRel}
                        onChange={(e) => setEditRel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20242C] text-white text-xs font-medium"
                      >
                        <Save className="w-3.5 h-3.5" aria-hidden="true" />
                        Update Profile
                      </button>
                    </div>
                  </form>

                  <div className="pt-4 border-t border-[#F0ECE1] space-y-3">
                    <h3 className="font-serif text-base font-bold text-[#20242C]">
                      Linked Memories ({linkedMemories.length})
                    </h3>
                    {linkedMemories.length === 0 ? (
                      <p className="text-xs text-[#5C5955]">
                        No memories tagged to {selectedProfile.name} yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {linkedMemories.map((m) => (
                          <li key={m.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs">
                            <p className="font-semibold text-[#20242C]">{m.title}</p>
                            <p className="text-[#5C5955] mt-0.5 line-clamp-2">{m.content}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[#5C5955]">Select or create a profile to inspect linked memories.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
