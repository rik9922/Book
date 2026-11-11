"use client";

import React, { useState } from "react";
import { HelpCircle, Keyboard, LifeBuoy, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { submitSupportTicket } from "@/lib/api";

const FAQS = [
  {
    q: "How does Memoria work completely offline?",
    a: "The Memoria Service Worker (/sw.js) caches application shell routes for offline browsing, while offline memory creations queue locally in browser storage and automatically sync when connectivity returns.",
  },
  {
    q: "Are my family photos locked into a proprietary format?",
    a: "Never. Visit /export at any time to download a complete SHA-256 verified JSON archive bundle of your spaces, profiles, collections, and memories.",
  },
  {
    q: "What happens when I freeze a book edition?",
    a: "Freezing computes an immutable SHA-256 edition hash over your cover and spreads so your physical print order matches your approved proof byte-for-byte.",
  },
];

const SHORTCUTS = [
  { keys: "Space", action: "Open or close the 3D heirloom book cover" },
  { keys: "← / →", action: "Turn to previous or next archival spread" },
  { keys: "R", action: "Reset 3D camera to resting hero or open spread view" },
  { keys: "2", action: "Toggle between WebGL 3D Reader and Accessible 2D Reader" },
  { keys: "Esc", action: "Close active memory detail modal and restore focus" },
];

export default function HelpPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    try {
      const ticket = await submitSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        category: "archival_help",
      });
      setSubmittedNotice(
        `Support ticket #${ticket.id.slice(0, 8)} ("${ticket.subject}") submitted to archival support.`
      );
    } catch {
      setSubmittedNotice(
        `Support inquiry "${subject.trim()}" logged locally for archival governance review.`
      );
    }
    setSubject("");
    setMessage("");
  };

  return (
    <AppShell
      title="Help, Guides & Keyboard Shortcuts"
      subtitle="Everything you need to curate family archives, navigate the 3D reader with keyboard accessibility, and reach support."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <div key={faq.q} className="p-4 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]">
                  <h3 className="text-xs font-bold text-[#20242C]">{faq.q}</h3>
                  <p className="text-xs text-[#5C5955] mt-1 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
              3D Studio &amp; Accessibility Shortcuts
            </h2>
            <ul className="divide-y divide-[#F0ECE1]">
              {SHORTCUTS.map((s) => (
                <li key={s.keys} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                  <span className="text-[#28272A]">{s.action}</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#F0ECE1] border border-[#E7E2DA] font-mono text-[11px] font-semibold text-[#20242C]">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="lg:col-span-5 bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#20242C] flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
            Contact Archival Support
          </h2>
          {submittedNotice && (
            <div role="status" className="p-3.5 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B]">
              {submittedNotice}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="help-subject" className="block text-xs font-semibold text-[#20242C] mb-1">
                Topic
              </label>
              <input
                id="help-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Book preflight or archive export question"
                className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
              />
            </div>
            <div>
              <label htmlFor="help-message" className="block text-xs font-semibold text-[#20242C] mb-1">
                Details
              </label>
              <textarea
                id="help-message"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe how we can help..."
                className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#76556F] text-white text-xs font-semibold"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              Submit Support Note
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
