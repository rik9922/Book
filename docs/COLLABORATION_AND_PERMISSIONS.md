# Collaboration, RBAC & Permissions Architecture

## 1. Role-Based Access Control (RBAC) Matrix

| Capability / Action | Owner | Editor | Contributor | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Space Settings & Billing** | ✅ | ❌ | ❌ | ❌ |
| **Invite & Remove Members** | ✅ | ✅ | ❌ | ❌ |
| **Create Books & Freeze Editions** | ✅ | ✅ | ❌ | ❌ |
| **Edit Spreads & Book Layouts** | ✅ | ✅ | ❌ | ❌ |
| **Upload Memories & Media** | ✅ | ✅ | ✅ | ❌ |
| **Edit Own Uploaded Memories** | ✅ | ✅ | ✅ | ❌ |
| **Edit Others' Memories** | ✅ | ✅ | ❌ | ❌ |
| **View Memories & 3D Books** | ✅ | ✅ | ✅ | ✅ |
| **Comment & React** | ✅ | ✅ | ✅ | ✅ |

## 2. Cryptographic Invitation Links
- Invitations use a cryptographically secure random token (256-bit hex) hashed in `collab_db`.
- Tokens expire after 14 days and are single-use.
- Space owners can revoke pending invitations at any time.

## 3. Immutable Contribution Audit
- Every memory creation, edit, or comment records:
  - `authorId`
  - `timestamp`
  - `previousState` (for rollback/recovery in PWA-54).
