"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Camera,
  CheckCircle2,
  Copy,
  Eye,
  Layers,
  Lock,
  Package,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Printer,
  Compass,
} from "lucide-react";
import {
  BOOK_CAMERA_PRESETS,
  BOOK_FOIL_SWATCHES,
  BOOK_LEATHER_SWATCHES,
  CANONICAL_SAMPLE_SPREADS,
  resolveFoilSwatch,
  resolveLeatherSwatch,
  type BookCameraPresetId,
  type BookFoilSwatchId,
  type BookLeatherSwatchId,
} from "@memory-capsule/contracts/book-3d";
import { AppShell } from "@/components/AppShell";
import { ClientStudioMount } from "@/components/3d/ClientStudioMount";
import {
  apiRequest,
  BookDTO,
  cloneNextBookEdition,
  createSpace,
  curateBookMemories,
  getBookChapters,
  getBookEditions,
  getBookProof,
  getStoredSession,
  MemoryDTO,
  MemorySpaceDTO,
  openAuthModal,
  PreflightReportDTO,
  PrintOrderDTO,
  reorderBookSpreads,
  saveBookChapters,
  subscribeAuthChange,
} from "@/lib/api";

type StudioTab = "cover" | "spreads" | "curation" | "preflight";

function mapRawSpreadsToPreview(
  rawSpreads: Array<{
    id?: string;
    spreadIndex?: number;
    leftPage?: {
      pageNumber?: number;
      elements?: Array<{ type?: string; content?: string }>;
    } | null;
    rightPage?: {
      pageNumber?: number;
      elements?: Array<{ type?: string; content?: string }>;
    } | null;
  }>,
  fallbackTitle: string
) {
  return rawSpreads.map((sp, idx) => {
    const leftHeading =
      sp.leftPage?.elements?.find((e) => e.type === "heading")?.content ||
      (sp.leftPage ? `Page ${sp.leftPage.pageNumber ?? idx * 2 + 1}` : "Inside Front Cover");
    const leftBody =
      sp.leftPage?.elements?.find((e) => e.type === "caption" || e.type === "text")?.content ||
      "Preserved in your Memoria Living Archive.";
    const rightHeading =
      sp.rightPage?.elements?.find((e) => e.type === "heading")?.content || fallbackTitle;
    const rightBody =
      sp.rightPage?.elements?.find((e) => e.type === "caption" || e.type === "text")?.content ||
      "Crafted for generational safekeeping.";

    return {
      spreadIndex: sp.spreadIndex ?? idx,
      chapterTitle: fallbackTitle,
      leftPageNumber: sp.leftPage?.pageNumber ?? idx * 2 + 1,
      leftHeading,
      leftDate: "Archival Edition",
      leftLocation: "Memoria Vault",
      leftBody,
      rightPageNumber: sp.rightPage?.pageNumber ?? idx * 2 + 2,
      rightHeading,
      rightDate: "Archival Edition",
      rightLocation: "Memoria Vault",
      rightBody,
    };
  });
}

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

  // Studio inspector tabs
  const [activeTab, setActiveTab] = useState<StudioTab>("cover");

  // 3D Canvas camera & interaction state
  const [cameraPreset, setCameraPreset] = useState<BookCameraPresetId>("hero");
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [activeSpreadIndex, setActiveSpreadIndex] = useState(0);
  const [is2DMode, setIs2DMode] = useState(false);

  // New Space modal / inline toggle
  const [showNewSpaceModal, setShowNewSpaceModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [creatingSpace, setCreatingSpace] = useState(false);

  // New Edition form modal / state
  const [showNewEditionModal, setShowNewEditionModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newFormat, setNewFormat] = useState<BookDTO["format"]>("hardcover_standard_8x10");
  const [newColor, setNewColor] = useState<string>("#76556F");
  const [newFoil, setNewFoil] = useState<BookDTO["foilStamping"]>("gold");

  // Edit active book cover & spine
  const [editTitle, setEditTitle] = useState("The Bennett Heritage");
  const [editSubtitle, setEditSubtitle] = useState("1948 — 2026 • Memoria Volume I");
  const [editSpineText, setEditSpineText] = useState("THE BENNETT HERITAGE • VOL. I");
  const [editColor, setEditColor] = useState<string>("#76556F");
  const [editFoil, setEditFoil] = useState<BookDTO["foilStamping"]>("gold");
  const [editFormat, setEditFormat] = useState<BookDTO["format"]>("hardcover_standard_8x10");

  // Interior spread editor
  const [spreadTitle, setSpreadTitle] = useState("");
  const [spreadCaption, setSpreadCaption] = useState("");
  const [templateLayout, setTemplateLayout] = useState<"editorial_classic" | "photo_journal" | "fine_art_spread">("editorial_classic");
  const [focalPreset, setFocalPreset] = useState<"50% 50%" | "50% 20%" | "50% 80%">("50% 50%");

  // Curation & Chapters
  const [preflight, setPreflight] = useState<PreflightReportDTO | null>(null);
  const [spaceMemories, setSpaceMemories] = useState<MemoryDTO[]>([]);
  const [spaceProfiles, setSpaceProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [sourceProfileId, setSourceProfileId] = useState<string>("");
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
      const coverT = book.coverTitle || book.title || "The Bennett Heritage";
      setEditTitle(coverT);
      setEditSubtitle(book.subtitle || "Volume I • Heirloom Edition");
      setEditSpineText(book.spineText || coverT);
      setEditColor(book.coverColor || "#76556F");
      setEditFoil(book.foilStamping || "gold");
      setEditFormat(book.format || "hardcover_standard_8x10");
      const firstSpread = book.spreads?.[0];
      const headingEl = firstSpread?.rightPage?.elements?.find((el: { type?: string }) => el.type === "heading");
      const textEl = firstSpread?.rightPage?.elements?.find((el: { type?: string }) => el.type === "text" || el.type === "caption");
      setSpreadTitle(headingEl?.content || coverT || "Chapter I — Beginnings");
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
        } else {
          setBooks([]);
          syncSelectedBook(null);
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
        setSpaces([
          {
            id: "guest-vault",
            name: "Family Living Archive (Guest Sandbox)",
            type: "family",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ownerId: "guest",
          },
        ]);
        setSpaceId("guest-vault");
        setLoading(false);
        return;
      }
      setSignedIn(true);
      try {
        const res = await apiRequest<{ spaces?: MemorySpaceDTO[]; items?: MemorySpaceDTO[] } | MemorySpaceDTO[]>(
          "/spaces"
        );
        let list = Array.isArray(res) ? res : res.spaces || res.items || [];
        if (list.length === 0) {
          // First-time curator or demo account: automatically provision a default space
          try {
            const created = await createSpace({
              name: "Family Living Archive",
              type: "family",
              description: "Heirloom memory preservation space",
            });
            if (created && created.id) {
              list = [created];
            }
          } catch {
            // Virtual fallback space so UI is never blank
            list = [
              {
                id: "default-vault",
                name: "Family Living Archive",
                type: "family",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ownerId: session.user?.id || "curator",
              },
            ];
          }
        }
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
    const unsubscribe = subscribeAuthChange(() => {
      init();
    });
    return unsubscribe;
  }, [loadSpaceStudio]);

  // Synchronize interior spread form inputs when active spread index changes
  useEffect(() => {
    const currentSpread = selectedBook?.spreads?.[activeSpreadIndex];
    if (currentSpread) {
      const heading = currentSpread.rightPage?.elements?.find((el: { type?: string }) => el.type === "heading")?.content;
      const caption = currentSpread.rightPage?.elements?.find((el: { type?: string }) => el.type === "caption" || el.type === "text")?.content;
      setSpreadTitle(heading || `Chapter ${activeSpreadIndex + 1}`);
      setSpreadCaption(caption || "Preserved from our family vault.");
      if (currentSpread.rightPage?.layoutType) {
        setTemplateLayout(currentSpread.rightPage.layoutType as typeof templateLayout);
      }
    } else if (CANONICAL_SAMPLE_SPREADS[activeSpreadIndex]) {
      const sample = CANONICAL_SAMPLE_SPREADS[activeSpreadIndex];
      setSpreadTitle(sample.rightHeading || sample.chapterTitle);
      setSpreadCaption(sample.rightBody || "");
    }
  }, [activeSpreadIndex, selectedBook]);

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    setCreatingSpace(true);
    setError(null);
    try {
      const created = await createSpace({
        name: newSpaceName.trim(),
        type: "family",
        description: "Living heirloom archive",
      });
      setSpaces((prev) => [created, ...prev]);
      setSpaceId(created.id);
      setShowNewSpaceModal(false);
      setNewSpaceName("");
      await loadSpaceStudio(created.id);
      setNotice(`Created archive space "${created.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create new space.");
    } finally {
      setCreatingSpace(false);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      openAuthModal("login");
      setNotice("Sign in or create an account to bind and persist custom hardcover editions.");
      return;
    }
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
          spineText: newTitle.trim(),
        }),
      });
      const book = "book" in created && created.book ? created.book : (created as BookDTO);
      setBooks((prev) => [book, ...prev]);
      syncSelectedBook(book);
      setNewTitle("");
      setNewSubtitle("");
      setShowNewEditionModal(false);
      setStudioSyncNonce((n) => n + 1);
      setNotice(`Created edition "${book.title}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create book edition.");
    }
  };

  const handleBindFirstEdition = async () => {
    if (!signedIn) {
      openAuthModal("login");
      setNotice("Sign in or create an account to bind your first heirloom edition.");
      return;
    }
    if (!spaceId) return;
    setError(null);
    setNotice(null);
    try {
      const created = await apiRequest<{ book?: BookDTO } | BookDTO>("/books", {
        method: "POST",
        body: JSON.stringify({
          spaceId,
          title: editTitle.trim() || "The Bennett Heritage",
          subtitle: editSubtitle.trim() || "Volume I • Heirloom Edition",
          format: editFormat,
          coverColor: editColor,
          foilStamping: editFoil,
          coverTitle: editTitle.trim() || "The Bennett Heritage",
          spineText: editSpineText.trim() || editTitle.trim() || "The Bennett Heritage",
        }),
      });
      const book = "book" in created && created.book ? created.book : (created as BookDTO);
      setBooks([book]);
      syncSelectedBook(book);
      setStudioSyncNonce((n) => n + 1);
      setNotice(`Bound first edition "${book.title}" in this vault.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bind first edition.");
    }
  };

  const handleSaveCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      openAuthModal("login");
      setNotice("Sign in to save bespoke cover customizations to your vault.");
      return;
    }
    if (!selectedBook) {
      await handleBindFirstEdition();
      return;
    }
    setError(null);
    setNotice(null);

    try {
      const updated = await apiRequest<{ book?: BookDTO } | BookDTO>(
        `/books/${selectedBook.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            coverTitle: editTitle.trim(),
            subtitle: editSubtitle.trim() || undefined,
            spineText: editSpineText.trim() || editTitle.trim(),
            coverColor: editColor,
            foilStamping: editFoil,
            format: editFormat,
          }),
        }
      );
      const book = "book" in updated && updated.book ? updated.book : (updated as BookDTO);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
      syncSelectedBook(book);
      setStudioSyncNonce((n) => n + 1);
      setNotice("Saved heirloom cover customization.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cover changes.");
    }
  };

  const handleSaveSpread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      openAuthModal("login");
      setNotice("Sign in to save interior spread layouts.");
      return;
    }
    if (!selectedBook) {
      setNotice("Bind your first edition before saving interior spreads.");
      return;
    }
    setError(null);
    setNotice(null);
    const existingSpread = selectedBook.spreads?.[activeSpreadIndex] || selectedBook.spreads?.[0];
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
            spreadIndex: existingSpread?.spreadIndex ?? activeSpreadIndex,
            leftPage: existingSpread?.leftPage ?? null,
            rightPage: {
              id: rightPageId,
              pageNumber: existingSpread?.rightPage?.pageNumber ?? activeSpreadIndex * 2 + 2,
              layoutType: templateLayout,
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
      const spreadsCopy = [...(selectedBook.spreads || [])];
      spreadsCopy[activeSpreadIndex] = updatedSpread;
      const nextBook: BookDTO = {
        ...selectedBook,
        spreads: spreadsCopy,
      };
      setBooks((prev) => prev.map((b) => (b.id === nextBook.id ? nextBook : b)));
      syncSelectedBook(nextBook);
      setStudioSyncNonce((n) => n + 1);
      setNotice(`Updated interior spread #${activeSpreadIndex + 1} layout.`);
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
    if (!signedIn) {
      openAuthModal("login");
      setNotice("Sign in to complete your zero-markup print checkout.");
      return;
    }
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
      setStudioSyncNonce((n) => n + 1);
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
      setStudioSyncNonce((n) => n + 1);
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
      setStudioSyncNonce((n) => n + 1);
      setNotice(`Created "${cloned.title}" as editable next edition.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clone edition.");
    }
  };

  const totalSpreads = selectedBook?.spreads?.length || CANONICAL_SAMPLE_SPREADS.length;
  const currentLeather = resolveLeatherSwatch(editColor);
  const currentFoil = resolveFoilSwatch(editFoil);

  const activeSpreads = React.useMemo(() => {
    if (selectedBook?.spreads && selectedBook.spreads.length > 0) {
      return mapRawSpreadsToPreview(selectedBook.spreads, editTitle);
    }
    return CANONICAL_SAMPLE_SPREADS;
  }, [selectedBook?.spreads, editTitle]);

  return (
    <AppShell
      title="3D Heirloom Book Studio"
      subtitle="Craft vegetable-tanned hardcover editions, edit interior spreads, inspect in WebGL 3D, freeze versions, and order archival prints."
    >
      <div className="space-y-6">
        {/* Guest Sandbox Mode Notification Bar */}
        {!signedIn && !loading && (
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F4EEF3] flex items-center justify-center text-[#76556F] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#20242C]">
                  Guest Curator Sandbox Mode
                </p>
                <p className="text-[11px] text-[#5C5955]">
                  You are exploring an interactive sample volume. Customize leathers, foils, and spreads freely, or sign in to persist your editions and order heirloom prints.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Sign In / Register
              </button>
              <Link
                href="/sample-book"
                className="min-h-[38px] inline-flex items-center px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F0ECE1] border border-[#E7E2DA] text-[#20242C] text-xs font-medium transition-colors"
              >
                Sample Reader
              </Link>
            </div>
          </div>
        )}

        {/* Top Archival Studio Toolbar */}
        <header className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Space & Edition Selectors */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="studio-space" className="text-xs font-semibold text-[#20242C] uppercase tracking-wider text-[11px]">
                  Vault Space:
                </label>
                <select
                  id="studio-space"
                  value={spaceId}
                  onChange={(e) => {
                    setSpaceId(e.target.value);
                    loadSpaceStudio(e.target.value);
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-semibold text-[#20242C] focus:outline-none focus:border-[#76556F]"
                >
                  {spaces.length === 0 && <option value="">Loading Archive Space...</option>}
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!signedIn) {
                      openAuthModal("login");
                      setNotice("Sign in or create an account to create custom archive spaces.");
                      return;
                    }
                    setShowNewSpaceModal(true);
                  }}
                  title="Create new archive space"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-[#76556F] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="h-5 w-px bg-[#E7E2DA] hidden sm:block" />

              <div className="flex items-center gap-2">
                <label htmlFor="studio-book" className="text-xs font-semibold text-[#20242C] uppercase tracking-wider text-[11px]">
                  Active Edition:
                </label>
                {books.length > 0 ? (
                  <select
                    id="studio-book"
                    value={selectedBook?.id || ""}
                    onChange={(e) => {
                      const match = books.find((b) => b.id === e.target.value) || null;
                      syncSelectedBook(match);
                    }}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-semibold text-[#20242C] focus:outline-none focus:border-[#76556F]"
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} (v{b.version} • {b.isFrozenForPrint ? "Frozen" : "Draft"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs font-medium text-[#76556F]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Sample Volume Preview
                  </span>
                )}
              </div>
            </div>

            {/* Status Badge & Header Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedBook?.isFrozenForPrint ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EE] border border-[#C6D4C5] text-[11px] font-semibold text-[#3C503B]">
                  <Lock className="w-3 h-3" />
                  Frozen for Press {selectedBook.frozenEditionHash ? `• #${selectedBook.frozenEditionHash.slice(0, 8)}` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EEF3] border border-[#E2D2DF] text-[11px] font-semibold text-[#76556F]">
                  <Palette className="w-3 h-3" />
                  {selectedBook ? `Draft Edition v${selectedBook.version}` : "Interactive Bindery Preview"}
                </span>
              )}

              {selectedBook && (
                <button
                  type="button"
                  onClick={handleCloneEdition}
                  title="Clone edition"
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-xs font-semibold text-[#20242C] transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#76556F]" />
                  <span className="hidden sm:inline">Clone</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!signedIn) {
                    openAuthModal("login");
                    setNotice("Sign in or create an account to bind custom hardcover editions.");
                    return;
                  }
                  setShowNewEditionModal(true);
                }}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#20242C] hover:bg-[#343A46] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bind New Edition</span>
              </button>
            </div>
          </div>
        </header>

        {/* System Notifications */}
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-xs text-[#B6423E] flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-[#B6423E] font-bold ml-2">×</button>
          </div>
        )}
        {notice && (
          <div role="status" className="p-4 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B] flex items-center justify-between">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="text-[#3C503B] font-bold ml-2">×</button>
          </div>
        )}

        {/* Main Archival Studio Workstation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7-Col: Expansive Immersive 3D Book Viewport & Quick Controls */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-[#E7E2DA] bg-[#F7F4EE] shadow-md">
              <ClientStudioMount
                bookId={selectedBook?.id || "sample"}
                refreshKey={`${selectedBook?.version ?? 0}-${studioSyncNonce}`}
                hideSidebar={true}
                hideHud={true}
                is2DMode={is2DMode}
                onToggle2DMode={setIs2DMode}
                selectedLeatherId={editColor}
                selectedFoilId={editFoil}
                title={editTitle}
                subtitle={editSubtitle}
                isOpen={isBookOpen}
                onToggleOpen={() => setIsBookOpen((o) => !o)}
                cameraPreset={cameraPreset}
                onCameraPresetChange={setCameraPreset}
                spreads={activeSpreads}
                currentSpreadIndex={activeSpreadIndex}
                onSpreadIndexChange={setActiveSpreadIndex}
                className="border-0 shadow-none"
              />
            </div>

            {/* Workstation Quick Toolbar Bar */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              {/* Camera Angles Strip */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5C5955] mr-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-[#76556F]" />
                  Angle:
                </span>
                {BOOK_CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setCameraPreset(preset.id);
                      if (preset.id === "open_spread") {
                        setIsBookOpen(true);
                      }
                    }}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      cameraPreset === preset.id
                        ? "bg-[#76556F] text-white shadow-xs"
                        : "bg-[#F7F4EE] text-[#28272A] hover:bg-[#F0ECE1]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Cover Toggle, Spread Nav, and Mode Switch */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBookOpen((prev) => {
                      const next = !prev;
                      setCameraPreset(next ? "open_spread" : "hero");
                      return next;
                    });
                  }}
                  className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#20242C] hover:bg-[#343A46] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isBookOpen ? "Close Volume" : "Open Volume"}</span>
                </button>

                <div className="flex items-center rounded-lg bg-[#F7F4EE] border border-[#E7E2DA] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isBookOpen) setIsBookOpen(true);
                      setActiveSpreadIndex((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={isBookOpen && activeSpreadIndex === 0}
                    aria-label="Previous spread"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center text-[#20242C] hover:bg-[#F0ECE1] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-xs font-semibold text-[#20242C]">
                    {isBookOpen ? `Spread ${activeSpreadIndex + 1}/${totalSpreads}` : "Cover"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isBookOpen) setIsBookOpen(true);
                      setActiveSpreadIndex((prev) => Math.min(totalSpreads - 1, prev + 1));
                    }}
                    disabled={isBookOpen && activeSpreadIndex >= totalSpreads - 1}
                    aria-label="Next spread"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center text-[#20242C] hover:bg-[#F0ECE1] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIs2DMode((prev) => !prev)}
                  className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-[#20242C] text-xs font-medium transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#5F735E]" />
                  <span>{is2DMode ? "3D Canvas" : "2D Spreads"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCameraPreset(isBookOpen ? "open_spread" : "hero")}
                  title="Reset camera preset"
                  className="min-h-[34px] px-2 rounded-lg bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-[#76556F] text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Physical Specifications Chip */}
            <div className="bg-[#FAF7F2] rounded-xl border border-[#E7E2DA] px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#5C5955]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5F735E]" />
                <span>
                  <strong>Physical Spec:</strong> {editFormat.replace("hardcover_", "").replace(/_/g, " ")} • 170gsm Archival Lustre Rag • Smyth-Sewn Library Binding
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#76556F]">
                Leather: {currentLeather.name} • Foil: {currentFoil.shortLabel}
              </span>
            </div>
          </div>

            {/* Right 5-Col: Structured Archival Studio Inspector */}
            <aside className="lg:col-span-5 xl:col-span-5 space-y-4">
              {/* Tab Navigation */}
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-1.5 grid grid-cols-4 gap-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("cover")}
                  className={`min-h-[44px] flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "cover"
                      ? "bg-[#76556F] text-white shadow-xs"
                      : "text-[#5C5955] hover:bg-[#F7F4EE] hover:text-[#20242C]"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 mb-0.5" />
                  <span>Binding</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("spreads")}
                  className={`min-h-[44px] flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "spreads"
                      ? "bg-[#76556F] text-white shadow-xs"
                      : "text-[#5C5955] hover:bg-[#F7F4EE] hover:text-[#20242C]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 mb-0.5" />
                  <span>Spreads</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("curation")}
                  className={`min-h-[44px] flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "curation"
                      ? "bg-[#76556F] text-white shadow-xs"
                      : "text-[#5C5955] hover:bg-[#F7F4EE] hover:text-[#20242C]"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 mb-0.5" />
                  <span>Curation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preflight")}
                  className={`min-h-[44px] flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "preflight"
                      ? "bg-[#76556F] text-white shadow-xs"
                      : "text-[#5C5955] hover:bg-[#F7F4EE] hover:text-[#20242C]"
                  }`}
                >
                  <Package className="w-3.5 h-3.5 mb-0.5" />
                  <span>Preflight</span>
                </button>
              </div>

              {/* Tab 1: Binding & Cover Customization */}
              {activeTab === "cover" && (
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-5 shadow-xs">
                  {books.length === 0 && (
                    <div className="p-4 rounded-xl bg-[#F4EEF3] border border-[#E2D2DF] space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                        <Sparkles className="w-3.5 h-3.5" />
                        First Edition Workshop
                      </div>
                      <p className="text-xs text-[#20242C] leading-relaxed">
                        No hardcover editions exist in this space yet. Customize the 3D volume on the left, then bind your first heirloom edition with 1 click.
                      </p>
                      <button
                        type="button"
                        onClick={handleBindFirstEdition}
                        className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        Bind First Edition from Vault
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
                    <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#76556F]" />
                      Archival Leather &amp; Foil
                    </h2>
                    {selectedBook && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F0ECE1] text-[#28272A]">
                        v{selectedBook.version}
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSaveCover} className="space-y-4">
                    {/* Embossed Cover Title */}
                    <div>
                      <label htmlFor="edit-cover-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Embossed Foil Title
                      </label>
                      <input
                        id="edit-cover-title"
                        type="text"
                        disabled={selectedBook?.isFrozenForPrint}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="The Vance Anthology"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C] focus:outline-none focus:border-[#76556F] disabled:opacity-60"
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label htmlFor="edit-cover-subtitle" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Cover Subtitle / Volume Inscription
                      </label>
                      <input
                        id="edit-cover-subtitle"
                        type="text"
                        disabled={selectedBook?.isFrozenForPrint}
                        value={editSubtitle}
                        onChange={(e) => setEditSubtitle(e.target.value)}
                        placeholder="Volume I • 1994–2026"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C] focus:outline-none focus:border-[#76556F] disabled:opacity-60"
                      />
                    </div>

                    {/* Spine & Joint Archival Inscription */}
                    <div className="space-y-2 p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E7E2DA]">
                      <div className="flex items-center justify-between">
                        <label htmlFor="edit-spine-text" className="text-xs font-semibold text-[#20242C] flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-[#76556F]" />
                          Spine Foil Inscription &amp; Library Joint
                        </label>
                        <button
                          type="button"
                          onClick={() => setCameraPreset("spine_detail")}
                          className="text-[11px] font-semibold text-[#76556F] hover:underline cursor-pointer"
                        >
                          View Spine Angle →
                        </button>
                      </div>
                      <input
                        id="edit-spine-text"
                        type="text"
                        disabled={selectedBook?.isFrozenForPrint}
                        value={editSpineText}
                        onChange={(e) => setEditSpineText(e.target.value)}
                        placeholder="THE BENNETT HERITAGE • VOL. I"
                        className="w-full min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E2DA] text-xs text-[#20242C] focus:outline-none focus:border-[#76556F] disabled:opacity-60"
                      />
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-[#5C5955] pt-1 border-t border-[#E7E2DA]">
                        <span>Binding: <strong>French Groove Smyth-Sewn</strong></span>
                        <span>Ribbon: <strong>12mm Archival Silk Drape</strong></span>
                      </div>
                    </div>

                    {/* Archival Leather Swatches */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#20242C]">
                        Archival Leather Binding ({currentLeather.name})
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {BOOK_LEATHER_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.id}
                            type="button"
                            disabled={selectedBook?.isFrozenForPrint}
                            onClick={() => setEditColor(swatch.hex)}
                            className={`min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              editColor === swatch.hex
                                ? "border-[#76556F] bg-[#F4EEF3] text-[#20242C] font-semibold shadow-xs"
                                : "border-[#E7E2DA] bg-[#F7F4EE] text-[#5C5955] hover:border-[#8D857A]"
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: swatch.hex }}
                            />
                            <div className="truncate">
                              <p className="leading-tight text-[11.5px] truncate">{swatch.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hot Foil Stamping */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#20242C]">
                        Hot Foil Stamping Finish
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {BOOK_FOIL_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.id}
                            type="button"
                            disabled={selectedBook?.isFrozenForPrint}
                            onClick={() => setEditFoil(swatch.id as BookDTO["foilStamping"])}
                            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                              editFoil === swatch.id
                                ? "border-[#76556F] bg-[#F4EEF3] text-[#20242C] font-semibold"
                                : "border-[#E7E2DA] bg-[#F7F4EE] text-[#5C5955] hover:border-[#8D857A]"
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/15"
                              style={{
                                backgroundColor:
                                  swatch.id === "blind_emboss" ? currentLeather.accentHex : swatch.hex,
                              }}
                            />
                            <span className="text-[10px] leading-none text-center font-medium">
                              {swatch.shortLabel}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trim Size */}
                    <div>
                      <label htmlFor="edit-trim-size" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Hardcover Trim Size
                      </label>
                      <select
                        id="edit-trim-size"
                        disabled={selectedBook?.isFrozenForPrint}
                        value={editFormat}
                        onChange={(e) => setEditFormat(e.target.value as BookDTO["format"])}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C] focus:outline-none focus:border-[#76556F]"
                      >
                        <option value="hardcover_standard_8x10">Standard 8x10&quot; Portrait (Archival Classic)</option>
                        <option value="hardcover_square_8x8">Square 8x8&quot; Album (Memoir Coffee Table)</option>
                        <option value="hardcover_grand_12x12">Grand 12x12&quot; Masterpiece (Fine Art Heirloom)</option>
                      </select>
                    </div>

                    {/* Save or Bind Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={selectedBook?.isFrozenForPrint}
                        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                      >
                        <Save className="w-4 h-4" />
                        <span>{selectedBook ? "Save Cover Customization" : "Bind First Edition"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 2: Interior Spreads & Layout Editor */}
              {activeTab === "spreads" && (
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
                    <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#5F735E]" />
                      Interior Spread Editor
                    </h2>
                    <span className="text-xs font-medium text-[#5C5955]">
                      Spread {activeSpreadIndex + 1} of {totalSpreads}
                    </span>
                  </div>

                  {books.length === 0 && (
                    <div className="p-3.5 rounded-xl bg-[#F4EEF3] border border-[#E2D2DF] space-y-2">
                      <p className="text-xs text-[#20242C]">
                        Previewing sample interior spreads. Click <strong>Bind First Edition</strong> below to save bespoke chapter stories into your vault.
                      </p>
                      <button
                        type="button"
                        onClick={handleBindFirstEdition}
                        className="w-full min-h-[38px] py-1.5 px-3 rounded-lg bg-[#76556F] hover:bg-[#63445C] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Bind First Edition from Vault
                      </button>
                    </div>
                  )}

                  {/* Spread Selector Strip */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {Array.from({ length: totalSpreads }).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveSpreadIndex(idx);
                          setIsBookOpen(true);
                          setCameraPreset("open_spread");
                        }}
                        className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          activeSpreadIndex === idx
                            ? "bg-[#76556F] text-white"
                            : "bg-[#F7F4EE] text-[#5C5955] hover:bg-[#F0ECE1]"
                        }`}
                      >
                        Spread #{idx + 1}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSaveSpread} className="space-y-4">
                    <div>
                      <label htmlFor="spread-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Spread Chapter / Section Title
                      </label>
                      <input
                        id="spread-title"
                        type="text"
                        disabled={selectedBook?.isFrozenForPrint}
                        value={spreadTitle}
                        onChange={(e) => setSpreadTitle(e.target.value)}
                        placeholder="Chapter I • Beginnings"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C] disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label htmlFor="spread-caption" className="block text-xs font-semibold text-[#20242C] mb-1">
                        Narrative Memoir &amp; Caption
                      </label>
                      <textarea
                        id="spread-caption"
                        rows={3}
                        disabled={selectedBook?.isFrozenForPrint}
                        value={spreadCaption}
                        onChange={(e) => setSpreadCaption(e.target.value)}
                        placeholder="Pressed Kodachrome film rolls preserved alongside handwritten family recipes."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C] disabled:opacity-60"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="spread-template" className="block text-xs font-semibold text-[#20242C] mb-1">
                          Spread Layout Template
                        </label>
                        <select
                          id="spread-template"
                          disabled={selectedBook?.isFrozenForPrint}
                          value={templateLayout}
                          onChange={(e) => setTemplateLayout(e.target.value as typeof templateLayout)}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                        >
                          <option value="editorial_classic">Editorial Classic</option>
                          <option value="photo_journal">Photo-Journal</option>
                          <option value="fine_art_spread">Fine-Art Spread</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="spread-focal" className="block text-xs font-semibold text-[#20242C] mb-1">
                          Image Focal Clearance
                        </label>
                        <select
                          id="spread-focal"
                          disabled={selectedBook?.isFrozenForPrint}
                          value={focalPreset}
                          onChange={(e) => setFocalPreset(e.target.value as typeof focalPreset)}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                        >
                          <option value="50% 50%">Centered (50% 50%)</option>
                          <option value="50% 20%">Upper Face (50% 20%)</option>
                          <option value="50% 80%">Horizon Anchor (50% 80%)</option>
                        </select>
                      </div>
                    </div>

                    {/* Reorder Buttons & Save */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!selectedBook || selectedBook.isFrozenForPrint || activeSpreadIndex === 0}
                          onClick={() => handleMoveSpread(activeSpreadIndex, -1)}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-xs font-semibold text-[#20242C] disabled:opacity-40 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                          <span>Move Up</span>
                        </button>
                        <button
                          type="button"
                          disabled={!selectedBook || selectedBook.isFrozenForPrint || activeSpreadIndex >= totalSpreads - 1}
                          onClick={() => handleMoveSpread(activeSpreadIndex, 1)}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-xs font-semibold text-[#20242C] disabled:opacity-40 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                          <span>Move Down</span>
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={selectedBook?.isFrozenForPrint}
                        className="min-h-[40px] px-5 py-2 rounded-xl bg-[#20242C] hover:bg-[#343A46] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                      >
                        {selectedBook ? "Save Spread Layout" : "Bind First Edition to Save"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 3: Vault Curation & Chapters */}
              {activeTab === "curation" && (
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
                    <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#76556F]" />
                      Vault Curation &amp; Chapters
                    </h2>
                    <span className="text-xs font-medium text-[#5F735E]">
                      {spaceMemories.length} Memories Available
                    </span>
                  </div>

                  <div>
                    <label htmlFor="curate-profile" className="block text-xs font-semibold text-[#20242C] mb-1">
                      Filter Memories by Member Profile
                    </label>
                    <select
                      id="curate-profile"
                      value={sourceProfileId}
                      onChange={(e) => setSourceProfileId(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                    >
                      <option value="">All Space Members &amp; Profiles</option>
                      {spaceProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Memories Checklist */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {spaceMemories.filter((m) => !sourceProfileId || m.associatedProfileIds?.includes(sourceProfileId)).length === 0 ? (
                      <p className="text-xs text-[#5C5955] p-3 rounded-xl bg-[#F7F4EE] text-center">
                        No memories in this vault yet. Add photographs, oral stories, or documents in /archive.
                      </p>
                    ) : (
                      spaceMemories
                        .filter((m) => !sourceProfileId || m.associatedProfileIds?.includes(sourceProfileId))
                        .map((m) => (
                          <label key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs cursor-pointer hover:bg-[#F0ECE1]">
                            <input
                              type="checkbox"
                              checked={selectedMemoryIds.includes(m.id)}
                              onChange={(e) =>
                                setSelectedMemoryIds((prev) =>
                                  e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                                )
                              }
                              className="rounded border-[#8D857A] text-[#76556F] focus:ring-[#76556F]"
                            />
                            <div className="truncate flex-1">
                              <p className="font-semibold text-[#20242C] truncate">{m.title}</p>
                              <p className="text-[11px] text-[#5C5955]">{new Date(m.capturedAt).toLocaleDateString()}</p>
                            </div>
                          </label>
                        ))
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!selectedBook || selectedBook.isFrozenForPrint || selectedMemoryIds.length === 0}
                    onClick={handleCurateIntoBook}
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
                  >
                    Auto-Compile Selected ({selectedMemoryIds.length}) into Chronological Spreads
                  </button>

                  {/* Chapter Structure Organizer */}
                  <div className="pt-3 border-t border-[#F0ECE1] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#20242C]">
                      Chapter Structure
                    </h3>
                    <form onSubmit={handleAddChapter} className="flex gap-2">
                      <input
                        type="text"
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        placeholder="Add chapter title (e.g. Letters from Normandy)..."
                        className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                      />
                      <button
                        type="submit"
                        disabled={!selectedBook || selectedBook.isFrozenForPrint}
                        className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#20242C] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        Add
                      </button>
                    </form>
                    {chapters.length > 0 && (
                      <ul className="space-y-1.5 text-xs max-h-32 overflow-y-auto">
                        {chapters.map((c, i) => (
                          <li key={`${c.title}-${i}`} className="p-2.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] flex justify-between">
                            <span>Chapter {i + 1}: <strong>{c.title}</strong></span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Preflight & Physical Print Order */}
              {activeTab === "preflight" && (
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-6 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
                    <h2 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#76556F]" />
                      Preflight &amp; Print Fulfillment
                    </h2>
                    <button
                      type="button"
                      onClick={handleLoadProof}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] border border-[#E7E2DA] text-xs font-semibold text-[#20242C] cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#5F735E]" />
                      <span>2D Proof</span>
                    </button>
                  </div>

                  {proofView && (
                    <div className="p-3 rounded-xl bg-[#EEF3EE] border border-[#C6D4C5] text-xs text-[#3C503B]">
                      2D Press Proof Verified: {proofView.pageCount} pages • {proofView.bleedMm}mm bleed • {proofView.safeMarginMm}mm safe margin
                    </div>
                  )}

                  {/* Preflight Actions & Check Status */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRunPreflight}
                        disabled={!selectedBook}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#EEF2ED] hover:bg-[#E3EBE2] text-[#22593E] border border-[#B6DBC7] text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Run Preflight
                      </button>

                      <button
                        type="button"
                        onClick={handleFreezeEdition}
                        disabled={!selectedBook || selectedBook.isFrozenForPrint}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#20242C] hover:bg-[#343A46] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        {selectedBook?.isFrozenForPrint ? "Edition Frozen" : "Freeze for Press"}
                      </button>
                    </div>

                    {preflight && (
                      <div className="p-3.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5F735E] flex items-center justify-between">
                          <span>Preflight Result</span>
                          <span className={preflight.passed ? "text-[#5F735E]" : "text-[#B6423E]"}>
                            {preflight.passed ? "✓ 100% READY" : "⚠ REVIEW REQUIRED"}
                          </span>
                        </p>
                        <ul className="space-y-1.5">
                          {preflight.checks.map((c) => (
                            <li key={c.id} className="text-xs text-[#28272A] flex items-start gap-2">
                              <span className={c.passed ? "text-[#5F735E] font-bold" : "text-[#B6423E] font-bold"}>
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
                  </div>

                  {/* Physical Print Order Form */}
                  <form onSubmit={handlePlaceOrder} className="pt-3 border-t border-[#F0ECE1] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#20242C] flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-[#76556F]" />
                      Zero-Markup Heirloom Press Order
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <label htmlFor="ship-name" className="block text-[11px] font-semibold text-[#20242C] mb-1">
                          Recipient Name
                        </label>
                        <input
                          id="ship-name"
                          type="text"
                          required
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Elena Vance"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="ship-street" className="block text-[11px] font-semibold text-[#20242C] mb-1">
                          Street Address
                        </label>
                        <input
                          id="ship-street"
                          type="text"
                          required
                          value={streetAddress}
                          onChange={(e) => setStreetAddress(e.target.value)}
                          placeholder="742 Archival Way"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                        />
                      </div>
                      <div>
                        <label htmlFor="ship-city" className="block text-[11px] font-semibold text-[#20242C] mb-1">
                          City
                        </label>
                        <input
                          id="ship-city"
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Portland"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                        />
                      </div>
                      <div>
                        <label htmlFor="ship-zip" className="block text-[11px] font-semibold text-[#20242C] mb-1">
                          Postal Code
                        </label>
                        <input
                          id="ship-zip"
                          type="text"
                          required
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="97205"
                          className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedBook || !selectedBook.isFrozenForPrint}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#5F735E] hover:bg-[#4E5F4D] text-[#FFFFFF] text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
                    >
                      {!selectedBook
                        ? "Bind First Edition to Order Prints"
                        : selectedBook.isFrozenForPrint
                        ? "Place Zero-Markup Print Order"
                        : "Freeze Edition for Press Above Before Ordering"}
                    </button>
                  </form>

                  {/* Print Order Ledger */}
                  {orders.length > 0 && (
                    <div className="pt-3 border-t border-[#F0ECE1] space-y-2">
                      <h4 className="text-xs font-semibold text-[#20242C]">Active Print Orders</h4>
                      {orders.map((o) => (
                        <div key={o.id} className="p-3 rounded-xl bg-[#F7F4EE] text-xs flex justify-between items-center">
                          <span className="font-mono text-[11px] text-[#20242C]">#{o.id.slice(0, 8)}</span>
                          <span className="uppercase font-semibold text-[#5F735E] text-[10.5px] px-2 py-0.5 rounded-full bg-white border border-[#C6D4C5]">
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Modal: Bind New Book Edition */}
      {showNewEditionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E7E2DA] max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#76556F]" />
                Bind New Book Edition
              </h3>
              <button
                type="button"
                onClick={() => setShowNewEditionModal(false)}
                className="text-[#5C5955] hover:text-[#20242C] text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label htmlFor="modal-new-title" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Book Title
                </label>
                <input
                  id="modal-new-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="The Vance Anthology"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                />
              </div>

              <div>
                <label htmlFor="modal-new-sub" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Subtitle (Optional)
                </label>
                <input
                  id="modal-new-sub"
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Volume I • 1994–2026"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-new-fmt" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Trim Size
                  </label>
                  <select
                    id="modal-new-fmt"
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as BookDTO["format"])}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                  >
                    <option value="hardcover_standard_8x10">Standard 8x10&quot;</option>
                    <option value="hardcover_square_8x8">Square 8x8&quot;</option>
                    <option value="hardcover_grand_12x12">Grand 12x12&quot;</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-new-foil" className="block text-xs font-semibold text-[#20242C] mb-1">
                    Foil Stamping
                  </label>
                  <select
                    id="modal-new-foil"
                    value={newFoil}
                    onChange={(e) => setNewFoil(e.target.value as BookDTO["foilStamping"])}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                  >
                    <option value="gold">Archival Gold</option>
                    <option value="rose">Rose Copper</option>
                    <option value="silver">Brushed Silver</option>
                    <option value="blind_emboss">Blind Emboss</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#20242C] mb-2">
                  Archival Leather Cloth Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {BOOK_LEATHER_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      aria-label={swatch.name}
                      onClick={() => setNewColor(swatch.hex)}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border-2 transition-all cursor-pointer ${
                        newColor === swatch.hex ? "border-[#20242C] scale-105" : "border-[#E7E2DA]"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full" style={{ backgroundColor: swatch.hex }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewEditionModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] text-[#20242C] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#76556F] hover:bg-[#63445C] text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Create Hardcover Edition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New Space */}
      {showNewSpaceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E7E2DA] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#20242C] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#76556F]" />
                Create Archive Space
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSpaceModal(false)}
                className="text-[#5C5955] hover:text-[#20242C] text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSpace} className="space-y-4">
              <div>
                <label htmlFor="modal-space-name" className="block text-xs font-semibold text-[#20242C] mb-1">
                  Space Name
                </label>
                <input
                  id="modal-space-name"
                  type="text"
                  required
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="e.g. Vance Family Vault"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] text-xs text-[#20242C]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSpaceModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F7F4EE] hover:bg-[#F0ECE1] text-[#20242C] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSpace || !newSpaceName.trim()}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#20242C] hover:bg-[#343A46] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {creatingSpace ? "Creating..." : "Create Space"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
