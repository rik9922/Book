import fs from "node:fs";
import path from "node:path";
import { ScreenSpec } from "./types.js";
import { pwaScreens1 } from "./pwa-screens-1.js";
import { pwaScreens2 } from "./pwa-screens-2.js";
import { pwaScreens3 } from "./pwa-screens-3.js";
import { iosScreens1 } from "./ios-screens-1.js";
import { iosScreens2 } from "./ios-screens-2.js";
import { adminScreens } from "./admin-screens.js";

function escapeTableCell(text: string): string {
  return text
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function toGithubSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s/g, "-");
}

interface SubcategoryGroup {
  number: string;
  title: string;
  startId: string;
  endId: string;
}

const PWA_SUBSECTIONS: SubcategoryGroup[] = [
  { number: "1.1", title: "Public Experience", startId: "PWA-01", endId: "PWA-07" },
  { number: "1.2", title: "Authentication & Onboarding", startId: "PWA-08", endId: "PWA-18" },
  { number: "1.3", title: "Home, Spaces, People & Collections", startId: "PWA-19", endId: "PWA-32" },
  { number: "1.4", title: "Memory Archive & Management", startId: "PWA-33", endId: "PWA-48" },
  { number: "1.5", title: "Collaboration & Sharing", startId: "PWA-49", endId: "PWA-55" },
  { number: "1.6", title: "Book Creation & 3D Studio", startId: "PWA-56", endId: "PWA-70" },
  { number: "1.7", title: "Physical Book Commerce & Fulfillment", startId: "PWA-71", endId: "PWA-76" },
  { number: "1.8", title: "Account & Support", startId: "PWA-77", endId: "PWA-82" },
];

const IOS_SUBSECTIONS: SubcategoryGroup[] = [
  { number: "2.1", title: "Native iOS Authentication & Onboarding", startId: "IOS-01", endId: "IOS-10" },
  { number: "2.2", title: "Native iOS Home & Navigation", startId: "IOS-11", endId: "IOS-16" },
  { number: "2.3", title: "Native iOS Capture & Uploads", startId: "IOS-17", endId: "IOS-22" },
  { number: "2.4", title: "Native iOS Memory Browsing & Management", startId: "IOS-23", endId: "IOS-34" },
  { number: "2.5", title: "Native iOS Profiles & Collaboration", startId: "IOS-35", endId: "IOS-42" },
  { number: "2.6", title: "Native iOS Books & Publishing", startId: "IOS-43", endId: "IOS-51" },
  { number: "2.7", title: "Native iOS Commerce & Account", startId: "IOS-52", endId: "IOS-56" },
];

const ADMIN_SUBSECTIONS: SubcategoryGroup[] = [
  { number: "3.1", title: "Platform & User Administration", startId: "ADMIN-01", endId: "ADMIN-05" },
  { number: "3.2", title: "Content Moderation & Safety", startId: "ADMIN-06", endId: "ADMIN-07" },
  { number: "3.3", title: "Storage & Media Infrastructure", startId: "ADMIN-08", endId: "ADMIN-10" },
  { number: "3.4", title: "Background Processing & Engine Telemetry", startId: "ADMIN-11", endId: "ADMIN-15" },
  { number: "3.5", title: "Physical Print & Commerce Operations", startId: "ADMIN-16", endId: "ADMIN-21" },
  { number: "3.6", title: "System Governance, Security & Audit", startId: "ADMIN-22", endId: "ADMIN-26" },
];

