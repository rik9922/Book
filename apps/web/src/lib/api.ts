"use client";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1";

const TOKEN_STORAGE_KEY = "memoria_web_access_token";
const REFRESH_STORAGE_KEY = "memoria_web_refresh_token";
const USER_STORAGE_KEY = "memoria_web_user";
const OFFLINE_QUEUE_KEY = "memoria_web_offline_queue";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface MemorySpaceDTO {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  type: "personal" | "family" | "event" | "journey";
  createdAt: string;
  updatedAt: string;
}

export interface SpaceProfileDTO {
  id: string;
  spaceId: string;
  name: string;
  relationship?: string;
  type: "child" | "parent" | "pet" | "individual" | "couple";
  birthDate?: string;
}

export interface MemoryDTO {
  id: string;
  spaceId: string;
  authorId: string;
  title: string;
  content?: string;
  format: "image" | "video" | "audio" | "story" | "document" | "mixed";
  capturedAt: string;
  location?: string;
  isFavorite: boolean;
  associatedProfileIds: string[];
  mediaIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BookDTO {
  id: string;
  spaceId: string;
  title: string;
  subtitle?: string;
  format: "hardcover_square_8x8" | "hardcover_standard_8x10" | "hardcover_grand_12x12";
  coverColor: string;
  foilStamping: "gold" | "rose" | "silver" | "blind_emboss" | "none";
  coverTitle: string;
  spineText?: string;
  version: number;
  isFrozenForPrint: boolean;
  frozenEditionHash?: string;
  spreads: any[];
  createdAt: string;
  updatedAt: string;
}

export interface PrintOrderDTO {
  id: string;
  spaceId: string;
  userId: string;
  bookId: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  spaceId?: string | null;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface OfflineMutationItem {
  id: string;
  path: string;
  method: string;
  body: Record<string, any>;
  createdAt: string;
}

export function getStoredSession(): {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
} {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null, user: null };
  }
  const accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
  const userRaw = localStorage.getItem(USER_STORAGE_KEY);
  let user: AuthUser | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = null;
    }
  }
  return { accessToken, refreshToken, user };
}

export function saveStoredSession(accessToken: string, refreshToken: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getOfflineQueue(): OfflineMutationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineMutation(
  path: string,
  method: string,
  body: Record<string, any>
): OfflineMutationItem {
  const item: OfflineMutationItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}`,
    path,
    method,
    body,
    createdAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    const queue = getOfflineQueue();
    queue.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }
  return item;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (refreshPromise) return refreshPromise;

  const { refreshToken, user } = getStoredSession();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data?.accessToken) {
        clearStoredSession();
        return null;
      }
      const nextUser = json.data.user || user;
      if (nextUser) {
        saveStoredSession(json.data.accessToken, json.data.refreshToken || refreshToken, nextUser);
      } else {
        localStorage.setItem(TOKEN_STORAGE_KEY, json.data.accessToken);
        if (json.data.refreshToken) {
          localStorage.setItem(REFRESH_STORAGE_KEY, json.data.refreshToken);
        }
      }
      return json.data.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function logoutCurrentSession(): Promise<void> {
  const { refreshToken } = getStoredSession();
  if (refreshToken) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  clearStoredSession();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  allowRetry = true
): Promise<T> {
  const { accessToken } = getStoredSession();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && allowRetry && !path.startsWith("/auth/")) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      const retryHeaders = new Headers(options.headers);
      if (!retryHeaders.has("Content-Type") && options.body && typeof options.body === "string") {
        retryHeaders.set("Content-Type", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${nextToken}`);
      return apiRequest<T>(path, { ...options, headers: retryHeaders }, false);
    }
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export async function flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining: OfflineMutationItem[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      await apiRequest(item.path, {
        method: item.method,
        body: JSON.stringify(item.body),
      });
      synced++;
    } catch {
      remaining.push(item);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  }
  return { synced, remaining: remaining.length };
}

export async function uploadFileToMediaService(
  spaceId: string,
  file: File
): Promise<{ mediaId: string }> {
  const session = await apiRequest<{
    mediaId: string;
    uploadUrl: string;
    headers?: Record<string, string>;
  }>("/media/upload-session", {
    method: "POST",
    body: JSON.stringify({
      spaceId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
    }),
  });

  const uploadRes = await fetch(session.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Binary upload failed (${uploadRes.status})`);
  }

  await apiRequest(`/media/${session.mediaId}/complete`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  return { mediaId: session.mediaId };
}
