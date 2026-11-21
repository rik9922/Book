"use client";

import type { AuthorEnvironment } from "@/lib/api";

const DB_NAME = "memoria_author_studio_v1";
const DB_VERSION = 1;
const DRAFT_STORE = "chapter_drafts";
const RESUME_STORE = "resume_checkpoints";

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
