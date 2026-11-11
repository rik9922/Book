"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, MailCheck, ShieldCheck, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  apiRequest,
  AuthUser,
  getStoredSession,
  resendVerificationEmail,
  saveStoredSession,
} from "@/lib/api";

export type AuthMode = "login" | "register" | "forgot" | "reset" | "verify";

export function AuthFlowPanel({
  initialMode = "login",
  initialToken = "",
  initialInviteToken = "",
}: {
  initialMode?: AuthMode;
  initialToken?: string;
  initialInviteToken?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [inviteToken, setInviteToken] = useState(initialInviteToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signedInUser, setSignedInUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setSignedInUser(getStoredSession().user);
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "login") {
        const res = await apiRequest<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        saveStoredSession(res.accessToken, res.refreshToken, res.user);
        setSignedInUser(res.user);
        setNotice(`Signed in as ${res.user.fullName}. Redirecting to your archive dashboard...`);
        router.push("/dashboard");
      } else if (mode === "register") {
        const res = await apiRequest<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
          verificationToken?: string;
        }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, fullName }),
        });
        saveStoredSession(res.accessToken, res.refreshToken, res.user);
        setSignedInUser(res.user);
        setNotice(
          res.verificationToken
            ? `Account created! Local verification token: ${res.verificationToken}`
            : "Account created! Redirecting to dashboard..."
        );
        if (!res.verificationToken) {
          router.push("/dashboard");
        }
      } else if (mode === "forgot") {
        const res = await apiRequest<{ resetToken?: string; message?: string }>(
          "/auth/forgot-password",
          {
            method: "POST",
            body: JSON.stringify({ email }),
          }
        );
        setNotice(
          res.resetToken
            ? `Reset token issued for local verification: ${res.resetToken}`
            : res.message || "If the account exists, a reset token has been generated."
        );
      } else if (mode === "reset") {
        await apiRequest("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token: tokenInput, newPassword: password }),
        });
        setNotice("Password updated successfully. You may now sign in.");
        setMode("login");
      } else if (mode === "verify") {
        await apiRequest("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token: tokenInput }),
        });
        setNotice("Email address verified successfully.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await resendVerificationEmail(email || undefined);
      setNotice(
        res.verificationToken
          ? `Fresh verification token issued: ${res.verificationToken}`
          : "Verification instructions dispatched to your email."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest("/collab/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: inviteToken.trim() }),
      });
      setNotice("Family circle invitation accepted. Visit Family Circles to view your shared space.");
      setInviteToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Account & Family Access"
      subtitle="Sign in with your Memoria archival credentials, verify email, or accept a family invitation."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 sm:p-8 shadow-sm">
          <div role="tablist" aria-label="Authentication mode" className="flex flex-wrap gap-2 mb-6">
            {(
              [
                { id: "login", label: "Sign In", icon: ShieldCheck },
                { id: "register", label: "Create Account", icon: UserPlus },
                { id: "forgot", label: "Forgot Password", icon: KeyRound },
                { id: "reset", label: "Reset Password", icon: KeyRound },
                { id: "verify", label: "Verify Email", icon: MailCheck },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const selected = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setMode(tab.id);
                    setError(null);
                    setNotice(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                    selected
                      ? "bg-[#20242C] text-[#FFFFFF]"
                      : "bg-[#F0ECE1] text-[#28272A] hover:bg-[#E7E2DA]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mb-5 p-3.5 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B] break-all"
            >
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="auth-fullname" className="block text-xs font-semibold text-[#20242C] mb-1.5">
                  Full Name
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Vance"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-sm text-[#20242C] focus:outline-none focus:ring-2 focus:ring-[#76556F]"
                />
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-[#20242C] mb-1.5">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@familyarchive.local"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-sm text-[#20242C] focus:outline-none focus:ring-2 focus:ring-[#76556F]"
                />
              </div>
            )}

            {(mode === "reset" || mode === "verify") && (
              <div>
                <label htmlFor="auth-token" className="block text-xs font-semibold text-[#20242C] mb-1.5">
                  {mode === "reset" ? "Password Reset Token" : "Email Verification Token"}
                </label>
                <input
                  id="auth-token"
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste verification or reset token"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-sm text-[#20242C] focus:outline-none focus:ring-2 focus:ring-[#76556F]"
                />
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-[#20242C] mb-1.5">
                  {mode === "reset" ? "New Password" : "Password"}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-sm text-[#20242C] focus:outline-none focus:ring-2 focus:ring-[#76556F]"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-sm font-medium hover:bg-[#343A46] transition-colors disabled:opacity-60"
              >
                {loading
                  ? "Processing..."
                  : mode === "login"
                  ? "Sign In"
                  : mode === "register"
                  ? "Create Archival Account"
                  : mode === "forgot"
                  ? "Request Reset Token"
                  : mode === "reset"
                  ? "Update Password"
                  : "Verify Email"}
              </button>

              {mode === "verify" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendVerification}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F0ECE1] text-xs font-semibold text-[#20242C]"
                >
                  Resend Verification Token
                </button>
              )}
            </div>
          </form>
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-[#20242C] mb-2">
              Active Session
            </h2>
            {signedInUser ? (
              <div className="space-y-2 text-xs text-[#28272A]">
                <p>
                  Signed in as <strong>{signedInUser.fullName}</strong> ({signedInUser.email})
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 rounded-lg bg-[#76556F] text-[#FFFFFF] font-medium hover:bg-[#62455B]"
                >
                  Open Archive Dashboard
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#5C5955]">
                No local browser session stored yet. Sign in or register to unlock your spaces and 3D heirloom editions.
              </p>
            )}
          </div>

          <div className="bg-[#F0ECE1] rounded-2xl border border-[#E7E2DA] p-6">
            <h2 className="font-serif text-lg font-bold text-[#20242C] mb-1">
              Accept Family Invitation
            </h2>
            <p className="text-xs text-[#5C5955] mb-4">
              Received an invitation code from a family circle curator? Sign in first, then redeem the invite token here.
            </p>
            <form onSubmit={handleAcceptInvite} className="space-y-3">
              <div>
                <label htmlFor="invite-token" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Invitation Token
                </label>
                <input
                  id="invite-token"
                  type="text"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="Paste invite token"
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E7E2DA] text-xs text-[#20242C]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !signedInUser}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#5F735E] text-[#FFFFFF] text-xs font-medium hover:bg-[#4D5E4C] disabled:opacity-50"
              >
                Redeem Invitation
              </button>
            </form>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
