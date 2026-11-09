# DATABASE SCHEMA REFERENCE
**Memory Capsule Platform — Exhaustive Table, Column, Index & Constraint Dictionary**
**Document Version:** 1.0.0  
**Target RDBMS:** PostgreSQL 17.x  

---

## 1. DOMAIN: IDENTITY (`identity_db`)

### `users`
Master user identity and credentials.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Globally unique user identifier. |
| `email` | `VARCHAR(255)` | `UNIQUE, NOT NULL` | Verified user email (lowercased). |
| `full_name` | `VARCHAR(255)` | `NOT NULL` | Display name. |
| `password_hash` | `VARCHAR(512)` | `NOT NULL` | Cryptographic scrypt hash with salt. |
| `avatar_url` | `TEXT` | `NULL` | Public or local storage URL. |
| `is_verified` | `BOOLEAN` | `DEFAULT FALSE` | Email confirmation flag. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record modification timestamp. |

**Indexes**:
- `users_pkey`: B-tree on `(id)`
- `idx_users_email`: B-tree on `(email)`

---

### `user_sessions`
Active and persistent authentication refresh sessions.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Session identifier. |
| `user_id` | `UUID` | `NOT NULL, REFERENCES users(id) ON DELETE CASCADE` | Associated user. |
| `refresh_token_hash` | `VARCHAR(512)` | `NOT NULL` | SHA-256 hash of issued refresh token. |
| `user_agent` | `TEXT` | `NULL` | Client browser / device string. |
| `ip_address` | `VARCHAR(45)` | `NULL` | Client IPv4 or IPv6. |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Hard session expiration. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Session issuance timestamp. |

**Indexes**:
- `user_sessions_pkey`: B-tree on `(id)`
- `idx_sessions_user_id`: B-tree on `(user_id)`

---

## 2. DOMAIN: MEMORY ARCHIVE (`memory_db`)

### `memory_spaces`
Collaborative family or individual spaces.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Space identifier. |
| `owner_id` | `UUID` | `NOT NULL` | Creator user ID. |
| `name` | `VARCHAR(255)` | `NOT NULL` | Name of memory capsule space. |
| `description` | `TEXT` | `NULL` | Optional space summary. |
| `space_type` | `VARCHAR(50)` | `DEFAULT 'family'` | Space category (`family`, `individual`, `memorial`). |
| `cover_url` | `TEXT` | `NULL` | Header or cover image URL. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Last update timestamp. |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Soft deletion timestamp. |

---

### `space_profiles`
People, children, parents, and pets belonging to a space.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Profile identifier. |
| `space_id` | `UUID` | `NOT NULL, REFERENCES memory_spaces(id) ON DELETE CASCADE` | Owning space. |
| `name` | `VARCHAR(255)` | `NOT NULL` | Profile full name or pet name. |
| `relationship` | `VARCHAR(100)` | `NULL` | E.g., `daughter`, `grandfather`, `self`. |
| `profile_type` | `VARCHAR(50)` | `DEFAULT 'individual'` | `individual`, `child`, `pet`. |
| `birth_date` | `DATE` | `NULL` | Date of birth. |
| `avatar_media_id` | `UUID` | `NULL` | Media asset ID for profile picture. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Modification timestamp. |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Soft deletion timestamp. |

---

### `memories`
Core life moments, stories, voice notes, and media memories.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Memory identifier. |
| `space_id` | `UUID` | `NOT NULL, REFERENCES memory_spaces(id) ON DELETE CASCADE` | Space identifier. |
| `author_id` | `UUID` | `NOT NULL` | Creator user ID. |
| `title` | `VARCHAR(255)` | `NOT NULL` | Title of memory. |
| `content` | `TEXT` | `NULL` | Written story or transcript. |
| `format` | `VARCHAR(50)` | `DEFAULT 'image'` | `image`, `video`, `audio`, `story`, `mixed`. |
| `captured_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT NOW()` | Date and time the memory occurred. |
| `location` | `VARCHAR(255)` | `NULL` | Place name or coordinates description. |
| `is_favorite` | `BOOLEAN` | `DEFAULT FALSE` | Starred memory flag. |
| `associated_profile_ids` | `UUID[]` | `DEFAULT '{}'` | Array of tagged profiles. |
| `media_ids` | `UUID[]` | `DEFAULT '{}'` | Array of media asset IDs. |
| `tags` | `TEXT[]` | `DEFAULT '{}'` | Array of string tags. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record modification timestamp. |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | Soft deletion timestamp. |

**Indexes**:
- `memories_pkey`: B-tree `(id)`
- `idx_memories_keyset`: B-tree `(space_id, captured_at DESC, id DESC) WHERE deleted_at IS NULL`
- `idx_memories_favorites_keyset`: B-tree `(space_id, captured_at DESC, id DESC) WHERE deleted_at IS NULL AND is_favorite = TRUE`
- `idx_memories_fts`: GIN `(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) WHERE deleted_at IS NULL`

---

