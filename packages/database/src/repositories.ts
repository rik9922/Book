import crypto from "node:crypto";
import { DatabaseClient } from "./index.js";
import {
  UserProfile,
  MemorySpace,
  SpaceProfile,
  Memory,
  MediaAsset,
  BookDocument,
  BookSpread,
} from "@memory-capsule/contracts";

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  avatarUrl?: string | null;
  role?: string;
  status?: string;
  preferencesJson?: Record<string, any>;
  privacyJson?: Record<string, any>;
  onboardingPurpose?: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserAuthTokenRecord {
  id: string;
  userId: string;
  purpose: "email_verification" | "password_reset";
  tokenHash: string;
  expiresAt: string;
  consumedAt?: string | null;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// 1. User Repository
// ----------------------------------------------------------------------------
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord>;
  updateProfile?(userId: string, updates: { fullName?: string; avatarUrl?: string | null }): Promise<UserRecord | null>;
  deleteUser?(userId: string): Promise<boolean>;
  updatePassword?(userId: string, passwordHash: string): Promise<void>;
  markEmailVerified?(userId: string): Promise<void>;
  createSession(session: UserSessionRecord): Promise<void>;
  findSessionByToken(refreshTokenHash: string): Promise<UserSessionRecord | null>;
  listSessionsForUser?(userId: string): Promise<UserSessionRecord[]>;
  revokeSessionById?(sessionId: string, userId: string): Promise<boolean>;
  deleteSession(id: string): Promise<void>;
  revokeSessionByTokenHash?(refreshTokenHash: string): Promise<boolean>;
  revokeAllSessionsForUser?(userId: string): Promise<void>;
  createAuthToken?(token: Omit<UserAuthTokenRecord, "createdAt" | "consumedAt">): Promise<void>;
  consumeAuthToken?(tokenHash: string, purpose: "email_verification" | "password_reset"): Promise<UserAuthTokenRecord | null>;
}