function formatScreenMarkdown(screen: ScreenSpec): string {
  const lines: string[] = [];

  lines.push(`### ${screen.id} — ${screen.name}`);
  lines.push("");
  lines.push(`**Category**: ${screen.category}  `);
  lines.push(`**Verified Status**: \`${screen.verifiedStatus}\``);
  lines.push("");

  // 1. Core Intent & Story
  lines.push("#### 1. Core Intent & User Story");
  lines.push(`- **User Goal**: ${screen.userGoal}`);
  lines.push(`- **User Story**: "${screen.userStory}"`);
  lines.push("");

  // 2. Navigation & Routing
  lines.push("#### 2. Navigation & Routing");
  lines.push(`- **Entry Routes**: ${screen.entryExitRoutes.entry.map(r => `\`${r}\``).join(", ")}`);
  lines.push(`- **Exit Routes**: ${screen.entryExitRoutes.exit.map(r => `\`${r}\``).join(", ")}`);
  lines.push(`- **Back Navigation**: \`${screen.entryExitRoutes.back}\``);
  if (screen.entryExitRoutes.deepLink) {
    lines.push(`- **Deep Link**: \`${screen.entryExitRoutes.deepLink}\``);
  }
  lines.push("");

  // 3. Personas & Authorization
  lines.push("#### 3. Personas & Authorization");
  lines.push(`- **Eligible Roles**: ${screen.personasPermissions.roles.join(", ")}`);
  lines.push(`- **Required Capabilities**: ${screen.personasPermissions.capabilities.map(c => `\`${c}\``).join(", ")}`);
  lines.push(`- **Authentication Required**: ${screen.personasPermissions.authRequired ? "Yes (Authenticated Session)" : "No (Public / Unauthenticated Access Allowed)"}`);
  lines.push("");

  // 4. Content Hierarchy
  lines.push("#### 4. Content Hierarchy & Visual Wireframe");
  lines.push(`- **Header**: ${screen.contentHierarchy.header}`);
  lines.push(`- **Main Content**: ${screen.contentHierarchy.main}`);
  if (screen.contentHierarchy.aside) {
    lines.push(`- **Aside / Sidebar**: ${screen.contentHierarchy.aside}`);
  }
  if (screen.contentHierarchy.footer) {
    lines.push(`- **Footer / Actions Bar**: ${screen.contentHierarchy.footer}`);
  }
  if (screen.contentHierarchy.safeArea) {
    lines.push(`- **Safe Area Constraints**: ${screen.contentHierarchy.safeArea}`);
  }
  lines.push("");

  // 5. Interactive Controls
  lines.push("#### 5. Interactive Controls & UI Elements");
  for (const control of screen.exactControls) {
    lines.push(`- ${control}`);
  }
  lines.push("");

  // 6. Form Validation
  if (screen.formValidation && screen.formValidation.fields.length > 0) {
    lines.push("#### 6. Form Validation & Data Schema");
    lines.push("");
    lines.push("| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |");
    lines.push("|---|---|---|---|---|---|");
    for (const field of screen.formValidation.fields) {
      lines.push(`| \`${field.name}\` | \`${field.type}\` | ${field.required ? "**Yes**" : "No"} | ${escapeTableCell(field.limits || "N/A")} | ${escapeTableCell(field.validationRule || "Standard type validation")} | ${escapeTableCell(field.errorCopy || "Invalid value")} |`);
    }
    lines.push("");
  }

  // 7. Focus & Keyboard
  lines.push("#### 7. Focus Management & Keyboard Navigation");
  lines.push(`- **Initial Focus**: \`${screen.keyboardFocus.initialFocus}\``);
  lines.push(`- **Tab Sequence**: ${screen.keyboardFocus.tabOrder.length > 0 ? screen.keyboardFocus.tabOrder.map(t => `\`${t}\``).join(" -> ") : "N/A"}`);
  if (screen.keyboardFocus.shortcuts && screen.keyboardFocus.shortcuts.length > 0) {
    lines.push(`- **Keyboard Shortcuts**: ${screen.keyboardFocus.shortcuts.map(s => `\`${s}\``).join(", ")}`);
  }
  lines.push(`- **Escape Key Action**: ${screen.keyboardFocus.escapeBehavior}`);
  lines.push("");

  // 8. States Matrix
  lines.push("#### 8. States Matrix");
  lines.push(`- **Loading State**: ${screen.statesMatrix.loading}`);
  lines.push(`- **Empty State**: ${screen.statesMatrix.empty}`);
  lines.push(`- **Populated State**: ${screen.statesMatrix.populated}`);
  lines.push(`- **Error State**: ${screen.statesMatrix.error}`);
  lines.push(`- **Offline Mode**: ${screen.statesMatrix.offline}`);
  if (screen.statesMatrix.conflictOrStale) {
    lines.push(`- **Conflict / Stale Data**: ${screen.statesMatrix.conflictOrStale}`);
  }
  lines.push(`- **Permission Denied**: ${screen.statesMatrix.permissionDenied}`);
  lines.push("");

  // 9. Confirmation & Cancellation
  if (screen.confirmationCancellation) {
    lines.push("#### 9. Confirmation & Cancellation Workflows");
    lines.push(screen.confirmationCancellation);
    lines.push("");
  }

  // 10. Accessibility
  lines.push("#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)");
  lines.push(`- **Standard**: ${screen.accessibility.wcagStandard}`);
  lines.push(`- **Screen Reader Summary**: "${screen.accessibility.voiceOverSummary}"`);
  lines.push(`- **Touch Target Minimum**: \`${screen.accessibility.touchTargetMin}\``);
  lines.push(`- **Focus Trapping**: ${screen.accessibility.focusTrapping ? "Enforced (modal context)" : "Disabled (natural page flow)"}`);
  lines.push(`- **Contrast Ratio**: \`${screen.accessibility.contrastRatio}\``);
  lines.push("");

  // 11. Responsive Layouts
  lines.push("#### 11. Responsive & Adaptive Layouts");
  lines.push(`- **Mobile (< 768px)**: ${screen.responsive.mobile}`);
  lines.push(`- **Tablet (768px – 1024px)**: ${screen.responsive.tablet}`);
  lines.push(`- **Desktop (> 1024px)**: ${screen.responsive.desktop}`);
  lines.push("");

  // 12. API Contract
  lines.push("#### 12. API Contract & Network Communication");
  lines.push(`- **Method & Endpoint**: \`${screen.apiContract.method}\` \`${screen.apiContract.endpoint}\``);
  lines.push(`- **Authorization**: \`${screen.apiContract.authType}\``);
  if (screen.apiContract.requestBody) {
    lines.push(`- **Request Payload**: \`${screen.apiContract.requestBody}\``);
  }
  lines.push(`- **Response Payload**: \`${screen.apiContract.responseBody}\``);
  lines.push(`- **Status Codes**: ${screen.apiContract.statusCodes.map(s => `\`${s}\``).join(", ")}`);
  lines.push("");

  // 13. Service Persistence
  lines.push("#### 13. Service Architecture & Persistence");
  lines.push(`- **Backend Service**: \`${screen.servicePersistence.service}\``);
  lines.push(`- **Database Tables**: ${screen.servicePersistence.databaseTables.length > 0 ? screen.servicePersistence.databaseTables.map(t => `\`${t}\``).join(", ") : "_None (Stateless / InMemory)_"}`);
  lines.push(`- **Transactional Outbox**: ${screen.servicePersistence.outboxPattern ? "**Enabled** (Guarantees at-least-once distributed event publishing)" : "Disabled"}`);
  lines.push("");

  // 14. Events & Jobs
  lines.push("#### 14. Event Contracts & Background Jobs");
  lines.push(`- **Events Emitted**: ${screen.eventsJobs.eventsEmitted.length > 0 ? screen.eventsJobs.eventsEmitted.map(e => `\`${e}\``).join(", ") : "_None_"}`);
  lines.push(`- **BullMQ Background Jobs**: ${screen.eventsJobs.bullmqJobs.length > 0 ? screen.eventsJobs.bullmqJobs.map(j => `\`${j}\``).join(", ") : "_None_"}`);
  lines.push("");

  // 15. Audit & Privacy
  lines.push("#### 15. Audit Logging & Data Sovereignty");
  lines.push(`- **PII Sensitivity Level**: \`${screen.auditPrivacy.piiLevel}\``);
  lines.push(`- **Security Audit Logged**: ${screen.auditPrivacy.auditLogged ? "**Yes** (Appended to immutable audit ledger)" : "No"}`);
  lines.push(`- **Privacy Architecture**: ${screen.auditPrivacy.privacyNotes}`);
  lines.push("");

  // 16. Test Acceptance Criteria
  lines.push("#### 16. Test Acceptance Criteria");
  lines.push("- **Unit Tests**:");
  for (const u of screen.testCriteria.unit) {
    lines.push(`  - [ ] ${u}`);
  }
  lines.push("- **Integration Tests**:");
  for (const i of screen.testCriteria.integration) {
    lines.push(`  - [ ] ${i}`);
  }
  lines.push("- **End-to-End Acceptance Tests**:");
  for (const e of screen.testCriteria.e2e) {
    lines.push(`  - [ ] ${e}`);
  }
  lines.push("");

  // 17. UI Components
  lines.push("#### 17. UI Component Inventory");
  lines.push(screen.uiComponents.map(c => `\`${c}\``).join(", "));
  lines.push("");
  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

