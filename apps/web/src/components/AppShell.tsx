"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Images,
  Users,
  BookOpen,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
  Bell,
  FolderKanban,
  Layers,
  Package,
  Trash2,
  Download,
  CreditCard,
  Compass,
} from "lucide-react";
import {
  AuthUser,
  flushOfflineQueue,
  getOfflineQueue,
  getStoredSession,
  logoutCurrentSession,
} from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/archive", label: "Archive", icon: Images },
  { href: "/circles", label: "Family Circles", icon: Users },
  { href: "/studio", label: "Book Studio", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

const WORKSPACE_SUBNAV_ITEMS = [
  { href: "/spaces", label: "Spaces", icon: Layers },
  { href: "/profiles", label: "Profiles", icon: Users },
  { href: "/collections", label: "Collections", icon: FolderKanban },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/trash", label: "Trash", icon: Trash2 },
  { href: "/export", label: "Export", icon: Download },
  { href: "/onboarding", label: "Onboarding", icon: Compass },
];

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setPendingCount(getOfflineQueue().length);
    setUser(getStoredSession().user);

    const onOnline = () => {
      setIsOnline(true);
      flushOfflineQueue().then(() => setPendingCount(getOfflineQueue().length));
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [pathname]);

  const handleSignOut = async () => {
    await logoutCurrentSession();
    setUser(null);
  };

  return (
    <div id="app-shell-root" className="min-h-screen bg-[#F7F4EE] text-[#28272A] flex flex-col">
      <header className="sticky top-0 z-40 bg-[#F7F4EE]/95 backdrop-blur-md border-b border-[#E7E2DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-[#E7E2DA]">
              <Image
                src="/branding/memoria-app-icon-192.png"
                alt="Memoria Logo"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-serif text-lg font-bold text-[#20242C]">Memoria</span>
              <span className="block text-[9px] uppercase tracking-wider text-[#5C5955] -mt-1">
                Living Archive
              </span>
            </div>
          </Link>

          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? "bg-[#76556F] text-white"
                      : "text-[#5C5955] hover:bg-[#F0ECE1] hover:text-[#20242C]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isOnline
                  ? "bg-[#EEF2ED] text-[#22593E] border-[#B6DBC7]"
                  : "bg-[#FDF5E6] text-[#85530E] border-[#F2D8A7]"
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? "Online" : "Offline"}
              {pendingCount > 0 ? ` (${pendingCount} queued)` : ""}
            </span>

            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E7E2DA] bg-white text-[11px] font-semibold text-[#20242C] hover:border-[#8D857A]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#5F735E]" />
              Admin
            </Link>

            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#E7E2DA] text-xs font-medium text-[#20242C] hover:border-[#8D857A] cursor-pointer"
                title={`Signed in as ${user.email}`}
              >
                <LogOut className="w-3.5 h-3.5 text-[#76556F]" />
                <span className="hidden sm:inline">{user.fullName.split(" ")[0]}</span>
              </button>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )}
          </div>
        </div>
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-[#E7E2DA] bg-[#F7F4EE] px-3 py-2 flex items-center gap-1.5 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-[#76556F] text-white"
                    : "bg-white border border-[#E7E2DA] text-[#5C5955]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <nav
          aria-label="Workspace Modules"
          className="border-t border-[#E7E2DA]/80 bg-[#FAF8F4]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-1.5 flex items-center gap-1.5 overflow-x-auto">
            {WORKSPACE_SUBNAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? "bg-[#20242C] text-white"
                      : "text-[#5C5955] hover:bg-[#F0ECE1] hover:text-[#20242C]"
                  }`}
                >
                  <Icon className="w-3 h-3" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <span className="text-[#E7E2DA] px-1" aria-hidden="true">|</span>
            <Link href="/gallery" className="px-2 py-1 rounded-lg text-[11px] text-[#5C5955] hover:text-[#20242C] whitespace-nowrap shrink-0">
              Gallery
            </Link>
            <Link href="/sample-book" className="px-2 py-1 rounded-lg text-[11px] text-[#5C5955] hover:text-[#20242C] whitespace-nowrap shrink-0">
              3D Sample
            </Link>
            <Link href="/pricing" className="px-2 py-1 rounded-lg text-[11px] text-[#5C5955] hover:text-[#20242C] whitespace-nowrap shrink-0">
              Pricing
            </Link>
            <Link href="/help" className="px-2 py-1 rounded-lg text-[11px] text-[#5C5955] hover:text-[#20242C] whitespace-nowrap shrink-0">
              Help
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#20242C]">{title}</h1>
            )}
            {subtitle && <p className="text-sm text-[#5C5955] mt-1">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
