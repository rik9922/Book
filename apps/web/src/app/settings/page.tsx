"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Download, LogOut, RefreshCw, Shield, Sliders } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  AuthUser,
  clearStoredSession,
  getStoredSession,
  MemorySpaceDTO,
  saveStoredSession,
} from "@/lib/api";

const REDUCED_MOTION_KEY = "memoria_reduced_motion";

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    setUser(session.user);
    if (typeof window !== "undefined") {
      setReducedMotion(localStorage.getItem(REDUCED_MOTION_KEY) === "true");
    }

    if (session.accessToken) {
      apiRequest<{ spaces?: MemorySpaceDTO[]; items?: MemorySpaceDTO[] } | MemorySpaceDTO[]>("/spaces")
        .then((res) => {
          setSpaces(Array.isArray(res) ? res : res.spaces || res.items || []);
        })
        .catch(() => {
          setSpaces([]);
        });
    }
  }, []);

  const handleToggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(REDUCED_MOTION_KEY, String(next));
    }
    setStatusMessage(
      next
        ? "Reduced Motion enabled for 3D page transitions."
        : "Standard 3D page animations enabled."
    );
  };

  const handleRefreshSession = async () => {
    const session = getStoredSession();
    if (!session.refreshToken) {
      setError("No refresh token stored locally.");
      return;
    }
    setError(null);
    try {
      const res = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        user?: AuthUser;
      }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (res.user || session.user) {
        saveStoredSession(res.accessToken, res.refreshToken, res.user || session.user!);
      }
      setStatusMessage("Session tokens refreshed securely.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh token.");
    }
  };

  const handleLogout = async () => {
    const session = getStoredSession();
    setError(null);
    try {
      if (session.refreshToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Signed out locally (server revocation note: ${err.message})`
          : "Signed out locally."
      );
    } finally {
      clearStoredSession();
      setUser(null);
      setStatusMessage("Signed out and revoked local session credentials.");
    }
  };

  const handleExportArchiveJson = async () => {
    setExporting(true);
    setError(null);
    try {
      const bundle: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        user,
        spaces: [],
      };
      const enrichedSpaces: Array<Record<string, unknown>> = [];

      for (const s of spaces) {
        const memRes = await apiRequest<{ items?: unknown[] } | unknown[]>(
          `/spaces/${s.id}/memories?limit=100`
        ).catch(() => ({ items: [] }));
        const items = Array.isArray(memRes) ? memRes : memRes.items || [];
        enrichedSpaces.push({ ...s, memories: items });
      }
      bundle.spaces = enrichedSpaces;

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memoria-archive-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage("Exported portable JSON archive.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell
      title="Vault Settings & Portability"
      subtitle="Manage your archival account, accessibility motion preferences, and zero-lock-in data exports."
    >
      <div className="max-w-3xl space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
            {error}
          </div>
        )}
        {statusMessage && (
          <div role="status" className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B]">
            {statusMessage}
          </div>
        )}

        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
            Account & Session Security
          </h2>
          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs space-y-1">
                <p>
                  <strong>Name:</strong> {user.fullName}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>User ID:</strong> <span className="font-mono">{user.id}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleRefreshSession}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  Refresh Token
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FDF2F2] text-xs font-medium text-[#B6423E]"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Sign Out & Revoke Session
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#5C5955]">You are currently viewing Memoria unauthenticated.</p>
              <Link href="/auth" className="px-4 py-2 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium">
                Sign In
              </Link>
            </div>
          )}
        </section>

        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
            Reading Comfort & Accessibility
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#20242C]">Reduced 3D Motion</p>
              <p className="text-xs text-[#5C5955]">
                Switches WebGL 3D reader to on-demand framing when closed and softens motion.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              onClick={handleToggleReducedMotion}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                reducedMotion
                  ? "bg-[#5F735E] text-[#FFFFFF]"
                  : "bg-[#F0ECE1] text-[#28272A]"
              }`}
            >
              {reducedMotion ? "Enabled" : "Disabled"}
            </button>
          </div>
        </section>

        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
            <Download className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
            Archive Data Portability
          </h2>
          <p className="text-xs text-[#5C5955]">
            Memoria keeps your family legacy portable. Download a structured JSON backup of your spaces and memories at any time.
          </p>
          <button
            type="button"
            disabled={!user || exporting}
            onClick={handleExportArchiveJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            {exporting ? "Preparing Export..." : "Export Archive JSON"}
          </button>
        </section>
      </div>
    </AppShell>
  );
}
