"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PenTool,
  ListTree,
  Palette,
  BookOpen,
  Send,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  History,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  Printer,
  WifiOff,
  CloudCheck,
} from "lucide-react";
import {
  AUTHOR_STUDIO_TRIM_SIZES,
  AUTHOR_STUDIO_TYPOGRAPHY_PRESETS,
} from "@memory-capsule/contracts/author-studio";
import {
  BOOK_FOIL_SWATCHES,
  BOOK_LEATHER_SWATCHES,
  type BookFoilSwatchId,
  type BookLeatherSwatchId,
  type BookSpreadPreview,
} from "@memory-capsule/contracts/book-3d";
import {
  createBook,
  createManuscriptChapter,
  createManuscriptRevision,
  deleteManuscriptChapter,
  downloadManuscriptExport,
  fetchBooks,
  fetchSpaces,
  getBookManuscript,
  getStoredSession,
  importManuscriptFile,
  listManuscriptRevisions,
  reorderManuscriptChapters,
  restoreManuscriptRevision,
  saveManuscriptResumeState,
  syncManuscriptSpreads,
  updateBookManuscript,
  updateManuscriptChapter,
  type AuthorEnvironment,
  type BookDTO,
  type BookRevisionDTO,
  type ChapterSectionType,
  type ChapterStatus,
  type ExportFormat,
  type ImportFormat,
  type ManuscriptChapterDTO,
  type ManuscriptDocumentDTO,
  type MergeStrategy,
  type TrimSize,
  type TypographyPreset,
} from "@/lib/api";
import {
  getOfflineChapterDraft,
  getOfflineResumeCheckpoint,
  listPendingOfflineDrafts,
  markOfflineDraftSynced,
  saveOfflineChapterDraft,
  saveOfflineResumeCheckpoint,
} from "@/lib/author-offline-db";
import { ClientStudioMount } from "@/components/3d/ClientStudioMount";
import { TiptapManuscriptEditor } from "./TiptapManuscriptEditor";

const ENVIRONMENTS: Array<{
  id: AuthorEnvironment;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "write", label: "Write", description: "Distraction-free manuscript canvas", icon: PenTool },
  { id: "structure", label: "Structure", description: "Parts, chapters & pacing", icon: ListTree },
  { id: "design", label: "Design & Format", description: "Trim, typography & cover", icon: Palette },
  { id: "preview", label: "Book Theater", description: "Live 3D heirloom preview", icon: BookOpen },
  { id: "publish", label: "Publish", description: "Revisions, import & export", icon: Send },
];

const EXPORT_FORMATS: Array<{ id: ExportFormat; label: string; ext: string; note: string }> = [
  { id: "memoria", label: "Memoria Package", ext: ".memoria", note: "Lossless full editable archive" },
  { id: "docx", label: "Microsoft Word", ext: ".docx", note: "Standard OpenXML manuscript" },
  { id: "epub", label: "EPUB 3.3 eBook", ext: ".epub", note: "Reflowable digital reader format" },
  { id: "pdf", label: "Archival PDF", ext: ".pdf", note: "Portable print-ready proof" },
  { id: "html", label: "Print HTML5", ext: ".html", note: "Living Archive styled web edition" },
  { id: "markdown", label: "Markdown", ext: ".md", note: "Plain structured prose" },
  { id: "txt", label: "Plain Text", ext: ".txt", note: "Universal archival text" },
];

