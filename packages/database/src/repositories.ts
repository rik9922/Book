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

// ----------------------------------------------------------------------------
// 1. User Repository
// ----------------------------------------------------------------------------
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord>;
  createSession(session: UserSessionRecord): Promise<void>;
  findSessionByToken(refreshTokenHash: string): Promise<UserSessionRecord | null>;
  deleteSession(id: string): Promise<void>;
}

export class PostgresUserRepository implements UserRepository {
  constructor(private db: DatabaseClient) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const res = await this.db.query(
      `SELECT id, email, full_name as "fullName", password_hash as "passwordHash",
              avatar_url as "avatarUrl", is_verified as "isVerified",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const res = await this.db.query(
      `SELECT id, email, full_name as "fullName", password_hash as "passwordHash",
              avatar_url as "avatarUrl", is_verified as "isVerified",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async create(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord> {
    const now = new Date().toISOString();
    await this.db.query(
      `INSERT INTO users (id, email, full_name, password_hash, avatar_url, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        user.email.toLowerCase().trim(),
        user.fullName,
        user.passwordHash,
        user.avatarUrl || null,
        user.isVerified ?? false,
        now,
        now,
      ]
    );
    return {
      ...user,
      createdAt: now,
      updatedAt: now,
    };
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
       FROM user_sessions WHERE refresh_token_hash = $1 AND expires_at > NOW() LIMIT 1`,
      [refreshTokenHash]
    );
    return res.rows[0] || null;
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.query(`DELETE FROM user_sessions WHERE id = $1`, [id]);
  }
}

// ----------------------------------------------------------------------------
// 2. Space & Profile Repository
// ----------------------------------------------------------------------------
export interface SpaceRepository {
  createSpace(space: MemorySpace): Promise<MemorySpace>;
  findSpaceById(id: string): Promise<MemorySpace | null>;
  listSpaces(ownerId?: string): Promise<MemorySpace[]>;
  createProfile(profile: SpaceProfile): Promise<SpaceProfile>;
  listProfiles(spaceId: string): Promise<SpaceProfile[]>;
  findProfileById(id: string): Promise<SpaceProfile | null>;
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
       FROM memory_spaces WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async listSpaces(ownerId?: string): Promise<MemorySpace[]> {
    if (ownerId) {
      const res = await this.db.query(
        `SELECT id, owner_id as "ownerId", name, description, space_type as "type",
                cover_url as "coverUrl", created_at::text as "createdAt", updated_at::text as "updatedAt"
         FROM memory_spaces WHERE owner_id = $1 ORDER BY updated_at DESC`,
        [ownerId]
      );
      return res.rows;
    }
    const res = await this.db.query(
      `SELECT id, owner_id as "ownerId", name, description, space_type as "type",
              cover_url as "coverUrl", created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM memory_spaces ORDER BY updated_at DESC`
    );
    return res.rows;
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
       FROM space_profiles WHERE space_id = $1 ORDER BY created_at ASC`,
      [spaceId]
    );
    return res.rows;
  }

  async findProfileById(id: string): Promise<SpaceProfile | null> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", name, relationship, profile_type as "type",
              birth_date::text as "birthDate", avatar_media_id as "avatarMediaId",
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM space_profiles WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }
}

// ----------------------------------------------------------------------------
// 3. Memory Repository
// ----------------------------------------------------------------------------
export interface MemoryRepository {
  createMemory(memory: Memory): Promise<Memory>;
  findMemoryById(id: string): Promise<Memory | null>;
  listMemories(spaceId: string, options?: { profileId?: string; isFavorite?: boolean }): Promise<Memory[]>;
  updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null>;
}

export class PostgresMemoryRepository implements MemoryRepository {
  constructor(private db: DatabaseClient) {}

  async createMemory(memory: Memory): Promise<Memory> {
    await this.db.query(
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
    return memory;
  }

  async findMemoryById(id: string): Promise<Memory | null> {
    const res = await this.db.query(
      `SELECT id, space_id as "spaceId", author_id as "authorId", title, content, format,
              captured_at::text as "capturedAt", location, is_favorite as "isFavorite",
              associated_profile_ids as "associatedProfileIds", media_ids as "mediaIds", tags,
              created_at::text as "createdAt", updated_at::text as "updatedAt"
       FROM memories WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async listMemories(spaceId: string, options?: { profileId?: string; isFavorite?: boolean }): Promise<Memory[]> {
    let query = `
      SELECT id, space_id as "spaceId", author_id as "authorId", title, content, format,
             captured_at::text as "capturedAt", location, is_favorite as "isFavorite",
             associated_profile_ids as "associatedProfileIds", media_ids as "mediaIds", tags,
             created_at::text as "createdAt", updated_at::text as "updatedAt"
      FROM memories WHERE space_id = $1`;
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
}

// ----------------------------------------------------------------------------
// 4. Media Repository
// ----------------------------------------------------------------------------
export interface SpaceQuota {
  spaceId: string;
  usedBytes: number;
  maxBytes: number;
}

export interface MediaRepository {
  createAsset(asset: MediaAsset): Promise<MediaAsset>;
  findAssetById(id: string): Promise<MediaAsset | null>;
  updateAsset(id: string, updates: Partial<MediaAsset>): Promise<MediaAsset | null>;
  listAssets(spaceId: string): Promise<MediaAsset[]>;
  getSpaceQuota(spaceId: string): Promise<SpaceQuota>;
  incrementSpaceUsage(spaceId: string, bytesDelta: number): Promise<SpaceQuota>;
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
}

// ----------------------------------------------------------------------------
// 5. Book Repository
// ----------------------------------------------------------------------------
export interface BookRepository {
  createBook(book: BookDocument): Promise<BookDocument>;
  findBookById(id: string): Promise<BookDocument | null>;
  listBooks(spaceId: string): Promise<BookDocument[]>;
  saveSpread(bookId: string, spread: BookSpread): Promise<void>;
  freezeEdition(bookId: string, editionHash: string): Promise<void>;
}

export class PostgresBookRepository implements BookRepository {
  constructor(private db: DatabaseClient) {}

  async createBook(book: BookDocument): Promise<BookDocument> {
    await this.db.query(
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
      await this.saveSpread(book.id, spread);
    }

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
    return res.rows.map((b: any) => ({ ...b, spreads: [] }));
  }

  async saveSpread(bookId: string, spread: BookSpread): Promise<void> {
    await this.db.query(
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
