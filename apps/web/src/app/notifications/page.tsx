"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  getStoredSession,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationDTO,
  openAuthModal,
  subscribeAuthChange,
} from "@/lib/api";

export default function NotificationsPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!getStoredSession().accessToken) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    try {
      const list = await listNotifications();
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const unsubscribe = subscribeAuthChange(() => {
      loadNotifications();
    });
    return unsubscribe;
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    setError(null);
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notification read.");
    }
  };

  const handleMarkAll = async () => {
    setError(null);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all notifications read.");
    }
  };

  const visible = filter === "unread" ? items.filter((i) => !i.isRead) : items;

  return (
    <AppShell
      title="Notification Center"
      subtitle="Stay updated on family circle invitations, memory comments, OCR completion, and print press milestones."
    >
      {!signedIn && !loading ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center max-w-xl mx-auto space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#20242C]">Sign in to view notifications</h2>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Sign In or Create Account
          </button>
        </div>
      ) : (
        <div className="max-w-3xl space-y-5">
          {error && (
            <div role="alert" className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E]">
              {error}
            </div>
          )}

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium ${
                  filter === "all" ? "bg-[#20242C] text-white" : "bg-[#F7F4EE] text-[#5C5955]"
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium ${
                  filter === "unread" ? "bg-[#76556F] text-white" : "bg-[#F7F4EE] text-[#5C5955]"
                }`}
              >
                Unread ({items.filter((i) => !i.isRead).length})
              </button>
            </div>

            <button
              type="button"
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C]"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#5F735E]" aria-hidden="true" />
              Mark All Read
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-10 text-center text-xs text-[#5C5955]">
              <Bell className="w-6 h-6 mx-auto text-[#8D857A] mb-2" aria-hidden="true" />
              No notifications in this view.
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-2xl border p-5 flex items-start justify-between gap-4 ${
                    n.isRead ? "bg-[#FFFFFF] border-[#E7E2DA]" : "bg-[#FAF6F8] border-[#76556F]/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#76556F]">
                        {n.type}
                      </span>
                      <span className="text-[11px] text-[#5C5955]">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="font-serif text-base font-bold text-[#20242C]">{n.title}</h2>
                    <p className="text-xs text-[#5C5955]">{n.body}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      aria-label={`Mark "${n.title}" read`}
                      className="p-2 rounded-xl bg-white border border-[#E7E2DA] text-[#5F735E]"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AppShell>
  );
}
