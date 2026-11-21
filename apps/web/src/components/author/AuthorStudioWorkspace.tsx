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
  ShieldCheck,
  Lock,
  Copy,
  Eye,
  Compass,
  Layers,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import {
  AUTHOR_STUDIO_TRIM_SIZES,
  AUTHOR_STUDIO_TYPOGRAPHY_PRESETS,
} from "@memory-capsule/contracts/author-studio";
import {
  BOOK_CAMERA_PRESETS,
  BOOK_FOIL_SWATCHES,
  BOOK_LEATHER_SWATCHES,
  resolveFoilSwatch,
  resolveLeatherSwatch,
  type BookCameraPresetId,
  type BookFoilSwatchId,
  type BookLeatherSwatchId,
  type BookSpreadPreview,
} from "@memory-capsule/contracts/book-3d";
import {
  apiRequest,
  cloneNextBookEdition,
  createBook,
  createManuscriptChapter,
  createManuscriptRevision,
  createSpace,
  curateBookMemories,
  deleteManuscriptChapter,
  downloadManuscriptExport,
  fetchBooks,
  fetchSpaces,
  getBookEditions,
  getBookManuscript,
  getBookProof,
  getStoredSession,
  importManuscriptFile,
  listManuscriptRevisions,
  openAuthModal,
  reorderBookSpreads,
  reorderManuscriptChapters,
  restoreManuscriptRevision,
  saveManuscriptResumeState,
  subscribeAuthChange,
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
  type MemoryDTO,
  type MemorySpaceDTO,
  type MergeStrategy,
  type PreflightReportDTO,
  type TrimSize,
  type TypographyPreset,
} from "@/lib/api";
import {
  mapBookSpreadsToTheaterPreview,
  mergeSpreadPageElementsNonLossy,
  type RawSpreadElement,
} from "@/lib/author-spread-utils";
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

export const BOOK_CATEGORIES = [
  { id: "heirloom_manuscript", label: "Heirloom Manuscript", note: "Long-form memoir, biography, or family history" },
  { id: "photo_memory_book", label: "Photo-Led Memory Book", note: "Visual spreads curated from your Memory Archive" },
  { id: "family_chronicle", label: "Family Chronicle", note: "Chronological essays, milestones & photographs" },
  { id: "letters_poetry", label: "Letters, Recipes & Poetry", note: "Anthology of correspondence and heirloom notes" },
] as const;

