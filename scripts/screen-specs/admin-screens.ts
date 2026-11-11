import { ScreenSpec } from "./types.js";

export const adminScreens: ScreenSpec[] = [
  // ==========================================
  // 3.1 PLATFORM & USER ADMINISTRATION (ADMIN-01 to ADMIN-05)
  // ==========================================
  {
    id: "ADMIN-01",
    category: "Admin Portal — Platform & User Administration",
    name: "Platform Executive Overview & Health Dashboard",
    userGoal: "Monitor platform-wide health metrics, active family spaces, storage utilization, background job throughput, and active user growth in real time.",
    userStory: "As a platform operations lead, I want an executive overview dashboard with real-time telemetry cards and storage metrics to ensure the $0 local infrastructure runs smoothly.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/dashboard"],
      exit: ["/admin/users", "/admin/spaces", "/admin/storage", "/admin/queues", "/admin/orders"],
      back: "/admin",
      deepLink: "https://admin.memoria.local/dashboard"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Operations Admin"],
      capabilities: ["view_executive_dashboard", "view_platform_telemetry"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Admin global topbar with Memoria Archival insignia, active admin badge, live WebSocket cluster heartbeat indicator, and quick search shortcut (Cmd+K).",
      main: "1. KPI Summary Cards: Active Spaces (e.g. 1,420), Total Memories Preserved (e.g. 84,310), Storage Reserved (e.g. 312 GB / 500 GB local limit), BullMQ Job Throughput (99.8% success), 2. High-priority alerts drawer, 3. Microservice health status grid, 4. Recent system security log feed.",
      aside: "Collapsible admin sidebar navigation with section headers: Operations, Content, Infrastructure, Commerce, Governance."
    },
    exactControls: [
      "Timeframe selector pill group (Last 1h, 24h, 7d, 30d)",
      "Global search bar (Cmd+K)",
      "Service restart / reload telemetry button",
      "Export platform KPI snapshot button (JSON/CSV)",
      "Alert drawer dismiss / acknowledge action"
    ],
    keyboardFocus: {
      initialFocus: "Timeframe selector",
      tabOrder: ["Sidebar navigation", "Timeframe selector", "KPI Cards", "Alerts Drawer", "Service Grid"],
      shortcuts: ["Cmd+K (Quick Search)", "Shift+R (Refresh Metrics)"],
      escapeBehavior: "Closes modal overlays and resets filter"
    },
    statesMatrix: {
      loading: "Warm Ivory skeleton shimmer over all 4 KPI summary cards and telemetry charts.",
      empty: "Notice: 'No telemetry data collected for current window.'",
      populated: "Real-time updated stat cards with color-coded trend badges (Emerald green +4.2%, Sage neutral).",
      error: "Prominent error banner: 'Failed to stream telemetry from NATS event bus. Falling back to polling.'",
      offline: "Offline indicator banner: 'Disconnected from admin gateway. Read-only cached state.'",
      permissionDenied: "403 Forbidden screen: 'Superadmin privileges required to access executive dashboard.'"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Executive overview dashboard. Total active spaces 1,420. Storage at 62 percent of budget. All microservices operational.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1 (Deep Ink #20242C on Warm Ivory #F7F4EE)"
    },
    responsive: {
      mobile: "Single column stacked stat cards with swipeable KPI strip.",
      tablet: "2-column KPI grid with collapsible drawer navigation.",
      desktop: "4-column metric grid with persistent sidebar and real-time canvas chart."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/overview/metrics",
      authType: "Bearer JWT + Admin Role",
      responseBody: "{ success: true, data: { activeSpaces: number, totalMemories: number, storageBytes: number, queueSuccessRate: number, services: Array<ServiceHealth> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "api-gateway / identity-service",
      databaseTables: ["users", "memory_spaces", "space_storage_quotas", "memories"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.dashboard_viewed"],
      bullmqJobs: ["aggregate-daily-platform-kpis"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Aggregated statistical figures only; zero individual memory payloads or private family names exposed."
    },
    testCriteria: {
      unit: ["formats byte sizes to GB with 1 decimal precision", "calculates queue health percentage without divide-by-zero error"],
      integration: ["GET /api/admin/overview/metrics returns valid HTTP 200 with all KPI fields"],
      e2e: ["logs in as superadmin, loads dashboard, validates all 4 metric cards populate within 1.5 seconds"]
    },
    uiComponents: ["AdminTopbar", "SidebarNavigation", "KPISummaryCard", "ServiceHealthGrid", "AlertDrawer"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-02",
    category: "Admin Portal — Platform & User Administration",
    name: "User Directory, Status Governance & Verification Console",
    userGoal: "Search, filter, and inspect registered user accounts, manage account locks, verify identity credentials, and enforce terms compliance.",
    userStory: "As an administrative compliance officer, I want to search registered accounts by email or ID, inspect verification badges, and suspend compromised accounts.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/dashboard", "/admin/users"],
      exit: ["/admin/users/:userId", "/admin/audit-logs"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/users"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Compliance Officer", "Support Lead"],
      capabilities: ["view_users", "manage_user_status", "verify_users"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumb navigation (Admin > Users), page title 'User Directory', search input, and export CSV button.",
      main: "1. Filter toolbar (Verification: All/Verified/Pending, Status: Active/Suspended/Banned, Role: Member/Contributor/Admin), 2. Paginated tabular directory (Avatar, Full Name, Email, Spaces Owned, Created Date, MFA Status, Account Status pill), 3. Action context menu per row.",
      footer: "Keyset pagination bar with items per page selector (25, 50, 100) and total count indicator."
    },
    exactControls: [
      "User search input with debounced API lookup",
      "Filter chip dropdowns (Status, Verification, MFA)",
      "Row action button: 'Inspect User Details'",
      "Row action button: 'Suspend Account' (opens confirmation modal)",
      "Export user directory CSV button"
    ],
    keyboardFocus: {
      initialFocus: "User search input",
      tabOrder: ["Search input", "Filter dropdowns", "Table rows", "Pagination controls"],
      escapeBehavior: "Clears active search query"
    },
    statesMatrix: {
      loading: "Tabular skeleton rows with pulsing pill placeholders.",
      empty: "Notice: 'No users match the specified search or filter criteria.'",
      populated: "Crisp table rows with Cormorant Garamond names, Inter monospace UUIDs, and color-coded status badges.",
      error: "Error callout: 'Unable to load user directory. Please retry.'",
      offline: "Offline banner: 'Admin portal requires active connection to identity-service.'",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "User directory table. 2,410 total users. Showing page 1 of 48. Double tap any user row to view details.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view with user avatar and essential status pills.",
      tablet: "Compact table with horizontal scrolling for secondary metadata.",
      desktop: "Full desktop data grid with inline sortable columns and action menus."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/users",
      authType: "Bearer JWT + Admin Role",
      requestBody: "Query: { page: number, limit: number, search?: string, status?: string }",
      responseBody: "{ success: true, data: { users: Array<AdminUserSummary>, total: number, page: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "user_sessions", "memory_spaces"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.user_directory_searched"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Admin searches and user listings are logged to immutable audit records with admin ID."
    },
    testCriteria: {
      unit: ["debounces search input by 300ms", "formats account status badges according to design tokens"],
      integration: ["GET /api/admin/users?search=test filters database records correctly"],
      e2e: ["enters query in search bar, verifies results update, clicks on user row to navigate to details"]
    },
    uiComponents: ["DataTable", "SearchInput", "FilterDropdown", "StatusBadge", "PaginationBar"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-03",
    category: "Admin Portal — Platform & User Administration",
    name: "User Security Dossier & Session Invalidation Console",
    userGoal: "Deep-inspect an individual user's security posture, active login sessions, MFA enrollment, authentication logs, and trigger global session invalidation.",
    userStory: "As an admin investigating suspected account takeover, I want to review all active sessions and invalidate them immediately to protect family memories.",
    entryExitRoutes: {
      entry: ["/admin/users", "/admin/users/:userId"],
      exit: ["/admin/users", "/admin/audit-logs?userId=:userId"],
      back: "/admin/users",
      deepLink: "https://admin.memoria.local/users/:userId"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Compliance Officer", "Support Lead"],
      capabilities: ["view_user_security", "revoke_user_sessions", "manage_user_status"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Users > [User Name]), user header card with avatar, email, verification status, and 'Revoke All Sessions' button.",
      main: "1. Account Overview Card (User ID, registered date, last active IP, password last changed), 2. Active Sessions Table (Device, IP, User Agent, Issued At, Expires At, Revoke button per session), 3. Associated Memory Spaces List, 4. Security Event Timeline (Login attempts, password resets, role changes).",
      footer: "Danger Zone card: 'Suspend User', 'Force Password Reset', 'Schedule Account Deletion'."
    },
    exactControls: [
      "Global 'Revoke All Active Sessions' button (prompts modal confirmation)",
      "Individual session 'Revoke' button",
      "'Force Password Reset' button",
      "'Suspend Account' toggle with reason text area",
      "Back to User Directory button"
    ],
    confirmationCancellation: "Revoking sessions or suspending account requires modal confirmation with mandatory reason entry: 'Confirm immediate revocation of all sessions for user [email]?'",
    keyboardFocus: {
      initialFocus: "Back to User Directory button",
      tabOrder: ["Back button", "Revoke All button", "Session table rows", "Danger Zone buttons"],
      escapeBehavior: "Closes confirmation modal if open"
    },
    statesMatrix: {
      loading: "Profile skeleton cards and session table shimmer.",
      empty: "Notice: 'No active sessions found for this user.'",
      populated: "Complete security dossier with session geography, hashed token metadata, and audit log trail.",
      error: "Error banner: 'Failed to fetch user security dossier.'",
      offline: "Offline indicator; destructive actions disabled.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "User security dossier for Eleanor Vance. 2 active sessions found. Double tap Revoke All Sessions to log out user on all devices.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Vertical stack of profile cards and session cards.",
      tablet: "Two-column grid with user profile on left and active sessions on right.",
      desktop: "Three-column modular layout with security audit stream in side column."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/users/:userId/sessions/revoke-all",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ reason: string }",
      responseBody: "{ success: true, data: { revokedSessionsCount: number } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "user_sessions", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["admin.user_sessions_revoked", "user.force_logout"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Session revocation is written to immutable audit logs with admin identity and rationale."
    },
    testCriteria: {
      unit: ["validates mandatory reason string before dispatching session revocation", "correctly formats IP address location hints"],
      integration: ["POST /api/admin/users/:userId/sessions/revoke-all purges user_sessions table records"],
      e2e: ["opens user dossier, clicks Revoke All Sessions, types reason, verifies session count becomes 0"]
    },
    uiComponents: ["UserProfileCard", "SessionsTable", "DangerZoneBox", "ConfirmationModal", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-04",
    category: "Admin Portal — Platform & User Administration",
    name: "Memory Space Oversight & Hierarchy Governance Console",
    userGoal: "Inspect space metadata, storage quotas, member rosters, and ownership chains across all collaborative capsules on the platform.",
    userStory: "As an administrator, I want to inspect space parameters, identify orphaned family spaces, and audit contributor access hierarchies.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/spaces"],
      exit: ["/admin/spaces/:spaceId", "/admin/storage"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/spaces"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Compliance Officer"],
      capabilities: ["view_spaces_oversight", "manage_spaces"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Spaces), search bar by space name or owner email, space type filter (Family, Memorial, Personal), and space quota summary.",
      main: "1. Filter bar, 2. Tabular space directory (Cover thumbnail, Space Name, Space Type, Owner Name/Email, Members Count, Storage Used / 500 MB, Created Date, Status), 3. Space detail expansion row (shows member role breakdown).",
      footer: "Pagination bar with total spaces count (e.g. '1,420 spaces active')."
    },
    exactControls: [
      "Space search input",
      "Space type filter dropdown",
      "Quota utilization filter (>80%, Normal)",
      "Row action button: 'Inspect Space Governance'",
      "Transfer ownership action (for support recovery)"
    ],
    keyboardFocus: {
      initialFocus: "Space search input",
      tabOrder: ["Search input", "Filter dropdowns", "Table rows", "Pagination controls"],
      escapeBehavior: "Resets space filter"
    },
    statesMatrix: {
      loading: "Tabular skeleton with pulsing storage bars.",
      empty: "Notice: 'No memory spaces match specified filters.'",
      populated: "Detailed table rows with progress bars for quota usage and owner avatars.",
      error: "Error banner: 'Failed to load memory spaces.'",
      offline: "Offline indicator; read-only cached view.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Memory spaces oversight directory. 1,420 total spaces. Double tap any row to inspect governance and members.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing space name, owner, and storage progress bar.",
      tablet: "Compact table with essential columns.",
      desktop: "Full data table with inline storage gauges and member chips."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/spaces",
      authType: "Bearer JWT + Admin Role",
      requestBody: "Query: { page: number, limit: number, search?: string, type?: string }",
      responseBody: "{ success: true, data: { spaces: Array<AdminSpaceSummary>, total: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memory_spaces", "space_storage_quotas", "users"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.spaces_oversight_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Space oversight access is strictly logged to security audit logs."
    },
    testCriteria: {
      unit: ["renders storage percentage gauge accurately", "filters spaces by quota overflow flag"],
      integration: ["GET /api/admin/spaces returns paginated spaces with quota calculation"],
      e2e: ["filters by 'Family' space type, verifies list renders only family type records"]
    },
    uiComponents: ["DataTable", "SearchInput", "StorageUsageBar", "FilterDropdown", "PaginationBar"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-05",
    category: "Admin Portal — Platform & User Administration",
    name: "Authorized Support Access Request & Multi-Party Approval Console",
    userGoal: "Enforce strict zero-knowledge privacy governance by requiring cryptographic multi-party authorization before any admin can access user data for technical support.",
    userStory: "As a support engineer, I want to submit a time-bounded support access request requiring dual-admin cryptographic sign-off before inspecting customer issues.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/access-requests"],
      exit: ["/admin/access-requests/:requestId", "/admin/dashboard"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/access-requests"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Compliance Officer", "Support Lead"],
      capabilities: ["request_support_access", "approve_support_access", "view_access_requests"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Support Access Requests), page title 'Multi-Party Support Access Console', and 'New Access Request' button.",
      main: "1. Dual-Custody Privacy Policy Banner (explaining that no admin can view memories without two cryptographic signatures and user consent ticket), 2. Active Requests Table (Request ID, Requester, Target Space/User, Reason, Ticket Ref, Duration, Approvals Status [1/2], Time Remaining), 3. Approval action modal with biometric / security key signature prompt.",
      footer: "Historical approved & revoked access sessions log."
    },
    exactControls: [
      "New Support Access Request button (opens request modal)",
      "Approve Request button (requires 2FA / WebAuthn token)",
      "Deny / Revoke Request button",
      "Filter by status (Pending, Approved, Expired, Revoked)",
      "Search by support ticket reference"
    ],
    formValidation: {
      fields: [
        { name: "targetSpaceId", type: "text", required: true, errorCopy: "Please provide a valid space or user UUID." },
        { name: "supportTicketRef", type: "text", required: true, limits: "5-50 characters", errorCopy: "Valid customer ticket reference required." },
        { name: "justification", type: "text", required: true, limits: "20-500 characters", errorCopy: "Detailed technical justification required (minimum 20 characters)." },
        { name: "durationMinutes", type: "number", required: true, limits: "15 to 120 minutes", errorCopy: "Access duration must be between 15 and 120 minutes." }
      ]
    },
    keyboardFocus: {
      initialFocus: "New Support Access Request button",
      tabOrder: ["New Request button", "Filter chips", "Requests table", "Approval buttons"],
      escapeBehavior: "Dismisses request modal"
    },
    statesMatrix: {
      loading: "Requests table skeleton shimmer.",
      empty: "Notice: 'No pending support access requests. System is operating under full privacy lock.'",
      populated: "Detailed table with dual-custody verification chips (e.g. 'Approver 1: Approved • Approver 2: Pending').",
      error: "Error banner: 'Failed to synchronize access requests with identity authority.'",
      offline: "Offline indicator; approvals cannot be granted offline.",
      permissionDenied: "403 Forbidden screen: 'Dual-custody approval requires Compliance Officer privileges.'"
    },
    confirmationCancellation: "Approving an access grant requires hardware security key or TOTP token and prompts: 'Confirm granting 30 minutes of audited support access to [targetSpace]?'",
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Authorized support access console. 1 pending request awaiting your signature. Target space: Vance Family Archive. Reason: corrupted media restoration.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view with approval status banners.",
      tablet: "Compact table with quick approve modal sheet.",
      desktop: "Full audit grid with dual signature telemetry and countdown timers."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/access-requests/:requestId/approve",
      authType: "Bearer JWT + Admin Role + WebAuthn",
      requestBody: "{ secondFactorToken: string, notes?: string }",
      responseBody: "{ success: true, data: { status: 'approved', expiresAt: string, token: string } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["support_access_requests", "audit_logs", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["admin.access_request_approved", "admin.access_session_started"],
      bullmqJobs: ["revoke-expired-support-access-tokens"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Dual-custody access requests and every action taken during support sessions are permanently recorded in immutable audit logs."
    },
    testCriteria: {
      unit: ["prevents requester from approving their own access request", "enforces max duration limit of 120 minutes"],
      integration: ["POST /api/admin/access-requests/:id/approve requires 2 distinct admin signatures before status becomes 'approved'"],
      e2e: ["creates support request, logs in as second admin, approves request, verifies countdown timer begins"]
    },
    uiComponents: ["AccessRequestModal", "DualApprovalBadge", "DataTable", "WebAuthnSignaturePrompt", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 3.2 CONTENT MODERATION & SAFETY (ADMIN-06 to ADMIN-07)
  // ==========================================
  {
    id: "ADMIN-06",
    category: "Admin Portal — Content Moderation & Safety",
    name: "Flagged Content Moderation Queue & Resolution Console",
    userGoal: "Review automated and user-reported content flags, inspect flagged text and media metadata, and take moderation action (dismiss, soft-delete, quarantine).",
    userStory: "As a safety moderator, I want to inspect flagged photos or stories to resolve policy violations while protecting family privacy.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/moderation"],
      exit: ["/admin/moderation/:flagId", "/admin/reports"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/moderation"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Compliance Officer", "Content Moderator"],
      capabilities: ["moderate_content", "view_flagged_content"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Moderation), queue counter badge ('14 pending items'), filter by violation type (Copyright, Abuse, Malware, CSAM/Illegal), and auto-refresh toggle.",
      main: "1. Moderation items list / split card view: Flagged item card with reporter reason, risk score, automated classification tags, blurred thumbnail (tap to reveal), and associated space, 2. Item inspector panel showing memory text, EXIF metadata, and uploader history.",
      footer: "Batch resolution action bar: 'Quarantine Selected', 'Dismiss Selected', 'Escalate to Legal'."
    },
    exactControls: [
      "Blur toggle button (tap to reveal sensitive content)",
      "Resolution action button: 'Approve & Dismiss Flag'",
      "Resolution action button: 'Quarantine Media' (removes from public/space view)",
      "Resolution action button: 'Delete Permanently' (with confirmation)",
      "Filter by risk score threshold (>80%, >50%, All)"
    ],
    keyboardFocus: {
      initialFocus: "First moderation item",
      tabOrder: ["Filter bar", "Item list", "Action buttons", "Resolution notes"],
      shortcuts: ["A (Approve)", "Q (Quarantine)", "D (Delete)"],
      escapeBehavior: "Clears selection"
    },
    statesMatrix: {
      loading: "Moderation queue skeleton shimmer.",
      empty: "Notice: 'All clear! No pending items in moderation queue.' with green archival seal.",
      populated: "Card feed of flagged assets with risk score pills and blurred image overlays.",
      error: "Error banner: 'Failed to retrieve moderation queue.'",
      offline: "Offline indicator; moderation actions require online connection.",
      permissionDenied: "403 Forbidden screen."
    },
    confirmationCancellation: "Quarantining or deleting content prompts modal: 'Confirm moderation action on item [id]? Action will be recorded in safety audit log.'",
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Moderation queue. 14 items pending review. First item: Flagged photo in Miller Family space. Risk score high. Double tap to review.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column card review feed with swipe actions.",
      tablet: "Split view with queue list on left and item inspector on right.",
      desktop: "Three-pane layout: Queue list, media technical inspector, and resolution actions panel."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/moderation/:flagId/resolve",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ action: 'dismiss' | 'quarantine' | 'delete', reason: string, notes?: string }",
      responseBody: "{ success: true, data: { flagId: string, resolvedAt: string, status: string } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service / media-service",
      databaseTables: ["moderation_flags", "memories", "media_assets", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["moderation.item_resolved", "media.quarantined"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Moderation actions and review timestamps are permanently logged for legal compliance."
    },
    testCriteria: {
      unit: ["applies blur filter by default to flagged images", "maps keyboard shortcuts A/Q/D to corresponding actions"],
      integration: ["POST /api/admin/moderation/:id/resolve updates flag status and media_asset visibility"],
      e2e: ["opens moderation item, toggles image blur, selects Quarantine with rationale, verifies item removed from queue"]
    },
    uiComponents: ["ModerationCard", "SensitiveImageBlurView", "ResolutionActionBar", "ConfirmationModal", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-07",
    category: "Admin Portal — Content Moderation & Safety",
    name: "User Incident Reports & Policy Abuse Case Manager",
    userGoal: "Investigate interpersonal abuse reports, harassment complaints, intellectual property claims, and terms violations filed by community members.",
    userStory: "As an abuse investigator, I want to review formal user reports, view communication logs between parties, and communicate case findings.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/reports"],
      exit: ["/admin/reports/:reportId", "/admin/users/:userId"],
      back: "/admin/moderation",
      deepLink: "https://admin.memoria.local/reports"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Compliance Officer", "Content Moderator"],
      capabilities: ["manage_abuse_reports", "view_user_reports"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Incident Reports), active cases counter ('3 open reports'), and status tab filter (Open, In Investigation, Resolved, Dismissed).",
      main: "1. Incident reports table (Report ID, Reporting User, Reported User/Space, Violation Category, Date Filed, Priority [Urgent/Standard], Status), 2. Incident dossier modal: Full text of report, supporting evidence attachments, prior report history of reported user, moderator internal notes.",
      footer: "Case closure bar with resolution template selector and message to reporter."
    },
    exactControls: [
      "Status tab filter (Open, Under Investigation, Resolved)",
      "Priority filter (Urgent, High, Normal)",
      "Row action button: 'Open Incident Dossier'",
      "Resolution dropdown (No Action, Warning Issued, User Suspended, Content Removed)",
      "Internal moderator note text editor",
      "Close Case button"
    ],
    keyboardFocus: {
      initialFocus: "First open report row",
      tabOrder: ["Status tabs", "Reports table", "Dossier modal", "Resolution dropdown", "Close Case button"],
      escapeBehavior: "Closes incident dossier"
    },
    statesMatrix: {
      loading: "Reports table skeleton shimmer.",
      empty: "Notice: 'No open user reports found. All cases resolved.'",
      populated: "Detailed incident list with priority chips and time elapsed indicators.",
      error: "Error banner: 'Failed to retrieve incident reports.'",
      offline: "Offline indicator; case management requires live connection.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Incident reports manager. 3 open reports. Urgent case: Unauthorized photo upload in Vance Space. Double tap to open dossier.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view with priority badges and tap-to-review sheet.",
      tablet: "Two-pane layout with report list and case resolution drawer.",
      desktop: "Full case management console with split inspector and resolution workflows."
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/admin/reports/:reportId",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ status: 'resolved' | 'dismissed' | 'investigating', resolution: string, internalNotes: string }",
      responseBody: "{ success: true, data: { report: IncidentReport } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service / memory-service",
      databaseTables: ["user_reports", "audit_logs", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["report.status_updated", "user.notified"],
      bullmqJobs: ["send-incident-resolution-notice"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Reporter identities protected under strict whistleblower safety policies."
    },
    testCriteria: {
      unit: ["sorts reports by priority (Urgent > High > Normal) and creation date", "validates resolution explanation length"],
      integration: ["PATCH /api/admin/reports/:id updates status and writes resolution audit trail"],
      e2e: ["opens open report, selects Warning Issued, enters resolution notes, closes case"]
    },
    uiComponents: ["ReportsTable", "IncidentDossierModal", "PriorityPill", "ResolutionDropdown", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 3.3 STORAGE & MEDIA INFRASTRUCTURE (ADMIN-08 to ADMIN-10)
  // ==========================================
  {
    id: "ADMIN-08",
    category: "Admin Portal — Storage & Media Infrastructure",
    name: "Storage Engine Dashboard, Quota Utilization & Orphan File Manager",
    userGoal: "Inspect physical disk storage across local filesystem volumes (`storage/local/`), monitor space quotas, detect orphan assets, and run garbage collection.",
    userStory: "As an infrastructure engineer, I want to inspect local disk usage, locate unreferenced orphan files, and safely reclaim disk space without card-gated cloud expenses.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/storage"],
      exit: ["/admin/storage/orphans", "/admin/storage/assets", "/admin/dashboard"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/storage"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Infrastructure Admin"],
      capabilities: ["manage_storage", "view_storage_metrics", "run_garbage_collection"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Storage), disk space status gauge (e.g. '312 GB used / 500 GB allocated • 62%'), and 'Run Orphan Scan' button.",
      main: "1. Storage Utilization Breakdown: Originals (210 GB), Web Derivatives (72 GB), Thumbnails (24 GB), PDF Previews (6 GB), 2. Top Storage Spaces Leaderboard, 3. Orphan Files & Ghost Assets Card: Detected unreferenced files with estimated reclaimable space, 4. Storage driver health telemetry (LocalDiskStorageDriver).",
      footer: "Zero-budget storage pledge: 'Operating strictly on local filesystem; Cloudflare R2 prohibited.'"
    },
    exactControls: [
      "Run Orphan Scan button (triggers BullMQ asynchronous crawler)",
      "Trigger Garbage Collection button (prompts confirmation modal)",
      "Refresh disk usage statistics button",
      "Filter storage spaces by quota threshold (>90%, >75%, All)",
      "Export storage utilization report (CSV)"
    ],
    confirmationCancellation: "Garbage collection prompts: 'Reclaim [X] MB of confirmed orphan files? This will permanently delete unreferenced assets from storage/local/.'",
    keyboardFocus: {
      initialFocus: "Run Orphan Scan button",
      tabOrder: ["Scan button", "Utilization cards", "Spaces table", "Garbage Collection button"],
      escapeBehavior: "Closes confirmation modal"
    },
    statesMatrix: {
      loading: "Storage gauge and space breakdown skeleton shimmer.",
      empty: "Notice: 'Storage volume empty. Zero media files stored.'",
      populated: "Rich visual bar chart with color-coded derivative buckets and orphan asset counts.",
      error: "Error banner: 'Failed to read filesystem telemetry from storage/local/.'",
      offline: "Offline indicator; storage maintenance disabled.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Storage engine dashboard. 312 gigabytes used of 500 gigabyte local disk quota. 120 megabytes reclaimable orphan files found. Double tap to scan.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column gauge and top spaces card list.",
      tablet: "Two-column storage overview and orphan cleaner.",
      desktop: "Full three-column storage architecture control console."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/storage/stats",
      authType: "Bearer JWT + Admin Role",
      responseBody: "{ success: true, data: { totalUsedBytes: number, maxBudgetBytes: number, originalBytes: number, derivativeBytes: number, orphanFilesCount: number, orphanBytes: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "media-service / LocalDiskStorageDriver",
      databaseTables: ["media_assets", "space_storage_quotas"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.storage_scanned"],
      bullmqJobs: ["scan-orphan-media-files", "purge-orphan-media-files"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Storage metadata reports disk capacity and file hashes; zero user photos inspected."
    },
    testCriteria: {
      unit: ["computes reclaimable space accurately from orphan file list", "verifies storage driver path conforms to storage/local/"],
      integration: ["GET /api/admin/storage/stats returns accurate byte counts from filesystem and database"],
      e2e: ["clicks Run Orphan Scan, waits for job completion, verifies orphan count updates"]
    },
    uiComponents: ["StorageGaugeWidget", "DerivativeBreakdownBar", "SpacesQuotaTable", "OrphanManagerCard", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-09",
    category: "Admin Portal — Storage & Media Infrastructure",
    name: "Media Asset Technical Inspector & Derivative Health Analyzer",
    userGoal: "Deep-inspect technical media metadata (EXIF, color profiles, pixel dimensions, Sharp/FFmpeg derivative generation status, SHA-256 hashes).",
    userStory: "As an archival media engineer, I want to inspect corrupted photo uploads, review EXIF date extraction, and re-trigger derivative generation.",
    entryExitRoutes: {
      entry: ["/admin/storage", "/admin/storage/assets"],
      exit: ["/admin/storage/assets/:mediaId", "/admin/storage"],
      back: "/admin/storage",
      deepLink: "https://admin.memoria.local/storage/assets"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Infrastructure Admin"],
      capabilities: ["view_media_metadata", "reprocess_media"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Storage > Media Inspector), search bar by Media UUID or filename, and filter by status (Ready, Processing, Failed).",
      main: "1. Asset Technical Inspector Card: Media ID, Original Filename, MIME type, File Size, SHA-256 Checksum, Storage Key path, 2. EXIF Data Grid: Camera model, Lens, Exposure, Date Taken, GPS coordinates (redacted for privacy), Color Space (sRGB/Display P3), 3. Derivative Generation Health: Thumbnail (300x300), Web (1600x1200), Print Master (300 DPI CMYK), 4. Processing log stream.",
      footer: "Action bar: 'Re-generate Derivatives', 'Re-extract EXIF Metadata', 'Download Original'."
    },
    exactControls: [
      "Media UUID / filename search input",
      "Re-generate Derivatives button (dispatches BullMQ job)",
      "Re-extract EXIF button",
      "View Raw JSON metadata modal button",
      "Download Original Asset button"
    ],
    keyboardFocus: {
      initialFocus: "Media UUID search input",
      tabOrder: ["Search input", "Metadata grid", "Derivative cards", "Re-generate button"],
      escapeBehavior: "Pops back to storage directory"
    },
    statesMatrix: {
      loading: "Technical inspector skeleton shimmer.",
      empty: "Notice: 'No media asset selected. Enter Media ID or select from storage directory.'",
      populated: "Complete technical dossier with derivative previews and processing logs.",
      error: "Error banner: 'Asset not found or media metadata corrupted.'",
      offline: "Offline indicator; inspection requires live database access.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Media technical inspector for asset IMG_8912.jpeg. 3 derivatives generated successfully. EXIF capture date June 18, 1984. Double tap to re-process.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Vertical stack of metadata cards and derivative status list.",
      tablet: "Two-column layout: Asset overview on left, EXIF and derivatives on right.",
      desktop: "Three-column technical workstation: Metadata, EXIF inspector, and live derivative canvas."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/media/:mediaId/reprocess",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ pipeline: 'derivatives' | 'exif' | 'all' }",
      responseBody: "{ success: true, data: { jobId: string, status: 'queued' } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["media_assets", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["media.reprocessing_requested"],
      bullmqJobs: ["generate-image-derivatives", "extract-media-exif"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Inspects technical file headers; personal photo bytes never logged to telemetry."
    },
    testCriteria: {
      unit: ["parses raw EXIF tags into human-readable aperture and ISO strings", "validates SHA-256 hash formatting"],
      integration: ["POST /api/admin/media/:id/reprocess enqueues generate-image-derivatives BullMQ job"],
      e2e: ["searches media UUID, clicks Re-generate Derivatives, verifies queued toast notification"]
    },
    uiComponents: ["TechnicalInspectorCard", "EXIFMetadataGrid", "DerivativeHealthRow", "LogStreamConsole", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-10",
    category: "Admin Portal — Storage & Media Infrastructure",
    name: "Active Upload Sessions & Presigned Token Telemetry Console",
    userGoal: "Monitor in-flight client chunk uploads, presigned upload tokens, transfer rates, expired sessions, and network interruptions.",
    userStory: "As an infrastructure admin, I want to view active client upload sessions and diagnose stalled client transfers in real time.",
    entryExitRoutes: {
      entry: ["/admin/storage", "/admin/uploads"],
      exit: ["/admin/storage", "/admin/queues"],
      back: "/admin/storage",
      deepLink: "https://admin.memoria.local/uploads"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Infrastructure Admin"],
      capabilities: ["view_upload_telemetry", "abort_upload_sessions"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Uploads), active sessions counter badge ('8 active transfers'), and aggregate bandwidth throughput indicator.",
      main: "1. Uploads telemetry grid: Session ID, User/Space ID, Filename, Size, Uploaded Bytes (Progress Bar), Transfer Speed (e.g. 4.2 MB/s), Status (In Progress, Stalled, Completed, Expired), 2. Token Security Inspector: Token issuance timestamp, HMAC signature validity, expiration countdown.",
      footer: "Bulk cleanup bar: 'Abort Stalled Sessions', 'Purge Expired Upload Slots'."
    },
    exactControls: [
      "Abort Upload Session button per row",
      "Filter sessions by status (Active, Stalled, Expired)",
      "Auto-refresh interval selector (5s, 15s, 30s)",
      "Purge Expired Sessions button",
      "Search by Space ID or Session ID"
    ],
    keyboardFocus: {
      initialFocus: "First active upload row",
      tabOrder: ["Filter chips", "Upload table", "Abort buttons", "Purge button"],
      escapeBehavior: "Resets table filters"
    },
    statesMatrix: {
      loading: "Transfer table skeleton shimmer with pulsing progress bars.",
      empty: "Notice: 'No active upload sessions in progress. All transfers quiescent.'",
      populated: "Live updating transfer table with animated progress stripes and speed meters.",
      error: "Error banner: 'Failed to stream upload session telemetry.'",
      offline: "Offline indicator; live transfer telemetry requires active connection.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Active upload sessions telemetry. 8 transfers in progress. Total throughput 12 megabytes per second. Double tap any row to inspect.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing filename, progress bar, and speed.",
      tablet: "Compact table with essential transfer metrics.",
      desktop: "Full data table with inline progress bars, chunk telemetry, and token inspector."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/uploads/sessions",
      authType: "Bearer JWT + Admin Role",
      responseBody: "{ success: true, data: { sessions: Array<UploadSessionTelemetry>, aggregateSpeedBytesPerSec: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "media-service / LocalDiskStorageDriver",
      databaseTables: ["media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.upload_telemetry_viewed"],
      bullmqJobs: ["cleanup-expired-upload-sessions"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Tracks transfer byte rates and token states without reading user file content."
    },
    testCriteria: {
      unit: ["calculates transfer completion percentage accurately", "formats transfer speed in MB/s"],
      integration: ["GET /api/admin/uploads/sessions returns list of active upload records"],
      e2e: ["opens uploads console, verifies active upload progress updates smoothly every 5 seconds"]
    },
    uiComponents: ["UploadSessionsTable", "TransferProgressBar", "SpeedGaugeBadge", "Button"],
    verifiedStatus: "Implemented & Verified"
  },

  // ==========================================
  // 3.4 BACKGROUND PROCESSING & ENGINE TELEMETRY (ADMIN-11 to ADMIN-15)
  // ==========================================
  {
    id: "ADMIN-11",
    category: "Admin Portal — Background Processing & Engine Telemetry",
    name: "BullMQ Background Queue Monitor & Worker Fleet Console",
    userGoal: "Monitor background job queues (media processing, OCR, book PDF generation, email notifications, maintenance) and worker concurrency.",
    userStory: "As an operations engineer, I want to monitor BullMQ queue latency, active worker concurrency, and job throughput to ensure zero processing backlogs.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/queues"],
      exit: ["/admin/queues/dlq", "/admin/queues/:queueName", "/admin/dashboard"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/queues"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Infrastructure Admin"],
      capabilities: ["view_queues", "manage_queue_workers", "pause_queues"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Queues), global queue throughput card (e.g. '124 jobs/min • 0 failed'), and 'Pause All Queues' emergency button.",
      main: "1. Queue Cards Grid: `media-processing`, `book-rendering`, `ocr-extraction`, `notifications`, `database-maintenance`, 2. Per-Queue Telemetry: Waiting, Active, Completed, Failed, Delayed job counts, 3. Worker Fleet Panel: Active worker threads, CPU load, memory consumption, job duration histograms.",
      footer: "Queue control actions: 'Pause Queue', 'Resume Queue', 'Drain Completed Jobs'."
    },
    exactControls: [
      "Pause / Resume Queue button per queue",
      "Drain Completed Jobs button (cleans Redis memory)",
      "Worker concurrency slider (1 to 8 workers)",
      "Auto-refresh toggle (3s, 10s, 30s)",
      "Navigate to Dead-Letter Queue button"
    ],
    keyboardFocus: {
      initialFocus: "First queue card",
      tabOrder: ["Pause button", "Queue cards", "Worker panel", "DLQ button"],
      escapeBehavior: "Resets queue selection"
    },
    statesMatrix: {
      loading: "Queue cards skeleton shimmer with pulsing gauge bars.",
      empty: "Notice: 'All queues idle. 0 jobs waiting or processing.'",
      populated: "Real-time updated queue telemetry with active worker indicators and latency meters.",
      error: "Error banner: 'Failed to connect to Redis / BullMQ telemetry bus.'",
      offline: "Offline indicator; queue controls disabled.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "BullMQ queue monitor. 5 queues active. Media processing queue has 3 active jobs, 0 failed. Double tap to inspect.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing queue name and job count pills.",
      tablet: "2-column queue cards layout with quick pause buttons.",
      desktop: "Full grid view with real-time throughput sparklines and worker telemetry."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/queues/telemetry",
      authType: "Bearer JWT + Admin Role",
      responseBody: "{ success: true, data: { queues: Array<QueueStats>, totalThroughput: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "jobs package / Redis BullMQ",
      databaseTables: [],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.queues_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Job telemetry displays queue names and execution counts without payload PII."
    },
    testCriteria: {
      unit: ["aggregates total waiting and active jobs across all queues", "validates worker concurrency limits"],
      integration: ["GET /api/admin/queues/telemetry returns structured queue counts from BullMQ"],
      e2e: ["opens queue dashboard, pauses media queue, verifies status updates to Paused, resumes queue"]
    },
    uiComponents: ["QueueCard", "JobCountBadgeGroup", "WorkerFleetPanel", "ThroughputSparkline", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-12",
    category: "Admin Portal — Background Processing & Engine Telemetry",
    name: "Dead-Letter Queue (DLQ) & Failed Job Retry Console",
    userGoal: "Inspect failed asynchronous background jobs, analyze stack traces and error causes, edit job parameters, and dispatch bulk retries.",
    userStory: "As an operations engineer, I want to inspect dead-letter jobs, read the root cause stack trace, and retry them after fixing network or file issues.",
    entryExitRoutes: {
      entry: ["/admin/queues", "/admin/queues/dlq"],
      exit: ["/admin/queues", "/admin/dashboard"],
      back: "/admin/queues",
      deepLink: "https://admin.memoria.local/queues/dlq"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Infrastructure Admin"],
      capabilities: ["manage_dlq", "retry_failed_jobs", "purge_failed_jobs"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Queues > Dead-Letter Queue), failed jobs counter ('2 failed jobs'), and 'Retry All Failed' button.",
      main: "1. Failed Jobs Table: Job ID, Queue Name, Job Name, Failed At, Attempts (e.g. 3/3), Error Message summary, Action buttons (Retry, Discard, Inspect), 2. Job Stack Trace Inspector: Full error stack, original input payload, worker hostname, execution duration.",
      footer: "Bulk actions bar: 'Retry Selected', 'Discard Selected (Permanent)'."
    },
    exactControls: [
      "Retry Single Job button per row",
      "Retry All Failed Jobs button in header",
      "Discard / Purge Job button",
      "Inspect Stack Trace drawer toggle",
      "Filter by Queue Name dropdown",
      "Search by Job ID or Error Keyword"
    ],
    keyboardFocus: {
      initialFocus: "Retry All button",
      tabOrder: ["Retry All", "Filter dropdown", "Failed jobs table", "Stack trace inspector"],
      escapeBehavior: "Closes stack trace drawer"
    },
    statesMatrix: {
      loading: "DLQ table skeleton shimmer.",
      empty: "Notice: 'Dead-letter queue is completely empty. Zero failed jobs!' with celebration checkmark.",
      populated: "Detailed table of failed jobs with red error chips and collapsible stack traces.",
      error: "Error banner: 'Failed to load dead-letter queue records.'",
      offline: "Offline indicator; retries cannot be dispatched offline.",
      permissionDenied: "403 Forbidden screen."
    },
    confirmationCancellation: "Discarding jobs permanently prompts: 'Discard [count] failed jobs? Job data will be removed from Redis DLQ without reprocessing.'",
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Dead letter queue. 2 failed jobs. First failure: Book PDF compilation in book-rendering queue. Double tap to inspect stack trace or retry.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing failed job name, error snippet, and retry button.",
      tablet: "Compact table with stack trace modal sheet.",
      desktop: "Full table with side-by-side stack trace inspector and payload viewer."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/queues/:queueName/jobs/:jobId/retry",
      authType: "Bearer JWT + Admin Role",
      responseBody: "{ success: true, data: { jobId: string, newJobId: string, status: 'retried' } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "jobs package / Redis BullMQ",
      databaseTables: [],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.job_retried", "admin.dlq_cleared"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Stack traces and job retry operations are logged in security audit records."
    },
    testCriteria: {
      unit: ["formats stack trace lines with syntax highlighting", "filters out sensitive tokens from job payloads in viewer"],
      integration: ["POST /api/admin/queues/:queue/jobs/:id/retry re-enqueues failed job into BullMQ active queue"],
      e2e: ["selects failed job, clicks Inspect, reads stack trace, clicks Retry, verifies job disappears from DLQ"]
    },
    uiComponents: ["DLQTable", "StackTraceDrawer", "ErrorChip", "PayloadViewer", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-13",
    category: "Admin Portal — Background Processing & Engine Telemetry",
    name: "Microservice Topology, Health & Resource Telemetry Console",
    userGoal: "Inspect the operational health, CPU, memory usage, latency percentiles (p50, p95, p99), and gRPC/REST connectivity across all Memoria microservices.",
    userStory: "As a backend systems engineer, I want to inspect microservice telemetry (api-gateway, identity, memory, media, book) to identify bottlenecks.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/services"],
      exit: ["/admin/services/:serviceName", "/admin/dashboard"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/services"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Infrastructure Admin"],
      capabilities: ["view_microservices_telemetry", "manage_services"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Services), cluster health badge ('5 of 5 Services Healthy'), and average response latency ('38ms').",
      main: "1. Service Mesh Cards: `api-gateway` (Port 4000), `identity-service` (Port 4001 / gRPC 50051), `memory-service` (Port 4002 / gRPC 50052), `media-service` (Port 4003 / gRPC 50053), `book-service` (Port 4004 / gRPC 50054), 2. Per-Service Telemetry: Process Uptime, Memory RSS / Heap Used, CPU %, gRPC connection pool status, NATS event bus subscriber status, 3. Latency Percentiles chart (p50, p95, p99).",
      footer: "Service control bar: 'Trigger Health Check', 'Inspect Environment Flags'."
    },
    exactControls: [
      "Trigger Service Health Ping button",
      "Timeframe selector (15m, 1h, 6h, 24h)",
      "Service Card tap (opens deep telemetry drawer)",
      "Copy Service Endpoint button",
      "Inspect gRPC Channel Pool status button"
    ],
    keyboardFocus: {
      initialFocus: "First service card",
      tabOrder: ["Health Ping button", "Service cards", "Latency chart"],
      escapeBehavior: "Closes deep telemetry drawer"
    },
    statesMatrix: {
      loading: "Service cards skeleton shimmer with pulsing CPU meters.",
      empty: "Notice: 'No microservices detected on registry.'",
      populated: "Dynamic cards with green status beacons, live memory gauges, and response time sparklines.",
      error: "Critical alert banner: 'Service `media-service` unreachable via gRPC health check!'",
      offline: "Offline indicator; telemetry connection lost.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Microservice health console. All 5 services operational. Gateway latency 38 milliseconds. Memory usage normal.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column stacked service health cards.",
      tablet: "Two-column service grid with compact latency charts.",
      desktop: "Five-column service topology view with real-time latency waterfall."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/services/health",
      authType: "Bearer JWT + Admin Role",
      responseBody: "{ success: true, data: { services: Array<MicroserviceHealthSummary>, clusterUptimeSeconds: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "api-gateway / all microservices",
      databaseTables: [],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.services_health_checked"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "System metrics monitor server process resources; zero customer data inspected."
    },
    testCriteria: {
      unit: ["formats uptime seconds to days, hours, minutes", "calculates p95 and p99 percentiles from latency samples"],
      integration: ["GET /api/admin/services/health polls gRPC and HTTP health endpoints for all 5 services"],
      e2e: ["loads services console, verifies all 5 service cards show green beacon and valid port numbers"]
    },
    uiComponents: ["ServiceTopologyCard", "HealthBeaconBadge", "ResourceGauge", "LatencyPercentileChart", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-14",
    category: "Admin Portal — Background Processing & Engine Telemetry",
    name: "Book Rendering, Three.js 3D & PDF Compilation Monitor",
    userGoal: "Monitor digital book 3D model generation, page spread layout engines, Puppeteer / PDFKit CMYK compilation, and render queues.",
    userStory: "As a publishing engineer, I want to track PDF compilation jobs and 3D GLTF asset compression to ensure books compile in under 30 seconds.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/books/rendering"],
      exit: ["/admin/books", "/admin/queues"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/books/rendering"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Infrastructure Admin", "Publishing Specialist"],
      capabilities: ["view_book_rendering", "manage_compilation_jobs"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Books > Rendering), active compilations badge ('2 jobs rendering'), and average compile duration ('18.4s').",
      main: "1. Compilation Job Queue: Book ID, Title, Format (8x10 Hardcover), Total Pages (e.g. 64), Target Output (Print PDF CMYK vs WebGL GLTF 3D), Stage (Rasterizing Pages -> Bleed Margin Check -> CMYK Profile Conversion -> PDF Assembly), Progress %, Elapsed Time, 2. PDF Engine Telemetry: Memory allocation, font subsetting status, image downsampling cache, 3. Render failure log drawer.",
      footer: "Control actions: 'Cancel Compilation', 'Re-render Book', 'Inspect Output Artifact'."
    },
    exactControls: [
      "Cancel Compilation button per active job",
      "Re-render Book button (prompts Book UUID input)",
      "Download Output PDF / GLTF button",
      "Filter by Output Type (Print CMYK PDF, 3D WebGL Model)",
      "View Compilation Logs toggle"
    ],
    keyboardFocus: {
      initialFocus: "First rendering job row",
      tabOrder: ["Filter chips", "Jobs table", "Re-render button", "Logs toggle"],
      escapeBehavior: "Dismisses log drawer"
    },
    statesMatrix: {
      loading: "Compilation table skeleton shimmer with animated progress stripes.",
      empty: "Notice: 'No active book rendering jobs. Engine ready for new book orders.'",
      populated: "Live rendering status table with stage indicators and thumbnail page previews.",
      error: "Error banner: 'PDF compilation worker encountered memory exception.'",
      offline: "Offline indicator; live rendering telemetry requires active connection.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Book rendering monitor. 2 jobs currently compiling. Vance Family Chronicle at 74 percent, stage CMYK conversion. Double tap to inspect.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing book title, rendering stage, and progress bar.",
      tablet: "Compact table with rendering stage pills and cancel buttons.",
      desktop: "Full rendering console with live stage waterfall and PDF engine telemetry."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/books/rendering/jobs",
      authType: "Bearer JWT + Admin Role",
      responseBody: "{ success: true, data: { activeJobs: Array<BookRenderingJob>, averageDurationSec: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "book-service / jobs package",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.book_rendering_monitored"],
      bullmqJobs: ["generate-print-cmyk-pdf", "generate-book-3d-model"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Inspects compilation performance and page metrics; book text remains confidential."
    },
    testCriteria: {
      unit: ["calculates overall compilation percentage based on weighted stages", "formats elapsed seconds with 1 decimal precision"],
      integration: ["GET /api/admin/books/rendering/jobs returns active BullMQ rendering jobs"],
      e2e: ["opens monitor, observes active book compile job progress from 20% to 100%, verifies artifact generation"]
    },
    uiComponents: ["CompilationTable", "StageProgressBar", "OutputArtifactCard", "EngineTelemetryBox", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-15",
    category: "Admin Portal — Background Processing & Engine Telemetry",
    name: "Print Preflight Inspection Telemetry & Margin Validator Console",
    userGoal: "Analyze automated print preflight validation results across all ordered books (DPI audits, CMYK ink limits, bleed safety margins, signature multiples).",
    userStory: "As a prepress quality engineer, I want to review preflight audit logs across customer books to catch print defects before physical printing.",
    entryExitRoutes: {
      entry: ["/admin/books", "/admin/preflight"],
      exit: ["/admin/orders", "/admin/books"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/preflight"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Publishing Specialist", "Prepress Operator"],
      capabilities: ["view_preflight_telemetry", "override_preflight_warning"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Preflight), preflight pass rate badge (e.g. '98.4% First-Pass Yield'), and filter by check status (Pass, Warn, Fail).",
      main: "1. Preflight Audit Summary: DPI Validation (>=300 DPI), Bleed Margins (0.125 inch bleed), Signature Page Multiple (Divisible by 4), CMYK Total Area Coverage (TAC <= 300%), 2. Recent Preflight Audits Table: Book ID, Space, Pages, Status (Passed, Warning Overridden, Failed), Critical Warnings count, Preflight Date, 3. Inspection Drawer: Visual spread preview highlighting low-DPI photos or margin violations in orange overlay.",
      footer: "Admin Override bar: 'Override Warnings & Approve for Print' (requires prepress sign-off notes)."
    },
    exactControls: [
      "Filter by preflight check result (Pass, Warning, Fail)",
      "Inspect Book Preflight Report button",
      "Override Warnings button (with mandatory prepress operator signature)",
      "Export Preflight Summary report (PDF/CSV)",
      "Search by Book UUID or Order ID"
    ],
    confirmationCancellation: "Overriding preflight warnings prompts: 'Approve book with low-resolution warnings for physical press? Customer will receive printed output as-is.'",
    keyboardFocus: {
      initialFocus: "First preflight audit row",
      tabOrder: ["Filter chips", "Audit table", "Inspection drawer", "Override button"],
      escapeBehavior: "Dismisses inspection drawer"
    },
    statesMatrix: {
      loading: "Preflight table skeleton shimmer with pulsing status pills.",
      empty: "Notice: 'No recent preflight audits recorded.'",
      populated: "Comprehensive audit records with green checkmarks, amber warning chips, and resolution coordinates.",
      error: "Error banner: 'Failed to retrieve preflight telemetry.'",
      offline: "Offline indicator; preflight overrides require active connection.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Print preflight telemetry console. 98.4 percent pass rate. Double tap any audit row to inspect page-by-page technical results.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing book name, pass/fail status, and warning count.",
      tablet: "Compact table with preflight report modal sheet.",
      desktop: "Full table with split screen visual spread inspector showing margin overlay boxes."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/preflight/:bookId/override",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ reason: string, operatorNotes: string }",
      responseBody: "{ success: true, data: { bookId: string, status: 'overridden', approvedAt: string } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["preflight.warning_overridden"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Preflight overrides and prepress operator identities are recorded in quality audit logs."
    },
    testCriteria: {
      unit: ["verifies that page count is divisible by 4 for case-bound books", "flags TAC above 300% as critical warning"],
      integration: ["POST /api/admin/preflight/:id/override updates book print status to approved"],
      e2e: ["opens book with 1 warning, inspects margin overlay on page 12, enters override reason, verifies status changes to Approved"]
    },
    uiComponents: ["PreflightAuditTable", "MarginOverlayPreview", "PreflightMetricCard", "OverrideModal", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 3.5 PHYSICAL PRINT & COMMERCE OPERATIONS (ADMIN-16 to ADMIN-21)
  // ==========================================
  {
    id: "ADMIN-16",
    category: "Admin Portal — Physical Print & Commerce Operations",
    name: "Physical Print Catalog, Materials & Paper Stocks Manager",
    userGoal: "Manage physical book product offerings, dimensions (8x10, 6x8, 10x12), paper stock weights (148gsm archival matte), cloth cover fabrics, and foil colors.",
    userStory: "As a product manager, I want to manage physical specifications, toggle available linen fabrics, and configure foil stamping options.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/catalog"],
      exit: ["/admin/pricing", "/admin/orders"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/catalog"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Product Manager", "Publishing Specialist"],
      capabilities: ["manage_catalog", "edit_materials"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Catalog), page title 'Print Catalog & Material Specifications', and 'Add New Book Format' button.",
      main: "1. Format Cards: Standard 8x10 Hardcover, Compact 6x8 Keepsake, Deluxe 10x12 Heirloom (dimensions, spine calculation formulas, min/max page limits), 2. Paper Stocks Inventory: 148gsm Archival Matte, 170gsm Lustre, 200gsm Heavy Art Cotton, 3. Cloth & Cover Fabric Swatches: Deep Ink #20242C, Heritage Plum #76556F, Forest Sage #849483, Warm Ochre #D8973C, 4. Metallic Foil Options: Gold Leaf, Silver Foil, Rose Gold, Blind Deboss.",
      footer: "Save Catalog Changes floating bar with pending modifications counter."
    },
    exactControls: [
      "Add Book Format button (opens configuration modal)",
      "Toggle Material Availability switch per swatch",
      "Edit Spine Formula text field",
      "Min / Max Page limit numeric steppers",
      "Save Changes button (commits to database)"
    ],
    keyboardFocus: {
      initialFocus: "First format card",
      tabOrder: ["Add Format button", "Format cards", "Material swatches", "Save button"],
      escapeBehavior: "Discards uncommitted changes"
    },
    statesMatrix: {
      loading: "Catalog cards skeleton shimmer.",
      empty: "Notice: 'No physical book formats configured in catalog.'",
      populated: "Rich visual cards with physical dimension schematics, swatch preview chips, and page limits.",
      error: "Error banner: 'Failed to load print catalog.'",
      offline: "Offline indicator; modifications disabled.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Print catalog manager. 3 formats configured. Standard 8 by 10 hardcover active with 4 cloth colors and 4 foil options. Double tap to edit.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view with expandable material sections.",
      tablet: "Two-column grid of formats and materials.",
      desktop: "Three-column modular layout: Formats, Paper stocks, and Cloth/Foil finishes."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/admin/catalog/formats/:formatId",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ dimensions: string, minPages: number, maxPages: number, availableMaterials: Array<string>, spineMmPerPage: number }",
      responseBody: "{ success: true, data: { format: CatalogFormat } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "commerce-service / book-service",
      databaseTables: ["print_catalog_formats", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["catalog.format_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Product catalog modifications are tracked in operational audit logs."
    },
    testCriteria: {
      unit: ["calculates book spine thickness based on page count and paper weight formula", "validates min/max page bounds"],
      integration: ["PUT /api/admin/catalog/formats/:id updates database record and emits outbox event"],
      e2e: ["toggles Forest Sage swatch off, clicks Save, verifies swatch reflects disabled state"]
    },
    uiComponents: ["FormatCard", "MaterialSwatchGrid", "DimensionSchematicBox", "PageLimitStepper", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-17",
    category: "Admin Portal — Physical Print & Commerce Operations",
    name: "Product Pricing Matrix, Shipping Zones & Tax Rate Manager",
    userGoal: "Configure retail book prices, base costs, additional page fees, international shipping rates, and regional sales tax rules.",
    userStory: "As an operations lead, I want to adjust base book prices and configure flat-rate domestic shipping tiers to maintain sustainable margins.",
    entryExitRoutes: {
      entry: ["/admin/catalog", "/admin/pricing"],
      exit: ["/admin/catalog", "/admin/orders"],
      back: "/admin/catalog",
      deepLink: "https://admin.memoria.local/pricing"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Product Manager", "Finance Lead"],
      capabilities: ["manage_pricing", "edit_shipping_rates"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Pricing), currency selector (USD, EUR, GBP, CAD), and 'Save Pricing Matrix' button.",
      main: "1. Base Product Pricing Table: Format, Base Pages (e.g. 48), Base Price (e.g. $74.00), Cost per Additional 4 Pages (e.g. $3.50), Deluxe Fabric Surcharge, 2. Shipping Zone Matrix: Domestic Ground ($9.00), Express ($18.00), International ($28.00), Archival Box Add-on ($15.00), 3. Tax Nexus & Rules table.",
      footer: "Margin calculator summary card (calculates estimated gross margin percentage based on current pricing)."
    },
    exactControls: [
      "Base price numeric inputs (formatted as currency)",
      "Additional page increment fee inputs",
      "Shipping rate tier inputs by zone",
      "Currency selector dropdown",
      "Save Pricing Matrix button"
    ],
    keyboardFocus: {
      initialFocus: "First price input field",
      tabOrder: ["Currency dropdown", "Pricing table inputs", "Shipping inputs", "Save button"],
      escapeBehavior: "Discards uncommitted price edits"
    },
    statesMatrix: {
      loading: "Pricing table skeleton shimmer.",
      empty: "Notice: 'Pricing matrix uninitialized.'",
      populated: "Structured pricing grid with inline editable currency inputs and live margin percentage calculations.",
      error: "Error banner: 'Failed to save pricing changes. Please verify numeric inputs.'",
      offline: "Offline indicator; pricing edits disabled.",
      permissionDenied: "403 Forbidden screen."
    },
    confirmationCancellation: "Saving pricing modifications prompts confirmation: 'Apply updated price matrix to all future book checkout sessions?'",
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Product pricing matrix. Standard 8 by 10 hardcover base price is 74 dollars for 48 pages. Double tap input to edit.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view with currency input rows.",
      tablet: "Compact table with editable inputs.",
      desktop: "Full financial matrix with real-time margin calculation sidebar."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/pricing/matrix",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ currency: string, items: Array<PricingItem>, shippingZones: Array<ShippingZoneRate> }",
      responseBody: "{ success: true, data: { version: string, updatedCount: number } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["pricing_matrix", "shipping_rates", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["pricing.matrix_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Pricing changes are recorded with admin identity in financial audit logs."
    },
    testCriteria: {
      unit: ["validates all prices are positive numbers", "computes estimated gross margin given cost of goods input"],
      integration: ["POST /api/admin/pricing/matrix writes pricing rows and publishes pricing.matrix_updated event"],
      e2e: ["edits Standard book price from $74 to $78, clicks Save, verifies updated price persists"]
    },
    uiComponents: ["PricingTable", "CurrencyInputField", "ShippingZoneCard", "MarginSummaryBox", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-18",
    category: "Admin Portal — Physical Print & Commerce Operations",
    name: "Physical Print Order Processing & Fulfillment Queue",
    userGoal: "Track incoming customer print orders, monitor prepress verification, batch print jobs, and advance fulfillment stages.",
    userStory: "As a print fulfillment operator, I want to view all submitted book orders and advance them to 'In Production' after prepress approval.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/orders"],
      exit: ["/admin/orders/:orderId", "/admin/orders/refunds"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/orders"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Publishing Specialist", "Print Operator"],
      capabilities: ["view_orders", "process_orders", "manage_fulfillment"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Orders), active orders counter ('18 in queue'), and stage filter tabs (Submitted, Preflight Approved, In Production, Shipped, Delivered).",
      main: "1. Orders Queue Table: Order Number (#MEM-8921), Customer Name/Email, Book Title, Format, Quantity, Total Amount ($84.00), Order Date, Stage Status pill, Action button, 2. Batch operations bar: 'Send Selected to Press', 'Download Batch Print PDFs', 3. Filter sidebar (Date range, Format, Shipping Speed).",
      footer: "Pagination bar with total orders count and export orders CSV button."
    },
    exactControls: [
      "Stage tab filters (Submitted, In Production, Shipped)",
      "Row action button: 'Inspect Order & Production Details'",
      "Select all orders checkbox",
      "Batch action button: 'Advance to In Production'",
      "Search input by Order Number or Customer Email"
    ],
    keyboardFocus: {
      initialFocus: "Order search input",
      tabOrder: ["Stage tabs", "Search input", "Orders table", "Batch actions", "Pagination"],
      escapeBehavior: "Resets order search"
    },
    statesMatrix: {
      loading: "Orders queue skeleton shimmer.",
      empty: "Notice: 'No orders matching current stage filter.'",
      populated: "Detailed table of customer orders with format badges, quantities, and production stage pills.",
      error: "Error banner: 'Failed to retrieve print orders.'",
      offline: "Offline indicator; order status updates disabled.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Print orders queue. 18 active orders. Showing page 1. First order: MEM-8921 for Vance Family Chronicle, quantity 1, stage Submitted. Double tap to view.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing order number, title, amount, and stage pill.",
      tablet: "Compact table with horizontal scrolling for address details.",
      desktop: "Full enterprise data grid with batch selection, stage filters, and export tools."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/orders",
      authType: "Bearer JWT + Admin Role",
      requestBody: "Query: { page: number, limit: number, status?: string, search?: string }",
      responseBody: "{ success: true, data: { orders: Array<AdminOrderSummary>, total: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["print_orders", "books", "users"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.orders_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Order recipient addresses and customer emails are accessed under strict fulfillment audits."
    },
    testCriteria: {
      unit: ["filters orders array by fulfillment stage accurately", "computes total order revenue across active items"],
      integration: ["GET /api/admin/orders returns paginated orders with customer metadata"],
      e2e: ["filters by Submitted status, selects first order, advances to In Production, verifies stage pill updates"]
    },
    uiComponents: ["OrdersTable", "StageFilterTabGroup", "BatchActionBar", "SearchInput", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-19",
    category: "Admin Portal — Physical Print & Commerce Operations",
    name: "Order Detail, Shipping Tracking Injection & Fulfillment Dossier",
    userGoal: "Inspect an individual print order, view shipping destination, inject carrier tracking numbers (FedEx, UPS, DHL), and trigger customer shipment notifications.",
    userStory: "As a fulfillment specialist, I want to input the courier tracking number and mark an order as shipped so the customer receives their tracking link.",
    entryExitRoutes: {
      entry: ["/admin/orders", "/admin/orders/:orderId"],
      exit: ["/admin/orders", "/admin/orders/refunds"],
      back: "/admin/orders",
      deepLink: "https://admin.memoria.local/orders/:orderId"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Publishing Specialist", "Print Operator"],
      capabilities: ["view_order_details", "update_order_shipping", "manage_fulfillment"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Orders > [Order #]), order title card with status pill, creation date, and 'Download Print PDF' button.",
      main: "1. Order Overview: Customer Name, Email, Book Title, Format, Quantity, Total Amount Paid ($84.00), Payment ID, 2. Shipping Address Dossier: Recipient Name, Street Address, City, State, ZIP, Country, Shipping Method (Express), 3. Carrier Tracking Injection Card: Carrier selector (FedEx, UPS, USPS, DHL), Tracking Number text field, Tracking URL preview, 4. Order Production History log (Submitted -> Preflight Passed -> Sent to Press -> Bound -> Shipped).",
      footer: "Action bar: 'Mark as Shipped & Send Tracking Email' (primary CTA), 'Issue Refund' (secondary)."
    },
    exactControls: [
      "Carrier selector dropdown (FedEx, UPS, USPS, DHL)",
      "Tracking Number input field",
      "Mark as Shipped button (validates tracking number, dispatches customer email)",
      "Download High-Resolution CMYK Print PDF button",
      "Issue Refund button (routes to ADMIN-20)"
    ],
    formValidation: {
      fields: [
        { name: "carrier", type: "select", required: true, errorCopy: "Please select a courier carrier." },
        { name: "trackingNumber", type: "text", required: true, limits: "8-40 characters", errorCopy: "Please enter a valid tracking number." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Tracking Number input",
      tabOrder: ["Download PDF button", "Carrier dropdown", "Tracking input", "Mark as Shipped button"],
      escapeBehavior: "Pops back to orders list"
    },
    statesMatrix: {
      loading: "Order detail skeleton shimmer.",
      empty: "Notice: 'Order not found.'",
      populated: "Complete customer order record with verified address format and production history.",
      error: "Error banner: 'Failed to update order tracking details.'",
      offline: "Offline indicator; shipping updates require active connection.",
      permissionDenied: "403 Forbidden screen."
    },
    confirmationCancellation: "Marking as Shipped prompts: 'Mark order as shipped with tracking [trackingNumber]? Customer notification email will be dispatched immediately.'",
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Order detail for order MEM-8921. 1 copy of Vance Family Chronicle. Shipped to Jane Vance in Portland, Oregon. Double tap to enter tracking number.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column scroll view of order cards and tracking form.",
      tablet: "Two-column layout: Order and address on left, tracking form and history on right.",
      desktop: "Three-column modular console: Order summary, shipping injection, and production audit timeline."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/orders/:orderId/ship",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ carrier: string, trackingNumber: string, trackingUrl?: string }",
      responseBody: "{ success: true, data: { orderId: string, status: 'shipped', shippedAt: string } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["print_orders", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["order.shipped"],
      bullmqJobs: ["send-shipping-notification-email"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Shipping addresses are treated as strictly confidential PII and audited upon inspection."
    },
    testCriteria: {
      unit: ["constructs carrier tracking URL based on carrier enum and tracking code", "validates tracking number length"],
      integration: ["POST /api/admin/orders/:id/ship writes tracking data and enqueues customer notification email"],
      e2e: ["inputs FedEx tracking number, clicks Mark as Shipped, verifies status updates to Shipped and toast confirms email"]
    },
    uiComponents: ["OrderDetailCard", "ShippingAddressBox", "CarrierTrackingForm", "ProductionTimeline", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-20",
    category: "Admin Portal — Physical Print & Commerce Operations",
    name: "Refund, Cancellation & Remake Request Manager",
    userGoal: "Process customer refund requests, authorize print damage remakes, handle order cancellations within the grace window, and document refund reasons.",
    userStory: "As a customer support manager, I want to review a damaged book report, authorize a free reprint remake, or issue a full refund.",
    entryExitRoutes: {
      entry: ["/admin/orders", "/admin/orders/:orderId", "/admin/refunds"],
      exit: ["/admin/orders/:orderId", "/admin/transactions"],
      back: "/admin/orders",
      deepLink: "https://admin.memoria.local/refunds"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Finance Lead", "Support Lead"],
      capabilities: ["manage_refunds", "authorize_remakes"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Refunds & Remakes), open requests badge ('2 pending refund requests'), and total refunded this month card ($168.00).",
      main: "1. Refund Requests Table: Request ID, Order #, Customer, Amount, Reason (Print Defect, Shipping Damage, Late Delivery, Cancellation), Date Requested, Status, 2. Refund Decision Modal: Full vs Partial refund amount input, 'Authorize Free Remake' option, Customer notice message editor, Internal finance notes.",
      footer: "Action bar: 'Process Refund', 'Authorize Remake (Zero Cost Order)', 'Decline Request'."
    },
    exactControls: [
      "Process Full Refund button",
      "Process Partial Refund button (with amount input)",
      "Authorize Remake button (spawns replacement print order)",
      "Decline Refund button (with mandatory explanation)",
      "Refund reason category dropdown"
    ],
    formValidation: {
      fields: [
        { name: "refundAmountCents", type: "number", required: true, errorCopy: "Refund amount cannot exceed original order total." },
        { name: "reasonCategory", type: "select", required: true, errorCopy: "Please select a refund reason category." },
        { name: "internalNotes", type: "text", required: true, limits: "10-500 characters", errorCopy: "Please document the justification for this refund." }
      ]
    },
    keyboardFocus: {
      initialFocus: "First pending refund row",
      tabOrder: ["Refunds table", "Amount input", "Reason dropdown", "Process button"],
      escapeBehavior: "Dismisses decision modal"
    },
    statesMatrix: {
      loading: "Refunds table skeleton shimmer.",
      empty: "Notice: 'No pending refund or remake requests.'",
      populated: "Detailed table with customer photos of damaged prints, payment transaction IDs, and decision actions.",
      error: "Error banner: 'Failed to process refund through payment gateway.'",
      offline: "Offline indicator; financial operations disabled offline.",
      permissionDenied: "403 Forbidden screen."
    },
    confirmationCancellation: "Processing refund prompts double confirmation: 'Issue refund of [amount] for order [orderId]? Transaction cannot be reversed.'",
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Refund and cancellation manager. 2 pending requests. First request: Order MEM-8921 requesting remake for cover scuffing. Double tap to review.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view with refund amount and quick review button.",
      tablet: "Compact table with decision modal sheet.",
      desktop: "Full financial dispute console with side-by-side evidence inspection and payment gateway telemetry."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/orders/:orderId/refund",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ amountCents: number, reasonCategory: string, internalNotes: string, actionType: 'refund' | 'remake' }",
      responseBody: "{ success: true, data: { refundId: string, status: 'processed', refundedCents: number } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["print_orders", "order_refunds", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["order.refunded", "order.remake_authorized"],
      bullmqJobs: ["send-refund-notification-email"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Refund amounts and rationale are logged to immutable financial audit records."
    },
    testCriteria: {
      unit: ["prevents refund amount greater than order total_cents", "validates mandatory finance note"],
      integration: ["POST /api/admin/orders/:id/refund records refund in database and emits outbox event"],
      e2e: ["opens refund request, selects Full Refund with justification, confirms modal, verifies order status updates to Refunded"]
    },
    uiComponents: ["RefundsTable", "DamageEvidencePreview", "RefundDecisionModal", "AmountInputField", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-21",
    category: "Admin Portal — Physical Print & Commerce Operations",
    name: "Payment Gateway Logs, Transaction Ledger & Status Overview",
    userGoal: "Audit raw payment transaction events, Apple Pay tokens, webhook deliveries, settlement statuses, and reconciliation mismatches.",
    userStory: "As a finance engineer, I want to review payment webhook logs and transaction settlement statuses to reconcile daily commerce revenue.",
    entryExitRoutes: {
      entry: ["/admin/orders", "/admin/transactions"],
      exit: ["/admin/orders/:orderId", "/admin/dashboard"],
      back: "/admin/orders",
      deepLink: "https://admin.memoria.local/transactions"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Finance Lead"],
      capabilities: ["view_transactions", "reconcile_payments"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Transactions), total volume card ($2,480.00 today), and transaction search by Payment ID or Order #.",
      main: "1. Transaction Ledger Table: Transaction ID, Order #, Customer, Amount, Payment Method (Apple Pay, Credit Card), Gateway Response (200 OK, Authorized, Settled), Timestamp, Status pill, 2. Webhook Event Inspector Drawer: Raw payload, signature header, webhook retry count, delivery latency.",
      footer: "Export financial ledger CSV / QuickBooks format button."
    },
    exactControls: [
      "Search input by Transaction ID or Order Number",
      "Filter by payment status (Settled, Authorized, Failed, Refunded)",
      "Inspect Webhook Payload button",
      "Re-deliver Webhook button (for failed webhook retries)",
      "Export Ledger button (CSV)"
    ],
    keyboardFocus: {
      initialFocus: "Transaction search input",
      tabOrder: ["Search input", "Status filter", "Ledger table", "Inspect Webhook button"],
      escapeBehavior: "Closes webhook inspector drawer"
    },
    statesMatrix: {
      loading: "Transaction ledger skeleton shimmer.",
      empty: "Notice: 'No transactions recorded for selected period.'",
      populated: "Detailed ledger table with monospace transaction hashes and color-coded status badges.",
      error: "Error banner: 'Failed to retrieve transaction ledger.'",
      offline: "Offline indicator; financial ledger requires live connection.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Transaction ledger. 42 transactions recorded today. Double tap any transaction to inspect payment webhook details.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing transaction amount, payment method, and status.",
      tablet: "Compact table with transaction details modal.",
      desktop: "Full financial audit ledger with side-by-side webhook payload viewer."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/transactions",
      authType: "Bearer JWT + Admin Role",
      requestBody: "Query: { page: number, limit: number, status?: string, date?: string }",
      responseBody: "{ success: true, data: { transactions: Array<TransactionRecord>, totalVolumeCents: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["payment_transactions", "print_orders"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.transactions_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Cardholder data is tokenized; zero raw card numbers stored or displayed."
    },
    testCriteria: {
      unit: ["formats cents into currency string with decimal", "verifies webhook signature hashing logic"],
      integration: ["GET /api/admin/transactions returns paginated transaction records"],
      e2e: ["searches transaction by order ID, clicks Inspect Webhook, validates 200 OK delivery status"]
    },
    uiComponents: ["TransactionLedgerTable", "WebhookInspectorDrawer", "VolumeSummaryCard", "SearchInput", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 3.6 SYSTEM GOVERNANCE, SECURITY & AUDIT (ADMIN-22 to ADMIN-26)
  // ==========================================
  {
    id: "ADMIN-22",
    category: "Admin Portal — System Governance, Security & Audit",
    name: "System Notification & Email Template Architecture Studio",
    userGoal: "Author, preview, and test system transactional emails (Welcome, Invite, Memory Prompt, Order Receipt, Shipping Notification) in responsive HTML.",
    userStory: "As a communications manager, I want to edit transactional email templates with brand typography (Cormorant Garamond) and test rendered previews.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/templates"],
      exit: ["/admin/dashboard", "/admin/settings"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/templates"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Product Manager", "Support Lead"],
      capabilities: ["manage_email_templates", "send_test_email"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Templates), template selector dropdown, language locale picker (en-US), and 'Send Test Email' button.",
      main: "1. Template List Sidebar: Welcome to Memoria, Space Invitation, Daily Memory Prompt, Order Confirmation & Receipt, Order Shipped with Tracking, Password Reset, 2. Split Workspace: Left side Monaco / code editor with MJML / Handlebars template markup, Right side live responsive rendered HTML iframe (Desktop and Mobile view toggles), 3. Dynamic test variables JSON editor.",
      footer: "Save Template button with version history comparison link."
    },
    exactControls: [
      "Template selector dropdown",
      "Code editor (MJML / HTML / Handlebars)",
      "Live preview device toggle (Mobile vs Desktop)",
      "Send Test Email button (prompts recipient email)",
      "Save Template button",
      "Restore Default Template button"
    ],
    keyboardFocus: {
      initialFocus: "Code editor",
      tabOrder: ["Template selector", "Code editor", "Variable editor", "Send Test button", "Save button"],
      escapeBehavior: "Discards unsaved template edits"
    },
    statesMatrix: {
      loading: "Template workspace skeleton shimmer.",
      empty: "Notice: 'Select a template from the library to begin editing.'",
      populated: "Syntax-highlighted template markup on left and pixel-perfect rendered email preview on right.",
      error: "Error banner: 'Handlebars syntax error in template markup at line 14.'",
      offline: "Offline indicator; saving templates requires active connection.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Notification template editor. Currently editing Order Shipped template. Double tap code editor to modify markup.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Tabbed view toggling between code editor and rendered preview.",
      tablet: "Side-by-side editor and preview with variable drawer.",
      desktop: "Three-pane design studio: Templates sidebar, code editor, and live responsive previewer."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/admin/templates/:templateKey",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ subject: string, htmlBody: string, textBody: string, sampleVariables: Record<string, any> }",
      responseBody: "{ success: true, data: { templateKey: string, version: number, updatedAt: string } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["email_templates", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["template.updated"],
      bullmqJobs: ["send-test-email"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Template modifications are recorded in audit logs with author and diff."
    },
    testCriteria: {
      unit: ["renders Handlebars sample variables without syntax error", "validates MJML compiles to valid HTML"],
      integration: ["PUT /api/admin/templates/:key updates template in database and enqueues test email"],
      e2e: ["selects Invite template, edits subject line, previews in mobile frame, clicks Send Test Email"]
    },
    uiComponents: ["TemplateSidebar", "MonacoCodeEditor", "LiveEmailPreviewFrame", "VariableJsonEditor", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-23",
    category: "Admin Portal — System Governance, Security & Audit",
    name: "Dynamic Feature Flag & Staged Rollout Manager",
    userGoal: "Toggle platform feature flags (e.g. `realitykit_3d_viewer`, `whisper_voice_transcription`, `tesseract_ocr`, `apple_pay_checkout`), configure rollout percentages, and restrict beta features.",
    userStory: "As an engineering lead, I want to toggle feature flags dynamically with percentage rollouts without redeploying microservices.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/feature-flags"],
      exit: ["/admin/dashboard", "/admin/settings"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/feature-flags"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Infrastructure Admin", "Engineering Lead"],
      capabilities: ["manage_feature_flags", "toggle_system_features"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Feature Flags), active flags count ('12 flags active'), and 'Create New Feature Flag' button.",
      main: "1. Feature Flags Table: Flag Key (`tesseract_ocr_enabled`, `realitykit_bookshelf`, `apple_pay_v2`), Description, Status toggle (Enabled/Disabled), Rollout Percentage slider (0% to 100%), Target Audience (All, Beta Testers, Internal Admins Only), Last Modified timestamp, 2. Audit Trail drawer showing flag change history.",
      footer: "Save Flags button (dispatches real-time flag invalidation via NATS JetStream)."
    },
    exactControls: [
      "Feature Flag toggle switch per row",
      "Rollout Percentage slider (0% to 100%)",
      "Target Audience dropdown (All Users, Beta Group, Admin Only)",
      "Create New Flag button (opens modal)",
      "Delete Flag button (with confirmation)"
    ],
    confirmationCancellation: "Toggling a critical flag prompts: 'Update feature flag [flagKey] rollout to [percentage]%? Changes take effect immediately across all client sessions.'",
    keyboardFocus: {
      initialFocus: "First feature flag toggle",
      tabOrder: ["Create Flag button", "Flag toggles", "Rollout sliders", "Save button"],
      escapeBehavior: "Dismisses modal"
    },
    statesMatrix: {
      loading: "Feature flags table skeleton shimmer.",
      empty: "Notice: 'No dynamic feature flags defined. Using code defaults.'",
      populated: "Interactive table with instant toggle switches and percentage sliders.",
      error: "Error banner: 'Failed to synchronize feature flags with configuration store.'",
      offline: "Offline indicator; flag changes disabled offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Feature flag manager. 12 flags configured. Tesseract OCR is enabled at 100 percent. Double tap toggle to disable.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view with flag name, status toggle, and percentage slider.",
      tablet: "Compact table with inline sliders.",
      desktop: "Full feature governance grid with rollout telemetry and user targeting rules."
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/admin/feature-flags/:flagKey",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ isEnabled: boolean, rolloutPercentage: number, targetGroup?: string }",
      responseBody: "{ success: true, data: { flagKey: string, isEnabled: boolean, rolloutPercentage: number } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "api-gateway / identity-service",
      databaseTables: ["feature_flags", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["feature_flag.updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Feature flag state changes are permanently logged to security audit trail."
    },
    testCriteria: {
      unit: ["enforces percentage bounds between 0 and 100", "evaluates flag enablement against mock user UUID hash"],
      integration: ["PATCH /api/admin/feature-flags/:key updates database and broadcasts NATS event"],
      e2e: ["toggles realitykit_bookshelf from 50% to 100%, saves change, verifies update broadcast"]
    },
    uiComponents: ["FeatureFlagsTable", "ToggleSwitch", "RolloutSlider", "TargetGroupDropdown", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-24",
    category: "Admin Portal — System Governance, Security & Audit",
    name: "Immutable Security Audit Logs & Access Forensics Console",
    userGoal: "Review tamper-evident, append-only security audit logs covering all administrative actions, logins, permission escalations, and support sessions.",
    userStory: "As an auditor or security officer, I want to search immutable audit logs by admin ID, action type, and date to verify full accountability.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/audit-logs"],
      exit: ["/admin/dashboard", "/admin/users"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/audit-logs"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Compliance Officer"],
      capabilities: ["view_security_audit_logs", "export_audit_logs"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Security Logs), audit integrity verification badge ('Cryptographic Chain Verified • 0 Tamper Events'), and Export Log Archive button.",
      main: "1. Audit Filter Bar: Actor Admin, Action Type (Login, Role Change, Session Revoke, Quota Override, Support Access), Date Range, IP Address, 2. Paginated Audit Table: Timestamp (ISO 8601), Actor, Action, Target Entity, IP Address, Geo Hint, Result (Success/Fail), Monospace Cryptographic SHA-256 Record Hash, 3. Audit Record Inspector drawer: Full before/after state diff, user agent string, session token hash.",
      footer: "Cryptographic verification verification bar: 'Verify Hash Chain'."
    },
    exactControls: [
      "Filter by Action Type dropdown",
      "Filter by Actor Admin input",
      "Date range picker (Last 24h, 7d, 30d, Custom)",
      "Verify Hash Chain button (validates append-only SHA-256 chain)",
      "Export Signed Audit Log button (JSON / CSV with cryptographic signature)"
    ],
    keyboardFocus: {
      initialFocus: "Action Type filter",
      tabOrder: ["Action filter", "Date range", "Audit table", "Record inspector", "Verify Chain button"],
      escapeBehavior: "Closes record inspector"
    },
    statesMatrix: {
      loading: "Audit table skeleton shimmer with monospace hash placeholders.",
      empty: "Notice: 'No audit records match the specified search parameters.'",
      populated: "Cryptographically chained audit table with timestamp microsecond precision and before/after diffs.",
      error: "Error banner: 'Failed to retrieve security audit logs.'",
      offline: "Offline indicator; live audit logs require active connection.",
      permissionDenied: "403 Forbidden screen: 'Compliance Officer or Superadmin role required.'"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Security audit logs. Hash chain verified. 1,840 audit events recorded. Double tap any row to view record diff.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view showing timestamp, actor, action, and result badge.",
      tablet: "Compact table with record detail drawer.",
      desktop: "Full enterprise security console with cryptographic chain validator and JSON diff inspector."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/admin/audit-logs",
      authType: "Bearer JWT + Admin Role",
      requestBody: "Query: { page: number, limit: number, actor?: string, action?: string, from?: string, to?: string }",
      responseBody: "{ success: true, data: { logs: Array<AuditLogRecord>, total: number, chainValid: boolean } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["audit_logs"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["admin.audit_logs_exported"],
      bullmqJobs: ["verify-audit-log-cryptographic-chain"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Audit logs are strictly append-only; records cannot be updated or deleted by any user or administrator."
    },
    testCriteria: {
      unit: ["verifies that audit log chain hashes match SHA-256(previous_hash + current_record)", "formats state diff correctly"],
      integration: ["GET /api/admin/audit-logs returns immutable records in descending chronological order"],
      e2e: ["filters by 'Session Revoke' action, inspects record diff, clicks Verify Hash Chain, receives positive validation toast"]
    },
    uiComponents: ["AuditLogsTable", "RecordDiffInspector", "HashChainBadge", "DateRangePicker", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "ADMIN-25",
    category: "Admin Portal — System Governance, Security & Audit",
    name: "Customer Support Ticketing & Resolution Console",
    userGoal: "Triage customer inquiries, assist users with scanning / audio upload issues, review book ordering questions, and respond to support tickets.",
    userStory: "As an archival support specialist, I want to review incoming customer tickets, read diagnostic logs, and send helpful guidance.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/tickets"],
      exit: ["/admin/tickets/:ticketId", "/admin/dashboard"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/tickets"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Support Lead", "Support Agent"],
      capabilities: ["manage_support_tickets", "reply_to_tickets"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > Support Tickets), open tickets counter ('6 open tickets'), and ticket category filter (All, Book Printing, Audio Transcription, Account, Billing).",
      main: "1. Support Tickets Table: Ticket #, Customer Name, Email, Subject, Category, Priority (High/Normal/Low), Status (Open, In Progress, Waiting Customer, Resolved), Created Date, 2. Ticket Workspace Drawer: Customer message thread, attached diagnostic logs viewer, pre-written canned response macros dropdown, Reply message editor.",
      footer: "Ticket resolution bar: 'Send Reply', 'Resolve Ticket', 'Assign to Specialist'."
    },
    exactControls: [
      "Category filter dropdown",
      "Status tab selector (Open, Waiting, Resolved)",
      "Canned response macros dropdown ('How to clean scanner glass', 'Audio format tips', 'Tracking help')",
      "Reply TextEditor input",
      "Send Reply button (sends email to customer and appends to thread)",
      "Resolve Ticket button"
    ],
    formValidation: {
      fields: [
        { name: "replyMessage", type: "text", required: true, limits: "5-2000 characters", errorCopy: "Please enter a reply message." }
      ]
    },
    keyboardFocus: {
      initialFocus: "First open ticket row",
      tabOrder: ["Category filter", "Tickets table", "Reply editor", "Macros dropdown", "Send button"],
      escapeBehavior: "Closes ticket workspace drawer"
    },
    statesMatrix: {
      loading: "Tickets table skeleton shimmer.",
      empty: "Notice: 'Zero open support tickets. Inbox zero achieved!' with archival emblem.",
      populated: "Detailed tickets queue with customer avatar, priority badges, and thread length indicators.",
      error: "Error banner: 'Failed to retrieve support tickets.'",
      offline: "Offline indicator; ticket replies disabled offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Customer support ticketing console. 6 open tickets. First ticket: Audio upload failing for grandfather interview. Double tap to open thread.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list view with customer inquiry and tap-to-reply sheet.",
      tablet: "Two-pane layout with ticket list on left and conversation thread on right.",
      desktop: "Full support desk console with conversation thread, macros picker, and diagnostic inspector."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/tickets/:ticketId/reply",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ message: string, newStatus?: string, internalNote?: boolean }",
      responseBody: "{ success: true, data: { ticketId: string, replyId: string, status: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["support_tickets", "support_replies", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["support.reply_sent"],
      bullmqJobs: ["send-support-reply-email"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Support communications are preserved for customer service quality assurance."
    },
    testCriteria: {
      unit: ["validates reply message length requirement", "applies canned macro text to reply box"],
      integration: ["POST /api/admin/tickets/:id/reply stores reply and dispatches customer email outbox event"],
      e2e: ["opens ticket, inserts canned macro, clicks Send Reply, verifies status changes to Waiting on Customer"]
    },
    uiComponents: ["TicketsTable", "ConversationThreadView", "CannedMacroPicker", "ReplyEditorBox", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "ADMIN-26",
    category: "Admin Portal — System Governance, Security & Audit",
    name: "Admin Personal Profile, Hardware 2FA & FIDO2 Security Keys",
    userGoal: "Manage administrative credentials, enroll physical FIDO2 / WebAuthn hardware security keys (YubiKey), configure TOTP 2FA, and inspect personal admin session history.",
    userStory: "As an administrator, I want to register my hardware YubiKey and configure biometric passkeys to satisfy dual-custody security standards.",
    entryExitRoutes: {
      entry: ["/admin", "/admin/profile"],
      exit: ["/admin/dashboard", "/admin/login"],
      back: "/admin/dashboard",
      deepLink: "https://admin.memoria.local/profile"
    },
    personasPermissions: {
      roles: ["Platform Superadmin", "Operations Admin", "Compliance Officer", "Support Agent"],
      capabilities: ["manage_own_admin_profile", "enroll_fido2_keys"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Breadcrumbs (Admin > My Security Profile), admin badge card, role badge ('Platform Superadmin'), and session expiry countdown.",
      main: "1. Admin Identity Card: Display Name, Work Email, Assigned Role, Account Created Date, 2. Hardware Security Keys & FIDO2 (WebAuthn): Registered YubiKeys list (Key Name, Enrolled Date, Last Used), 'Register New Security Key' button, 3. Time-Based One-Time Password (TOTP) Authenticator: Authenticator App status, Re-configure QR code, 4. Active Admin Sessions: Device, IP, login time, Revoke Session button.",
      footer: "Destructive Emergency Sign Out button (invalidates all admin tokens)."
    },
    exactControls: [
      "Register New Security Key button (initiates WebAuthn navigator.credentials.create flow)",
      "Rename / Remove Security Key button",
      "Configure TOTP Authenticator button",
      "Revoke Session button",
      "Sign Out of Admin Portal button"
    ],
    confirmationCancellation: "Removing a hardware security key prompts: 'Remove security key [KeyName]? At least one 2FA method must remain registered.'",
    keyboardFocus: {
      initialFocus: "Register New Security Key button",
      tabOrder: ["Identity card", "Register Key button", "Security keys list", "TOTP section", "Sign Out button"],
      escapeBehavior: "Cancels WebAuthn prompt"
    },
    statesMatrix: {
      loading: "Profile skeleton cards and security keys list shimmer.",
      empty: "Notice: 'No hardware keys registered. We strongly recommend enrolling a FIDO2 key for elevated privileges.'",
      populated: "Complete security profile with active hardware key listings and green 2FA verified beacon.",
      error: "Error banner: 'WebAuthn hardware key registration failed or was cancelled by user.'",
      offline: "Offline indicator; security key registration requires online identity verification.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA compliant",
      voiceOverSummary: "Admin security profile. 2FA is active. 1 YubiKey registered. Double tap Register New Security Key to add another hardware key.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column card stack for admin profile and 2FA settings.",
      tablet: "Two-column grid: Admin identity on left, hardware keys and TOTP on right.",
      desktop: "Three-column security center: Profile, WebAuthn keys, and active admin session telemetry."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/admin/profile/webauthn/register",
      authType: "Bearer JWT + Admin Role",
      requestBody: "{ credential: PublicKeyCredentialJSON, name: string }",
      responseBody: "{ success: true, data: { keyId: string, name: string, enrolledAt: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["admin_users", "admin_security_keys", "audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["admin.security_key_registered"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Security key registrations and 2FA modifications are recorded in the security audit ledger."
    },
    testCriteria: {
      unit: ["validates WebAuthn registration attestation response", "requires at least one active 2FA method"],
      integration: ["POST /api/admin/profile/webauthn/register stores public key credential in database"],
      e2e: ["enrolls virtual authenticator key, verifies key appears in registered list with timestamp"]
    },
    uiComponents: ["AdminProfileCard", "FIDO2KeyList", "WebAuthnPromptModal", "TOTPConfigBox", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  }
];