function generateTraceabilityRow(screen: ScreenSpec): string {
  const id = `\`${screen.id}\``;
  const userStory = escapeTableCell(screen.userStory);
  const uiComponents = escapeTableCell(screen.uiComponents.slice(0, 4).join(", ") + (screen.uiComponents.length > 4 ? ` (+${screen.uiComponents.length - 4})` : ""));
  const apiEndpoint = escapeTableCell(`${screen.apiContract.method} ${screen.apiContract.endpoint}`);
  const service = escapeTableCell(screen.servicePersistence.service.split("/")[0].trim());
  const dbTables = escapeTableCell(screen.servicePersistence.databaseTables.join(", ") || "None");
  
  const eventsAndJobsList: string[] = [];
  if (screen.eventsJobs.eventsEmitted.length > 0) {
    eventsAndJobsList.push(`Events: ${screen.eventsJobs.eventsEmitted.slice(0, 2).join(", ")}`);
  }
  if (screen.eventsJobs.bullmqJobs.length > 0) {
    eventsAndJobsList.push(`Jobs: ${screen.eventsJobs.bullmqJobs.slice(0, 2).join(", ")}`);
  }
  const eventsAndJobs = escapeTableCell(eventsAndJobsList.join("; ") || "None");

  const testSummary = escapeTableCell(`Unit: ${screen.testCriteria.unit.length}, Int: ${screen.testCriteria.integration.length}, E2E: ${screen.testCriteria.e2e.length}`);
  const verifiedStatus = escapeTableCell(screen.verifiedStatus);

  return `| ${id} | ${userStory} | ${uiComponents} | ${apiEndpoint} | ${service} | ${dbTables} | ${eventsAndJobs} | ${testSummary} | ${verifiedStatus} |`;
}

