"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FolderPlus, MailPlus, Sparkles, Upload, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  createProfile,
  createSpace,
  fetchSpaces,
  getStoredSession,
  MemorySpaceDTO,
  saveOnboardingPurpose,
  SpaceProfileDTO,
  uploadFileToMediaService,
} from "@/lib/api";

const PURPOSES: Array<{ id: MemorySpaceDTO["type"]; label: string; desc: string }> = [
  { id: "family", label: "Family Heritage Vault", desc: "Multi-generational stories, recipes, and family trees." },
  { id: "personal", label: "Childhood & Personal Milestones", desc: "Year-by-year photos, artwork, and voice notes." },
  { id: "event", label: "Wedding & Anniversary Book", desc: "Gather guest toasts, candid frames, and vows." },
  { id: "journey", label: "Travel & Sabbatical Journal", desc: "Chronological landscapes, postcards, and dispatches." },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [signedIn, setSignedIn] = useState(false);
  const [purpose, setPurpose] = useState<MemorySpaceDTO["type"]>("family");
  const [spaceName, setSpaceName] = useState("");
  const [spaceDesc, setSpaceDesc] = useState("");
  const [createdSpace, setCreatedSpace] = useState<MemorySpaceDTO | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profileType, setProfileType] = useState<SpaceProfileDTO["type"]>("child");
  const [profileRel, setProfileRel] = useState("");
  const [createdProfile, setCreatedProfile] = useState<SpaceProfileDTO | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryContent, setMemoryContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [completedMemoryId, setCompletedMemoryId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [existingSpaces, setExistingSpaces] = useState<MemorySpaceDTO[]>([]);

  useEffect(() => {
    const isAuth = Boolean(getStoredSession().accessToken);
    setSignedIn(isAuth);
    if (isAuth) {
      fetchSpaces()
        .then((list) => {
          setExistingSpaces(list);
          if (list.length > 0) {
            setCreatedSpace((prev) => prev || list[0]);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const space = await createSpace({
        name: spaceName.trim(),
        description: spaceDesc.trim() || undefined,
        type: purpose,
      });
      setCreatedSpace(space);
      setNotice(`Created "${space.name}" vault.`);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create memory space.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdSpace || !profileName.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const prof = await createProfile(createdSpace.id, {
        name: profileName.trim(),
        type: profileType,
        relationship: profileRel.trim() || undefined,
      });
      setCreatedProfile(prof);
      setNotice(`Profile "${prof.name}" linked to your archive.`);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create profile.");
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdSpace || !inviteEmail.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiRequest<{ inviteToken?: string; token?: string }>(
        `/collab/spaces/${createdSpace.id}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({ inviteeEmail: inviteEmail.trim(), role: "contributor" }),
        }
      );
      const token = res.inviteToken || res.token || null;
      setInviteToken(token);
      setNotice(`Invitation prepared for ${inviteEmail.trim()}.`);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setBusy(false);
    }
  };

  const handleFirstMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdSpace || !memoryTitle.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const mediaIds: string[] = [];
      if (selectedFile) {
        const uploaded = await uploadFileToMediaService(createdSpace.id, selectedFile);
        mediaIds.push(uploaded.mediaId);
      }
      const created = await apiRequest<{ id: string }>("/memories", {
        method: "POST",
        body: JSON.stringify({
          spaceId: createdSpace.id,
          title: memoryTitle.trim(),
          content: memoryContent.trim() || undefined,
          format: selectedFile ? "image" : "story",
          capturedAt: new Date().toISOString(),
          associatedProfileIds: createdProfile ? [createdProfile.id] : [],
          mediaIds,
          tags: ["first-memory", purpose],
        }),
      });
      setCompletedMemoryId(created.id);
      setNotice("First heirloom memory preserved! Your Living Archive is ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save first memory.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Guided Archive Onboarding"
      subtitle="Set up your family purpose, first memory space, loved-one profile, contributor circle, and inaugural memory in five calm steps."
    >
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setStep(num)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                step === num
                  ? "bg-[#76556F] text-white border-[#76556F]"
                  : step > num
                  ? "bg-[#EEF2ED] text-[#22593E] border-[#B6DBC7]"
                  : "bg-white text-[#5C5955] border-[#E7E2DA]"
              }`}
            >
              Step {num}
            </button>
          ))}
        </div>

        {!signedIn && (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#20242C]">
                Sign in or create an account to persist your setup
              </h2>
              <p className="text-xs text-[#5C5955] mt-0.5">
                You can preview the steps below, or register in seconds to save your vault to PostgreSQL.
              </p>
            </div>
            <Link
              href="/auth?mode=register"
              className="min-h-[44px] inline-flex items-center px-5 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
            >
              Create Account
            </Link>
          </div>
        )}

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

        {step >= 3 && !createdSpace && (
          <div className="p-4 rounded-xl bg-[#FDF5E6] border border-[#F2D8A7] text-xs text-[#85530E] flex flex-wrap items-center justify-between gap-3">
            <span>Create or select a Memory Space in Step 2 before adding profiles, invites, or memories.</span>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-3 py-1.5 rounded-lg bg-[#20242C] text-white text-xs font-semibold"
            >
              Go to Step 2
            </button>
          </div>
        )}

        {step >= 3 && createdSpace && existingSpaces.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E7E2DA] text-xs flex flex-wrap items-center justify-between gap-3">
            <span>
              Active Onboarding Space: <strong className="text-[#20242C]">{createdSpace.name}</strong>
            </span>
            <select
              aria-label="Switch onboarding space"
              value={createdSpace.id}
              onChange={(e) => {
                const match = existingSpaces.find((s) => s.id === e.target.value);
                if (match) setCreatedSpace(match);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
            >
              {existingSpaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === 1 && (
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-5">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
              1. Choose Your Archival Purpose
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PURPOSES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPurpose(p.id)}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    purpose === p.id
                      ? "bg-[#FAF6F8] border-[#76556F]"
                      : "bg-[#F7F4EE] border-[#E7E2DA] hover:border-[#8D857A]"
                  }`}
                >
                  <p className="font-serif text-sm font-bold text-[#20242C]">{p.label}</p>
                  <p className="text-xs text-[#5C5955] mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (signedIn) {
                  saveOnboardingPurpose(purpose).catch(() => undefined);
                }
                setStep(2);
              }}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#20242C] text-white text-xs font-semibold"
            >
              Continue to Create Space
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
              2. Name Your First Memory Space
            </h2>
            <form onSubmit={handleCreateSpace} className="space-y-4">
              <div>
                <label htmlFor="onb-space-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Space Title
                </label>
                <input
                  id="onb-space-name"
                  type="text"
                  required
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  placeholder="The Bennett Family Archive"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div>
                <label htmlFor="onb-space-desc" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Dedication / Description
                </label>
                <textarea
                  id="onb-space-desc"
                  rows={2}
                  value={spaceDesc}
                  onChange={(e) => setSpaceDesc(e.target.value)}
                  placeholder="Stories, portraits, and handwritten letters preserved across generations."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!signedIn || busy}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold disabled:opacity-40"
                >
                  {busy ? "Creating..." : "Create Space & Continue"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                >
                  Skip for Now
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 3 && (
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
              3. Create First Profile (Person, Child, or Pet)
            </h2>
            <form onSubmit={handleCreateProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="onb-prof-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Name
                </label>
                <input
                  id="onb-prof-name"
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Clara Bennett"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div>
                <label htmlFor="onb-prof-type" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Category
                </label>
                <select
                  id="onb-prof-type"
                  value={profileType}
                  onChange={(e) => setProfileType(e.target.value as SpaceProfileDTO["type"])}
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
                <label htmlFor="onb-prof-rel" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Relationship
                </label>
                <input
                  id="onb-prof-rel"
                  type="text"
                  value={profileRel}
                  onChange={(e) => setProfileRel(e.target.value)}
                  placeholder="Daughter"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div className="sm:col-span-3 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!createdSpace || busy}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold disabled:opacity-40"
                >
                  Save Profile &amp; Continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                >
                  Skip to Invite Step
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 4 && (
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <MailPlus className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
              4. Invite a Family Contributor
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="onb-invite-email" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Contributor Email
                </label>
                <input
                  id="onb-invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="grandma@family.local"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              {inviteToken && (
                <p className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-mono">
                  Invite Token: {inviteToken}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!createdSpace || busy}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#20242C] text-white text-xs font-semibold disabled:opacity-40"
                >
                  Send Invite &amp; Continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                >
                  Skip to First Memory
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 5 && (
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
              5. Preserve Your First Memory
            </h2>
            <form onSubmit={handleFirstMemory} className="space-y-4">
              <div>
                <label htmlFor="onb-mem-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Memory Title
                </label>
                <input
                  id="onb-mem-title"
                  type="text"
                  required
                  value={memoryTitle}
                  onChange={(e) => setMemoryTitle(e.target.value)}
                  placeholder="Sunday Afternoon in the Orchard"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div>
                <label htmlFor="onb-mem-story" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Story or Context
                </label>
                <textarea
                  id="onb-mem-story"
                  rows={3}
                  value={memoryContent}
                  onChange={(e) => setMemoryContent(e.target.value)}
                  placeholder="Write the memory behind this moment..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                />
              </div>
              <div>
                <label htmlFor="onb-mem-file" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Optional Photo or Scan
                </label>
                <input
                  id="onb-mem-file"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-xs text-[#5C5955]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!createdSpace || busy}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Save First Memory
                </button>
                <Link
                  href="/archive"
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                >
                  {completedMemoryId ? "View in Living Archive" : "Go to Archive"}
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </form>
          </section>
        )}
      </div>
    </AppShell>
  );
}
