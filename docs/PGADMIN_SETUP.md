# pgAdmin 4 Integration & Setup Guide

**Product**: Memoria  
**Environment**: Local Development (PostgreSQL 17 on `localhost:5432`)  
**Server Group**: `Memoria Ecosystem`  

---

## 1. Overview

pgAdmin 4 has been pre-configured to connect to the Memoria local database cluster on macOS. All 8 microservice databases are loaded and grouped under the **Memoria Ecosystem** server group.

---

## 2. Configured Database Servers

| Server Name | Database | Port | Username | Service Responsibility |
|---|---|---|---|---|
| **Memoria - Primary Database** | `postgres` | `5432` | `ritik` | Master PostgreSQL 17 cluster |
| **Memoria - Identity Service** | `identity_db` | `5432` | `ritik` | Auth, users, sessions, password hashes |
| **Memoria - Memory Service** | `memory_db` | `5432` | `ritik` | Memory spaces, stories, tags, metadata |
| **Memoria - Media Service** | `media_db` | `5432` | `ritik` | Media assets, derivatives, upload sessions |
| **Memoria - Collaboration Service** | `collab_db` | `5432` | `ritik` | Space members, roles, invitations, comments |
| **Memoria - Book Studio Service** | `book_db` | `5432` | `ritik` | Books, chapters, spreads, digital editions |
| **Memoria - Commerce & Print Service** | `commerce_db` | `5432` | `ritik` | Orders, shipping addresses, fulfillment |
| **Memoria - Notification Service** | `notification_db` | `5432` | `ritik` | In-app alerts, invites, background job notifications |

---

## 3. How to Open & Use in pgAdmin 4

1. Launch **pgAdmin 4** from your Applications folder or Spotlight:
   ```bash
   open -a "pgAdmin 4"
   ```
2. In the left sidebar under **Servers**, expand:
   ```
   📁 Servers
     └── 📁 Memoria Ecosystem
           ├── 🐘 Memoria - Primary Database (Local Cluster)
           ├── 🐘 Memoria - Identity Service (identity_db)
           ├── 🐘 Memoria - Memory Service (memory_db)
           ├── 🐘 Memoria - Media Service (media_db)
           ├── 🐘 Memoria - Collaboration Service (collab_db)
           ├── 🐘 Memoria - Book Studio Service (book_db)
           ├── 🐘 Memoria - Commerce & Print Service (commerce_db)
           └── 🐘 Memoria - Notification Service (notification_db)
   ```
3. Click any server to browse schemas, tables, run SQL queries, or inspect indexes. If prompted for password, enter your local PostgreSQL password for user `ritik` (or press OK if passwordless peer auth is configured).

---

## 4. Re-syncing or Manual Import

If you ever reinstall pgAdmin 4 or want to refresh the server list:

### Automated:
```bash
pnpm run setup:pgadmin
```

### Manual GUI Import:
1. In pgAdmin 4, click **Tools** → **Import/Export Servers...**
2. Choose **Import**.
3. Select the file:
   ```text
   infra/postgres/pgadmin-servers.json
   ```
4. Click **Next** and **Finish**.

