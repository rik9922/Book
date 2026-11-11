import { ScreenSpec } from "./types.js";

export const pwaScreens3: ScreenSpec[] = [
  // ==========================================
  // 1.6 BOOK CREATION & 3D STUDIO (PWA-56 to PWA-70)
  // ==========================================
  {
    id: "PWA-56",
    category: "Web & PWA — Books & 3D Studio",
    name: "Digital Bookshelf Library & Miniature Covers",
    userGoal: "Browse published and draft heirloom books displayed on an archival wooden digital bookshelf with 3D miniature covers.",
    userStory: "As an archivist, I want to see our family's printed and draft volumes resting on a digital library shelf so I can choose a book to read or edit.",
    entryExitRoutes: {
      entry: ["/bookshelf", "/dashboard", "/spaces/:spaceId/books"],
      exit: ["/books/:bookId", "/books/new", "/sample-book"],
      back: "/dashboard",
      deepLink: "https://memoria.local/bookshelf"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_bookshelf"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Bookshelf title: 'Heirloom Library' with '+ Create New Book' button and format filter.",
      main: "Interactive Bookshelf View: Wooden archival shelves (Walnut #3A2E26) displaying upright 3D books with spine titles in gold foil, leather cover colors, and page count ribbons.",
      footer: "Library statistics: Total volumes, total printed pages, archival status."
    },
    exactControls: [
      "Button: '+ Create New Heirloom Book'",
      "Book spine / cover click (pulls book forward and opens Book Overview PWA-57)",
      "2D Grid vs 3D Shelf view mode toggle button",
      "Filter by Space dropdown"
    ],
    keyboardFocus: {
      initialFocus: "First book on top shelf",
      tabOrder: ["Create Book button", "Filter dropdown", "Shelf books"],
      shortcuts: ["ArrowRight (Next book)", "ArrowLeft (Prev book)", "Enter (Open book)"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Bookshelf wood texture loads with pulsing silhouette book spines.",
      empty: "Notice: 'Your heirloom library is empty. Craft your first memory book today.'",
      populated: "Rich Three.js / CSS 3D shelf with realistic leather materials and gold spine debossing.",
      error: "Error banner with refresh button.",
      offline: "Cached shelf rendered from IndexedDB.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Digital bookshelf with 3D interactive book covers. Select a volume to inspect.",
      touchTargetMin: "48x48 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Horizontal scrolling book carousel with touch swipe; 2D fallback button.",
      tablet: "Two-shelf 3D display.",
      desktop: "Three-shelf interactive library with depth of field and gentle mouse parallax."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/books",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { books: Array<BookDocument & { pageCount: number, coverThumbnailUrl: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["bookshelf.viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Only books within authorized spaces are rendered."
    },
    testCriteria: {
      unit: ["renders books upright on shelves", "toggles between 3D and 2D grid"],
      integration: ["GET /api/books returns user's space books"],
      e2e: ["navigates to bookshelf, clicks volume spine, opens Book Overview"]
    },
    uiComponents: ["BookshelfStage", "BookSpineItem", "ShelfControls", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-57",
    category: "Web & PWA — Books & 3D Studio",
    name: "Book Overview, Edition Details & Contributor List",
    userGoal: "Review a book's edition status, cover title, physical dimensions, page count, contributors, and launch editor or reader.",
    userStory: "As an archivist, I want to inspect a book's status (Draft / Frozen for Print), view all contributors, and launch the 3D Reader.",
    entryExitRoutes: {
      entry: ["/books/:bookId", "/bookshelf"],
      exit: ["/books/:bookId/editor", "/books/:bookId/reader", "/books/:bookId/preflight", "/books/:bookId/order"],
      back: "/bookshelf",
      deepLink: "https://memoria.local/books/:bookId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_book", "edit_book (Contributor+)", "print_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Book title in Cormorant Garamond, subtitle, edition badge ('Edition 1 · Draft' or 'Edition 2 · Frozen for Print').",
      main: "1. 3D Cover preview with foil stamping, 2. Specifications card (Dimensions 8x10 Standard, Pages: 48, Binding: Fine Leather Forest), 3. Contributors avatar strip, 4. Chapter breakdown list.",
      footer: "Action bar: 'Read in 3D' button, 'Edit Spreads' button, 'Preflight Inspection' button, 'Order Hardcover' button."
    },
    exactControls: [
      "Primary Button: 'Open 3D Reader' (PWA-68)",
      "Secondary Button: 'Open 2D Spread Editor' (PWA-64)",
      "Button: 'Preflight Print Check' (PWA-69)",
      "Button: 'Order Fine-Art Hardcover' (PWA-71)",
      "Delete Draft Book button (Owner only)"
    ],
    keyboardFocus: {
      initialFocus: "Open 3D Reader button",
      tabOrder: ["Action buttons", "Specification items", "Chapter list"],
      escapeBehavior: "Returns to bookshelf"
    },
    statesMatrix: {
      loading: "Book overview skeleton pulse.",
      empty: "N/A",
      populated: "Detailed edition summary with foil debossed cover badge and action triggers.",
      error: "Book not found error banner.",
      offline: "Cached book metadata displayed offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Book overview: The Vance Family Chronicle. 48 pages, standard 8x10 hardcover. Options to read or edit.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked view: cover top, specifications middle, action bar fixed at bottom.",
      tablet: "Two-column layout (Cover left 40%, Specs & actions right 60%).",
      desktop: "Max-width 1100px layout with high-resolution 3D cover tilt."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/books/:bookId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { book: BookDocument, pageCount: number, contributors: Array<UserProfile>, printStatus: string } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads", "users"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["book.overview_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Restricted to authorized space members."
    },
    testCriteria: {
      unit: ["formats book dimensions accurately based on format code", "disables edit buttons if frozen for print"],
      integration: ["GET /api/books/:bookId returns complete document schema"],
      e2e: ["navigates from bookshelf to book overview, clicks 'Open 3D Reader'"]
    },
    uiComponents: ["BookOverviewCard", "CoverFoilPreview", "SpecList", "ActionBar", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-58",
    category: "Web & PWA — Books & 3D Studio",
    name: "Create-Book Wizard: Format, Dimensions & Purpose",
    userGoal: "Configure a new book's title, trim dimensions (8x8, 8x10, 12x12), and archival purpose.",
    userStory: "As an archivist, I want to start authoring an 8x10 hardcover book for our family heritage so I can begin selecting memories.",
    entryExitRoutes: {
      entry: ["/books/new", "/bookshelf"],
      exit: ["/books/new/source", "/bookshelf"],
      back: "/bookshelf",
      deepLink: "https://memoria.local/books/new"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["create_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 1 of 5; title 'Craft an Heirloom Memory Book'.",
      main: "1. Book Title & Subtitle inputs, 2. Physical Trim Format selector cards: Square 8x8 (Intimate milestones), Standard 8x10 (Classic family history), Grand 12x12 (Fine-art heirloom), 3. Purpose tags (Heritage, Wedding, Memorial, Travel).",
      footer: "Cancel and 'Continue to Memory Selection' buttons."
    },
    exactControls: [
      "Title input field",
      "Subtitle input field",
      "Format selector radio cards (8x8, 8x10, 12x12)",
      "Continue Button",
      "Cancel Button"
    ],
    formValidation: {
      fields: [
        { name: "title", type: "text", required: true, limits: "1-120 characters", errorCopy: "Please enter a book title." },
        { name: "format", type: "radio", required: true, errorCopy: "Please select a book trim format." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Book Title input",
      tabOrder: ["Title", "Subtitle", "Format cards", "Continue button", "Cancel button"],
      escapeBehavior: "Prompts if dirty"
    },
    statesMatrix: {
      loading: "Initializing draft book spinner.",
      empty: "Fresh form with 8x10 pre-selected as recommended.",
      populated: "Valid book details entered.",
      error: "Validation error alert.",
      offline: "Draft stored in IndexedDB.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Create book wizard step 1. Select book dimensions and title.",
      touchTargetMin: "48x48 px format cards",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Vertical stack of format cards.",
      tablet: "3-column format comparison.",
      desktop: "Centered 840px container with 3D trim proportion illustrations."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/books/drafts",
      authType: "Bearer JWT",
      requestBody: "{ spaceId: string, title: string, subtitle?: string, format: BookFormat }",
      responseBody: "{ success: true, data: { draftBookId: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.draft_initialized"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Draft book initialized under user space."
    },
    testCriteria: {
      unit: ["validates BookFormatSchema enum values", "generates initial default spread structure"],
      integration: ["POST /api/books/drafts inserts draft record in database"],
      e2e: ["fills title 'The Morrison Chronicle', selects 8x10, clicks Continue"]
    },
    uiComponents: ["BookWizardHeader", "FormatSelectorCard", "InputField", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-59",
    category: "Web & PWA — Books & 3D Studio",
    name: "Source Space & Profile Selector",
    userGoal: "Select which memory space and profiles will provide content for the book.",
    userStory: "As an archivist, I want to select our family space and filter by grandmother's profile so only memories involving her are pulled into the book draft.",
    entryExitRoutes: {
      entry: ["/books/new/source", "/books/new"],
      exit: ["/books/new/curate", "/books/new"],
      back: "/books/new",
      deepLink: "https://memoria.local/books/new/source"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["create_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 2 of 5; title 'Select Sources & People'.",
      main: "1. Memory Space dropdown, 2. People Multi-Select Pills (All, or specific family profiles), 3. Date Range filter (From year to year).",
      footer: "Back button and 'Continue to Memory Curation' button."
    },
    exactControls: [
      "Space selector dropdown",
      "Profile multi-select chips",
      "Date range sliders",
      "Continue Button"
    ],
    keyboardFocus: {
      initialFocus: "Space selector dropdown",
      tabOrder: ["Space dropdown", "Profile chips", "Date sliders", "Continue button"],
      escapeBehavior: "Returns to step 1"
    },
    statesMatrix: {
      loading: "Loading spaces and profiles skeleton.",
      empty: "N/A",
      populated: "Active space selected with matching profile avatars.",
      error: "Error banner with refresh button.",
      offline: "Offline indicator.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Step 2. Select memory spaces and people profiles to include in this volume.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Vertical stack.",
      tablet: "Centered 600px form.",
      desktop: "Centered 720px card."
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/books/drafts/:draftBookId/sources",
      authType: "Bearer JWT",
      requestBody: "{ spaceId: string, profileIds?: string[], dateRange?: { start: string, end: string } }",
      responseBody: "{ success: true, data: { candidateMemoryCount: number } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Sourcing verified against membership."
    },
    testCriteria: {
      unit: ["filters memory pool based on profileIds", "updates candidate count"],
      integration: ["PATCH /api/books/drafts/:id/sources updates draft"],
      e2e: ["selects 2 profiles, verifies candidate memory counter updates"]
    },
    uiComponents: ["SourceSelector", "ProfileChipGroup", "DateRangeSlider", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "PWA-60",
    category: "Web & PWA — Books & 3D Studio",
    name: "Memory Curation & Chronologic Grouping",
    userGoal: "Review candidate memories, select/deselect items, and group them chronologically for book compilation.",
    userStory: "As an archivist, I want to select 45 best photos from 120 candidates and automatically organize them by capture year.",
    entryExitRoutes: {
      entry: ["/books/new/curate", "/books/new/source"],
      exit: ["/books/new/chapters", "/books/new/source"],
      back: "/books/new/source",
      deepLink: "https://memoria.local/books/new/curate"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["create_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 3 of 5; title 'Curate Memories for this Book' with selected counter ('42 memories selected · Est. 32 pages').",
      main: "Chronological candidate grid: Grouped by year/month, multi-select checkboxes on each memory card, 'Select All in Year' shortcuts.",
      footer: "Selection count summary, 'Auto-Layout Pages' button, and 'Continue to Chapters' button."
    },
    exactControls: [
      "Select all / deselect all button",
      "Memory card click (toggles selection)",
      "Filter by Favorite button",
      "Primary Button: 'Continue to Chapters'"
    ],
    keyboardFocus: {
      initialFocus: "First memory card",
      tabOrder: ["Select All button", "Filter button", "Candidate cards", "Continue button"],
      shortcuts: ["Space (Toggle focused card selection)"],
      escapeBehavior: "Returns to step 2"
    },
    statesMatrix: {
      loading: "Candidate memory grid skeleton.",
      empty: "Notice: 'No memories match selected source criteria.'",
      populated: "Grid of photos with green checkmark selection badges.",
      error: "Error banner with refresh button.",
      offline: "Local candidates available offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Memory curation grid. Select memories to include in the book.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "2-column grid with tap selection.",
      tablet: "3-column grid.",
      desktop: "4-column grid with estimated page count sticky header."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/books/drafts/:draftBookId/curate",
      authType: "Bearer JWT",
      requestBody: "{ selectedMemoryIds: string[] }",
      responseBody: "{ success: true, data: { spreadCount: number } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.memories_curated"],
      bullmqJobs: ["generate-auto-spreads"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Curated selections persisted in book document."
    },
    testCriteria: {
      unit: ["estimates page count dynamically from memory count and layout defaults", "selects all in year"],
      integration: ["POST /api/books/drafts/:id/curate stores memory links in spreads"],
      e2e: ["selects 10 memories, verifies estimated page count is 8, continues"]
    },
    uiComponents: ["CurationGrid", "SelectionBadge", "PageEstimator", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-61",
    category: "Web & PWA — Books & 3D Studio",
    name: "Chapter & Section Structure Organizer",
    userGoal: "Organize memories into structured book chapters (e.g. 'Chapter 1: The Early Years', 'Chapter 2: Family Journeys').",
    userStory: "As an author, I want to create named chapters with divider title pages and reorder sections easily.",
    entryExitRoutes: {
      entry: ["/books/new/chapters", "/books/new/curate"],
      exit: ["/books/new/templates", "/books/new/curate"],
      back: "/books/new/curate",
      deepLink: "https://memoria.local/books/new/chapters"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["create_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 4 of 5; title 'Organize Book Chapters' with '+ Add Chapter' button.",
      main: "Chapter list cards with drag handles: Chapter title input, Date range badge, Memory count, Expand/collapse thumbnail drawer, Reorder handles.",
      footer: "Back button and 'Continue to Spread Layouts' button."
    },
    exactControls: [
      "Button: '+ Add Chapter'",
      "Chapter drag handles for reordering",
      "Chapter title inline text edit",
      "Delete chapter button (unassigns memories back to unassigned tray)",
      "Continue Button"
    ],
    keyboardFocus: {
      initialFocus: "First chapter title input",
      tabOrder: ["Add Chapter", "Chapter titles", "Drag handles", "Continue button"],
      escapeBehavior: "Returns to step 3"
    },
    statesMatrix: {
      loading: "Chapter list skeleton pulse.",
      empty: "Notice: 'No chapters created yet. Add chapters to divide your book into eras.'",
      populated: "Organized chapter cards with memory counts and reorderable layout.",
      error: "Error banner with refresh button.",
      offline: "Cached chapters rendered offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Chapter organizer. Reorder chapters and assign section titles.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical list with move up/down chevrons.",
      tablet: "Centered 640px list.",
      desktop: "Centered 780px list with drag-and-drop reordering."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/books/drafts/:draftBookId/chapters",
      authType: "Bearer JWT",
      requestBody: "{ chapters: Array<{ title: string, memoryIds: string[], orderIndex: number }> }",
      responseBody: "{ success: true, data: { updated: boolean } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Chapter metadata stored in book document."
    },
    testCriteria: {
      unit: ["reorders chapters correctly", "validates non-empty chapter titles"],
      integration: ["PUT /api/books/drafts/:id/chapters persists structure"],
      e2e: ["creates 'The Early Years' chapter, reorders to first position, continues"]
    },
    uiComponents: ["ChapterList", "ChapterCard", "DragHandle", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-62",
    category: "Web & PWA — Books & 3D Studio",
    name: "Template Layout Selector",
    userGoal: "Choose default typographic and layout themes (Editorial Classic, Photojournalism, Fine-Art Minimalist).",
    userStory: "As an archivist, I want to select 'Editorial Classic' so our book uses elegant serif typography, generous margins, and pull-quote spreads.",
    entryExitRoutes: {
      entry: ["/books/new/templates", "/books/new/chapters"],
      exit: ["/books/:bookId/editor", "/books/new/chapters"],
      back: "/books/new/chapters",
      deepLink: "https://memoria.local/books/new/templates"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["create_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 5 of 5; title 'Select Spread Aesthetic & Typography'.",
      main: "3 Theme Cards with sample spread previews: 1. Editorial Classic (Cormorant Garamond, subtle margins, archival captions), 2. Photo-Journal (Bold full-bleed spreads, chronological stamps), 3. Fine-Art Minimalist (Expansive white space, off-center portraits, subtle lines).",
      footer: "Finish button: 'Generate Spreads & Open Studio'."
    },
    exactControls: [
      "Theme selector cards (radio selection)",
      "Spread preview zoom popover",
      "Finish Button: 'Generate Spreads & Open Studio'"
    ],
    keyboardFocus: {
      initialFocus: "First theme card (Editorial Classic)",
      tabOrder: ["Theme cards", "Finish button"],
      escapeBehavior: "Returns to step 4"
    },
    statesMatrix: {
      loading: "Generating initial spreads spinner.",
      empty: "N/A",
      populated: "Theme cards with high-fidelity sample spread illustrations.",
      error: "Error banner with retry button.",
      offline: "Offline indicator.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Select spread aesthetic. Choose between Editorial Classic, Photo-Journal, or Fine-Art Minimalist.",
      touchTargetMin: "48x48 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column card list.",
      tablet: "3-column grid.",
      desktop: "3-column grid with spread inspection previews on hover."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/books/drafts/:draftBookId/generate-spreads",
      authType: "Bearer JWT",
      requestBody: "{ aestheticTheme: 'editorial_classic' | 'photo_journal' | 'fine_art_minimalist' }",
      responseBody: "{ success: true, data: { bookId: string, spreadCount: number } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.spreads_generated"],
      bullmqJobs: ["compile-initial-book-spreads"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Spreads generated and stored in Drizzle database."
    },
    testCriteria: {
      unit: ["applies layout rules matching chosen aesthetic theme", "initializes spread elements correctly"],
      integration: ["POST /api/books/drafts/:id/generate-spreads populates book_spreads rows"],
      e2e: ["selects Editorial Classic, clicks Generate Spreads, redirects to 2D Editor"]
    },
    uiComponents: ["ThemeCardGrid", "SpreadPreviewModal", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "PWA-63",
    category: "Web & PWA — Books & 3D Studio",
    name: "Cover Customization Studio (PBR Leather & Foil)",
    userGoal: "Customize the physical book cover: cloth/leather PBR material, foil stamping debossing, cover title, spine text, and emblem.",
    userStory: "As an archivist, I want to select Forest Green leather with gold foil debossed tree-of-life emblem and inspect real-time reflections in 3D.",
    entryExitRoutes: {
      entry: ["/books/:bookId/cover", "/books/:bookId/editor"],
      exit: ["/books/:bookId/editor", "/books/:bookId"],
      back: "/books/:bookId/editor",
      deepLink: "https://memoria.local/books/:bookId/cover"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["edit_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Top bar: 'Cover Customization Studio', Save button, Reset to Default, Close button.",
      main: "Interactive 3D Three.js Cover Canvas: Articulated 3D book cover with real-time PBR normal mapping, gold/silver foil specular highlights, and rotatable camera.",
      aside: "Cover options control panel: 1. Material (Fine Leather, Pebbled Leather, Bookcloth, Linen), 2. Cover Color swatch picker (Forest #304C43, Plum #76556F, Ink #20242C, Sage #849483), 3. Foil stamping type (Gold, Silver, Blind Emboss), 4. Cover Title & Spine Text inputs, 5. Emblem selector (Tree of Life, Archival Seal, Custom).",
      footer: "Safe-area bleed guide toggle and preflight check status."
    },
    exactControls: [
      "Material selector pills (Leather, Pebbled, Cloth, Linen)",
      "Color swatch buttons",
      "Foil selector pills (Gold, Silver, Blind Emboss)",
      "Cover Title input field",
      "Spine Text input field",
      "Emblem icon selector",
      "Save Cover Button"
    ],
    formValidation: {
      fields: [
        { name: "coverTitle", type: "text", required: true, limits: "1-60 characters", errorCopy: "Cover title is required for spine stamping." },
        { name: "spineText", type: "text", required: false, limits: "0-40 characters" }
      ]
    },
    keyboardFocus: {
      initialFocus: "Cover Title input field",
      tabOrder: ["Cover Title", "Spine Text", "Material pills", "Color swatches", "Foil pills", "Save button"],
      escapeBehavior: "Returns to editor"
    },
    statesMatrix: {
      loading: "PBR texture shader compiling spinner.",
      empty: "N/A",
      populated: "Photorealistic 3D cover with physically based roughness and bump maps.",
      error: "WebGL fallback banner.",
      offline: "Cached 3D model with offline badge.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Cover Customization Studio. Choose leather material, foil stamping, and spine text with 3D preview.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Top half 3D canvas (280px height), bottom half scrollable control drawer.",
      tablet: "Side-by-side (Canvas 60%, Controls 40%).",
      desktop: "Full studio layout with draggable 3D canvas and floating customization dock."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/books/:bookId/cover",
      authType: "Bearer JWT",
      requestBody: "{ coverColor: string, foilStamping: 'gold' | 'silver' | 'blind_emboss' | 'none', coverTitle: string, spineText?: string, materialType: string }",
      responseBody: "{ success: true, data: { book: BookDocument } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.cover_updated"],
      bullmqJobs: ["render-cover-texture-cache"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Cover parameters saved in book schema."
    },
    testCriteria: {
      unit: ["updates Three.js material uniforms when color swatch clicked", "validates spine text character limit"],
      integration: ["PUT /api/books/:bookId/cover saves cover parameters"],
      e2e: ["changes cover color to Plum, selects Gold foil, confirms 3D foil reflection, clicks Save"]
    },
    uiComponents: ["CoverCanvas", "MaterialPicker", "FoilSelector", "SpineInput", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-64",
    category: "Web & PWA — Books & 3D Studio",
    name: "2D Page & Spread Editor (5-Panel Publishing Studio)",
    userGoal: "Edit book page spreads in a professional 5-panel layout with canvas rulers, guides, bleed areas, snapping, and rich frames.",
    userStory: "As an archivist author, I want a publishing spread editor with safe margins, photo frame cropping, and text boxes to arrange our memories.",
    entryExitRoutes: {
      entry: ["/books/:bookId/editor", "/books/:bookId"],
      exit: ["/books/:bookId/reader", "/books/:bookId/proof", "/books/:bookId"],
      back: "/books/:bookId",
      deepLink: "https://memoria.local/books/:bookId/editor"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["edit_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Top Studio Bar: Book title, Current Spread indicator ('Spread 4 of 24 · Pages 6–7'), Undo/Redo buttons, Zoom selector, 'Preflight Check' button, '3D Preview' button, 'Save' indicator.",
      main: "Center Stage: High-fidelity 2D Spread Canvas (Left page + Right page) with millimeter rulers, 3mm red bleed guides, safe zone margins, magnetic snapping guides.",
      aside: "Left Panel: Asset tray (memories, photos, documents ready to drag onto canvas). Right Panel: Element Inspector (coordinates, dimensions, font size, frame fit/fill, border, opacity).",
      footer: "Bottom Strip: Horizontal thumbnail page manager strip (PWA-65) with add spread (+) button."
    },
    exactControls: [
      "Undo Button (Cmd+Z)",
      "Redo Button (Cmd+Shift+Z)",
      "Add Image Frame tool button",
      "Add Text Frame tool button",
      "Add Heading tool button",
      "Zoom In / Out / Fit buttons",
      "Page Spread Navigation chevrons (Prev, Next Spread)",
      "Open 3D Reader Button",
      "Run Preflight Button"
    ],
    keyboardFocus: {
      initialFocus: "Spread canvas stage",
      tabOrder: ["Top bar", "Left asset tray", "Canvas elements", "Right inspector", "Thumbnail strip"],
      shortcuts: ["Cmd+Z (Undo)", "Cmd+Shift+Z (Redo)", "Delete/Backspace (Delete element)", "Cmd+S (Save)"],
      escapeBehavior: "Deselects active element"
    },
    statesMatrix: {
      loading: "Canvas loading skeleton with ruler markings.",
      empty: "Blank spread with template layout placeholders.",
      populated: "Interactive spreads with high-resolution photo frames and serif text boxes.",
      error: "Error banner if spread fails to load.",
      offline: "Full spread state stored locally in IndexedDB with optimistic saves.",
      permissionDenied: "403 Forbidden: Read-only mode activated."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "2D Spread Editor. Currently editing pages 6 and 7. Use inspector to modify elements.",
      touchTargetMin: "44x44 px for toolbar actions",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Simplified single-page mobile layout with bottom drawer inspector.",
      tablet: "Collapsed side panels with tap-to-expand trays.",
      desktop: "Full 5-panel professional studio layout with draggable asset tray and inspector dock."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/books/:bookId/spreads/:spreadId",
      authType: "Bearer JWT",
      requestBody: "{ leftPage: BookPage | null, rightPage: BookPage | null }",
      responseBody: "{ success: true, data: { spread: BookSpread } }",
      statusCodes: ["200 OK", "400 Bad Request", "409 Conflict"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.spread_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Optimistic concurrency versioning prevents spread overwrites."
    },
    testCriteria: {
      unit: ["enforces 3mm bleed constraint and safe zone bounds", "executes undo/redo stack accurately"],
      integration: ["PUT /api/books/:bookId/spreads/:spreadId validates schema and saves in database"],
      e2e: ["drags image from asset tray to left page, edits caption text, clicks Save"]
    },
    uiComponents: ["SpreadStudio", "RulerCanvas", "AssetTray", "ElementInspector", "PageStrip"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-65",
    category: "Web & PWA — Books & 3D Studio",
    name: "Page Manager, Thumbnail Strip & Re-Ordering Grid",
    userGoal: "View all book spreads as a miniature thumbnail grid, reorder spreads via drag-and-drop, add/delete spreads, and inspect pagination.",
    userStory: "As an author, I want to drag Spread 12 before Spread 8 to reorganize our family vacation chapter.",
    entryExitRoutes: {
      entry: ["/books/:bookId/pages", "/books/:bookId/editor#pages"],
      exit: ["/books/:bookId/editor", "/books/:bookId"],
      back: "/books/:bookId/editor",
      deepLink: "https://memoria.local/books/:bookId/pages"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["edit_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Book Page Manager' with total spread count ('24 spreads · 48 pages'), '+ Insert Spread' button.",
      main: "Grid of Spread Thumbnails (left and right page pairs with page numbers), drag handles, duplicate spread button, delete spread button.",
      footer: "'Save New Page Sequence' button and Cancel button."
    },
    exactControls: [
      "Button: '+ Insert Blank Spread'",
      "Drag handle on thumbnail spreads",
      "Duplicate Spread button",
      "Delete Spread button (with confirmation modal)",
      "Spread thumbnail click (jumps directly to spread in editor)"
    ],
    keyboardFocus: {
      initialFocus: "First spread thumbnail",
      tabOrder: ["Insert button", "Thumbnails", "Action buttons"],
      shortcuts: ["Cmd+D (Duplicate focused spread)", "Delete (Delete focused spread)"],
      escapeBehavior: "Returns to editor"
    },
    statesMatrix: {
      loading: "Thumbnail grid skeleton pulse.",
      empty: "Notice: 'Book has no pages yet.'",
      populated: "Crisp vector-rendered miniature spreads with accurate photo placement.",
      error: "Error banner with refresh button.",
      offline: "Cached page structure available offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Page manager thumbnail grid. Drag spreads to reorder book pagination.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Vertical list of spreads with Move Up / Move Down buttons.",
      tablet: "3-column thumbnail grid.",
      desktop: "4 or 5-column thumbnail grid with drag ghost animation."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/books/:bookId/spreads/reorder",
      authType: "Bearer JWT",
      requestBody: "{ spreadIds: string[] }",
      responseBody: "{ success: true, data: { updated: boolean } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["book_spreads"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.spreads_reordered"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Page order strictly sequential; preserves page numbering."
    },
    testCriteria: {
      unit: ["updates page numbers (1..N) automatically when spreads reordered", "prevents odd page counts"],
      integration: ["PUT /api/books/:bookId/spreads/reorder saves order in transaction"],
      e2e: ["drags spread 3 to position 1, verifies renumbered pages"]
    },
    uiComponents: ["PageManagerGrid", "SpreadThumbnail", "DragHandle", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-66",
    category: "Web & PWA — Books & 3D Studio",
    name: "Asset Placement, Image Box Cropping & Focal Point Adjustment",
    userGoal: "Position photos inside page picture boxes, adjust focal point centering, set zoom scale, and review DPI warnings.",
    userStory: "As an archivist, I want to adjust the focal point on grandfather's face inside a circular portrait frame so he is centered without cropping his hat.",
    entryExitRoutes: {
      entry: ["/books/:bookId/editor#crop", "/books/:bookId/editor"],
      exit: ["/books/:bookId/editor", "/books/:bookId"],
      back: "/books/:bookId/editor",
      deepLink: "https://memoria.local/books/:bookId/editor#crop"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["edit_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Crop modal bar: Picture frame name, Print resolution status badge (e.g. '312 DPI · Print Quality Excellent'), Done button.",
      main: "Interactive focal point stage: Image box boundary with crosshair reticle, slider for scale (100% to 300%), pan drag controls.",
      footer: "Fit options: 'Fit to Frame', 'Fill Frame', 'Reset Crop', Done button."
    },
    exactControls: [
      "Fit to Frame Button",
      "Fill Frame Button",
      "Scale Slider",
      "Focal Point Crosshair drag target",
      "Done Button"
    ],
    keyboardFocus: {
      initialFocus: "Scale slider",
      tabOrder: ["Fit buttons", "Scale slider", "Done button"],
      escapeBehavior: "Cancels crop edits"
    },
    statesMatrix: {
      loading: "Loading full-resolution asset skeleton.",
      empty: "N/A",
      populated: "Interactive crop frame with real-time DPI calculation.",
      error: "DPI warning badge in amber if resolution falls below 200 DPI.",
      offline: "Offline adjustments saved locally.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Asset placement and focal crop editor. Adjust image zoom and centering in frame.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full screen crop sheet.",
      tablet: "Centered modal max-width 600px.",
      desktop: "Centered modal max-width 700px with high-precision drag reticle."
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/books/:bookId/spreads/:spreadId/elements/:elementId",
      authType: "Bearer JWT",
      requestBody: "{ style: { cropX: number, cropY: number, cropScale: number } }",
      responseBody: "{ success: true, data: { updatedElement: PageElement } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Non-destructive coordinates saved in element schema."
    },
    testCriteria: {
      unit: ["calculates effective print DPI based on physical box size and source pixel dimensions", "clamps crop bounds"],
      integration: ["PATCH updates element style in database"],
      e2e: ["adjusts scale slider to 125%, drags focal crosshair, clicks Done"]
    },
    uiComponents: ["CropModal", "FocalReticle", "DPIMeter", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "PWA-67",
    category: "Web & PWA — Books & 3D Studio",
    name: "2D Full Book Proofing & Bleed Preview",
    userGoal: "Inspect the complete book in continuous 2D spreads with bleed guides toggled off for print sign-off.",
    userStory: "As an archivist author, I want to flip through high-resolution 2D proofs of all 48 pages to check typos and margin alignments before ordering.",
    entryExitRoutes: {
      entry: ["/books/:bookId/proof", "/books/:bookId"],
      exit: ["/books/:bookId/editor", "/books/:bookId/preflight"],
      back: "/books/:bookId",
      deepLink: "https://memoria.local/books/:bookId/proof"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Proof viewer header: Book title, Spread indicator ('Spread 12 of 24'), Bleed Guides Toggle switch, Zoom control, Fullscreen button.",
      main: "Continuous horizontal spread stage with realistic paper texture and shadow crease at spine.",
      footer: "Bottom floating HUD: Previous Spread chevron, Next Spread chevron, 'Approve Proof' button, 'Return to Editor' button."
    },
    exactControls: [
      "Previous Spread button (ArrowLeft)",
      "Next Spread button (ArrowRight)",
      "Bleed & Safe Area Guides Toggle",
      "Approve Proof Button",
      "Return to Editor Button"
    ],
    keyboardFocus: {
      initialFocus: "Next Spread button",
      tabOrder: ["Top bar", "Navigation chevrons", "Approve button"],
      shortcuts: ["ArrowRight (Next)", "ArrowLeft (Prev)", "KeyB (Toggle Bleed Guides)"],
      escapeBehavior: "Returns to book overview"
    },
    statesMatrix: {
      loading: "High-resolution proof rendering spinner.",
      empty: "N/A",
      populated: "Crisp archival proofs rendered in permanent Light Mode Living Archive palette.",
      error: "Error banner with refresh button.",
      offline: "Cached proofs available offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "2D Book Proof Viewer. Review spreads sequentially with page numbers.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single page view with horizontal swipe gestures.",
      tablet: "Side-by-side spread view.",
      desktop: "Side-by-side spread view with realistic paper drop shadow."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/books/:bookId/proof",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { spreads: Array<BookSpread>, isPrintReady: boolean } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["book.proof_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Proofs rendered with watermarking if unapproved."
    },
    testCriteria: {
      unit: ["toggles bleed guides on and off", "navigates through all spreads sequentially"],
      integration: ["GET /api/books/:bookId/proof compiles spread elements"],
      e2e: ["flips through 5 spreads, toggles bleed guides, clicks Preflight Check"]
    },
    uiComponents: ["ProofViewerStage", "BleedGuideOverlay", "ProofHUD", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-68",
    category: "Web & PWA — Books & 3D Studio",
    name: "Interactive 3D Book Reader & Page-Curl Engine",
    userGoal: "Immerse in the final memory book in a realistic 3D simulation with cover opening, articulated spine flex, gesture page-curl, and reading cradle.",
    userStory: "As an archivist, I want to open our heirloom book in 3D, flip through pages with realistic curl physics, and share the interactive keepsake with family.",
    entryExitRoutes: {
      entry: ["/books/:bookId/reader", "/books/:bookId"],
      exit: ["/books/:bookId", "/bookshelf"],
      back: "/books/:bookId",
      deepLink: "https://memoria.local/books/:bookId/reader"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Top Reader Bar: Book title, Current page counter, Close (X) button.",
      main: "Three.js WebGL canvas: Complete 3D articulated book model with leather covers, cambered spine flex, gold silk ribbon bookmark, and curled turning pages.",
      footer: "Bottom floating HUD: Open / Close Cover, Previous Page, Next Page, Reset Camera Angle, 2D Flat Proof Toggle, Fullscreen."
    },
    exactControls: [
      "Open Cover / Close Cover Button",
      "Next Page Button (ArrowRight / Mouse drag on page corner)",
      "Previous Page Button (ArrowLeft / Mouse drag on left corner)",
      "Orbit / Pan / Zoom pointer drag controls",
      "Reset Camera View Button",
      "2D Accessible Fallback Toggle Button",
      "Fullscreen Button"
    ],
    keyboardFocus: {
      initialFocus: "Open Cover button in HUD",
      tabOrder: ["Close button", "Bottom HUD buttons"],
      shortcuts: ["ArrowRight (Next Page)", "ArrowLeft (Prev Page)", "Space (Toggle Cover)", "KeyR (Reset Camera)", "Key2 (Toggle 2D Proof)"],
      escapeBehavior: "Exits fullscreen or returns to book overview"
    },
    statesMatrix: {
      loading: "3D asset and texture loading spinner with percentage bar.",
      empty: "N/A",
      populated: "Silky 60 FPS Three.js / R3F experience with archival materials and realistic page deformation.",
      error: "WebGL fallback banner: switches seamlessly to 2D Proof Viewer (PWA-67).",
      offline: "3D model and textures served from service worker cache.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "3D Book Reader. Use arrow keys to turn pages, Space to toggle cover. 2D accessible alternative available.",
      touchTargetMin: "48x48 px floating action buttons",
      focusTrapping: false,
      contrastRatio: "8.5:1"
    },
    responsive: {
      mobile: "Touch swipe gestures to turn pages; fixed cradle angle.",
      tablet: "Touch orbit and pinch-to-zoom allowed, side navigation chevrons.",
      desktop: "Mouse drag orbit, scroll wheel zoom, full screen studio lighting mode."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/books/:bookId/3d-model",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { modelUrl: string, textureUrls: Record<string, string>, spreads: Array<BookSpread> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "book-service / 3D Asset Pipeline",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["3d.reader_opened"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Book page textures rendered on-the-fly and token protected."
    },
    testCriteria: {
      unit: ["executes page turn animation from spread 0 to N", "activates 2D fallback on WebGL context loss"],
      integration: ["GET /api/books/:bookId/3d-model returns valid texture and spread metadata"],
      e2e: ["opens 3D reader, turns 3 pages via right arrow, presses Space to close cover"]
    },
    uiComponents: ["ExperienceCanvas", "ReaderHUD", "PageTurnController", "FlatProofFallback"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-69",
    category: "Web & PWA — Books & 3D Studio",
    name: "Automated Print Preflight Validator",
    userGoal: "Validate print readiness: bleed margins, trim lines, image resolution (DPI >= 300), font embedding, and spine thickness.",
    userStory: "As an archivist, I want an automated preflight check to identify any low-resolution photos or text cut off by trim lines before printing.",
    entryExitRoutes: {
      entry: ["/books/:bookId/preflight", "/books/:bookId/editor"],
      exit: ["/books/:bookId/order", "/books/:bookId/editor"],
      back: "/books/:bookId",
      deepLink: "https://memoria.local/books/:bookId/preflight"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["preflight_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Archival Print Preflight Inspection' with overall status badge ('Ready for Print' or '2 Warnings Detected').",
      main: "Categorized validation checklist: 1. Bleed & Safe Margins (3mm bleed verification), 2. Image Resolution (Checks all photos >= 300 DPI), 3. Spine Width Calculation (computed based on 48 pages @ 140gsm), 4. Missing Assets Check, 5. Color Profile (CMYK Fogra39 compliance).",
      aside: "Warning resolution helper: click warning to jump directly to offending spread in editor.",
      footer: "'Freeze Edition & Proceed to Print' button (disabled if blocking errors exist)."
    },
    exactControls: [
      "Button: 'Re-Run Preflight Checks'",
      "Click warning item (deep links to spread in 2D editor)",
      "Primary Button: 'Freeze Edition & Order Hardcover'",
      "Download Preflight Audit Report (PDF)"
    ],
    keyboardFocus: {
      initialFocus: "First preflight check item",
      tabOrder: ["Check items", "Warning links", "Proceed button"],
      escapeBehavior: "Returns to book overview"
    },
    statesMatrix: {
      loading: "Scanning all pages and calculating image DPI spinner.",
      empty: "N/A",
      populated: "Checklist with green checkmarks and amber warning tags.",
      error: "Blocking red error alerts if photos are missing or bleed violated.",
      offline: "Offline preflight executed via client-side canvas checks.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Print preflight validator. Lists passed checks and warnings for physical print readiness.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column checklist.",
      tablet: "Two-column layout (Checklist left, Spread preview right).",
      desktop: "Max-width 1000px structured preflight dashboard."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/books/:bookId/preflight",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { isPassed: boolean, warningsCount: number, errorsCount: number, checks: Array<{ name: string, status: 'pass' | 'warn' | 'fail', details: string, spreadIndex?: number }> } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "book_spreads", "audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.preflight_executed"],
      bullmqJobs: ["verify-book-dpi-integrity"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Preflight results stored in edition metadata."
    },
    testCriteria: {
      unit: ["flags image with effective DPI < 200 as warning", "computes spine width from page count correctly"],
      integration: ["POST /api/books/:bookId/preflight executes validation rules"],
      e2e: ["runs preflight on valid book, verifies 100% pass, clicks Freeze Edition"]
    },
    uiComponents: ["PreflightDashboard", "ChecklistCard", "WarningCallout", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-70",
    category: "Web & PWA — Books & 3D Studio",
    name: "Version History, Edition Diffs & Frozen Print Archives",
    userGoal: "Inspect frozen print edition snapshots, review immutable SHA-256 hashes, compare edition diffs, and restore prior editions as new drafts.",
    userStory: "As an archivist, I want to inspect Edition 1 printed in 2023, verify its immutable hash, and create an expanded Edition 2 for 2024.",
    entryExitRoutes: {
      entry: ["/books/:bookId/editions", "/books/:bookId"],
      exit: ["/books/:bookId", "/books/new?forkFrom=:editionId"],
      back: "/books/:bookId",
      deepLink: "https://memoria.local/books/:bookId/editions"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_editions", "freeze_edition (Owner/Editor)"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Archival Edition History' with book title and current version badge.",
      main: "Chronological edition timeline: Edition 1 (Frozen Oct 2023 · SHA-256: e3b0c442... · 48 pages · Printed 3 copies), Edition 2 (Current Draft · 56 pages). Diffs inspector showing added/removed pages.",
      footer: "'Branch into New Edition' button."
    },
    exactControls: [
      "Button: 'Branch as New Editable Edition'",
      "Button: 'Download Frozen Edition PDF Archive'",
      "Compare Editions toggle button",
      "Copy SHA-256 Checksum button"
    ],
    keyboardFocus: {
      initialFocus: "First edition card",
      tabOrder: ["Edition cards", "Branch button", "Download PDF button"],
      escapeBehavior: "Returns to book overview"
    },
    statesMatrix: {
      loading: "Edition timeline skeleton pulse.",
      empty: "Notice: 'No frozen editions yet. Freeze an edition when ready for printing.'",
      populated: "Detailed timeline of immutable historical editions with verified checksums.",
      error: "Error banner with reload button.",
      offline: "Cached edition history available offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Version history and frozen print archives. Inspect prior printed editions.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column vertical list.",
      tablet: "Centered 680px timeline.",
      desktop: "Centered 840px layout with side-by-side edition comparison."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/books/:bookId/editions",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { editions: Array<{ editionNumber: number, frozenHash: string, frozenAt: string, pageCount: number, printOrdersCount: number }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service",
      databaseTables: ["books", "audit_logs"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["book.edition_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Frozen editions cannot be overwritten or altered."
    },
    testCriteria: {
      unit: ["verifies SHA-256 checksum formatting", "prevents mutating frozen edition records"],
      integration: ["GET /api/books/:bookId/editions returns historical snapshots"],
      e2e: ["views Edition 1, copies hash, clicks 'Branch as New Edition'"]
    },
    uiComponents: ["EditionTimeline", "EditionCard", "ChecksumBadge", "Button"],
    verifiedStatus: "Implemented & Verified"
  },

  // ==========================================
  // 1.7 PHYSICAL BOOK COMMERCE & FULFILLMENT (PWA-71 to PWA-76)
  // ==========================================
  {
    id: "PWA-71",
    category: "Web & PWA — Commerce",
    name: "Print Format, Paper Weight & Binding Selector",
    userGoal: "Select fine-art paper weight (140gsm archival matte or 170gsm photo lustre) and binding finish with transparent at-cost pricing.",
    userStory: "As an archivist ordering a physical heirloom book, I want to choose 170gsm lustre paper and leather binding with complete price transparency.",
    entryExitRoutes: {
      entry: ["/books/:bookId/order", "/books/:bookId/preflight"],
      exit: ["/books/:bookId/order/shipping", "/books/:bookId"],
      back: "/books/:bookId/preflight",
      deepLink: "https://memoria.local/books/:bookId/order"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["order_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Order Step 1 of 4; title 'Select Heirloom Paper & Binding'.",
      main: "1. Paper Stock selector: 140gsm Archival Matte (Warm, non-glare, fine-text) vs 170gsm Photo Lustre (Vibrant colors, rich contrast), 2. Binding Finish: Archival Fine Leather vs Premium Bookcloth, 3. Quantity selector (1 to 20 copies with volume discount breakdown), 4. Transparent cost summary.",
      footer: "Cost total ($0 software markups, at-cost printing only) and 'Continue to Shipping' button."
    },
    exactControls: [
      "Paper Stock radio cards (140gsm Matte / 170gsm Lustre)",
      "Binding selector radio cards (Fine Leather / Bookcloth)",
      "Quantity increment / decrement buttons (+/-)",
      "Continue Button: 'Proceed to Shipping Address'"
    ],
    keyboardFocus: {
      initialFocus: "First paper stock card",
      tabOrder: ["Paper cards", "Binding cards", "Quantity buttons", "Continue button"],
      escapeBehavior: "Returns to book overview"
    },
    statesMatrix: {
      loading: "Calculating printing print catalog rates spinner.",
      empty: "N/A",
      populated: "Interactive pricing breakdown updating in real-time as options change.",
      error: "Error banner with refresh button.",
      offline: "Commerce options require local/online server connection.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Print options: Choose paper stock, binding finish, and quantity. Transparent at-cost pricing displayed.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked option cards with sticky bottom price bar.",
      tablet: "Two-column layout (Options left, Price summary right).",
      desktop: "Max-width 1000px layout with paper macro photography previews."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/commerce/catalog/options",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { paperStocks: Array<any>, bindings: Array<any>, basePriceCents: number } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "commerce-service / api-gateway",
      databaseTables: ["print_orders"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Transparent $0 markup local printing catalog."
    },
    testCriteria: {
      unit: ["calculates total order cost based on page count and selected paper stock", "clamps quantity between 1 and 20"],
      integration: ["GET /api/commerce/catalog/options returns valid stock choices"],
      e2e: ["selects 170gsm Lustre, sets quantity 2, verifies updated total, clicks Continue"]
    },
    uiComponents: ["StockSelector", "BindingPicker", "QuantityStepper", "PriceSummary", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-72",
    category: "Web & PWA — Commerce",
    name: "Shipping Address & Delivery Estimator",
    userGoal: "Enter delivery address, validate postal formatting, and calculate real shipping rates.",
    userStory: "As an archivist, I want to enter my home shipping address and choose standard or priority archival shipping.",
    entryExitRoutes: {
      entry: ["/books/:bookId/order/shipping", "/books/:bookId/order"],
      exit: ["/books/:bookId/order/checkout", "/books/:bookId/order"],
      back: "/books/:bookId/order",
      deepLink: "https://memoria.local/books/:bookId/order/shipping"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["order_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Order Step 2 of 4; title 'Shipping Destination'.",
      main: "Form: Full Name, Street Address, Apartment/Suite, City, State/Province, Postal Code, Country selector, Phone number (for delivery courier), Shipping speed selector (Standard Archival 5–7 days vs Express Courier 2–3 days).",
      footer: "Order summary sidebar with estimated delivery date and 'Continue to Review & Pay' button."
    },
    exactControls: [
      "Address form inputs",
      "Country dropdown",
      "Shipping speed radio options",
      "Continue Button"
    ],
    formValidation: {
      fields: [
        { name: "fullName", type: "text", required: true, limits: "2-100 chars", errorCopy: "Full name is required." },
        { name: "addressLine1", type: "text", required: true, limits: "5-120 chars", errorCopy: "Street address is required." },
        { name: "city", type: "text", required: true, limits: "2-80 chars", errorCopy: "City is required." },
        { name: "postalCode", type: "text", required: true, limits: "3-12 chars", errorCopy: "Valid postal code is required." },
        { name: "country", type: "select", required: true, errorCopy: "Country is required." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Full Name field",
      tabOrder: ["Name", "Address 1", "Address 2", "City", "State", "Postal Code", "Country", "Shipping speed", "Continue"],
      escapeBehavior: "Returns to step 1"
    },
    statesMatrix: {
      loading: "Validating address with postal database spinner.",
      empty: "Blank address form.",
      populated: "Valid address entered with shipping estimate.",
      error: "Inline address validation error alerts.",
      offline: "Offline warning.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Shipping address form. Enter delivery location and select courier speed.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column form.",
      tablet: "Centered 600px form.",
      desktop: "Two-column layout (Address form left 65%, Order summary right 35%)."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/commerce/shipping/estimate",
      authType: "Bearer JWT",
      requestBody: "{ country: string, postalCode: string, quantity: number, format: BookFormat }",
      responseBody: "{ success: true, data: { rates: Array<{ id: string, name: string, priceCents: number, estimatedDays: string }> } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["print_orders"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Shipping addresses treated as confidential PII; zero third-party broker exposure."
    },
    testCriteria: {
      unit: ["validates postal code formats for US/UK/CA/EU", "computes shipping estimates"],
      integration: ["POST /api/commerce/shipping/estimate returns courier rates"],
      e2e: ["fills address form, selects Standard shipping, continues to checkout"]
    },
    uiComponents: ["ShippingForm", "CourierSpeedSelector", "OrderSummarySidebar", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-73",
    category: "Web & PWA — Commerce",
    name: "Order Checkout & Payment Sandbox Review",
    userGoal: "Review total itemized costs (printing, binding, shipping, taxes) and submit payment via authorized sandbox/live provider.",
    userStory: "As an archivist, I want to review the exact order details and complete payment with zero hidden fees.",
    entryExitRoutes: {
      entry: ["/books/:bookId/order/checkout", "/books/:bookId/order/shipping"],
      exit: ["/orders/:orderId/confirmation", "/books/:bookId/order/shipping"],
      back: "/books/:bookId/order/shipping",
      deepLink: "https://memoria.local/books/:bookId/order/checkout"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["place_order"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Order Step 3 of 4; title 'Review & Confirm Print Order'.",
      main: "1. Order Item Breakdown (Book title, edition hash, cover color, paper stock, quantity), 2. Shipping Address review card, 3. Itemized invoice (Subtotal, Shipping, Tax, Total), 4. Payment boundary card (Card details / Local Sandbox Test Card).",
      footer: "'Confirm & Place Order' button and cancellation link."
    },
    exactControls: [
      "Place Order Button (disabled until payment details validated)",
      "Edit shipping address link",
      "Edit book options link"
    ],
    keyboardFocus: {
      initialFocus: "Place Order button",
      tabOrder: ["Review cards", "Payment inputs", "Place Order button"],
      escapeBehavior: "Returns to shipping"
    },
    statesMatrix: {
      loading: "Processing payment and creating immutable print order spinner.",
      empty: "N/A",
      populated: "Complete transparent invoice with clear breakdown.",
      error: "Payment declined or provider failure alert with actionable retry.",
      offline: "Orders cannot be placed offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Checkout review. Itemized order costs and payment submission.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked review cards with sticky bottom Place Order button.",
      tablet: "Two-column layout.",
      desktop: "Max-width 900px structured checkout layout."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/commerce/orders",
      authType: "Bearer JWT",
      requestBody: "{ bookId: string, frozenEditionHash: string, quantity: number, paperStock: string, shippingAddress: any, paymentToken?: string }",
      responseBody: "{ success: true, data: { orderId: string, totalCents: number, status: 'confirmed' } }",
      statusCodes: ["201 Created", "400 Bad Request", "402 Payment Required"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["print_orders", "order_items", "fulfilment_records"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["commerce.order_placed"],
      bullmqJobs: ["generate-print-pdf-package", "dispatch-order-to-press"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Zero raw credit card numbers stored; uses authorized tokenization only."
    },
    testCriteria: {
      unit: ["enforces idempotency key on order submission to prevent double billing", "verifies edition hash matches book"],
      integration: ["POST /api/commerce/orders creates print_orders record"],
      e2e: ["submits test order, observes confirmation redirect with order ID"]
    },
    uiComponents: ["CheckoutReview", "InvoiceTable", "PaymentCard", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-74",
    category: "Web & PWA — Commerce",
    name: "Order Confirmation & Printable Archival Receipt",
    userGoal: "Receive verified order confirmation, receipt with immutable edition hash, estimated dispatch date, and printable PDF invoice.",
    userStory: "As an archivist, I want a printable archival receipt with order number and edition hash so I have a permanent physical record.",
    entryExitRoutes: {
      entry: ["/orders/:orderId/confirmation", "/books/:bookId/order/checkout"],
      exit: ["/orders/:orderId/tracking", "/bookshelf", "/dashboard"],
      back: "/dashboard",
      deepLink: "https://memoria.local/orders/:orderId/confirmation"
    },
    personasPermissions: {
      roles: ["Order Placer", "Space Owner"],
      capabilities: ["view_order_confirmation"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Confirmation seal: 'Order Confirmed · Your memories are being crafted into print'.",
      main: "1. Order Reference Number (e.g. '#MEM-84920'), 2. Immutable Edition Hash badge, 3. Estimated Delivery Date, 4. Full itemized receipt, 5. Delivery address.",
      footer: "Action buttons: 'Track Production & Shipping' (PWA-75), 'Print Receipt (PDF)', 'Return to Bookshelf'."
    },
    exactControls: [
      "Button: 'Track Production Progress'",
      "Button: 'Download Printable Receipt (PDF)'",
      "Button: 'Return to Bookshelf'"
    ],
    keyboardFocus: {
      initialFocus: "Track Production button",
      tabOrder: ["Track button", "Download PDF button", "Return button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Fetching confirmed order record skeleton.",
      empty: "N/A",
      populated: "Celebratory archival receipt card in Warm Ivory #F7F4EE with Soft Sage #849483 checkmark.",
      error: "Error banner if order lookup fails.",
      offline: "Cached receipt view available offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Order confirmation. Order #MEM-84920 confirmed. Estimated delivery June 24.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column receipt card.",
      tablet: "Centered 600px card.",
      desktop: "Centered 680px archival receipt with print stylesheet."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/commerce/orders/:orderId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { order: any, items: Array<any>, status: string } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["print_orders", "order_items"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Order receipts protected by user authorization."
    },
    testCriteria: {
      unit: ["renders print stylesheet cleanly without navigation headers", "formats currency values"],
      integration: ["GET /api/commerce/orders/:orderId returns confirmed order"],
      e2e: ["verifies order confirmation details match placed items"]
    },
    uiComponents: ["ReceiptCard", "ConfirmationHeader", "PrintButton", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-75",
    category: "Web & PWA — Commerce",
    name: "Real-Time Print Order Production & Shipping Tracker",
    userGoal: "Track physical book production through 5 verified stages: Preflight Verified → Printing Pages → Leather Binding → Dispatched → Delivered.",
    userStory: "As an archivist waiting for our family keepsake, I want to see which stage of binding the book is in and view live courier tracking.",
    entryExitRoutes: {
      entry: ["/orders/:orderId/tracking", "/orders/:orderId/confirmation"],
      exit: ["/bookshelf", "/dashboard"],
      back: "/dashboard",
      deepLink: "https://memoria.local/orders/:orderId/tracking"
    },
    personasPermissions: {
      roles: ["Order Placer", "Space Owner"],
      capabilities: ["track_order"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Production & Delivery Tracker' with Order ID and estimated arrival.",
      main: "1. 5-Stage Stepper: Preflight Checked → Fine-Art Press Printing → Hand Binding & Debossing → Dispatched → Delivered. 2. Courier tracking link (FedEx/DHL/Postal), 3. Production notes log with timestamps.",
      footer: "Contact Support button regarding this order."
    },
    exactControls: [
      "Courier external tracking link button",
      "Refresh tracking status button",
      "Support regarding order button"
    ],
    keyboardFocus: {
      initialFocus: "Active stage step",
      tabOrder: ["Refresh button", "Tracking steps", "Courier link", "Support button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Tracking timeline skeleton pulse.",
      empty: "N/A",
      populated: "Step indicator showing current active stage in Plum #76556F with completed steps in Sage #5F735E.",
      error: "Error banner with refresh button.",
      offline: "Cached tracking status served offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Order production tracker. Current stage: Hand Binding and Debossing. Estimated delivery in 4 days.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Vertical timeline stepper.",
      tablet: "Vertical timeline stepper with detailed stage notes.",
      desktop: "Horizontal multi-step stepper with animated progress connector."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/commerce/orders/:orderId/tracking",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { currentStage: string, estimatedDelivery: string, courierName?: string, trackingNumber?: string, history: Array<any> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["print_orders", "fulfilment_records"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["order.tracking_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Only genuine production milestones rendered."
    },
    testCriteria: {
      unit: ["renders correct active step corresponding to order status", "formats courier tracking URL"],
      integration: ["GET /api/commerce/orders/:orderId/tracking returns fulfillment records"],
      e2e: ["navigates to tracking, verifies current production step"]
    },
    uiComponents: ["OrderStepper", "StageCard", "CourierLink", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-76",
    category: "Web & PWA — Commerce",
    name: "Reorder Dashboard & Immutable Print Edition Archive",
    userGoal: "Order additional identical copies of previously printed editions without altering any page layout.",
    userStory: "As an archivist whose cousins loved our printed family book, I want to reorder 5 identical copies referencing the exact frozen Edition 1 hash.",
    entryExitRoutes: {
      entry: ["/books/:bookId/reorder", "/books/:bookId"],
      exit: ["/books/:bookId/order/checkout", "/books/:bookId"],
      back: "/books/:bookId",
      deepLink: "https://memoria.local/books/:bookId/reorder"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["order_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Reorder Prior Edition' with book title and edition selector.",
      main: "1. Frozen Edition Card (Hash, original print date, page count), 2. Quantity selector (1 to 50 copies), 3. Reorder price estimate, 4. Guarantee: 'Exact byte-for-byte reprint of frozen edition.'",
      footer: "'Proceed to Reorder Checkout' button."
    },
    exactControls: [
      "Edition dropdown selector",
      "Quantity increment / decrement buttons",
      "Button: 'Proceed to Reorder Checkout'"
    ],
    keyboardFocus: {
      initialFocus: "Quantity selector",
      tabOrder: ["Edition selector", "Quantity", "Checkout button"],
      escapeBehavior: "Returns to book overview"
    },
    statesMatrix: {
      loading: "Fetching frozen edition specifications spinner.",
      empty: "Notice: 'No prior editions have been printed for this book yet.'",
      populated: "Edition preview with verified checksum and quantity controls.",
      error: "Error banner with refresh button.",
      offline: "Offline indicator.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Reorder prior edition. Order additional copies of previously printed books.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical card.",
      tablet: "Centered 600px card.",
      desktop: "Centered 720px card."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/commerce/orders/reorder",
      authType: "Bearer JWT",
      requestBody: "{ originalOrderId: string, frozenEditionHash: string, quantity: number }",
      responseBody: "{ success: true, data: { orderDraftId: string } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "commerce-service",
      databaseTables: ["print_orders", "order_items"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["commerce.reorder_initiated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Reprint guaranteed to use identical frozen asset bundle."
    },
    testCriteria: {
      unit: ["ensures reorder references existing frozen hash without regenerating spreads"],
      integration: ["POST /api/commerce/orders/reorder creates order draft"],
      e2e: ["selects 3 copies for reorder, proceeds to checkout"]
    },
    uiComponents: ["ReorderCard", "QuantityStepper", "ChecksumBadge", "Button"],
    verifiedStatus: "Implemented & Verified"
  },

  // ==========================================
  // 1.8 ACCOUNT & SUPPORT (PWA-77 to PWA-82)
  // ==========================================
  {
    id: "PWA-77",
    category: "Web & PWA — Account & Support",
    name: "User Profile, Avatar & Security Settings",
    userGoal: "Manage account identity: update full name, upload profile avatar, change password, and view active sessions.",
    userStory: "As an archivist, I want to update my profile picture and review which browsers are currently signed into my account.",
    entryExitRoutes: {
      entry: ["/settings/profile", "/dashboard"],
      exit: ["/settings/preferences", "/dashboard"],
      back: "/dashboard",
      deepLink: "https://memoria.local/settings/profile"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["manage_account"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Settings Navigation (Profile, Preferences, Privacy, Storage, Data Export, Support).",
      main: "1. Avatar photo uploader with circular preview, 2. Full Name input, 3. Email Address (verified badge), 4. Change Password section (Current password, New password, Confirm), 5. Active Sessions list with 'Sign Out All Other Devices' button.",
      footer: "Save Profile Changes button."
    },
    exactControls: [
      "Avatar photo picker button",
      "Full Name input field",
      "Change Password inputs",
      "Button: 'Update Password'",
      "Button: 'Sign Out All Other Sessions'",
      "Save Changes Button"
    ],
    formValidation: {
      fields: [
        { name: "fullName", type: "text", required: true, limits: "2-100 characters", errorCopy: "Please enter your name." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Full Name input field",
      tabOrder: ["Avatar", "Name", "Save button", "Password fields", "Sign out sessions"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Saving profile spinner.",
      empty: "N/A",
      populated: "Account details pre-filled.",
      error: "Inline validation error alerts.",
      offline: "Account changes disabled offline.",
      permissionDenied: "Redirect to login."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "User profile settings. Update name, avatar, password, and review active sessions.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical sections.",
      tablet: "Two-column settings layout (Nav left 30%, Content right 70%).",
      desktop: "Max-width 1000px settings layout with sticky sidebar."
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/users/me",
      authType: "Bearer JWT",
      requestBody: "{ fullName?: string, avatarUrl?: string }",
      responseBody: "{ success: true, data: { user: UserProfile } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "user_sessions"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.profile_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Session revocations take effect immediately across all microservices."
    },
    testCriteria: {
      unit: ["validates full name input", "revokes all other user_sessions rows on sign out"],
      integration: ["PATCH /api/users/me updates user record"],
      e2e: ["updates name to 'Eleanor Vance-Morrison', clicks Save, confirms header update"]
    },
    uiComponents: ["SettingsNav", "AvatarUploader", "InputField", "SessionList", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-78",
    category: "Web & PWA — Account & Support",
    name: "Application Preferences (Strict Light Living Archive)",
    userGoal: "Configure interface preferences: language, reduced motion mode, default space, and email notifications (Theme toggle permanently disabled).",
    userStory: "As an archivist with motion sensitivity, I want to enable reduced motion so 3D book page turns use gentle crossfades rather than curling motion.",
    entryExitRoutes: {
      entry: ["/settings/preferences", "/settings/profile"],
      exit: ["/settings/profile", "/dashboard"],
      back: "/dashboard",
      deepLink: "https://memoria.local/settings/preferences"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["manage_preferences"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Application Preferences' with Living Archive theme declaration.",
      main: "1. Brand Identity notice: 'Memoria uses a permanent Light Living Archive appearance (#F7F4EE Warm Ivory). Zero dark mode switching.' 2. Reduced Motion toggle switch (replaces 3D physics with smooth 2D crossfade), 3. Default Landing Space dropdown, 4. Date formatting style (e.g. 'DD/MM/YYYY' vs 'Month DD, YYYY'), 5. Notification toggles.",
      footer: "Save Preferences Button."
    },
    exactControls: [
      "Reduced Motion toggle switch",
      "Default Space selector dropdown",
      "Date format selector pills",
      "Notification email toggle switches",
      "Save Preferences Button"
    ],
    keyboardFocus: {
      initialFocus: "Reduced Motion toggle",
      tabOrder: ["Reduced motion", "Default space", "Date format", "Notification toggles", "Save button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Saving preferences spinner.",
      empty: "N/A",
      populated: "Current user preferences pre-selected.",
      error: "Error banner with reload button.",
      offline: "Preferences stored in local IndexedDB.",
      permissionDenied: "Redirect to login."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Preferences settings. Toggle reduced motion and choose date formatting. Permanent light mode enforced.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical form.",
      tablet: "Settings layout with side navigation.",
      desktop: "Max-width 800px preferences card."
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/users/me/preferences",
      authType: "Bearer JWT",
      requestBody: "{ reducedMotion: boolean, defaultSpaceId?: string, dateFormat: string, notifyComments: boolean }",
      responseBody: "{ success: true, data: { preferences: any } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Local user preferences."
    },
    testCriteria: {
      unit: ["enforces light mode only; rejects dark mode preference keys", "disables WebGL animations when reducedMotion is true"],
      integration: ["PATCH /api/users/me/preferences updates user settings"],
      e2e: ["toggles reduced motion on, verifies 3D reader uses 2D transition"]
    },
    uiComponents: ["SettingsNav", "ToggleSwitch", "SelectDropdown", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-79",
    category: "Web & PWA — Account & Support",
    name: "Privacy, Signed Link Duration & Sharing Controls",
    userGoal: "Configure space privacy defaults, default expiration duration for external signed media links, and access audit logs.",
    userStory: "As an archivist, I want to set default signed media link expiration to 1 hour to prevent unauthorized link sharing.",
    entryExitRoutes: {
      entry: ["/settings/privacy", "/settings/profile"],
      exit: ["/settings/profile", "/dashboard"],
      back: "/dashboard",
      deepLink: "https://memoria.local/settings/privacy"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["manage_privacy"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Privacy & Archival Security Controls'.",
      main: "1. Signed Media URL Expiration duration selector (15 minutes, 1 hour, 24 hours), 2. Default space visibility (Private to invited members only), 3. Anonymous telemetry toggle (default OFF, zero external analytics), 4. Recent Security Access Events list (logins, IP addresses, timestamp).",
      footer: "Save Privacy Settings Button."
    },
    exactControls: [
      "Signed Link Expiration dropdown (15m, 1h, 24h)",
      "Zero-Telemetry pledge badge",
      "Download Security Log Button",
      "Save Settings Button"
    ],
    keyboardFocus: {
      initialFocus: "Link expiration dropdown",
      tabOrder: ["Dropdown", "Security logs", "Save button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Saving privacy settings spinner.",
      empty: "N/A",
      populated: "Configured privacy parameters and security event audit list.",
      error: "Error banner with refresh button.",
      offline: "Offline indicator.",
      permissionDenied: "401 Unauthorized."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Privacy and security settings. Configure link expiration and review security access logs.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical sections.",
      tablet: "Settings layout.",
      desktop: "Max-width 840px structured privacy card."
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/users/me/privacy",
      authType: "Bearer JWT",
      requestBody: "{ signedLinkDurationMinutes: number, privateSpaceDefaults: boolean }",
      responseBody: "{ success: true, data: { updated: boolean } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["privacy.settings_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Strict tenant isolation and zero external tracking enforced."
    },
    testCriteria: {
      unit: ["enforces maximum 24h link duration", "verifies audit log rendering"],
      integration: ["PATCH /api/users/me/privacy persists security settings"],
      e2e: ["changes signed link duration to 15m, clicks Save, confirms confirmation toast"]
    },
    uiComponents: ["PrivacyCard", "DurationDropdown", "AuditLogTable", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-80",
    category: "Web & PWA — Account & Support",
    name: "Storage Usage Dashboard & Quota Meters",
    userGoal: "Inspect local disk storage consumption: original media bytes, derivative thumbnails, space breakdown, and orphan cleanup.",
    userStory: "As an archivist self-hosting Memoria on my Mac, I want to inspect my local disk usage (42 GB used of 500 GB allocated) and clear derivative caches safely.",
    entryExitRoutes: {
      entry: ["/settings/storage", "/settings/profile"],
      exit: ["/settings/export", "/dashboard"],
      back: "/dashboard",
      deepLink: "https://memoria.local/settings/storage"
    },
    personasPermissions: {
      roles: ["Authenticated Member (Space Owner)"],
      capabilities: ["view_storage_dashboard"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Storage & Disk Consumption' with total allocated quota meter.",
      main: "1. Storage Meter Bar: Originals (34.2 GB), Derivatives (5.1 GB), Document OCR text (120 MB), Free space (460 GB). 2. Space-by-space breakdown table with media counts, 3. 'Re-generate Missing Thumbnails' maintenance tool, 4. 'Clean Orphan Derivatives' tool (guaranteed never to delete originals).",
      footer: "Direct-to-disk local storage architecture note."
    },
    exactControls: [
      "Button: 'Clean Orphan Thumbnail Caches'",
      "Button: 'Verify Checksums Across All Originals'",
      "Button: 'Re-generate Missing Derivatives'"
    ],
    keyboardFocus: {
      initialFocus: "Storage meter",
      tabOrder: ["Storage bar", "Space breakdown table", "Maintenance buttons"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Scanning local storage directories spinner.",
      empty: "Zero usage state with clear quota display.",
      populated: "Detailed graphical disk breakdown with accurate byte counts.",
      error: "Error banner if disk inspection encounters I/O failure.",
      offline: "Cached storage metrics displayed.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Storage dashboard. 39.4 gigabytes used of 500 gigabytes allocated.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical meter and summary cards.",
      tablet: "Two-column layout.",
      desktop: "Max-width 900px storage dashboard with visual breakdown bar."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/storage/overview",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { usedBytes: number, quotaBytes: number, originalsBytes: number, derivativesBytes: number, spacesBreakdown: Array<any> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "media-service",
      databaseTables: ["space_storage_quotas", "media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: ["verify-media-checksums", "prune-orphan-derivatives"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Storage calculations never alter or delete original master files."
    },
    testCriteria: {
      unit: ["formats byte sizes human-readably (GB, MB, KB)", "prevents pruning originals"],
      integration: ["GET /api/storage/overview returns actual disk consumption from database"],
      e2e: ["navigates to storage, runs checksum verification, observes success badge"]
    },
    uiComponents: ["StorageMeterBar", "BreakdownTable", "MaintenanceTools", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-81",
    category: "Web & PWA — Account & Support",
    name: "Data Sovereignty Export & Account Deletion",
    userGoal: "Download a full archive export (ZIP of byte-for-byte originals + JSON metadata + manifest) or permanently delete account.",
    userStory: "As an archivist, I want to export our entire family archive as an uncompressed ZIP with JSON metadata so we maintain 100% data sovereignty.",
    entryExitRoutes: {
      entry: ["/settings/export", "/settings/profile"],
      exit: ["/dashboard", "/login"],
      back: "/dashboard",
      deepLink: "https://memoria.local/settings/export"
    },
    personasPermissions: {
      roles: ["Authenticated Member (Space Owner)"],
      capabilities: ["export_archive", "delete_account"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Data Sovereignty, Export & Deletion'.",
      main: "Section 1: Complete Archive Export (Button: 'Generate Full Archive ZIP', includes original photos, audio notes, book spreads JSON, and SHA-256 manifest. Download link valid for 48 hours). Section 2: Danger Zone — Permanent Account Deletion (Requires password confirmation and typing 'DELETE FOREVER').",
      footer: "Data sovereignty pledge: You own 100% of your memories. Zero proprietary formats."
    },
    exactControls: [
      "Button: 'Generate Full Archive ZIP'",
      "Download Archive ZIP button (active when export job finishes)",
      "Destructive Button: 'Permanently Delete Account' (triggers double confirmation modal)"
    ],
    formValidation: {
      fields: [
        { name: "deleteConfirmation", type: "text", required: true, validationRule: "exact match 'DELETE FOREVER'", errorCopy: "Please type DELETE FOREVER to confirm." },
        { name: "password", type: "password", required: true, errorCopy: "Please verify your account password." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Generate Export button",
      tabOrder: ["Export button", "Download link", "Delete account button"],
      escapeBehavior: "Closes deletion modal"
    },
    statesMatrix: {
      loading: "Generating archive export ZIP background job spinner.",
      empty: "N/A",
      populated: "Export status card with file size estimate and download link.",
      error: "Error banner with refresh action.",
      offline: "Export generation disabled offline.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Data sovereignty export and permanent account deletion.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical sections.",
      tablet: "Centered 640px card.",
      desktop: "Centered 780px layout with dedicated export and danger zone panels."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/users/me/export",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { jobId: string, estimatedSizeBytes: number } }",
      statusCodes: ["202 Accepted", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service / media-service",
      databaseTables: ["audit_logs", "users"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["account.export_requested", "account.deletion_requested"],
      bullmqJobs: ["compile-archive-export-zip", "purge-user-account"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Export generated locally without cloud leaks; account deletion cleans all sessions and soft-deletes records."
    },
    testCriteria: {
      unit: ["requires exact confirmation string 'DELETE FOREVER' before enabling button", "verifies password"],
      integration: ["POST /api/users/me/export enqueues ZIP compilation job"],
      e2e: ["triggers export, observes progress indicator, verifies download button appears"]
    },
    uiComponents: ["ExportPanel", "DangerZoneCard", "ConfirmModal", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-82",
    category: "Web & PWA — Account & Support",
    name: "Help Documentation, Keyboard Shortcuts & Ticket Support",
    userGoal: "Search user guides, review accessibility keyboard shortcuts, and submit support tickets directly from within the app.",
    userStory: "As an archivist, I want to review keyboard shortcuts (Cmd+K for search, Arrow keys for 3D page turns) and submit an inquiry if I need scanning help.",
    entryExitRoutes: {
      entry: ["/help", "/settings/support"],
      exit: ["/dashboard", "/spaces/:spaceId"],
      back: "/dashboard",
      deepLink: "https://memoria.local/help"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_help", "submit_ticket"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Help, Shortcuts & Archival Support' with documentation search input.",
      main: "1. Keyboard Shortcuts Cheat Sheet (Navigation, Archive, 3D Reader, Spread Editor), 2. Archival Scanning Best Practices Guide (DPI, color space, storage), 3. In-App Support Ticket Form with optional diagnostic log attachment.",
      footer: "Version and build hash footer (e.g. 'Memoria v2.4.0 · Build c3a83d5')."
    },
    exactControls: [
      "Keyboard shortcuts modal trigger (Key?)",
      "Search documentation input field",
      "Support Ticket submit button",
      "Attach diagnostic logs checkbox"
    ],
    formValidation: {
      fields: [
        { name: "subject", type: "text", required: true, limits: "3-120 chars", errorCopy: "Please provide a subject." },
        { name: "message", type: "textarea", required: true, limits: "10-2000 chars", errorCopy: "Please describe your inquiry." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Search documentation input",
      tabOrder: ["Search bar", "Shortcuts sheet", "Support form", "Submit button"],
      shortcuts: ["QuestionMark (Show shortcuts modal)"],
      escapeBehavior: "Closes shortcuts modal"
    },
    statesMatrix: {
      loading: "Submitting ticket spinner.",
      empty: "Clean documentation cards.",
      populated: "Documentation search results and shortcuts matrix.",
      error: "Error banner with retry action.",
      offline: "Documentation fully readable offline; ticket queues locally.",
      permissionDenied: "401 Unauthorized."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Help documentation and keyboard shortcuts cheat sheet.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical guide cards; shortcuts listed with mobile touch alternatives.",
      tablet: "Two-column layout.",
      desktop: "Max-width 1000px layout with sticky navigation."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/support/tickets",
      authType: "Bearer JWT",
      requestBody: "{ subject: string, message: string, includeDiagnostics: boolean }",
      responseBody: "{ success: true, data: { ticketId: string, status: 'open' } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["support.ticket_created"],
      bullmqJobs: ["route-support-ticket"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Diagnostic logs scrubbed of private photo URLs and story text before sending."
    },
    testCriteria: {
      unit: ["displays keyboard shortcuts modal on '?' keypress", "scrubs diagnostics payload"],
      integration: ["POST /api/support/tickets stores support ticket"],
      e2e: ["presses '?', views shortcuts dialog, closes modal, submits support ticket"]
    },
    uiComponents: ["ShortcutsCheatSheet", "DocSearch", "TicketForm", "Button"],
    verifiedStatus: "Implemented & Verified"
  }
];

