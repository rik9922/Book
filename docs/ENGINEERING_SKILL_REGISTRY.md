# ENGINEERING SKILL REGISTRY
**Memoria Platform — Centralized Registry of Agent Skills, Standards & Tooling**
**Document Version:** 2.0.0
**Last Maintained:** 2026-11-10
**Status:** Active & Discoverable (`162` verified skills)

---

## 1. REPOSITORY SKILL DIRECTORIES & COMPATIBILITY

Agent skills in Memoria adhere to the open-source Agent Skills specification (`SKILL.md` with YAML frontmatter) and are synchronized identically across:
- **Primary Agent Directory**: `.agents/skills/`
- **Mirrored Agent Directories**: `.claude/skills/` and `agent/skills/`
- **CLI Lockfile Provenance**: `skills-lock.json`

---

## 2. VERIFIED GITHUB SKILL SOURCES BY TECHNICAL DISCIPLINE

| Discipline | GitHub Source Repository | License | Installed Skills |
|---|---|---|---|
| **Physics & 3D Mathematics** | `https://github.com/full-stack-skills/threejs-skills` | Apache-2.0 | `threejs-math` |
| **Physics & Constraint Solvers** | `https://github.com/curiositech/some_claude_skills` | MIT | `physics-rendering-expert` |
| **Real-Time Physics Tuning** | `https://github.com/gamedev-skills/awesome-gamedev-agent-skills` | Apache-2.0 | `physics-tuning`, `shader-programming` |
| **R3F Rapier Physics** | `https://github.com/enzed/r3f-skills` | MIT | `r3f-physics` |
| **Numerical Methods & PDE Solvers** | `https://github.com/heshamfs/materials-simulation-skills` | Apache-2.0 | `numerical-stability`, `numerical-integration`, `linear-solvers`, `time-stepping`, `mesh-generation` |
| **Linear Algebra, Symbolic & Signal Math** | `https://github.com/xjtulyc/awesome-rosetta-skills` | MIT | `numerical-linear-algebra`, `scipy-numerical`, `sympy-symbolic`, `control-systems`, `finite-element-analysis`, `signal-processing`, `photogrammetry-3d` |
| **Three.js Core & Engine** | `https://github.com/cloudai-x/threejs-skills` | MIT | `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-lighting`, `threejs-animation`, `threejs-loaders`, `threejs-textures`, `threejs-interaction`, `threejs-postprocessing`, `threejs-performance`, `threejs-react-three-fiber`, `threejs-shaders`, `threejs-asset-pipeline` |
| **Three.js WebGPU, A11y & Testing** | `https://github.com/cesartevisual/threejs-skills` | MIT | `threejs-physics`, `threejs-accessibility`, `threejs-debugging`, `threejs-testing`, `threejs-webgpu`, `threejs-product-viewer` |
| **Three.js Advanced Graphics** | `https://github.com/scottstts/threejs-awesome-graphics-agent-skills` | MIT | `threejs-shadow-systems`, `threejs-procedural-geometry`, `threejs-visual-validation`, `threejs-camera-direction`, `threejs-exposure-color-grading` |
| **WebGPU & TSL Node Shaders** | `https://github.com/dgreenheck/webgpu-claude-skill` | MIT | `webgpu-threejs-tsl` |
| **GLSL Shaders** | `https://github.com/sickn33/agentic-awesome-skills` | MIT | `shader-programming-glsl` |
| **Blender Pipeline & Optimization** | `https://github.com/arjun988/blender-skills` | MIT | `asset-optimization`, `export-pipeline`, `lod-pipeline`, `blender-modeler` |
| **Blender Python (bpy/bmesh)** | `https://github.com/terminalskills/skills` | Apache-2.0 | `blender-scripting` |
| **Blender Web Export** | `https://github.com/freshtechbro/claudedesignskills` | MIT | `blender-web-pipeline` |
| **OpenUSD & RealityKit Advanced** | `https://github.com/tomkrikorian/visionosagents` | MIT | `realitykit-animation-physics`, `realitykit-ecs-systems`, `realitykit-rendering-materials`, `usd-editor`, `shadergraph-editor` |
| **OpenUSD Performance Tuning** | `https://github.com/nvidia/skills` | Apache-2.0 | `omniverse-usd-performance-tuning` |
| **Metal Shaders & TBDR** | `https://github.com/curiositech/some_claude_skills` | MIT | `metal-shader-expert` |
| **Apple / iOS Engineering Suite** | `https://github.com/charleswiltgen/axiom` | MIT | `axiom-graphics`, `axiom-performance`, `axiom-concurrency`, `axiom-testing`, `axiom-build`, `axiom-accessibility`, `axiom-vision`, `axiom-media`, `axiom-data`, `axiom-networking`, `axiom-tools` |
| **Native iOS Frameworks & Diagnostics** | `https://github.com/dpearson2699/swift-ios-skills` | PolyForm Perimeter 1.0.0 | `realitykit`, `debugging-instruments`, `ios-memgraph-analysis`, `ios-ettrace-performance`, `metrickit`, `swift-concurrency`, `swift-testing`, `swiftui-performance`, `swiftui-animation`, `swiftui-gestures`, `vision-framework`, `ios-simulator`, `ios-accessibility`, `background-processing`, `swift-security`, `pdfkit`, `photokit`, `swift-architecture`, `swiftlint` |
| **SwiftUI Best Practices** | `https://github.com/twostraws/swiftui-agent-skill` | MIT | `swiftui-pro` |
| **Instruments CLI Profiling** | `https://github.com/steipete/agent-scripts` | MIT | `instruments-profiling` |
| **Processor, Apple Silicon, SIMD & Cache** | `https://github.com/mohitmishra786/low-level-dev-skills` | MIT | `apple-silicon`, `simd-intrinsics`, `cpu-cache-opt`, `cpu-pipelines-and-hazards`, `branch-prediction-and-speculation`, `memory-hierarchy-and-caches`, `gpu-memory-model`, `lldb`, `assembly-arm` |
| **OCR, Media, gRPC & Queues** | `https://github.com/terminalskills/skills` | Apache-2.0 | `tesseract`, `sharp`, `ffmpeg`, `bull-mq`, `nats-messaging`, `grpc`, `zod` |
| **Computer Vision & Profiling** | `https://github.com/curiositech/some_claude_skills` | MIT | `computer-vision-pipeline`, `performance-profiling` |
| **Redis Data & Security** | `https://github.com/redis/agent-skills` | MIT | `redis-core`, `redis-observability`, `redis-security` |
| **NATS Subject Design** | `https://github.com/trogonstack/agentskills` | MIT | `nats-design-subject` |
| **Protobuf Schemas** | `https://github.com/bufbuild/claude-plugins` | Apache-2.0 | `protobuf` |
| **Fastify & Node.js Core** | `https://github.com/mcollina/skills` | MIT | `fastify-best-practices`, `nodejs-core` |
| **Backend Architecture & TypeScript** | `https://github.com/wshobson/agents` | MIT | `architecture-patterns`, `auth-implementation-patterns`, `microservices-patterns`, `postgresql-table-design`, `typescript-advanced-types`, `nextjs-app-router-patterns`, `e2e-testing-patterns`, `memory-safety-patterns` |
| **Database & Turbopack** | `https://github.com/affaan-m/ecc` | MIT | `database-migrations`, `postgres-patterns`, `nextjs-turbopack` |
| **Docker Compose** | `https://github.com/docker/skills` | Apache-2.0 | `docker-compose-patterns` |
| **Engineering Practices & Quality** | `https://github.com/addyosmani/agent-skills` | MIT | `context-engineering`, `documentation-and-adrs`, `security-and-hardening`, `performance-optimization`, `observability-and-instrumentation`, `api-and-interface-design`, `test-driven-development` |
| **Web Quality & Playwright E2E** | `https://github.com/addyosmani/web-quality-skills`, `https://github.com/currents-dev/playwright-best-practices-skill` | MIT | `core-web-vitals`, `performance`, `playwright-best-practices` |
| **Next.js / React / UI / Design** | `https://github.com/vercel-labs/agent-skills`, `https://github.com/anthropics/skills`, `https://github.com/emilkowalski/skills`, `https://github.com/pbakaus/impeccable`, `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`, `https://github.com/shadcn-ui/ui` | MIT / Apache-2.0 / Skill-specific OSS | `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `frontend-design`, `emil-design-eng`, `impeccable`, `design-system`, `ui-ux-pro-max`, `shadcn` |
| **QA & Security Testing** | `https://github.com/daymade/claude-code-skills`, `https://github.com/softaworks/agent-toolkit`, `https://github.com/usestrix/strix`, `https://github.com/openai/skills`, `https://github.com/sickn33/agentic-awesome-skills` | MIT / Apache-2.0 / Skill-specific OSS | `qa-expert`, `qa-test-planner`, `api-security-testing`, `owasp-top-10-testing`, `web-app-penetration-testing`, `security-threat-model`, `api-security-best-practices`, `nodejs-best-practices` |
| **Spec, Context & Diagrams** | `https://github.com/bmad-code-org/bmad-method`, `https://github.com/warpdotdev/common-skills`, `https://github.com/mattpocock/skills`, `https://github.com/spillwavesolutions/design-doc-mermaid` | MIT / Skill-specific OSS | `bmad-project-context`, `check-impl-against-spec`, `validate-changes-match-specs`, `improve-codebase-architecture`, `design-doc-mermaid` |
| **Memoria Governance Standards** | Repository Internal (`AGENTS.md` / `docs/MEMORIA_ENGINEERING_STANDARDS.md`) | Internal | `agentic-integrity-and-security`, `clean-code-solid-engineering`, `code-quality-and-refactoring`, `error-handling-and-resilience`, `structured-logging-and-observability` |

---

## 3. SKILL DISCOVERY & VALIDATION CRITERIA

Before any skill is imported from GitHub into Memoria:
1. **License & Provenance Verification**: Repository must be verified on GitHub with open-source/permissive usage terms; unverified URLs are never fabricated.
2. **Valid Frontmatter Structure**: Every `SKILL.md` must parse cleanly with valid YAML frontmatter (`name`, `description`).
3. **Security Inspection**: Scripts and references are audited to ensure zero remote tracking, hidden credentials, or unsafe execution patterns.
4. **$0 Budget Compliance**: Skills requiring paid cloud subscriptions, credit cards, or proprietary SaaS keys are rejected.

---

## 4. MAINTENANCE & VERIFICATION RUNBOOK

1. Validate exact file parity across `.agents/skills/`, `.claude/skills/`, and `agent/skills/` (`diff -rq .agents/skills .claude/skills && diff -rq .agents/skills agent/skills`).
2. Run `pnpm run check:quality`, `pnpm -r build`, `NODE_ENV=test pnpm test`, and `npx skills list` after any skill update to verify repository health and skill discovery.