function createGuestManuscript(): { book: BookDTO; manuscript: ManuscriptDocumentDTO } {
  const now = new Date().toISOString();
  const bookId = "00000000-0000-4000-8000-00000000a001";
  const spaceId = "00000000-0000-4000-8000-00000000a000";
  const ch1Id = "00000000-0000-4000-8000-00000000c001";
  const ch2Id = "00000000-0000-4000-8000-00000000c002";

  const book: BookDTO = {
    id: bookId,
    spaceId,
    title: "The Bennett Family Chronicle",
    subtitle: "Letters, Recipes & Summers by the Lake",
    format: "hardcover_standard_8x10",
    coverColor: "#304C43",
    foilStamping: "gold",
    coverTitle: "The Bennett Family Chronicle",
    spineText: "BENNETT CHRONICLE",
    spreads: [],
    version: 1,
    isFrozenForPrint: false,
    createdAt: now,
    updatedAt: now,
  };

  const manuscript: ManuscriptDocumentDTO = {
    id: "00000000-0000-4000-8000-00000000b001",
    bookId,
    spaceId,
    schemaVersion: "1.0.0",
    trimSize: "6x9_trade",
    typographyPreset: "living_archive_serif",
    themePreset: "living_archive_ivory",
    languageCode: "en",
    authorName: "Clara Bennett",
    dedication: "For every generation that gathers around the cedar table.",
    epigraph: "Memory is the thread that binds yesterday to tomorrow.",
    metadata: {},
    totalWordCount: 54,
    chapters: [
      {
        id: ch1Id,
        bookId,
        sectionType: "chapter",
        title: "Chapter 1: Morning Mist on the Porch",
        subtitle: "Summer of 1984",
        slug: "chapter-1-morning-mist-on-the-porch",
        sortOrder: 0,
        contentJson: { type: "doc", content: [{ type: "paragraph" }] },
        contentHtml:
          "<p>Every July began with the scent of pine needles and warm cardamom bread drifting across the cedar porch. Grandfather kept a brass compass beside his coffee cup and taught us how to read the wind off the water before sunrise.</p>",
        contentText:
          "Every July began with the scent of pine needles and warm cardamom bread drifting across the cedar porch. Grandfather kept a brass compass beside his coffee cup and taught us how to read the wind off the water before sunrise.",
        wordCount: 40,
        status: "revised",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ch2Id,
        bookId,
        sectionType: "chapter",
        title: "Chapter 2: The Cedar Recipe Box",
        subtitle: "Handwritten margins",
        slug: "chapter-2-the-cedar-recipe-box",
        sortOrder: 1,
        contentJson: { type: "doc", content: [{ type: "paragraph" }] },
        contentHtml:
          "<p>Inside the cedar box lived forty-two index cards smudged with vanilla and cinnamon, each signed with the year it first appeared at Sunday dinner.</p>",
        contentText:
          "Inside the cedar box lived forty-two index cards smudged with vanilla and cinnamon, each signed with the year it first appeared at Sunday dinner.",
        wordCount: 24,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return { book, manuscript };
}

function build3DSpreadsFromManuscript(
  book: BookDTO,
  manuscript: ManuscriptDocumentDTO
): BookSpreadPreview[] {
  const ordered = [...manuscript.chapters].sort((a, b) => a.sortOrder - b.sortOrder);
  const spreads: BookSpreadPreview[] = [];

  const first = ordered[0];
  spreads.push({
    spreadIndex: 0,
    chapterTitle: manuscript.authorName || "Memoria Heirloom Edition",
    leftPageNumber: 1,
    rightPageNumber: 2,
    leftHeading: book.title,
    leftDate: manuscript.trimSize.replace(/_/g, " ").toUpperCase(),
    leftLocation: `${manuscript.totalWordCount.toLocaleString()} words`,
    leftBody:
      manuscript.dedication ||
      book.subtitle ||
      "Preserved in the Memoria Living Archive.",
    rightHeading: first ? first.title : "Chapter 1",
    rightDate: first?.subtitle || "Chapter 1",
    rightLocation: first ? `${first.wordCount} words` : "0 words",
    rightBody: first
      ? first.contentText.slice(0, 420) || "Begin writing this chapter…"
      : "Add your first chapter in the Write environment.",
  });

  const rest = ordered.slice(1);
  for (let i = 0; i < rest.length; i += 2) {
    const leftCh = rest[i];
    const rightCh = rest[i + 1];
    const spreadIdx = spreads.length;
    spreads.push({
      spreadIndex: spreadIdx,
      chapterTitle: leftCh.sectionType.replace(/_/g, " ").toUpperCase(),
      leftPageNumber: spreadIdx * 2 + 1,
      rightPageNumber: spreadIdx * 2 + 2,
      leftHeading: leftCh.title,
      leftDate: leftCh.subtitle || `Section ${spreadIdx * 2 + 1}`,
      leftLocation: `${leftCh.wordCount} words`,
      leftBody: leftCh.contentText.slice(0, 420) || "Empty chapter draft.",
      rightHeading: rightCh ? rightCh.title : book.title,
      rightDate: rightCh ? rightCh.subtitle || `Section ${spreadIdx * 2 + 2}` : "End of Manuscript",
      rightLocation: rightCh ? `${rightCh.wordCount} words` : `${manuscript.chapters.length} chapters`,
      rightBody: rightCh
        ? rightCh.contentText.slice(0, 420) || "Empty chapter draft."
        : manuscript.epigraph || "Set in Living Archive Serif by Memoria Author Studio.",
    });
  }

  return spreads;
}

function detectImportFormat(fileName: string): ImportFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".memoria")) return "memoria";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".epub")) return "epub";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".pdf")) return "pdf";
  return "txt";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function AuthorStudioWorkspace({ initialBookId }: { initialBookId?: string }) {
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<BookDTO[]>([]);
  const [activeBook, setActiveBook] = useState<BookDTO | null>(null);
  const [manuscript, setManuscript] = useState<ManuscriptDocumentDTO | null>(null);
  const [revisions, setRevisions] = useState<BookRevisionDTO[]>([]);
  const [activeEnv, setActiveEnv] = useState<AuthorEnvironment>("write");
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [resumeCursorOffset, setResumeCursorOffset] = useState<number>(0);

  // Save & sync status
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline_saved" | "error">("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("append");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterType, setNewChapterType] = useState<ChapterSectionType>("chapter");
  const [checkpointLabel, setCheckpointLabel] = useState("");

  // 3D Book Theater state
  const [isBookOpen, setIsBookOpen] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [selectedLeatherId, setSelectedLeatherId] = useState<BookLeatherSwatchId>("plum");
  const [selectedFoilId, setSelectedFoilId] = useState<BookFoilSwatchId>("gold");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBookManuscript = useCallback(async (bookId: string) => {
    setLoading(true);
    try {
      const { book, manuscript: ms, editorState } = await getBookManuscript(bookId);
      let currentMs = ms;

      // Reconcile IndexedDB offline drafts if newer or pending sync
      const pendingDrafts = await listPendingOfflineDrafts(bookId);
      if (pendingDrafts.length > 0 && navigator.onLine) {
        let syncedAny = false;
        for (const draft of pendingDrafts) {
          const synced = await updateManuscriptChapter(bookId, draft.chapterId, {
            title: draft.title,
            contentHtml: draft.contentHtml,
            contentJson: draft.contentJson,
          }).catch(() => null);
          if (synced) {
            syncedAny = true;
            await markOfflineDraftSynced(bookId, draft.chapterId);
          }
        }
        if (syncedAny) {
          const refreshed = await getBookManuscript(bookId).catch(() => null);
          if (refreshed) {
            currentMs = refreshed.manuscript;
          }
        }
      }

      setActiveBook(book);
      setManuscript(currentMs);

      const metaLeather = currentMs.metadata?.leatherId;
      if (
        typeof metaLeather === "string" &&
        BOOK_LEATHER_SWATCHES.some((s) => s.id === metaLeather)
      ) {
        setSelectedLeatherId(metaLeather as BookLeatherSwatchId);
      }
      const metaFoil = currentMs.metadata?.foilId;
      if (
        typeof metaFoil === "string" &&
        BOOK_FOIL_SWATCHES.some((f) => f.id === metaFoil)
      ) {
        setSelectedFoilId(metaFoil as BookFoilSwatchId);
      }

      const offlineResume = await getOfflineResumeCheckpoint(bookId);
      const resumeEnv = editorState?.activeEnvironment || offlineResume?.activeEnvironment || "write";
      const resumeCh =
        editorState?.activeChapterId ||
        offlineResume?.activeChapterId ||
        currentMs.chapters[0]?.id ||
        null;
      setActiveEnv(resumeEnv);
      setActiveChapterId(resumeCh);
      setResumeCursorOffset(editorState?.cursorOffset ?? offlineResume?.cursorOffset ?? 0);

      const revs = await listManuscriptRevisions(bookId).catch(() => []);
      setRevisions(revs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = getStoredSession();
      if (!session.user) {
        if (!cancelled) {
          const guest = createGuestManuscript();
          setIsGuest(true);
          setBooks([guest.book]);
          setActiveBook(guest.book);
          setManuscript(guest.manuscript);
          setActiveChapterId(guest.manuscript.chapters[0]?.id ?? null);
          setLoading(false);
        }
        return;
      }

      try {
        const spaces = await fetchSpaces();
        const primarySpace = spaces[0];
        let loadedBooks: BookDTO[] = [];
        if (primarySpace) {
          loadedBooks = await fetchBooks(primarySpace.id);
          if (loadedBooks.length === 0) {
            const created = await createBook(primarySpace.id, {
              title: "My Heirloom Manuscript",
              subtitle: "Created in Memoria Author Studio",
              coverTitle: "My Heirloom Manuscript",
              spineText: "MEMORIA",
            });
            loadedBooks = [created];
          }
        }
        if (!cancelled) {
          setIsGuest(false);
          setBooks(loadedBooks);
          const targetId =
            (initialBookId && loadedBooks.some((b) => b.id === initialBookId) && initialBookId) ||
            loadedBooks[0]?.id;
          if (targetId) {
            await loadBookManuscript(targetId);
          } else {
            const guest = createGuestManuscript();
            setIsGuest(true);
            setActiveBook(guest.book);
            setManuscript(guest.manuscript);
            setActiveChapterId(guest.manuscript.chapters[0]?.id ?? null);
            setLoading(false);
          }
        }
      } catch {
        if (!cancelled) {
          const guest = createGuestManuscript();
          setIsGuest(true);
          setBooks([guest.book]);
          setActiveBook(guest.book);
          setManuscript(guest.manuscript);
          setActiveChapterId(guest.manuscript.chapters[0]?.id ?? null);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialBookId, loadBookManuscript]);

  const activeChapter = useMemo(() => {
    if (!manuscript) return null;
    return manuscript.chapters.find((c) => c.id === activeChapterId) || manuscript.chapters[0] || null;
  }, [manuscript, activeChapterId]);

  const activeTypography = useMemo(() => {
    const presetId = manuscript?.typographyPreset || "living_archive_serif";
    return (
      AUTHOR_STUDIO_TYPOGRAPHY_PRESETS.find((p) => p.id === presetId) ||
      AUTHOR_STUDIO_TYPOGRAPHY_PRESETS[0]
    );
  }, [manuscript?.typographyPreset]);

  const theaterSpreads = useMemo(() => {
    if (!activeBook || !manuscript) return [];
    return build3DSpreadsFromManuscript(activeBook, manuscript);
  }, [activeBook, manuscript]);

  // Persist exact resume checkpoint on environment/chapter change
  const persistResumeCheckpoint = useCallback(
    async (env: AuthorEnvironment, chapterId: string | null, cursorOffset = 0) => {
      if (!activeBook) return;
      const now = new Date().toISOString();
      await saveOfflineResumeCheckpoint({
        bookId: activeBook.id,
        activeEnvironment: env,
        activeChapterId: chapterId,
        cursorOffset,
        scrollOffset: typeof window !== "undefined" ? Math.round(window.scrollY) : 0,
        updatedAt: now,
      });
      if (!isGuest && navigator.onLine) {
        await saveManuscriptResumeState(activeBook.id, {
          activeEnvironment: env,
          activeChapterId: chapterId,
          cursorOffset,
          scrollOffset: typeof window !== "undefined" ? Math.round(window.scrollY) : 0,
        }).catch(() => undefined);
      }
    },
    [activeBook, isGuest]
  );

  const handleSelectEnvironment = (env: AuthorEnvironment) => {
    setActiveEnv(env);
    void persistResumeCheckpoint(env, activeChapter?.id ?? null, resumeCursorOffset);
  };

  const handleSelectChapter = async (chapterId: string) => {
    setActiveChapterId(chapterId);
    if (activeBook) {
      const localDraft = await getOfflineChapterDraft(activeBook.id, chapterId);
      if (localDraft && localDraft.pendingSync && manuscript) {
        setManuscript({
          ...manuscript,
          chapters: manuscript.chapters.map((c) =>
            c.id === chapterId
              ? { ...c, contentHtml: localDraft.contentHtml, contentJson: localDraft.contentJson }
              : c
          ),
        });
      }
    }
    void persistResumeCheckpoint(activeEnv, chapterId, 0);
  };

  const handleEditorChange = (payload: {
    html: string;
    json: Record<string, unknown>;
    text: string;
    wordCount: number;
    cursorOffset: number;
  }) => {
    if (!activeBook || !manuscript || !activeChapter) return;
    setResumeCursorOffset(payload.cursorOffset);

    const updatedChapters = manuscript.chapters.map((c) =>
      c.id === activeChapter.id
        ? {
            ...c,
            contentHtml: payload.html,
            contentJson: payload.json,
            contentText: payload.text,
            wordCount: payload.wordCount,
            updatedAt: new Date().toISOString(),
          }
        : c
    );
    const totalWordCount = updatedChapters.reduce((sum, c) => sum + c.wordCount, 0);
    setManuscript({ ...manuscript, chapters: updatedChapters, totalWordCount });
    setSaveState("saving");

    // Immediately persist to IndexedDB for zero-data-loss offline resilience
    void saveOfflineChapterDraft({
      bookId: activeBook.id,
      chapterId: activeChapter.id,
      title: activeChapter.title,
      contentHtml: payload.html,
      contentJson: payload.json,
      updatedAt: new Date().toISOString(),
      pendingSync: true,
    });

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (isGuest || !navigator.onLine) {
        setSaveState("offline_saved");
        return;
      }
      try {
        await updateManuscriptChapter(activeBook.id, activeChapter.id, {
          contentHtml: payload.html,
          contentJson: payload.json,
        });
        await markOfflineDraftSynced(activeBook.id, activeChapter.id);
        await persistResumeCheckpoint(activeEnv, activeChapter.id, payload.cursorOffset);
        setSaveState("saved");
      } catch {
        setSaveState("offline_saved");
      }
    }, 650);
  };

  const handleAddChapter = async () => {
    if (!activeBook || !manuscript) return;
    const title = newChapterTitle.trim() || `Chapter ${manuscript.chapters.length + 1}`;
    setNewChapterTitle("");
    if (isGuest) {
      const now = new Date().toISOString();
      const ch: ManuscriptChapterDTO = {
        id: crypto.randomUUID(),
        bookId: activeBook.id,
        sectionType: newChapterType,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sortOrder: manuscript.chapters.length,
        contentJson: { type: "doc", content: [{ type: "paragraph" }] },
        contentHtml: "<p></p>",
        contentText: "",
        wordCount: 0,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      setManuscript({ ...manuscript, chapters: [...manuscript.chapters, ch] });
      setActiveChapterId(ch.id);
      return;
    }
    const created = await createManuscriptChapter(activeBook.id, {
      title,
      sectionType: newChapterType,
      contentHtml: "<p></p>",
    });
    setManuscript({ ...manuscript, chapters: [...manuscript.chapters, created] });
    setActiveChapterId(created.id);
    setStatusMessage(`Added "${created.title}".`);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!activeBook || !manuscript || manuscript.chapters.length <= 1) return;
    if (!isGuest) {
      await deleteManuscriptChapter(activeBook.id, chapterId);
    }
    const remaining = manuscript.chapters
      .filter((c) => c.id !== chapterId)
      .map((c, idx) => ({ ...c, sortOrder: idx }));
    setManuscript({
      ...manuscript,
      chapters: remaining,
      totalWordCount: remaining.reduce((sum, c) => sum + c.wordCount, 0),
    });
    if (activeChapterId === chapterId) {
      setActiveChapterId(remaining[0]?.id ?? null);
    }
  };

  const handleMoveChapter = async (index: number, direction: -1 | 1) => {
    if (!activeBook || !manuscript) return;
    const target = index + direction;
    if (target < 0 || target >= manuscript.chapters.length) return;
    const next = [...manuscript.chapters];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    const reindexed = next.map((c, idx) => ({ ...c, sortOrder: idx }));
    setManuscript({ ...manuscript, chapters: reindexed });
    if (!isGuest) {
      await reorderManuscriptChapters(
        activeBook.id,
        reindexed.map((c) => c.id)
      );
    }
  };

  const handleUpdateChapterMeta = async (
    chapterId: string,
    updates: Partial<{ title: string; subtitle: string | null; status: ChapterStatus; sectionType: ChapterSectionType }>
  ) => {
    if (!activeBook || !manuscript) return;
    setManuscript({
      ...manuscript,
      chapters: manuscript.chapters.map((c) => (c.id === chapterId ? { ...c, ...updates } : c)),
    });
    if (!isGuest) {
      await updateManuscriptChapter(activeBook.id, chapterId, updates);
    }
  };

  const handleUpdateDesign = async (
    updates: Partial<{
      trimSize: TrimSize;
      typographyPreset: TypographyPreset;
      authorName: string;
      dedication: string;
      epigraph: string;
    }>
  ) => {
    if (!activeBook || !manuscript) return;
    setManuscript({ ...manuscript, ...updates });
    if (!isGuest) {
      await updateBookManuscript(activeBook.id, updates);
    }
    setStatusMessage("Design & format preferences saved.");
  };

  const handleSyncToBookTheater = async () => {
    if (!activeBook) return;
    if (isGuest) {
      setStatusMessage("3D Book Theater updated with live local manuscript spreads.");
      return;
    }
    const res = await syncManuscriptSpreads(activeBook.id);
    setActiveBook(res.book);
    setStatusMessage(`Synced ${res.spreadsGenerated} live spreads to the 3D Book Theater.`);
  };

  const handleCreateCheckpoint = async () => {
    if (!activeBook || !manuscript) return;
    const label = checkpointLabel.trim() || `Checkpoint (${manuscript.totalWordCount} words)`;
    setCheckpointLabel("");
    if (isGuest) {
      setStatusMessage("Sign in to persist immutable server checkpoints.");
      return;
    }
    const rev = await createManuscriptRevision(activeBook.id, label, "manual");
    setRevisions([rev, ...revisions]);
    setStatusMessage(`Saved immutable revision "${rev.label}".`);
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!activeBook || isGuest) return;
    const restored = await restoreManuscriptRevision(activeBook.id, revisionId);
    setManuscript(restored);
    setActiveChapterId(restored.chapters[0]?.id ?? null);
    setStatusMessage("Restored manuscript from selected revision.");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0 || !activeBook) return;
    e.target.value = "";

    if (isGuest) {
      let currentChapters = manuscript ? [...manuscript.chapters] : [];
      let importedCount = 0;
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const format = detectImportFormat(file.name);
        if (format !== "markdown" && format !== "txt" && format !== "html") {
          setStatusMessage("Sign in to import binary .memoria, .docx, .epub, and .pdf files via server validation.");
          continue;
        }
        const buffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(buffer);
        const now = new Date().toISOString();
        const ch: ManuscriptChapterDTO = {
          id: crypto.randomUUID(),
          bookId: activeBook.id,
          sectionType: "chapter",
          title: file.name.replace(/\.[^.]+$/, ""),
          slug: file.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          sortOrder: currentChapters.length,
          contentJson: { type: "doc", content: [{ type: "paragraph" }] },
          contentHtml: `<p>${text.replace(/\n+/g, "</p><p>")}</p>`,
          contentText: text,
          wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };
        currentChapters = i === 0 && mergeStrategy === "replace" ? [ch] : [...currentChapters, ch];
        importedCount += 1;
      }
      if (manuscript && importedCount > 0) {
        setManuscript({
          ...manuscript,
          chapters: currentChapters.map((c, idx) => ({ ...c, sortOrder: idx })),
          totalWordCount: currentChapters.reduce((s, c) => s + c.wordCount, 0),
        });
        setActiveChapterId(currentChapters[currentChapters.length - 1]?.id ?? null);
        setStatusMessage(`Imported ${importedCount} file(s) into guest draft.`);
      }
      return;
    }

    try {
      let latestManuscript: ManuscriptDocumentDTO | null = null;
      let totalImportedChapters = 0;
      let totalImportedWords = 0;
      const collectedWarnings: string[] = [];

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const format = detectImportFormat(file.name);
        const buffer = await file.arrayBuffer();
        const contentBase64 = arrayBufferToBase64(buffer);
        const effectiveStrategy: MergeStrategy =
          i === 0 ? mergeStrategy : mergeStrategy === "replace" ? "append" : mergeStrategy;

        const res = await importManuscriptFile(activeBook.id, {
          format,
          fileName: file.name,
          contentBase64,
          mergeStrategy: effectiveStrategy,
        });
        latestManuscript = res.manuscript;
        totalImportedChapters += res.importedChapters;
        totalImportedWords += res.importedWordCount;
        collectedWarnings.push(...res.warnings);
      }

      if (latestManuscript) {
        setManuscript(latestManuscript);
        setActiveChapterId(latestManuscript.chapters[0]?.id ?? null);
      }
      setImportWarnings(collectedWarnings);
      setStatusMessage(
        `Imported ${totalImportedChapters} chapter(s) (${totalImportedWords.toLocaleString()} words) from ${files.length === 1 ? files[0].name : `${files.length} files`}.`
      );
      const revs = await listManuscriptRevisions(activeBook.id).catch(() => revisions);
      setRevisions(revs);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Import failed");
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!activeBook || !manuscript) return;
    if (isGuest) {
      const content =
        format === "markdown" || format === "txt"
          ? manuscript.chapters.map((c) => `# ${c.title}\n\n${c.contentText}`).join("\n\n")
          : `<html><body><h1>${activeBook.title}</h1>${manuscript.chapters.map((c) => `<h2>${c.title}</h2>${c.contentHtml}`).join("")}</body></html>`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memoria-guest-draft.${format === "markdown" ? "md" : format}`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(`Downloaded guest ${format.toUpperCase()} export.`);
      return;
    }
    try {
      const { blob, fileName, checksum } = await downloadManuscriptExport(activeBook.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(
        `Exported ${fileName}${checksum ? ` (SHA-256: ${checksum.slice(0, 12)}…)` : ""}`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Export failed");
    }
  };

  if (loading || !activeBook || !manuscript) {
    return (
      <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-12 text-center">
        <div className="w-8 h-8 border-2 border-[#76556F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-serif text-[#20242C]">Opening Memoria Author Studio…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="author-studio-workspace">
      {/* Top Author Studio Control Bar */}
      <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] px-5 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#76556F]">
                Memoria Author Studio
              </span>
              {isGuest && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F7F4EE] border border-[#DDD6C8] text-[#5A606D]">
                  Guest Draft Sandbox
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {books.length > 1 ? (
                <select
                  aria-label="Select book manuscript"
                  value={activeBook.id}
                  onChange={(e) => void loadBookManuscript(e.target.value)}
                  className="text-lg font-serif font-semibold text-[#20242C] bg-transparent border-b border-transparent hover:border-[#DDD6C8] focus:outline-none"
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              ) : (
                <h2 className="text-lg font-serif font-semibold text-[#20242C]">{activeBook.title}</h2>
              )}
              <span className="text-xs text-[#6B7280]">
                • {manuscript.chapters.length} sections • {manuscript.totalWordCount.toLocaleString()} words
              </span>
            </div>
          </div>
        </div>

        {/* 5-Environment Switcher */}
        <nav
          aria-label="Author Studio environments"
          className="flex flex-wrap items-center gap-1.5 bg-[#F7F4EE] p-1 rounded-xl border border-[#E7E2DA]"
        >
          {ENVIRONMENTS.map((env) => {
            const Icon = env.icon;
            const active = activeEnv === env.id;
            return (
              <button
                key={env.id}
                type="button"
                data-testid={`author-env-${env.id}`}
                onClick={() => handleSelectEnvironment(env.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#76556F] text-[#FFFFFF] shadow-sm"
                    : "text-[#20242C] hover:bg-[#EFEAE0]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{env.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Persistence & Quick Links */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#5A606D]">
            {saveState === "saving" && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#76556F]" />}
            {saveState === "saved" && <CloudCheck className="w-3.5 h-3.5 text-[#5F735E]" />}
            {saveState === "offline_saved" && <WifiOff className="w-3.5 h-3.5 text-[#76556F]" />}
            <span>
              {saveState === "saving"
                ? "Saving…"
                : saveState === "offline_saved"
                  ? "Saved offline (IndexedDB)"
                  : "All changes saved"}
            </span>
          </div>
          <Link
            href="/studio"
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C] hover:bg-[#EFEAE0]"
          >
            3D Workstation
          </Link>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-[#849483]/40 bg-[#F4F7F3] px-4 py-2.5 text-xs text-[#20242C] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#5F735E]" />
            {statusMessage}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[#5A606D] hover:text-[#20242C]"
          >
            Dismiss
          </button>
        </div>
      )}

      {importWarnings.length > 0 && (
        <div className="rounded-xl border border-[#C49A4A]/50 bg-[#FDF9F0] px-4 py-3 text-xs text-[#20242C] space-y-1">
          <div className="font-semibold flex items-center gap-2 text-[#7A5B1F]">
            <AlertTriangle className="w-4 h-4" />
            Import Fidelity Notices
          </div>
          {importWarnings.map((w, idx) => (
            <p key={idx} className="text-[#5A606D]">
              • {w}
            </p>
          ))}
        </div>
      )}

      {/* ENVIRONMENT 1: WRITE */}
      {activeEnv === "write" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chapter Binder Sidebar */}
          <aside className="lg:col-span-3 rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-4 shadow-sm space-y-3 h-fit">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                Manuscript Binder
              </h3>
              <button
                type="button"
                onClick={handleAddChapter}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-[#76556F] text-[#FFFFFF] hover:bg-[#64465E]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            <div className="space-y-1.5">
              {manuscript.chapters.map((ch, idx) => {
                const selected = activeChapter?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => void handleSelectChapter(ch.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      selected
                        ? "bg-[#F7F4EE] border-[#76556F] text-[#20242C]"
                        : "bg-[#FFFFFF] border-transparent hover:bg-[#FBF9F5] text-[#4A515E]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate">
                        {idx + 1}. {ch.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFEAE0] text-[#5A606D] shrink-0">
                        {ch.wordCount}w
                      </span>
                    </div>
                    <div className="text-[10px] text-[#7A818E] mt-0.5 capitalize">
                      {ch.sectionType.replace(/_/g, " ")} • {ch.status}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Tiptap Writing Canvas */}
          <section className="lg:col-span-9 space-y-4">
            {activeChapter && (
              <>
                <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] px-6 py-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <input
                      type="text"
                      aria-label="Chapter title"
                      value={activeChapter.title}
                      onChange={(e) =>
                        void handleUpdateChapterMeta(activeChapter.id, { title: e.target.value })
                      }
                      className="w-full text-2xl font-serif font-semibold text-[#20242C] bg-transparent focus:outline-none"
                    />
                    <input
                      type="text"
                      aria-label="Chapter subtitle"
                      placeholder="Optional subtitle, year, or location…"
                      value={activeChapter.subtitle || ""}
                      onChange={(e) =>
                        void handleUpdateChapterMeta(activeChapter.id, { subtitle: e.target.value })
                      }
                      className="w-full text-sm text-[#6B7280] bg-transparent focus:outline-none mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Chapter status"
                      value={activeChapter.status}
                      onChange={(e) =>
                        void handleUpdateChapterMeta(activeChapter.id, {
                          status: e.target.value as ChapterStatus,
                        })
                      }
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C]"
                    >
                      <option value="draft">Draft</option>
                      <option value="revised">Revised</option>
                      <option value="final">Final</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleCreateCheckpoint()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C] hover:bg-[#EFEAE0]"
                    >
                      <Save className="w-3.5 h-3.5 text-[#76556F]" />
                      Checkpoint
                    </button>
                  </div>
                </div>

                <TiptapManuscriptEditor
                  chapterId={activeChapter.id}
                  initialHtml={activeChapter.contentHtml}
                  typographyFontFamily={activeTypography.bodyFont}
                  initialCursorOffset={resumeCursorOffset}
                  onChange={handleEditorChange}
                />
              </>
            )}
          </section>
        </div>
      )}

      {/* ENVIRONMENT 2: STRUCTURE */}
      {activeEnv === "structure" && (
        <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E2DA] pb-4">
            <div>
              <h3 className="text-lg font-serif font-semibold text-[#20242C]">
                Book Architecture & Chapter Outline
              </h3>
              <p className="text-xs text-[#6B7280]">
                Organize front matter, parts, chapters, epilogue, and back matter with live word pacing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="New section type"
                value={newChapterType}
                onChange={(e) => setNewChapterType(e.target.value as ChapterSectionType)}
                className="text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C]"
              >
                <option value="front_matter">Front Matter</option>
                <option value="part">Part Divider</option>
                <option value="chapter">Chapter</option>
                <option value="epilogue">Epilogue</option>
                <option value="back_matter">Back Matter</option>
              </select>
              <input
                type="text"
                placeholder="New section title…"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FFFFFF] text-[#20242C] w-56"
              />
              <button
                type="button"
                onClick={() => void handleAddChapter()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg bg-[#76556F] text-[#FFFFFF] hover:bg-[#64465E]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Section
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {manuscript.chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[#E7E2DA] bg-[#FBF9F5]"
              >
                <div className="flex items-center gap-3 min-w-[240px]">
                  <span className="w-7 h-7 rounded-full bg-[#EFEAE0] text-[#76556F] text-xs font-semibold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-sm font-serif font-semibold text-[#20242C]">{ch.title}</div>
                    <div className="text-xs text-[#6B7280] capitalize">
                      {ch.sectionType.replace(/_/g, " ")} • {ch.wordCount.toLocaleString()} words • {ch.status}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChapterId(ch.id);
                      handleSelectEnvironment("write");
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#FFFFFF] text-[#20242C] hover:bg-[#F7F4EE]"
                  >
                    Open in Write
                  </button>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => void handleMoveChapter(idx, -1)}
                    className="p-1.5 rounded-lg border border-[#DDD6C8] bg-[#FFFFFF] text-[#20242C] disabled:opacity-40"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === manuscript.chapters.length - 1}
                    onClick={() => void handleMoveChapter(idx, 1)}
                    className="p-1.5 rounded-lg border border-[#DDD6C8] bg-[#FFFFFF] text-[#20242C] disabled:opacity-40"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={manuscript.chapters.length <= 1}
                    onClick={() => void handleDeleteChapter(ch.id)}
                    className="p-1.5 rounded-lg border border-[#DDD6C8] bg-[#FFFFFF] text-[#9A3412] disabled:opacity-40"
                    title="Delete section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ENVIRONMENT 3: DESIGN & FORMAT */}
      {activeEnv === "design" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-serif font-semibold text-[#20242C]">
                Trim Size & Living Archive Typography
              </h3>
              <p className="text-xs text-[#6B7280]">
                Choose archival book proportions and serif/editorial typography presets.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                Trim Size
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AUTHOR_STUDIO_TRIM_SIZES.map((trim) => (
                  <button
                    key={trim.id}
                    type="button"
                    onClick={() => void handleUpdateDesign({ trimSize: trim.id })}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      manuscript.trimSize === trim.id
                        ? "border-[#76556F] bg-[#F7F4EE]"
                        : "border-[#E7E2DA] bg-[#FFFFFF] hover:bg-[#FBF9F5]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#20242C]">{trim.label}</span>
                      <span className="text-[11px] font-mono text-[#76556F]">{trim.dimensions}</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{trim.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                Typography Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AUTHOR_STUDIO_TYPOGRAPHY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => void handleUpdateDesign({ typographyPreset: preset.id })}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      manuscript.typographyPreset === preset.id
                        ? "border-[#76556F] bg-[#F7F4EE]"
                        : "border-[#E7E2DA] bg-[#FFFFFF] hover:bg-[#FBF9F5]"
                    }`}
                  >
                    <div
                      className="text-sm font-semibold text-[#20242C]"
                      style={{ fontFamily: preset.headingFont }}
                    >
                      {preset.label}
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-serif font-semibold text-[#20242C]">
                Front Matter & Heirloom Binding
              </h3>
              <p className="text-xs text-[#6B7280]">
                Author metadata and physical binding swatches shared with the 3D Book Theater.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#20242C] mb-1">Author Name</label>
                <input
                  type="text"
                  value={manuscript.authorName}
                  onChange={(e) => setManuscript({ ...manuscript, authorName: e.target.value })}
                  onBlur={() => void handleUpdateDesign({ authorName: manuscript.authorName })}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#20242C] mb-1">Dedication</label>
                <textarea
                  rows={2}
                  value={manuscript.dedication}
                  onChange={(e) => setManuscript({ ...manuscript, dedication: e.target.value })}
                  onBlur={() => void handleUpdateDesign({ dedication: manuscript.dedication })}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#20242C] mb-1">Epigraph</label>
                <textarea
                  rows={2}
                  value={manuscript.epigraph}
                  onChange={(e) => setManuscript({ ...manuscript, epigraph: e.target.value })}
                  onBlur={() => void handleUpdateDesign({ epigraph: manuscript.epigraph })}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#E7E2DA]">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#76556F] mb-2">
                  Cloth / Leather Cover Swatch
                </span>
                <div className="flex flex-wrap gap-2">
                  {BOOK_LEATHER_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      onClick={() => {
                        setSelectedLeatherId(swatch.id);
                        const nextMeta = { ...manuscript.metadata, coverColor: swatch.hex, leatherId: swatch.id };
                        setManuscript({ ...manuscript, metadata: nextMeta });
                        if (!isGuest) {
                          void updateBookManuscript(activeBook.id, { metadata: nextMeta });
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                        selectedLeatherId === swatch.id
                          ? "border-[#76556F] bg-[#F7F4EE] font-semibold"
                          : "border-[#E7E2DA] bg-[#FFFFFF]"
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      {swatch.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#76556F] mb-2">
                  Foil Stamping
                </span>
                <div className="flex flex-wrap gap-2">
                  {BOOK_FOIL_SWATCHES.map((foil) => (
                    <button
                      key={foil.id}
                      type="button"
                      onClick={() => {
                        setSelectedFoilId(foil.id);
                        const nextMeta = { ...manuscript.metadata, foilId: foil.id };
                        setManuscript({ ...manuscript, metadata: nextMeta });
                        if (!isGuest) {
                          void updateBookManuscript(activeBook.id, { metadata: nextMeta });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs ${
                        selectedFoilId === foil.id
                          ? "border-[#76556F] bg-[#F7F4EE] font-semibold"
                          : "border-[#E7E2DA] bg-[#FFFFFF]"
                      }`}
                    >
                      {foil.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENVIRONMENT 4: PREVIEW / BOOK THEATER */}
      {activeEnv === "preview" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] px-5 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-serif font-semibold text-[#20242C] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#76556F]" />
                Live 3D Book Theater — Manuscript Preview
              </h3>
              <p className="text-xs text-[#6B7280]">
                Rendering {theaterSpreads.length} live spread(s) directly from your {manuscript.chapters.length} manuscript chapters.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBookOpen((o) => !o)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C]"
              >
                {isBookOpen ? "Close Cover" : "Open Book"}
              </button>
              <button
                type="button"
                onClick={() => void handleSyncToBookTheater()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#76556F] text-[#FFFFFF] hover:bg-[#64465E]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Spreads to Server
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] overflow-hidden shadow-sm">
            <ClientStudioMount
              bookId={activeBook.id}
              title={activeBook.title}
              subtitle={activeBook.subtitle || manuscript.authorName}
              spineText={activeBook.spineText || activeBook.title}
              selectedLeatherId={selectedLeatherId}
              selectedFoilId={selectedFoilId}
              isOpen={isBookOpen}
              onToggleOpen={() => setIsBookOpen((o) => !o)}
              spreads={theaterSpreads}
              currentSpreadIndex={spreadIndex}
              onSpreadIndexChange={setSpreadIndex}
              hideSidebar={true}
            />
          </div>
        </div>
      )}

      {/* ENVIRONMENT 5: PUBLISH (Import / Export / Revisions) */}
      {activeEnv === "publish" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Import & Merge Card */}
          <div className="lg:col-span-6 rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-serif font-semibold text-[#20242C] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#76556F]" />
                Import / Resume / Merge Manuscript
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Import lossless <code>.memoria</code> packages, Word (<code>.docx</code>), EPUB 3, Markdown, HTML, TXT, or assisted PDF extraction. A safety checkpoint is created automatically before every import.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-[#20242C]">Merge strategy:</label>
              <select
                aria-label="Import merge strategy"
                value={mergeStrategy}
                onChange={(e) => setMergeStrategy(e.target.value as MergeStrategy)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C]"
              >
                <option value="append">Append as new chapters</option>
                <option value="merge_by_title">Merge matching chapter titles</option>
                <option value="replace">Replace current chapters</option>
              </select>
            </div>

            <label className="block border-2 border-dashed border-[#CFC7B9] rounded-xl p-6 text-center bg-[#FBF9F5] hover:border-[#76556F] transition-colors cursor-pointer">
              <FileText className="w-7 h-7 text-[#76556F] mx-auto mb-2" />
              <span className="block text-sm font-medium text-[#20242C]">
                Choose a manuscript file to import
              </span>
              <span className="block text-xs text-[#6B7280] mt-1">
                Supports .memoria, .docx, .epub, .md, .txt, .html, .pdf (up to 15 MB)
              </span>
              <input
                type="file"
                multiple
                data-testid="author-import-file-input"
                accept=".memoria,.docx,.epub,.md,.markdown,.txt,.html,.htm,.pdf"
                onChange={(e) => void handleImportFile(e)}
                className="hidden"
              />
            </label>
          </div>

          {/* Multi-Format Export Pipeline Card */}
          <div className="lg:col-span-6 rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-serif font-semibold text-[#20242C] flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#76556F]" />
                  Export & Print Pipeline
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Download standards-compliant archives with SHA-256 integrity verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C] hover:bg-[#EFEAE0]"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Proof
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EXPORT_FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  data-testid={`author-export-${fmt.id}`}
                  onClick={() => void handleExport(fmt.id)}
                  className="text-left p-3 rounded-xl border border-[#E7E2DA] bg-[#FBF9F5] hover:border-[#76556F] hover:bg-[#F7F4EE] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#20242C]">{fmt.label}</span>
                    <span className="text-[11px] font-mono text-[#76556F]">{fmt.ext}</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">{fmt.note}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Immutable Revision History */}
          <div className="lg:col-span-12 rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-serif font-semibold text-[#20242C] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#76556F]" />
                  Immutable Revision Snapshots
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Every manual checkpoint and pre-import snapshot is cryptographically hashed and restorable.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Checkpoint label…"
                  value={checkpointLabel}
                  onChange={(e) => setCheckpointLabel(e.target.value)}
                  className="text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C] w-56"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateCheckpoint()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg bg-[#76556F] text-[#FFFFFF] hover:bg-[#64465E]"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Snapshot
                </button>
              </div>
            </div>

            {revisions.length === 0 ? (
              <p className="text-xs text-[#6B7280] italic">
                No server revision checkpoints recorded yet. Save a snapshot above to create an immutable restore point.
              </p>
            ) : (
              <div className="space-y-2">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[#E7E2DA] bg-[#FBF9F5]"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#20242C]">{rev.label}</div>
                      <div className="text-[11px] text-[#6B7280]">
                        {rev.sourceType} • {rev.wordCount.toLocaleString()} words • SHA-256:{" "}
                        <span className="font-mono">{rev.checksumSha256.slice(0, 12)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRestoreRevision(rev.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#FFFFFF] text-[#20242C] hover:bg-[#EFEAE0]"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
