# AGENTS.md — MEMORY CAPSULE / BOOK ENGINE

This document governs the operational rules, architectural constraints, and behavior for all AI engineering agents working on the **Memory Capsule** platform repository.

---

## 1. CORE OPERATIONAL DIRECTIVES

### 1.1 Never Lose Project / Product Context
- **Product Vision**: Heirloom memory preservation ecosystem across Web/PWA (82 views), Native iOS (56 views), Admin Portal (26 views), Fastify microservices, and 3D reading engine (Three.js/R3F on Web, RealityKit on iOS).
- **Single Source of Truth**: All architectures, contracts, and view specs are formally documented in `docs/` (23 mandatory specifications) and `docs/SCREEN_INVENTORY.md`.
- **Zero Scope Drift**: Never silently deprecate, replace, or skip views, features, or architectural layers.

### 1.2 Anti-Hallucination & Truthfulness (Zero Fabrication)
- **No Simulated Progress**: Never report tasks as complete unless verified by executable code, applied migrations, passing unit/integration tests, or compiled builds.
- **No Mock Stubs in Place of Production Implementations**: Core services, contracts, and drivers must be real, functional, and verified.
- **Evidence-Based Reporting**: Output real terminal logs, compiler outputs, and test pass counts.

### 1.3 Continuous Improvement & Health Monitoring
- **Always Verify**: Run `pnpm build` and `NODE_ENV=test pnpm test` after implementing any feature or service.
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

The repository maintains an installed skill library under `.agents/skills/` (and mirrored in `.claude/skills/` and `agent/skills/`):

- **Context & Memory**: `context-engineering`, `bmad-project-context`
- **Spec Verification & Anti-Hallucination**: `validate-changes-match-specs`, `check-impl-against-spec`
- **Quality Assurance & Testing**: `qa-expert`, `qa-test-planner`
- **Security, Hardening & Threat Modeling**: `security-and-hardening`, `security-threat-model`, `api-security-best-practices`, `auth-implementation-patterns`
- **Ethical Hacking & Penetration Testing**: `owasp-top-10-testing`, `web-app-penetration-testing`, `api-security-testing`
- **Architecture & Backend**: `architecture-patterns`, `microservices-patterns`, `database-migrations`, `postgres-patterns`, `postgresql-table-design`, `docker-compose-patterns`, `nodejs-best-practices`
- **3D Modeling & Asset Pipeline**: `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-lighting`, `threejs-animation`, `threejs-loaders`, `threejs-textures`, `threejs-interaction`, `threejs-postprocessing`, `threejs-performance`, `threejs-react-three-fiber`, `threejs-shaders`, `threejs-asset-pipeline`, `blender-web-pipeline`, `realitykit`, `swiftui-pro`
- **Design & UI/UX**: `design-system`, `emil-design-eng`, `frontend-design`, `impeccable`, `shadcn`, `ui-ux-pro-max`, `web-design-guidelines`

