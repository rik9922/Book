"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ShieldCheck,
  UserPlus,
  Mail,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { apiRequest, AuthUser, saveStoredSession } from "@/lib/api";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
  onSuccess?: (user: AuthUser) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  onSuccess,
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessNotice(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      if (mode === "login") {
        const res = await apiRequest<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password }),
        });
        saveStoredSession(res.accessToken, res.refreshToken, res.user);
        setSuccessNotice(`Welcome back, ${res.user.fullName}!`);
        onSuccess?.(res.user);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        const res = await apiRequest<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
          verificationToken?: string;
        }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim() || "Archival Curator",
          }),
        });
        saveStoredSession(res.accessToken, res.refreshToken, res.user);
        setSuccessNotice(`Account created! Welcome, ${res.user.fullName}.`);
        onSuccess?.(res.user);
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async () => {
    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    const demoEmail = "elena@familyarchive.local";
    const demoPassword = "Password123!";
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFullName("Elena Vance");

    try {
      // First attempt login with standard demo credentials
      const res = await apiRequest<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: demoEmail, password: demoPassword }),
      }).catch(async () => {
        // If not registered yet on this database instance, register automatically
        return await apiRequest<{
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: demoEmail,
            password: demoPassword,
            fullName: "Elena Vance",
          }),
        });
      });

      saveStoredSession(res.accessToken, res.refreshToken, res.user);
      setSuccessNotice(`Signed in as demo curator: ${res.user.fullName}`);
      onSuccess?.(res.user);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20242C]/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] shadow-2xl p-6 sm:p-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 p-2 rounded-xl text-[#5C5955] hover:text-[#20242C] hover:bg-[#F0ECE1] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#76556F]">
            <Sparkles className="w-3.5 h-3.5 text-[#76556F]" />
            Memoria Archival Access
          </div>
          <h2
            id="auth-modal-title"
            className="text-2xl font-serif font-bold text-[#20242C] mt-1"
          >
            {mode === "login" ? "Sign In to Your Vault" : "Create Archival Account"}
          </h2>
          <p className="text-xs text-[#5C5955] mt-1">
            {mode === "login"
              ? "Access your heirloom books, memory spaces, and orders."
              : "Begin preserving your family milestones in timeless editions."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] mb-5">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === "login"
                ? "bg-[#FFFFFF] text-[#20242C] shadow-xs"
                : "text-[#5C5955] hover:text-[#20242C]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#76556F]" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === "register"
                ? "bg-[#FFFFFF] text-[#20242C] shadow-xs"
                : "text-[#5C5955] hover:text-[#20242C]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-[#76556F]" />
            Create Account
          </button>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E] flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successNotice && (
          <div
            role="status"
            className="mb-4 p-3 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#5F735E] shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div>
              <label
                htmlFor="modal-fullname"
                className="block text-xs font-semibold text-[#20242C] mb-1"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C5955]" />
                <input
                  id="modal-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Vance"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-[#20242C] placeholder-[#8D857A] focus:outline-none focus:ring-2 focus:ring-[#76556F]"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="modal-email"
              className="block text-xs font-semibold text-[#20242C] mb-1"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C5955]" />
              <input
                id="modal-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena@familyarchive.local"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-[#20242C] placeholder-[#8D857A] focus:outline-none focus:ring-2 focus:ring-[#76556F]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="modal-password"
                className="block text-xs font-semibold text-[#20242C]"
              >
                Password
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/auth?mode=forgot");
                  }}
                  className="text-[11px] text-[#76556F] hover:underline"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C5955]" />
              <input
                id="modal-password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-[#20242C] placeholder-[#8D857A] focus:outline-none focus:ring-2 focus:ring-[#76556F]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo One-Click Access */}
        <div className="mt-5 pt-4 border-t border-[#E7E2DA]">
          <button
            type="button"
            onClick={handleDemoFill}
            disabled={loading}
            className="w-full min-h-[40px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-[#20242C] text-xs font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#76556F]" />
            One-Click Demo Archival Curator
          </button>
        </div>
      </div>
    </div>
  );
}
