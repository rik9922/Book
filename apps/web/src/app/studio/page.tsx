"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, BookOpen, CheckCircle2, Copy, Eye, Layers, Lock, Package, Plus, Save, Sparkles } from "lucide-react";
import { BOOK_LEATHER_SWATCHES } from "@memory-capsule/contracts/book-3d";
import { AppShell } from "@/components/AppShell";
import { ClientStudioMount } from "@/components/3d/ClientStudioMount";
import {
  apiRequest,
  BookDTO,
  cloneNextBookEdition,
  curateBookMemories,
  getBookChapters,
  getBookEditions,
  getBookProof,
  getStoredSession,
  MemoryDTO,
  MemorySpaceDTO,
  PreflightReportDTO,
  PrintOrderDTO,
  reorderBookSpreads,
  saveBookChapters,
} from "@/lib/api";

const COVER_SWATCHES = BOOK_LEATHER_SWATCHES.map((s) => ({
  label: s.name,
  hex: s.hex,
}));

export default function BookStudioPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [books, setBooks] = useState<BookDTO[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookDTO | null>(null);
  const [orders, setOrders] = useState<PrintOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [studioSyncNonce, setStudioSyncNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create Book form
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newFormat, setNewFormat] = useState<BookDTO["format"]>("hardcover_standard_8x10");
  const [newColor, setNewColor] = useState("#76556F");
  const [newFoil, setNewFoil] = useState<BookDTO["foilStamping"]>("gold");

  // Edit active book cover
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState("#76556F");
  const [editFoil, setEditFoil] = useState<BookDTO["foilStamping"]>("gold");
  const [spreadTitle, setSpreadTitle] = useState("");
  const [spreadCaption, setSpreadCaption] = useState("");
  const [preflight, setPreflight] = useState<PreflightReportDTO | null>(null);
  const [spaceMemories, setSpaceMemories] = useState<MemoryDTO[]>([]);
  const [spaceProfiles, setSpaceProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [sourceProfileId, setSourceProfileId] = useState<string>("");
  const [templateLayout, setTemplateLayout] = useState<"editorial_classic" | "photo_journal" | "fine_art_spread">("editorial_classic");
  const [focalPreset, setFocalPreset] = useState<"50% 50%" | "50% 20%" | "50% 80%">("50% 50%");
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [chapters, setChapters] = useState<Array<{ id?: string; title: string; subtitle?: string }>>([]);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [editions, setEditions] = useState<Array<{ editionNumber: number; status: string; editionHash: string | null; spreadCount: number; updatedAt: string }>>([]);
  const [proofView, setProofView] = useState<{ pageCount: number; bleedMm: number; safeMarginMm: number } | null>(null);

  // Checkout shipping
  const [recipientName, setRecipientName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const syncSelectedBook = useCallback((book: BookDTO | null) => {
    setSelectedBook(book);
    if (book) {
      setEditTitle(book.coverTitle || book.title);
      setEditColor(book.coverColor);
      setEditFoil(book.foilStamping);
      const firstSpread = book.spreads?.[0];
      const headingEl = firstSpread?.rightPage?.elements?.find((el: { type?: string }) => el.type === "heading");
      const textEl = firstSpread?.rightPage?.elements?.find((el: { type?: string }) => el.type === "text" || el.type === "caption");
      setSpreadTitle(headingEl?.content || book.title || "Chapter I — Beginnings");
      setSpreadCaption(textEl?.content || "Preserved from our family vault.");
      getBookChapters(book.id).then(setChapters).catch(() => setChapters([]));
      getBookEditions(book.id).then(setEditions).catch(() => setEditions([]));
    }
  }, []);

  const loadSpaceStudio = useCallback(
    async (targetSpaceId: string) => {
      if (!targetSpaceId) return;
      try {
        const [booksRes, ordersRes, memRes, profRes] = await Promise.allSettled([
          apiRequest<{ books?: BookDTO[]; items?: BookDTO[] } | BookDTO[]>(
            `/spaces/${targetSpaceId}/books`
          ),
          apiRequest<{ orders?: PrintOrderDTO[]; items?: PrintOrderDTO[] } | PrintOrderDTO[]>(
            `/orders/spaces/${targetSpaceId}`
          ),
          apiRequest<{ items?: MemoryDTO[] } | MemoryDTO[]>(`/spaces/${targetSpaceId}/memories?limit=50`),
          apiRequest<{ profiles?: Array<{ id: string; name: string }>; items?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>>(
            `/spaces/${targetSpaceId}/profiles`
          ),
        ]);

        if (booksRes.status === "fulfilled") {
          const val = booksRes.value;
          const list = Array.isArray(val) ? val : val.books || val.items || [];
          setBooks(list);
          syncSelectedBook(list[0] || null);
        }
        if (ordersRes.status === "fulfilled") {
          const val = ordersRes.value;
          setOrders(Array.isArray(val) ? val : val.orders || val.items || []);
        }
        if (memRes.status === "fulfilled") {
          const val = memRes.value;
          setSpaceMemories(Array.isArray(val) ? val : val.items || []);
        }
        if (profRes.status === "fulfilled") {
          const val = profRes.value;
          setSpaceProfiles(Array.isArray(val) ? val : val.profiles || val.items || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load book studio.");
      }
    },
    [syncSelectedBook]
  );

  useEffect(() => {
    const init = async () => {
      const session = getStoredSession();
      if (!session.accessToken) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      try {
        const res = await apiRequest<{ spaces?: MemorySpaceDTO[]; items?: MemorySpaceDTO[] } | MemorySpaceDTO[]>(
          "/spaces"
        );
        const list = Array.isArray(res) ? res : res.spaces || res.items || [];
        setSpaces(list);
        if (list.length > 0) {
          setSpaceId(list[0].id);
          await loadSpaceStudio(list[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize Book Studio.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadSpaceStudio]);

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !newTitle.trim()) return;
    setError(null);
    setNotice(null);

    try {
      const created = await apiRequest<{ book?: BookDTO } | BookDTO>("/books", {
        method: "POST",
        body: JSON.stringify({
          spaceId,
          title: newTitle.trim(),
          subtitle: newSubtitle.trim() || undefined,
          format: newFormat,
          coverColor: newColor,
          foilStamping: newFoil,
          coverTitle: newTitle.trim(),
        }),
      });
      const book = "book" in created && created.book ? created.book : (created as BookDTO);
      setBooks((prev) => [book, ...prev]);
      syncSelectedBook(book);
      setNewTitle("");
      setNewSubtitle("");
      setNotice(`Created edition "${book.title}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create book edition.");
    }
  };

  const handleSaveCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setError(null);
    setNotice(null);

    try {
      const updated = await apiRequest<{ book?: BookDTO } | BookDTO>(
        `/books/${selectedBook.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            coverTitle: editTitle.trim(),
            coverColor: editColor,
            foilStamping: editFoil,
          }),
        }
      );
      const book = "book" in updated && updated.book ? updated.book : (updated as BookDTO);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
      syncSelectedBook(book);
      setStudioSyncNonce((n) => n + 1);
      setNotice("Saved linen cover customization.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cover changes.");
    }
  };

  const handleSaveSpread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setError(null);
    setNotice(null);
    const existingSpread = selectedBook.spreads?.[0];
    const spreadId = existingSpread?.id || crypto.randomUUID();
    const rightPageId = existingSpread?.rightPage?.id || crypto.randomUUID();
    const headingId =
      existingSpread?.rightPage?.elements?.find((el: { type?: string }) => el.type === "heading")?.id ||
      crypto.randomUUID();
    const captionId =
      existingSpread?.rightPage?.elements?.find((el: { type?: string }) => el.type === "caption")?.id ||
      crypto.randomUUID();

    try {
      const updatedSpread = await apiRequest<Record<string, unknown>>(
        `/books/${selectedBook.id}/spreads/${spreadId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            spreadIndex: existingSpread?.spreadIndex ?? 0,
            leftPage: existingSpread?.leftPage ?? null,
            rightPage: {
              id: rightPageId,
              pageNumber: existingSpread?.rightPage?.pageNumber ?? 1,
              layoutType: "editorial_chapter_title",
              backgroundColor: "#F7F4EE",
              elements: [
                {
                  id: headingId,
                  type: "heading",
                  x: 10,
                  y: 25,
                  width: 80,
                  height: 18,
                  rotation: 0,
                  zIndex: 1,
                  content: spreadTitle.trim(),
                  style: { fontFamily: "serif", fontSize: 32, color: "#20242C" },
                },
                {
                  id: captionId,
                  type: "caption",
                  x: 10,
                  y: 48,
                  width: 80,
                  height: 22,
                  rotation: 0,
                  zIndex: 2,
                  content: spreadCaption.trim(),
                  style: { fontFamily: "sans-serif", fontSize: 16, color: "#5C5955", focalPoint: focalPreset },
                },
              ],
            },
          }),
        }
      );
      const nextBook: BookDTO = {
        ...selectedBook,
        spreads: [updatedSpread, ...(selectedBook.spreads || []).slice(1)],
      };
      setBooks((prev) => prev.map((b) => (b.id === nextBook.id ? nextBook : b)));
      syncSelectedBook(nextBook);
      setStudioSyncNonce((n) => n + 1);
      setNotice("Updated interior spread layout.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update spread.");
    }
  };

  const handleRunPreflight = async () => {
    if (!selectedBook) return;
    setError(null);
    setNotice(null);
    try {
      const report = await apiRequest<PreflightReportDTO>(`/books/${selectedBook.id}/preflight`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setPreflight(report);
      setNotice(
        report.passed
          ? "Print preflight passed all trim, bleed, and 300 DPI checks."
          : "Preflight flagged items to review before freezing."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run preflight check.");
    }
  };

  const handleFreezeEdition = async () => {
    if (!selectedBook) return;
    setError(null);
    setNotice(null);
    try {
      const frozen = await apiRequest<{ book?: BookDTO } | BookDTO>(
        `/books/${selectedBook.id}/freeze`,
        { method: "POST", body: JSON.stringify({}) }
      );
      const book = "book" in frozen && frozen.book ? frozen.book : (frozen as BookDTO);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
      syncSelectedBook(book);
      setNotice("Edition frozen cleanly for heirloom press production.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to freeze edition.");
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !spaceId) return;
    setError(null);
    setNotice(null);

    try {
      const res = await apiRequest<{ order?: PrintOrderDTO } | PrintOrderDTO>("/orders", {
        method: "POST",
        body: JSON.stringify({
          spaceId,
          bookId: selectedBook.id,
          format: selectedBook.format,
          quantity: 1,
          shippingAddress: {
            recipientName: recipientName.trim(),
            line1: streetAddress.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
            country: "US",
          },
          printSpec: {
            format: selectedBook.format,
            paperWeight: "170gsm_lustre",
            binding: "hardcover_linen",
            editionHash: selectedBook.frozenEditionHash,
          },
        }),
      });
      const order = "order" in res && res.order ? res.order : (res as PrintOrderDTO);
      setOrders((prev) => [order, ...prev]);
      setNotice(`Print order #${order.id.slice(0, 8)} queued (${order.status}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Print order checkout failed.");
    }
  };

  const handleCurateIntoBook = async () => {
    if (!selectedBook || selectedMemoryIds.length === 0) return;
    setError(null);
    setNotice(null);
    try {
      const chosen = spaceMemories.filter((m) => selectedMemoryIds.includes(m.id));
      const updated = await curateBookMemories(
        selectedBook.id,
        chosen.map((m) => ({ id: m.id, title: m.title, content: m.content, capturedAt: m.capturedAt })),
        templateLayout
      );
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      syncSelectedBook(updated);
      setSelectedMemoryIds([]);
      setNotice(`Compiled ${chosen.length} curated memories into chronological book spreads.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to curate memories.");
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !newChapterTitle.trim()) return;
    const next = [...chapters, { title: newChapterTitle.trim() }];
    try {
      await saveBookChapters(selectedBook.id, next);
      setChapters(next);
      setNewChapterTitle("");
      setNotice("Saved chapter structure.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save chapters.");
    }
  };

  const handleMoveSpread = async (idx: number, dir: -1 | 1) => {
    if (!selectedBook) return;
    const spreads = [...(selectedBook.spreads || [])];
    const target = idx + dir;
    if (target < 0 || target >= spreads.length) return;
    const [item] = spreads.splice(idx, 1);
    spreads.splice(target, 0, item);
    try {
      const updated = await reorderBookSpreads(selectedBook.id, spreads.map((s) => s.id));
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      syncSelectedBook(updated);
      setNotice("Reordered book spreads.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder spreads.");
    }
  };

  const handleLoadProof = async () => {
    if (!selectedBook) return;
    try {
      const p = await getBookProof(selectedBook.id);
      setProofView({ pageCount: p.pageCount, bleedMm: p.bleedMm, safeMarginMm: p.safeMarginMm });
      setPreflight(p.preflight);
      setNotice(`2D Full Book Proof ready (${p.pageCount} pages, ${p.bleedMm}mm bleed).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load 2D proof.");
    }
  };

  const handleCloneEdition = async () => {
    if (!selectedBook) return;
    try {
      const cloned = await cloneNextBookEdition(selectedBook.id);
      setBooks((prev) => [cloned, ...prev]);
      syncSelectedBook(cloned);
      setNotice(`Created "${cloned.title}" as editable next edition.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clone edition.");
    }
  };

  return (
    <AppShell
      title="3D Heirloom Book Studio"
      subtitle="Craft linen hardcover editions, edit spreads, inspect in WebGL 3D, freeze versions, and order print copies."
    >
      {!signedIn && !loading ? (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-8 text-center">
          <p className="text-sm text-[#5C5955] mb-4">Sign in to open the 3D Book Studio.</p>
          <Link href="/auth" className="inline-flex px-5 py-2.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-sm font-medium">
            Sign In
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="studio-space" className="text-xs font-semibold text-[#20242C]">
                Space:
              </label>
              <select
                id="studio-space"
                value={spaceId}
                onChange={(e) => {
                  setSpaceId(e.target.value);
                  loadSpaceStudio(e.target.value);
                }}
                className="px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-medium"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {books.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="studio-book" className="text-xs font-semibold text-[#20242C]">
                  Edition:
                </label>
                <select
                  id="studio-book"
                  value={selectedBook?.id || ""}
                  onChange={(e) => {
                    const match = books.find((b) => b.id === e.target.value) || null;
                    syncSelectedBook(match);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-medium"
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} {b.isFrozenForPrint ? "(Frozen)" : "(Draft)"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Interactive 3D Preview + Create Book */}
            <div className="lg:col-span-7 space-y-6">
              <ClientStudioMount
                bookId={selectedBook?.id || "sample"}
                refreshKey={`${selectedBook?.version ?? 0}-${studioSyncNonce}`}
              />

              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6">
                <h2 className="font-serif text-lg font-bold text-[#20242C] mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  Bind New Book Edition
                </h2>
                <form onSubmit={handleCreateBook} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-book-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Book Title
                    </label>
                    <input
                      id="new-book-title"
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="The Vance Anthology"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-book-sub" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Subtitle (Optional)
                    </label>
                    <input
                      id="new-book-sub"
                      type="text"
                      value={newSubtitle}
                      onChange={(e) => setNewSubtitle(e.target.value)}
                      placeholder="Volume I • 1994–2026"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-book-fmt" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Trim Size
                    </label>
                    <select
                      id="new-book-fmt"
                      value={newFormat}
                      onChange={(e) => setNewFormat(e.target.value as BookDTO["format"])}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    >
                      <option value="hardcover_square_8x8">Square 8x8&quot;</option>
                      <option value="hardcover_standard_8x10">Standard 8x10&quot;</option>
                      <option value="hardcover_grand_12x12">Grand 12x12&quot;</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-book-foil" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Foil Stamping
                    </label>
                    <select
                      id="new-book-foil"
                      value={newFoil}
                      onChange={(e) => setNewFoil(e.target.value as BookDTO["foilStamping"])}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                    >
                      <option value="gold">Archival Gold</option>
                      <option value="silver">Brushed Silver</option>
                      <option value="rose">Rose Copper</option>
                      <option value="blind_emboss">Blind Emboss</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#20242C] mr-2">Cloth Color:</span>
                    {COVER_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.hex}
                        type="button"
                        aria-label={swatch.label}
                        onClick={() => setNewColor(swatch.hex)}
                        className={`w-7 h-7 rounded-full border-2 ${
                          newColor === swatch.hex ? "border-[#20242C] scale-110" : "border-[#E7E2DA]"
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    ))}
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium"
                    >
                      Create Hardcover Edition
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Cover Editor, Spread Editor, Freeze, Print Order */}
            <aside className="lg:col-span-5 space-y-6">
              {selectedBook ? (
                <>
                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                        Customize Cover
                      </h2>
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#F0ECE1] text-[#28272A]">
                        v{selectedBook.version}
                      </span>
                    </div>

                    <form onSubmit={handleSaveCover} className="space-y-3">
                      <div>
                        <label htmlFor="edit-cover-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                          Foil Cover Title
                        </label>
                        <input
                          id="edit-cover-title"
                          type="text"
                          disabled={selectedBook.isFrozenForPrint}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs disabled:opacity-60"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {COVER_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            disabled={selectedBook.isFrozenForPrint}
                            aria-label={`Set cover to ${swatch.label}`}
                            onClick={() => setEditColor(swatch.hex)}
                            className={`w-6 h-6 rounded-full border-2 ${
                              editColor === swatch.hex ? "border-[#20242C]" : "border-[#E7E2DA]"
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                      </div>
                      <div>
                        <label htmlFor="edit-cover-foil" className="block text-xs font-semibold text-[#20242C] mb-1">
                          Foil Finish
                        </label>
                        <select
                          id="edit-cover-foil"
                          disabled={selectedBook.isFrozenForPrint}
                          value={editFoil}
                          onChange={(e) => setEditFoil(e.target.value as BookDTO["foilStamping"])}
                          className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                        >
                          <option value="gold">Archival Gold</option>
                          <option value="silver">Brushed Silver</option>
                          <option value="rose">Rose Copper</option>
                          <option value="blind_emboss">Blind Emboss</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={selectedBook.isFrozenForPrint}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#76556F] text-[#FFFFFF] text-xs font-medium disabled:opacity-40"
                      >
                        <Save className="w-3.5 h-3.5" aria-hidden="true" />
                        Save Cover
                      </button>
                    </form>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                    <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#5F735E]" aria-hidden="true" />
                      Spread #1 Content & Preflight
                    </h2>
                    <form onSubmit={handleSaveSpread} className="space-y-3">
                      <div>
                        <label htmlFor="spread-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                          Spread Heading
                        </label>
                        <input
                          id="spread-title"
                          type="text"
                          disabled={selectedBook.isFrozenForPrint}
                          value={spreadTitle}
                          onChange={(e) => setSpreadTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label htmlFor="spread-caption" className="block text-xs font-semibold text-[#20242C] mb-1">
                          Narrative Caption
                        </label>
                        <textarea
                          id="spread-caption"
                          rows={2}
                          disabled={selectedBook.isFrozenForPrint}
                          value={spreadCaption}
                          onChange={(e) => setSpreadCaption(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label htmlFor="spread-focal" className="block text-xs font-semibold text-[#20242C] mb-1">
                          Image Box Focal Point (PWA-66)
                        </label>
                        <select
                          id="spread-focal"
                          disabled={selectedBook.isFrozenForPrint}
                          value={focalPreset}
                          onChange={(e) => setFocalPreset(e.target.value as "50% 50%" | "50% 20%" | "50% 80%")}
                          className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs disabled:opacity-60"
                        >
                          <option value="50% 50%">Centered Portrait (50% 50%)</option>
                          <option value="50% 20%">Upper Face / Hat Clearance (50% 20%)</option>
                          <option value="50% 80%">Lower Horizon Anchor (50% 80%)</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={selectedBook.isFrozenForPrint}
                          className="px-4 py-2 rounded-xl bg-[#F0ECE1] text-xs font-medium text-[#20242C] disabled:opacity-40"
                        >
                          Update Spread
                        </button>
                        <button
                          type="button"
                          onClick={handleRunPreflight}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EEF2ED] text-[#22593E] border border-[#B6DBC7] text-xs font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Run Preflight
                        </button>
                        <button
                          type="button"
                          onClick={handleFreezeEdition}
                          disabled={selectedBook.isFrozenForPrint}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20242C] text-[#FFFFFF] text-xs font-medium disabled:opacity-40"
                        >
                          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                          {selectedBook.isFrozenForPrint ? "Edition Frozen" : "Freeze for Print"}
                        </button>
                      </div>
                      {preflight && (
                        <div className="pt-3 border-t border-[#F0ECE1] space-y-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5F735E]">
                            Preflight Validation ({preflight.passed ? "PASSED" : "REVIEW"})
                          </p>
                          <ul className="space-y-1">
                            {preflight.checks.map((c) => (
                              <li key={c.id} className="text-xs text-[#28272A] flex items-start gap-1.5">
                                <span className={c.passed ? "text-[#5F735E]" : "text-[#B6423E]"}>
                                  {c.passed ? "✓" : "✕"}
                                </span>
                                <span>
                                  <strong>{c.label}:</strong> {c.detail}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </form>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                    <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                      Order Physical Heirloom Copy
                    </h2>
                    <form onSubmit={handlePlaceOrder} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label htmlFor="ship-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                            Recipient Name
                          </label>
                          <input
                            id="ship-name"
                            type="text"
                            required
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Elena Vance"
                            className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="ship-street" className="block text-xs font-semibold text-[#20242C] mb-1">
                            Street Address
                          </label>
                          <input
                            id="ship-street"
                            type="text"
                            required
                            value={streetAddress}
                            onChange={(e) => setStreetAddress(e.target.value)}
                            placeholder="742 Archival Way"
                            className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                          />
                        </div>
                        <div>
                          <label htmlFor="ship-city" className="block text-xs font-semibold text-[#20242C] mb-1">
                            City
                          </label>
                          <input
                            id="ship-city"
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Portland"
                            className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                          />
                        </div>
                        <div>
                          <label htmlFor="ship-zip" className="block text-xs font-semibold text-[#20242C] mb-1">
                            Postal Code
                          </label>
                          <input
                            id="ship-zip"
                            type="text"
                            required
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="97205"
                            className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={!selectedBook.isFrozenForPrint}
                        className="w-full py-2.5 rounded-xl bg-[#5F735E] text-[#FFFFFF] text-xs font-medium disabled:opacity-40"
                      >
                        {selectedBook.isFrozenForPrint
                          ? "Place Zero-Markup Print Order"
                          : "Freeze Edition Above Before Ordering"}
                      </button>
                    </form>

                    {orders.length > 0 && (
                      <div className="pt-3 border-t border-[#F0ECE1] space-y-2">
                        <h3 className="text-xs font-semibold text-[#20242C]">Print Orders</h3>
                        {orders.map((o) => (
                          <div key={o.id} className="p-2.5 rounded-xl bg-[#F7F4EE] text-xs flex justify-between">
                            <span className="font-mono text-[11px]">{o.id.slice(0, 8)}</span>
                            <span className="uppercase font-medium text-[#5F735E]">{o.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 text-xs text-[#5C5955]">
                  Create a hardcover edition on the left to customize foil stamping, edit spreads, and order prints.
                </div>
              )}
            </aside>
          </div>

          {/* Curation Wizard, Chapters, Spread Reorder, 2D Proofing & Edition History (PWA-59..70) */}
          {selectedBook && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#76556F]" aria-hidden="true" />
                  Memory Curation &amp; Chapter Organizer
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label htmlFor="curate-profile" className="block font-semibold text-[#20242C] mb-1">
                      Source Profile Filter (PWA-59)
                    </label>
                    <select
                      id="curate-profile"
                      value={sourceProfileId}
                      onChange={(e) => setSourceProfileId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]"
                    >
                      <option value="">All Space Members &amp; Profiles</option>
                      {spaceProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="curate-template" className="block font-semibold text-[#20242C] mb-1">
                      Template Layout (PWA-62)
                    </label>
                    <select
                      id="curate-template"
                      value={templateLayout}
                      onChange={(e) =>
                        setTemplateLayout(e.target.value as "editorial_classic" | "photo_journal" | "fine_art_spread")
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA]"
                    >
                      <option value="editorial_classic">Editorial Classic</option>
                      <option value="photo_journal">Photo-Journal</option>
                      <option value="fine_art_spread">Fine-Art Spread</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {spaceMemories.filter((m) => !sourceProfileId || m.associatedProfileIds?.includes(sourceProfileId)).length === 0 ? (
                    <p className="text-xs text-[#5C5955]">No matching space memories yet. Add memories in /archive.</p>
                  ) : (
                    spaceMemories
                      .filter((m) => !sourceProfileId || m.associatedProfileIds?.includes(sourceProfileId))
                      .map((m) => (
                        <label key={m.id} className="flex items-center gap-2 p-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs">
                          <input
                            type="checkbox"
                            checked={selectedMemoryIds.includes(m.id)}
                            onChange={(e) =>
                              setSelectedMemoryIds((prev) =>
                                e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                              )
                            }
                          />
                          <span className="font-semibold text-[#20242C] truncate">{m.title}</span>
                        </label>
                      ))
                  )}
                </div>
                <button
                  type="button"
                  disabled={selectedBook.isFrozenForPrint || selectedMemoryIds.length === 0}
                  onClick={handleCurateIntoBook}
                  className="px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold disabled:opacity-40"
                >
                  Auto-Compile Selected ({selectedMemoryIds.length}) into Chronological Spreads
                </button>

                <form onSubmit={handleAddChapter} className="pt-3 border-t border-[#F0ECE1] flex gap-2">
                  <input
                    type="text"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    placeholder="Add chapter divider title..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                  />
                  <button type="submit" disabled={selectedBook.isFrozenForPrint} className="px-4 py-2 rounded-xl bg-[#20242C] text-white text-xs font-semibold disabled:opacity-40">
                    Add Chapter
                  </button>
                </form>
                {chapters.length > 0 && (
                  <ul className="space-y-1 text-xs">
                    {chapters.map((c, i) => (
                      <li key={`${c.title}-${i}`} className="p-2 rounded-lg bg-[#F7F4EE]">
                        Chapter {i + 1}: <strong>{c.title}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-serif text-lg font-bold text-[#20242C]">
                    Page Manager, 2D Proof &amp; Editions
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleLoadProof}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0ECE1] text-xs font-semibold text-[#20242C]"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      2D Proof
                    </button>
                    <button
                      type="button"
                      onClick={handleCloneEdition}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#20242C] text-white text-xs font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Clone Edition {selectedBook.version + 1}
                    </button>
                  </div>
                </div>

                {proofView && (
                  <div className="p-3 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B]">
                    2D Proofing Active: {proofView.pageCount} pages • {proofView.bleedMm}mm trim bleed • {proofView.safeMarginMm}mm safe gutter
                  </div>
                )}

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(selectedBook.spreads || []).map((s, idx) => (
                    <div key={s.id} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex items-center justify-between text-xs">
                      <span>Spread #{idx + 1} (Pages {idx * 2 + 1}–{idx * 2 + 2})</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={selectedBook.isFrozenForPrint || idx === 0}
                          onClick={() => handleMoveSpread(idx, -1)}
                          aria-label={`Move spread ${idx + 1} up`}
                          className="p-1.5 rounded-lg bg-white border border-[#E7E2DA] disabled:opacity-40"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={selectedBook.isFrozenForPrint || idx === (selectedBook.spreads?.length || 1) - 1}
                          onClick={() => handleMoveSpread(idx, 1)}
                          aria-label={`Move spread ${idx + 1} down`}
                          className="p-1.5 rounded-lg bg-white border border-[#E7E2DA] disabled:opacity-40"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {editions.length > 0 && (
                  <div className="pt-2 border-t border-[#F0ECE1] text-xs space-y-1">
                    <p className="font-semibold text-[#20242C]">Edition Ledger</p>
                    {editions.map((ed) => (
                      <p key={ed.editionNumber} className="text-[#5C5955]">
                        Edition {ed.editionNumber} • {ed.status} {ed.editionHash ? `• SHA-256 ${ed.editionHash.slice(0, 12)}...` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
