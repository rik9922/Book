# Testing Strategy & Quality Assurance

## 1. Testing Pyramid

```
       /  E2E User Journeys  \
      /  (Playwright / Web)   \
     /-------------------------\
    / Integration & Contract    \
   / (Fastify Inject / Tests)    \
  /-------------------------------\
 / Unit Tests & Schema Validators  \
/   (Node Test Runner / Zod)        \
-------------------------------------
```

## 2. Test Suites
- **Contract & Schema Tests**: Validates that all Zod schemas strictly parse valid data and reject malicious/malformed inputs.
- **Service Integration Tests**: Uses Fastify's native `.inject()` to execute end-to-end HTTP lifecycles without spinning up physical network ports.
- **3D Visual & Performance Tests**: Benchmarks WebGL frame rates, memory disposal, and draw-call counts to ensure 60 FPS on standard devices.
- **Zero-Budget Compliance Tests**: Verifies quota rejection and file-size threshold enforcement.

