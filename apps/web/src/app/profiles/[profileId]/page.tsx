"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, Save, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  fetchSpaces,
  getStoredSession,
  listProfiles,
  MemoryDTO,
  SpaceProfileDTO,
  updateProfile,
} from "@/lib/api";

export default function ProfileDetailPage() {
  const params = useParams<{ profileId: string }>();
  const sp = useSearchParams();
  const profileId = params?.profileId || "";
  const spaceIdParam = sp.get("spaceId") || "";

  const [spaceId, setSpaceId] = useState(spaceIdParam);
  const [profile, setProfile] = useState<SpaceProfileDTO | null>(null);
  const [memories, setMemories] = useState<MemoryDTO[]>([]);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredSession().accessToken) return;
    (async () => {
      try {
        let targetSpace = spaceIdParam;
        if (!targetSpace) {
          const spaces = await fetchSpaces();
          targetSpace = spaces[0]?.id || "";
        }
        if (!targetSpace) return;
        setSpaceId(targetSpace);
        const list = await listProfiles(targetSpace);
        const match = list.find((p) => p.id === profileId) || null;
        if (match) {
          setProfile(match);
          setName(match.name);
          setRelationship(match.relationship || "");
          setBirthDate(match.birthDate || "");
          const memRes = await apiRequest<{ items?: MemoryDTO[] } | MemoryDTO[]>(
            `/spaces/${targetSpace}/memories?profileId=${match.id}`
          );
          setMemories(Array.isArray(memRes) ? memRes : memRes.items || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load profile.");
      }
    })();
  }, [profileId, spaceIdParam]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !profile || !name.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const updated = await updateProfile(spaceId, profile.id, {
        name: name.trim(),
        relationship: relationship.trim() || null,
        birthDate: birthDate || null,
      });
      setProfile(updated);
      setNotice("Profile details updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    }
  };

  return (
    <AppShell
      title={profile ? profile.name : "Family Profile Detail"}
      subtitle="View life milestones, relationship biography, and all memories linked to this loved one."
    >
      <div className="space-y-6">
        <Link href="/profiles" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#76556F] hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Profiles Directory
        </Link>

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

        {profile ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-5 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FAF6F8] border border-[#E7E2DA] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#76556F]" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#20242C]">{profile.name}</h2>
                  <p className="text-xs text-[#5C5955] capitalize">
                    {profile.type} {profile.relationship ? `• ${profile.relationship}` : ""}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-[#F0ECE1]">
                <div>
                  <label htmlFor="pd-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Name
                  </label>
                  <input
                    id="pd-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="pd-rel" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Relationship
                  </label>
                  <input
                    id="pd-rel"
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="pd-bday" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Birthdate / Milestone Date
                  </label>
                  <input
                    id="pd-bday"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                </div>
                <button type="submit" className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold">
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  Save Profile
                </button>
              </form>
            </section>

            <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#20242C]">
                Linked Memories ({memories.length})
              </h2>
              {memories.length === 0 ? (
                <p className="text-xs text-[#5C5955]">No memories tagged with {profile.name} yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {memories.map((m) => (
                    <div key={m.id} className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs space-y-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#5C5955]">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        {new Date(m.capturedAt).toLocaleDateString()}
                      </span>
                      <p className="font-serif text-base font-bold text-[#20242C]">{m.title}</p>
                      <p className="text-[#5C5955] line-clamp-2">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E7E2DA] p-8 text-xs text-[#5C5955]">
            Loading profile or sign in required...
          </div>
        )}
      </div>
    </AppShell>
  );
}
