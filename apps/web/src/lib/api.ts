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
    } catch (err) {
      void err;
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return "/api/v1";
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
  role?: string;
  isVerified?: boolean;
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

export type MemoryReactionKind = "heart" | "warmth" | "tearsOfJoy" | "gratitude";

export interface MemoryReactionStateDTO {
  memoryId: string;
  counts: Record<string, number>;
  selectedKinds: MemoryReactionKind[];
  toggledKind?: MemoryReactionKind;
  active?: boolean;
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
  let accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  let refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
  let userRaw = localStorage.getItem(USER_STORAGE_KEY);

  // Fallback to cookies if localStorage was cleared or in an iframe/cross-tab context
  if (!accessToken && typeof document !== "undefined" && document.cookie) {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    for (const c of cookies) {
      if (c.startsWith("memoria_access_token=")) {
        accessToken = decodeURIComponent(c.substring("memoria_access_token=".length));
      } else if (c.startsWith("memoria_user=")) {
        userRaw = decodeURIComponent(c.substring("memoria_user=".length));
      }
    }
  }

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
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    void err;
  }

  try {
    if (typeof document !== "undefined") {
      document.cookie = `memoria_access_token=${encodeURIComponent(accessToken)}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `memoria_user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
    }
  } catch (err) {
    void err;
  }

  window.dispatchEvent(
    new CustomEvent("memoria:auth-change", {
      detail: { user, accessToken },
    })
  );
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (err) {
    void err;
  }

  try {
    if (typeof document !== "undefined") {
      document.cookie = "memoria_access_token=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "memoria_user=; path=/; max-age=0; SameSite=Lax";
    }
  } catch (err) {
    void err;
  }

  window.dispatchEvent(
    new CustomEvent("memoria:auth-change", {
      detail: { user: null, accessToken: null },
    })
  );
}

export function openAuthModal(mode: "login" | "register" = "login"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("memoria:open-auth", { detail: { mode } }));
}

export function subscribeAuthChange(
  callback: (session: { user: AuthUser | null; accessToken: string | null }) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    callback(getStoredSession());
  };
  window.addEventListener("memoria:auth-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("memoria:auth-change", handler);
    window.removeEventListener("storage", handler);
  };
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

  const baseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch (fetchErr) {
    void fetchErr;
    if (baseUrl === "/api/v1" && typeof window !== "undefined") {
      res = await fetch(`http://127.0.0.1:4000/api/v1${path}`, {
        ...options,
        headers,
      });
    } else {
      throw fetchErr;
    }
  }

  // If /api/v1 returned 404, gracefully fall back to direct gateway address
  if (res.status === 404 && baseUrl === "/api/v1" && typeof window !== "undefined") {
    try {
      const fallbackRes = await fetch(`http://127.0.0.1:4000/api/v1${path}`, {
        ...options,
        headers,
      });
      if (
        fallbackRes.ok ||
        fallbackRes.status === 400 ||
        fallbackRes.status === 401 ||
        fallbackRes.status === 403 ||
        fallbackRes.status === 409
      ) {
        res = fallbackRes;
      }
    } catch (fallbackErr) {
      void fallbackErr;
    }
  }

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
  payload: Partial<{
    name: string;
    type: SpaceProfileDTO["type"];
    relationship: string | null;
    birthDate: string | null;
  }>
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

export async function getMemoryReactions(memoryId: string): Promise<MemoryReactionStateDTO> {
  return apiRequest<MemoryReactionStateDTO>(`/memories/${memoryId}/reactions`);
}

