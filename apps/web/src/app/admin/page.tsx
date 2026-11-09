"use client";

import React, { useState } from "react";
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
  Filter,
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
} from "lucide-react";

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

export default function AdminPortalPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"overview" | "spaces" | "queues" | "orders">("overview");

  const filteredSpaces = SAMPLE_SPACES.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#28272A] flex flex-col selection:bg-[#76556F]/20 selection:text-[#20242C]">
      {/* 1. Admin Global Header */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E7E2DA] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#E7E2DA]">
                <Image
                  src="/branding/memoria-app-icon-192.png"
                  alt="Memoria Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-serif font-bold text-lg text-[#20242C]">Memoria</span>
            </Link>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#F4EEF3] text-[#76556F] border border-[#E7E2DA]">
              Admin Operations
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EEF2ED] border border-[#B6DBC7] text-[#5F735E]">
              <span className="w-2 h-2 rounded-full bg-[#5F735E] animate-pulse" />
              All 7 Microservices Healthy
            </div>
            <Link
              href="/"
              className="text-[#5C5955] hover:text-[#20242C] transition-colors"
            >
              Exit to Consumer PWA →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full flex-1 flex flex-col md:flex-row gap-8">
        {/* 2. Operational Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6">
          <div className="bg-white p-3 rounded-2xl border border-[#E7E2DA] shadow-xs flex flex-col gap-1">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                selectedTab === "overview"
                  ? "bg-[#76556F] text-white shadow-xs"
                  : "text-[#5C5955] hover:bg-[#F0ECE1] hover:text-[#20242C]"
              }`}
            >
              <Activity className="w-4 h-4" />
              Platform Overview
            </button>
            <button
              onClick={() => setSelectedTab("spaces")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                selectedTab === "spaces"
                  ? "bg-[#76556F] text-white shadow-xs"
                  : "text-[#5C5955] hover:bg-[#F0ECE1] hover:text-[#20242C]"
              }`}
            >
              <Users className="w-4 h-4" />
              Spaces & Members
            </button>
            <button
              onClick={() => setSelectedTab("queues")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                selectedTab === "queues"
                  ? "bg-[#76556F] text-white shadow-xs"
                  : "text-[#5C5955] hover:bg-[#F0ECE1] hover:text-[#20242C]"
              }`}
            >
              <Database className="w-4 h-4" />
              Job Queues & NATS
            </button>
            <button
              onClick={() => setSelectedTab("orders")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                selectedTab === "orders"
                  ? "bg-[#76556F] text-white shadow-xs"
                  : "text-[#5C5955] hover:bg-[#F0ECE1] hover:text-[#20242C]"
              }`}
            >
              <Printer className="w-4 h-4" />
              Print Fulfillment
            </button>
          </div>

          {/* Quick System Telemetry Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs text-xs space-y-3">
            <div className="flex items-center justify-between text-[#20242C] font-semibold">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#76556F]" />
                Disk Quota ($0 Budget)
              </span>
              <span className="text-[#5F735E]">28.5%</span>
            </div>
            <div className="w-full bg-[#F0ECE1] h-2 rounded-full overflow-hidden">
              <div className="bg-[#76556F] h-full rounded-full" style={{ width: "28.5%" }} />
            </div>
            <div className="flex justify-between text-[11px] text-[#5C5955]">
              <span>Used: 142.4 MB</span>
              <span>Max: 500.0 MB</span>
            </div>
          </div>
        </aside>

        {/* 3. Operational Dashboard Body */}
        <main className="flex-1 flex flex-col gap-8">
          {/* Executive KPI Summary */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#5C5955]">
                <span>Active Spaces</span>
                <Users className="w-4 h-4 text-[#76556F]" />
              </div>
              <div className="mt-2 font-serif text-2xl font-bold text-[#20242C]">4</div>
              <div className="mt-1 text-[11px] text-[#5F735E] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                100% Verified Permissions
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#5C5955]">
                <span>Memory Objects</span>
                <FileText className="w-4 h-4 text-[#76556F]" />
              </div>
              <div className="mt-2 font-serif text-2xl font-bold text-[#20242C]">667</div>
              <div className="mt-1 text-[11px] text-[#5F735E] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                SHA-256 Validated
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#5C5955]">
                <span>Background Jobs</span>
                <Database className="w-4 h-4 text-[#5F735E]" />
              </div>
              <div className="mt-2 font-serif text-2xl font-bold text-[#20242C]">0 Failed</div>
              <div className="mt-1 text-[11px] text-[#5C5955]">
                BullMQ + NATS JetStream
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E7E2DA] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#5C5955]">
                <span>Print Preflights</span>
                <Printer className="w-4 h-4 text-[#85530E]" />
              </div>
              <div className="mt-2 font-serif text-2xl font-bold text-[#20242C]">1 Pending</div>
              <div className="mt-1 text-[11px] text-[#85530E] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Awaiting Order Review
              </div>
            </div>
          </section>

          {/* Directory & Table Surface (WCAG 2.2 AA Contrast & Denser Layout) */}
          <section className="bg-white rounded-2xl border border-[#E7E2DA] shadow-xs overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#E7E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#20242C]">
                  Memory Spaces Directory
                </h3>
                <p className="text-xs text-[#5C5955] mt-0.5">
                  Inspect tenant space storage quotas, member counts, and sync integrity.
                </p>
              </div>

              {/* Search filter input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5955]" />
                <input
                  type="text"
                  placeholder="Search space or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#8D857A] bg-white text-[#28272A] focus:outline-none focus:border-[#76556F] focus:ring-1 focus:ring-[#76556F]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F0ECE1] text-[#20242C] font-semibold border-b border-[#E7E2DA]">
                  <tr>
                    <th className="py-3 px-6">Space Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Memories</th>
                    <th className="py-3 px-4">Storage (Max 500MB)</th>
                    <th className="py-3 px-4">Sync Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2DA] text-[#28272A]">
                  {filteredSpaces.map((space) => {
                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-[#E8F3ED] text-[#22593E] border border-[#B6DBC7]">
                        <CheckCircle2 className="w-3 h-3 text-[#22593E]" />
                        Synchronized
                      </span>
                    );
                    if (space.syncStatus === "warning") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-[#FDF5E6] text-[#85530E] border border-[#F2D8A7]">
                          <AlertTriangle className="w-3 h-3 text-[#85530E]" />
                          Near Quota ({space.usedPercentage}%)
                        </span>
                      );
                    } else if (space.syncStatus === "processing") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-[#F7EFE6] text-[#6B533E] border border-[#DFD0C0]">
                          <Clock className="w-3 h-3 text-[#6B533E]" />
                          Processing OCR
                        </span>
                      );
                    }

                    return (
                      <tr key={space.id} className="hover:bg-[#F7F4EE]/50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-[#20242C]">
                          {space.name}
                        </td>
                        <td className="py-4 px-4 capitalize text-[#5C5955]">
                          {space.type}
                        </td>
                        <td className="py-4 px-4 text-[#5C5955]">
                          {space.ownerEmail}
                        </td>
                        <td className="py-4 px-4 font-mono font-medium">
                          {space.memoryCount}
                        </td>
                        <td className="py-4 px-4 font-mono text-[#5C5955]">
                          {space.usedBytesFormatted}
                        </td>
                        <td className="py-4 px-4">
                          {statusBadge}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button className="text-xs font-semibold text-[#76556F] hover:underline cursor-pointer">
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#F0ECE1]/40 border-t border-[#E7E2DA] flex items-center justify-between text-xs text-[#5C5955]">
              <span>Showing {filteredSpaces.length} of {SAMPLE_SPACES.length} managed spaces</span>
              <span className="text-[11px]">Memoria Living Archive Admin Console • v1.0.0</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
