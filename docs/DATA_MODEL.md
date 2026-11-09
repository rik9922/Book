# Data Models & Relational Schema Specifications

## 1. Relational ER Diagram

```mermaid
erDiagram
    USERS ||--o{ SPACES : owns
    SPACES ||--o{ PROFILES : contains
    SPACES ||--o{ MEMORIES : contains
    SPACES ||--o{ BOOKS : contains
    SPACES ||--o{ MEMBERS : includes
    MEMORIES ||--o{ MEDIA_ASSETS : attaches
    BOOKS ||--o{ BOOK_SPREADS : contains
    BOOK_SPREADS ||--o{ BOOK_PAGES : has
    BOOK_PAGES ||--o{ PAGE_ELEMENTS : contains
    BOOKS ||--o{ ORDERS : prints

    USERS {
        uuid id PK
        string email UK
        string full_name
        string password_hash
        timestamp created_at
    }

    SPACES {
        uuid id PK
        uuid owner_id FK
        string name
        string type
        string cover_url
        timestamp created_at
    }

    PROFILES {
        uuid id PK
        uuid space_id FK
        string name
        string relationship
        string type
        string birth_date
        uuid avatar_media_id
    }

    MEMORIES {
        uuid id PK
        uuid space_id FK
        uuid author_id FK
        string title
        text content
        string format
        timestamp captured_at
        boolean is_favorite
        jsonb tags
    }

    BOOKS {
        uuid id PK
        uuid space_id FK
        string title
        string format
        string cover_color
        string foil_stamping
        integer version
        boolean is_frozen_for_print
        string frozen_edition_hash
    }
```

## 2. Table Indices & Performance Rules
- `memories(space_id, captured_at DESC)`: B-tree compound index for sub-10ms timeline queries.
- `memories(space_id, is_favorite)`: Filtered index for favorites.
- `profiles(space_id)`: Foreign key index.
- `media_assets(space_id, status)`: Index for upload session confirmation and cleanup.