export async function toggleMemoryReaction(
  memoryId: string,
  kind: MemoryReactionKind
): Promise<MemoryReactionStateDTO> {
  return apiRequest<MemoryReactionStateDTO>(`/memories/${memoryId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}

export async function setMemoryReaction(
  memoryId: string,
  kind: MemoryReactionKind,
  active: boolean
): Promise<MemoryReactionStateDTO> {
  return apiRequest<MemoryReactionStateDTO>(`/memories/${memoryId}/reactions`, {
    method: "PUT",
    body: JSON.stringify({ kind, active }),
  });
}

export async function listNotifications(): Promise<NotificationDTO[]> {
  const res = await apiRequest<{ notifications?: NotificationDTO[]; items?: NotificationDTO[] } | NotificationDTO[]>(
    "/notifications"
  );
  return Array.isArray(res) ? res : res.notifications || res.items || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) });
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
  shippingSpeed?: "standard" | "priority";
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

// Extended Auth, Preferences, Privacy, Onboarding & Support
export async function resendVerificationEmail(email?: string): Promise<{ sent: boolean; verificationToken?: string }> {
  return apiRequest("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function claimInstanceAdmin(): Promise<{ claimed: boolean; role: string; accessToken: string }> {
  return apiRequest("/auth/claim-instance-admin", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getPreferences(): Promise<{
  reducedMotion: boolean;
  language: string;
  biometricLock: boolean;
  defaultSpaceId?: string;
}> {
  return apiRequest("/auth/me/preferences");
}

export async function updatePreferences(payload: {
  reducedMotion?: boolean;
  language?: string;
  biometricLock?: boolean;
  defaultSpaceId?: string;
}) {
  return apiRequest("/auth/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getPrivacySettings(): Promise<{
  signedLinkTtlSeconds: number;
  allowPublicGallery: boolean;
}> {
  return apiRequest("/auth/me/privacy");
}

export async function updatePrivacySettings(payload: {
  signedLinkTtlSeconds?: number;
  allowPublicGallery?: boolean;
}) {
  return apiRequest("/auth/me/privacy", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function saveOnboardingPurpose(purpose: string) {
  return apiRequest("/auth/me/onboarding", {
    method: "PATCH",
    body: JSON.stringify({ purpose }),
  });
}

export async function submitSupportTicket(payload: {
  email?: string;
  subject: string;
  category?: string;
  message: string;
}) {
  return apiRequest<{ id: string; subject: string; status: string }>("/support/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Extended Space, Archive, Media, Collab, Book & Commerce
export async function getSpaceTimeline(spaceId: string) {
  return apiRequest<{ total: number; groups: Array<{ yearMonth: string; year: string; items: MemoryDTO[] }> }>(
    `/spaces/${spaceId}/timeline`
  );
}

export async function getSpaceCalendar(spaceId: string, year?: string, month?: string) {
  const qs = new URLSearchParams();
  if (year) qs.set("year", year);
  if (month) qs.set("month", month);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest<{
    days: Record<string, MemoryDTO[]>;
    anniversaries: Array<{ profileId: string; name: string; relationship?: string; birthDate?: string }>;
    totalMemories: number;
  }>(`/spaces/${spaceId}/calendar${suffix}`);
}

export async function getSpaceActivity(spaceId: string) {
  return apiRequest<Array<{ id: string; kind: string; title: string; actorId: string; timestamp: string }>>(
    `/spaces/${spaceId}/activity`
  );
}

export async function getMemoryHistory(memoryId: string) {
  return apiRequest<
    Array<{
      id: string;
      memoryId: string;
      editorId: string;
      title: string;
      content: string;
      capturedAt?: string;
      changeSummary: string;
      createdAt: string;
    }>
  >(`/memories/${memoryId}/history`);
}

export async function getCollectionDetail(spaceId: string, collectionId: string) {
  return apiRequest<CollectionDTO & { memories: MemoryDTO[] }>(
    `/spaces/${spaceId}/collections/${collectionId}`
  );
}

export async function reorderCollectionMemories(spaceId: string, collectionId: string, memoryIds: string[]) {
  return apiRequest<CollectionDTO>(`/spaces/${spaceId}/collections/${collectionId}/reorder`, {
    method: "PUT",
    body: JSON.stringify({ memoryIds }),
  });
}

export async function getStorageBreakdown(spaceId: string) {
  return apiRequest<{
    spaceId: string;
    usedBytes: number;
    maxBytes: number;
    assetCount: number;
    categories: { imagesBytes: number; videoBytes: number; audioBytes: number; docsBytes: number };
  }>(`/media/spaces/${spaceId}/storage/breakdown`);
}

export async function pruneStorageCache(spaceId: string) {
  return apiRequest<{ spaceId: string; verifiedObjects: number; reclaimedBytes: number; prunedAt: string }>(
    `/media/spaces/${spaceId}/storage/prune`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function listActiveUploadSessions(spaceId: string) {
  return apiRequest<
    Array<{ id: string; originalName: string; mimeType: string; sizeBytes: number; status: string }>
  >(`/media/upload-sessions/active?spaceId=${encodeURIComponent(spaceId)}`);
}

export async function retryUploadSession(mediaId: string) {
  return apiRequest<{ mediaId: string; uploadUrl: string; storageKey: string }>(
    `/media/upload-sessions/${mediaId}/retry`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function saveMediaNonDestructiveEdits(
  mediaId: string,
  payload: { rotateDegrees?: number; warmth?: number; cropPreset?: string }
) {
  return apiRequest(`/media/${mediaId}/derivatives`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listSpaceInvitations(spaceId: string) {
  return apiRequest<SpaceInvitationDTO[]>(`/collab/spaces/${spaceId}/invitations`);
}

export async function resendSpaceInvitation(spaceId: string, invitationId: string) {
  return apiRequest<{ resent: boolean }>(`/collab/spaces/${spaceId}/invitations/${invitationId}/resend`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function revokeSpaceInvitation(spaceId: string, invitationId: string) {
  return apiRequest<{ revoked: boolean }>(`/collab/spaces/${spaceId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

export async function updateSpaceMemberRole(
  spaceId: string,
  userId: string,
  role: "admin" | "contributor" | "viewer",
  permissions?: Record<string, boolean>
) {
  return apiRequest<SpaceMemberDTO>(`/collab/spaces/${spaceId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role, permissions }),
  });
}

export async function listCustomRoles(spaceId: string) {
  return apiRequest<Array<{ id: string; name: string; description: string; permissions: Record<string, boolean> }>>(
    `/collab/spaces/${spaceId}/roles`
  );
}

export async function createCustomRole(
  spaceId: string,
  payload: { name: string; description?: string; permissions: Record<string, boolean> }
) {
  return apiRequest(`/collab/spaces/${spaceId}/roles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listShareLinks(spaceId: string) {
  return apiRequest<
    Array<{ id: string; token: string; hasPassphrase: boolean; allowDownloads: boolean; expiresAt: string; accessCount: number }>
  >(`/collab/spaces/${spaceId}/share-links`);
}

export async function createShareLink(
  spaceId: string,
  payload: { passphrase?: string; allowDownloads?: boolean; expiresInDays?: number }
) {
  return apiRequest<{ id: string; token: string; hasPassphrase: boolean; expiresAt: string }>(
    `/collab/spaces/${spaceId}/share-links`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function verifyShareLink(token: string, passphrase?: string) {
  return apiRequest<{
    valid: boolean;
    spaceId: string;
    allowDownloads: boolean;
    expiresAt: string;
    space?: { id: string; name: string; description?: string; type: string } | null;
    memories?: Array<{ id: string; title: string; content?: string; format: string; location?: string; capturedAt: string }>;
  }>(`/collab/share-links/${token}/verify`, {
    method: "POST",
    body: JSON.stringify({ passphrase }),
  });
}

export async function getMediaAsset(mediaId: string) {
  return apiRequest<{
    id: string;
    spaceId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    publicUrl?: string;
    metadata?: Record<string, any>;
  }>(`/media/${mediaId}`);
}

export async function getMediaOcr(mediaId: string) {
  return apiRequest<Array<{ id: string; mediaId: string; extractedText: string; confidence?: number; language?: string }>>(
    `/media/${mediaId}/ocr`
  );
}

export async function flagMemoryForModeration(memoryId: string, reason: string) {
  return apiRequest<{ id: string; status: string }>(`/memories/${memoryId}/flag`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function listMySupportTickets() {
  return apiRequest<
    Array<{
      id: string;
      subject: string;
      category: string;
      message: string;
      status: string;
      createdAt: string;
      replies?: Array<{ id: string; authorName: string; message: string; createdAt: string }>;
    }>
  >("/support/tickets");
}

export async function submitAbuseReport(payload: {
  targetType: "memory" | "space" | "user";
  targetId: string;
  reason: string;
  details?: string;
}) {
  return apiRequest<{ id: string; status: string }>("/support/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function curateBookMemories(
  bookId: string,
  memories: Array<{ id: string; title: string; content?: string; capturedAt?: string }>,
  template?: string
) {
  return apiRequest<BookDTO>(`/books/${bookId}/curate`, {
    method: "POST",
    body: JSON.stringify({ memories, template }),
  });
}

export async function getBookChapters(bookId: string) {
  return apiRequest<Array<{ id: string; title: string; subtitle?: string; sortOrder: number }>>(
    `/books/${bookId}/chapters`
  );
}

export async function saveBookChapters(
  bookId: string,
  chapters: Array<{ id?: string; title: string; subtitle?: string }>
) {
  return apiRequest(`/books/${bookId}/chapters`, {
    method: "PUT",
    body: JSON.stringify({ chapters }),
  });
}

export async function reorderBookSpreads(bookId: string, spreadIds: string[]) {
  return apiRequest<BookDTO>(`/books/${bookId}/spreads/reorder`, {
    method: "PUT",
    body: JSON.stringify({ spreadIds }),
  });
}

export async function getBookProof(bookId: string) {
  return apiRequest<{ book: BookDTO; pageCount: number; bleedMm: number; safeMarginMm: number; preflight: PreflightReportDTO }>(
    `/books/${bookId}/proof`
  );
}

export async function getBookEditions(bookId: string) {
  return apiRequest<
    Array<{ editionNumber: number; status: string; editionHash: string | null; spreadCount: number; updatedAt: string }>
  >(`/books/${bookId}/editions`);
}

export async function cloneNextBookEdition(bookId: string) {
  return apiRequest<BookDTO>(`/books/${bookId}/editions`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getOrderTracking(orderId: string) {
  return apiRequest<{
    orderId: string;
    status: string;
    carrier: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    estimatedDays: string;
    timeline: Array<{ stage: string; completed: boolean; active: boolean }>;
  }>(`/orders/${orderId}/tracking`);
}

export async function reorderPrintOrder(orderId: string, quantity = 1) {
  return apiRequest<PrintOrderDTO>(`/orders/${orderId}/reorder`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}

// Admin Governance Endpoints (ADMIN-01..26)
export async function getAdminOverview() {
  return apiRequest<{ usersCount: number; spacesCount: number; storage: Record<string, any> | null; ordersCount: number }>(
    "/admin/overview/metrics"
  );
}
export async function getAdminServicesHealth() {
  return apiRequest<Array<{ service: string; status: string; latencyMs: number }>>("/admin/services/health");
}
export async function getAdminUsers(q = "") {
  return apiRequest<Array<{ id: string; email: string; fullName: string; role: string; status: string; isVerified: boolean; createdAt: string }>>(
    `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`
  );
}
export async function updateAdminUserStatus(userId: string, status: "active" | "suspended") {
  return apiRequest(`/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}
export async function revokeAdminUserSessions(userId: string) {
  return apiRequest(`/admin/users/${userId}/sessions/revoke-all`, { method: "POST", body: JSON.stringify({}) });
}
export async function getAdminSpaces() {
  return apiRequest<MemorySpaceDTO[]>("/admin/spaces");
}
export async function getAdminAccessRequests() {
  return apiRequest<Array<{ id: string; requesterId: string; targetSpaceId?: string; reason: string; status: string; createdAt: string }>>(
    "/admin/access-requests"
  );
}
export async function createAdminAccessRequest(reason: string, targetSpaceId?: string) {
  return apiRequest("/admin/access-requests", { method: "POST", body: JSON.stringify({ reason, targetSpaceId }) });
}
export async function approveAdminAccessRequest(requestId: string) {
  return apiRequest(`/admin/access-requests/${requestId}/approve`, { method: "POST", body: JSON.stringify({}) });
}
export async function getAdminModerationFlags() {
  return apiRequest<Array<{ id: string; spaceId: string; memoryId: string; reason: string; status: string; createdAt: string }>>(
    "/admin/moderation"
  );
}
export async function resolveAdminModerationFlag(flagId: string, decision: "approved" | "quarantined") {
  return apiRequest(`/admin/moderation/${flagId}/resolve`, { method: "POST", body: JSON.stringify({ decision }) });
}
export async function getAdminReports() {
  return apiRequest<Array<{ id: string; targetType: string; targetId: string; reason: string; status: string; createdAt: string }>>(
    "/admin/reports"
  );
}
export async function resolveAdminReport(reportId: string, status: string, resolutionNote?: string) {
  return apiRequest(`/admin/reports/${reportId}`, { method: "PATCH", body: JSON.stringify({ status, resolutionNote }) });
}
export async function getAdminStorageStats() {
  return apiRequest<{ driver: string; totalUsedBytes: number; spaceCount: number; assetCount: number; assetBytes: number }>(
    "/admin/storage/stats"
  );
}
export async function getAdminUploadSessions() {
  return apiRequest<Array<{ id: string; spaceId: string; originalName: string; mimeType: string; sizeBytes: number; status: string }>>(
    "/admin/uploads/sessions"
  );
}
export async function reprocessAdminMedia(mediaId: string) {
  return apiRequest(`/admin/media/${mediaId}/reprocess`, { method: "POST", body: JSON.stringify({}) });
}
export async function getAdminQueuesTelemetry() {
  return apiRequest<{ queues: Array<{ name: string; active: number; waiting: number; completed: number; failed: number }>; deadLetterJobs: any[] }>(
    "/admin/queues/telemetry"
  );
}
export async function retryAdminQueueJob(queueName: string, jobId: string) {
  return apiRequest(`/admin/queues/${queueName}/jobs/${jobId}/retry`, { method: "POST", body: JSON.stringify({}) });
}
export async function getAdminBookJobs() {
  return apiRequest<Array<{ id: string; title: string; format: string; version: number; isFrozenForPrint: boolean; updatedAt: string }>>(
    "/admin/books/rendering/jobs"
  );
}
export async function overrideAdminPreflight(bookId: string, note: string) {
  return apiRequest(`/admin/preflight/${bookId}/override`, { method: "POST", body: JSON.stringify({ note }) });
}
export async function getAdminCatalogFormats() {
  return apiRequest<Array<{ formatId: string; label: string; dimensionsCm: string; baseCents: number; enabled: boolean }>>(
    "/admin/catalog/formats"
  );
}
export async function updateAdminCatalogFormat(formatId: string, payload: { label?: string; baseCents?: number; enabled?: boolean }) {
  return apiRequest(`/admin/catalog/formats/${formatId}`, { method: "PUT", body: JSON.stringify(payload) });
}
export async function getAdminPricingMatrix() {
  return apiRequest<{ formats: any[]; shippingRates: Array<{ zoneCode: string; label: string; rateCents: number; estimatedDays: string }> }>(
    "/admin/pricing/matrix"
  );
}
export async function updateAdminShippingRate(zoneCode: string, rateCents: number, estimatedDays?: string) {
  return apiRequest("/admin/pricing/matrix", { method: "POST", body: JSON.stringify({ zoneCode, rateCents, estimatedDays }) });
}
export async function getAdminOrders() {
  return apiRequest<Array<PrintOrderDTO & { trackingNumber?: string; carrier?: string }>>("/admin/orders");
}
export async function shipAdminOrder(orderId: string, trackingNumber?: string, carrier?: string) {
  return apiRequest(`/admin/orders/${orderId}/ship`, { method: "POST", body: JSON.stringify({ trackingNumber, carrier }) });
}
export async function refundAdminOrder(orderId: string, refundType: "refund" | "remake", reason: string) {
  return apiRequest(`/admin/orders/${orderId}/refund`, { method: "POST", body: JSON.stringify({ refundType, reason }) });
}
export async function getAdminTransactions() {
  return apiRequest<{ transactions: any[]; refunds: any[] }>("/admin/transactions");
}
export async function getAdminEmailTemplates() {
  return apiRequest<Array<{ templateKey: string; subject: string; htmlBody: string; updatedAt: string }>>("/admin/templates");
}
export async function updateAdminEmailTemplate(templateKey: string, subject: string, htmlBody: string) {
  return apiRequest(`/admin/templates/${templateKey}`, { method: "PUT", body: JSON.stringify({ subject, htmlBody }) });
}
export async function getAdminFeatureFlags() {
  return apiRequest<Array<{ flagKey: string; description: string; enabled: boolean; rolloutPercentage: number }>>(
    "/admin/feature-flags"
  );
}
export async function updateAdminFeatureFlag(flagKey: string, enabled: boolean, rolloutPercentage?: number) {
  return apiRequest(`/admin/feature-flags/${flagKey}`, { method: "PATCH", body: JSON.stringify({ enabled, rolloutPercentage }) });
}
export async function getAdminAuditLogs() {
  return apiRequest<Array<{ id: string; action: string; entityType: string; entityId: string; userId?: string; createdAt: string }>>(
    "/admin/audit-logs"
  );
}
export async function getAdminTickets() {
  return apiRequest<Array<{ id: string; email: string; subject: string; category: string; message: string; status: string; createdAt: string }>>(
    "/admin/tickets"
  );
}
export async function replyAdminTicket(ticketId: string, message: string, newStatus = "waiting_customer") {
  return apiRequest(`/admin/tickets/${ticketId}/reply`, { method: "POST", body: JSON.stringify({ message, newStatus }) });
}
export async function getAdminSecurityKeys() {
  return apiRequest<Array<{ id: string; name: string; keyType: string; credentialId: string; createdAt: string }>>(
    "/admin/profile/security-keys"
  );
}
export async function registerAdminSecurityKey(name: string, keyType = "fido2") {
  return apiRequest("/admin/profile/webauthn/register", { method: "POST", body: JSON.stringify({ name, keyType }) });
}
export async function deleteAdminSecurityKey(keyId: string) {
  return apiRequest(`/admin/profile/security-keys/${keyId}`, { method: "DELETE" });
}
