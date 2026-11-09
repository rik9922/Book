# GRPC PROTOCOL BUFFERS CONTRACT GUIDELINES
**Memory Capsule Platform — Proto Schema Design, Versioning & Backward Compatibility**
**Document Version:** 1.0.0  

---

## 1. REPOSITORY STRUCTURE

All Protocol Buffers contracts reside centrally in `packages/proto/`:
```text
packages/proto/
  proto/
    common/v1/
      common.proto
    identity/v1/
      identity.proto
    memory/v1/
      memory.proto
    media/v1/
      media.proto
    book/v1/
      book.proto
  src/
    index.ts            # Client loaders and TypeScript interfaces
    grpc-common.ts      # Metadata, auth interceptors, deadlines, error mapper
  package.json
  tsconfig.json
```

---

## 2. CONTRACT CONVENTIONS & RULES

### 2.1 Package Naming & Versioning
- Every proto file must declare `syntax = "proto3";`.
- Package namespaces follow the strict structure `memorycapsule.<domain>.v<major>`:
  - `memorycapsule.common.v1`
  - `memorycapsule.identity.v1`
  - `memorycapsule.memory.v1`
- When breaking changes are required, a new version folder (e.g., `v2/`) must be introduced without breaking `v1`.

### 2.2 Field Numbers & Immutability
- **Never Change Field Numbers**: Once a field number is assigned to a field, it must never be altered or reused.
- **Reserved Numbers**: If a field is deprecated or removed, mark it `reserved`:
  ```protobuf
  message MemoryMessage {
    reserved 15, 16;
    reserved "old_field", "deprecated_tag";
  }
  ```
- **Optional Fields**: Use `optional` explicitly for nullable fields so that `null` vs default empty string/0 can be distinguished in TypeScript.

### 2.3 Shared Common Types (`common.proto`)
Reusable pagination parameters must import `common/v1/common.proto`:
```protobuf
import "common/v1/common.proto";

message ListMemoriesKeysetRequest {
  string space_id = 1;
  int32 limit = 2;
  optional string cursor_time = 3;
  optional string cursor_id = 4;
}
```

---

## 3. COMPILATION & CONSUMPTION

In accordance with our zero-dependency, local-first policy, contracts are loaded using `@grpc/proto-loader` and `@grpc/grpc-js`:
- Contracts are loaded synchronously on startup (`loadSync`) and cached.
- TypeScript definitions mirror the proto messages in `packages/proto/src/index.ts` with 100% type safety.
- Services import client and server definitions directly from `@memory-capsule/proto`.

