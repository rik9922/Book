---
name: code-quality-and-refactoring
description: Enforces code quality gates, code smell detection, cognitive complexity reduction, automated linting, strict TypeScript typing without unnecessary any, and regression prevention.
---

# Code Quality & Refactoring Skill
*GitLab Open-Source Code Review & Quality Engineering Standards*
*Source: GitLab Duo Code Review Guidelines*
*License: MIT / Apache 2.0 Open Source*

## 1. Quality Gates & Pre-Commit Rules

Before any pull request, commit, or agent completion report:
1. **TypeScript Strictness**: `tsc --noEmit` must pass with zero errors across all workspaces.
2. **Automated Test Passes**: All unit and integration test suites must pass 100% (`pnpm test`).
3. **No Unsafe Type Escapes**: Avoid `any` escapes. Use `unknown` with runtime type guards (e.g. `zod` or `typeof/instanceof`) for external unvalidated data.
4. **Zero Console Calls**: Run linter checks to ensure production service code has zero `console.log/error/warn`.

## 2. Code Smell Detection & Refactoring Patterns

| Code Smell | Architectural Risk | Remediation Pattern |
|---|---|---|
| **Long Method (>30 lines)** | Hard to test and maintain; multiple reasons to change. | Extract sub-routines into pure private functions or domain helpers. |
| **Large Class / God Object** | Violates SRP; tight coupling. | Split into bounded domain repositories and single-purpose services. |
| **Deep Nesting (>3 levels)** | High cyclomatic complexity; error prone. | Use early guard returns (`if (!condition) return;`). |
| **Duplicated Logic** | Bug fixes missed in copies; DRY violation. | Move shared logic into `@memory-capsule/contracts` or `@memory-capsule/database`. |
| **Silent Fallbacks** | Hidden production failures; data loss. | Fail fast with clear typed errors when required config or databases fail. |

## 3. Regression Prevention Protocol

- Every bug discovered and fixed must be accompanied by an automated regression test in `tests/` that recreates the failing edge case and asserts the resolution.
- Never weaken existing tests, comment out assertions, or delete test suites to force a passing build.

