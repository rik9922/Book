# AGENTS.md — MEMORIA ENGINEERING GOVERNANCE

This document governs the operational rules, architectural constraints, clean code standards, and behavior for all AI engineering agents working on the **Memoria** platform repository.

**Official Product Name**: **Memoria**  
**Official Tagline**: **Your memories, made timeless.**  

---

## 1. CORE OPERATIONAL DIRECTIVES

### 1.1 Never Lose Project / Product Context
- **Product Vision**: Heirloom memory preservation ecosystem across Web/PWA (82 views), Native iOS (56 views), Admin Portal (26 views), Fastify microservices, and 3D reading engine (Three.js/R3F on Web, RealityKit on iOS).
- **Single Source of Truth**: All architectures, contracts, and view specs are formally documented in `docs/` and `docs/SCREEN_INVENTORY.md`.
- **Zero Scope Drift**: Never silently deprecate, replace, or skip views, features, or architectural layers.

### 1.2 Anti-Hallucination & Truthfulness (Zero Fabrication)
- **No Simulated Progress**: Never report tasks as complete unless verified by executable code, applied migrations, passing unit/integration tests, or compiled builds.
- **No Mock Stubs in Place of Production Implementations**: Core services, contracts, and drivers must be real, functional, and verified.
- **Evidence-Based Reporting**: Output real terminal logs, compiler outputs, and test pass counts.

### 1.3 Continuous Improvement & Health Monitoring
- **Always Verify**: Run `pnpm run check:quality`, `pnpm build`, and `NODE_ENV=test pnpm test` after implementing any feature or service.
- **Clean Workspace**: Ensure no stray background processes hang, no orphaned temporary files remain, and git working trees are kept clean.
- **Automated Regression Prevention**: Any bug fixed must be accompanied by an automated regression test in `tests/`.

### 1.4 Absolute Data Privacy & Secret Security (Zero Exposure)
- **Zero Secret Leaks**: Never commit `.env` files, API keys, passwords, database credentials, JWT secrets, or cryptographic tokens.
- **PII Protection**: Personal stories, family photographs, voice recordings, child profiles, and addresses must be treated as strictly confidential. Sanitize logs to never print plaintext credentials or user media payloads.
- **OWASP Compliance**: Protect against BOLA/IDOR, broken authentication, mass assignment, SSRF, and injection attacks.

### 1.5 Strict Zero-Budget Policy ($0 Budget, Cardless)
- **No Credit / Debit Cards / PayPal**: Never request or configure services that require entering a credit card, payment method, or automatic billing transition.
- **Local-First & Verified Free Tiers**: Use `LocalDiskStorageDriver` (`storage/local/`), local/containerized PostgreSQL, in-memory/NATS JetStream event bus, and in-memory/BullMQ job managers. Cloudflare R2 is explicitly prohibited unless verified cardless.

---

## 2. ACTIVE SKILL REPERTOIRE

The repository maintains an installed skill library under `.agents/skills/` (and mirrored in `.claude/skills/`):

- **Clean Code & Architecture**: `clean-code-solid-engineering`, `code-quality-and-refactoring`, `architecture-patterns`, `microservices-patterns`, `nodejs-best-practices`
- **Logging & Resilience**: `structured-logging-and-observability`, `error-handling-and-resilience`
- **Context & Memory**: `context-engineering`, `bmad-project-context`
- **Spec Verification & Anti-Hallucination**: `validate-changes-match-specs`, `check-impl-against-spec`
- **Quality Assurance & Testing**: `qa-expert`, `qa-test-planner`
- **Security & Hardening**: `security-and-hardening`, `security-threat-model`, `api-security-best-practices`, `auth-implementation-patterns`
- **Database & Performance**: `database-migrations`, `postgres-patterns`, `postgresql-table-design`
- **3D & Graphics Engine**: `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-lighting`, `threejs-animation`, `threejs-loaders`, `threejs-textures`, `threejs-interaction`, `threejs-postprocessing`, `threejs-performance`, `threejs-react-three-fiber`, `threejs-shaders`, `threejs-asset-pipeline`, `blender-web-pipeline`, `realitykit`, `swiftui-pro`
- **Design & UI/UX**: `design-system`, `emil-design-eng`, `frontend-design`, `impeccable`, `shadcn`, `ui-ux-pro-max`, `web-design-guidelines`

---

## 3. MANDATORY AGENT IMPLEMENTATION WORKFLOW

Every AI agent must execute this 3-stage protocol on every task:

### Phase A: Pre-Implementation
1. Read project instructions, brand guidelines (`docs/BRAND_IDENTITY.md`), and engineering standards (`docs/MEMORIA_ENGINEERING_STANDARDS.md`).
2. Inspect existing workspace code and shared packages (`@memory-capsule/*`).
3. Check installed engineering skills in `.agents/skills/`.
4. Plan the smallest correct, testable implementation (KISS/YAGNI).

### Phase B: During Implementation
1. Follow established bounded contexts and hybrid communication architecture (REST public, gRPC internal, NATS JetStream events, BullMQ queues).
2. Validate environment configuration via `validateServiceConfig` with Zod.
3. Use centralized structured logging (`@memory-capsule/logger`). **Never call `console.log/error/warn` in production service code.**
4. Throw typed application errors extending `AppError` and preserve cause chains.
5. Protect multi-entity mutations with database transactions (`db.transaction`) and Transactional Outbox staging.
6. Write automated regression and integration tests alongside implementation.

### Phase C: Post-Implementation & Quality Gates
1. Run automated code quality gate: `pnpm run check:quality` (ensures zero console calls and zero empty catch blocks).
2. Run TypeScript type check across all workspaces: `pnpm build`.
3. Run test suites: `NODE_ENV=test pnpm test`.
4. Inspect `git diff` for hardcoded secrets, dangling files, or unrelated changes.
5. Report verified terminal logs, test pass counts, and benchmark evidence.