export class PostgresUserRepository implements UserRepository {
  constructor(private db: DatabaseClient) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const res = await this.db.query(
      `SELECT id, email, full_name as "fullName", password_hash as "passwordHash",
              avatar_url as "avatarUrl", COALESCE(role, 'member') as "role",
              COALESCE(status, 'active') as "status",
              COALESCE(preferences_json, '{}'::jsonb) as "preferencesJson",
              COALESCE(privacy_json, '{}'::jsonb) as "privacyJson",
              onboarding_purpose as "onboardingPurpose",
              is_verified as "isVerified",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const res = await this.db.query(
      `SELECT id, email, full_name as "fullName", password_hash as "passwordHash",
              avatar_url as "avatarUrl", COALESCE(role, 'member') as "role",
              COALESCE(status, 'active') as "status",
              COALESCE(preferences_json, '{}'::jsonb) as "preferencesJson",
              COALESCE(privacy_json, '{}'::jsonb) as "privacyJson",
              onboarding_purpose as "onboardingPurpose",
              is_verified as "isVerified",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async create(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord> {
    const now = new Date().toISOString();
    const role = user.role || "member";
    const status = user.status || "active";
    await this.db.query(
      `INSERT INTO users (id, email, full_name, password_hash, avatar_url, role, status, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user.id,
        user.email.toLowerCase().trim(),
        user.fullName,
        user.passwordHash,
        user.avatarUrl || null,
        role,
        status,
        user.isVerified ?? false,
        now,
        now,
      ]
    );
    return {
      ...user,
      role,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateProfile(
    userId: string,
    updates: { fullName?: string; avatarUrl?: string | null }
  ): Promise<UserRecord | null> {
    const existing = await this.findById(userId);
    if (!existing) return null;
    const nextFullName = updates.fullName !== undefined ? updates.fullName : existing.fullName;
    const nextAvatarUrl = updates.avatarUrl !== undefined ? updates.avatarUrl : existing.avatarUrl;
    await this.db.query(
      `UPDATE users SET full_name = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3`,
      [nextFullName, nextAvatarUrl || null, userId]
    );
    return this.findById(userId);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const res = await this.db.query(`DELETE FROM users WHERE id = $1`, [userId]);
    return (res.rowCount || 0) > 0;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET is_verified = TRUE, email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  async createSession(session: UserSessionRecord): Promise<void> {
    await this.db.query(
      `INSERT INTO user_sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        session.id,
        session.userId,
        session.refreshTokenHash,
        session.userAgent || null,
        session.ipAddress || null,
        session.expiresAt,
        session.createdAt,
      ]
    );
  }

  async findSessionByToken(refreshTokenHash: string): Promise<UserSessionRecord | null> {
    const res = await this.db.query(
      `SELECT id, user_id as "userId", refresh_token_hash as "refreshTokenHash",
              user_agent as "userAgent", ip_address as "ipAddress",
              expires_at::text as "expiresAt", created_at::text as "createdAt"
       FROM user_sessions
       WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [refreshTokenHash]
    );
    return res.rows[0] || null;
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.query(`DELETE FROM user_sessions WHERE id = $1`, [id]);
  }

  async listSessionsForUser(userId: string): Promise<UserSessionRecord[]> {
    const res = await this.db.query(
      `SELECT id, user_id as "userId", refresh_token_hash as "refreshTokenHash",
              user_agent as "userAgent", ip_address as "ipAddress",
              expires_at::text as "expiresAt", created_at::text as "createdAt"
       FROM user_sessions
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  async revokeSessionById(sessionId: string, userId: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [sessionId, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  async revokeSessionByTokenHash(refreshTokenHash: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
      [refreshTokenHash]
    );
    return (res.rowCount || 0) > 0;
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  }

  async createAuthToken(token: Omit<UserAuthTokenRecord, "createdAt" | "consumedAt">): Promise<void> {
    await this.db.query(
      `INSERT INTO user_auth_tokens (id, user_id, purpose, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [token.id, token.userId, token.purpose, token.tokenHash, token.expiresAt]
    );
  }

  async consumeAuthToken(
    tokenHash: string,
    purpose: "email_verification" | "password_reset"
  ): Promise<UserAuthTokenRecord | null> {
    const res = await this.db.query(
      `UPDATE user_auth_tokens
       SET consumed_at = NOW()
       WHERE token_hash = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > NOW()
       RETURNING id, user_id as "userId", purpose, token_hash as "tokenHash",
                 expires_at::text as "expiresAt", consumed_at::text as "consumedAt",
                 created_at::text as "createdAt"`,
      [tokenHash, purpose]
    );
    return res.rows[0] || null;
  }
}

// ----------------------------------------------------------------------------
// 2. Space & Profile Repository
// ----------------------------------------------------------------------------
export interface SpaceRepository {
  createSpace(space: MemorySpace): Promise<MemorySpace>;
  findSpaceById(id: string): Promise<MemorySpace | null>;
  listSpaces(ownerId?: string): Promise<MemorySpace[]>;
  updateSpace?(id: string, updates: Partial<Pick<MemorySpace, "name" | "description" | "type" | "coverUrl">>): Promise<MemorySpace | null>;
  softDeleteSpace?(id: string): Promise<boolean>;
  createProfile(profile: SpaceProfile): Promise<SpaceProfile>;
  listProfiles(spaceId: string): Promise<SpaceProfile[]>;
  findProfileById(id: string): Promise<SpaceProfile | null>;
  updateProfile?(id: string, updates: Partial<Pick<SpaceProfile, "name" | "relationship" | "type" | "birthDate" | "avatarMediaId">>): Promise<SpaceProfile | null>;
  softDeleteProfile?(id: string): Promise<boolean>;
}

export class PostgresSpaceRepository implements SpaceRepository {
  constructor(private db: DatabaseClient) {}

  async createSpace(space: MemorySpace): Promise<MemorySpace> {
    await this.db.query(
      `INSERT INTO memory_spaces (id, owner_id, name, description, space_type, cover_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        space.id,
        space.ownerId,
        space.name,
        space.description || null,
        space.type,
        space.coverUrl || null,
        space.createdAt,
        space.updatedAt,
      ]
    );
    return space;
  }

  async findSpaceById(id: string): Promise<MemorySpace | null> {
    const res = await this.db.query(
      `SELECT id, owner_id as "ownerId", name, description, space_type as "type",
              cover_url as "coverUrl", created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM memory_spaces WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async listSpaces(ownerId?: string): Promise<MemorySpace[]> {
    if (ownerId) {
      const res = await this.db.query(
        `SELECT id, owner_id as "ownerId", name, description, space_type as "type",
                cover_url as "coverUrl", created_at::text as "createdAt", updated_at::text as "updatedAt"
         FROM memory_spaces WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC`,
        [ownerId]
      );
      return res.rows;
    }
    const res = await this.db.query(
      `SELECT id, owner_id as "ownerId", name, description, space_type as "type",
              cover_url as "coverUrl", created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM memory_spaces WHERE deleted_at IS NULL ORDER BY updated_at DESC`
    );
    return res.rows;
  }

  async updateSpace(
    id: string,
    updates: Partial<Pick<MemorySpace, "name" | "description" | "type" | "coverUrl">>
  ): Promise<MemorySpace | null> {
    const existing = await this.findSpaceById(id);
    if (!existing) return null;
    const merged: MemorySpace = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.db.query(
      `UPDATE memory_spaces SET name = $1, description = $2, space_type = $3, cover_url = $4, updated_at = $5 WHERE id = $6 AND deleted_at IS NULL`,
      [merged.name, merged.description || null, merged.type, merged.coverUrl || null, merged.updatedAt, id]
    );
    return merged;
  }

  async softDeleteSpace(id: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE memory_spaces SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return (res.rowCount || 0) > 0;
  }

  async createProfile(profile: SpaceProfile): Promise<SpaceProfile> {
    await this.db.query(
      `INSERT INTO space_profiles (id, space_id, name, relationship, profile_type, birth_date, avatar_media_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        profile.id,
        profile.spaceId,
        profile.name,
        profile.relationship || null,
        profile.type,
        profile.birthDate || null,
        profile.avatarMediaId || null,
        profile.createdAt,
        profile.updatedAt,
      ]
    );
    return profile;
  }

  async listProfiles(spaceId: string): Promise<SpaceProfile[]> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", name, relationship, profile_type as "type",
              birth_date::text as "birthDate", avatar_media_id as "avatarMediaId",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM space_profiles WHERE space_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
      [spaceId]
    );
    return res.rows;
  }

  async findProfileById(id: string): Promise<SpaceProfile | null> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", name, relationship, profile_type as "type",
              birth_date::text as "birthDate", avatar_media_id as "avatarMediaId",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM space_profiles WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async updateProfile(
    id: string,
    updates: Partial<Pick<SpaceProfile, "name" | "relationship" | "type" | "birthDate" | "avatarMediaId">>
  ): Promise<SpaceProfile | null> {
    const existing = await this.findProfileById(id);
    if (!existing) return null;
    const merged: SpaceProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.db.query(
      `UPDATE space_profiles SET name = $1, relationship = $2, profile_type = $3, birth_date = $4, avatar_media_id = $5, updated_at = $6 WHERE id = $7 AND deleted_at IS NULL`,
      [merged.name, merged.relationship || null, merged.type, merged.birthDate || null, merged.avatarMediaId || null, merged.updatedAt, id]
    );
    return merged;
  }

  async softDeleteProfile(id: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE space_profiles SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return (res.rowCount || 0) > 0;
  }
}

// ----------------------------------------------------------------------------
// 3. Memory Repository
// ----------------------------------------------------------------------------
export interface KeysetPaginationOptions {
  cursorTime?: string;
  cursorId?: string;
  limit?: number;
  profileId?: string;
  isFavorite?: boolean;
}

export interface KeysetPaginationResult<T> {
  items: T[];
  nextCursor: { cursorTime: string; cursorId: string } | null;
  hasMore: boolean;
}

export interface MemoryRepository {
  createMemory(memory: Memory): Promise<Memory>;
  findMemoryById(id: string, includeDeleted?: boolean): Promise<Memory | null>;
  listMemories(spaceId: string, options?: { profileId?: string; isFavorite?: boolean }): Promise<Memory[]>;
  listDeletedMemories?(spaceId: string): Promise<Memory[]>;
  listMemoriesKeyset(spaceId: string, options?: KeysetPaginationOptions): Promise<KeysetPaginationResult<Memory>>;
  searchMemories(spaceId: string, queryText: string, limit?: number): Promise<Memory[]>;
  updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null>;
  softDeleteMemory(id: string): Promise<boolean>;
  restoreMemory?(id: string): Promise<Memory | null>;
  hardDeleteMemory?(id: string): Promise<boolean>;
}

export class PostgresMemoryRepository implements MemoryRepository {
  constructor(private db: DatabaseClient) {}

  async createMemory(memory: Memory): Promise<Memory> {
    await this.db.transaction(async (client) => {
      await client.query(
        `INSERT INTO memories (id, space_id, author_id, title, content, format, captured_at, location, is_favorite, associated_profile_ids, media_ids, tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          memory.id,
          memory.spaceId,
          memory.authorId,
          memory.title,
          memory.content || null,
          memory.format,
          memory.capturedAt,
          memory.location || null,
          memory.isFavorite ?? false,
          memory.associatedProfileIds || [],
          memory.mediaIds || [],
          memory.tags || [],
          memory.createdAt,
          memory.updatedAt,
        ]
      );

      // Populate normalized relational junction tables in batches (zero N+1)
      if (memory.mediaIds && memory.mediaIds.length > 0) {
        const sortOrders = memory.mediaIds.map((_, idx) => idx);
        await client.query(
          `INSERT INTO memory_media (memory_id, media_id, sort_order)
           SELECT $1, m_id, s_order
           FROM UNNEST($2::uuid[], $3::int[]) AS t(m_id, s_order)
           ON CONFLICT (memory_id, media_id) DO NOTHING`,
          [memory.id, memory.mediaIds, sortOrders]
        );
      }

      if (memory.associatedProfileIds && memory.associatedProfileIds.length > 0) {
        await client.query(
          `INSERT INTO memory_profiles (memory_id, profile_id)
           SELECT $1, p_id
           FROM UNNEST($2::uuid[]) AS t(p_id)
           ON CONFLICT (memory_id, profile_id) DO NOTHING`,
          [memory.id, memory.associatedProfileIds]
        );
      }

      if (memory.tags && memory.tags.length > 0) {
        const normalizedTags = Array.from(
          new Set(memory.tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0))
        );
        if (normalizedTags.length > 0) {
          const generatedIds = normalizedTags.map(() => crypto.randomUUID());
          await client.query(
            `INSERT INTO tags (id, space_id, name)
             SELECT t_id, $1, t_name
             FROM UNNEST($2::uuid[], $3::text[]) AS t(t_id, t_name)
             ON CONFLICT (space_id, name) DO NOTHING`,
            [memory.spaceId, generatedIds, normalizedTags]
          );

          await client.query(
            `INSERT INTO memory_tags (memory_id, tag_id)
             SELECT $1, id
             FROM tags
             WHERE space_id = $2 AND name = ANY($3::text[])
             ON CONFLICT (memory_id, tag_id) DO NOTHING`,
            [memory.id, memory.spaceId, normalizedTags]
          );
        }
      }
    });

    return memory;
  }

  async findMemoryById(id: string, includeDeleted = false): Promise<Memory | null> {
    const query = includeDeleted
      ? `SELECT id, space_id as "spaceId", author_id as "authorId", title, content, format,
                captured_at::text as "capturedAt", location, is_favorite as "isFavorite",
                associated_profile_ids as "associatedProfileIds", media_ids as "mediaIds", tags,
                created_at::text as "createdAt", updated_at::text as "updatedAt"
         FROM memories WHERE id = $1 LIMIT 1`
      : `SELECT id, space_id as "spaceId", author_id as "authorId", title, content, format,
                captured_at::text as "capturedAt", location, is_favorite as "isFavorite",
                associated_profile_ids as "associatedProfileIds", media_ids as "mediaIds", tags,
                created_at::text as "createdAt", updated_at::text as "updatedAt"
         FROM memories WHERE id = $1 AND deleted_at IS NULL LIMIT 1`;

    const res = await this.db.query(query, [id]);
    return res.rows[0] || null;
  }

  async listMemories(spaceId: string, options?: { profileId?: string; isFavorite?: boolean }): Promise<Memory[]> {
    let query = `
      SELECT id, space_id as "spaceId", author_id as "authorId", title, content, format,
             captured_at::text as "capturedAt", location, is_favorite as "isFavorite",
             associated_profile_ids as "associatedProfileIds", media_ids as "mediaIds", tags,
             created_at::text as "createdAt", updated_at::text as "updatedAt"
      FROM memories WHERE space_id = $1 AND deleted_at IS NULL`;
    const params: any[] = [spaceId];

    if (options?.profileId) {
      params.push(options.profileId);
      query += ` AND $${params.length} = ANY(associated_profile_ids)`;
    }
    if (options?.isFavorite !== undefined) {
      params.push(options.isFavorite);
      query += ` AND is_favorite = $${params.length}`;
    }

    query += ` ORDER BY captured_at DESC`;

    const res = await this.db.query(query, params);
    return res.rows;
  }

  async listMemoriesKeyset(spaceId: string, options?: KeysetPaginationOptions): Promise<KeysetPaginationResult<Memory>> {
    const limit = Math.min(Math.max(options?.limit || 20, 1), 100);
    const params: any[] = [spaceId];

    let query = `
      SELECT id, space_id as "spaceId", author_id as "authorId", title, content, format,
             captured_at::text as "capturedAt", location, is_favorite as "isFavorite",
             associated_profile_ids as "associatedProfileIds", media_ids as "mediaIds", tags,
             created_at::text as "createdAt", updated_at::text as "updatedAt"
      FROM memories
      WHERE space_id = $1 AND deleted_at IS NULL`;

    if (options?.cursorTime && options?.cursorId) {
      params.push(options.cursorTime, options.cursorId);
      query += ` AND (captured_at < $${params.length - 1} OR (captured_at = $${params.length - 1} AND id < $${params.length}))`;
    }

    if (options?.isFavorite !== undefined) {
      params.push(options.isFavorite);
      query += ` AND is_favorite = $${params.length}`;
    }

    if (options?.profileId) {
      params.push(options.profileId);
      query += ` AND $${params.length} = ANY(associated_profile_ids)`;
    }

    query += ` ORDER BY captured_at DESC, id DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);

    const res = await this.db.query(query, params);
    const rows = res.rows as Memory[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: { cursorTime: string; cursorId: string } | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = {
        cursorTime: lastItem.capturedAt,
        cursorId: lastItem.id,
      };
    }

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async searchMemories(spaceId: string, queryText: string, limit = 20): Promise<Memory[]> {
    const trimmed = queryText.trim();
    if (!trimmed) return [];

    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", author_id as "authorId", title, content, format,
              captured_at::text as "capturedAt", location, is_favorite as "isFavorite",
              associated_profile_ids as "associatedProfileIds", media_ids as "mediaIds", tags,
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM memories
       WHERE space_id = $1 AND deleted_at IS NULL
         AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')) @@ plainto_tsquery('english', $2)
       ORDER BY ts_rank_cd(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')), plainto_tsquery('english', $2)) DESC
       LIMIT $3`,
      [spaceId, trimmed, limit]
    );
    return res.rows;
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    const existing = await this.findMemoryById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.db.query(
      `UPDATE memories
       SET title = $1, content = $2, format = $3, captured_at = $4, location = $5,
           is_favorite = $6, associated_profile_ids = $7, media_ids = $8, tags = $9, updated_at = $10
       WHERE id = $11`,
      [
        merged.title,
        merged.content || null,
        merged.format,
        merged.capturedAt,
        merged.location || null,
        merged.isFavorite,
        merged.associatedProfileIds,
        merged.mediaIds,
        merged.tags,
        merged.updatedAt,
        id,
      ]
    );
    return merged;
  }

  async softDeleteMemory(id: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE memories SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return (res.rowCount || 0) > 0;
  }

  async listDeletedMemories(spaceId: string): Promise<Memory[]> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", author_id as "authorId", title, content, format,
              captured_at::text as "capturedAt", location, is_favorite as "isFavorite",
              associated_profile_ids as "associatedProfileIds", media_ids as "mediaIds", tags,
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM memories
       WHERE space_id = $1 AND deleted_at IS NOT NULL
       ORDER BY deleted_at DESC`,
      [spaceId]
    );
    return res.rows;
  }

  async restoreMemory(id: string): Promise<Memory | null> {
    await this.db.query(
      `UPDATE memories SET deleted_at = NULL, updated_at = NOW() WHERE id = $1 AND deleted_at IS NOT NULL`,
      [id]
    );
    return this.findMemoryById(id, false);
  }

  async hardDeleteMemory(id: string): Promise<boolean> {
    const res = await this.db.query(`DELETE FROM memories WHERE id = $1 AND deleted_at IS NOT NULL`, [id]);
    return (res.rowCount || 0) > 0;
  }
}

// ----------------------------------------------------------------------------
// 4. Media Repository
// ----------------------------------------------------------------------------
export interface SpaceQuota {
  spaceId: string;
  usedBytes: number;
  maxBytes: number;
}

export interface OcrTranscript {
  id: string;
  mediaId: string;
  spaceId: string;
  status: string;
  extractedText: string;
  confidence: number;
  wordCount: number;
  language: string;
  pageNumber: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface MediaRepository {
  createAsset(asset: MediaAsset): Promise<MediaAsset>;
  findAssetById(id: string): Promise<MediaAsset | null>;
  updateAsset(id: string, updates: Partial<MediaAsset>): Promise<MediaAsset | null>;
  listAssets(spaceId: string): Promise<MediaAsset[]>;
  getSpaceQuota(spaceId: string): Promise<SpaceQuota>;
  incrementSpaceUsage(spaceId: string, bytesDelta: number): Promise<SpaceQuota>;
  saveOcrTranscript(transcript: OcrTranscript): Promise<OcrTranscript>;
  findOcrTranscriptByMediaId(mediaId: string): Promise<OcrTranscript[]>;
  searchTranscripts(spaceId: string, query: string): Promise<OcrTranscript[]>;
}

export class PostgresMediaRepository implements MediaRepository {
  constructor(private db: DatabaseClient) {}

  async createAsset(asset: MediaAsset): Promise<MediaAsset> {
    await this.db.query(
      `INSERT INTO media_assets (id, space_id, original_name, mime_type, size_bytes, status, storage_key, public_url, derivatives, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        asset.id,
        asset.spaceId,
        asset.originalName,
        asset.mimeType,
        asset.sizeBytes,
        asset.status,
        asset.storageKey,
        asset.publicUrl || null,
        JSON.stringify(asset.derivatives || {}),
        JSON.stringify(asset.metadata || {}),
        asset.createdAt,
        asset.updatedAt,
      ]
    );
    return asset;
  }

  async findAssetById(id: string): Promise<MediaAsset | null> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", original_name as "originalName", mime_type as "mimeType",
              size_bytes::bigint as "sizeBytes", status, storage_key as "storageKey", public_url as "publicUrl",
              derivatives, metadata, created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM media_assets WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      ...r,
      sizeBytes: Number(r.sizeBytes),
      derivatives: typeof r.derivatives === "string" ? JSON.parse(r.derivatives) : (r.derivatives || {}),
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : (r.metadata || {}),
    };
  }

  async updateAsset(id: string, updates: Partial<MediaAsset>): Promise<MediaAsset | null> {
    const existing = await this.findAssetById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.db.query(
      `UPDATE media_assets
       SET status = $1, public_url = $2, derivatives = $3, metadata = $4, updated_at = $5
       WHERE id = $6`,
      [
        merged.status,
        merged.publicUrl || null,
        JSON.stringify(merged.derivatives || {}),
        JSON.stringify(merged.metadata || {}),
        merged.updatedAt,
        id,
      ]
    );
    return merged;
  }

  async listAssets(spaceId: string): Promise<MediaAsset[]> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", original_name as "originalName", mime_type as "mimeType",
              size_bytes::bigint as "sizeBytes", status, storage_key as "storageKey", public_url as "publicUrl",
              derivatives, metadata, created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM media_assets WHERE space_id = $1 ORDER BY created_at DESC`,
      [spaceId]
    );
    return res.rows.map((r: any) => ({
      ...r,
      sizeBytes: Number(r.sizeBytes),
      derivatives: typeof r.derivatives === "string" ? JSON.parse(r.derivatives) : (r.derivatives || {}),
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : (r.metadata || {}),
    }));
  }

  async getSpaceQuota(spaceId: string): Promise<SpaceQuota> {
    const res = await this.db.query(
      `SELECT space_id as "spaceId", used_bytes::bigint as "usedBytes", max_bytes::bigint as "maxBytes"
       FROM space_storage_quotas WHERE space_id = $1 LIMIT 1`,
      [spaceId]
    );
    if (res.rows[0]) {
      return {
        spaceId,
        usedBytes: Number(res.rows[0].usedBytes),
        maxBytes: Number(res.rows[0].maxBytes),
      };
    }
    // Default: 500 MB quota
    return {
      spaceId,
      usedBytes: 0,
      maxBytes: 524288000,
    };
  }

  async incrementSpaceUsage(spaceId: string, bytesDelta: number): Promise<SpaceQuota> {
    const res = await this.db.query(
      `INSERT INTO space_storage_quotas (space_id, used_bytes, max_bytes, updated_at)
       VALUES ($1, GREATEST($2::bigint, 0), 524288000, NOW())
       ON CONFLICT (space_id)
       DO UPDATE SET used_bytes = GREATEST(space_storage_quotas.used_bytes + $2::bigint, 0), updated_at = NOW()
       RETURNING space_id as "spaceId", used_bytes::bigint as "usedBytes", max_bytes::bigint as "maxBytes"`,
      [spaceId, bytesDelta]
    );
    return {
      spaceId,
      usedBytes: Number(res.rows[0].usedBytes),
      maxBytes: Number(res.rows[0].maxBytes),
    };
  }

  async saveOcrTranscript(transcript: OcrTranscript): Promise<OcrTranscript> {
    await this.db.query(
      `INSERT INTO media_ocr_transcripts (id, media_id, space_id, status, extracted_text, confidence, word_count, language, page_number, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, NOW()))`,
      [
        transcript.id,
        transcript.mediaId,
        transcript.spaceId,
        transcript.status,
        transcript.extractedText,
        transcript.confidence,
        transcript.wordCount,
        transcript.language,
        transcript.pageNumber,
        JSON.stringify(transcript.metadata || {}),
        transcript.createdAt || new Date().toISOString(),
      ]
    );
    return transcript;
  }

  async findOcrTranscriptByMediaId(mediaId: string): Promise<OcrTranscript[]> {
    const res = await this.db.query(
      `SELECT id, media_id as "mediaId", space_id as "spaceId", status, extracted_text as "extractedText",
              confidence::numeric as "confidence", word_count as "wordCount", language, page_number as "pageNumber",
              metadata, created_at::text as "createdAt"
       FROM media_ocr_transcripts
       WHERE media_id = $1
       ORDER BY page_number ASC`,
      [mediaId]
    );
    return res.rows.map((r: any) => ({
      ...r,
      confidence: parseFloat(r.confidence || "0"),
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : (r.metadata || {}),
    }));
  }

  async searchTranscripts(spaceId: string, query: string): Promise<OcrTranscript[]> {
    const res = await this.db.query(
      `SELECT id, media_id as "mediaId", space_id as "spaceId", status, extracted_text as "extractedText",
              confidence::numeric as "confidence", word_count as "wordCount", language, page_number as "pageNumber",
              metadata, created_at::text as "createdAt"
       FROM media_ocr_transcripts
       WHERE space_id = $1 AND to_tsvector('english', extracted_text) @@ plainto_tsquery('english', $2)
       ORDER BY created_at DESC
       LIMIT 50`,
      [spaceId, query]
    );
    return res.rows.map((r: any) => ({
      ...r,
      confidence: parseFloat(r.confidence || "0"),
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : (r.metadata || {}),
    }));
  }
}

// ----------------------------------------------------------------------------
// 5. Book Repository
// ----------------------------------------------------------------------------
export interface BookRepository {
  createBook(book: BookDocument): Promise<BookDocument>;
  findBookById(id: string): Promise<BookDocument | null>;
  listBooks(spaceId: string): Promise<BookDocument[]>;
  updateBook?(id: string, updates: Partial<Pick<BookDocument, "title" | "subtitle" | "format" | "coverColor" | "foilStamping" | "coverTitle" | "spineText">>): Promise<BookDocument | null>;
  saveSpread(bookId: string, spread: BookSpread, client?: any): Promise<void>;
  freezeEdition(bookId: string, editionHash: string): Promise<void>;
}

export class PostgresBookRepository implements BookRepository {
  constructor(private db: DatabaseClient) {}

  async createBook(book: BookDocument): Promise<BookDocument> {
    await this.db.transaction(async (client) => {
      await client.query(
        `INSERT INTO books (id, space_id, title, subtitle, format, cover_color, foil_stamping, cover_title, spine_text, version, is_frozen_for_print, frozen_edition_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          book.id,
          book.spaceId,
          book.title,
          book.subtitle || null,
          book.format,
          book.coverColor,
          book.foilStamping,
          book.coverTitle,
          book.spineText || null,
          book.version,
          book.isFrozenForPrint,
          book.frozenEditionHash || null,
          book.createdAt,
          book.updatedAt,
        ]
      );

      for (const spread of book.spreads) {
        await this.saveSpread(book.id, spread, client);
      }
    });

    return book;
  }

  async findBookById(id: string): Promise<BookDocument | null> {
    const bookRes = await this.db.query(
      `SELECT id, space_id as "spaceId", title, subtitle, format,
              cover_color as "coverColor", foil_stamping as "foilStamping",
              cover_title as "coverTitle", spine_text as "spineText",
              version, is_frozen_for_print as "isFrozenForPrint",
              frozen_edition_hash as "frozenEditionHash",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM books WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!bookRes.rows[0]) return null;
    const b = bookRes.rows[0];

    const spreadsRes = await this.db.query(
      `SELECT id, spread_index as "spreadIndex", left_page as "leftPage", right_page as "rightPage"
       FROM book_spreads WHERE book_id = $1 ORDER BY spread_index ASC`,
      [id]
    );

    const spreads: BookSpread[] = spreadsRes.rows.map((s: any) => ({
      id: s.id,
      spreadIndex: s.spreadIndex,
      leftPage: typeof s.leftPage === "string" ? JSON.parse(s.leftPage) : s.leftPage,
      rightPage: typeof s.rightPage === "string" ? JSON.parse(s.rightPage) : s.rightPage,
    }));

    return {
      ...b,
      spreads,
    };
  }

  async listBooks(spaceId: string): Promise<BookDocument[]> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", title, subtitle, format,
              cover_color as "coverColor", foil_stamping as "foilStamping",
              cover_title as "coverTitle", spine_text as "spineText",
              version, is_frozen_for_print as "isFrozenForPrint",
              frozen_edition_hash as "frozenEditionHash",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM books WHERE space_id = $1 ORDER BY updated_at DESC`,
      [spaceId]
    );
    if (res.rows.length === 0) return [];
    const bookIds = res.rows.map((b: any) => b.id);
    const spreadsRes = await this.db.query(
      `SELECT id, book_id as "bookId", spread_index as "spreadIndex", left_page as "leftPage", right_page as "rightPage"
       FROM book_spreads WHERE book_id = ANY($1) ORDER BY spread_index ASC`,
      [bookIds]
    );
    const spreadsByBook = new Map<string, BookSpread[]>();
    for (const s of spreadsRes.rows) {
      const spread: BookSpread = {
        id: s.id,
        spreadIndex: s.spreadIndex,
        leftPage: typeof s.leftPage === "string" ? JSON.parse(s.leftPage) : s.leftPage,
        rightPage: typeof s.rightPage === "string" ? JSON.parse(s.rightPage) : s.rightPage,
      };
      const existing = spreadsByBook.get(s.bookId) || [];
      existing.push(spread);
      spreadsByBook.set(s.bookId, existing);
    }
    return res.rows.map((b: any) => ({ ...b, spreads: spreadsByBook.get(b.id) || [] }));
  }

  async updateBook(
    id: string,
    updates: Partial<Pick<BookDocument, "title" | "subtitle" | "format" | "coverColor" | "foilStamping" | "coverTitle" | "spineText">>
  ): Promise<BookDocument | null> {
    const existing = await this.findBookById(id);
    if (!existing) return null;
    const merged: BookDocument = {
      ...existing,
      ...updates,
      version: (existing.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.db.query(
      `UPDATE books
       SET title = $1, subtitle = $2, format = $3, cover_color = $4, foil_stamping = $5,
           cover_title = $6, spine_text = $7, version = $8, updated_at = $9
       WHERE id = $10`,
      [
        merged.title,
        merged.subtitle || null,
        merged.format,
        merged.coverColor,
        merged.foilStamping,
        merged.coverTitle,
        merged.spineText || null,
        merged.version,
        merged.updatedAt,
        id,
      ]
    );
    return merged;
  }

  async saveSpread(bookId: string, spread: BookSpread, client?: any): Promise<void> {
    const executor = client || this.db;
    await executor.query(
      `INSERT INTO book_spreads (id, book_id, spread_index, left_page, right_page, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id)
       DO UPDATE SET spread_index = $3, left_page = $4, right_page = $5`,
      [
        spread.id,
        bookId,
        spread.spreadIndex,
        spread.leftPage ? JSON.stringify(spread.leftPage) : null,
        spread.rightPage ? JSON.stringify(spread.rightPage) : null,
      ]
    );
  }

  async freezeEdition(bookId: string, editionHash: string): Promise<void> {
    await this.db.query(
      `UPDATE books
       SET is_frozen_for_print = TRUE, frozen_edition_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [editionHash, bookId]
    );
  }
}

// ----------------------------------------------------------------------------
// 6. Transactional Outbox Repository
// ----------------------------------------------------------------------------
export interface OutboxRecord {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  status: "pending" | "published" | "failed";
  retryCount: number;
  errorMessage?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export interface OutboxRepository {
  stageEvent(
    event: { id?: string; eventType: string; aggregateType: string; aggregateId: string; payload: Record<string, any> },
    client?: any
  ): Promise<OutboxRecord>;
  fetchPending(limit?: number): Promise<OutboxRecord[]>;
  relayPending?(
    publisher: (event: OutboxRecord) => Promise<void>,
    limit?: number
  ): Promise<{ publishedCount: number; failedCount: number }>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export class PostgresOutboxRepository implements OutboxRepository {
  constructor(private db: DatabaseClient) {}

  async stageEvent(
    event: { id?: string; eventType: string; aggregateType: string; aggregateId: string; payload: Record<string, any> },
    client?: any
  ): Promise<OutboxRecord> {
    const id = event.id || crypto.randomUUID();
    const executor = client || this.db;

    await executor.query(
      `INSERT INTO outbox_events (id, event_type, aggregate_type, aggregate_id, payload, status, retry_count, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', 0, NOW())`,
      [id, event.eventType, event.aggregateType, event.aggregateId, JSON.stringify(event.payload)]
    );

    return {
      id,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
      status: "pending",
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  async fetchPending(limit = 50): Promise<OutboxRecord[]> {
    const res = await this.db.query(
      `SELECT id, event_type as "eventType", aggregate_type as "aggregateType",
              aggregate_id as "aggregateId", payload, status, retry_count as "retryCount",
              error_message as "errorMessage", created_at::text as "createdAt",
              processed_at::text as "processedAt"
       FROM outbox_events
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  async markPublished(id: string): Promise<void> {
    await this.db.query(
      `UPDATE outbox_events
       SET status = 'published', processed_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db.query(
      `UPDATE outbox_events
       SET status = 'failed', retry_count = retry_count + 1, error_message = $1
       WHERE id = $2`,
      [error, id]
    );
  }

  async relayPending(
    publisher: (event: OutboxRecord) => Promise<void>,
    limit = 50
  ): Promise<{ publishedCount: number; failedCount: number }> {
    return this.db.transaction(async (client) => {
      const res = await client.query(
        `SELECT id, event_type as "eventType", aggregate_type as "aggregateType",
                aggregate_id as "aggregateId", payload, status, retry_count as "retryCount",
                error_message as "errorMessage", created_at::text as "createdAt",
                processed_at::text as "processedAt"
         FROM outbox_events
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [limit]
      );

      let publishedCount = 0;
      let failedCount = 0;

      for (const row of res.rows as OutboxRecord[]) {
        const parsedRow: OutboxRecord = {
          ...row,
          payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
        };
        try {
          await publisher(parsedRow);
          await client.query(
            `UPDATE outbox_events SET status = 'published', processed_at = NOW() WHERE id = $1`,
            [row.id]
          );
          publishedCount++;
        } catch (err: any) {
          await client.query(
            `UPDATE outbox_events
             SET status = CASE WHEN retry_count + 1 >= 5 THEN 'failed' ELSE 'pending' END,
                 retry_count = retry_count + 1,
                 error_message = $1
             WHERE id = $2`,
            [err?.message || "Outbox publish failure", row.id]
          );
          failedCount++;
        }
      }

      return { publishedCount, failedCount };
    });
  }
}

// ----------------------------------------------------------------------------
// 7. Collaboration Repository
// ----------------------------------------------------------------------------
export interface SpaceMemberRecord {
  id: string;
  spaceId: string;
  userId: string;
  role: "owner" | "admin" | "contributor" | "viewer";
  permissions: Record<string, boolean>;
  joinedAt: string;
  updatedAt: string;
}

export interface SpaceInvitationRecord {
  id: string;
  spaceId: string;
  inviterId: string;
  inviteeEmail: string;
  role: string;
  tokenHash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

export interface CollaborationRepository {
  addMember(member: Omit<SpaceMemberRecord, "joinedAt" | "updatedAt">): Promise<SpaceMemberRecord>;
  getMembers(spaceId: string): Promise<SpaceMemberRecord[]>;
  getMember(spaceId: string, userId: string): Promise<SpaceMemberRecord | null>;
  updateMemberRole?(spaceId: string, userId: string, role: SpaceMemberRecord["role"], permissions: Record<string, boolean>): Promise<SpaceMemberRecord | null>;
  removeMember(spaceId: string, userId: string): Promise<boolean>;
  createInvitation(invitation: Omit<SpaceInvitationRecord, "createdAt">): Promise<SpaceInvitationRecord>;
  listInvitations?(spaceId: string): Promise<SpaceInvitationRecord[]>;
  revokeInvitation?(id: string, spaceId: string): Promise<boolean>;
  getInvitationByTokenHash(tokenHash: string): Promise<SpaceInvitationRecord | null>;
  acceptInvitation(id: string): Promise<void>;
}

export class PostgresCollaborationRepository implements CollaborationRepository {
  constructor(private db: DatabaseClient) {}

  async addMember(member: Omit<SpaceMemberRecord, "joinedAt" | "updatedAt">): Promise<SpaceMemberRecord> {
    await this.db.query(
      `INSERT INTO space_members (id, space_id, user_id, role, permissions, joined_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (space_id, user_id)
       DO UPDATE SET role = $4, permissions = $5, updated_at = NOW()`,
      [member.id, member.spaceId, member.userId, member.role, JSON.stringify(member.permissions)]
    );

    return {
      ...member,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getMembers(spaceId: string): Promise<SpaceMemberRecord[]> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", user_id as "userId", role, permissions,
              joined_at::text as "joinedAt", updated_at::text as "updatedAt"
       FROM space_members WHERE space_id = $1 ORDER BY joined_at ASC`,
      [spaceId]
    );
    return res.rows;
  }

  async getMember(spaceId: string, userId: string): Promise<SpaceMemberRecord | null> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", user_id as "userId", role, permissions,
              joined_at::text as "joinedAt", updated_at::text as "updatedAt"
       FROM space_members WHERE space_id = $1 AND user_id = $2 LIMIT 1`,
      [spaceId, userId]
    );
    return res.rows[0] || null;
  }

  async removeMember(spaceId: string, userId: string): Promise<boolean> {
    const res = await this.db.query(
      `DELETE FROM space_members WHERE space_id = $1 AND user_id = $2`,
      [spaceId, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  async updateMemberRole(
    spaceId: string,
    userId: string,
    role: SpaceMemberRecord["role"],
    permissions: Record<string, boolean>
  ): Promise<SpaceMemberRecord | null> {
    const res = await this.db.query(
      `UPDATE space_members SET role = $1, permissions = $2, updated_at = NOW()
       WHERE space_id = $3 AND user_id = $4
       RETURNING id, space_id as "spaceId", user_id as "userId", role, permissions,
                 joined_at::text as "joinedAt", updated_at::text as "updatedAt"`,
      [role, JSON.stringify(permissions), spaceId, userId]
    );
    return res.rows[0] || null;
  }

  async createInvitation(invitation: Omit<SpaceInvitationRecord, "createdAt">): Promise<SpaceInvitationRecord> {
    await this.db.query(
      `INSERT INTO space_invitations (id, space_id, inviter_id, invitee_email, role, token_hash, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        invitation.id,
        invitation.spaceId,
        invitation.inviterId,
        invitation.inviteeEmail.toLowerCase().trim(),
        invitation.role,
        invitation.tokenHash,
        invitation.status,
        invitation.expiresAt,
      ]
    );

    return {
      ...invitation,
      createdAt: new Date().toISOString(),
    };
  }

  async getInvitationByTokenHash(tokenHash: string): Promise<SpaceInvitationRecord | null> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", inviter_id as "inviterId",
              invitee_email as "inviteeEmail", role, token_hash as "tokenHash",
              status, expires_at::text as "expiresAt", created_at::text as "createdAt"
       FROM space_invitations WHERE token_hash = $1 LIMIT 1`,
      [tokenHash]
    );
    return res.rows[0] || null;
  }

  async acceptInvitation(id: string): Promise<void> {
    await this.db.query(
      `UPDATE space_invitations SET status = 'accepted' WHERE id = $1`,
      [id]
    );
  }

  async listInvitations(spaceId: string): Promise<SpaceInvitationRecord[]> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", inviter_id as "inviterId",
              invitee_email as "inviteeEmail", role, token_hash as "tokenHash",
              status, expires_at::text as "expiresAt", created_at::text as "createdAt"
       FROM space_invitations WHERE space_id = $1 ORDER BY created_at DESC`,
      [spaceId]
    );
    return res.rows;
  }

  async revokeInvitation(id: string, spaceId: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE space_invitations SET status = 'revoked' WHERE id = $1 AND space_id = $2 AND status = 'pending'`,
      [id, spaceId]
    );
    return (res.rowCount || 0) > 0;
  }
}

// ----------------------------------------------------------------------------
// 8. Commerce Repository
// ----------------------------------------------------------------------------
export interface PrintOrderRecord {
  id: string;
  spaceId: string;
  userId: string;
  bookId: string;
  status: string;
  totalCents: number;
  currency: string;
  shippingAddress: Record<string, any>;
  printSpec: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CommerceRepository {
  createOrder(order: Omit<PrintOrderRecord, "createdAt" | "updatedAt">): Promise<PrintOrderRecord>;
  getOrderById(id: string): Promise<PrintOrderRecord | null>;
  listOrders(spaceId: string): Promise<PrintOrderRecord[]>;
  listOrdersByUser?(userId: string): Promise<PrintOrderRecord[]>;
  updateOrderStatus(id: string, status: string): Promise<void>;
}

export class PostgresCommerceRepository implements CommerceRepository {
  constructor(private db: DatabaseClient) {}

  async createOrder(order: Omit<PrintOrderRecord, "createdAt" | "updatedAt">): Promise<PrintOrderRecord> {
    await this.db.query(
      `INSERT INTO print_orders (id, space_id, user_id, book_id, status, total_cents, currency, shipping_address, print_spec, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        order.id,
        order.spaceId,
        order.userId,
        order.bookId,
        order.status,
        order.totalCents,
        order.currency,
        JSON.stringify(order.shippingAddress),
        JSON.stringify(order.printSpec),
      ]
    );

    return {
      ...order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getOrderById(id: string): Promise<PrintOrderRecord | null> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", user_id as "userId", book_id as "bookId",
              status, total_cents as "totalCents", currency, shipping_address as "shippingAddress",
              print_spec as "printSpec", created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM print_orders WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async listOrders(spaceId: string): Promise<PrintOrderRecord[]> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", user_id as "userId", book_id as "bookId",
              status, total_cents as "totalCents", currency, shipping_address as "shippingAddress",
              print_spec as "printSpec", created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM print_orders WHERE space_id = $1 ORDER BY created_at DESC`,
      [spaceId]
    );
    return res.rows;
  }

  async listOrdersByUser(userId: string): Promise<PrintOrderRecord[]> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", user_id as "userId", book_id as "bookId",
              status, total_cents as "totalCents", currency, shipping_address as "shippingAddress",
              print_spec as "printSpec", created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM print_orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await this.db.query(
      `UPDATE print_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );
  }
}

// ----------------------------------------------------------------------------
// 9. Notification Repository
// ----------------------------------------------------------------------------
export interface NotificationRecord {
  id: string;
  userId: string;
  spaceId?: string | null;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationRepository {
  createNotification(notification: Omit<NotificationRecord, "createdAt" | "isRead" | "readAt">): Promise<NotificationRecord>;
  listNotifications(userId: string, unreadOnly?: boolean): Promise<NotificationRecord[]>;
  markRead(id: string, userId: string): Promise<boolean>;
  markAllRead(userId: string): Promise<number>;
}

export class PostgresNotificationRepository implements NotificationRepository {
  constructor(private db: DatabaseClient) {}

  async createNotification(
    notification: Omit<NotificationRecord, "createdAt" | "isRead" | "readAt">
  ): Promise<NotificationRecord> {
    const now = new Date().toISOString();
    await this.db.query(
      `INSERT INTO notifications (id, user_id, space_id, type, title, body, data, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8)`,
      [
        notification.id,
        notification.userId,
        notification.spaceId || null,
        notification.type,
        notification.title,
        notification.body,
        JSON.stringify(notification.data || {}),
        now,
      ]
    );
    return {
      ...notification,
      isRead: false,
      readAt: null,
      createdAt: now,
    };
  }

  async listNotifications(userId: string, unreadOnly = false): Promise<NotificationRecord[]> {
    const sql = unreadOnly
      ? `SELECT id, user_id as "userId", space_id as "spaceId", type, title, body, data,
                is_read as "isRead", read_at::text as "readAt", created_at::text as "createdAt"
         FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT 100`
      : `SELECT id, user_id as "userId", space_id as "spaceId", type, title, body, data,
                is_read as "isRead", read_at::text as "readAt", created_at::text as "createdAt"
         FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`;
    const res = await this.db.query(sql, [userId]);
    return res.rows.map((r: any) => ({
      ...r,
      data: typeof r.data === "string" ? JSON.parse(r.data) : (r.data || {}),
    }));
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_read = FALSE`,
      [id, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const res = await this.db.query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return res.rowCount || 0;
  }
}


// ----------------------------------------------------------------------------
// 10. Collections & Memory Comments Repositories
// ----------------------------------------------------------------------------
export interface CollectionRecord {
  id: string;
  spaceId: string;
  title: string;
  description?: string | null;
  coverMemoryId?: string | null;
  memoryIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryCommentRecord {
  id: string;
  memoryId: string;
  spaceId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CollectionRepository {
  createCollection(col: Omit<CollectionRecord, "createdAt" | "updatedAt" | "memoryIds">): Promise<CollectionRecord>;
  listCollections(spaceId: string): Promise<CollectionRecord[]>;
  findCollectionById(id: string): Promise<CollectionRecord | null>;
  updateCollection(id: string, updates: Partial<Pick<CollectionRecord, "title" | "description" | "coverMemoryId">>): Promise<CollectionRecord | null>;
  deleteCollection(id: string): Promise<boolean>;
  addMemory(collectionId: string, memoryId: string, sortOrder?: number): Promise<void>;
  removeMemory(collectionId: string, memoryId: string): Promise<boolean>;
}

export class PostgresCollectionRepository implements CollectionRepository {
  constructor(private db: DatabaseClient) {}

  async createCollection(
    col: Omit<CollectionRecord, "createdAt" | "updatedAt" | "memoryIds">
  ): Promise<CollectionRecord> {
    const now = new Date().toISOString();
    await this.db.query(
      `INSERT INTO memory_collections (id, space_id, title, description, cover_memory_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [col.id, col.spaceId, col.title, col.description || null, col.coverMemoryId || null, now, now]
    );
    return { ...col, memoryIds: [], createdAt: now, updatedAt: now };
  }

  async listCollections(spaceId: string): Promise<CollectionRecord[]> {
    const res = await this.db.query(
      `SELECT c.id, c.space_id as "spaceId", c.title, c.description, c.cover_memory_id as "coverMemoryId",
              c.created_at::text as "createdAt", c.updated_at::text as "updatedAt",
              COALESCE(array_agg(cm.memory_id ORDER BY cm.sort_order ASC) FILTER (WHERE cm.memory_id IS NOT NULL), '{}') as "memoryIds"
       FROM memory_collections c
       LEFT JOIN collection_memories cm ON cm.collection_id = c.id
       WHERE c.space_id = $1 AND c.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [spaceId]
    );
    return res.rows;
  }

  async findCollectionById(id: string): Promise<CollectionRecord | null> {
    const res = await this.db.query(
      `SELECT c.id, c.space_id as "spaceId", c.title, c.description, c.cover_memory_id as "coverMemoryId",
              c.created_at::text as "createdAt", c.updated_at::text as "updatedAt",
              COALESCE(array_agg(cm.memory_id ORDER BY cm.sort_order ASC) FILTER (WHERE cm.memory_id IS NOT NULL), '{}') as "memoryIds"
       FROM memory_collections c
       LEFT JOIN collection_memories cm ON cm.collection_id = c.id
       WHERE c.id = $1 AND c.deleted_at IS NULL
       GROUP BY c.id
       LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async updateCollection(
    id: string,
    updates: Partial<Pick<CollectionRecord, "title" | "description" | "coverMemoryId">>
  ): Promise<CollectionRecord | null> {
    const existing = await this.findCollectionById(id);
    if (!existing) return null;
    const title = updates.title !== undefined ? updates.title : existing.title;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const coverMemoryId = updates.coverMemoryId !== undefined ? updates.coverMemoryId : existing.coverMemoryId;
    await this.db.query(
      `UPDATE memory_collections SET title = $1, description = $2, cover_memory_id = $3, updated_at = NOW() WHERE id = $4`,
      [title, description || null, coverMemoryId || null, id]
    );
    return this.findCollectionById(id);
  }

  async deleteCollection(id: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE memory_collections SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return (res.rowCount || 0) > 0;
  }

  async addMemory(collectionId: string, memoryId: string, sortOrder = 0): Promise<void> {
    await this.db.query(
      `INSERT INTO collection_memories (collection_id, memory_id, sort_order, added_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (collection_id, memory_id) DO UPDATE SET sort_order = $3`,
      [collectionId, memoryId, sortOrder]
    );
    await this.db.query(`UPDATE memory_collections SET updated_at = NOW() WHERE id = $1`, [collectionId]);
  }

  async removeMemory(collectionId: string, memoryId: string): Promise<boolean> {
    const res = await this.db.query(
      `DELETE FROM collection_memories WHERE collection_id = $1 AND memory_id = $2`,
      [collectionId, memoryId]
    );
    return (res.rowCount || 0) > 0;
  }
}

export interface MemoryCommentRepository {
  createComment(comment: Omit<MemoryCommentRecord, "createdAt">): Promise<MemoryCommentRecord>;
  listComments(memoryId: string): Promise<MemoryCommentRecord[]>;
  deleteComment(id: string, authorId: string): Promise<boolean>;
}

export class PostgresMemoryCommentRepository implements MemoryCommentRepository {
  constructor(private db: DatabaseClient) {}

  async createComment(comment: Omit<MemoryCommentRecord, "createdAt">): Promise<MemoryCommentRecord> {
    const now = new Date().toISOString();
    await this.db.query(
      `INSERT INTO memory_comments (id, memory_id, space_id, author_id, author_name, body, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [comment.id, comment.memoryId, comment.spaceId, comment.authorId, comment.authorName, comment.body, now]
    );
    return { ...comment, createdAt: now };
  }

  async listComments(memoryId: string): Promise<MemoryCommentRecord[]> {
    const res = await this.db.query(
      `SELECT id, memory_id as "memoryId", space_id as "spaceId", author_id as "authorId",
              author_name as "authorName", body, created_at::text as "createdAt"
       FROM memory_comments
       WHERE memory_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [memoryId]
    );
    return res.rows;
  }

  async deleteComment(id: string, authorId: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE memory_comments SET deleted_at = NOW() WHERE id = $1 AND author_id = $2 AND deleted_at IS NULL`,
      [id, authorId]
    );
    return (res.rowCount || 0) > 0;
  }
}

// ----------------------------------------------------------------------------
// 11. Memory Reactions Repository
// ----------------------------------------------------------------------------
export type MemoryReactionKind = "heart" | "warmth" | "tearsOfJoy" | "gratitude";

export interface MemoryReactionState {
  memoryId: string;
  counts: Record<string, number>;
  selectedKinds: MemoryReactionKind[];
}

export interface MemoryReactionRepository {
  getReactionState(memoryId: string, userId: string): Promise<MemoryReactionState>;
  toggleReaction(
    memoryId: string,
    spaceId: string,
    userId: string,
    kind: MemoryReactionKind
  ): Promise<{ state: MemoryReactionState; active: boolean }>;
  setReaction(
    memoryId: string,
    spaceId: string,
    userId: string,
    kind: MemoryReactionKind,
    active: boolean
  ): Promise<MemoryReactionState>;
}

export class PostgresMemoryReactionRepository implements MemoryReactionRepository {
  constructor(private db: DatabaseClient) {}

  async getReactionState(memoryId: string, userId: string): Promise<MemoryReactionState> {
    const res = await this.db.query<{
      kind: MemoryReactionKind;
      count: number;
      selected: boolean;
    }>(
      `SELECT kind, COUNT(*)::int as count, BOOL_OR(user_id = $2) as selected
       FROM memory_reactions
       WHERE memory_id = $1
       GROUP BY kind`,
      [memoryId, userId]
    );
    const counts: Record<string, number> = {};
    const selectedKinds: MemoryReactionKind[] = [];
    for (const row of res.rows) {
      counts[row.kind] = Number(row.count) || 0;
      if (row.selected) {
        selectedKinds.push(row.kind);
      }
    }
    return { memoryId, counts, selectedKinds };
  }

  async toggleReaction(
    memoryId: string,
    spaceId: string,
    userId: string,
    kind: MemoryReactionKind
  ): Promise<{ state: MemoryReactionState; active: boolean }> {
    const active = await this.db.transaction(async (client) => {
      const del = await client.query(
        `DELETE FROM memory_reactions
         WHERE memory_id = $1 AND user_id = $2 AND kind = $3`,
        [memoryId, userId, kind]
      );
      if ((del.rowCount || 0) > 0) {
        return false;
      }
      await client.query(
        `INSERT INTO memory_reactions (id, memory_id, space_id, user_id, kind, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (memory_id, user_id, kind) DO NOTHING`,
        [crypto.randomUUID(), memoryId, spaceId, userId, kind]
      );
      return true;
    });
    const state = await this.getReactionState(memoryId, userId);
    return { state, active };
  }

  async setReaction(
    memoryId: string,
    spaceId: string,
    userId: string,
    kind: MemoryReactionKind,
    active: boolean
  ): Promise<MemoryReactionState> {
    if (active) {
      await this.db.query(
        `INSERT INTO memory_reactions (id, memory_id, space_id, user_id, kind, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (memory_id, user_id, kind) DO NOTHING`,
        [crypto.randomUUID(), memoryId, spaceId, userId, kind]
      );
    } else {
      await this.db.query(
        `DELETE FROM memory_reactions
         WHERE memory_id = $1 AND user_id = $2 AND kind = $3`,
        [memoryId, userId, kind]
      );
    }
    return this.getReactionState(memoryId, userId);
  }
}
