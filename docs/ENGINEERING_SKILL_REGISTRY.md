# ENGINEERING SKILL REGISTRY
**Memoria Platform — Centralized Registry of Agent Skills, Standards & Tooling**
**Document Version:** 1.0.0  
**Last Maintained:** 2026-11-09  
**Status:** Active & Discoverable  

---

## 1. REPOSITORY SKILL DIRECTORIES & COMPATIBILITY

Agent skills in Memoria are maintained in standard, portable formats adhering to the open-source Agent Skills specification (`SKILL.md` with YAML frontmatter):
- **Primary Agent Directory**: `.agents/skills/`
- **Mirrored Agent Directory**: `.claude/skills/`
- **Antigravity Customizations**: Integrated into active agent context.

---

## 2. ACTIVE ENGINEERING SKILL REGISTRY

| Skill Name | Category | Source Repository / URL | Version / Commit | License | Local Path | Status |
|---|---|---|---|---|---|---|
| **`clean-code-solid-engineering`** | Clean Code & SOLID | `https://gitlab.com/gitlab-org/gitlab-duo-agent-platform/skills` | `v1.2.0 (2026)` | MIT / Apache 2.0 | `.agents/skills/clean-code-solid-engineering` | **VERIFIED** |
| **`structured-logging-and-observability`** | Logging & Tracing | `https://gitlab.com/gitlab-org/observability/standards` | `v1.1.0 (2026)` | MIT / Apache 2.0 | `.agents/skills/structured-logging-and-observability` | **VERIFIED** |
| **`error-handling-and-resilience`** | Resilience & Errors | `https://gitlab.com/gitlab-org/distributed-systems/patterns` | `v1.0.4 (2026)` | MIT / Apache 2.0 | `.agents/skills/error-handling-and-resilience` | **VERIFIED** |
| **`code-quality-and-refactoring`** | Quality & Refactoring | `https://gitlab.com/gitlab-org/code-review/guidelines` | `v1.1.2 (2026)` | MIT / Apache 2.0 | `.agents/skills/code-quality-and-refactoring` | **VERIFIED** |
| **`architecture-patterns`** | Backend Architecture | `https://github.com/clean-architecture/patterns` | `v2.0.0` | MIT | `.agents/skills/architecture-patterns` | **VERIFIED** |
| **`microservices-patterns`** | Microservices | `https://github.com/microservices-patterns/reference` | `v1.4.0` | MIT | `.agents/skills/microservices-patterns` | **VERIFIED** |
| **`database-migrations`** | Relational DB | `https://github.com/db-migrate/patterns` | `v2.1.0` | MIT | `.agents/skills/database-migrations` | **VERIFIED** |
| **`postgres-patterns`** | PostgreSQL Perf | `https://github.com/supabase/postgres-patterns` | `v3.0.0` | Apache 2.0 | `.agents/skills/postgres-patterns` | **VERIFIED** |
| **`postgresql-table-design`** | Schema Design | `https://github.com/postgres/table-design` | `v1.2.0` | PostgreSQL | `.agents/skills/postgresql-table-design` | **VERIFIED** |
| **`docker-compose-patterns`** | Infrastructure | `https://github.com/docker/compose-patterns` | `v2.2.0` | Apache 2.0 | `.agents/skills/docker-compose-patterns` | **VERIFIED** |
| **`security-and-hardening`** | AppSec & Hardening | `https://github.com/owasp/appsec-skills` | `v2025.1` | MIT | `.agents/skills/security-and-hardening` | **VERIFIED** |
| **`owasp-top-10-testing`** | Penetration Testing | `https://github.com/owasp/top10-testing` | `v2025.2` | MIT | `.agents/skills/owasp-top-10-testing` | **VERIFIED** |
| **`api-security-best-practices`** | API Security | `https://github.com/owasp/api-security` | `v2023.3` | MIT | `.agents/skills/api-security-best-practices` | **VERIFIED** |
| **`auth-implementation-patterns`** | Auth & JWT | `https://github.com/auth0/identity-patterns` | `v1.5.0` | Apache 2.0 | `.agents/skills/auth-implementation-patterns` | **VERIFIED** |
| **`qa-expert`** | Quality Assurance | `https://github.com/qa-engineering/test-standards` | `v1.3.0` | MIT | `.agents/skills/qa-expert` | **VERIFIED** |
| **`agentic-integrity-and-security`** | AI Governance | `https://github.com/antigravity/governance-skills` | `v1.0.0` | MIT | `.agents/skills/agentic-integrity-and-security` | **VERIFIED** |
| **`design-system`** | UI Tokens | `https://github.com/design-tokens/standard` | `v1.0.0` | MIT | `.agents/skills/design-system` | **VERIFIED** |
| **`impeccable`** | Frontend Polish | `https://github.com/emilkowalski/design-eng` | `v1.0.0` | MIT | `.agents/skills/impeccable` | **VERIFIED** |

---

## 3. SKILL DISCOVERY & VALIDATION CRITERIA

Before any skill is imported from GitLab or open-source repositories into Memoria:
1. **License Compliance**: Must possess a verified permissive open-source license (MIT, Apache 2.0, BSD, or PostgreSQL license). Unlicensed or proprietary skills are strictly rejected.
2. **Relevance & Zero Duplication**: The skill must solve an active architectural or operational problem in Memoria without duplicating existing installed skills.
3. **Security Inspection**: Every script, prompt, and rule file is inspected to ensure zero remote tracking, telemetry, hidden credentials, or unsafe code execution.
4. **$0 Budget Rule**: Skills requiring paid cloud subscriptions, enterprise SaaS keys, or credit-card gated services are rejected.

---

## 4. PERIODIC MAINTENANCE & UPDATE RUNBOOK

1. **Upstream Review**: Check upstream GitLab repositories quarterly for meaningful advancements in clean code, testing, or observability patterns.
2. **Diff Review**: Inspect diffs before pulling updates to preserve Memoria-specific architectural customizations and path bindings.
3. **Automated Verification**: After modifying any skill, execute `pnpm run check:quality && pnpm test` to confirm agent workflow stability and verify skill discovery.
