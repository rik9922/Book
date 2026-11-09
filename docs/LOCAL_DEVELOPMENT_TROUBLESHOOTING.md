# Memoria — Local Development Troubleshooting Guide

This document describes how to troubleshoot, diagnose, and resolve port conflicts, stuck processes, lock file collisions, and database connection issues during local development on macOS.

---

## 1. Port Already In Use (`EADDRINUSE` / `FOREIGN_CONFLICT`)

### Diagnosis
When starting a service or running `pnpm run dev:up`, you may see:
```text
❌ Pre-flight failed: Port conflicts with non-Memoria processes detected!
  • Port 4000 (Memoria API Gateway): occupied by PID 54321 (nginx)
```

Run the port diagnostic check to inspect the occupying process:
```bash
pnpm run dev:ports:check
```

### Resolution Options

#### Option A: Terminate the Foreign Process
If the process is a lingering test server or unwanted background tool:
```bash
# Inspect the process on port 4000
lsof -iTCP:4000 -sTCP:LISTEN -n -P

# Terminate safely by PID
kill -15 <PID>
```

> **Warning**: Never use broad commands like `killall node` or `pkill node` as they terminate unrelated editors, background daemons, and system tools.

#### Option B: Reconfigure the Port in `.env`
If you need to keep the other process running (e.g. another local project), configure an override in `.env`:
```bash
PORT_GATEWAY=4100
```
Memoria's `@memory-capsule/contracts` will automatically route API traffic to port `4100`.

---

## 2. Orphaned Memoria Processes (`MEMORIA_ORPHAN`)

### Diagnosis
If a terminal session was abruptly killed or crashed, a Memoria Fastify service may still be bound to a port without a tracked PID file.

`pnpm run dev:ports:check` will report:
```text
State: MEMORIA_ORPHAN
Resolution: Orphaned Memoria process detected on port 4001 (PID 12345). Run 'pnpm run dev:down' to stop it safely.
```

### Resolution
Run:
```bash
pnpm run dev:down
```
The teardown orchestrator will inspect active listeners, verify the process command matches Memoria, and safely terminate the orphaned process with `SIGTERM`.

---

## 3. Stale Lock File (`memoria.lock`)

### Diagnosis
If the developer machine lost power or a process was force-killed with `kill -9` while orchestrating:
```text
Failed to acquire Memoria orchestration lock (.memoria/memoria.lock)
```

### Resolution
Memoria's `port-lock.ts` automatically detects if the PID recorded in `memoria.lock` is dead (`ESRCH`), auto-unlinks the stale lock, and proceeds.

If you need to manually inspect or clear the lock:
```bash
# Inspect lock details
cat .memoria/memoria.lock

# If the holding PID is no longer running, delete the file
rm -f .memoria/memoria.lock
```

---

## 4. PostgreSQL Connection Issues

### Diagnosis
```text
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### Resolution
Ensure PostgreSQL is active:
```bash
# Check if Postgres is running natively via Homebrew
brew services list

# Start native Postgres
brew services start postgresql@17

# Alternatively, start Docker Compose services
docker compose up -d postgres
```

Verify database credentials in `.env`:
```bash
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/memory_capsule?sslmode=disable"
```

To set up or re-initialize databases:
```bash
# Initialize all microservice databases
node --env-file=.env scripts/init-microservice-dbs.ts

# Setup pgAdmin 4 connection server profile
pnpm run setup:pgadmin
```

---

## 5. Checking Service Logs

If a service fails to become healthy within the 15-second startup window, inspect its log file directly:
```bash
tail -n 50 .memoria/logs/identity-service.log
tail -n 50 .memoria/logs/memory-service.log
tail -n 50 .memoria/logs/media-service.log
tail -n 50 .memoria/logs/api-gateway.log
```
