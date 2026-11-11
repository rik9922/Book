"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileText,
  Flag,
  HardDrive,
  KeyRound,
  Layers,
  LifeBuoy,
  Lock,
  Mail,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import {
  approveAdminAccessRequest,
  claimInstanceAdmin,
  createAdminAccessRequest,
  deleteAdminSecurityKey,
  getAdminAccessRequests,
  getAdminAuditLogs,
  getAdminBookJobs,
  getAdminCatalogFormats,
  getAdminEmailTemplates,
  getAdminFeatureFlags,
  getAdminModerationFlags,
  getAdminOrders,
  getAdminOverview,
  getAdminPricingMatrix,
  getAdminQueuesTelemetry,
  getAdminReports,
  getAdminSecurityKeys,
  getAdminServicesHealth,
  getAdminSpaces,
  getAdminStorageStats,
  getAdminTickets,
  getAdminTransactions,
  getAdminUploadSessions,
  getAdminUsers,
  getApiBaseUrl,
  getBookCatalog,
  getStoredSession,
  overrideAdminPreflight,
  PrintCatalogDTO,
  refundAdminOrder,
  registerAdminSecurityKey,
  replyAdminTicket,
  reprocessAdminMedia,
  resolveAdminModerationFlag,
  resolveAdminReport,
  retryAdminQueueJob,
  revokeAdminUserSessions,
  saveStoredSession,
  shipAdminOrder,
  updateAdminCatalogFormat,
  updateAdminEmailTemplate,
  updateAdminFeatureFlag,
  updateAdminShippingRate,
  updateAdminUserStatus,
} from "@/lib/api";

interface SpaceRecord {
  id: string;
  name: string;
  type: "family" | "personal" | "heritage";
  ownerEmail: string;
  memberCount: number;
  memoryCount: number;
  usedBytesFormatted: string;
  usedPercentage: number;
  syncStatus: "synchronized" | "processing" | "offline_pending" | "warning";
  lastActive: string;
}

interface OrderRecord {
  id: string;
  bookTitle: string;
  spaceName: string;
  recipient: string;
  format: string;
  status: string;
  amount: string;
  trackingNumber?: string;
}

type AdminTab =
  | "overview"
  | "users"
  | "spaces"
  | "moderation"
  | "storage"
  | "queues"
  | "orders"
  | "catalog"
  | "governance"
  | "tickets"
  | "security";

