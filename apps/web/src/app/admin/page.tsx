"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Users,
  HardDrive,
  Activity,
  Layers,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Database,
  RefreshCw,
  FileText,
  Lock,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { API_BASE_URL, apiRequest, getStoredSession, MemorySpaceDTO } from "@/lib/api";

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
  status: "queued" | "preflight_ok" | "printing" | "shipped";
  amount: string;
}

const SAMPLE_SPACES: SpaceRecord[] = [
  {
    id: "space-01",
    name: "The Bennett Family Heritage",
    type: "family",
    ownerEmail: "elena.bennett@example.com",
    memberCount: 8,
    memoryCount: 142,
    usedBytesFormatted: "142.4 MB",
    usedPercentage: 28.5,
    syncStatus: "synchronized",
    lastActive: "12 mins ago",
  },
  {
    id: "space-02",
    name: "Clara's Childhood Milestone Capsule",
    type: "personal",
    ownerEmail: "clara.b@example.com",
    memberCount: 2,
    memoryCount: 84,
    usedBytesFormatted: "86.1 MB",
    usedPercentage: 17.2,
    syncStatus: "synchronized",
    lastActive: "2 hours ago",
  },
  {
    id: "space-03",
    name: "Rostov Ancestral Estate & Letters",
    type: "heritage",
    ownerEmail: "dmitri.r@example.com",
    memberCount: 14,
    memoryCount: 412,
    usedBytesFormatted: "418.0 MB",
    usedPercentage: 83.6,
    syncStatus: "warning",
    lastActive: "Just now",
  },
  {
    id: "space-04",
    name: "Summer in Tuscany Journal 1948",
    type: "heritage",
    ownerEmail: "marco.v@example.com",
    memberCount: 4,
    memoryCount: 29,
    usedBytesFormatted: "34.8 MB",
    usedPercentage: 7.0,
    syncStatus: "processing",
    lastActive: "Yesterday",
  },
];

const INITIAL_ORDERS: OrderRecord[] = [
  {
    id: "ORD-8491",
    bookTitle: "The Bennett Family Heritage Vol. I",
    spaceName: "The Bennett Family Heritage",
    recipient: "Elena Bennett • Portland, OR",
    format: "Standard 8x10 Hardcover (Dusk Plum)",
    status: "printing",
    amount: "$78.00",
  },
  {
    id: "ORD-8492",
    bookTitle: "Rostov Letters 1938–1964",
    spaceName: "Rostov Ancestral Estate & Letters",
    recipient: "Dmitri Rostov • Boston, MA",
    format: "Grand 12x12 Hardcover (Deep Sage)",
    status: "preflight_ok",
    amount: "$96.00",
  },
];

