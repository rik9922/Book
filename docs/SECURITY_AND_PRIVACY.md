# Security, Privacy & Data Integrity

## 1. Zero-Trust Access & Private-by-Default
- Memories, family photos, voice notes, and books are **strictly private by default**.
- No public directory or open browsing exists for unauthenticated users.
- Space owners explicitly grant permissions; access tokens are verified by backend Fastify services on every sensitive request.

## 2. Ephemeral Signed Media Access
- No long-lived public bucket URLs.
- Media assets are delivered via short-lived signed tokens or authenticated gateway streams.
- Direct-to-storage presigned upload sessions expire after 1 hour.

## 3. Administrative Protection & Auditing
- Administrative roles (`ADMIN-01` to `ADMIN-26`) do **not** have blanket visibility into private family albums.
- Accessing user media for technical support requires a formal, multi-party authorized access request (`ADMIN-05`), logged immutably in `admin_db` audit tables.