export function generateFullSpecDocument(): string {
  const allScreens: ScreenSpec[] = [
    ...pwaScreens1,
    ...pwaScreens2,
    ...pwaScreens3,
    ...iosScreens1,
    ...iosScreens2,
    ...adminScreens
  ];

  // Validation
  if (allScreens.length !== 164) {
    throw new Error(`Expected exactly 164 screens, found ${allScreens.length}`);
  }

  const seenIds = new Set<string>();
  for (const s of allScreens) {
    if (seenIds.has(s.id)) {
      throw new Error(`Duplicate Screen ID detected: ${s.id}`);
    }
    seenIds.add(s.id);
  }

  const docLines: string[] = [];

  // Document Title & Master Header
  docLines.push("# MEMORIA — MASTER PRODUCT SCREEN SPECIFICATIONS");
  docLines.push("");
  docLines.push("**Official Product Name**: **Memoria**  ");
  docLines.push("**Official Product Tagline**: *Your memories, made timeless.*  ");
  docLines.push("**Document Version**: 2.0.0 (Production Master Reference)  ");
  docLines.push(`**Generated Timestamp**: ${new Date().toISOString()}  `);
  docLines.push("**Total Canonical Screens**: **164 Screens** (82 Web/PWA, 56 Native iOS, 26 Admin Portal)  ");
  docLines.push("**Architectural Governance**: Sections 2 and 10 of the Memoria Master Engineering Directive  ");
  docLines.push("");
  docLines.push("---");
  docLines.push("");

  // Executive Architecture Summary
  docLines.push("## EXECUTIVE ARCHITECTURE & DESIGN GOVERNANCE");
  docLines.push("");
  docLines.push("This document establishes the exhaustive, binding single source of truth for all user-facing, native mobile, and administrative surfaces of the **Memoria** heirloom preservation platform.");
  docLines.push("");
  docLines.push("### 1. Brand Identity & Visual Language");
  docLines.push("- **Design Philosophy**: Archival heirloom warmth, timeless editorial restraint, Cormorant Garamond headings, Inter body typography, subtle gold leaf foil embossing.");
  docLines.push("- **Strict Light Mode Only**: Zero dark mode. All screens are grounded on Warm Ivory canvas (`brand.ivory #F7F4EE`) with Deep Archival Ink (`brand.ink #20242C`), Heritage Plum (`brand.plum #76556F`), Forest Sage (`brand.sage #849483`), and Warm Ochre (`brand.ochre #D8973C`).");
  docLines.push("- **WCAG 2.2 AA Compliance**: Universal 44x44 pt/px touch targets, full VoiceOver/Screen Reader label coverage, and contrast ratios >= 7.2:1 for typography.");
  docLines.push("");
  docLines.push("### 2. Strict Zero-Budget & Data Sovereignty Policy ($0 Budget, Cardless)");
  docLines.push("- **Cardless Infrastructure**: Zero dependencies on credit card-gated cloud services. Cloudflare R2 is explicitly prohibited unless verified cardless.");
  docLines.push("- **Local-First Storage**: Media files, thumbnails, and book models reside in local filesystem storage via `LocalDiskStorageDriver` (`storage/local/`).");
  docLines.push("- **Strict 500 MB Free Quota**: Storage quotas are strictly monitored per space with atomic pre-allocation checks and lossless WebP/AVIF derivative generation.");
  docLines.push("");
  docLines.push("### 3. Hybrid Distributed Communication Architecture");
  docLines.push("- **Public Gateway**: RESTful HTTP/2 API Gateway with Zod input validation and JWT Bearer authorization.");
  docLines.push("- **Internal Inter-Service**: High-throughput gRPC channels with Protobuf contracts between microservices.");
  docLines.push("- **Asynchronous Messaging**: NATS JetStream distributed event bus for domain events.");
  docLines.push("- **Background Job Queues**: BullMQ workers backed by Redis for image processing, OCR, PDF generation, and email dispatch.");
  docLines.push("- **Transactional Outbox Pattern**: Multi-entity mutations stage events atomically in PostgreSQL `outbox_events` table before publication.");
  docLines.push("");
  docLines.push("---");
  docLines.push("");

  // Table of Contents
  docLines.push("## TABLE OF CONTENTS");
  docLines.push("");

  const part1Header = "PART 1: WEB & PROGRESSIVE WEB APP (PWA-01 to PWA-82)";
  docLines.push(`- [${part1Header}](#${toGithubSlug(part1Header)})`);
  for (const g of PWA_SUBSECTIONS) {
    const subTitle = `${g.number} ${g.title} (${g.startId} to ${g.endId})`;
    docLines.push(`  - [${subTitle}](#${toGithubSlug(subTitle)})`);
  }

  const part2Header = "PART 2: NATIVE IOS EXPERIENCES (IOS-01 to IOS-56)";
  docLines.push(`- [${part2Header}](#${toGithubSlug(part2Header)})`);
  for (const g of IOS_SUBSECTIONS) {
    const subTitle = `${g.number} ${g.title} (${g.startId} to ${g.endId})`;
    docLines.push(`  - [${subTitle}](#${toGithubSlug(subTitle)})`);
  }

  const part3Header = "PART 3: ADMINISTRATIVE PORTAL (ADMIN-01 to ADMIN-26)";
  docLines.push(`- [${part3Header}](#${toGithubSlug(part3Header)})`);
  for (const g of ADMIN_SUBSECTIONS) {
    const subTitle = `${g.number} ${g.title} (${g.startId} to ${g.endId})`;
    docLines.push(`  - [${subTitle}](#${toGithubSlug(subTitle)})`);
  }

  const part4Header = "PART 4: MASTER TRACEABILITY MATRIX (ALL 164 SCREENS)";
  docLines.push(`- [${part4Header}](#${toGithubSlug(part4Header)})`);
  docLines.push("");
  docLines.push("---");
  docLines.push("");

  // PART 1: PWA
  docLines.push(`## ${part1Header}`);
  docLines.push("");
  const pwaScreens = [...pwaScreens1, ...pwaScreens2, ...pwaScreens3];
  const pwaGroupMap = new Map<string, SubcategoryGroup>();
  for (const g of PWA_SUBSECTIONS) {
    pwaGroupMap.set(g.startId, g);
  }

  for (const s of pwaScreens) {
    const group = pwaGroupMap.get(s.id);
    if (group) {
      docLines.push(`### ${group.number} ${group.title} (${group.startId} to ${group.endId})`);
      docLines.push("");
    }
    docLines.push(formatScreenMarkdown(s));
  }

  // PART 2: IOS
  docLines.push(`## ${part2Header}`);
  docLines.push("");
  const iosScreens = [...iosScreens1, ...iosScreens2];
  const iosGroupMap = new Map<string, SubcategoryGroup>();
  for (const g of IOS_SUBSECTIONS) {
    iosGroupMap.set(g.startId, g);
  }

  for (const s of iosScreens) {
    const group = iosGroupMap.get(s.id);
    if (group) {
      docLines.push(`### ${group.number} ${group.title} (${group.startId} to ${group.endId})`);
      docLines.push("");
    }
    docLines.push(formatScreenMarkdown(s));
  }

  // PART 3: ADMIN
  docLines.push(`## ${part3Header}`);
  docLines.push("");
  const adminGroupMap = new Map<string, SubcategoryGroup>();
  for (const g of ADMIN_SUBSECTIONS) {
    adminGroupMap.set(g.startId, g);
  }

  for (const s of adminScreens) {
    const group = adminGroupMap.get(s.id);
    if (group) {
      docLines.push(`### ${group.number} ${group.title} (${group.startId} to ${group.endId})`);
      docLines.push("");
    }
    docLines.push(formatScreenMarkdown(s));
  }

  // PART 4: TRACEABILITY MATRIX
  docLines.push(`## ${part4Header}`);
  docLines.push("");
  docLines.push("The following traceability matrix establishes the direct mapping between each screen, its user story, user interface components, API endpoints, microservices, database tables, event contracts, test acceptance criteria, and verified implementation status.");
  docLines.push("");
  docLines.push("| Screen ID | User Story | UI Components | API Endpoint | Service | DB Tables | Events/Jobs | Test Criteria | Verified Status |");
  docLines.push("|---|---|---|---|---|---|---|---|---|");

  for (const s of allScreens) {
    docLines.push(generateTraceabilityRow(s));
  }

  docLines.push("");
  docLines.push("---");
  docLines.push("");
  docLines.push("**End of Specification Document.** *Memoria — Your memories, made timeless.*");
  docLines.push("");

  return docLines.join("\n");
}

export function writeSpecificationDocument(): void {
  const outputPath = path.resolve(process.cwd(), "docs/PRODUCT_SCREEN_SPECIFICATIONS.md");
  process.stdout.write(`Generating master specification document at: ${outputPath}\n`);

  const markdownContent = generateFullSpecDocument();
  fs.writeFileSync(outputPath, markdownContent, "utf-8");

  const stat = fs.statSync(outputPath);
  const lineCount = markdownContent.split("\n").length;
  process.stdout.write(`Successfully wrote ${lineCount} lines (${Math.round(stat.size / 1024)} KB) to ${outputPath}\n`);
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  writeSpecificationDocument();
}