### `memory_media`
Normalized junction table for ordered media attachments.
| Column | Type | Constraints |
|---|---|---|
| `memory_id` | `UUID` | `REFERENCES memories(id) ON DELETE CASCADE` |
| `media_id` | `UUID` | `NOT NULL` |
| `sort_order` | `INTEGER` | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` |

*Primary Key*: `(memory_id, media_id)`

---

### `memory_profiles`
Normalized junction table linking memories to space profiles.
| Column | Type | Constraints |
|---|---|---|
| `memory_id` | `UUID` | `REFERENCES memories(id) ON DELETE CASCADE` |
| `profile_id` | `UUID` | `REFERENCES space_profiles(id) ON DELETE CASCADE` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` |

*Primary Key*: `(memory_id, profile_id)`

---

## 3. DOMAIN: MEDIA & STORAGE (`media_db`)

### `media_assets`
Binary files, uploaded originals, and processed derivatives.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Media identifier. |
| `space_id` | `UUID` | `NOT NULL` | Associated space. |
| `original_name`| `VARCHAR(255)` | `NOT NULL` | Original filename uploaded by user. |
| `mime_type` | `VARCHAR(100)` | `NOT NULL` | MIME type (`image/png`, `image/jpeg`, etc.). |
| `size_bytes` | `BIGINT` | `NOT NULL` | Byte size of original asset. |
| `status` | `VARCHAR(50)` | `DEFAULT 'pending_upload'` | `pending_upload`, `ready`, `failed`. |
| `storage_key` | `TEXT` | `NOT NULL` | Object storage path in `storage/local/`. |
| `public_url` | `TEXT` | `NULL` | Public media URL. |
| `derivatives` | `JSONB` | `DEFAULT '{}'` | Map of thumbnail, web, print derivatives. |
| `metadata` | `JSONB` | `DEFAULT '{}'` | EXIF, dimensions, color profiles. |

---

### `space_storage_quotas`
Strict $0 budget storage enforcement per space.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `space_id` | `UUID` | `PRIMARY KEY` | Associated space. |
| `used_bytes` | `BIGINT` | `DEFAULT 0` | Total reserved storage in bytes. |
| `max_bytes` | `BIGINT` | `DEFAULT 524288000` | Hard cap: 500 MB (524,288,000 bytes). |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Last update timestamp. |

---

## 4. DOMAIN: BOOKS & PUBLISHING (`book_db` & `commerce_db`)

### `books`
Master digital and physical book models.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Book identifier. |
| `space_id` | `UUID` | `NOT NULL` | Associated space. |
| `title` | `VARCHAR(255)` | `NOT NULL` | Book title. |
| `subtitle` | `VARCHAR(255)` | `NULL` | Book subtitle. |
| `format` | `VARCHAR(100)` | `DEFAULT 'hardcover_standard_8x10'` | Book physical format. |
| `cover_color` | `VARCHAR(50)` | `DEFAULT '#304C43'` | Hex code for cloth cover. |
| `is_frozen_for_print` | `BOOLEAN` | `DEFAULT FALSE` | Immutability flag when edition is published. |
| `frozen_edition_hash`| `VARCHAR(64)` | `NULL` | SHA-256 canonical hash of frozen content. |

---

### `book_spreads`
Spreads comprising left and right pages with JSONB node models.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Spread identifier. |
| `book_id` | `UUID` | `REFERENCES books(id) ON DELETE CASCADE` | Parent book. |
| `spread_index` | `INTEGER` | `NOT NULL` | Zero-based index of spread. |
| `left_page` | `JSONB` | `NULL` | Layout nodes and typography on left page. |
| `right_page` | `JSONB` | `NULL` | Layout nodes and typography on right page. |

---

### `print_orders`
Orders placed for physical book printing and binding.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Order identifier. |
| `space_id` | `UUID` | `NOT NULL` | Associated space. |
| `user_id` | `UUID` | `NOT NULL` | Ordering user. |
| `book_id` | `UUID` | `NOT NULL` | Target book. |
| `status` | `VARCHAR(50)` | `DEFAULT 'submitted'` | Order status. |
| `total_cents` | `INTEGER` | `NOT NULL` | Total cost in cents. |
| `currency` | `VARCHAR(3)` | `DEFAULT 'USD'` | Currency code. |
| `shipping_address` | `JSONB` | `NOT NULL` | Destination address. |
| `print_spec` | `JSONB` | `NOT NULL` | Paper stock, binding, trim specifications. |

---

## 5. OPERATIONAL & ASYNCHRONOUS TABLES

### `outbox_events`
Transactional outbox records for distributed events.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY` | Event ID. |
| `event_type` | `VARCHAR(255)` | `NOT NULL` | Contract event name (e.g., `memory.created.v1`). |
| `aggregate_type`| `VARCHAR(100)` | `NOT NULL` | Entity type (`memory`, `book`, `media`). |
| `aggregate_id` | `UUID` | `NOT NULL` | Entity UUID. |
| `payload` | `JSONB` | `NOT NULL` | Complete event payload. |
| `status` | `VARCHAR(50)` | `DEFAULT 'pending'` | `pending`, `published`, `failed`. |
| `retry_count` | `INTEGER` | `DEFAULT 0` | Delivery attempt count. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Event staging timestamp. |
| `processed_at` | `TIMESTAMPTZ` | `NULL` | Successful NATS dispatch timestamp. |

**Indexes**:
- `idx_outbox_pending`: Partial B-tree on `(created_at ASC) WHERE status = 'pending'`
