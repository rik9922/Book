# Memoria — Local Development Guide

This guide describes how to run, orchestrate, monitor, and troubleshoot the Memoria microservice and frontend development environment on macOS.

---

## 1. Quick Start (Zero-Budget, Local-First)

### Step 1: Run Pre-Flight Environment Doctor
Before starting any services, verify that your machine has the required toolchains, active daemons, and zero conflicting port assignments:

```bash
pnpm run dev:doctor
```

Expected output:
```text
🔍 Memoria Local Development Environment Doctor

  ✅ Node.js Runtime: v26.x (Supported: >= 20.0.0)
  ✅ Package Manager: pnpm v10.x
  ✅ Port Registry: 18 definitions loaded, zero duplicate ports
  ✅ Port Conflicts: All registered ports are free or active Memoria/Infra daemons
  ✅ PostgreSQL Database: Connected successfully to PostgreSQL 17
  ✅ Local Disk Storage: Initialized at storage/local
  ✅ Xcode & iOS Simulator: Xcode CLI tools and simctl available

✨ System is healthy and ready for Memoria development!
```

---

## 2. Developer Commands Reference

The following commands are wired in the root `package.json`:

| Command | Action | Description |
| :--- | :--- | :--- |
| `pnpm run dev:doctor` | Health Check | Validates Node, pnpm, PostgreSQL, Storage, Simulator, and Port Registry |
| `pnpm run dev:ports` | Port Registry | Displays the complete authoritative port registry table |
| `pnpm run dev:ports:check` | Port Diagnostics | Inspects active host listeners, detecting conflicts and orphans |
| `pnpm run dev:up` | Start Stack | Starts all backend microservices in background with lock protection |
| `pnpm run dev:down` | Stop Stack | Gracefully stops all Memoria services using tracked PIDs |
| `pnpm run dev:restart` | Restart Stack | Stops all services and starts them cleanly in dependency order |
| `pnpm run dev:status` | Status Table | Displays live status, ports, PIDs, and health states |
| `pnpm run dev:logs` | View Logs | Lists log files or displays recent logs for a specific service |
| `pnpm run dev:web` | Start Web UI | Starts Next.js PWA with Three.js 3D viewer on port 3000 |

---

## 3. Starting the Full Stack

### Step 1: Start Backend Services
```bash
pnpm run dev:up
```

This command:
1. Acquires mutual exclusion lock `.memoria/memoria.lock` to prevent racing startups.
2. Performs diagnostic pre-checks on ports `4000`, `4001`, `4002`, `4003`, `4005`, `50051`, `50052`.
3. Checks infrastructure services (Postgres, Redis, NATS).
4. Launches services in dependency order:
   - `identity-service` (port 4001, gRPC 50051)
   - `memory-service` (port 4002, gRPC 50052)
   - `media-service` (port 4003)
   - `book-service` (port 4005)
   - `api-gateway` (port 4000)
5. Pipes output to `.memoria/logs/<service>.log`.
6. Records active process PIDs in `.memoria/pids/<service>.json`.
7. Waits until each service port is actively listening before releasing lock.

### Step 2: Start Web Frontend
In a separate terminal or workspace:
```bash
pnpm run dev:web
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Viewing Logs & Inspecting Status

To check which services are currently running:
```bash
pnpm run dev:status
```

To view logs for a specific service:
```bash
# View identity service logs
pnpm run dev:logs identity-service

# View API gateway logs
pnpm run dev:logs api-gateway

# View all available log files
pnpm run dev:logs
```

---

## 5. Graceful Teardown

To shut down all backend services cleanly:
```bash
pnpm run dev:down
```

This sends `SIGTERM` to each tracked Memoria PID, waits up to 5 seconds for in-flight requests and database connections to close gracefully, removes PID tracking metadata, and ensures clean release of the process lock.
