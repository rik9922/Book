import { ScreenSpec } from "./types.js";

export const pwaScreens2: ScreenSpec[] = [
  // ==========================================
  // 1.3 CONTINUED: COLLECTIONS & NOTIFICATIONS (PWA-29 to PWA-32)
  // ==========================================
  {
    id: "PWA-29",
    category: "Web & PWA — Spaces & People",
    name: "Collections Directory",
    userGoal: "Browse and manage themed groupings of memories (e.g. 'Summer at the Lake 1988', 'Liam Year 1', 'Wedding Kept Memories').",
    userStory: "As an archivist, I want to view all curated collections so I can organize memories into meaningful thematic albums before turning them into books.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/collections", "/spaces/:spaceId"],
      exit: ["/spaces/:spaceId/collections/:collectionId", "/spaces/:spaceId/collections/new"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/collections"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_collections"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Thematic Collections' with '+ New Collection' button and sort dropdown.",
      main: "Grid of Collection Cards: Cover image collage, Collection title, Memory item count, Date span, Creator avatar.",
      footer: "Collection count summary."
    },
    exactControls: [
      "Button: '+ New Collection'",
      "Collection card click (opens collection detail)",
      "Sort dropdown (Recent, Title, Memory Count)",
      "Quick add memories to collection modal trigger"
    ],
    keyboardFocus: {
      initialFocus: "First collection card",
      tabOrder: ["New collection button", "Sort dropdown", "Collection cards in grid"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Collection card grid skeleton pulse.",
      empty: "Notice: 'No collections created yet. Group related memories into a curated collection.'",
      populated: "Grid of collection cards with warm border #E7E2DA and photographic covers.",
      error: "Error banner with refresh button.",
      offline: "Cached collections rendered from local IndexedDB.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Thematic collections directory with cover photos and memory counts.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column list with wide banner cards.",
      tablet: "Two-column grid.",
      desktop: "Three-column grid with subtle hover elevation."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/collections",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { collections: Array<{ id: string, title: string, description: string, memoryCount: number, coverUrl: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["tags", "memory_tags", "memories"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: false,
      privacyNotes: "Collections scoped strictly to space members."
    },
    testCriteria: {
      unit: ["sorts collections by title and memory count correctly"],
      integration: ["GET /api/spaces/:spaceId/collections returns collections for space"],
      e2e: ["navigates to collections, clicks on 'Summer at the Lake', verifies detail view"]
    },
    uiComponents: ["CollectionGrid", "CollectionCard", "SortDropdown", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-30",
    category: "Web & PWA — Spaces & People",
    name: "Collection Detail & Curated Order View",
    userGoal: "View all memories in a collection, reorder them, inspect the cover banner, and export to book authoring.",
    userStory: "As an archivist preparing a book, I want to curate and reorder memories within a collection and click 'Create Book from Collection'.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/collections/:collectionId", "/spaces/:spaceId/collections"],
      exit: ["/spaces/:spaceId/collections/:collectionId/edit", "/books/new?collectionId=:collectionId", "/memories/:memoryId"],
      back: "/spaces/:spaceId/collections",
      deepLink: "https://memoria.local/spaces/:spaceId/collections/:collectionId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_collection_detail", "edit_collection (Contributor+)"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Collection hero banner: Cover photograph, Title, Description, Item count, 'Create Book' button, 'Edit Collection' button.",
      main: "Curated reorderable masonry grid of memories with drag handles and chronological tags.",
      footer: "Batch actions bar when items are selected."
    },
    exactControls: [
      "Button: 'Turn into Book'",
      "Button: 'Edit Collection'",
      "Button: '+ Add Memories'",
      "Drag handle on memory items for custom curation order",
      "Remove from collection button on items"
    ],
    keyboardFocus: {
      initialFocus: "Turn into Book button",
      tabOrder: ["Action buttons", "Memory grid items", "Drag handles"],
      escapeBehavior: "Deselects selected items"
    },
    statesMatrix: {
      loading: "Collection hero and memory grid skeletons.",
      empty: "Notice: 'This collection is empty. Add memories from your archive.'",
      populated: "Rich grid of memories organized in custom curated or chronological sequence.",
      error: "Error banner if collection not found.",
      offline: "Cached collection available offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Collection detail with title, description, and reorderable memories.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column list with tap-to-move-up/down controls for reordering.",
      tablet: "Two-column grid with touch drag-and-drop.",
      desktop: "Three-column grid with pointer drag reordering and floating batch action bar."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/collections/:collectionId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { collection: any, memories: Array<Memory> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "memory_tags", "tags"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["collection.viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Curated memory order persisted per collection."
    },
    testCriteria: {
      unit: ["reorders memory array on drag drop completion", "filters out deleted memories"],
      integration: ["PUT /api/spaces/:spaceId/collections/:collectionId/reorder saves order in database"],
      e2e: ["reorders 2 items in collection, clicks Turn into Book, loads wizard"]
    },
    uiComponents: ["CollectionBanner", "ReorderableGrid", "BatchActionBar", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-31",
    category: "Web & PWA — Spaces & People",
    name: "Create / Edit Thematic Collection View",
    userGoal: "Create a new themed collection or edit its title, narrative description, and cover photo.",
    userStory: "As an archivist, I want to create a collection titled 'Liam Year 1' and set a cover photo so I can group baby photos together.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/collections/new", "/spaces/:spaceId/collections/:collectionId/edit"],
      exit: ["/spaces/:spaceId/collections/:collectionId", "/spaces/:spaceId/collections"],
      back: "/spaces/:spaceId/collections",
      deepLink: "https://memoria.local/spaces/:spaceId/collections/new"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["create_collection", "edit_collection"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title: 'Create Collection' or 'Edit Collection Details'.",
      main: "Form: Collection Title, Narrative Description, Cover Photo selector (from existing space memories or device upload), Privacy visibility setting.",
      footer: "Cancel button and Save Collection button."
    },
    exactControls: [
      "Collection Title input field",
      "Description textarea",
      "Cover Photo selector modal trigger",
      "Save Collection Button",
      "Cancel Button"
    ],
    formValidation: {
      fields: [
        { name: "title", type: "text", required: true, limits: "1-120 characters", errorCopy: "Please provide a collection title." },
        { name: "description", type: "textarea", required: false, limits: "0-2000 characters" }
      ]
    },
    keyboardFocus: {
      initialFocus: "Collection Title input field",
      tabOrder: ["Title", "Description", "Cover selector", "Save button", "Cancel button"],
      escapeBehavior: "Prompts if dirty before closing"
    },
    statesMatrix: {
      loading: "Saving collection spinner.",
      empty: "Fresh inputs.",
      populated: "Pre-filled with existing collection data.",
      error: "Inline validation error alerts.",
      offline: "Queued in IndexedDB.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Collection configuration form. Title, description, and cover photo.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width form.",
      tablet: "Centered 560px card.",
      desktop: "Centered 640px card."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/collections",
      authType: "Bearer JWT",
      requestBody: "{ title: string, description?: string, coverMediaId?: string }",
      responseBody: "{ success: true, data: { collectionId: string, title: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["tags"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collection.created"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Collection created under space ownership."
    },
    testCriteria: {
      unit: ["validates title length requirement", "handles cover media ID assignment"],
      integration: ["POST /api/spaces/:spaceId/collections creates record"],
      e2e: ["submits collection form and redirects to collection detail"]
    },
    uiComponents: ["CollectionForm", "CoverSelector", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-32",
    category: "Web & PWA — Spaces & People",
    name: "Notification Center & System Notices",
    userGoal: "Review all invites, comments, media processing completions, OCR results, and system announcements.",
    userStory: "As a collaborator, I want to inspect notifications so I know when grandmother commented on a photo or when a 3D book render finished.",
    entryExitRoutes: {
      entry: ["/notifications", "/dashboard"],
      exit: ["/spaces/:spaceId", "/memories/:memoryId", "/books/:bookId"],
      back: "/dashboard",
      deepLink: "https://memoria.local/notifications"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_notifications"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Notification Center' with 'Mark all as read' button and filter tabs (All, Comments, Invites, Processing).",
      main: "List of notification rows: Category icon, Notification text with actor attribution, Timestamp, Action CTA (View Memory, Accept Invite, Inspect Book), Unread indicator dot.",
      footer: "Notification preferences link."
    },
    exactControls: [
      "Button: 'Mark all as read'",
      "Filter tabs (All, Comments, Invites, Processing)",
      "Notification row click (navigates to relevant entity and marks read)",
      "Delete notification swipe / button"
    ],
    keyboardFocus: {
      initialFocus: "First unread notification",
      tabOrder: ["Mark all read", "Filter tabs", "Notification list items"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "List row skeleton pulse.",
      empty: "Warm illustration: 'You're all caught up. No new notifications.'",
      populated: "List with unread rows highlighted in Warm Ivory #F7F4EE with Plum #76556F unread dot.",
      error: "Error banner with refresh button.",
      offline: "Cached notifications shown with offline badge.",
      permissionDenied: "Redirect to login."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Notification center listing system alerts, comments, and space invitations.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width list with swipe actions.",
      tablet: "Centered 600px list.",
      desktop: "Centered 720px list with quick action buttons."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/notifications",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { notifications: Array<{ id: string, category: string, title: string, body: string, isRead: boolean, createdAt: string, entityUrl: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service / memory-service",
      databaseTables: ["audit_logs"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["notification.marked_read"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Previews omit confidential story bodies from push payloads."
    },
    testCriteria: {
      unit: ["marks single and all notifications as read", "filters by category"],
      integration: ["GET /api/notifications returns user specific notices"],
      e2e: ["marks all notifications as read, verifies unread count updates to 0"]
    },
    uiComponents: ["NotificationList", "NotificationItem", "FilterTabs", "Button"],
    verifiedStatus: "Implemented & Verified"
  },

  // ==========================================
  // 1.4 MEMORY ARCHIVE & MANAGEMENT (PWA-33 to PWA-48)
  // ==========================================
  {
    id: "PWA-33",
    category: "Web & PWA — Archive & Media",
    name: "Memory Archive Grid & Masonry View",
    userGoal: "Browse all preserved memories in a responsive masonry grid with thumbnail-first rendering, format filters, and selection.",
    userStory: "As an archivist, I want to view all family photos, documents, and recordings in a responsive gallery so I can easily find and review memories.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/archive", "/spaces/:spaceId"],
      exit: ["/memories/:memoryId", "/create-memory?spaceId=:spaceId"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/archive"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_archive"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Filter & search bar: Search memories, Filter by Format (Photos, Audio, Video, Story, Document), Person filter, Date range, Grid density toggle (Compact, Comfortable, Large).",
      main: "Masonry gallery of Memory Cards: Thumbnail preview, Format icon badge, Title, Capture date, Tagged profiles avatars, Favorite heart icon.",
      footer: "Item count summary and pagination/infinite scroll loader."
    },
    exactControls: [
      "Format filter buttons (Photos, Video, Audio, Story, Document)",
      "Grid density selector (2-col, 3-col, 4-col)",
      "Memory card click (opens Memory Detail modal PWA-38)",
      "Favorite toggle heart button on card hover",
      "Multi-select mode toggle button for bulk actions"
    ],
    keyboardFocus: {
      initialFocus: "First memory card in grid",
      tabOrder: ["Filter bar", "Density selector", "Memory cards", "Favorite buttons"],
      shortcuts: ["KeyF (Toggle Favorite on focused item)", "Enter (Open memory)", "KeyS (Toggle Select mode)"],
      escapeBehavior: "Exits multi-select mode"
    },
    statesMatrix: {
      loading: "Masonry skeleton with shimmering ivory card placeholders.",
      empty: "Archival empty state: 'No memories found matching these filters. Try adjusting your search or add a memory.'",
      populated: "Responsive masonry grid with thumbnail-first progressive image loading.",
      error: "Error banner with retry reload action.",
      offline: "Cached thumbnails and memory records served from local IndexedDB.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Memory archive gallery. Grid of photos and stories with filter options.",
      touchTargetMin: "44x44 px for action targets",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "2-column masonry grid with touch hold to select.",
      tablet: "3-column masonry grid.",
      desktop: "4 or 5-column balanced masonry grid with hover metadata overlays."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/memories",
      authType: "Bearer JWT",
      requestBody: "Query: { format?: MemoryFormat, profileId?: string, tag?: string, limit?: number, cursor?: string }",
      responseBody: "{ success: true, data: { items: Array<Memory>, nextCursor: string | null } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "memory_media", "media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["archive.browsed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Only authorized members of the space can query memories."
    },
    testCriteria: {
      unit: ["filters memory list by format and profile", "calculates stable aspect ratios"],
      integration: ["GET /api/spaces/:spaceId/memories supports cursor pagination"],
      e2e: ["filters by Photos, toggles Favorite, verifies heart state updates"]
    },
    uiComponents: ["MasonryGrid", "MemoryCard", "FilterBar", "DensityToggle"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-34",
    category: "Web & PWA — Archive & Media",
    name: "Comprehensive Historical Timeline View",
    userGoal: "Explore all memories across all spaces or a specific space organized strictly by historical capture date.",
    userStory: "As an archivist, I want a comprehensive timeline with a month-by-month index so I can trace historical progression across decades.",
    entryExitRoutes: {
      entry: ["/timeline", "/spaces/:spaceId/timeline"],
      exit: ["/memories/:memoryId", "/dashboard"],
      back: "/dashboard",
      deepLink: "https://memoria.local/timeline"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_timeline"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Timeline controls: Year jump slider, Space selector, Filter by Person.",
      main: "Central vertical timeline axis with month markers (e.g. 'October 1974'), memory cards branching left and right with high-res thumbnails and captions.",
      aside: "Decade jump bar (1940s through 2020s).",
      footer: "Timeline end banner."
    },
    exactControls: [
      "Decade jump links",
      "Year slider scrubber",
      "Memory card click",
      "Sort order toggle (Chronological / Reverse)"
    ],
    keyboardFocus: {
      initialFocus: "Decade jump bar",
      tabOrder: ["Controls", "Decade links", "Timeline memory cards"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Timeline spine with pulsating skeleton cards.",
      empty: "Notice: 'No memories recorded yet for this timeframe.'",
      populated: "Fluid timeline in Deep Ink #20242C and Sage #849483 with historical cards.",
      error: "Error banner with refresh action.",
      offline: "Cached timeline served offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Chronological historical timeline listing memories by capture year and month.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single side timeline with top sticky month/year header.",
      tablet: "Alternating card layout.",
      desktop: "Alternating card layout with right-hand sticky decade navigator."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/memories/timeline",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { timeline: Array<{ year: number, months: Array<{ month: number, memories: Array<Memory> }> }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "memory_media"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Historical timestamps strictly preserved."
    },
    testCriteria: {
      unit: ["sorts memories by captured_at ASC", "groups by year and month without gaps"],
      integration: ["GET /api/memories/timeline returns structured chronological payload"],
      e2e: ["scrubs year slider to 1980, verifies smooth scroll to 1980 markers"]
    },
    uiComponents: ["TimelineSpine", "MonthHeader", "TimelineCard", "DecadeScrubber"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-35",
    category: "Web & PWA — Archive & Media",
    name: "Calendar Memory Heatmap & Anniversary View",
    userGoal: "Inspect memories mapped to a traditional calendar grid, discover anniversaries, and view 'This Day in History'.",
    userStory: "As a family member, I want to open the calendar view for June to see all birthdays, wedding anniversaries, and summer vacations preserved on each date.",
    entryExitRoutes: {
      entry: ["/calendar", "/spaces/:spaceId/calendar"],
      exit: ["/calendar/:year/:month/:day", "/memories/:memoryId"],
      back: "/dashboard",
      deepLink: "https://memoria.local/calendar"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_calendar"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Calendar navigation: Month/Year header (e.g. 'June 2024'), Previous Month button, Next Month button, Today button, Filter by Space.",
      main: "7-column Month Calendar Grid: Day numbers, Anniversary indicator badges (Birthdays, Weddings), Thumbnail dots/previews representing memories on that date.",
      aside: "Selected Date inspector sidebar: list of memories captured on that day across all years.",
      footer: "Calendar legend (Memories, Birthdays, Anniversaries)."
    },
    exactControls: [
      "Month navigation chevrons (Prev, Next)",
      "Today button",
      "Calendar cell click (selects date and opens day memory panel)",
      "Memory card click in sidebar"
    ],
    keyboardFocus: {
      initialFocus: "Today's calendar cell",
      tabOrder: ["Navigation buttons", "Calendar grid cells", "Sidebar memory cards"],
      shortcuts: ["ArrowLeft (Prev Day)", "ArrowRight (Next Day)", "ArrowUp (Prev Week)", "ArrowDown (Next Week)"],
      escapeBehavior: "Closes selected day sidebar"
    },
    statesMatrix: {
      loading: "Calendar grid skeleton pulse.",
      empty: "Empty cells indicate zero memories on that date.",
      populated: "Calendar cells decorated with thumbnail circles and anniversary tags.",
      error: "Error banner with refresh button.",
      offline: "Cached calendar rendered from local database.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Calendar memory view. Select a day to view historical memories and anniversaries.",
      touchTargetMin: "44x44 px for all calendar date cells",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Compact calendar cells with count badges; tapping day opens bottom drawer.",
      tablet: "Full calendar grid with side day inspector.",
      desktop: "Expanded calendar grid with multi-thumbnail previews per cell."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/memories/calendar",
      authType: "Bearer JWT",
      requestBody: "Query: { month: number, year: number, spaceId?: string }",
      responseBody: "{ success: true, data: { days: Record<string, { memoryCount: number, anniversaries: Array<string>, memories: Array<Memory> }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "space_profiles"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Birthdays and anniversaries kept confidential within space."
    },
    testCriteria: {
      unit: ["generates accurate calendar grid for leap years", "maps memories to correct local day"],
      integration: ["GET /api/memories/calendar aggregates memories by day of month"],
      e2e: ["navigates to June, clicks June 15, inspects anniversary memory in sidebar"]
    },
    uiComponents: ["CalendarGrid", "CalendarCell", "AnniversaryBadge", "DayInspectorPanel"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-36",
    category: "Web & PWA — Archive & Media",
    name: "Global Search & Faceted Filter View",
    userGoal: "Search across memories, people, scanned document text (OCR), tags, and locations with instant faceted filtering.",
    userStory: "As an archivist looking for grandmother's handwritten recipe, I want to search 'pie crust' to find the scanned postcard matching OCR text.",
    entryExitRoutes: {
      entry: ["/search", "/search?q=:query"],
      exit: ["/memories/:memoryId", "/spaces/:spaceId/people/:profileId"],
      back: "/dashboard",
      deepLink: "https://memoria.local/search?q=:query"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["search_memories"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Prominent search bar with instant query input, clear button, and total match counter.",
      main: "1. People match chips, 2. Memory search results grid with OCR text snippet highlights, 3. Tag pills match list.",
      aside: "Faceted filter sidebar: Formats (Photos, Scans, Audio), Tag filters, Date range picker, Spaces selector.",
      footer: "Search tips."
    },
    exactControls: [
      "Search input field with real-time debounced query",
      "Clear query button",
      "Facet checkboxes (Format, Person, Space, Date)",
      "Result card click (navigates to memory detail with highlighted search terms)"
    ],
    keyboardFocus: {
      initialFocus: "Search input field",
      tabOrder: ["Search bar", "Facet filters", "Search result cards"],
      shortcuts: ["Cmd+K (Focus search)", "Escape (Clear query)"],
      escapeBehavior: "Clears search input"
    },
    statesMatrix: {
      loading: "Search result card skeleton pulse.",
      empty: "Notice: 'No memories match your query. Try broadening your terms or checking other spaces.'",
      populated: "Highlighted search results with snippet matches in story text and OCR documents.",
      error: "Error banner with refresh button.",
      offline: "IndexedDB full-text search executed locally across cached memories.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Global search results. Filter by format, person, space, and date.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Search bar at top, filter button opens bottom filter sheet, single column results.",
      tablet: "Two-column layout (Left filters 30%, Right results 70%).",
      desktop: "Centered max-width 1200px layout with sticky facet sidebar."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/search",
      authType: "Bearer JWT",
      requestBody: "Query: { q: string, format?: string, spaceId?: string, profileId?: string, page?: number }",
      responseBody: "{ success: true, data: { items: Array<Memory & { matchSnippet?: string }>, total: number } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / search-service",
      databaseTables: ["memories", "media_assets", "tags", "space_profiles"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["search.executed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Search queries strictly restricted to spaces where user holds active membership."
    },
    testCriteria: {
      unit: ["highlights query substring safely without XSS risk", "debounces search input by 300ms"],
      integration: ["GET /api/search returns matches across story text and tags"],
      e2e: ["searches 'recipe', verifies matching memory card appears with highlighted snippet"]
    },
    uiComponents: ["SearchBar", "FacetSidebar", "SearchResultCard", "MatchSnippet"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-37",
    category: "Web & PWA — Archive & Media",
    name: "Favorites Collection & Starred Memories",
    userGoal: "Access all personal starred or favorite memories in one dedicated view.",
    userStory: "As an archivist, I want to quickly review my favorited memories so I can select the best family photos for our annual heirloom book.",
    entryExitRoutes: {
      entry: ["/favorites", "/dashboard"],
      exit: ["/memories/:memoryId", "/books/new?favorites=true"],
      back: "/dashboard",
      deepLink: "https://memoria.local/favorites"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_favorites"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Favorited Memories' with 'Create Book from Favorites' button and filter pills.",
      main: "Masonry gallery of starred memory cards with heart badges in Plum #76556F.",
      footer: "Favorite items count summary."
    },
    exactControls: [
      "Button: 'Turn Favorites into Book'",
      "Memory card click",
      "Unstar heart button (with undo toast notification)",
      "Filter by Space dropdown"
    ],
    keyboardFocus: {
      initialFocus: "First favorite memory card",
      tabOrder: ["Turn into Book button", "Space filter", "Memory cards"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Masonry card skeletons.",
      empty: "Warm illustration: 'You have no favorited memories yet. Tap the heart on any memory to save it here.'",
      populated: "Curated grid of highest-sentiment family photographs and stories.",
      error: "Error banner with reload button.",
      offline: "Cached favorites displayed offline.",
      permissionDenied: "401 Unauthorized."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Favorited memories gallery with option to author a book.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "2-column masonry grid.",
      tablet: "3-column grid.",
      desktop: "4-column balanced grid."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/memories/favorites",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { items: Array<Memory> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Favorites stored per user-space membership."
    },
    testCriteria: {
      unit: ["removes item from view with undo toast when heart clicked"],
      integration: ["GET /api/memories/favorites filters by is_favorite = true"],
      e2e: ["navigates to favorites, unstars a memory, verifies immediate update"]
    },
    uiComponents: ["FavoritesGrid", "MemoryCard", "UndoToast", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-38",
    category: "Web & PWA — Archive & Media",
    name: "Full Memory Detail Modal & Narrative Page",
    userGoal: "Inspect a memory's high-resolution media, read the written narrative story, review EXIF metadata, listen to attached audio, and read comments.",
    userStory: "As a family member, I want to open a memory to see the full photograph, read grandmother's handwritten recipe transcription, and listen to her voice recording.",
    entryExitRoutes: {
      entry: ["/memories/:memoryId", "/spaces/:spaceId/archive"],
      exit: ["/spaces/:spaceId/archive", "/memories/:memoryId/edit"],
      back: "/spaces/:spaceId/archive",
      deepLink: "https://memoria.local/memories/:memoryId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_memory", "edit_memory (Author/Editor)", "comment_memory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Top modal bar: Memory title, Capture date (e.g. 'August 14, 1968'), Location badge, Edit button, Favorite toggle, Close (X) button.",
      main: "1. High-resolution media viewer (image carousel, video player, audio player), 2. Story narrative card with serif typography, 3. Tagged profiles pills, 4. EXIF technical data panel (Camera, Lens, ISO, Dimensions, SHA-256), 5. Comments & family discussions thread.",
      footer: "Add comment input field and reaction buttons."
    },
    exactControls: [
      "Image zoom & inspect trigger",
      "Audio play/pause waveform button",
      "Profile tag pills (click to view profile)",
      "Edit Memory Button (Author / Editor only)",
      "Favorite heart toggle button",
      "Comment submit form button",
      "Close Modal button (Escape)"
    ],
    keyboardFocus: {
      initialFocus: "Modal title",
      tabOrder: ["Close button", "Media viewer", "Audio player", "Edit button", "Comment input", "Submit button"],
      shortcuts: ["Escape (Close modal)", "KeyE (Edit memory)", "KeyF (Favorite)"],
      escapeBehavior: "Closes modal and restores background scroll position"
    },
    statesMatrix: {
      loading: "Modal detail skeleton with pulsing media area and text lines.",
      empty: "N/A",
      populated: "Immersive memory view with rich narrative in Cormorant Garamond, crisp archival photography, audio waveform.",
      error: "Error banner if memory is not found or has been deleted.",
      offline: "Cached memory details and thumbnails served offline.",
      permissionDenied: "403 Forbidden screen if user lacks space membership."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Memory details: Title, capture date, location, attached photo with description, narrative story, and comments.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1 (Deep Ink on Warm Ivory)"
    },
    responsive: {
      mobile: "Full screen sheet with vertical stack: media top, story middle, comments bottom.",
      tablet: "Two-column modal (Media left 55%, Narrative & Comments right 45%).",
      desktop: "Expansive two-column layout max-width 1200px with near-black photo viewing capability."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/memories/:memoryId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { memory: Memory, media: Array<MediaAsset>, comments: Array<any>, profiles: Array<SpaceProfile> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden", "404 Not Found"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "memory_media", "media_assets", "memory_profiles"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["memory.viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Original byte checksum exposed for archival provenance; private media URLs signed."
    },
    testCriteria: {
      unit: ["renders story markdown safely without HTML injection", "formats capture date vs upload date clearly"],
      integration: ["GET /api/memories/:memoryId returns complete memory record with media relations"],
      e2e: ["opens memory detail, plays attached audio note, submits a family comment"]
    },
    uiComponents: ["MemoryModal", "MediaCarousel", "WaveformPlayer", "StoryTypography", "CommentThread"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-39",
    category: "Web & PWA — Archive & Media",
    name: "Create Memory Type Selection Dialog",
    userGoal: "Choose the primary format for a new memory (Photos, Video, Voice Recording, Written Story, or Scanned Document).",
    userStory: "As an archivist, I want to choose whether I am uploading scanned photos, recording an audio story, or writing a memoir chapter.",
    entryExitRoutes: {
      entry: ["/create-memory", "/dashboard", "/spaces/:spaceId"],
      exit: ["/create-memory/media", "/create-memory/audio", "/create-memory/story", "/create-memory/document"],
      back: "/dashboard",
      deepLink: "https://memoria.local/create-memory"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["create_memory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Dialog title: 'Preserve a New Memory' with close button.",
      main: "5 format option cards: 1. Photographs & Albums, 2. Video Clips & Home Movies, 3. Voice Recording & Oral History, 4. Written Memoir & Quotes, 5. Scanned Documents & Letters.",
      footer: "Cancel button."
    },
    exactControls: [
      "Option card click: 'Photographs'",
      "Option card click: 'Video'",
      "Option card click: 'Voice Note'",
      "Option card click: 'Written Story'",
      "Option card click: 'Document'",
      "Close / Cancel button"
    ],
    keyboardFocus: {
      initialFocus: "First option card (Photographs)",
      tabOrder: ["Option cards 1-5", "Cancel button"],
      shortcuts: ["KeyP (Photos)", "KeyV (Video)", "KeyA (Audio)", "KeyS (Story)", "KeyD (Document)"],
      escapeBehavior: "Closes dialog"
    },
    statesMatrix: {
      loading: "N/A",
      empty: "N/A",
      populated: "Cards decorated with archival icons and explanatory subtitles.",
      error: "N/A",
      offline: "Fully accessible offline.",
      permissionDenied: "Alert if user is only Viewer in the active space."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Select memory type dialog. Choose from photographs, video, voice note, story, or document.",
      touchTargetMin: "48x48 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Bottom sheet with vertical list of buttons.",
      tablet: "Centered modal with 2-column card grid.",
      desktop: "Centered modal with 3-column card grid."
    },
    apiContract: {
      method: "N/A",
      endpoint: "N/A (Client-side routing dialog)",
      authType: "Bearer JWT",
      responseBody: "N/A",
      statusCodes: ["200 OK"]
    },
    servicePersistence: {
      service: "web",
      databaseTables: [],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "None",
      auditLogged: false,
      privacyNotes: "Client dialog."
    },
    testCriteria: {
      unit: ["routes to correct workflow on card selection", "checks space contributor permissions"],
      integration: ["opens target workflow with active spaceId preserved"],
      e2e: ["clicks + button, selects Voice Recording, verifies microphone prompt"]
    },
    uiComponents: ["TypeSelectionDialog", "FormatOptionCard", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-40",
    category: "Web & PWA — Archive & Media",
    name: "Media Selection & Direct-to-Storage Upload Modal",
    userGoal: "Select multi-file photos, videos, or documents, preview them, and initiate direct-to-storage resumable uploads.",
    userStory: "As an archivist, I want to select 20 family photos from my local disk and upload them with real-time SHA-256 integrity verification.",
    entryExitRoutes: {
      entry: ["/create-memory/media", "/create-memory"],
      exit: ["/create-memory/metadata", "/spaces/:spaceId/archive"],
      back: "/create-memory",
      deepLink: "https://memoria.local/create-memory/media"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["upload_media"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Modal title: 'Upload Archival Media' with space name and close button.",
      main: "1. Drag-and-drop target zone, 2. 'Choose Files' button (multi-select), 3. Selected files preview list (thumbnail, file name, size, SHA-256 status), 4. Overall upload progress bar.",
      footer: "Cancel button and 'Continue to Memory Details' button."
    },
    exactControls: [
      "File picker input trigger button",
      "Remove item button on individual file cards",
      "Upload All Button",
      "Cancel Button"
    ],
    formValidation: {
      fields: [
        { name: "files", type: "file[]", required: true, limits: "Max 500MB per file; max 50 files per batch", errorCopy: "File exceeds 500MB limit or format unsupported." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Choose Files button",
      tabOrder: ["Choose Files", "Selected file cards", "Upload All button", "Cancel button"],
      escapeBehavior: "Warns if upload is active before closing"
    },
    statesMatrix: {
      loading: "Uploading files with individual and batch progress bars.",
      empty: "Dropzone prompt: 'Drag photos or documents here, or browse files.'",
      populated: "File cards showing instant thumbnail preview and byte size.",
      error: "Oversized file or network error badge with retry button.",
      offline: "Queued in IndexedDB offline upload queue.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Media selection modal. Choose files to upload with drag and drop support.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full screen modal with direct camera / photo roll access.",
      tablet: "Centered modal max-width 640px.",
      desktop: "Centered modal max-width 780px with drag hover elevation."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/media/upload-session",
      authType: "Bearer JWT",
      requestBody: "{ spaceId: string, fileName: string, mimeType: string, fileSizeBytes: number, checksumSha256?: string }",
      responseBody: "{ success: true, data: { mediaId: string, uploadUrl: string, storageKey: string } }",
      statusCodes: ["200 OK", "400 Bad Request", "413 Payload Too Large"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["media_assets", "space_storage_quotas"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["media.upload_session_created"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Media uploaded directly to tenant-isolated disk storage."
    },
    testCriteria: {
      unit: ["validates MIME type against whitelist", "calculates progressive chunk upload percent"],
      integration: ["POST /api/media/upload-session validates storage quota before issuing token"],
      e2e: ["selects test image fixture, observes upload complete, proceeds to metadata form"]
    },
    uiComponents: ["UploadModal", "DropZone", "FileListPreview", "ProgressBar", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-41",
    category: "Web & PWA — Archive & Media",
    name: "Floating Upload Queue & Background Sync Hub",
    userGoal: "Monitor multi-file background upload progress, checksum hashing, and derivative thumbnail generation.",
    userStory: "As an archivist uploading 50 scanned family letters, I want a floating upload queue widget so I can continue browsing while processing finishes.",
    entryExitRoutes: {
      entry: ["/upload-queue", "Floating widget on all pages"],
      exit: ["/spaces/:spaceId/archive", "/upload-failures"],
      back: "/",
      deepLink: "https://memoria.local/upload-queue"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_upload_queue"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Floating pill header: 'Uploading 3 of 12 items (42%)', Minimize / Expand chevron button, Close button.",
      main: "Scrollable queue list: File thumbnail, File name, Status badge (Queued, Uploading, Processing Derivatives, Complete, Failed), Progress bar, Cancel button.",
      footer: "'Pause All' and 'Clear Completed' buttons."
    },
    exactControls: [
      "Minimize / Expand widget toggle",
      "Cancel item upload (X button)",
      "Pause All uploads button",
      "Resume All uploads button",
      "Clear completed items button"
    ],
    keyboardFocus: {
      initialFocus: "Expand widget button",
      tabOrder: ["Expand button", "Queue items", "Cancel buttons", "Clear button"],
      escapeBehavior: "Minimizes widget"
    },
    statesMatrix: {
      loading: "Live active transfer with streaming percentage bars.",
      empty: "Widget auto-minimizes when queue is empty.",
      populated: "Floating panel in bottom-right corner with smooth progress animations.",
      error: "Amber failed state indicator with 'View 2 failed items' link.",
      offline: "Paused badge with notice: 'Waiting for local network reconnection...'",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Floating upload queue announcing active transfer percentage and completed files.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Docked bottom bar expanding to full screen drawer.",
      tablet: "Floating bottom-right card (360px width).",
      desktop: "Floating bottom-right card (420px width) with backdrop blur."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/media/upload-sessions/active",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { activeSessions: Array<{ mediaId: string, fileName: string, progressPercent: number, status: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["media.upload_progress_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Only shows user's own upload sessions."
    },
    testCriteria: {
      unit: ["aggregates total batch percentage accurately", "removes completed items on clear"],
      integration: ["polls or listens to SSE upload progress events"],
      e2e: ["minimizes and expands upload widget, cancels an active file"]
    },
    uiComponents: ["FloatingQueuePill", "QueueList", "QueueItem", "ProgressBar", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-42",
    category: "Web & PWA — Archive & Media",
    name: "Upload Failures, Conflict Resolution & Retry Center",
    userGoal: "Inspect failed uploads, resolve offline merge conflicts, review human-readable failure causes, and retry safely.",
    userStory: "As an archivist working on an intermittent connection, I want to review failed uploads and resolve conflicts without losing either version.",
    entryExitRoutes: {
      entry: ["/upload-failures", "/upload-queue"],
      exit: ["/spaces/:spaceId/archive", "/dashboard"],
      back: "/dashboard",
      deepLink: "https://memoria.local/upload-failures"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["retry_uploads", "resolve_conflicts"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Upload Troubleshooting & Conflicts' with 'Retry All Failed' button.",
      main: "Failed item cards: File preview, Failure reason (e.g. 'Network timeout during SHA-256 verification', 'Storage quota exceeded', 'Concurrent edit conflict'), 'Keep Both Versions' toggle, 'Retry' button, 'Discard' button.",
      footer: "Local disk space check helper."
    },
    exactControls: [
      "Button: 'Retry All Failed'",
      "Button: 'Retry Item'",
      "Button: 'Keep Both (Resolve Conflict)'",
      "Button: 'Discard Item'"
    ],
    keyboardFocus: {
      initialFocus: "First failed item card",
      tabOrder: ["Retry All", "Failed items", "Resolution buttons"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Retrying transfer spinner.",
      empty: "Notice: 'All uploads verified and complete. Zero conflicts detected.'",
      populated: "Card list detailing exact failure diagnostics and resolution paths.",
      error: "Alert banner if retry fails again with suggested action.",
      offline: "Offline indicator explaining that retry will resume automatically on reconnection.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Upload failure and conflict resolution center. Review failed files and retry.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column card list.",
      tablet: "Centered 600px list.",
      desktop: "Centered 760px list with side-by-side conflict comparison."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/media/upload-sessions/:sessionId/retry",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { status: 'restarted', uploadUrl: string } }",
      statusCodes: ["200 OK", "400 Bad Request", "404 Not Found"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["media_assets", "audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["media.upload_retried"],
      bullmqJobs: ["resume-media-upload"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Conflict resolutions preserve both copies to prevent archival data loss."
    },
    testCriteria: {
      unit: ["preserves both versions on conflict resolution", "displays human-readable error messages"],
      integration: ["POST /api/media/upload-sessions/:sessionId/retry re-opens upload session"],
      e2e: ["retries failed file, observes progress update to complete"]
    },
    uiComponents: ["FailureCard", "ConflictResolver", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-43",
    category: "Web & PWA — Archive & Media",
    name: "High-Resolution Image Viewer & Non-Destructive Studio",
    userGoal: "Inspect photographs in full-viewport near-black canvas, zoom up to 400%, pan, rotate, and crop non-destructively.",
    userStory: "As an archivist, I want to zoom in on a 1920 family portrait to examine faces in high detail without altering the original archival master.",
    entryExitRoutes: {
      entry: ["/memories/:memoryId/photo/:mediaId", "/memories/:memoryId"],
      exit: ["/memories/:memoryId", "/spaces/:spaceId/archive"],
      back: "/memories/:memoryId",
      deepLink: "https://memoria.local/memories/:memoryId/photo/:mediaId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_high_res_photo", "crop_photo (Contributor+)"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Minimal dark HUD over media: File name, Zoom level (e.g. '150%'), Download Original button, Close button.",
      main: "Full-viewport near-black (#0D0E11) canvas with high-resolution pan and zoom canvas, crop boundary overlay.",
      footer: "Bottom floating HUD: Zoom in (+), Zoom out (-), Fit to screen, Rotate 90°, Crop toggle, Reset adjustments, Close."
    },
    exactControls: [
      "Zoom In Button (+)",
      "Zoom Out Button (-)",
      "Fit to Screen Button",
      "Rotate 90° Clockwise Button",
      "Crop Tool Toggle Button",
      "Download Archival Original Button",
      "Close Viewer Button"
    ],
    keyboardFocus: {
      initialFocus: "Fit to screen button",
      tabOrder: ["Top HUD buttons", "Bottom HUD controls"],
      shortcuts: ["Plus/Equal (Zoom in)", "Minus (Zoom out)", "KeyR (Rotate)", "Key0 (Fit)", "Escape (Close viewer)"],
      escapeBehavior: "Closes viewer and returns to memory detail"
    },
    statesMatrix: {
      loading: "Progressive rendering: displays fast blurred thumbnail while fetching full resolution master.",
      empty: "N/A",
      populated: "Crystal clear full resolution image with pan inertia.",
      error: "Error banner if master file fails to load.",
      offline: "Local high-res derivative cached in service worker.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Full-screen high-resolution photo viewer. Use keyboard shortcuts or HUD to zoom and pan.",
      touchTargetMin: "48x48 px floating controls",
      focusTrapping: true,
      contrastRatio: "12:1 (White icons over #0D0E11 near-black canvas)"
    },
    responsive: {
      mobile: "Pinch-to-zoom gestures, double-tap to toggle 200% zoom, swipe down to dismiss.",
      tablet: "Touch pan and pinch gestures, floating pill controls.",
      desktop: "Mouse wheel smooth zoom, drag to pan, full keyboard navigation."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/media/:mediaId/original",
      authType: "Bearer JWT",
      responseBody: "Binary stream with Content-Disposition header and SHA-256 header",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden", "404 Not Found"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["media.original_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Original master bytes preserved immutably; non-destructive crops stored as metadata transforms."
    },
    testCriteria: {
      unit: ["calculates zoom scale and pan boundaries correctly", "preserves original metadata during crop"],
      integration: ["GET /api/media/:mediaId/original returns signed binary with correct SHA-256"],
      e2e: ["zooms to 200%, pans canvas, presses Escape to exit back to memory detail"]
    },
    uiComponents: ["NearBlackCanvas", "PanZoomStage", "ViewerHUD", "CropOverlay"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-44",
    category: "Web & PWA — Archive & Media",
    name: "Archival Video Player & Timestamp View",
    userGoal: "Play home movies and digitized VHS tapes with closed captions, memory timestamp bookmarks, and scrub controls.",
    userStory: "As an archivist, I want to watch a digitized 1985 Christmas home video and jump directly to the timestamp when baby walked.",
    entryExitRoutes: {
      entry: ["/memories/:memoryId/video/:mediaId", "/memories/:memoryId"],
      exit: ["/memories/:memoryId", "/spaces/:spaceId/archive"],
      back: "/memories/:memoryId",
      deepLink: "https://memoria.local/memories/:memoryId/video/:mediaId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_video"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Video title, capture date, download video button, close button.",
      main: "16:9 HTML5 video player with custom accessible controls, caption toggle, playback speed selector.",
      aside: "Timestamp bookmarks panel (e.g. '01:24 Opening gifts', '04:10 Snowball fight').",
      footer: "Video narrative notes."
    },
    exactControls: [
      "Play / Pause button (Space)",
      "Seek bar scrubber",
      "Volume slider and Mute button",
      "Closed Captions (CC) toggle",
      "Playback Speed menu (0.5x, 1x, 1.25x, 1.5x)",
      "Timestamp bookmark buttons",
      "Fullscreen toggle"
    ],
    keyboardFocus: {
      initialFocus: "Play / Pause button",
      tabOrder: ["Play", "Seek bar", "Volume", "Captions", "Speed", "Bookmarks", "Close"],
      shortcuts: ["Space (Toggle Play)", "ArrowRight (Seek +5s)", "ArrowLeft (Seek -5s)", "KeyM (Mute)", "KeyF (Fullscreen)"],
      escapeBehavior: "Exits fullscreen or closes video modal"
    },
    statesMatrix: {
      loading: "Video buffer spinner with poster frame.",
      empty: "N/A",
      populated: "Smooth playback with progressive streaming.",
      error: "Codec unsupported or network failure message with option to download original.",
      offline: "Offline playback available if video was pre-downloaded.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Video player. Use spacebar to play or pause, arrow keys to seek.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width video player with touch scrubber; bookmarks below player.",
      tablet: "Centered video with right-hand bookmarks panel.",
      desktop: "Max-width 1000px theater mode layout."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/media/:mediaId/stream",
      authType: "Bearer JWT",
      responseBody: "Byte-range streaming video (206 Partial Content)",
      statusCodes: ["200 OK", "206 Partial Content", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["media_assets", "memories"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["media.video_played"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Private home video streams token-authenticated."
    },
    testCriteria: {
      unit: ["handles keyboard shortcuts for seek and mute", "jumps to timestamp on bookmark click"],
      integration: ["GET /api/media/:mediaId/stream supports Range header"],
      e2e: ["starts video, seeks to 00:30 via bookmark, confirms video time"]
    },
    uiComponents: ["VideoPlayer", "CustomControls", "TimestampList", "CaptionOverlay"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-45",
    category: "Web & PWA — Archive & Media",
    name: "Audio Recording Studio & Waveform Voice-Note Player",
    userGoal: "Record oral history stories directly in browser with live audio waveform visualization, pause/resume, and playback.",
    userStory: "As an interviewer, I want to record grandfather telling the story of how he met grandmother, with live visual feedback and pause support.",
    entryExitRoutes: {
      entry: ["/create-memory/audio", "/create-memory"],
      exit: ["/create-memory/metadata", "/spaces/:spaceId/archive"],
      back: "/create-memory",
      deepLink: "https://memoria.local/create-memory/audio"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["record_audio", "upload_media"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Studio title: 'Oral History Recording' with microphone input selector.",
      main: "1. Large timer display (00:00 / max 60:00), 2. Live canvas audio waveform visualizer, 3. Recording controls (Record / Pause / Resume / Stop), 4. Playback review scrubber.",
      footer: "'Discard Recording' button and 'Save Oral History' button."
    },
    exactControls: [
      "Microphone permission prompt button",
      "Record / Pause Toggle Button (Red circular trigger)",
      "Stop & Review Button",
      "Playback Play/Pause button",
      "Discard Recording button (with confirmation modal)",
      "Save Audio & Continue button"
    ],
    keyboardFocus: {
      initialFocus: "Record button",
      tabOrder: ["Microphone selector", "Record button", "Stop button", "Discard button", "Save button"],
      shortcuts: ["Space (Toggle Record/Pause)", "KeyS (Stop)"],
      escapeBehavior: "Prompts if active recording exists"
    },
    statesMatrix: {
      loading: "Requesting microphone hardware permission spinner.",
      empty: "Ready to record with microphone icon and zeroed timer.",
      populated: "Live animated green/plum waveform reacting to vocal amplitude.",
      error: "Microphone permission denied banner with browser instructions.",
      offline: "Audio recorded locally into IndexedDB Blob; ready to sync.",
      permissionDenied: "Permission denied alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Audio recording studio. Live timer and recording controls for oral history.",
      touchTargetMin: "56x56 px main record button",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Large tactile record button, simplified waveform display.",
      tablet: "Full canvas waveform with detailed timer and audio meter.",
      desktop: "Studio layout with audio input device dropdown and stereo level bars."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/media/upload-audio",
      authType: "Bearer JWT",
      requestBody: "Multipart audio/webm or audio/mp4 blob with spaceId",
      responseBody: "{ success: true, data: { mediaId: string, durationSeconds: number, waveformUrl: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["media_assets", "memories"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["media.audio_recorded"],
      bullmqJobs: ["generate-audio-waveform", "transcribe-audio"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Oral history voice recordings stored without cloud AI leakage."
    },
    testCriteria: {
      unit: ["manages MediaRecorder state transitions (inactive, recording, paused)", "formats timer accurately"],
      integration: ["POST /api/media/upload-audio persists audio asset"],
      e2e: ["grants mic mock, records 5 seconds, pauses, reviews playback, saves audio"]
    },
    uiComponents: ["AudioStudio", "WaveformCanvas", "RecordButton", "TimerDisplay", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-46",
    category: "Web & PWA — Archive & Media",
    name: "Story & Quote Rich-Text Typographic Editor",
    userGoal: "Write or edit rich narrative stories, family anecdotes, pull-quotes, and letters with editorial serif typography.",
    userStory: "As an archivist, I want to compose a 2-page family story with pull quotes, drop caps, and italics that will print beautifully in our book.",
    entryExitRoutes: {
      entry: ["/create-memory/story", "/memories/:memoryId/edit"],
      exit: ["/memories/:memoryId", "/spaces/:spaceId/archive"],
      back: "/spaces/:spaceId/archive",
      deepLink: "https://memoria.local/create-memory/story"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["edit_story", "create_memory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Editor toolbar: Heading 1, Heading 2, Bold, Italic, Pull Quote styling, Drop Cap toggle, Link, Attach Photo, Autosave indicator ('Saved 2s ago').",
      main: "Distraction-free editorial canvas with Cormorant Garamond typography on Warm Ivory #F7F4EE background.",
      aside: "Metadata drawer: Capture date picker, Location input, Tagged Profiles selector, Tags input.",
      footer: "Word count, reading time estimate, 'Cancel' and 'Publish Memory' buttons."
    },
    exactControls: [
      "Formatting buttons (Bold, Italic, Quote, Heading)",
      "Story Title input field",
      "Rich text content area (ContentEditable / ProseMirror)",
      "Capture Date picker",
      "Attach Media button",
      "Publish Memory Button"
    ],
    formValidation: {
      fields: [
        { name: "title", type: "text", required: true, limits: "1-120 characters", errorCopy: "Please provide a title for this story." },
        { name: "content", type: "textarea", required: true, limits: "1-20000 characters", errorCopy: "Story content cannot be empty." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Story Title input",
      tabOrder: ["Toolbar", "Title", "Content area", "Metadata inputs", "Publish button"],
      shortcuts: ["Cmd+B (Bold)", "Cmd+I (Italic)", "Cmd+S (Save draft)"],
      escapeBehavior: "Warns if unsaved changes exist"
    },
    statesMatrix: {
      loading: "Saving story spinner.",
      empty: "Title and content placeholders encouraging heartfelt writing.",
      populated: "Typographically styled text with pull quotes and drop caps.",
      error: "Conflict banner if edited concurrently by another family member.",
      offline: "Autosaved continuously into local IndexedDB.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Rich text story editor. Write family memories with formatting toolbar.",
      touchTargetMin: "44x44 px for toolbar buttons",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Mobile keyboard toolbar above virtual keyboard, full width editor.",
      tablet: "Centered 680px editor canvas.",
      desktop: "Centered 780px distraction-free canvas with right-hand metadata drawer."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/memories",
      authType: "Bearer JWT",
      requestBody: "{ spaceId: string, title: string, content: string, format: 'story', capturedAt: string, associatedProfileIds?: string[], tags?: string[] }",
      responseBody: "{ success: true, data: { memory: Memory } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "memory_profiles", "memory_tags"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.created"],
      bullmqJobs: ["index-memory-search"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Personal family writings protected by space authorization."
    },
    testCriteria: {
      unit: ["sanitizes HTML input preventing XSS attacks", "autosaves to localStorage every 5 seconds"],
      integration: ["POST /api/memories stores story content and relations in transaction"],
      e2e: ["types story with bold text, adds capture date, clicks Publish, verifies rendered detail"]
    },
    uiComponents: ["RichTextEditor", "EditorToolbar", "MetadataDrawer", "AutosaveBadge", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-47",
    category: "Web & PWA — Archive & Media",
    name: "Archival Document Viewer & OCR Inspector",
    userGoal: "Inspect scanned historical documents, letters, postcards, and certificates alongside extracted OCR text.",
    userStory: "As an archivist, I want to inspect a scanned 1918 birth certificate and view the machine OCR text side-by-side with confidence scores.",
    entryExitRoutes: {
      entry: ["/memories/:memoryId/document/:mediaId", "/memories/:memoryId"],
      exit: ["/memories/:memoryId", "/spaces/:spaceId/archive"],
      back: "/memories/:memoryId",
      deepLink: "https://memoria.local/memories/:memoryId/document/:mediaId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_document", "edit_ocr (Contributor+)"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Document title, page counter ('Page 1 of 4'), Download Original PDF/Image button, Close button.",
      main: "Two-panel split view: Left panel: High-resolution zoomable scanned document page. Right panel: Extracted OCR text with editable corrections, confidence score badge (e.g. 'OCR Confidence: 94%'), copy text button.",
      footer: "Page navigation chevrons and zoom HUD."
    },
    exactControls: [
      "Previous Page Button",
      "Next Page Button",
      "Zoom In / Out buttons",
      "Copy Extracted Text button",
      "Edit OCR text trigger button",
      "Download Archival PDF button"
    ],
    keyboardFocus: {
      initialFocus: "Document canvas",
      tabOrder: ["Page chevrons", "Zoom controls", "Copy text button", "OCR text area"],
      shortcuts: ["ArrowRight (Next page)", "ArrowLeft (Prev page)", "Cmd+C (Copy text)"],
      escapeBehavior: "Closes viewer"
    },
    statesMatrix: {
      loading: "Rendering PDF canvas and loading OCR text skeleton.",
      empty: "Notice: 'No OCR text extracted yet. OCR processing is running in background.'",
      populated: "Side-by-side archival scan and searchable digitized text.",
      error: "Error banner if document fails to rasterize.",
      offline: "Cached document pages available offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Document viewer showing scanned historical document with synchronized OCR text transcription.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Tabbed view: Document tab and OCR Text tab.",
      tablet: "Stacked view: Document top, OCR text bottom.",
      desktop: "Side-by-side 50/50 split view with adjustable splitter divider."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/media/:mediaId/ocr",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { text: string, confidence: number, pages: Array<{ pageNumber: number, text: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["document.ocr_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "OCR text derived and indexed locally via Tesseract engine."
    },
    testCriteria: {
      unit: ["renders multipage navigation", "allows correcting OCR text and updates search index"],
      integration: ["GET /api/media/:mediaId/ocr returns structured page OCR payload"],
      e2e: ["navigates document pages, copies OCR text to clipboard, confirms feedback toast"]
    },
    uiComponents: ["DocumentCanvas", "OCRSplitView", "PageNavigator", "ConfidenceBadge"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-48",
    category: "Web & PWA — Archive & Media",
    name: "Trash, Soft-Deleted Memories & 30-Day Recovery View",
    userGoal: "Review soft-deleted memories, restore accidentally deleted items, or confirm permanent deletion.",
    userStory: "As an archivist, I want to review memories deleted in the last 30 days and restore a photo that was removed by mistake.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/trash", "/spaces/:spaceId/settings"],
      exit: ["/spaces/:spaceId/archive", "/spaces/:spaceId"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/trash"
    },
    personasPermissions: {
      roles: ["Space Member (Owner / Editor)"],
      capabilities: ["restore_memory", "permanent_delete_memory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Archival Trash' with notice: 'Items here are preserved for 30 days before permanent purging.', 'Empty Trash' button.",
      main: "Grid of deleted memory cards: Thumbnail with soft red tint, Title, Deletion timestamp, Days remaining countdown (e.g. '18 days left to recover'), 'Restore' button, 'Delete Permanently' button.",
      footer: "Recovery summary note."
    },
    exactControls: [
      "Button: 'Restore Memory' (returns memory to archive)",
      "Button: 'Delete Permanently' (opens confirmation modal)",
      "Button: 'Empty Trash' (requires owner confirmation)",
      "Select all checkbox for bulk restoration"
    ],
    keyboardFocus: {
      initialFocus: "First restore button",
      tabOrder: ["Empty Trash button", "Deleted item cards", "Restore buttons", "Permanent delete buttons"],
      escapeBehavior: "Closes confirmation dialogs"
    },
    statesMatrix: {
      loading: "Trash grid skeleton pulse.",
      empty: "Clean message: 'Trash is empty. No deleted memories.'",
      populated: "Grid of deleted memories with clear recovery deadlines.",
      error: "Error banner with refresh button.",
      offline: "Offline indicator; restoration requires connection.",
      permissionDenied: "403 Forbidden: Only space owners and editors can manage trash."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Trash and recovery view. Shows soft-deleted memories and recovery deadlines.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column list with Restore and Delete buttons.",
      tablet: "Two-column grid.",
      desktop: "Three-column grid with hover action triggers."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/memories/:memoryId/restore",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { memoryId: string, status: 'active' } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.restored", "memory.permanently_deleted"],
      bullmqJobs: ["purge-expired-trash"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Permanent deletion verifies zero book spread references before removing files."
    },
    testCriteria: {
      unit: ["enforces 30-day retention countdown", "prevents non-owners from permanent deletion"],
      integration: ["POST /api/memories/:memoryId/restore clears deleted_at timestamp"],
      e2e: ["restores memory from trash, verifies it reappears in main archive grid"]
    },
    uiComponents: ["TrashGrid", "DeletedMemoryCard", "CountdownBadge", "ConfirmDialog", "Button"],
    verifiedStatus: "Implemented & Verified"
  },

  // ==========================================
  // 1.5 COLLABORATION & SHARING (PWA-49 to PWA-55)
  // ==========================================
  {
    id: "PWA-49",
    category: "Web & PWA — Collaboration",
    name: "Outbound Invitation Management View",
    userGoal: "Track pending invitation links, inspect expiration dates, resend invites, or revoke access.",
    userStory: "As a space owner, I want to see which family members have not yet accepted their invitations and resend them.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/invitations", "/spaces/:spaceId/members"],
      exit: ["/spaces/:spaceId/members", "/spaces/:spaceId"],
      back: "/spaces/:spaceId/members",
      deepLink: "https://memoria.local/spaces/:spaceId/invitations"
    },
    personasPermissions: {
      roles: ["Space Owner", "Space Editor"],
      capabilities: ["manage_invitations"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Pending Space Invitations' with '+ Send New Invite' button.",
      main: "Table of invitations: Recipient Email, Role Assigned (Editor, Contributor, Viewer), Sent Date, Expiration Date, Status badge (Pending, Expired, Revoked), Resend button, Revoke button.",
      footer: "Active sharable invite links section with copy button."
    },
    exactControls: [
      "Button: '+ Send New Invite'",
      "Button: 'Resend Invitation' (with 60s cooldown)",
      "Destructive Button: 'Revoke Invitation'",
      "Button: 'Copy Sharable Link'"
    ],
    keyboardFocus: {
      initialFocus: "Send New Invite button",
      tabOrder: ["New invite button", "Table rows", "Resend buttons", "Revoke buttons"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Table skeleton pulse.",
      empty: "Notice: 'No pending invitations. All invited members have joined.'",
      populated: "Clear tabular view with amber 'Pending' badges and expiration counters.",
      error: "Error banner with refresh button.",
      offline: "Cached invitations view.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Outbound invitation manager. Shows pending invitations with resend and revoke options.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list format with kebab action menus.",
      tablet: "Table view with simplified columns.",
      desktop: "Full width table with direct inline actions."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/invitations",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { invitations: Array<{ id: string, email: string, role: string, expiresAt: string, status: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service / memory-service",
      databaseTables: ["space_invitations"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.invitation_revoked", "collab.invitation_resent"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Invitation tokens cryptographically signed and salted."
    },
    testCriteria: {
      unit: ["disables resend button during active cooldown", "marks status expired after deadline"],
      integration: ["DELETE /api/spaces/:spaceId/invitations/:id revokes invitation token"],
      e2e: ["revokes pending invite, verifies status updates to Revoked immediately"]
    },
    uiComponents: ["InvitationTable", "StatusBadge", "CopyLinkButton", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-50",
    category: "Web & PWA — Collaboration",
    name: "Member Access Management & Capability Matrix",
    userGoal: "Inspect and toggle fine-grained capabilities for space members (e.g. Can Upload, Can Edit Stories, Can Order Books, Can Invite Others).",
    userStory: "As an archivist, I want to allow my cousin to contribute photos but restrict her from ordering printed books or deleting memories.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/permissions", "/spaces/:spaceId/members"],
      exit: ["/spaces/:spaceId/members", "/spaces/:spaceId"],
      back: "/spaces/:spaceId/members",
      deepLink: "https://memoria.local/spaces/:spaceId/permissions"
    },
    personasPermissions: {
      roles: ["Space Owner"],
      capabilities: ["manage_permissions"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Member Capabilities & Permissions' with 'Reset to Defaults' button.",
      main: "Permission Matrix Table: Columns for roles (Owner, Editor, Contributor, Viewer). Rows for capabilities (Upload Media, Edit Memories, Delete Memories, Create Books, Place Print Orders, Invite Members, Manage Settings). Checkbox toggles in each cell.",
      footer: "Save Permissions Button."
    },
    exactControls: [
      "Capability toggle checkboxes",
      "Button: 'Reset Role Defaults'",
      "Save Permissions Button",
      "Cancel Button"
    ],
    keyboardFocus: {
      initialFocus: "First editable checkbox",
      tabOrder: ["Reset button", "Matrix checkboxes", "Save button"],
      escapeBehavior: "Warns if dirty before leaving"
    },
    statesMatrix: {
      loading: "Matrix loading skeleton.",
      empty: "N/A",
      populated: "Interactive grid with checked and locked boxes (Owner permissions permanently locked).",
      error: "Error banner with reload button.",
      offline: "Permission editing disabled offline.",
      permissionDenied: "403 Forbidden screen: Only Space Owners can configure role matrices."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Member permissions matrix table. Toggle specific capabilities for each space role.",
      touchTargetMin: "44x44 px for checkboxes",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Accordion by role with toggle switches.",
      tablet: "Scrollable capability table.",
      desktop: "Clean tabular matrix with clear visual distinction between locked and customizable capabilities."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/spaces/:spaceId/permissions",
      authType: "Bearer JWT",
      requestBody: "{ matrix: Record<string, string[]> }",
      responseBody: "{ success: true, data: { updated: boolean } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["space_members", "audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.permissions_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Changes to space capabilities are recorded in audit logs."
    },
    testCriteria: {
      unit: ["prevents unchecking Owner master permissions", "validates capability strings"],
      integration: ["PUT /api/spaces/:spaceId/permissions updates permissions and enforces instantly"],
      e2e: ["toggles Contributor print permission off, clicks Save, verifies updated state"]
    },
    uiComponents: ["PermissionMatrix", "CheckboxToggle", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-51",
    category: "Web & PWA — Collaboration",
    name: "Custom Role & Permission Editor",
    userGoal: "Define custom space roles (e.g. 'Family Historian', 'Guest Storyteller') with tailored capability sets.",
    userStory: "As a space owner, I want to create a custom role called 'Junior Contributor' that can upload photos but needs owner approval to publish.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/roles/new", "/spaces/:spaceId/permissions"],
      exit: ["/spaces/:spaceId/permissions", "/spaces/:spaceId/members"],
      back: "/spaces/:spaceId/permissions",
      deepLink: "https://memoria.local/spaces/:spaceId/roles/new"
    },
    personasPermissions: {
      roles: ["Space Owner"],
      capabilities: ["create_custom_role"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title: 'Create Custom Role' with role name and description fields.",
      main: "Categorized capability checklist: 1. Media & Memories, 2. Books & Authoring, 3. Collaboration & Comments, 4. Publishing & Export.",
      footer: "Cancel and 'Create Role' buttons."
    },
    exactControls: [
      "Role Name input field",
      "Role Description textarea",
      "Capability toggle checkboxes",
      "Submit Button: 'Create Custom Role'"
    ],
    formValidation: {
      fields: [
        { name: "roleName", type: "text", required: true, limits: "2-40 characters", errorCopy: "Role name is required." },
        { name: "capabilities", type: "array", required: true, errorCopy: "Please select at least one capability." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Role Name input",
      tabOrder: ["Role Name", "Description", "Checkboxes", "Submit button"],
      escapeBehavior: "Prompts if dirty"
    },
    statesMatrix: {
      loading: "Saving role spinner.",
      empty: "Blank form with capability checkboxes.",
      populated: "Filled form ready for submission.",
      error: "Validation error banner.",
      offline: "Disabled offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Custom role creation form with name and capability toggles.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width form.",
      tablet: "Centered 560px card.",
      desktop: "Centered 680px card."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/roles",
      authType: "Bearer JWT",
      requestBody: "{ name: string, description?: string, capabilities: string[] }",
      responseBody: "{ success: true, data: { roleId: string, name: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.custom_role_created"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Role changes audited."
    },
    testCriteria: {
      unit: ["requires non-empty role name and at least 1 capability"],
      integration: ["POST /api/spaces/:spaceId/roles stores role"],
      e2e: ["creates 'Guest Historian' role, verifies it appears in member role selector"]
    },
    uiComponents: ["RoleForm", "CapabilityChecklist", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-52",
    category: "Web & PWA — Collaboration",
    name: "Public / Restricted Sharing Settings & Passphrase Protection",
    userGoal: "Configure external sharing links for memory stories or books with optional passphrase and expiration dates.",
    userStory: "As an archivist, I want to create a passphrase-protected share link for our 50th anniversary book so distant relatives can view it without registering.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/sharing", "/books/:bookId/share", "/memories/:memoryId/share"],
      exit: ["/spaces/:spaceId", "/books/:bookId"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/sharing"
    },
    personasPermissions: {
      roles: ["Space Owner", "Space Editor"],
      capabilities: ["manage_sharing"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title: 'Share Living Archive' with link status toggle (Disabled / Active).",
      main: "1. Generated sharable URL with Copy button, 2. Access scope selector (Entire Space, Selected Books, Curated Collection), 3. Passphrase protection input (optional), 4. Expiration date picker (7 days, 30 days, 1 year, Never), 5. Active guest access logs.",
      footer: "'Revoke All Links' and 'Save Sharing Settings' buttons."
    },
    exactControls: [
      "Share link active toggle switch",
      "Copy Link Button",
      "Passphrase input field (with generate random passphrase button)",
      "Expiration dropdown",
      "Revoke All Links Button"
    ],
    formValidation: {
      fields: [
        { name: "passphrase", type: "text", required: false, limits: "Min 6 chars if provided" }
      ]
    },
    keyboardFocus: {
      initialFocus: "Share toggle switch",
      tabOrder: ["Toggle", "Copy link", "Passphrase input", "Expiration dropdown", "Save button", "Revoke button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Saving sharing configuration spinner.",
      empty: "Sharing disabled state with explanation.",
      populated: "Active secure link with QR code generator preview.",
      error: "Error banner with refresh button.",
      offline: "Sharing changes disabled offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Sharing settings. Generate secure links with optional passphrase and expiration.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical controls with large Copy Link button.",
      tablet: "Centered 560px card.",
      desktop: "Centered 640px card with QR code display."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/share-link",
      authType: "Bearer JWT",
      requestBody: "{ enabled: boolean, passphrase?: string, expiresAt?: string }",
      responseBody: "{ success: true, data: { shareUrl: string, expiresAt: string, hasPassphrase: boolean } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memory_spaces", "audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.share_link_generated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Passphrases hashed using Argon2id; links use cryptographically random 256-bit tokens."
    },
    testCriteria: {
      unit: ["verifies minimum passphrase length when enabled", "generates valid QR code data"],
      integration: ["POST /api/spaces/:spaceId/share-link creates token"],
      e2e: ["generates link with passphrase, copies to clipboard, tests guest access"]
    },
    uiComponents: ["ShareSettingsCard", "CopyLinkButton", "QRCodePreview", "PassphraseInput"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-53",
    category: "Web & PWA — Collaboration",
    name: "Space Activity & Contribution Live Stream",
    userGoal: "Follow recent family additions, story edits, comments, and book drafts in an observable activity feed.",
    userStory: "As an archivist, I want to see what my sister uploaded yesterday so I can review her new photographs.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/activity", "/spaces/:spaceId"],
      exit: ["/memories/:memoryId", "/spaces/:spaceId"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/activity"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_activity"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Space Activity Stream' with date filter and contributor filter.",
      main: "Chronological stream of activity cards: Actor avatar, Action description (e.g. 'Sarah added 8 photos to Liam Year 1', 'David commented on Summer Vacation 1984'), Timestamp, Entity thumbnail preview, Deep link to item.",
      footer: "End of recent activity marker."
    },
    exactControls: [
      "Activity item card click (deep links to affected memory or book)",
      "Filter by contributor dropdown",
      "Filter by event type (Uploads, Edits, Comments, Books)"
    ],
    keyboardFocus: {
      initialFocus: "First activity item",
      tabOrder: ["Filters", "Activity cards"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Activity stream skeleton pulse.",
      empty: "Notice: 'No recent activity recorded in this space.'",
      populated: "Real-time stream with actor attribution and clean typography.",
      error: "Error banner with refresh button.",
      offline: "Cached activity rendered offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Space activity stream. Recent contributions and edits by family members.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column list with compact avatars.",
      tablet: "Centered 600px stream.",
      desktop: "Centered 720px stream with inline photographic thumbnails."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/activity",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { items: Array<{ id: string, actorName: string, action: string, entityType: string, timestamp: string, entityUrl: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["audit_logs"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: false,
      privacyNotes: "Activity feed strictly scoped to space boundaries."
    },
    testCriteria: {
      unit: ["formats relative timestamps (e.g. '2 hours ago', 'Yesterday at 4:15 PM')", "filters by actor"],
      integration: ["GET /api/spaces/:spaceId/activity returns events for space"],
      e2e: ["views stream, filters by 'Uploads', clicks on activity item to open memory"]
    },
    uiComponents: ["ActivityStream", "ActivityItem", "FilterBar"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-54",
    category: "Web & PWA — Collaboration",
    name: "Memory Change History & Version Attribution Detail",
    userGoal: "Inspect the audit trail of modifications made to a memory story or metadata, and compare revisions side-by-side.",
    userStory: "As an archivist, I want to compare revisions of a story to see what date correction was made and by whom.",
    entryExitRoutes: {
      entry: ["/memories/:memoryId/history", "/memories/:memoryId"],
      exit: ["/memories/:memoryId", "/spaces/:spaceId/archive"],
      back: "/memories/:memoryId",
      deepLink: "https://memoria.local/memories/:memoryId/history"
    },
    personasPermissions: {
      roles: ["Space Member (Editor+)"],
      capabilities: ["view_history", "restore_revision"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title: 'Version History' with current revision badge (v3) and back button.",
      main: "Split comparison view: Left: Revision list (v1, v2, v3 with author name and timestamp). Right: Visual diff highlighting added text in functional sage green (#5F735E) and removed text with strike-through.",
      footer: "'Restore This Revision' button."
    },
    exactControls: [
      "Revision selector pills",
      "Side-by-side vs Inline Diff toggle",
      "Button: 'Restore Revision as New Draft'",
      "Close Button"
    ],
    keyboardFocus: {
      initialFocus: "Revision selector",
      tabOrder: ["Revisions", "Diff toggle", "Restore button", "Close"],
      escapeBehavior: "Returns to memory detail"
    },
    statesMatrix: {
      loading: "Revision list skeleton pulse.",
      empty: "Notice: 'This memory has not been modified since original creation.'",
      populated: "Clear diff view with green/red syntax highlighting for textual alterations.",
      error: "Error banner with reload button.",
      offline: "Offline indicator.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Memory change history. Compare text revisions with author attribution.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Inline diff view with red/green highlights.",
      tablet: "Side-by-side diff with scroll synchronization.",
      desktop: "Side-by-side diff max-width 1000px."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/memories/:memoryId/history",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { versions: Array<{ version: number, authorName: string, title: string, content: string, updatedAt: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "audit_logs"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["memory.history_inspected"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Immutable history records prevent silent alteration of family accounts."
    },
    testCriteria: {
      unit: ["computes text differences correctly", "restores selected revision without rewriting history"],
      integration: ["GET /api/memories/:memoryId/history returns audit records"],
      e2e: ["selects revision v1, verifies diff highlights, clicks Restore"]
    },
    uiComponents: ["RevisionList", "DiffViewer", "RestoreButton"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-55",
    category: "Web & PWA — Collaboration",
    name: "Dedicated Discussion Threads & Memory Annotation Panel",
    userGoal: "Engage in family conversations and add annotations on specific photographs or memory moments.",
    userStory: "As a family member, I want to comment 'Is that Uncle Joe on the far left?' so my aunt can clarify the identification.",
    entryExitRoutes: {
      entry: ["/memories/:memoryId#discussions", "/memories/:memoryId"],
      exit: ["/memories/:memoryId", "/dashboard"],
      back: "/memories/:memoryId",
      deepLink: "https://memoria.local/memories/:memoryId#discussions"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_comments", "post_comment", "delete_own_comment"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Family Discussions' with comment counter and real-time active contributor avatars.",
      main: "Threaded comment list: Contributor avatar, Name, Timestamp, Comment message body, Reply button, Emoji reactions strip (Heart, Clapping, Teary, Folded Hands), Delete comment button (for comment author or owner).",
      footer: "Rich comment input box with '@mention' person support, emoji picker, and Send button."
    },
    exactControls: [
      "Comment input field (auto-expanding textarea)",
      "Button: 'Post Comment'",
      "Reply button on comment",
      "Emoji reaction buttons (Heart, Hug, Laugh, Star)",
      "Delete comment button"
    ],
    formValidation: {
      fields: [
        { name: "message", type: "textarea", required: true, limits: "1-1000 characters", errorCopy: "Please write a comment." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Comment textarea",
      tabOrder: ["Comment input", "Send button", "Comment rows", "Reply buttons"],
      shortcuts: ["Cmd+Enter (Submit comment)"],
      escapeBehavior: "Cancels reply"
    },
    statesMatrix: {
      loading: "Comment thread skeleton pulse.",
      empty: "Notice: 'No comments yet. Start the conversation about this memory.'",
      populated: "Threaded conversation with warm avatars and emoji reaction counts.",
      error: "Error banner with retry button.",
      offline: "Queued in local outbox for delivery when reconnected.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Discussion thread with comments and reactions.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Bottom sticky comment box, stacked thread.",
      tablet: "Right-hand drawer (400px width).",
      desktop: "Integrated side discussion panel alongside memory details."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/memories/:memoryId/comments",
      authType: "Bearer JWT",
      requestBody: "{ message: string, parentCommentId?: string }",
      responseBody: "{ success: true, data: { commentId: string, createdAt: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.comment_added"],
      bullmqJobs: ["notify-space-contributors"]
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: true,
      privacyNotes: "Comments strictly private to space contributors."
    },
    testCriteria: {
      unit: ["submits comment with Cmd+Enter", "increments reaction count idempotently"],
      integration: ["POST /api/memories/:memoryId/comments creates comment and triggers outbox"],
      e2e: ["posts comment, verifies immediate insertion in thread, adds reaction"]
    },
    uiComponents: ["DiscussionThread", "CommentItem", "ReactionStrip", "CommentInput"],
    verifiedStatus: "Implemented & Verified"
  }
];

