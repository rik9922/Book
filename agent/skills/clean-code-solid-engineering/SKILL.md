---
name: clean-code-solid-engineering
description: Enforces Clean Code standards, SOLID architectural principles, modular component design, DRY without excessive coupling, KISS, and YAGNI for maintainable production systems.
---

# Clean Code & SOLID Engineering Skill
*GitLab Duo & Open-Source Agent Ecosystem Standard*
*Source: GitLab Open-Source Engineering Standards (gitlab.com/gitlab-org)*
*License: MIT / Apache 2.0 Open Source*

## 1. Non-Negotiable Core Principles

### Single Responsibility Principle (SRP)
- Every class, function, or microservice module must have one and only one reason to change.
- Decouple business domain logic from transport protocols (HTTP/gRPC) and database persistence.
- Keep route handlers thin (controller pattern): parse input, delegate to domain service/repository, format response.

### Open/Closed Principle (OCP)
- Software entities must be open for extension but closed for modification.
- Rely on polymorphic interfaces (e.g., `DatabaseClient`, `StorageDriver`, `EventBus`) rather than hardcoding procedural conditional switches across services.

### Liskov Substitution Principle (LSP)
- Derived implementations or mock repositories (e.g., `PostgresUserRepository` and `InMemoryUserTestRepository`) must satisfy the exact contract behavior of their interface without throwing unexpected type errors or altering contract semantics.

### Interface Segregation Principle (ISP)
- Clients must never be forced to depend on methods they do not consume. Prefer focused, cohesive interfaces over monolith god-interfaces.

### Dependency Inversion Principle (DIP)
- High-level modules must depend on abstractions, never on concrete low-level implementations. Inject dependencies via constructor parameters or factory functions.

## 2. Clean Code Rules & Craftsmanship

1. **Intention-Revealing Naming**:
   - Variables and functions must describe their intent. Avoid single-letter variables except for loop indices.
   - Booleans must read like grammatical assertions: `isFrozenForPrint`, `hasValidToken`, `isFavorite`.
2. **Function Simplicity & Length**:
   - Strive for small, focused functions (under 25 lines of execution logic).
   - Functions should do one thing and do it well. Extract helper functions for secondary concerns.
3. **Cognitive Complexity & Nesting**:
   - Limit indentation depth (maximum 3 levels). Use guard clauses and early returns to flatten nested `if/else` ladders.
4. **Zero Dead Code**:
   - Remove unused imports, dead variables, unreachable switch cases, and commented-out legacy code immediately.
5. **No Primitive Obsession**:
   - Use strongly typed identifiers, domain enums, and Zod schemas rather than unvalidated primitive strings and arbitrary maps.

