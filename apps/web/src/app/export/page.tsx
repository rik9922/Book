"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, HardDrive, Shield, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  ActiveSessionDTO,
  apiRequest,
  clearStoredSession,
  deleteAccount,
  exportSpaceBundle,
  fetchSpaces,
  getStoredSession,
  listSessions,
  MemorySpaceDTO,
  revokeSession,
  SpaceQuotaDTO,
} from "@/lib/api";

export default function ExportAndPrivacyPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [quota, setQuota] = useState<SpaceQuotaDTO | null>(null);
  const [sessions, setSessions] = useState<ActiveSessionDTO[]>([]);
  const [lastChecksum, setLastChecksum] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSpaceQuota = useCallback(async (targetSpaceId: string) => {
    if (!targetSpaceId) return;
    apiRequest<SpaceQuotaDTO>(`/media/spaces/${targetSpaceId}/quota`)
      .then((q) => setQuota(q))
      .catch(() => setQuota(null));
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!getStoredSession().accessToken) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      const [spaceRes, sessRes] = await Promise.allSettled([fetchSpaces(), listSessions()]);
      if (spaceRes.status === "fulfilled") {
        setSpaces(spaceRes.value);
        if (spaceRes.value.length > 0) {
          setSpaceId(spaceRes.value[0].id);
          loadSpaceQuota(spaceRes.value[0].id);
        }
      }
      if (sessRes.status === "fulfilled") {
        setSessions(sessRes.value);
      }
    };
    init();
  }, [loadSpaceQuota]);

  const handleExportSpace = async () => {
    if (!spaceId) return;
    setExporting(true);
    setError(null);
    setNotice(null);
    try {
      const bundle = await exportSpaceBundle(spaceId);
      setLastChecksum(bundle.integritySha256);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memoria-space-${spaceId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(`Exported ${bundle.memories.length} memories with SHA-256 verification.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setError(null);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setNotice("Session revoked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke session.");
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) return;
    setError(null);
    try {
      await deleteAccount(deletePassword);
      clearStoredSession();
      setSignedIn(false);
      setNotice("Account and active sessions permanently deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed.");
    }
  };

  return (
    <AppShell
      title="Data Portability, Quota & Account Security"
      subtitle="Download SHA-256 verified archive bundles, monitor 500 MB local storage meters, manage active sessions, or permanently delete your account."
    >
      {!signedIn ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center max-w-xl mx-auto space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#20242C]">Sign in to export your archive</h2>
          <Link
            href="/auth"
            className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
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

          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <Download className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
              SHA-256 Space Export Bundle
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="export-space-select" className="text-xs font-semibold text-[#20242C]">
                Target Space:
              </label>
              <select
                id="export-space-select"
                value={spaceId}
                onChange={(e) => {
                  setSpaceId(e.target.value);
                  loadSpaceQuota(e.target.value);
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

            {quota && (
              <div className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#20242C]">
                    <HardDrive className="w-3.5 h-3.5 text-[#5F735E]" aria-hidden="true" />
                    Local Vault Storage Usage
                  </span>
                  <span className="font-mono">
                    {(quota.usedBytes / (1024 * 1024)).toFixed(2)} MB / {(quota.maxBytes / (1024 * 1024)).toFixed(0)} MB (
                    {quota.usedPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E7E2DA] overflow-hidden">
                  <div
                    className="h-full bg-[#5F735E] rounded-full"
                    style={{ width: `${Math.min(100, quota.usedPercentage)}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!spaceId || exporting}
              onClick={handleExportSpace}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#20242C] text-white text-xs font-semibold disabled:opacity-40"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {exporting ? "Building Bundle..." : "Download Verified Space Bundle (.json)"}
            </button>

            {lastChecksum && (
              <p className="text-[11px] font-mono text-[#5F735E] break-all">
                Integrity SHA-256: {lastChecksum}
              </p>
            )}
          </section>

          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
              Active Refresh Sessions ({sessions.length})
            </h2>
            {sessions.length === 0 ? (
              <p className="text-xs text-[#5C5955]">No active sessions reported.</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="p-3.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#20242C]">{s.userAgent}</p>
                      <p className="text-[11px] text-[#5C5955]">
                        IP: {s.ipAddress} • Expires {new Date(s.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E7E2DA] text-[#B6423E] font-medium"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-[#FFFFFF] rounded-2xl border border-[#F5C6C6] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#B6423E] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Permanent Account Deletion
            </h2>
            <p className="text-xs text-[#5C5955]">
              Export your archive above before proceeding. Deleting your account revokes all sessions and removes your user credentials permanently.
            </p>
            <form onSubmit={handleDeleteAccount} className="flex flex-wrap items-center gap-3">
              <label htmlFor="delete-acc-pw" className="sr-only">
                Confirm Current Password
              </label>
              <input
                id="delete-acc-pw"
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter password to confirm"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
              />
              <button
                type="submit"
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B6423E] text-white text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Delete Account
              </button>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}
