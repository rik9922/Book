# Microservices Specification & Port Directory

| Service Name | Port | Database | Responsibilities | Key Outbound Subjects |
| :--- | :--- | :--- | :--- | :--- |
| `api-gateway` | `4000` | Redis | Global ingress, reverse proxy, JWT claim verification, rate limits | — |
| `identity-service` | `4001` | `identity_db` | Registration, login, sessions, password recovery, scrypt hashing | `identity.user.registered` |
| `memory-service` | `4002` | `memory_db` | Spaces, Profiles (Child/Pet/Family), Memories, Timelines, Collections | `memory.space.created`, `memory.created` |
| `media-service` | `4003` | `media_db` | Direct upload sessions, S3/Local presigning, Sharp derivatives | `media.uploaded`, `media.processed` |
| `collaboration-service`| `4004` | `collab_db` | Space invitations, member roles (Owner/Editor/Contributor/Viewer) | `collab.invite.sent`, `collab.member.joined` |
| `book-service` | `4005` | `book_db` | Book documents, 2D spreads, layout elements, print freeze | `book.created`, `book.edition_frozen` |
| `asset-3d-service` | `4006` | Storage | PBR textures, procedural book GLTF variants, shaders | `asset3d.compiled` |
| `commerce-service` | `4007` | `commerce_db` | Physical book orders, print supplier integration, tracking | `order.created`, `order.paid` |
| `notification-service`| `4008` | `notification_db` | Push/in-app/email alerts triggered by domain events | `notification.dispatched` |
| `search-service` | `4009` | `search_db` | Full-text memory search, tag indexing, facet queries | — |
| `admin-service` | `4010` | `admin_db` | Storage audits, queue monitoring, authorized support access | `admin.audit_logged` |

