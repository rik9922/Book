"use client";

import type { AuthorEnvironment, BookDTO, ManuscriptDocumentDTO } from "@/lib/api";

const DB_NAME = "memoria_author_studio_v1";
const DB_VERSION = 2;
const DRAFT_STORE = "chapter_drafts";
const RESUME_STORE = "resume_checkpoints";
const SHELL_STORE = "project_shells";

export interface OfflineChapterDraft {
  key: string; // `${bookId}:${chapterId}`
  bookId: string;
  chapterId: string;
  title: string;
  contentHtml: string;
  contentJson: Record<string, unknown>;
  updatedAt: string;
  pendingSync: boolean;
}

export interface OfflineResumeCheckpoint {
  bookId: string;
  activeEnvironment: AuthorEnvironment;
  activeChapterId: string | null;
  cursorOffset: number;
  scrollOffset: number;
  updatedAt: string;
}

export interface OfflineProjectShell {
  bookId: string;
  spaceId: string;
  book: BookDTO;
  manuscript: ManuscriptDocumentDTO;
  updatedAt: string;
}

function openAuthorDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DRAFT_STORE)) {
          db.createObjectStore(DRAFT_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(RESUME_STORE)) {
          db.createObjectStore(RESUME_STORE, { keyPath: "bookId" });
        }
        if (!db.objectStoreNames.contains(SHELL_STORE)) {
          db.createObjectStore(SHELL_STORE, { keyPath: "bookId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      return resolve(null);
    }
  });
}

export async function saveOfflineChapterDraft(draft: Omit<OfflineChapterDraft, "key">): Promise<boolean> {
  const db = await openAuthorDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    const store = tx.objectStore(DRAFT_STORE);
    store.put({
      ...draft,
      key: `${draft.bookId}:${draft.chapterId}`,
    });
    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
    tx.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

export async function getOfflineChapterDraft(
  bookId: string,
  chapterId: string
): Promise<OfflineChapterDraft | null> {
  const db = await openAuthorDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(DRAFT_STORE, "readonly");
    const store = tx.objectStore(DRAFT_STORE);
    const req = store.get(`${bookId}:${chapterId}`);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as OfflineChapterDraft) ?? null);
    };
    req.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

export async function listPendingOfflineDrafts(bookId: string): Promise<OfflineChapterDraft[]> {
  const db = await openAuthorDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(DRAFT_STORE, "readonly");
    const store = tx.objectStore(DRAFT_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      const rows = (req.result as OfflineChapterDraft[]) || [];
      resolve(rows.filter((r) => r.bookId === bookId && r.pendingSync));
    };
    req.onerror = () => {
      db.close();
      resolve([]);
    };
  });
}

export async function markOfflineDraftSynced(bookId: string, chapterId: string): Promise<void> {
  const existing = await getOfflineChapterDraft(bookId, chapterId);
  if (!existing) return;
  await saveOfflineChapterDraft({
    ...existing,
    pendingSync: false,
  });
}

export async function saveOfflineResumeCheckpoint(
  checkpoint: OfflineResumeCheckpoint
): Promise<boolean> {
  const db = await openAuthorDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(RESUME_STORE, "readwrite");
    const store = tx.objectStore(RESUME_STORE);
    store.put(checkpoint);
    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
    tx.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

export async function getOfflineResumeCheckpoint(
  bookId: string
): Promise<OfflineResumeCheckpoint | null> {
  const db = await openAuthorDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(RESUME_STORE, "readonly");
    const store = tx.objectStore(RESUME_STORE);
    const req = store.get(bookId);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as OfflineResumeCheckpoint) ?? null);
    };
    req.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

export async function saveOfflineProjectShell(shell: OfflineProjectShell): Promise<boolean> {
  const db = await openAuthorDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SHELL_STORE, "readwrite");
      const store = tx.objectStore(SHELL_STORE);
      store.put(shell);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function getOfflineProjectShell(bookId: string): Promise<OfflineProjectShell | null> {
  const db = await openAuthorDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SHELL_STORE, "readonly");
      const store = tx.objectStore(SHELL_STORE);
      const req = store.get(bookId);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as OfflineProjectShell) ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function listOfflineProjectShells(): Promise<OfflineProjectShell[]> {
  const db = await openAuthorDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SHELL_STORE, "readonly");
      const store = tx.objectStore(SHELL_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const rows = (req.result as OfflineProjectShell[]) || [];
        rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(rows);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

export async function getMostRecentOfflineProjectShell(
  preferredBookId?: string
): Promise<OfflineProjectShell | null> {
  if (preferredBookId) {
    const exact = await getOfflineProjectShell(preferredBookId);
    if (exact) return exact;
  }
  const all = await listOfflineProjectShells();
  return all[0] ?? null;
}