export default function AdminPortalPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"overview" | "spaces" | "queues" | "orders">(
    "overview"
  );
  const [spaces, setSpaces] = useState<SpaceRecord[]>(SAMPLE_SPACES);
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [gatewayStatus, setGatewayStatus] = useState<"checking" | "online" | "offline">("checking");
  const [ocrEngineStatus, setOcrEngineStatus] = useState<string>("Checking...");
  const [inspectedSpace, setInspectedSpace] = useState<SpaceRecord | null>(null);
  const closeDrawerRef = useRef<HTMLButtonElement | null>(null);
  const lastInspectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const inspectDialogRef = useRef<HTMLDivElement | null>(null);
  const adminSurfaceRef = useRef<HTMLDivElement | null>(null);

  const probeClusterHealth = useCallback(async () => {
    setGatewayStatus("checking");
    const rootUrl = API_BASE_URL.replace(/\/api\/v1$/, "");
    try {
      const res = await fetch(`${rootUrl}/health`);
      setGatewayStatus(res.ok ? "online" : "offline");
    } catch {
      setGatewayStatus("offline");
    }

    try {
      const ocrRes = await fetch(`${API_BASE_URL}/media/ocr/status`);
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

    const session = getStoredSession();
    if (session.accessToken) {
      apiRequest<{ spaces?: MemorySpaceDTO[]; items?: MemorySpaceDTO[] } | MemorySpaceDTO[]>(
        "/spaces"
      )
        .then((res) => {
          const list = Array.isArray(res) ? res : res.spaces || res.items || [];
          if (list.length > 0) {
            const liveRecords: SpaceRecord[] = list.map((s) => ({
              id: s.id,
              name: s.name,
              type: s.type === "family" || s.type === "personal" ? s.type : "heritage",
              ownerEmail: session.user?.email || "owner@memoria.local",
              memberCount: 1,
              memoryCount: 0,
              usedBytesFormatted: "Live Vault",
              usedPercentage: 12,
              syncStatus: "synchronized",
              lastActive: new Date(s.updatedAt).toLocaleDateString(),
            }));
            setSpaces([...liveRecords, ...SAMPLE_SPACES]);
          }
        })
        .catch(() => {
          setSpaces(SAMPLE_SPACES);
        });
    }
  }, []);

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

  const advanceOrderStatus = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const nextStatus: OrderRecord["status"] =
          o.status === "queued"
            ? "preflight_ok"
            : o.status === "preflight_ok"
            ? "printing"
            : "shipped";
        return { ...o, status: nextStatus };
      })
    );
  };

  const filteredSpaces = spaces.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#28272A] flex flex-col">
      <div ref={adminSurfaceRef} className="flex-1 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E7E2DA]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#E7E2DA]">
                <Image
                  src="/branding/memoria-app-icon-192.png"
                  alt="Memoria Admin"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-serif text-lg font-bold tracking-tight text-[#20242C]">
                Memoria
              </span>
            </Link>
            <span className="text-[#E7E2DA]">/</span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0ECE1] border border-[#E7E2DA]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#76556F]" aria-hidden="true" />
              <span className="text-[11px] font-semibold text-[#20242C] uppercase tracking-wider">
                Archival Governance
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
              <span
                className={`w-2 h-2 rounded-full ${
                  gatewayStatus === "online" ? "bg-[#5F735E]" : "bg-[#8D857A]"
                }`}
              />
              Gateway: {gatewayStatus === "online" ? "Healthy" : gatewayStatus}
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-[#76556F] hover:text-[#20242C] transition-colors flex items-center gap-1"
            >
              PWA Dashboard <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          <nav aria-label="Admin Portal Sections" className="space-y-1">
            {(
              [
                { id: "overview", label: "System Overview", icon: Activity },
                { id: "spaces", label: "Memory Spaces", icon: Layers },
                { id: "queues", label: "Sync & Media Queues", icon: Database },
                { id: "orders", label: "Print Orders", icon: Printer },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = selectedTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-[#20242C] text-[#FFFFFF] shadow-sm"
                      : "text-[#5C5955] hover:bg-[#FFFFFF] hover:text-[#20242C]"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </span>
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />}
                </button>
              );
            })}
          </nav>

          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8D857A]">
                Zero-Budget Storage
              </span>
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

        {/* Main Workspace */}
        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-[#20242C]">
                {selectedTab === "overview"
                  ? "System Overview"
                  : selectedTab === "spaces"
                  ? "Memory Spaces Directory"
                  : selectedTab === "queues"
                  ? "Sync, OCR & Outbox Queues"
                  : "Print Fulfillment Orders"}
              </h1>
              <p className="text-sm text-[#5C5955] mt-1">
                Real-time visibility across memory spaces, OCR indexing, transactional outboxes, and hardcover fulfillment.
              </p>
            </div>
            <button
              type="button"
              onClick={probeClusterHealth}
              className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E7E2DA] text-xs font-medium text-[#20242C] hover:border-[#76556F] transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#76556F]" aria-hidden="true" />
              Refresh Health
            </button>
          </div>

          {/* KPI Cards (shown on overview & spaces) */}
          {(selectedTab === "overview" || selectedTab === "spaces") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs">
                <div className="flex items-center justify-between text-[#5C5955] text-xs mb-2">
                  <span>Active Family Spaces</span>
                  <Users className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                </div>
                <p className="text-2xl font-serif font-bold text-[#20242C]">{spaces.length}</p>
                <span className="text-[11px] text-[#5F735E] font-medium">RBAC Isolated</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs">
                <div className="flex items-center justify-between text-[#5C5955] text-xs mb-2">
                  <span>Archived Memories</span>
                  <FileText className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
                </div>
                <p className="text-2xl font-serif font-bold text-[#20242C]">667</p>
                <span className="text-[11px] text-[#5C5955]">Indexed via PostgreSQL GIN</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs">
                <div className="flex items-center justify-between text-[#5C5955] text-xs mb-2">
                  <span>Storage Allocated</span>
                  <HardDrive className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                </div>
                <p className="text-2xl font-serif font-bold text-[#20242C]">681.3 MB</p>
                <span className="text-[11px] text-[#5C5955]">Streaming + 206 Range</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs">
                <div className="flex items-center justify-between text-[#5C5955] text-xs mb-2">
                  <span>Print Queue</span>
                  <Printer className="w-4 h-4 text-[#20242C]" aria-hidden="true" />
                </div>
                <p className="text-2xl font-serif font-bold text-[#20242C]">{orders.length}</p>
                <span className="text-[11px] text-[#76556F] font-medium">Frozen Edition Hashes</span>
              </div>
            </div>
          )}

          {/* Overview / Spaces Table */}
          {(selectedTab === "overview" || selectedTab === "spaces") && (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[#E7E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">
                    Memory Space Directory
                  </h2>
                  <p className="text-xs text-[#5C5955]">
                    Inspect archival quotas, membership counts, and sync integrity across vaults.
                  </p>
                </div>

                <div className="relative">
                  <label htmlFor="admin-space-search" className="sr-only">
                    Search spaces or emails
                  </label>
                  <Search
                    className="w-3.5 h-3.5 text-[#8D857A] absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-space-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search spaces or emails..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C] focus:outline-none focus:border-[#76556F] w-56"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#F0ECE1] bg-[#FAF8F5] text-[11px] font-semibold uppercase tracking-wider text-[#5C5955]">
                      <th className="py-3.5 px-5">Space & Owner</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Members</th>
                      <th className="py-3.5 px-4">Storage Quota</th>
                      <th className="py-3.5 px-4">Sync Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE1] text-xs">
                    {filteredSpaces.map((space) => (
                      <tr key={space.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-serif font-bold text-[#20242C] text-sm">
                            {space.name}
                          </div>
                          <div className="text-[11px] text-[#5C5955]">{space.ownerEmail}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-[#F0ECE1] text-[#28272A] capitalize text-[11px] font-medium">
                            {space.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-[#20242C] font-medium">
                          {space.memberCount}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-medium text-[#20242C]">
                              {space.usedBytesFormatted}
                            </span>
                            <span className="text-[#5C5955]">{space.usedPercentage}%</span>
                          </div>
                          <div className="w-28 h-1.5 rounded-full bg-[#F0ECE1] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                space.usedPercentage > 80 ? "bg-[#B6423E]" : "bg-[#5F735E]"
                              }`}
                              style={{ width: `${space.usedPercentage}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {space.syncStatus === "synchronized" && (
                            <span className="inline-flex items-center gap-1 text-[#5F735E] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                              Synchronized
                            </span>
                          )}
                          {space.syncStatus === "processing" && (
                            <span className="inline-flex items-center gap-1 text-[#76556F] font-medium">
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" /> OCR Processing
                            </span>
                          )}
                          {space.syncStatus === "warning" && (
                            <span className="inline-flex items-center gap-1 text-[#B6423E] font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> High Quota
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              lastInspectTriggerRef.current = e.currentTarget;
                              setInspectedSpace(space);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#F7F4EE] border border-[#E7E2DA] text-[#20242C] hover:border-[#76556F] transition-colors"
                          >
                            <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sync & Media Queues Tab */}
          {(selectedTab === "overview" || selectedTab === "queues") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C]">
                  Transactional Outbox & JetStream Relay
                </h2>
                <p className="text-xs text-[#5C5955]">
                  Every memory creation, media completion, and book freeze stages events atomically via `FOR UPDATE SKIP LOCKED` relay and explicit JetStream acknowledgments.
                </p>
                <div className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs flex justify-between">
                  <span className="text-[#5C5955]">Outbox Relay Mode</span>
                  <span className="font-semibold text-[#5F735E]">SKIP LOCKED Active</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#20242C]">
                  BullMQ Media & OCR Workers
                </h2>
                <p className="text-xs text-[#5C5955]">
                  Dedicated worker Redis connections execute Sharp EXIF-oriented thumbnails, FFmpeg video metadata, and single-pass Tesseract TSV OCR with 30s timeouts.
                </p>
                <div className="p-3 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs flex justify-between">
                  <span className="text-[#5C5955]">Tesseract Engine</span>
                  <span className="font-semibold text-[#20242C]">{ocrEngineStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* Print Fulfillment Orders Tab */}
          {(selectedTab === "overview" || selectedTab === "orders") && (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7E2DA] shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[#E7E2DA]">
                <h2 className="font-serif text-lg font-bold text-[#20242C]">
                  Print Fulfillment Queue
                </h2>
                <p className="text-xs text-[#5C5955]">
                  Verify frozen edition hashes and advance print jobs through press and shipping.
                </p>
              </div>
              <div className="divide-y divide-[#F0ECE1]">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#76556F]">{order.id}</span>
                        <span className="font-serif font-bold text-sm text-[#20242C]">
                          {order.bookTitle}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C5955]">
                        {order.format} • {order.recipient} • {order.amount}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-[#F0ECE1] text-[11px] uppercase font-semibold text-[#20242C]">
                        {order.status}
                      </span>
                      {order.status !== "shipped" && (
                        <button
                          type="button"
                          onClick={() => advanceOrderStatus(order.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium hover:bg-[#343A46]"
                        >
                          Advance Stage
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
      </div>

      {/* Accessible Space Inspection Modal */}
      {inspectedSpace && (
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
              <p>
                <strong>Owner:</strong> {inspectedSpace.ownerEmail}
              </p>
              <p>
                <strong>Members:</strong> {inspectedSpace.memberCount}
              </p>
              <p>
                <strong>Allocated Storage:</strong> {inspectedSpace.usedBytesFormatted} (
                {inspectedSpace.usedPercentage}%)
              </p>
              <p>
                <strong>Sync Health:</strong> {inspectedSpace.syncStatus}
              </p>
              <p>
                <strong>Last Active:</strong> {inspectedSpace.lastActive}
              </p>
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
        </div>
      )}
    </div>
  );
}
