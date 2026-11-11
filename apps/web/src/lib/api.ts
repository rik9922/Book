"use client";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const override = (window as Window & { __MEMORIA_API_URL__?: string }).__MEMORIA_API_URL__;
    if (override) return override;
    try {
      const stored = localStorage.getItem("memoria_api_url_override");
      if (stored) return stored;
    } catch {
      return API_BASE_URL;
    }
  }
  return API_BASE_URL;
}

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
  shippingAddress?: Record<string, any>;
  printSpec?: Record<string, any>;
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

export interface CollectionDTO {
  id: string;
  spaceId: string;
  title: string;
  description?: string | null;
  coverMemoryId?: string | null;
  memoryIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryCommentDTO {
  id: string;
  memoryId: string;
  spaceId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface PreflightReportDTO {
  bookId: string;
  version: number;
  isFrozenForPrint: boolean;
  frozenEditionHash?: string | null;
  passed: boolean;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }>;
  checkedAt: string;
}

export interface ActiveSessionDTO {
  id: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
  createdAt: string;
}

export interface SpaceQuotaDTO {
  spaceId: string;
  usedBytes: number;
  maxBytes: number;
  usedPercentage: number;
  isWarningThreshold: boolean;
  isQuotaExceeded: boolean;
}

export interface SpaceMemberDTO {
  id: string;
  spaceId: string;
  userId: string;
  role: "owner" | "admin" | "contributor" | "viewer";
  permissions?: Record<string, boolean>;
  joinedAt: string;
}

export interface SpaceInvitationDTO {
  id: string;
  spaceId: string;
  inviteeEmail: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface PrintCatalogDTO {
  currency: string;
  pricingPolicy: string;
  formats: Array<{
    id: BookDTO["format"];
    label: string;
    dimensionsCm: string;
    baseCents: number;
  }>;
  bindings: Array<{
    id: "hardcover_linen" | "french_morocco";
    label: string;
    surchargeCents: number;
  }>;
  paperStocks: Array<{
    id: "140gsm_matte" | "170gsm_lustre";
    label: string;
    surchargeCents: number;
  }>;
}

export interface OrderQuoteDTO {
  currency: string;
  quantity: number;
  unitCents: number;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  estimatedDays: string;
}

export interface OrderReceiptDTO {
  receiptNumber: string;
  orderId: string;
  bookId: string;
  status: string;
  currency: string;
  totalCents: number;
  shippingAddress: Record<string, any>;
  printSpec: Record<string, any>;
  issuedAt: string;
  policyNote: string;
}

export interface SpaceExportBundleDTO {
  schemaVersion: string;
  exportedAt: string;
  space: MemorySpaceDTO;
  profiles: SpaceProfileDTO[];
  collections: CollectionDTO[];
  memories: MemoryDTO[];
  integritySha256: string;
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
      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
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
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
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

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
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

export async function fetchSpaces(): Promise<MemorySpaceDTO[]> {
  const res = await apiRequest<{ spaces?: MemorySpaceDTO[]; items?: MemorySpaceDTO[] } | MemorySpaceDTO[]>(
    "/spaces"
  );
  return Array.isArray(res) ? res : res.spaces || res.items || [];
}

export async function createSpace(payload: {
  name: string;
  description?: string;
  type: MemorySpaceDTO["type"];
}): Promise<MemorySpaceDTO> {
  return apiRequest<MemorySpaceDTO>("/spaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSpace(
  spaceId: string,
  payload: Partial<Pick<MemorySpaceDTO, "name" | "description" | "type">>
): Promise<MemorySpaceDTO> {
  return apiRequest<MemorySpaceDTO>(`/spaces/${spaceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSpace(spaceId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/spaces/${spaceId}`, {
    method: "DELETE",
  });
}

export async function listProfiles(spaceId: string): Promise<SpaceProfileDTO[]> {
  const res = await apiRequest<{ profiles?: SpaceProfileDTO[]; items?: SpaceProfileDTO[] } | SpaceProfileDTO[]>(
    `/spaces/${spaceId}/profiles`
  );
  return Array.isArray(res) ? res : res.profiles || res.items || [];
}

export async function createProfile(
  spaceId: string,
  payload: { name: string; type: SpaceProfileDTO["type"]; relationship?: string; birthDate?: string }
): Promise<SpaceProfileDTO> {
  return apiRequest<SpaceProfileDTO>(`/spaces/${spaceId}/profiles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(
  spaceId: string,
  profileId: string,
  payload: Partial<{ name: string; type: SpaceProfileDTO["type"]; relationship?: string; birthDate?: string }>
): Promise<SpaceProfileDTO> {
  return apiRequest<SpaceProfileDTO>(`/spaces/${spaceId}/profiles/${profileId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProfile(spaceId: string, profileId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/spaces/${spaceId}/profiles/${profileId}`, {
    method: "DELETE",
  });
}

export async function listCollections(spaceId: string): Promise<CollectionDTO[]> {
  const res = await apiRequest<CollectionDTO[] | { items?: CollectionDTO[] }>(`/spaces/${spaceId}/collections`);
  return Array.isArray(res) ? res : res.items || [];
}

export async function createCollection(
  spaceId: string,
  payload: { title: string; description?: string; coverMemoryId?: string }
): Promise<CollectionDTO> {
  return apiRequest<CollectionDTO>(`/spaces/${spaceId}/collections`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCollection(
  spaceId: string,
  collectionId: string,
  payload: Partial<{ title: string; description: string; coverMemoryId: string }>
): Promise<CollectionDTO> {
  return apiRequest<CollectionDTO>(`/spaces/${spaceId}/collections/${collectionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCollection(spaceId: string, collectionId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/spaces/${spaceId}/collections/${collectionId}`, {
    method: "DELETE",
  });
}

export async function addMemoryToCollection(
  spaceId: string,
  collectionId: string,
  memoryId: string
): Promise<CollectionDTO> {
  return apiRequest<CollectionDTO>(`/spaces/${spaceId}/collections/${collectionId}/memories`, {
    method: "POST",
    body: JSON.stringify({ memoryId }),
  });
}

export async function removeMemoryFromCollection(
  spaceId: string,
  collectionId: string,
  memoryId: string
): Promise<{ removed: boolean }> {
  return apiRequest<{ removed: boolean }>(`/spaces/${spaceId}/collections/${collectionId}/memories/${memoryId}`, {
    method: "DELETE",
  });
}

export async function listTrashMemories(spaceId: string): Promise<MemoryDTO[]> {
  const res = await apiRequest<MemoryDTO[] | { items?: MemoryDTO[] }>(`/spaces/${spaceId}/memories/trash`);
  return Array.isArray(res) ? res : res.items || [];
}

export async function restoreMemory(memoryId: string): Promise<MemoryDTO> {
  return apiRequest<MemoryDTO>(`/memories/${memoryId}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function permanentlyDeleteMemory(memoryId: string): Promise<{ permanentlyDeleted: boolean }> {
  return apiRequest<{ permanentlyDeleted: boolean }>(`/memories/${memoryId}/permanent`, {
    method: "DELETE",
  });
}

export async function listMemoryComments(memoryId: string): Promise<MemoryCommentDTO[]> {
  return apiRequest<MemoryCommentDTO[]>(`/memories/${memoryId}/comments`);
}

export async function addMemoryComment(
  memoryId: string,
  body: string,
  authorName?: string
): Promise<MemoryCommentDTO> {
  return apiRequest<MemoryCommentDTO>(`/memories/${memoryId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, authorName }),
  });
}

export async function deleteMemoryComment(memoryId: string, commentId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/memories/${memoryId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

export async function listNotifications(): Promise<NotificationDTO[]> {
  const res = await apiRequest<{ notifications?: NotificationDTO[]; items?: NotificationDTO[] } | NotificationDTO[]>(
    "/notifications"
  );
  return Array.isArray(res) ? res : res.notifications || res.items || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, { method: "POST", body: JSON.stringify({}) });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest("/notifications/read-all", { method: "POST", body: JSON.stringify({}) });
}

export async function getBookCatalog(): Promise<PrintCatalogDTO> {
  return apiRequest<PrintCatalogDTO>("/books/catalog");
}

export async function getOrderQuote(payload: {
  format: string;
  binding: string;
  paperWeight: string;
  quantity: number;
  country: string;
}): Promise<OrderQuoteDTO> {
  return apiRequest<OrderQuoteDTO>("/orders/quote", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listMyOrders(): Promise<PrintOrderDTO[]> {
  return apiRequest<PrintOrderDTO[]>("/orders/me");
}

export async function getOrderReceipt(orderId: string): Promise<OrderReceiptDTO> {
  return apiRequest<OrderReceiptDTO>(`/orders/${orderId}/receipt`);
}

export async function exportSpaceBundle(spaceId: string): Promise<SpaceExportBundleDTO> {
  return apiRequest<SpaceExportBundleDTO>(`/spaces/${spaceId}/export`);
}

export async function listSessions(): Promise<ActiveSessionDTO[]> {
  return apiRequest<ActiveSessionDTO[]>("/auth/sessions");
}

export async function revokeSession(sessionId: string): Promise<{ revoked: boolean }> {
  return apiRequest<{ revoked: boolean }>(`/auth/sessions/${sessionId}`, { method: "DELETE" });
}

export async function updateUserProfile(payload: {
  fullName?: string;
  avatarUrl?: string | null;
}): Promise<AuthUser> {
  const res = await apiRequest<{ user: AuthUser }>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.user;
}

export async function deleteAccount(password: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>("/auth/account/delete", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}