export function AuthorStudioWorkspace({
  initialBookId,
  initialSpaceId,
  initialEnvironment,
}: {
  initialBookId?: string;
  initialSpaceId?: string;
  initialEnvironment?: AuthorEnvironment;
}) {
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState<MemorySpaceDTO[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string>("");
  const [books, setBooks] = useState<BookDTO[]>([]);
  const [activeBook, setActiveBook] = useState<BookDTO | null>(null);
  const [manuscript, setManuscript] = useState<ManuscriptDocumentDTO | null>(null);
  const [revisions, setRevisions] = useState<BookRevisionDTO[]>([]);
  const [activeEnv, setActiveEnv] = useState<AuthorEnvironment>(initialEnvironment || "write");
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [resumeCursorOffset, setResumeCursorOffset] = useState<number>(0);

  // Save & sync status
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline_saved" | "error">("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("append");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterType, setNewChapterType] = useState<ChapterSectionType>("chapter");
  const [checkpointLabel, setCheckpointLabel] = useState("");

  // New Book creation drawer state
  const [showNewBookForm, setShowNewBookForm] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookSubtitle, setNewBookSubtitle] = useState("");
  const [newBookCategory, setNewBookCategory] = useState<string>("heirloom_manuscript");
  const [newBookFormat, setNewBookFormat] = useState<BookDTO["format"]>("hardcover_standard_8x10");

  // Cover designer state (persisted to PATCH /books/:id)
  const [coverTitleInput, setCoverTitleInput] = useState("");
  const [coverSubtitleInput, setCoverSubtitleInput] = useState("");
  const [spineTextInput, setSpineTextInput] = useState("");
  const [bookFormatInput, setBookFormatInput] = useState<BookDTO["format"]>("hardcover_standard_8x10");

  // 3D Book Theater & Spread Composer state
  const [isBookOpen, setIsBookOpen] = useState(true);
  const [is2DMode, setIs2DMode] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<BookCameraPresetId>("hero");
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [selectedLeatherId, setSelectedLeatherId] = useState<BookLeatherSwatchId>("plum");
  const [selectedFoilId, setSelectedFoilId] = useState<BookFoilSwatchId>("gold");
  const [studioSyncNonce, setStudioSyncNonce] = useState(0);
  const [spreadHeadingInput, setSpreadHeadingInput] = useState("");
  const [spreadCaptionInput, setSpreadCaptionInput] = useState("");
  const [templateLayout, setTemplateLayout] = useState<
    "editorial_classic" | "photo_journal" | "fine_art_spread"
  >("editorial_classic");
  const [focalPreset, setFocalPreset] = useState<"50% 50%" | "50% 20%" | "50% 80%">("50% 50%");

  // Memory Archive curation state (in Structure environment)
  const [spaceMemories, setSpaceMemories] = useState<MemoryDTO[]>([]);
  const [spaceProfiles, setSpaceProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [sourceProfileId, setSourceProfileId] = useState<string>("");
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);

  // Print Preflight, 2D Proof & Editions state (in Publish environment)
  const [preflight, setPreflight] = useState<PreflightReportDTO | null>(null);
  const [proofView, setProofView] = useState<{
    pageCount: number;
    bleedMm: number;
    safeMarginMm: number;
  } | null>(null);
  const [editions, setEditions] = useState<
    Array<{
      editionNumber: number;
      status: string;
      editionHash: string | null;
      spreadCount: number;
      updatedAt: string;
    }>
  >([]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncCoverFieldsFromBook = useCallback((book: BookDTO) => {
    const resolvedTitle = book.coverTitle || book.title || "My Heirloom Book";
    setCoverTitleInput(resolvedTitle);
    setCoverSubtitleInput(book.subtitle || "");
    setSpineTextInput(book.spineText || resolvedTitle);
    setBookFormatInput(book.format || "hardcover_standard_8x10");
    setSelectedLeatherId(resolveLeatherSwatch(book.coverColor).id);
    setSelectedFoilId(resolveFoilSwatch(book.foilStamping).id);
  }, []);

  const loadSpaceArchiveAssets = useCallback(async (targetSpaceId: string) => {
    if (!targetSpaceId) return;
    const [memRes, profRes] = await Promise.allSettled([
      apiRequest<{ items?: MemoryDTO[] } | MemoryDTO[]>(`/spaces/${targetSpaceId}/memories?limit=50`),
      apiRequest<
        { profiles?: Array<{ id: string; name: string }>; items?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>
      >(`/spaces/${targetSpaceId}/profiles`),
    ]);
    if (memRes.status === "fulfilled") {
      const val = memRes.value;
      setSpaceMemories(Array.isArray(val) ? val : val.items || []);
    }
    if (profRes.status === "fulfilled") {
      const val = profRes.value;
      setSpaceProfiles(Array.isArray(val) ? val : val.profiles || val.items || []);
    }
  }, []);

  const loadBookManuscript = useCallback(
    async (bookId: string, overrideEnv?: AuthorEnvironment) => {
      setLoading(true);
      setErrorMessage(null);
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
        syncCoverFieldsFromBook(book);

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
        const resumeEnv =
          overrideEnv || editorState?.activeEnvironment || offlineResume?.activeEnvironment || "write";
        const resumeCh =
          editorState?.activeChapterId ||
          offlineResume?.activeChapterId ||
          currentMs.chapters[0]?.id ||
          null;
        setActiveEnv(resumeEnv);
        setActiveChapterId(resumeCh);
        setResumeCursorOffset(editorState?.cursorOffset ?? offlineResume?.cursorOffset ?? 0);
        setSpreadIndex(0);
        setPreflight(null);
        setProofView(null);

        const [revs, eds] = await Promise.all([
          listManuscriptRevisions(bookId).catch(() => []),
          getBookEditions(bookId).catch(() => []),
        ]);
        setRevisions(revs);
        setEditions(eds);
      } finally {
        setLoading(false);
      }
    },
    [syncCoverFieldsFromBook]
  );

  const loadSpaceBooks = useCallback(
    async (targetSpaceId: string, preferredBookId?: string, overrideEnv?: AuthorEnvironment) => {
      setActiveSpaceId(targetSpaceId);
      void loadSpaceArchiveAssets(targetSpaceId);
      let loadedBooks = await fetchBooks(targetSpaceId);
      if (loadedBooks.length === 0) {
        const created = await createBook(targetSpaceId, {
          title: "My Heirloom Manuscript",
          subtitle: "Created in Memoria Author Studio",
          coverTitle: "My Heirloom Manuscript",
          spineText: "MEMORIA",
        });
        loadedBooks = [created];
      }
      setBooks(loadedBooks);
      const targetId =
        (preferredBookId && loadedBooks.some((b) => b.id === preferredBookId) && preferredBookId) ||
        loadedBooks[0]?.id;
      if (targetId) {
        await loadBookManuscript(targetId, overrideEnv);
      }
    },
    [loadBookManuscript, loadSpaceArchiveAssets]
  );

  useEffect(() => {
    let cancelled = false;
    const initWorkspace = async () => {
      const session = getStoredSession();
      if (!session.user) {
        if (!cancelled) {
          const guest = createGuestManuscript();
          setIsGuest(true);
          setSpaces([]);
          setActiveSpaceId(guest.book.spaceId);
          setBooks([guest.book]);
          setActiveBook(guest.book);
          setManuscript(guest.manuscript);
          syncCoverFieldsFromBook(guest.book);
          setActiveChapterId(guest.manuscript.chapters[0]?.id ?? null);
          if (initialEnvironment) setActiveEnv(initialEnvironment);
          setLoading(false);
        }
        return;
      }

      try {
        let userSpaces = await fetchSpaces();
        if (userSpaces.length === 0) {
          const createdSpace = await createSpace({
            name: "Family Living Archive",
            type: "family",
            description: "Heirloom memory preservation space",
          }).catch(() => null);
          if (createdSpace?.id) {
            userSpaces = [createdSpace];
          }
        }
        if (cancelled) return;
        setSpaces(userSpaces);

        const primarySpace =
          (initialSpaceId && userSpaces.find((s) => s.id === initialSpaceId)) || userSpaces[0];
        if (primarySpace) {
          setIsGuest(false);
          await loadSpaceBooks(primarySpace.id, initialBookId, initialEnvironment);
        } else {
          const guest = createGuestManuscript();
          setIsGuest(true);
          setBooks([guest.book]);
          setActiveBook(guest.book);
          setManuscript(guest.manuscript);
          syncCoverFieldsFromBook(guest.book);
          setActiveChapterId(guest.manuscript.chapters[0]?.id ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          const guest = createGuestManuscript();
          setIsGuest(true);
          setBooks([guest.book]);
          setActiveBook(guest.book);
          setManuscript(guest.manuscript);
          syncCoverFieldsFromBook(guest.book);
          setActiveChapterId(guest.manuscript.chapters[0]?.id ?? null);
          setLoading(false);
        }
      }
    };

    void initWorkspace();
    const unsubscribe = subscribeAuthChange(() => {
      void initWorkspace();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [initialBookId, initialSpaceId, initialEnvironment, loadSpaceBooks, syncCoverFieldsFromBook]);

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
    const hasCustomBookSpreads =
      Array.isArray(activeBook.spreads) &&
      activeBook.spreads.length > 0 &&
      (activeBook.spreads.length > 1 ||
        activeBook.spreads.some((sp) =>
          [...(sp.leftPage?.elements || []), ...(sp.rightPage?.elements || [])].some(
            (el) => el.type === "image" || el.type === "caption"
          )
        ));
    if (hasCustomBookSpreads) {
      return mapBookSpreadsToTheaterPreview(activeBook.spreads, coverTitleInput || activeBook.title);
    }
    return build3DSpreadsFromManuscript(activeBook, manuscript);
  }, [activeBook, manuscript, coverTitleInput]);

  // Synchronize spread composer inputs when active book or spread index changes
  useEffect(() => {
    const currentSpread = activeBook?.spreads?.[spreadIndex];
    if (currentSpread) {
      const heading = currentSpread.rightPage?.elements?.find(
        (el: { type?: string; content?: string }) => el.type === "heading"
      )?.content;
      const caption = currentSpread.rightPage?.elements?.find(
        (el: { type?: string; content?: string }) => el.type === "caption" || el.type === "text"
      )?.content;
      setSpreadHeadingInput(heading || activeBook?.title || `Spread ${spreadIndex + 1}`);
      setSpreadCaptionInput(caption || "Preserved from your Memoria Living Archive.");
      if (
        currentSpread.rightPage?.layoutType === "editorial_classic" ||
        currentSpread.rightPage?.layoutType === "photo_journal" ||
        currentSpread.rightPage?.layoutType === "fine_art_spread"
      ) {
        setTemplateLayout(currentSpread.rightPage.layoutType);
      }
    } else if (theaterSpreads[spreadIndex]) {
      setSpreadHeadingInput(theaterSpreads[spreadIndex].rightHeading);
      setSpreadCaptionInput(theaterSpreads[spreadIndex].rightBody);
    }
  }, [activeBook, spreadIndex, theaterSpreads]);

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

  // --- Consolidated Book Creation, Cover Design, Memory Curation, Non-Lossy Spreads & Print Handlers ---

  const handleCreateNewBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      openAuthModal("login");
      setStatusMessage("Sign in or create an account to bind and persist custom hardcover editions.");
      return;
    }
    if (!activeSpaceId || !newBookTitle.trim()) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const swatchHex = resolveLeatherSwatch(selectedLeatherId).hex;
      const created = await createBook(activeSpaceId, {
        title: newBookTitle.trim(),
        subtitle: newBookSubtitle.trim() || undefined,
        format: newBookFormat,
        coverColor: swatchHex,
        foilStamping: selectedFoilId,
        coverTitle: newBookTitle.trim(),
        spineText: newBookTitle.trim(),
      });
      await updateBookManuscript(created.id, {
        metadata: {
          coverColor: swatchHex,
          leatherId: selectedLeatherId,
          foilId: selectedFoilId,
          bookCategory: newBookCategory,
        },
      }).catch(() => undefined);

      setBooks((prev) => [created, ...prev]);
      setNewBookTitle("");
      setNewBookSubtitle("");
      setShowNewBookForm(false);
      await loadBookManuscript(created.id, activeEnv);
      setStudioSyncNonce((n) => n + 1);
      setStatusMessage(`Created edition "${created.title}".`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create book edition.");
    }
  };

  const handleBindFirstEdition = async () => {
    if (isGuest) {
      openAuthModal("login");
      setStatusMessage("Sign in or create an account to bind your first heirloom edition.");
      return;
    }
    if (!activeSpaceId) return;
    setErrorMessage(null);
    try {
      const swatchHex = resolveLeatherSwatch(selectedLeatherId).hex;
      const created = await createBook(activeSpaceId, {
        title: coverTitleInput.trim() || "The Bennett Heritage",
        subtitle: coverSubtitleInput.trim() || "Volume I • Heirloom Edition",
        format: bookFormatInput,
        coverColor: swatchHex,
        foilStamping: selectedFoilId,
        coverTitle: coverTitleInput.trim() || "The Bennett Heritage",
        spineText: spineTextInput.trim() || coverTitleInput.trim() || "MEMORIA",
      });
      setBooks([created]);
      await loadBookManuscript(created.id, activeEnv);
      setStudioSyncNonce((n) => n + 1);
      setStatusMessage(`Bound first edition "${created.title}" in this vault.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to bind first edition.");
    }
  };

  const handleSaveCoverBinding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeBook || !manuscript) return;
    const swatch = resolveLeatherSwatch(selectedLeatherId);
    const nextMeta = {
      ...manuscript.metadata,
      coverColor: swatch.hex,
      leatherId: selectedLeatherId,
      foilId: selectedFoilId,
    };
    setManuscript({ ...manuscript, metadata: nextMeta });

    if (isGuest) {
      setActiveBook({
        ...activeBook,
        title: coverTitleInput.trim() || activeBook.title,
        coverTitle: coverTitleInput.trim() || activeBook.coverTitle,
        subtitle: coverSubtitleInput.trim() || undefined,
        spineText: spineTextInput.trim() || coverTitleInput.trim(),
        coverColor: swatch.hex,
        foilStamping: selectedFoilId,
        format: bookFormatInput,
      });
      setStudioSyncNonce((n) => n + 1);
      setStatusMessage("Updated local cover & binding preview.");
      return;
    }

    setErrorMessage(null);
    try {
      const updated = await apiRequest<{ book?: BookDTO } | BookDTO>(`/books/${activeBook.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          coverTitle: coverTitleInput.trim() || activeBook.title,
          subtitle: coverSubtitleInput.trim() || undefined,
          spineText: spineTextInput.trim() || coverTitleInput.trim() || activeBook.title,
          coverColor: swatch.hex,
          foilStamping: selectedFoilId,
          format: bookFormatInput,
        }),
      });
      const book = "book" in updated && updated.book ? updated.book : (updated as BookDTO);
      await updateBookManuscript(book.id, { metadata: nextMeta }).catch(() => undefined);
      setActiveBook(book);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
      setStudioSyncNonce((n) => n + 1);
      setStatusMessage("Saved heirloom cover & binding customization.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save cover changes.");
    }
  };

  const handleCurateMemoriesIntoBook = async () => {
    if (!activeBook || selectedMemoryIds.length === 0) return;
    if (isGuest) {
      openAuthModal("login");
      setStatusMessage("Sign in to curate Memory Archive entries into book spreads.");
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const chosen = spaceMemories.filter((m) => selectedMemoryIds.includes(m.id));
      const updated = await curateBookMemories(
        activeBook.id,
        chosen.map((m) => ({
          id: m.id,
          title: m.title,
          content: m.content,
          capturedAt: m.capturedAt,
        })),
        templateLayout
      );
      setActiveBook(updated);
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSelectedMemoryIds([]);
      setStudioSyncNonce((n) => n + 1);
      setStatusMessage(`Compiled ${chosen.length} curated memories into chronological book spreads.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to curate memories.");
    }
  };

  const handleSaveSpreadNonLossy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook) return;
    if (isGuest) {
      openAuthModal("login");
      setStatusMessage("Sign in to save interior spread layouts.");
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);

    const existingSpread = activeBook.spreads?.[spreadIndex] || activeBook.spreads?.[0];
    const spreadId = existingSpread?.id || crypto.randomUUID();
    const rightPageId = existingSpread?.rightPage?.id || crypto.randomUUID();

    // Non-lossy merge: preserves all existing images, shapes, extra text elements, and crops!
    const mergedElements = mergeSpreadPageElementsNonLossy(
      existingSpread?.rightPage?.elements as RawSpreadElement[] | undefined,
      {
        heading: spreadHeadingInput,
        caption: spreadCaptionInput,
        focalPoint: focalPreset,
      }
    );

    const resolvedPageLayout =
      templateLayout === "fine_art_spread"
        ? "full_bleed_single"
        : templateLayout === "photo_journal"
          ? "photo_with_story"
          : "editorial_chapter_title";

    try {
      const updatedSpread = await apiRequest<BookDTO["spreads"][number]>(
        `/books/${activeBook.id}/spreads/${spreadId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            spreadIndex: existingSpread?.spreadIndex ?? spreadIndex,
            leftPage: existingSpread?.leftPage ?? null,
            rightPage: {
              id: rightPageId,
              pageNumber: existingSpread?.rightPage?.pageNumber ?? spreadIndex * 2 + 2,
              layoutType: resolvedPageLayout,
              backgroundColor: existingSpread?.rightPage?.backgroundColor || "#F7F4EE",
              elements: mergedElements,
            },
          }),
        }
      );

      const spreadsCopy = [...(activeBook.spreads || [])];
      const existingIdx = spreadsCopy.findIndex((s) => s.id === spreadId);
      if (existingIdx >= 0) {
        spreadsCopy[existingIdx] = updatedSpread;
      } else {
        spreadsCopy[spreadIndex] = updatedSpread;
      }
      const nextBook: BookDTO = { ...activeBook, spreads: spreadsCopy };
      setActiveBook(nextBook);
      setBooks((prev) => prev.map((b) => (b.id === nextBook.id ? nextBook : b)));
      setStudioSyncNonce((n) => n + 1);
      setStatusMessage("Updated interior spread layout.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update spread.");
    }
  };

  const handleMoveSpread = async (idx: number, dir: -1 | 1) => {
    if (!activeBook || isGuest) return;
    const spreads = [...(activeBook.spreads || [])];
    const target = idx + dir;
    if (target < 0 || target >= spreads.length) return;
    const [item] = spreads.splice(idx, 1);
    spreads.splice(target, 0, item);
    try {
      const updated = await reorderBookSpreads(
        activeBook.id,
        spreads.map((s) => s.id)
      );
      setActiveBook(updated);
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSpreadIndex(target);
      setStudioSyncNonce((n) => n + 1);
      setStatusMessage("Reordered book spreads.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to reorder spreads.");
    }
  };

  const handleRunPreflight = async () => {
    if (!activeBook || isGuest) {
      openAuthModal("login");
      return;
    }
    setErrorMessage(null);
    try {
      const report = await apiRequest<PreflightReportDTO>(`/books/${activeBook.id}/preflight`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setPreflight(report);
      setStatusMessage(
        report.passed
          ? "Print preflight passed all cover, margin, spread, and image checks."
          : "Preflight flagged items to review before freezing."
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to run preflight check.");
    }
  };

  const handleLoadProof = async () => {
    if (!activeBook || isGuest) {
      openAuthModal("login");
      return;
    }
    setErrorMessage(null);
    try {
      const p = await getBookProof(activeBook.id);
      setProofView({ pageCount: p.pageCount, bleedMm: p.bleedMm, safeMarginMm: p.safeMarginMm });
      setPreflight(p.preflight);
      setStatusMessage(`2D Full Book Proof ready (${p.pageCount} pages, ${p.bleedMm}mm bleed).`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to load 2D proof.");
    }
  };

  const handleFreezeEdition = async () => {
    if (!activeBook || isGuest) {
      openAuthModal("login");
      return;
    }
    setErrorMessage(null);
    try {
      const frozen = await apiRequest<{ book?: BookDTO } | BookDTO>(
        `/books/${activeBook.id}/freeze`,
        { method: "POST", body: JSON.stringify({}) }
      );
      const book = "book" in frozen && frozen.book ? frozen.book : (frozen as BookDTO);
      setActiveBook(book);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
      const eds = await getBookEditions(book.id).catch(() => editions);
      setEditions(eds);
      setStatusMessage("Edition frozen cleanly for heirloom press production.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to freeze edition.");
    }
  };

  const handleCloneEdition = async () => {
    if (!activeBook || isGuest) {
      openAuthModal("login");
      return;
    }
    setErrorMessage(null);
    try {
      const cloned = await cloneNextBookEdition(activeBook.id);
      setBooks((prev) => [cloned, ...prev]);
      await loadBookManuscript(cloned.id, activeEnv);
      setStudioSyncNonce((n) => n + 1);
      setStatusMessage(`Created "${cloned.title}" as editable next edition.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to clone edition.");
    }
  };

  const filteredArchiveMemories = useMemo(() => {
    if (!sourceProfileId) return spaceMemories;
    return spaceMemories.filter(
      (m) =>
        (m as unknown as { profileId?: string }).profileId === sourceProfileId ||
        m.tags?.includes(sourceProfileId)
    );
  }, [spaceMemories, sourceProfileId]);

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
      {/* Guest Sandbox Mode Notification Bar */}
      {isGuest && (
        <div className="bg-[#FAF7F2] rounded-2xl border border-[#E7E2DA] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F4EEF3] flex items-center justify-center text-[#76556F] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#20242C]">Guest Author Sandbox Mode</p>
              <p className="text-[11px] text-[#5C5955]">
                Explore writing, binding customization, and 3D Book Theater freely — or sign in to save manuscripts, curate Memory Archive books, and order archival prints.
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
              3D Sample Reader
            </Link>
          </div>
        </div>
      )}

      {/* Top Author Studio Control Bar */}
      <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] px-5 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#76556F]">
                Memoria Author Studio
              </span>
              {spaces.length > 1 && (
                <select
                  aria-label="Select archive space"
                  value={activeSpaceId}
                  onChange={(e) => void loadSpaceBooks(e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-[#F7F4EE] border border-[#DDD6C8] text-[#20242C]"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {activeBook.isFrozenForPrint && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#EEF2ED] border border-[#B6DBC7] text-[#22593E] font-medium">
                  <Lock className="w-3 h-3" />
                  Frozen for Print
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
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
                • {manuscript.chapters.length} sections • {manuscript.totalWordCount.toLocaleString()} words •{" "}
                {activeBook.spreads?.length || theaterSpreads.length} spreads
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

        {/* Persistence & New Book CTA */}
        <div className="flex items-center gap-2.5">
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
          <button
            type="button"
            data-testid="author-new-book-toggle"
            onClick={() => setShowNewBookForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#76556F] text-[#FFFFFF] hover:bg-[#64465E]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Book
          </button>
        </div>
      </div>

      {/* Inline New Book Creation Drawer (Supports Manuscripts & Photo-Led Memory Books) */}
      {showNewBookForm && (
        <form
          onSubmit={(e) => void handleCreateNewBook(e)}
          className="rounded-2xl border border-[#76556F]/30 bg-[#FFFFFF] p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-4">
            <label htmlFor="new-book-title" className="block text-xs font-semibold text-[#20242C] mb-1">
              New Book Title
            </label>
            <input
              id="new-book-title"
              type="text"
              required
              placeholder="e.g., Vance Family Almanac"
              value={newBookTitle}
              onChange={(e) => setNewBookTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
            />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="new-book-category" className="block text-xs font-semibold text-[#20242C] mb-1">
              Book Category
            </label>
            <select
              id="new-book-category"
              value={newBookCategory}
              onChange={(e) => setNewBookCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
            >
              {BOOK_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="new-book-format" className="block text-xs font-semibold text-[#20242C] mb-1">
              Hardcover Format
            </label>
            <select
              id="new-book-format"
              value={newBookFormat}
              onChange={(e) => setNewBookFormat(e.target.value as BookDTO["format"])}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
            >
              <option value="hardcover_standard_8x10">8×10&quot; Archive</option>
              <option value="hardcover_square_8x8">8×8&quot; Square</option>
              <option value="hardcover_grand_12x12">12×12&quot; Grand</option>
            </select>
          </div>
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 text-xs font-semibold px-3.5 py-2 rounded-lg bg-[#76556F] text-white hover:bg-[#64465E]"
            >
              Create Hardcover Edition
            </button>
            <button
              type="button"
              onClick={() => setShowNewBookForm(false)}
              className="text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {books.length === 0 && !isGuest && (
        <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-base font-semibold text-[#20242C]">
              Ready to bind your first heirloom edition?
            </h3>
            <p className="text-xs text-[#6B7280]">
              Start a manuscript or photo-led memory book in this vault space with one click.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleBindFirstEdition()}
            className="px-4 py-2 rounded-xl bg-[#76556F] text-white text-xs font-semibold hover:bg-[#64465E]"
          >
            Bind First Edition from Vault
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-[#F5C6C6] bg-[#FDF2F2] px-4 py-2.5 text-xs text-[#9A3412] flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#9A3412] font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

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

          {/* Memory Archive Curation — Add from Memory Archive */}
          <section className="pt-5 border-t border-[#E7E2DA] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-serif font-semibold text-[#20242C] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#76556F]" />
                  Memory Curation — Add from Memory Archive
                </h4>
                <p className="text-xs text-[#6B7280]">
                  Select photographs and stories from your Memory Archive to compile chronological visual spreads inside this book.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="curate-profile"
                  aria-label="Filter memories by profile"
                  value={sourceProfileId}
                  onChange={(e) => setSourceProfileId(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C]"
                >
                  <option value="">All Archive Profiles</option>
                  {spaceProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  id="curate-template"
                  aria-label="Spread layout template"
                  value={templateLayout}
                  onChange={(e) => setTemplateLayout(e.target.value as typeof templateLayout)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C]"
                >
                  <option value="editorial_classic">Editorial Classic</option>
                  <option value="photo_journal">Photo Journal</option>
                  <option value="fine_art_spread">Fine Art Spread</option>
                </select>
                <button
                  type="button"
                  disabled={selectedMemoryIds.length === 0 || activeBook.isFrozenForPrint}
                  onClick={() => void handleCurateMemoriesIntoBook()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-[#20242C] text-white hover:bg-[#343A46] disabled:opacity-40"
                >
                  Auto-Compile Selected ({selectedMemoryIds.length})
                </button>
              </div>
            </div>

            {filteredArchiveMemories.length === 0 ? (
              <p className="text-xs text-[#6B7280] italic">
                No memories found in this archive space yet. Preserve memories in{" "}
                <Link href="/archive" className="text-[#76556F] underline">
                  Living Archive
                </Link>{" "}
                to curate photo-led spreads here.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {filteredArchiveMemories.map((mem) => {
                  const checked = selectedMemoryIds.includes(mem.id);
                  return (
                    <label
                      key={mem.id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                        checked
                          ? "border-[#76556F] bg-[#F4EEF3]"
                          : "border-[#E7E2DA] bg-[#FBF9F5] hover:bg-[#F7F4EE]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMemoryIds((prev) => [...prev, mem.id]);
                          } else {
                            setSelectedMemoryIds((prev) => prev.filter((id) => id !== mem.id));
                          }
                        }}
                        className="mt-0.5 accent-[#76556F]"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#20242C] truncate">{mem.title}</p>
                        <p className="text-[11px] text-[#6B7280] line-clamp-2 mt-0.5">
                          {mem.content || "Archival memory entry"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ENVIRONMENT 3: DESIGN & FORMAT */}
      {activeEnv === "design" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-serif font-semibold text-[#20242C]">
                Trim Size &amp; Living Archive Typography
              </h3>
              <p className="text-xs text-[#6B7280]">
                Choose your book category (including Photo-Led Memory Books), archival trim proportions, and editorial typography.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#76556F]">
                Book Category / Genre
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BOOK_CATEGORIES.map((cat) => {
                  const activeCat = (manuscript.metadata?.bookCategory as string) || "heirloom_manuscript";
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        const nextMeta = { ...manuscript.metadata, bookCategory: cat.id };
                        setManuscript({ ...manuscript, metadata: nextMeta });
                        if (!isGuest) {
                          void updateBookManuscript(activeBook.id, { metadata: nextMeta });
                        }
                        setStatusMessage(`Book category set to "${cat.label}".`);
                      }}
                      className={`text-left p-3 rounded-xl border transition-colors ${
                        activeCat === cat.id
                          ? "border-[#76556F] bg-[#F7F4EE]"
                          : "border-[#E7E2DA] bg-[#FFFFFF] hover:bg-[#FBF9F5]"
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#20242C]">{cat.label}</div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{cat.note}</p>
                    </button>
                  );
                })}
              </div>
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

          <form
            onSubmit={(e) => void handleSaveCoverBinding(e)}
            className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-5"
          >
            <div>
              <h3 className="text-lg font-serif font-semibold text-[#20242C]">
                Cover Designer, Spine &amp; Heirloom Binding
              </h3>
              <p className="text-xs text-[#6B7280]">
                Customize cover title, spine inscription, hardcover format, cloth/leather swatch, foil stamping, and front matter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cover-title-input" className="block text-xs font-medium text-[#20242C] mb-1">
                  Cover Title
                </label>
                <input
                  id="cover-title-input"
                  type="text"
                  value={coverTitleInput}
                  onChange={(e) => setCoverTitleInput(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                />
              </div>
              <div>
                <label htmlFor="cover-spine-input" className="block text-xs font-medium text-[#20242C] mb-1">
                  Spine Inscription
                </label>
                <input
                  id="cover-spine-input"
                  type="text"
                  value={spineTextInput}
                  onChange={(e) => setSpineTextInput(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                />
              </div>
              <div>
                <label htmlFor="cover-subtitle-input" className="block text-xs font-medium text-[#20242C] mb-1">
                  Cover Subtitle
                </label>
                <input
                  id="cover-subtitle-input"
                  type="text"
                  value={coverSubtitleInput}
                  onChange={(e) => setCoverSubtitleInput(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                />
              </div>
              <div>
                <label htmlFor="cover-format-select" className="block text-xs font-medium text-[#20242C] mb-1">
                  Hardcover Print Format
                </label>
                <select
                  id="cover-format-select"
                  value={bookFormatInput}
                  onChange={(e) => setBookFormatInput(e.target.value as BookDTO["format"])}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                >
                  <option value="hardcover_square_8x8">Square Heirloom 8×8&quot;</option>
                  <option value="hardcover_standard_8x10">Standard Archive 8×10&quot;</option>
                  <option value="hardcover_grand_12x12">Grand Estate 12×12&quot;</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#E7E2DA]">
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

              <button
                type="submit"
                disabled={activeBook.isFrozenForPrint}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#76556F] hover:bg-[#64465E] text-white text-xs font-semibold disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save Cover &amp; Binding
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ENVIRONMENT 4: PREVIEW / BOOK THEATER & SPREAD COMPOSER */}
      {activeEnv === "preview" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] px-5 py-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-serif font-semibold text-[#20242C] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#76556F]" />
                Live 3D Book Theater — Manuscript Preview
              </h3>
              <p className="text-xs text-[#6B7280]">
                Rendering {theaterSpreads.length} live spread(s) from your book with interactive page turns and non-lossy spread editing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-[#F7F4EE] p-1 rounded-lg border border-[#E7E2DA]">
                <Compass className="w-3.5 h-3.5 text-[#76556F] ml-1" />
                {BOOK_CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCameraPreset(preset.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      cameraPreset === preset.id
                        ? "bg-[#20242C] text-white"
                        : "text-[#5C5955] hover:bg-[#EFEAE0]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIs2DMode((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C]"
              >
                <Eye className="w-3.5 h-3.5" />
                {is2DMode ? "3D Theater" : "2D Proof"}
              </button>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Expansive 7-Column 3D Book Theater Canvas */}
            <div className="lg:col-span-7 rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] overflow-hidden shadow-sm">
              <ClientStudioMount
                bookId={activeBook.id}
                refreshKey={studioSyncNonce}
                title={coverTitleInput || activeBook.title}
                subtitle={coverSubtitleInput || activeBook.subtitle || manuscript.authorName}
                spineText={spineTextInput || activeBook.spineText || activeBook.title}
                selectedLeatherId={selectedLeatherId}
                selectedFoilId={selectedFoilId}
                isOpen={isBookOpen}
                onToggleOpen={() => setIsBookOpen((o) => !o)}
                is2DMode={is2DMode}
                onToggle2DMode={setIs2DMode}
                cameraPreset={cameraPreset}
                onCameraPresetChange={setCameraPreset}
                spreads={theaterSpreads}
                currentSpreadIndex={spreadIndex}
                onSpreadIndexChange={setSpreadIndex}
                hideSidebar={true}
                hideHud={true}
              />
              <div className="px-4 py-3 border-t border-[#E7E2DA] bg-[#FAF8F4] flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={spreadIndex <= 0}
                  onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DDD6C8] bg-white text-[#20242C] disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev Spread
                </button>
                <span className="font-medium text-[#20242C]">
                  Spread {spreadIndex + 1} of {Math.max(1, theaterSpreads.length)}
                </span>
                <button
                  type="button"
                  disabled={spreadIndex >= theaterSpreads.length - 1}
                  onClick={() => setSpreadIndex((i) => Math.min(theaterSpreads.length - 1, i + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DDD6C8] bg-white text-[#20242C] disabled:opacity-40"
                >
                  Next Spread
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 5-Column Non-Lossy Spread Composition & Focal-Point Inspector */}
            <aside className="lg:col-span-5 rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-base font-serif font-semibold text-[#20242C]">
                  Spread Composition &amp; Focal Point
                </h4>
                <p className="text-xs text-[#6B7280]">
                  Edit the active spread heading, caption, template, and focal point while preserving all placed photographs and elements.
                </p>
              </div>

              <form onSubmit={(e) => void handleSaveSpreadNonLossy(e)} className="space-y-3">
                <div>
                  <label htmlFor="spread-heading" className="block text-xs font-medium text-[#20242C] mb-1">
                    Spread Heading
                  </label>
                  <input
                    id="spread-heading"
                    type="text"
                    value={spreadHeadingInput}
                    onChange={(e) => setSpreadHeadingInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                  />
                </div>
                <div>
                  <label htmlFor="spread-caption" className="block text-xs font-medium text-[#20242C] mb-1">
                    Spread Story / Caption
                  </label>
                  <textarea
                    id="spread-caption"
                    rows={3}
                    value={spreadCaptionInput}
                    onChange={(e) => setSpreadCaptionInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="spread-layout" className="block text-xs font-medium text-[#20242C] mb-1">
                      Layout Template
                    </label>
                    <select
                      id="spread-layout"
                      value={templateLayout}
                      onChange={(e) => setTemplateLayout(e.target.value as typeof templateLayout)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                    >
                      <option value="editorial_classic">Editorial Classic</option>
                      <option value="photo_journal">Photo Journal</option>
                      <option value="fine_art_spread">Fine Art Spread</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="spread-focal" className="block text-xs font-medium text-[#20242C] mb-1">
                      Image Focal Point
                    </label>
                    <select
                      id="spread-focal"
                      value={focalPreset}
                      onChange={(e) => setFocalPreset(e.target.value as typeof focalPreset)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#DDD6C8] bg-[#FBF9F5] text-[#20242C]"
                    >
                      <option value="50% 50%">Center (50% 50%)</option>
                      <option value="50% 20%">Upper Portrait (50% 20%)</option>
                      <option value="50% 80%">Lower Horizon (50% 80%)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={activeBook.isFrozenForPrint}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#76556F] text-white hover:bg-[#64465E] disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  Update Spread
                </button>
              </form>

              {activeBook.spreads && activeBook.spreads.length > 1 && (
                <div className="pt-3 border-t border-[#E7E2DA] space-y-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#76556F]">
                    Reorder Persisted Spreads
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {activeBook.spreads.map((sp, idx) => (
                      <div
                        key={sp.id}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs ${
                          idx === spreadIndex
                            ? "border-[#76556F] bg-[#F4EEF3]"
                            : "border-[#E7E2DA] bg-[#FBF9F5]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSpreadIndex(idx)}
                          className="text-left font-medium text-[#20242C] truncate"
                        >
                          Spread {idx + 1}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0 || activeBook.isFrozenForPrint}
                            onClick={() => void handleMoveSpread(idx, -1)}
                            className="p-1 rounded border border-[#DDD6C8] bg-white disabled:opacity-40"
                            title="Move spread up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeBook.spreads.length - 1 || activeBook.isFrozenForPrint}
                            onClick={() => void handleMoveSpread(idx, 1)}
                            className="p-1 rounded border border-[#DDD6C8] bg-white disabled:opacity-40"
                            title="Move spread down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* ENVIRONMENT 5: PUBLISH (Preflight / Freeze / Import / Export / Revisions) */}
      {activeEnv === "publish" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Print Preflight, Freeze & Archival Print Production Card */}
          <div className="lg:col-span-12 rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-serif font-semibold text-[#20242C] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#5F735E]" />
                  Print Preflight, Edition Freeze &amp; Archival Press
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Validate real spread geometry, cover die bounds, and image assets before freezing an immutable print edition.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleRunPreflight()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C] hover:bg-[#EFEAE0]"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5F735E]" />
                  Run Preflight
                </button>
                <button
                  type="button"
                  onClick={() => void handleLoadProof()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg border border-[#DDD6C8] bg-[#F7F4EE] text-[#20242C] hover:bg-[#EFEAE0]"
                >
                  <Eye className="w-3.5 h-3.5 text-[#76556F]" />
                  2D Proof Summary
                </button>
                {!activeBook.isFrozenForPrint ? (
                  <button
                    type="button"
                    onClick={() => void handleFreezeEdition()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-[#20242C] text-white hover:bg-[#343A46]"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Freeze for Print
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleCloneEdition()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-[#76556F] text-white hover:bg-[#64465E]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Clone Next Edition
                  </button>
                )}
                <Link
                  href="/billing"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-[#EEF2ED] border border-[#B6DBC7] text-[#22593E] hover:bg-[#E1EAE0]"
                >
                  <Package className="w-3.5 h-3.5" />
                  Order Printed Copy
                </Link>
              </div>
            </div>

            {proofView && (
              <div className="rounded-xl bg-[#F7F4EE] border border-[#E7E2DA] px-4 py-2.5 text-xs text-[#20242C] flex flex-wrap gap-4">
                <span>
                  <strong>Pages:</strong> {proofView.pageCount}
                </span>
                <span>
                  <strong>Trim Bleed:</strong> {proofView.bleedMm}mm
                </span>
                <span>
                  <strong>Safe Margin:</strong> {proofView.safeMarginMm}mm
                </span>
              </div>
            )}

            {preflight && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {preflight.checks.map((chk) => (
                  <div
                    key={chk.id}
                    className={`p-3 rounded-xl border text-xs ${
                      chk.passed
                        ? "border-[#B6DBC7] bg-[#F4F9F5] text-[#20242C]"
                        : "border-[#F5C6C6] bg-[#FDF2F2] text-[#9A3412]"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {chk.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22593E]" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#9A3412]" />
                      )}
                      {chk.label}
                    </div>
                    <p className="text-[11px] opacity-85 mt-0.5">{chk.detail}</p>
                  </div>
                ))}
              </div>
            )}

            {editions.length > 0 && (
              <div className="pt-2 border-t border-[#E7E2DA] flex flex-wrap items-center gap-2 text-[11px] text-[#5C5955]">
                <span className="font-semibold text-[#20242C]">Editions:</span>
                {editions.map((ed) => (
                  <span
                    key={ed.editionNumber}
                    className="px-2.5 py-1 rounded-full bg-[#F7F4EE] border border-[#E7E2DA]"
                  >
                    Ed. {ed.editionNumber} • {ed.status} • {ed.spreadCount} spreads
                    {ed.editionHash ? ` • ${ed.editionHash.slice(0, 8)}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

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
