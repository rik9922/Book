---
name: agentic-integrity-and-security
description: Enforces continuous context retention, truthfulness and anti-hallucination verification, data privacy and secret non-exposure, automated QA and health monitoring, and defensive security.
---

# Agentic Integrity and Security Skill

This skill enforces continuous engineering discipline and security safeguards for the Memory Capsule ecosystem.

## 1. Context Retention & System Continuity
- Maintain continuous awareness of the product roadmap (`docs/DEVELOPMENT_ROADMAP.md`), the 164 screen inventory (`docs/SCREEN_INVENTORY.md`), and the zero-budget cardless policy (`docs/FREE_INFRASTRUCTURE_POLICY.md`).
- Before beginning new tasks, inspect active service boundaries, database schemas, and shared contracts to avoid duplicate or conflicting implementations.

## 2. Truthfulness & Anti-Hallucination Guardrails
- **No Fabricated Evidence**: Never report that an API, component, migration, or test is working without running verification commands.
- **Strict Verification Protocol**:
  1. Compile TypeScript across all workspaces: `pnpm build`
  2. Execute automated test suites: `NODE_ENV=test pnpm test`
  3. Inspect runtime logs for errors, unhandled rejections, or memory leaks.

## 3. Continuous Improvement & Health Monitoring
- Monitor repository health on every change:
  - Zero TypeScript compilation errors.
  - Zero failing test cases.
  - Zero unhandled async background jobs.
  - Clean git state with descriptive atomic commits.

## 4. Absolute Data Privacy & Secret Security
- **Confidentiality by Design**: User memories (photographs, audio voice notes, journal entries, family member relationships, child birthdates) must never be logged in cleartext, leaked in stack traces, or exposed in client bundles.
- **Zero Secret Exposure**: Prevent any API keys, database credentials, JWT secret salts, or cloud credentials from being committed or printed.
- **OWASP Top 10 Auditing**:
  - Prevent Broken Object Level Authorization (BOLA/IDOR) by checking space membership and user permissions on every request.
  - Enforce RFC 4122 UUID validation and strict Zod payload validation on every endpoint.
  - Rate-limit public authentication and upload endpoints.
  - Use scrypt for password hashing and signed JWT tokens with short expiry.

## 5. Zero-Budget & Cardless Enforcement
- Never activate or depend on services requiring credit card entry, PayPal, or automated pay-as-you-go transitions.
- Rely on local-first drivers (`LocalDiskStorageDriver`), self-hosted Docker compose services, and verified cardless developer tiers.

