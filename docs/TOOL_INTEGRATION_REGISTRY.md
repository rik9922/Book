# Autonomous Tool & Infrastructure Integration Registry

This registry documents all developer tools, database systems, runtime engines, 3D pipelines, and MCP interfaces operated autonomously by the AI Engineering Agent across the Memory Capsule platform.

---

## 1. Tool & Integration Status Directory

| Tool / Subsystem | Category | Integration Type | Status | Version | Verified Capabilities | Free/Local Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **Node.js Runtime** | Core Runtime | Host Environment | **Fully Operational** | `v26.7.0` | ESM execution, native crypto scrypt, parallel workers | 100% Free / Local |
| **pnpm Workspace** | Package Manager | CLI | **Fully Operational** | `11.22.0` | Monorepo dependency resolution, workspace symlinking | 100% Free / Open Source |
| **Git & GitHub** | Version Control | CLI & Git Remote | **Fully Operational** | `2.54.0` | Commits, branch tracking, remote diffs, tag sync | 100% Free / Self-contained |
| **PostgreSQL Suite** | Database & Persistence | CLI / Driver / Migrator | **Fully Operational** | `16.x` compatible | Automated schema migration, indexing, inspection | 100% Free / Local / Docker |
| **Fastify Framework** | Microservices Backend | Framework / API | **Fully Operational** | `5.2.1` | Gateway reverse proxy, JWT auth, route validation | 100% Free / Open Source |
| **Next.js 16 (Turbopack)**| Frontend & Web Studio | App Router Engine | **Fully Operational** | `16.4.5` | React 19 SSR/SSG, client-side 3D Canvas, PWA | 100% Free / Local |
| **Three.js & R3F** | 3D WebGL Engine | WebGL Library | **Fully Operational** | `0.187.0` / `9.8.2` | Anatomical book rendering, PBR materials, orbit | 100% Free / Open Source |
| **Blender Python Pipeline**| 3D Procedural Generator| CLI / Python Script | **Fully Operational** | Python 3.9 / Blender | Procedural GLTF/GLB synthesis, chamfer beveling | 100% Free / Open Source |
| **NATS JetStream** | Domain Event Bus | Client & Protocol | **Fully Operational** | `nats 2.29` | Pub/Sub, at-least-once delivery, in-memory fallback | 100% Free / Local |
| **BullMQ & Redis** | Background Job Queue | Worker Engine | **Fully Operational** | `5.41.6` | Sharp image processing, retry backoff, queue metrics | 100% Free / Local |
| **LocalDiskStorageDriver**| Zero-Cost Asset Storage | Native File Engine | **Fully Operational** | Internal v1.0 | Direct upload sessions, 500MB quota enforcement | 100% Free / No Card |
| **Sharp Engine** | Media Transcoder | Native Binary | **Fully Operational** | `0.33.5` | WebP/AVIF thumbnail generation, EXIF parsing | 100% Free / CPU Local |
| **Zod Schema Engine** | Typed Contract Validator| Runtime Schema | **Fully Operational** | `4.6.7` | Request validation, RFC 4122 UUID enforcement | 100% Free / TypeScript |
| **Docker Engine** | Container Orchestration| CLI / Daemon | Installed (CLI ready)| `29.6.2` | Multi-container compose definitions (`docker-compose.yml`)| 100% Free / Local |

---

## 2. Autonomous Database Control Specification

The AI Agent acts as autonomous database administrator via `packages/database`:
- **Automated Migration Runner**: `packages/database/src/migrator.ts`
  - Command: `node --import tsx packages/database/scripts/migrate.ts`
  - Capabilities: Reads `packages/database/migrations/*.sql`, checks `schema_migrations`, executes missing migrations atomically, and records cryptographic SHA-256 checksums.
- **Automated Database Seeder**: `packages/database/src/seed.ts`
  - Command: `node --import tsx packages/database/scripts/seed.ts`
  - Capabilities: Injects realistic development fixtures (spaces, profiles, memories) without hardcoding credentials or touching production tables.
- **Automated Schema Inspector**: `packages/database/src/inspector.ts`
  - Capabilities: Queries `information_schema.tables` and `information_schema.columns` to verify relational constraints, column types, and row volume.

---

## 3. Autonomy & Authorization Matrix

| Operation Tier | Permitted Autonomous Agent Actions | Explicit User Approval Required |
| :--- | :--- | :--- |
| **Tier 1 (Autonomous)** | Read repo files, inspect Git diffs, install approved non-paid npm packages, run migrations in dev, start/stop local services, run test suites, generate 3D assets via Python, inspect logs. | None (runs autonomously). |
| **Tier 2 (Conditional)** | Creating new database tables, updating Docker Compose configurations, adding new Fastify service endpoints, updating design tokens. | Notified via summary report. |
| **Tier 3 (Strict Approval)** | Adding paid services, entering credit cards, dropping production tables, force-pushing Git branches, exposing private family media. | **Strictly Forbidden** under $0 budget policy. |

---

## 4. Specialized Engineering, QA, Truthfulness & Security Skill Registry

The following curated skills are installed under `.agents/skills/`, `.claude/skills/`, and `agent/skills/` to guarantee architectural excellence, strict anti-hallucination, privacy security, and QA:

| Skill | Category | Source / Provenance | Core Capability & Operational Safeguard |
| :--- | :--- | :--- | :--- |
| **`agentic-integrity-and-security`** | Core Agent Guardrail | Repository Custom Standard | Enforces context retention, zero data fabrication, continuous health monitoring, PII protection, and cardless budget policy. |
| **`context-engineering`** | Context Retention | `addyosmani/agent-skills` | Manages working context windows, prevents task amnesia, tracks active systems. |
| **`bmad-project-context`** | Architecture Memory | `bmad-code-org/bmad-method` | Preserves repository conventions, operational pitfalls, and architectural standards. |
| **`validate-changes-match-specs`** | Anti-Hallucination | `warpdotdev/common-skills` | Validates that all implemented code strictly satisfies checked-in specifications. |
| **`check-impl-against-spec`** | Spec Verification | `warpdotdev/common-skills` | Audits implementation against specs to detect and prevent discrepancies. |
| **`qa-expert`** | QA & Test Strategy | `daymade/claude-code-skills` | End-to-end QA frameworks, test cases, P0–P4 bug tracking, and release acceptance. |
| **`qa-test-planner`** | Test Planning | `softaworks/agent-toolkit` | Automated and manual test plan generation, regression suites, and edge case coverage. |
| **`security-and-hardening`** | Security & Privacy | `addyosmani/agent-skills` | Code hardening against vulnerabilities, session management, safe data handling. |
| **`security-threat-model`** | Threat Modeling | `openai/skills` | STRIDE analysis, attack surface enumeration, mitigation mapping. |
| **`owasp-top-10-testing`** | Ethical Hacking & Audit | `usestrix/strix` | Verifies protection against OWASP Top 10 vulnerabilities (auth, injection, SSRF). |
| **`web-app-penetration-testing`**| Web Pen-Testing | `usestrix/strix` | Dynamic penetration testing for web applications, auth bypass, and XSS. |
| **`api-security-testing`** | API Pen-Testing | `usestrix/strix` | BOLA/IDOR auditing, rate limit testing, broken object-level authorization testing. |