export default function AdminPortalPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<AdminTab>("overview");
  const [spaces, setSpaces] = useState<SpaceRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [catalog, setCatalog] = useState<PrintCatalogDTO | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<"checking" | "online" | "offline">("checking");
  const [ocrEngineStatus, setOcrEngineStatus] = useState<string>("Checking...");
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Live Admin Telemetry & Consoles
  const [overviewMetrics, setOverviewMetrics] = useState<{ usersCount: number; spacesCount: number; ordersCount: number } | null>(null);
  const [servicesHealth, setServicesHealth] = useState<Array<{ service: string; status: string; latencyMs: number }>>([]);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; email: string; fullName: string; role: string; status: string; isVerified: boolean }>>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [accessRequests, setAccessRequests] = useState<Array<{ id: string; requesterId: string; reason: string; status: string }>>([]);
  const [newAccessReason, setNewAccessReason] = useState("");
  const [moderationFlags, setModerationFlags] = useState<Array<{ id: string; spaceId: string; memoryId: string; reason: string; status: string }>>([]);
  const [reports, setReports] = useState<Array<{ id: string; targetType: string; reason: string; status: string }>>([]);
  const [storageStats, setStorageStats] = useState<{ driver: string; totalUsedBytes: number; spaceCount: number; assetCount: number } | null>(null);
  const [uploadSessions, setUploadSessions] = useState<Array<{ id: string; originalName: string; mimeType: string; sizeBytes: number; status: string }>>([]);
  const [queuesTelemetry, setQueuesTelemetry] = useState<Array<{ name: string; active: number; waiting: number; completed: number; failed: number }>>([]);
  const [deadLetterJobs, setDeadLetterJobs] = useState<Array<{ queueName: string; jobId: string; jobName: string; failedReason: string }>>([]);
  const [bookJobs, setBookJobs] = useState<Array<{ id: string; title: string; format: string; version: number; isFrozenForPrint: boolean; preflightOverridden?: boolean }>>([]);
  const [catalogFormats, setCatalogFormats] = useState<Array<{ formatId: string; label: string; dimensionsCm: string; baseCents: number; enabled: boolean }>>([]);
  const [formatPriceEdits, setFormatPriceEdits] = useState<Record<string, string>>({});
  const [shippingRates, setShippingRates] = useState<Array<{ zoneCode: string; label: string; rateCents: number; estimatedDays: string }>>([]);
  const [shippingRateEdits, setShippingRateEdits] = useState<Record<string, string>>({});
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<{ transactions: any[]; refunds: any[] }>({ transactions: [], refunds: [] });
  const [emailTemplates, setEmailTemplates] = useState<Array<{ templateKey: string; subject: string; htmlBody: string }>>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("welcome_heirloom");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [featureFlags, setFeatureFlags] = useState<Array<{ flagKey: string; description: string; enabled: boolean; rolloutPercentage: number }>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; entityType: string; entityId: string; createdAt: string }>>([]);
  const [tickets, setTickets] = useState<
    Array<{
      id: string;
      email: string;
      subject: string;
      message: string;
      status: string;
      replies?: Array<{ id: string; authorName: string; message: string; createdAt: string }>;
    }>
  >([]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [securityKeys, setSecurityKeys] = useState<Array<{ id: string; name: string; keyType: string; credentialId: string }>>([]);
  const [newKeyName, setNewKeyName] = useState("");

  const [inspectedSpace, setInspectedSpace] = useState<SpaceRecord | null>(null);
  const closeDrawerRef = useRef<HTMLButtonElement | null>(null);
  const lastInspectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const inspectDialogRef = useRef<HTMLDivElement | null>(null);
  const adminSurfaceRef = useRef<HTMLDivElement | null>(null);

  const probeClusterHealth = useCallback(async () => {
    setGatewayStatus("checking");
    const apiBase = getApiBaseUrl();
    const rootUrl = apiBase.replace(/\/api\/v1$/, "");
    try {
      const res = await fetch(`${rootUrl}/health`);
      setGatewayStatus(res.ok ? "online" : "offline");
    } catch {
      setGatewayStatus("offline");
    }

    try {
      const ocrRes = await fetch(`${apiBase}/media/ocr/status`);
      if (ocrRes.ok) {
        const json = await ocrRes.json();
        const ready = Boolean(json?.data?.isAvailable ?? json?.data?.available);
        setOcrEngineStatus(ready ? "Tesseract Ready" : "Unavailable");
      } else {
        setOcrEngineStatus("Auth Required / Offline");
      }
    } catch {
      setOcrEngineStatus("Offline");
    }

    getBookCatalog().then(setCatalog).catch(() => setCatalog(null));

    const session = getStoredSession();
    setHasSession(Boolean(session.accessToken));
    if (!session.accessToken) return;

    const settled = await Promise.allSettled([
      getAdminOverview(),
      getAdminServicesHealth(),
      getAdminUsers(),
      getAdminSpaces(),
      getAdminAccessRequests(),
      getAdminModerationFlags(),
      getAdminReports(),
      getAdminStorageStats(),
      getAdminUploadSessions(),
      getAdminQueuesTelemetry(),
      getAdminBookJobs(),
      getAdminCatalogFormats(),
      getAdminPricingMatrix(),
      getAdminOrders(),
      getAdminTransactions(),
      getAdminEmailTemplates(),
      getAdminFeatureFlags(),
      getAdminAuditLogs(),
      getAdminTickets(),
      getAdminSecurityKeys(),
    ]);

    const [
      ov,
      health,
      users,
      spList,
      reqs,
      flags,
      reps,
      stStats,
      upSess,
      qTel,
      bJobs,
      catFmt,
      pMat,
      ordList,
      txRes,
      tpls,
      fFlags,
      audits,
      tix,
      sKeys,
    ] = settled;

    if (ov.status !== "fulfilled" && users.status !== "fulfilled") {
      setAdminAuthorized(false);
      return;
    }

    setAdminAuthorized(true);
    if (ov.status === "fulfilled") setOverviewMetrics(ov.value);
    if (health.status === "fulfilled") setServicesHealth(health.value);
    if (users.status === "fulfilled") setAdminUsers(users.value);
    if (spList.status === "fulfilled") {
      setSpaces(
        spList.value.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type === "family" || s.type === "personal" ? s.type : "heritage",
          ownerEmail: s.ownerId.slice(0, 8),
          memberCount: 1,
          memoryCount: 0,
          usedBytesFormatted: "Live DB",
          usedPercentage: 10,
          syncStatus: "synchronized",
          lastActive: new Date(s.updatedAt).toLocaleDateString(),
        }))
      );
    }
    if (reqs.status === "fulfilled") setAccessRequests(reqs.value);
    if (flags.status === "fulfilled") setModerationFlags(flags.value);
    if (reps.status === "fulfilled") setReports(reps.value);
    if (stStats.status === "fulfilled") setStorageStats(stStats.value);
    if (upSess.status === "fulfilled") setUploadSessions(upSess.value);
    if (qTel.status === "fulfilled") {
      setQueuesTelemetry(qTel.value.queues || []);
      setDeadLetterJobs(qTel.value.deadLetterJobs || []);
    }
    if (bJobs.status === "fulfilled") setBookJobs(bJobs.value);
    if (catFmt.status === "fulfilled") {
      setCatalogFormats(catFmt.value);
      setFormatPriceEdits((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const next: Record<string, string> = {};
        for (const f of catFmt.value) next[f.formatId] = (f.baseCents / 100).toFixed(2);
        return next;
      });
    }
    if (pMat.status === "fulfilled") {
      setShippingRates(pMat.value.shippingRates || []);
      setShippingRateEdits((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const next: Record<string, string> = {};
        for (const sr of pMat.value.shippingRates || []) next[sr.zoneCode] = (sr.rateCents / 100).toFixed(2);
        return next;
      });
    }
    if (ordList.status === "fulfilled") {
      setOrders(
        ordList.value.map((o) => ({
          id: o.id,
          bookTitle: `Edition ${o.bookId.slice(0, 8)}`,
          spaceName: o.spaceId.slice(0, 8),
          recipient: `${o.shippingAddress?.recipientName || "Customer"} • ${o.shippingAddress?.city || "Local"}`,
          format: o.printSpec?.binding || "hardcover_linen",
          status: o.status,
          amount: `$${(o.totalCents / 100).toFixed(2)}`,
          trackingNumber: o.trackingNumber,
        }))
      );
    }
    if (txRes.status === "fulfilled") setTransactions(txRes.value);
    if (tpls.status === "fulfilled") {
      setEmailTemplates(tpls.value);
      setTemplateSubject((prev) => (prev ? prev : tpls.value[0]?.subject || ""));
      setTemplateBody((prev) => (prev ? prev : tpls.value[0]?.htmlBody || ""));
      setSelectedTemplateKey((prev) => (prev ? prev : tpls.value[0]?.templateKey || "welcome_heirloom"));
    }
    if (fFlags.status === "fulfilled") setFeatureFlags(fFlags.value);
    if (audits.status === "fulfilled") setAuditLogs(audits.value);
    if (tix.status === "fulfilled") setTickets(tix.value);
    if (sKeys.status === "fulfilled") setSecurityKeys(sKeys.value);
  }, []);

  const runAdminAction = async (fn: () => Promise<void>, successMessage: string) => {
    setAdminError(null);
    setAdminNotice(null);
    try {
      await fn();
      setAdminNotice(successMessage);
      await probeClusterHealth();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Administrative action failed.");
    }
  };

  useEffect(() => {
    probeClusterHealth();
  }, [probeClusterHealth]);

  useEffect(() => {
    if (!inspectedSpace) return;
    const surface = adminSurfaceRef.current;
    surface?.setAttribute("inert", "");
    closeDrawerRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setInspectedSpace(null);
        lastInspectTriggerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && inspectDialogRef.current) {
        const focusables = inspectDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      surface?.removeAttribute("inert");
    };
  }, [inspectedSpace]);

  const handleClaimLocalAdmin = async () => {
    setAdminError(null);
    setAdminNotice(null);
    try {
      const res = await claimInstanceAdmin();
      const session = getStoredSession();
      if (session.user && session.refreshToken) {
        saveStoredSession(res.accessToken, session.refreshToken, { ...session.user, role: res.role });
      }
      setAdminNotice("Claimed local superadmin instance ownership. Loading live governance consoles...");
      await probeClusterHealth();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "An instance admin already exists.");
    }
  };

  const handleShipOrder = async (order: OrderRecord) => {
    const customTracking = trackingInputs[order.id]?.trim() || undefined;
    try {
      await shipAdminOrder(order.id, customTracking);
      setAdminNotice(`Dispatched order ${order.id.slice(0, 8)} with courier tracking.`);
      await probeClusterHealth();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to ship order.");
    }
  };

  const handleRefundOrder = async (order: OrderRecord, type: "refund" | "remake") => {
    try {
      await refundAdminOrder(order.id, type, `Admin ${type} authorization`);
      setAdminNotice(`Authorized ${type} for order ${order.id.slice(0, 8)}.`);
      await probeClusterHealth();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to authorize refund/remake.");
    }
  };

  const filteredSpaces = spaces.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "overview", label: "System Overview (01/13)", icon: Activity },
    { id: "users", label: "Users & Access (02/03/05)", icon: Users },
    { id: "spaces", label: "Memory Spaces (04)", icon: Layers },
    { id: "moderation", label: "Moderation & Reports (06/07)", icon: ShieldAlert },
    { id: "storage", label: "Storage & Media (08/09/10)", icon: HardDrive },
    { id: "queues", label: "Queues & Rendering (11/12/14/15)", icon: Database },
    { id: "orders", label: "Print Orders & Refunds (18-21)", icon: Printer },
    { id: "catalog", label: "Catalog & Pricing (16/17)", icon: BookOpen },
    { id: "governance", label: "Templates, Flags & Audit (22-24)", icon: Flag },
    { id: "tickets", label: "Support Desk (25)", icon: LifeBuoy },
    { id: "security", label: "Admin 2FA & Keys (26)", icon: KeyRound },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#28272A] flex flex-col">
      <div ref={adminSurfaceRef} className="flex-1 flex flex-col">
        <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E7E2DA]">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#E7E2DA]">
                  <Image src="/branding/memoria-app-icon-192.png" alt="Memoria Admin" fill className="object-cover" />
                </div>
                <span className="font-serif text-lg font-bold tracking-tight text-[#20242C]">Memoria</span>
              </Link>
              <span className="text-[#E7E2DA]">/</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0ECE1] border border-[#E7E2DA]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#76556F]" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-[#20242C] uppercase tracking-wider">
                  Archival Governance (ADMIN-01..26)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${
                  gatewayStatus === "online"
                    ? "text-[#3C503B] bg-[#EEF3EE] border-[#C6D4C5]"
                    : "text-[#5C5955] bg-[#F7F4EE] border-[#E7E2DA]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${gatewayStatus === "online" ? "bg-[#5F735E]" : "bg-[#8D857A]"}`} />
                Gateway: {gatewayStatus === "online" ? "Healthy" : gatewayStatus}
              </div>
              <Link href="/dashboard" className="text-xs font-medium text-[#76556F] hover:text-[#20242C] flex items-center gap-1">
                PWA Dashboard <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-72 shrink-0 space-y-6">
            <nav aria-label="Admin Portal Sections" className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = selectedTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedTab(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      active ? "bg-[#20242C] text-[#FFFFFF] shadow-sm" : "text-[#5C5955] hover:bg-[#FFFFFF] hover:text-[#20242C]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </span>
                    {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8D857A]">Zero-Budget Storage</span>
                <Lock className="w-3.5 h-3.5 text-[#5F735E]" aria-hidden="true" />
              </div>
              <p className="text-xs text-[#5C5955] leading-relaxed">
                Media runs on local filesystem drivers and PostgreSQL 17 with HMAC signed URLs.
              </p>
              <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between text-[11px] font-medium">
                <span className="text-[#8D857A]">OCR Status</span>
                <span className="text-[#5F735E]">{ocrEngineStatus}</span>
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-bold text-[#20242C]">
                  {navItems.find((n) => n.id === selectedTab)?.label.split(" (")[0] || "System Overview"}
                </h1>
                <p className="text-sm text-[#5C5955] mt-1">
                  Real-time visibility across memory spaces, OCR indexing, transactional outboxes, and hardcover fulfillment.
                </p>
              </div>
              <button
                type="button"
                onClick={probeClusterHealth}
                className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E7E2DA] text-xs font-medium text-[#20242C] hover:border-[#76556F]"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#76556F]" aria-hidden="true" />
                Refresh Health
              </button>
            </div>

            {!adminAuthorized && (
              <div className="p-4 rounded-2xl bg-[#FAF6F8] border border-[#76556F]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-[#20242C]">
                    {hasSession ? "Admin RBAC Session Required for Live Mutations" : "Admin Authentication Required"}
                  </p>
                  <p className="text-[#5C5955]">
                    {hasSession
                      ? "First-run local instance owners can claim superadmin ownership below."
                      : "Sign in with an administrator account to manage live users, moderation, and print fulfillment."}
                  </p>
                </div>
                {hasSession ? (
                  <button
                    type="button"
                    onClick={handleClaimLocalAdmin}
                    className="px-4 py-2 rounded-xl bg-[#76556F] text-white font-semibold"
                  >
                    Claim Local Instance Admin
                  </button>
                ) : (
                  <Link href="/login" className="px-4 py-2 rounded-xl bg-[#20242C] text-white font-semibold">
                    Sign In
                  </Link>
                )}
              </div>
            )}

            {adminError && (
              <div role="alert" className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
                {adminError}
              </div>
            )}
            {adminNotice && (
              <div role="status" className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B]">
                {adminNotice}
              </div>
            )}

            {/* KPI Cards (ADMIN-01) */}
            {(selectedTab === "overview" || selectedTab === "spaces") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs">
                  <div className="flex items-center justify-between text-[#5C5955] text-xs mb-2">
                    <span>Active Family Spaces</span>
                    <Users className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-serif font-bold text-[#20242C]">{overviewMetrics?.spacesCount ?? spaces.length}</p>
                  <span className="text-[11px] text-[#5F735E] font-medium">RBAC Isolated</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs">
                  <div className="flex items-center justify-between text-[#5C5955] text-xs mb-2">
                    <span>Registered Users</span>
                    <FileText className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-serif font-bold text-[#20242C]">{overviewMetrics?.usersCount ?? 0}</p>
                  <span className="text-[11px] text-[#5C5955]">Indexed via PostgreSQL</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs">
                  <div className="flex items-center justify-between text-[#5C5955] text-xs mb-2">
                    <span>Storage Allocated</span>
                    <HardDrive className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-serif font-bold text-[#20242C]">
                    {storageStats ? `${(storageStats.totalUsedBytes / (1024 * 1024)).toFixed(1)} MB` : "0.0 MB"}
                  </p>
                  <span className="text-[11px] text-[#5C5955]">LocalDiskStorageDriver</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs">
                  <div className="flex items-center justify-between text-[#5C5955] text-xs mb-2">
                    <span>Print Queue</span>
                    <Printer className="w-4 h-4 text-[#20242C]" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-serif font-bold text-[#20242C]">{overviewMetrics?.ordersCount ?? orders.length}</p>
                  <span className="text-[11px] text-[#76556F] font-medium">Frozen Edition Hashes</span>
                </div>
              </div>
            )}

            {/* Microservice Health Grid (ADMIN-13) */}
            {selectedTab === "overview" && servicesHealth.length > 0 && (
              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-5 space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C]">Microservice Cluster Latency (ADMIN-13)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {servicesHealth.map((s) => (
                    <div key={s.service} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs">
                      <p className="font-semibold text-[#20242C]">{s.service}</p>
                      <p className="text-[#5F735E] mt-0.5">{s.status} • {s.latencyMs}ms</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Spaces Directory (ADMIN-04) */}
            {(selectedTab === "overview" || selectedTab === "spaces") && (
              <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#E7E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#20242C]">Memory Space Directory</h2>
                    <p className="text-xs text-[#5C5955]">Inspect archival quotas, membership counts, and sync integrity across vaults.</p>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8D857A] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      id="admin-space-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search spaces or emails..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs w-56"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#F0ECE1] bg-[#FAF8F5] text-[11px] font-semibold uppercase tracking-wider text-[#5C5955]">
                        <th className="py-3.5 px-5">Space &amp; Owner</th>
                        <th className="py-3.5 px-4">Type</th>
                        <th className="py-3.5 px-4">Members</th>
                        <th className="py-3.5 px-4">Storage Quota</th>
                        <th className="py-3.5 px-4">Sync Status</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0ECE1] text-xs">
                      {filteredSpaces.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 px-5 text-center text-[#5C5955]">
                            {adminAuthorized
                              ? "No memory spaces match your filter yet."
                              : "Sign in as an administrator to inspect live memory spaces."}
                          </td>
                        </tr>
                      ) : (
                        filteredSpaces.map((space) => (
                          <tr key={space.id} className="hover:bg-[#FAF8F5]">
                            <td className="py-4 px-5">
                              <div className="font-serif font-bold text-[#20242C] text-sm">{space.name}</div>
                              <div className="text-[11px] text-[#5C5955]">{space.ownerEmail}</div>
                            </td>
                            <td className="py-4 px-4 capitalize">{space.type}</td>
                            <td className="py-4 px-4">{space.memberCount}</td>
                            <td className="py-4 px-4">{space.usedBytesFormatted} ({space.usedPercentage}%)</td>
                            <td className="py-4 px-4">
                              {space.syncStatus === "synchronized" ? (
                                <span className="inline-flex items-center gap-1 text-[#5F735E]"><CheckCircle2 className="w-3.5 h-3.5" /> Synchronized</span>
                              ) : space.syncStatus === "warning" ? (
                                <span className="inline-flex items-center gap-1 text-[#B6423E]"><AlertTriangle className="w-3.5 h-3.5" /> High Quota</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[#76556F]"><Clock className="w-3.5 h-3.5" /> Processing</span>
                              )}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  lastInspectTriggerRef.current = e.currentTarget;
                                  setInspectedSpace(space);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#F7F4EE] border border-[#E7E2DA]"
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users, Session Revocation & Dual-Party Access Requests (ADMIN-02 / 03 / 05) */}
            {selectedTab === "users" && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-serif text-lg font-bold text-[#20242C]">User Directory &amp; Session Controls (ADMIN-02 / ADMIN-03)</h2>
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Filter users by email or name..."
                      className="px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs w-64"
                    />
                  </div>
                  <div className="space-y-2">
                    {adminUsers.length === 0 ? (
                      <p className="text-xs text-[#5C5955]">No live user records loaded (sign in as admin).</p>
                    ) : (
                      adminUsers
                        .filter(
                          (u) =>
                            !userSearchQuery.trim() ||
                            u.email.toLowerCase().includes(userSearchQuery.trim().toLowerCase()) ||
                            u.fullName.toLowerCase().includes(userSearchQuery.trim().toLowerCase())
                        )
                        .map((u) => (
                          <div key={u.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div>
                              <p className="font-semibold text-[#20242C]">{u.fullName} ({u.email})</p>
                              <p className="text-[11px] text-[#5C5955] uppercase">{u.role} • {u.status} • {u.isVerified ? "Verified" : "Unverified"}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  runAdminAction(
                                    () => updateAdminUserStatus(u.id, u.status === "suspended" ? "active" : "suspended").then(() => undefined),
                                    `Updated status for ${u.email}.`
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-white border border-[#E7E2DA] font-medium"
                              >
                                {u.status === "suspended" ? "Reactivate" : "Suspend"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  runAdminAction(
                                    () => revokeAdminUserSessions(u.id).then(() => undefined),
                                    `Revoked all active sessions for ${u.email}.`
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-[#FDF2F2] text-[#B6423E] font-medium"
                              >
                                Revoke Sessions
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">Dual-Party Support Access Console (ADMIN-05)</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newAccessReason.trim()) return;
                      const reason = newAccessReason.trim();
                      setNewAccessReason("");
                      runAdminAction(
                        () => createAdminAccessRequest(reason).then(() => undefined),
                        "Submitted dual-custody support access request."
                      );
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={newAccessReason}
                      onChange={(e) => setNewAccessReason(e.target.value)}
                      placeholder="Support ticket reason for temporary access..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                    <button type="submit" className="px-4 py-2 rounded-xl bg-[#20242C] text-white text-xs font-semibold">
                      Request Access
                    </button>
                  </form>
                  {accessRequests.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between text-xs">
                      <span><strong>{r.reason}</strong> ({r.status})</span>
                      {r.status === "pending" && (
                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              () => approveAdminAccessRequest(r.id).then(() => undefined),
                              `Approved support access request ${r.id.slice(0, 8)}.`
                            )
                          }
                          className="px-3 py-1 rounded-lg bg-[#5F735E] text-white font-semibold"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  ))}
                </section>
              </div>
            )}

            {/* Moderation & Reports (ADMIN-06 / 07) */}
            {selectedTab === "moderation" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">Moderation Queue (ADMIN-06)</h2>
                  {moderationFlags.length === 0 ? (
                    <p className="text-xs text-[#5C5955]">Zero flagged memories awaiting review.</p>
                  ) : (
                    moderationFlags.map((f) => (
                      <div key={f.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between items-center gap-2 text-xs">
                        <span>{f.reason} ({f.status})</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              runAdminAction(
                                () => resolveAdminModerationFlag(f.id, "approved").then(() => undefined),
                                "Approved flagged item."
                              )
                            }
                            className="px-2 py-1 rounded bg-[#5F735E] text-white"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              runAdminAction(
                                () => resolveAdminModerationFlag(f.id, "quarantined").then(() => undefined),
                                "Quarantined flagged item."
                              )
                            }
                            className="px-2 py-1 rounded bg-[#B6423E] text-white"
                          >
                            Quarantine
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </section>
                <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">User Abuse Reports (ADMIN-07)</h2>
                  {reports.length === 0 ? (
                    <p className="text-xs text-[#5C5955]">No open policy reports.</p>
                  ) : (
                    reports.map((rep) => (
                      <div key={rep.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between items-center gap-2 text-xs">
                        <span>{rep.targetType}: {rep.reason} ({rep.status})</span>
                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              () => resolveAdminReport(rep.id, "resolved").then(() => undefined),
                              "Resolved user policy report."
                            )
                          }
                          className="px-2.5 py-1 rounded bg-[#20242C] text-white"
                        >
                          Resolve
                        </button>
                      </div>
                    ))
                  )}
                </section>
              </div>
            )}

            {/* Storage & Media Inspector (ADMIN-08 / 09 / 10) */}
            {selectedTab === "storage" && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">Local Storage &amp; Upload Sessions (ADMIN-08 / 09 / 10)</h2>
                  {storageStats && (
                    <p className="text-xs text-[#5C5955]">
                      Driver: <strong>{storageStats.driver}</strong> • Assets: <strong>{storageStats.assetCount}</strong> • Total Used: <strong>{(storageStats.totalUsedBytes / 1024).toFixed(1)} KB</strong>
                    </p>
                  )}
                  <div className="space-y-2">
                    {uploadSessions.map((u) => (
                      <div key={u.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between text-xs">
                        <span><strong>{u.originalName}</strong> ({u.mimeType}, {u.status})</span>
                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              () => reprocessAdminMedia(u.id).then(() => undefined),
                              `Re-queued derivative & OCR job for ${u.originalName}.`
                            )
                          }
                          className="px-3 py-1 rounded-lg bg-[#20242C] text-white font-medium"
                        >
                          Reprocess
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Queues & Book Rendering (ADMIN-11 / 12 / 14 / 15) */}
            {(selectedTab === "overview" || selectedTab === "queues") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">BullMQ Queues &amp; DLQ Console (ADMIN-11 / 12)</h2>
                  {queuesTelemetry.length > 0 ? (
                    queuesTelemetry.map((q) => (
                      <div key={q.name} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs flex justify-between items-center">
                        <span>
                          <strong>{q.name}</strong> (Active: {q.active}, Waiting: {q.waiting}, Completed: {q.completed}, Failed: {q.failed})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              () => retryAdminQueueJob(q.name, "latest").then(() => undefined),
                              `Retried failed jobs in queue ${q.name}.`
                            )
                          }
                          className="px-2.5 py-1 rounded bg-white border border-[#E7E2DA] font-medium"
                        >
                          Retry DLQ
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs flex justify-between">
                      <span>Outbox Relay Mode</span>
                      <span className="font-semibold text-[#5F735E]">SKIP LOCKED Active</span>
                    </div>
                  )}
                  {deadLetterJobs.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[#F0ECE1]">
                      <p className="text-[11px] font-semibold text-[#B6423E]">Failed Jobs ({deadLetterJobs.length})</p>
                      {deadLetterJobs.map((j) => (
                        <div key={`${j.queueName}-${j.jobId}`} className="p-2 rounded bg-[#FDF2F2] text-[11px] flex justify-between items-center">
                          <span>{j.queueName}: {j.jobName} ({j.failedReason})</span>
                          <button
                            type="button"
                            onClick={() =>
                              runAdminAction(
                                () => retryAdminQueueJob(j.queueName, j.jobId).then(() => undefined),
                                `Retried job ${j.jobId}.`
                              )
                            }
                            className="px-2 py-0.5 rounded bg-white border border-[#F5C6C6]"
                          >
                            Retry
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">Book Rendering &amp; Preflight (ADMIN-14 / 15)</h2>
                  <div className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs flex justify-between">
                    <span>Tesseract Engine</span>
                    <span className="font-semibold text-[#20242C]">{ocrEngineStatus}</span>
                  </div>
                  {bookJobs.slice(0, 6).map((b) => (
                    <div key={b.id} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs flex justify-between items-center gap-2">
                      <span>{b.title} (v{b.version})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#76556F] font-semibold">
                          {b.preflightOverridden ? "Overridden" : b.isFrozenForPrint ? "Frozen" : "Draft"}
                        </span>
                        {adminAuthorized && !b.preflightOverridden && (
                          <button
                            type="button"
                            onClick={() =>
                              runAdminAction(
                                () => overrideAdminPreflight(b.id, "Approved by prepress operator").then(() => undefined),
                                `Overrode preflight tolerances for "${b.title}".`
                              )
                            }
                            className="px-2 py-1 rounded bg-white border border-[#E7E2DA] text-[11px] font-medium"
                          >
                            Override Preflight
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Print Orders & Refunds & Transactions (ADMIN-18..21) */}
            {(selectedTab === "overview" || selectedTab === "orders") && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-[#E7E2DA]">
                    <h2 className="font-serif text-lg font-bold text-[#20242C]">Print Fulfillment Queue (ADMIN-18 / 19 / 20 / 21)</h2>
                    <p className="text-xs text-[#5C5955]">
                      Verify frozen edition hashes, inject courier tracking, or authorize refunds/remakes. Transactions: {transactions.transactions.length} • Refunds: {transactions.refunds.length}.
                    </p>
                  </div>
                  <div className="divide-y divide-[#F0ECE1]">
                    {orders.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#5C5955]">
                        {adminAuthorized
                          ? "No physical print orders have been placed yet."
                          : "Sign in as an administrator to manage live print fulfillment orders."}
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div key={order.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#76556F]">{order.id.slice(0, 12)}</span>
                              <span className="font-serif font-bold text-sm text-[#20242C]">{order.bookTitle}</span>
                            </div>
                            <p className="text-xs text-[#5C5955]">
                              {order.format} • {order.recipient} • {order.amount} {order.trackingNumber ? `• Track: ${order.trackingNumber}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-[#F0ECE1] text-[11px] uppercase font-semibold text-[#20242C]">
                              {order.status}
                            </span>
                            {order.status !== "shipped" && (
                              <>
                                <input
                                  type="text"
                                  aria-label={`Tracking number for ${order.id}`}
                                  value={trackingInputs[order.id] || ""}
                                  onChange={(e) =>
                                    setTrackingInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                                  }
                                  placeholder="Tracking # (optional)"
                                  className="px-2.5 py-1.5 rounded-lg bg-[#F7F4EE] border border-[#E7E2DA] text-xs w-36"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleShipOrder(order)}
                                  className="px-3 py-1.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium"
                                >
                                  Ship with Tracking
                                </button>
                              </>
                            )}
                            {order.status !== "cancelled" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRefundOrder(order, "remake")}
                                  className="px-3 py-1.5 rounded-xl bg-[#F0ECE1] text-[#20242C] text-xs font-medium"
                                >
                                  Authorize Remake
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRefundOrder(order, "refund")}
                                  className="px-3 py-1.5 rounded-xl bg-[#FDF2F2] text-[#B6423E] text-xs font-medium"
                                >
                                  Issue Refund
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {selectedTab === "orders" && transactions.transactions.length > 0 && (
                  <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] p-6 space-y-3">
                    <h2 className="font-serif text-lg font-bold text-[#20242C]">Payment &amp; Settlement Ledger (ADMIN-21)</h2>
                    <div className="space-y-2 text-xs">
                      {transactions.transactions.slice(0, 15).map((tx: any) => (
                        <div key={tx.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between">
                          <span className="font-mono">{String(tx.id).slice(0, 12)} • {tx.paymentMode || "sandbox_zero_budget"}</span>
                          <span className="font-semibold text-[#20242C]">
                            ${((Number(tx.totalCents) || 0) / 100).toFixed(2)} {tx.currency || "USD"} ({tx.status})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Catalog & Pricing Matrix (ADMIN-16 / 17) */}
            {(selectedTab === "catalog" || selectedTab === "governance") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">Print Catalog Manager (ADMIN-16)</h2>
                  {(catalogFormats.length > 0 ? catalogFormats : (catalog?.formats || []).map((f) => ({ formatId: f.id, label: f.label, dimensionsCm: f.dimensionsCm, baseCents: f.baseCents, enabled: true }))).map((f) => (
                    <div key={f.formatId} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>{f.label} ({f.dimensionsCm})</span>
                      <div className="flex items-center gap-2">
                        {adminAuthorized ? (
                          <>
                            <input
                              type="number"
                              step="0.50"
                              min="1"
                              aria-label={`Base USD for ${f.label}`}
                              value={formatPriceEdits[f.formatId] ?? (f.baseCents / 100).toFixed(2)}
                              onChange={(e) =>
                                setFormatPriceEdits((prev) => ({ ...prev, [f.formatId]: e.target.value }))
                              }
                              className="w-20 px-2 py-1 rounded bg-white border border-[#E7E2DA] font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const usd = Number(formatPriceEdits[f.formatId] ?? f.baseCents / 100);
                                const cents = Math.round(usd * 100);
                                runAdminAction(
                                  () => updateAdminCatalogFormat(f.formatId, { baseCents: cents }).then(() => undefined),
                                  `Updated base price for ${f.label} to $${(cents / 100).toFixed(2)}.`
                                );
                              }}
                              className="px-2.5 py-1 rounded bg-[#20242C] text-white font-medium"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                runAdminAction(
                                  () => updateAdminCatalogFormat(f.formatId, { enabled: !f.enabled }).then(() => undefined),
                                  `${f.enabled ? "Disabled" : "Enabled"} ${f.label}.`
                                )
                              }
                              className="px-2 py-1 rounded bg-white border border-[#E7E2DA]"
                            >
                              {f.enabled ? "Enabled" : "Disabled"}
                            </button>
                          </>
                        ) : (
                          <span className="font-mono font-semibold">${(f.baseCents / 100).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">Shipping Rate Matrix (ADMIN-17)</h2>
                  {shippingRates.map((sr) => (
                    <div key={sr.zoneCode} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>{sr.label} ({sr.estimatedDays})</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          aria-label={`Shipping USD for ${sr.zoneCode}`}
                          value={shippingRateEdits[sr.zoneCode] ?? (sr.rateCents / 100).toFixed(2)}
                          onChange={(e) =>
                            setShippingRateEdits((prev) => ({ ...prev, [sr.zoneCode]: e.target.value }))
                          }
                          className="w-20 px-2 py-1 rounded bg-white border border-[#E7E2DA] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const usd = Number(shippingRateEdits[sr.zoneCode] ?? sr.rateCents / 100);
                            const cents = Math.round(usd * 100);
                            runAdminAction(
                              () => updateAdminShippingRate(sr.zoneCode, cents, sr.estimatedDays).then(() => undefined),
                              `Updated ${sr.zoneCode} shipping rate to $${(cents / 100).toFixed(2)}.`
                            );
                          }}
                          className="px-2.5 py-1 rounded bg-[#76556F] text-white font-semibold"
                        >
                          Update Rate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Governance: Templates, Feature Flags & Audit Logs (ADMIN-22 / 23 / 24) */}
            {(selectedTab === "overview" || selectedTab === "governance") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">Feature Flags &amp; Security Audit (ADMIN-23 / 24)</h2>
                  {featureFlags.length > 0 ? (
                    featureFlags.map((flag) => (
                      <div key={flag.flagKey} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-[#20242C]">{flag.flagKey}</p>
                          <p className="text-[11px] text-[#5C5955]">{flag.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              () => updateAdminFeatureFlag(flag.flagKey, !flag.enabled).then(() => undefined),
                              `Toggled feature flag ${flag.flagKey} ${!flag.enabled ? "ON" : "OFF"}.`
                            )
                          }
                          className={`px-3 py-1 rounded-full font-semibold ${
                            flag.enabled ? "bg-[#5F735E] text-white" : "bg-[#E7E2DA] text-[#28272A]"
                          }`}
                        >
                          {flag.enabled ? "ON" : "OFF"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <ul className="space-y-2 text-xs text-[#5C5955]">
                      <li className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between">
                        <span>Zero-Budget Cardless Storage Enforcement</span>
                        <span className="font-semibold text-[#5F735E]">ACTIVE</span>
                      </li>
                      <li className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between">
                        <span>Immutable Edition Freeze Hashing</span>
                        <span className="font-semibold text-[#76556F]">SHA-256 LOCKED</span>
                      </li>
                    </ul>
                  )}
                  {auditLogs.length > 0 && (
                    <div className="pt-2 text-xs space-y-1">
                      <p className="font-semibold text-[#20242C]">Recent Audit Ledger ({auditLogs.length})</p>
                      {auditLogs.slice(0, 6).map((a) => (
                        <p key={a.id} className="text-[#5C5955] font-mono text-[11px]">{a.action} • {a.entityType}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
                  <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                    Email Template Editor (ADMIN-22)
                  </h2>
                  {emailTemplates.length > 0 && (
                    <div className="space-y-2 text-xs">
                      <select
                        value={selectedTemplateKey}
                        onChange={(e) => {
                          const match = emailTemplates.find((t) => t.templateKey === e.target.value);
                          setSelectedTemplateKey(e.target.value);
                          if (match) {
                            setTemplateSubject(match.subject);
                            setTemplateBody(match.htmlBody);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]"
                      >
                        {emailTemplates.map((t) => (
                          <option key={t.templateKey} value={t.templateKey}>{t.templateKey}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={templateSubject}
                        onChange={(e) => setTemplateSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]"
                      />
                      <textarea
                        rows={3}
                        value={templateBody}
                        onChange={(e) => setTemplateBody(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          runAdminAction(
                            () => updateAdminEmailTemplate(selectedTemplateKey, templateSubject, templateBody).then(() => undefined),
                            `Saved template ${selectedTemplateKey}.`
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-[#20242C] text-white font-semibold"
                      >
                        Save Template
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Support Ticketing Console (ADMIN-25) */}
            {selectedTab === "tickets" && (
              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#20242C]">Customer Support Ticketing Console (ADMIN-25)</h2>
                {tickets.length === 0 ? (
                  <p className="text-xs text-[#5C5955]">Zero open support tickets. Inbox zero achieved!</p>
                ) : (
                  tickets.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-2 text-xs">
                      <div className="flex justify-between">
                        <strong>{t.subject}</strong>
                        <span className="uppercase text-[#76556F] font-semibold">{t.status}</span>
                      </div>
                      <p className="text-[#5C5955]">{t.email}: {t.message}</p>
                      {t.replies && t.replies.length > 0 && (
                        <div className="pl-3 border-l-2 border-[#76556F]/40 space-y-1">
                          {t.replies.map((rep) => (
                            <p key={rep.id} className="text-[11px] text-[#28272A]">
                              <strong>{rep.authorName}:</strong> {rep.message}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyTexts[t.id] || ""}
                          onChange={(e) => setReplyTexts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          placeholder="Write reply..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#E7E2DA]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const msg = replyTexts[t.id]?.trim();
                            if (!msg) return;
                            setReplyTexts((prev) => ({ ...prev, [t.id]: "" }));
                            runAdminAction(
                              () => replyAdminTicket(t.id, msg, "resolved").then(() => undefined),
                              `Replied to ticket "${t.subject}".`
                            );
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#76556F] text-white font-semibold"
                        >
                          Send &amp; Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}

            {/* Admin Security Keys & 2FA (ADMIN-26) */}
            {selectedTab === "security" && (
              <section className="bg-white rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#20242C]">Admin Hardware FIDO2 &amp; TOTP Security Keys (ADMIN-26)</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newKeyName.trim()) return;
                    const name = newKeyName.trim();
                    setNewKeyName("");
                    runAdminAction(
                      () => registerAdminSecurityKey(name, "fido2").then(() => undefined),
                      `Registered hardware security key "${name}".`
                    );
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="YubiKey 5C NFC..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                  <button type="submit" className="px-4 py-2 rounded-xl bg-[#20242C] text-white text-xs font-semibold">
                    Register Security Key
                  </button>
                </form>
                <div className="space-y-2">
                  {securityKeys.map((k) => (
                    <div key={k.id} className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between text-xs">
                      <span><strong>{k.name}</strong> ({k.keyType.toUpperCase()})</span>
                      <button
                        type="button"
                        onClick={() =>
                          runAdminAction(
                            () => deleteAdminSecurityKey(k.id).then(() => undefined),
                            `Removed security key "${k.name}".`
                          )
                        }
                        className="text-[#B6423E] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Accessible Space Inspection Modal */}
      {inspectedSpace &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-[#20242C]/50 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-space-title"
            onClick={() => {
              setInspectedSpace(null);
              lastInspectTriggerRef.current?.focus();
            }}
          >
            <div
              ref={inspectDialogRef}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#76556F] font-semibold">
                    Vault Telemetry • {inspectedSpace.id}
                  </span>
                  <h2 id="inspect-space-title" className="font-serif text-xl font-bold text-[#20242C]">
                    {inspectedSpace.name}
                  </h2>
                </div>
                <button
                  ref={closeDrawerRef}
                  type="button"
                  onClick={() => {
                    setInspectedSpace(null);
                    lastInspectTriggerRef.current?.focus();
                  }}
                  aria-label="Close space inspector"
                  className="p-2 rounded-xl bg-[#F7F4EE] text-[#20242C]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs text-[#28272A]">
                <p><strong>Owner:</strong> {inspectedSpace.ownerEmail}</p>
                <p><strong>Members:</strong> {inspectedSpace.memberCount}</p>
                <p><strong>Allocated Storage:</strong> {inspectedSpace.usedBytesFormatted} ({inspectedSpace.usedPercentage}%)</p>
                <p><strong>Sync Health:</strong> {inspectedSpace.syncStatus}</p>
                <p><strong>Last Active:</strong> {inspectedSpace.lastActive}</p>
              </div>
              <div className="pt-3 border-t border-[#E7E2DA] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setInspectedSpace(null);
                    lastInspectTriggerRef.current?.focus();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
