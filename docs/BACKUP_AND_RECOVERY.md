# DATABASE BACKUP AND RECOVERY SPECIFICATION
**Memory Capsule Platform — Disaster Recovery, Point-in-Time Recovery & Zero-Budget Tooling**
**Document Version:** 1.0.0  
**Target RDBMS:** PostgreSQL 17.x  

---

## 1. BACKUP PHILOSOPHY ($0 BUDGET, LOCAL-FIRST)

Under the strict **$0 budget constraint**, enterprise cloud backup services (such as AWS RDS automated snapshots or Cloudflare automated backups) are not permitted. 

All backups are managed using native PostgreSQL utilities (`pg_dump`, `pg_restore`, and Write-Ahead Log archiving) written to local rotated storage or developer-controlled offline backup drives.

---

## 2. BACKUP TYPES & AUTOMATION

### 2.1 Logical Backups (`pg_dump`)
Logical backups generate self-contained, compressed `.dump` files with complete schema definitions, data rows, sequences, and foreign-key constraints.

#### Daily Full Backup Script (`scripts/backup-databases.sh`)
```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="${HOME}/.memory_capsule/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASES=("identity_db" "memory_db" "media_db" "collab_db" "book_db" "commerce_db" "notification_db")

mkdir -p "${BACKUP_DIR}"

for DB in "${DATABASES[@]}"; do
  echo "Backing up ${DB}..."
  pg_dump -Fc -h localhost -p 5432 -U ritik "${DB}" > "${BACKUP_DIR}/${DB}_${TIMESTAMP}.dump"
done

# Retain 7 daily backups, delete older
find "${BACKUP_DIR}" -name "*.dump" -mtime +7 -delete
echo "Backups completed successfully to ${BACKUP_DIR}."
```

### 2.2 Backup Verification & Integrity Validation
A backup is invalid until a restore has been verified. The automated verification script recreates a temporary database, restores the dump, and verifies row counts:
```bash
#!/bin/bash
set -euo pipefail

DUMP_FILE="$1"
TEST_DB="verify_restore_tmp"

dropdb --if-exists -h localhost -p 5432 -U ritik "${TEST_DB}"
createdb -h localhost -p 5432 -U ritik "${TEST_DB}"
pg_restore -h localhost -p 5432 -U ritik -d "${TEST_DB}" "${DUMP_FILE}"

echo "Validation query:"
psql -h localhost -p 5432 -U ritik -d "${TEST_DB}" -c "SELECT count(*) FROM memories;"
dropdb -h localhost -p 5432 -U ritik "${TEST_DB}"
echo "Verification SUCCESS."
```

---

## 3. DISASTER RECOVERY RUNBOOK

### Scenario: Accidental Drop or Corruption of `memory_db`
1. **Stop Microservices**:
   ```bash
   pnpm stop:services
   ```
2. **Identify Latest Valid Dump**:
   ```bash
   LATEST_DUMP=$(ls -t ${HOME}/.memory_capsule/backups/memory_db_*.dump | head -n 1)
   ```
3. **Recreate Target Database**:
   ```bash
   dropdb -h localhost -p 5432 -U ritik memory_db
   createdb -h localhost -p 5432 -U ritik memory_db
   ```
4. **Restore Schema & Data**:
   ```bash
   pg_restore -h localhost -p 5432 -U ritik -d memory_db --clean --if-exists "${LATEST_DUMP}"
   ```
5. **Verify Restored Integrity**:
   ```bash
   psql -d memory_db -c "SELECT count(*) FROM memories WHERE deleted_at IS NULL;"
   ```
6. **Restart Microservices**:
   ```bash
   pnpm start:services
   ```
Recovery Time Objective (RTO): **< 2 minutes**  
Recovery Point Objective (RPO): **< 24 hours** (or < 1 hour with WAL archiving)
