import { ScreenSpec } from "./types.js";

export const pwaScreens1: ScreenSpec[] = [
  // ==========================================
  // 1.1 PUBLIC EXPERIENCE (PWA-01 to PWA-07)
  // ==========================================
  {
    id: "PWA-01",
    category: "Web & PWA — Public Experience",
    name: "Landing & Heirloom Discovery Page",
    userGoal: "Discover the Memoria heirloom preservation philosophy, view the interactive 3D memory book teaser, and begin preservation journey.",
    userStory: "As an archival storyteller or family historian, I want to explore Memoria's core capabilities and open a live 3D book preview so that I can understand how our memories will be preserved.",
    entryExitRoutes: {
      entry: ["/", "/home", "/welcome"],
      exit: ["/register", "/login", "/how-it-works", "/sample-book", "/gallery"],
      back: "/",
      deepLink: "https://memoria.local/"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Authenticated Member"],
      capabilities: ["view_public_landing", "interact_3d_teaser"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Brand header with logo, navigation links (How it Works, Gallery, Pricing, Help), and Sign In / Start Archiving CTA.",
      main: "Hero section with headline 'Your memories, made timeless', interactive 3D WebGL book teaser, feature pillars (Archive, Collaborate, 3D Studio, Print), trust pledges.",
      footer: "Zero-budget self-hosting notice, privacy manifesto, documentation links, copyright."
    },
    exactControls: [
      "Hero primary CTA: 'Start Your Archive' (Button)",
      "Hero secondary CTA: 'Explore 3D Book' (Button)",
      "Interactive 3D Book canvas with drag-to-orbit and click-to-open hinge gesture",
      "Feature carousel navigation dots and arrow buttons",
      "Header Sign In link button",
      "Footer documentation anchor links"
    ],
    keyboardFocus: {
      initialFocus: "Skip to main content link",
      tabOrder: ["Header navigation", "Hero primary button", "Hero secondary button", "3D Canvas interactive toggle", "Feature cards", "Footer"],
      escapeBehavior: "Resets 3D teaser rotation to resting hero pose"
    },
    statesMatrix: {
      loading: "Warm ivory skeleton placeholder with soft pulse on hero banner and canvas placeholder.",
      empty: "N/A (static marketing and real WebGL canvas)",
      populated: "Fully loaded 3D WebGL book canvas with plum/gold foil cover, typography in Cormorant Garamond and Inter, responsive layout.",
      error: "WebGL failure fallback banner: displays high-resolution static photographic spread of the heirloom book with accessible 2D turn buttons.",
      offline: "Service Worker served cached landing assets; offline badge banner indicating local browsing.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Landing page announcing Memoria brand, main navigation, interactive 3D book preview with accessible description, and call to action.",
      touchTargetMin: "48x48 px minimum for all links and buttons",
      focusTrapping: false,
      contrastRatio: "7.2:1 (Deep Ink #20242C on Warm Ivory #F7F4EE)"
    },
    responsive: {
      mobile: "Single column stacked hero, 3D canvas height clamped to 280px with touch orbit enabled, collapsed hamburger menu.",
      tablet: "Two column hero with 3D canvas right-aligned (420px height), horizontal feature grid.",
      desktop: "Max-width 1280px container, cinematic two-column hero with high-framerate 3D R3F canvas, expansive typography."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/public/featured-teaser",
      authType: "None",
      responseBody: "{ success: true, data: { featuredBookTitle: string, pageCount: number, coverColor: string } }",
      statusCodes: ["200 OK", "500 Internal Server Error"]
    },
    servicePersistence: {
      service: "api-gateway / static web shell",
      databaseTables: ["books (cached read)"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["public.landing_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "None",
      auditLogged: false,
      privacyNotes: "Zero third-party trackers, zero advertising pixels, zero telemetry cookies."
    },
    testCriteria: {
      unit: ["renders brand headline and tagline correctly", "initializes WebGL canvas and fallback gracefully"],
      integration: ["GET /api/public/featured-teaser returns 200 with schema validation"],
      e2e: ["visitor visits /, clicks Start Your Archive, navigates to /register"]
    },
    uiComponents: ["HeroSection", "ExperienceCanvas", "FeatureCards", "PublicHeader", "PublicFooter"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-02",
    category: "Web & PWA — Public Experience",
    name: "How Memoria Works — 4-Stage Preservation Flow",
    userGoal: "Understand the end-to-end preservation lifecycle: Archive → Collaborate → Author → Print.",
    userStory: "As a prospective archivist, I want to inspect each stage of Memoria's workflow so I know how our physical and digital memories will be converted into books.",
    entryExitRoutes: {
      entry: ["/", "/how-it-works"],
      exit: ["/register", "/sample-book", "/pricing"],
      back: "/",
      deepLink: "https://memoria.local/how-it-works"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Member"],
      capabilities: ["view_public_content"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Public navigation header with active state on 'How it Works'.",
      main: "Interactive stage stepper: 1. Preserving Originals (Lossless + SHA-256), 2. Family Collaboration & Storytelling, 3. 3D Book Layout & Fine Leather Binding, 4. Fine-Art Archival Print Fulfillment.",
      footer: "CTAs: 'Begin Preserving' and 'View Sample Edition'."
    },
    exactControls: [
      "Stage tab switcher (Archive, Collaborate, Author, Print)",
      "Step media viewer with sample high-resolution zoom",
      "Interactive diagram showing direct-to-disk local storage architecture",
      "CTA Button 'Create Free Memory Space'"
    ],
    keyboardFocus: {
      initialFocus: "Main stage stepper heading",
      tabOrder: ["Stage tabs", "Step detail cards", "Next stage button", "Footer CTA"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Content skeleton cards with step progression bar.",
      empty: "N/A",
      populated: "High-contrast visual cards with typography, live diagram animations, and step breakdown.",
      error: "Error banner with retry reload action.",
      offline: "Service worker cached view accessible completely offline.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Explains four stages of preservation with step-by-step headings and audio descriptions.",
      touchTargetMin: "48x48 px",
      focusTrapping: false,
      contrastRatio: "7.2:1 (Deep Ink #20242C on Warm Ivory #F7F4EE)"
    },
    responsive: {
      mobile: "Vertical timeline card sequence with swipe gesture support.",
      tablet: "2x2 grid of preservation stages with step connection badges.",
      desktop: "Horizontal multi-step stepper with animated workflow connector lines."
    },
    apiContract: {
      method: "N/A",
      endpoint: "N/A (Static page)",
      authType: "None",
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
      privacyNotes: "Public educational page."
    },
    testCriteria: {
      unit: ["renders all 4 stages correctly", "switches active stage on tab click"],
      integration: ["page loads without console warnings or layout shifts"],
      e2e: ["navigates from / to /how-it-works and tests tab clicks"]
    },
    uiComponents: ["WorkflowStepper", "StageCard", "ArchivalDiagram", "PublicHeader"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-03",
    category: "Web & PWA — Public Experience",
    name: "Use Cases & Heirloom Scenarios",
    userGoal: "Explore targeted memory capsule use cases: Children milestones, Family heritage, Weddings, Memorials, Pets, and Journeys.",
    userStory: "As a parent or grandchild, I want to view realistic examples of my specific memory scenario so I can envision the final keepsake book.",
    entryExitRoutes: {
      entry: ["/", "/use-cases"],
      exit: ["/register", "/gallery", "/use-cases/:slug"],
      back: "/",
      deepLink: "https://memoria.local/use-cases"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Member"],
      capabilities: ["view_public_content"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Public navigation header with secondary breadcrumb.",
      main: "Category filter pills (All, Childhood, Heritage, Weddings, Memorials, Pets), use case cards with sample photographs and excerpt stories.",
      footer: "CTA banner: 'Craft Your Family Edition'."
    },
    exactControls: [
      "Filter chip selector (Childhood, Heritage, Wedding, Memorial, Pet)",
      "Card CTA: 'Inspect Sample Book'",
      "Card CTA: 'Start with this Template'"
    ],
    keyboardFocus: {
      initialFocus: "First filter chip",
      tabOrder: ["Filter chips", "Use case cards", "Card CTA buttons", "Footer"],
      escapeBehavior: "Clears active filters"
    },
    statesMatrix: {
      loading: "6-card grid skeleton pulse.",
      empty: "Clear message if filter produces no matches with reset button.",
      populated: "Curated cards with archival photo previews, milestone timeline examples, and sample layouts.",
      error: "Error banner with refresh button.",
      offline: "Cached use case directory available offline.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Use case gallery listing memory preservation scenarios with filter pills.",
      touchTargetMin: "44x44 px for filter chips",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column card list with horizontal scrolling filter bar.",
      tablet: "Two column card grid.",
      desktop: "Three column balanced grid with subtle hover depth."
    },
    apiContract: {
      method: "N/A",
      endpoint: "N/A",
      authType: "None",
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
      privacyNotes: "Only licensed and synthetic public sample data."
    },
    testCriteria: {
      unit: ["filters cards according to selected category", "displays appropriate badges"],
      integration: ["renders all 6 canonical categories"],
      e2e: ["visitor filters by Childhood and clicks Start with Template"]
    },
    uiComponents: ["FilterChipBar", "UseCaseCard", "PublicHeader"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-04",
    category: "Web & PWA — Public Experience",
    name: "Public Heirloom Book Gallery",
    userGoal: "Browse published open-access heirloom editions, examine cover designs, and view community spread inspirations.",
    userStory: "As an archivist seeking inspiration, I want to browse public memory books so I can evaluate typography and layout options.",
    entryExitRoutes: {
      entry: ["/", "/gallery"],
      exit: ["/sample-book/:bookId", "/register", "/bookshelf"],
      back: "/",
      deepLink: "https://memoria.local/gallery"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Member"],
      capabilities: ["view_public_gallery"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Gallery navigation bar with search input and format filters (8x8, 8x10, 12x12).",
      main: "Curated masonry grid of 3D book covers with foil accents, page counts, and creator attributions.",
      footer: "Standard public footer."
    },
    exactControls: [
      "Format filter dropdown (Square 8x8, Standard 8x10, Grand 12x12)",
      "Book cover card click (opens 3D Reader)",
      "Quick spread inspection preview popover"
    ],
    keyboardFocus: {
      initialFocus: "Gallery search bar",
      tabOrder: ["Search bar", "Format filter", "Gallery cards", "Pagination"],
      escapeBehavior: "Closes spread preview popover"
    },
    statesMatrix: {
      loading: "Ivory book card skeleton placeholders with shimmering cover badges.",
      empty: "No public books found notice with suggestion to reset search criteria.",
      populated: "Rich grid of books featuring realistic cover cloth colors (Forest #304C43, Plum #76556F, Ink #20242C).",
      error: "Unable to load gallery notice with retry button.",
      offline: "Cached gallery items presented with offline indicator.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Public book gallery displaying published heirloom editions with book title, page count, and format.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column book cover list with swipeable cover cards.",
      tablet: "Two column grid with hover foil elevation.",
      desktop: "Three or four column grid with smooth 3D cover tilt on pointer movement."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/public/books",
      authType: "None",
      responseBody: "{ success: true, data: { items: Array<BookSummary>, total: number } }",
      statusCodes: ["200 OK", "500 Internal Server Error"]
    },
    servicePersistence: {
      service: "book-service / api-gateway",
      databaseTables: ["books"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["public.gallery_browsed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "None",
      auditLogged: false,
      privacyNotes: "Only books marked with explicit public consent are exposed."
    },
    testCriteria: {
      unit: ["parses book format query filters correctly", "renders cover badges"],
      integration: ["GET /api/public/books returns only public editions"],
      e2e: ["browses gallery, filters by format, clicks on sample book"]
    },
    uiComponents: ["GalleryGrid", "BookCoverPreview", "FormatFilter", "PublicHeader"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-05",
    category: "Web & PWA — Public Experience",
    name: "Interactive Sample 3D Book Experience",
    userGoal: "Interact with a full 3D simulation of an heirloom memory book: open the front cover, turn pages with realistic curl, inspect spine flex.",
    userStory: "As an archivist evaluating physical print fidelity, I want to interact with a realistic 3D book model on the web so I can verify page transitions and cover debossing.",
    entryExitRoutes: {
      entry: ["/", "/sample-book", "/gallery"],
      exit: ["/register", "/gallery", "/book-studio"],
      back: "/gallery",
      deepLink: "https://memoria.local/sample-book"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Member"],
      capabilities: ["interact_3d_engine"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Top minimal HUD: Book title, current spread indicator (e.g. 'Cover', 'Pages 4–5 of 48'), close button.",
      main: "Full-viewport 3D WebGL Three.js canvas featuring articulated leather cover, spine flex, and turning pages.",
      footer: "Bottom floating HUD: Open Cover button, Previous Page, Next Page, Reset View, 2D Flat Proof Toggle, Fullscreen."
    },
    exactControls: [
      "Open/Close Cover Toggle Button",
      "Next Spread Button (Right Arrow / Touch drag)",
      "Previous Spread Button (Left Arrow / Touch drag)",
      "Orbit / Pan / Zoom pointer drag controls",
      "Reset Camera View Button",
      "2D Accessible Fallback Toggle Button",
      "Fullscreen Toggle Button"
    ],
    keyboardFocus: {
      initialFocus: "Open Cover Button in floating HUD",
      tabOrder: ["Top HUD back", "Floating bottom controls (Prev, Open, Next, Reset, 2D)"],
      shortcuts: ["ArrowRight (Next Page)", "ArrowLeft (Previous Page)", "Space (Toggle Cover)", "KeyR (Reset Camera)", "Escape (Exit Fullscreen)"],
      escapeBehavior: "Exits fullscreen mode or closes reader"
    },
    statesMatrix: {
      loading: "Archival loading spinner with percentage texture download indicator.",
      empty: "N/A (Loads canonical sample edition 'The Henderson Chronicle 1948–2024').",
      populated: "Interactive 60 FPS WebGL scene with PBR lighting, leather micro-texture, and foil reflections.",
      error: "WebGL context lost or unsupported banner: switches automatically to high-resolution 2D spread viewer.",
      offline: "Service worker caches sample book GLTF model and textures for offline exploration.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Interactive 3D book viewer. Announcing current spread number, page captions, and keyboard shortcuts.",
      touchTargetMin: "48x48 px floating action buttons",
      focusTrapping: false,
      contrastRatio: "8.5:1 (HUD buttons over canvas)"
    },
    responsive: {
      mobile: "Touch swipe gestures to turn pages; camera constrained to fixed reading cradle angle.",
      tablet: "Full touch orbit and pinch-to-zoom allowed, side navigation chevrons.",
      desktop: "Mouse drag orbit, scroll wheel zoom, full screen studio lighting mode."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/public/sample-book-model",
      authType: "None",
      responseBody: "{ success: true, data: { modelUrl: string, title: string, spreads: Array<BookSpread> } }",
      statusCodes: ["200 OK", "404 Not Found"]
    },
    servicePersistence: {
      service: "book-service / 3D Asset Pipeline",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["3d.sample_reader_engaged"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "None",
      auditLogged: false,
      privacyNotes: "Demo archival content only."
    },
    testCriteria: {
      unit: ["handles page turn state transitions from spread 0 to N", "activates 2D fallback on WebGL failure"],
      integration: ["loads sample book document schema and validates spread elements"],
      e2e: ["opens 3D viewer, turns 3 pages, clicks reset camera, toggles 2D proof"]
    },
    uiComponents: ["ExperienceCanvas", "ReaderHUD", "PageTurnController", "FlatProofFallback"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-06",
    category: "Web & PWA — Public Experience",
    name: "Zero-Cost Principles & Storage Transparency",
    userGoal: "Understand Memoria's strict $0 budget self-hosting model, local-first storage architecture, and data sovereignty pledge.",
    userStory: "As an privacy-conscious archivist, I want to review how Memoria ensures my data is stored locally without card-gated services or hidden costs.",
    entryExitRoutes: {
      entry: ["/", "/pricing", "/transparency"],
      exit: ["/register", "/docs/self-hosting", "/faq"],
      back: "/",
      deepLink: "https://memoria.local/transparency"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Member"],
      capabilities: ["view_public_content"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Standard public header with active 'Transparency' link.",
      main: "Philosophy statement: 'Zero Card-Gated Features. Zero Cloud Lock-in.' Side-by-side comparison of local disk storage vs cloud vendors, breakdown of optional physical print at-cost pricing.",
      footer: "Self-hosting guide link and GitHub repository button."
    },
    exactControls: [
      "Storage Calculator Widget (estimate local disk requirements based on photo/video count)",
      "Download Docker Compose / Architecture Blueprint Button",
      "CTA: 'Deploy Your Archive Locally'"
    ],
    keyboardFocus: {
      initialFocus: "Storage calculator inputs",
      tabOrder: ["Storage calculator sliders", "Blueprint button", "CTA Button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Skeleton text and calculator widget loading state.",
      empty: "N/A",
      populated: "Interactive storage math showing 10,000 photos ~ 45 GB local storage with automatic thumb derivatives.",
      error: "Error banner with refresh link.",
      offline: "Fully available offline.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Storage transparency page detailing zero-cost principles and local storage calculator.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked calculator cards and simplified storage breakdown.",
      tablet: "Two-column comparison layout.",
      desktop: "Comprehensive 3-tier architecture breakdown with interactive sliders."
    },
    apiContract: {
      method: "N/A",
      endpoint: "N/A (Static page)",
      authType: "None",
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
      privacyNotes: "Public transparency pledge."
    },
    testCriteria: {
      unit: ["calculates storage estimates correctly for given photo/video counts"],
      integration: ["renders comparison matrix without styling anomalies"],
      e2e: ["adjusts storage sliders and verifies computed disk consumption"]
    },
    uiComponents: ["StorageCalculator", "TransparencyMatrix", "PublicHeader"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-07",
    category: "Web & PWA — Public Experience",
    name: "FAQ, Community Guides & Support Center",
    userGoal: "Search answers to common archival questions, learn how to scan physical photos, and submit a support ticket.",
    userStory: "As an archivist scanning grandmother's photo albums, I want to read scanning DPI recommendations and submit questions if I encounter issues.",
    entryExitRoutes: {
      entry: ["/", "/faq", "/support"],
      exit: ["/register", "/docs/scanning", "/contact-success"],
      back: "/",
      deepLink: "https://memoria.local/faq"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Member"],
      capabilities: ["view_faq", "submit_support_inquiry"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Public navigation header with search input.",
      main: "Accordion FAQ sections (Scanning & Media, 3D Book Layouts, Printing & Binding, Data Sovereignty, Troubleshooting), followed by a validated Support Inquiry Form.",
      footer: "Direct email contact and community links."
    },
    exactControls: [
      "FAQ category filter chips",
      "Accordion expand/collapse headers",
      "Search FAQ input field",
      "Support Form Submit Button"
    ],
    formValidation: {
      fields: [
        { name: "name", type: "text", required: true, limits: "2-80 chars", errorCopy: "Please provide your name." },
        { name: "email", type: "email", required: true, limits: "5-120 chars", errorCopy: "Please provide a valid email address." },
        { name: "category", type: "select", required: true, errorCopy: "Please select an inquiry topic." },
        { name: "message", type: "textarea", required: true, limits: "10-2000 chars", errorCopy: "Inquiry must be between 10 and 2000 characters." }
      ]
    },
    keyboardFocus: {
      initialFocus: "FAQ search input",
      tabOrder: ["Search bar", "Category chips", "Accordion headers", "Contact form inputs", "Submit button"],
      escapeBehavior: "Collapses open accordion panel"
    },
    statesMatrix: {
      loading: "Skeleton accordion panels pulsing gently.",
      empty: "Notice when FAQ search yields 0 results with prompt to contact support directly.",
      populated: "Expanded accordions with clear typography, scanning DPI guides (600 DPI for prints, 1200 DPI for slides).",
      error: "Form validation inline errors or API submission failure alert.",
      offline: "FAQ content fully readable offline; form submission queues locally until reconnected.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Frequently asked questions with searchable accordion sections and contact form.",
      touchTargetMin: "44x44 px for accordion triggers",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width accordion rows with larger tap targets; stacked contact form.",
      tablet: "Two-column layout (FAQ left 60%, Contact Form right 40%).",
      desktop: "Max-width 1100px centered layout with sticky category sidebar."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/public/support-inquiry",
      authType: "None (Rate Limited)",
      requestBody: "{ name: string, email: string, category: string, message: string }",
      responseBody: "{ success: true, data: { ticketId: string, status: 'received' } }",
      statusCodes: ["200 OK", "400 Bad Request", "429 Too Many Requests"]
    },
    servicePersistence: {
      service: "api-gateway",
      databaseTables: ["audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["support.inquiry_submitted"],
      bullmqJobs: ["process-support-ticket"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Inquiry contact details stored strictly for support response; zero marketing reuse."
    },
    testCriteria: {
      unit: ["accordion expands and collapses on keypress", "validates email format in inquiry form"],
      integration: ["POST /api/public/support-inquiry creates outbox event"],
      e2e: ["searches FAQ, fills contact form, receives ticket confirmation"]
    },
    uiComponents: ["FAQAccordion", "SearchInput", "SupportForm", "PublicHeader"],
    verifiedStatus: "Implemented & Verified"
  },

  // ==========================================
  // 1.2 AUTHENTICATION & ONBOARDING (PWA-08 to PWA-18)
  // ==========================================
  {
    id: "PWA-08",
    category: "Web & PWA — Auth & Onboarding",
    name: "User Registration View",
    userGoal: "Create a secure Memoria account with full name, email, password, and privacy agreement.",
    userStory: "As a new user, I want to create my personal archivist account so that I can begin creating family memory spaces.",
    entryExitRoutes: {
      entry: ["/register", "/welcome", "/invite/:token"],
      exit: ["/onboarding/purpose", "/verify-email", "/login"],
      back: "/",
      deepLink: "https://memoria.local/register"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor"],
      capabilities: ["register_account"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Memoria logo in Deep Ink #20242C, subtitle 'Begin your family living archive'.",
      main: "Registration card containing Full Name, Email, Password, Password strength indicator, Terms & Privacy consent checkbox, and Submit CTA.",
      footer: "Already have an account? Sign In link button."
    },
    exactControls: [
      "Full Name input field",
      "Email Address input field",
      "Password input field with toggle visibility eye icon",
      "Terms & Privacy consent checkbox",
      "Primary Button: 'Create Your Archive' (Button)",
      "Sign In navigation link"
    ],
    formValidation: {
      fields: [
        { name: "fullName", type: "text", required: true, limits: "2-100 characters", validationRule: "minLength: 2", errorCopy: "Please enter your full name." },
        { name: "email", type: "email", required: true, limits: "5-255 characters", validationRule: "valid RFC 5322 email", errorCopy: "Please provide a valid email address." },
        { name: "password", type: "password", required: true, limits: "Min 8 chars, 1 uppercase, 1 number", validationRule: "complexity check", errorCopy: "Password must be at least 8 characters with at least one number." },
        { name: "consent", type: "checkbox", required: true, validationRule: "must be checked", errorCopy: "You must agree to the data preservation terms." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Full Name input field",
      tabOrder: ["Full Name", "Email", "Password", "Password Toggle", "Terms Checkbox", "Submit Button", "Sign In Link"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Submit button spinner with text 'Creating Archive...'; form inputs disabled during submit.",
      empty: "Fresh form with placeholder text and focus rings.",
      populated: "Active input values with real-time green/red password criteria checklist.",
      error: "Inline red validation error below invalid inputs; banner if email already registered.",
      offline: "Offline warning banner: 'Registration requires an active local server connection.'",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Registration form with name, email, password fields and submission button.",
      touchTargetMin: "44x44 px for input fields and buttons",
      focusTrapping: false,
      contrastRatio: "7.2:1 (Deep Ink on Warm Ivory canvas)"
    },
    responsive: {
      mobile: "Card expands to 100% viewport width with 16px margins, vertical stack.",
      tablet: "Centered modal card max-width 440px.",
      desktop: "Centered card max-width 480px with subtle border #E7E2DA and warm shadow."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/register",
      authType: "None",
      requestBody: "{ fullName: string, email: string, password: string }",
      responseBody: "{ success: true, data: { user: UserProfile, accessToken: string, refreshToken: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "409 Conflict (Email Exists)"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "user_sessions"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.user_registered"],
      bullmqJobs: ["send-welcome-email"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Password hashed with Argon2id; zero plaintext credentials recorded."
    },
    testCriteria: {
      unit: ["validates email and password requirements in RegisterRequestSchema", "toggles password visibility"],
      integration: ["POST /api/auth/register creates user row and returns valid JWT"],
      e2e: ["fills registration form, handles duplicate email rejection, succeeds on unique email"]
    },
    uiComponents: ["AuthCard", "InputField", "PasswordStrengthMeter", "Button", "Checkbox"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-09",
    category: "Web & PWA — Auth & Onboarding",
    name: "User Sign-In View",
    userGoal: "Authenticate into Memoria using registered email and password to access private memory spaces.",
    userStory: "As a registered member, I want to sign in securely so I can access my spaces, books, and pending invites.",
    entryExitRoutes: {
      entry: ["/login", "/register", "/invite/:token"],
      exit: ["/dashboard", "/onboarding/purpose", "/forgot-password"],
      back: "/",
      deepLink: "https://memoria.local/login"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor"],
      capabilities: ["login"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Brand emblem with title 'Welcome Back to Memoria'.",
      main: "Sign-In card containing Email Address, Password, Remember Me checkbox, Forgot Password link, and Sign In button.",
      footer: "Don't have an archive yet? Create Account link."
    },
    exactControls: [
      "Email Address input field",
      "Password input field with visibility toggle",
      "Remember Me checkbox (persists 30-day session)",
      "Forgot Password text link",
      "Primary Button: 'Sign In to Memoria'",
      "Register new account link"
    ],
    formValidation: {
      fields: [
        { name: "email", type: "email", required: true, errorCopy: "Please enter your registered email address." },
        { name: "password", type: "password", required: true, errorCopy: "Please enter your password." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Email Address input field",
      tabOrder: ["Email", "Password", "Password Toggle", "Remember Me", "Sign In Button", "Forgot Password Link", "Register Link"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Sign In button displays spinner; fields disabled.",
      empty: "Clean login form with clear focus rings.",
      populated: "Entered credentials ready for authentication.",
      error: "Generic secure error banner: 'Invalid email or password combination. Please try again.'",
      offline: "Offline notification: 'You appear to be offline. Reconnecting to local Memoria instance...'",
      permissionDenied: "Account suspended notification with support contact link."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Login form with email and password fields, submit button, and account recovery options.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width card, 16px margins, prominent touch targets.",
      tablet: "Centered 440px wide card.",
      desktop: "Centered 460px card with warm ivory backdrop and subtle plum accents."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/login",
      authType: "None",
      requestBody: "{ email: string, password: string }",
      responseBody: "{ success: true, data: { accessToken: string, refreshToken: string, user: UserProfile } }",
      statusCodes: ["200 OK", "401 Unauthorized", "429 Too Many Requests"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "user_sessions"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.user_logged_in"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Failed login attempts rate limited; IP and user agent logged for session security."
    },
    testCriteria: {
      unit: ["validates LoginRequestSchema", "handles visibility toggle click"],
      integration: ["POST /api/auth/login sets session cookie and returns user profile"],
      e2e: ["logs in with valid test credentials, navigates to dashboard"]
    },
    uiComponents: ["AuthCard", "InputField", "Button", "Checkbox"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-10",
    category: "Web & PWA — Auth & Onboarding",
    name: "Forgot Password Recovery Request",
    userGoal: "Request a secure, time-limited password reset link via registered email address.",
    userStory: "As a member who forgot my password, I want to request a reset link so I can regain access to my family memory space.",
    entryExitRoutes: {
      entry: ["/login", "/forgot-password"],
      exit: ["/login", "/reset-password"],
      back: "/login",
      deepLink: "https://memoria.local/forgot-password"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor"],
      capabilities: ["request_password_reset"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Recovery title 'Reset Your Password' with explanatory caption.",
      main: "Card containing Email Address field and 'Send Reset Instructions' CTA button.",
      footer: "Return to Sign In link."
    },
    exactControls: [
      "Email input field",
      "Submit Button: 'Send Reset Link'",
      "Back to Sign In link button"
    ],
    formValidation: {
      fields: [
        { name: "email", type: "email", required: true, errorCopy: "Please provide your registered email." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Email input field",
      tabOrder: ["Email", "Send Reset Link Button", "Back to Sign In Link"],
      escapeBehavior: "Returns to /login"
    },
    statesMatrix: {
      loading: "Button loading spinner with text 'Sending Instructions...'",
      empty: "Input awaiting email address.",
      populated: "Valid email entered.",
      error: "Rate limit notification if exceeded.",
      offline: "Offline alert banner.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Password reset request view. Enter your email to receive recovery instructions.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width card.",
      tablet: "Centered 440px card.",
      desktop: "Centered 440px card."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/forgot-password",
      authType: "None",
      requestBody: "{ email: string }",
      responseBody: "{ success: true, data: { message: 'If an account exists, instructions have been sent.' } }",
      statusCodes: ["200 OK", "429 Too Many Requests"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "user_sessions"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.password_reset_requested"],
      bullmqJobs: ["send-password-reset-email"]
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: true,
      privacyNotes: "Privacy-preserving neutral message returned regardless of whether the email exists in the database."
    },
    testCriteria: {
      unit: ["returns generic neutral message preventing email enumeration"],
      integration: ["POST /api/auth/forgot-password enqueues reset token job"],
      e2e: ["submits email and verifies neutral confirmation message"]
    },
    uiComponents: ["AuthCard", "InputField", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-11",
    category: "Web & PWA — Auth & Onboarding",
    name: "Password Reset Token Verification & New Input",
    userGoal: "Set a new secure password using a cryptographic verification token received via recovery email.",
    userStory: "As an archivist with a valid recovery token, I want to set a new strong password so I can sign back in.",
    entryExitRoutes: {
      entry: ["/reset-password?token=:token"],
      exit: ["/login", "/dashboard"],
      back: "/login",
      deepLink: "https://memoria.local/reset-password?token=:token"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor with Valid Token"],
      capabilities: ["reset_password"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Title 'Create a New Password' with security guidelines.",
      main: "Card with New Password input, Confirm Password input, Strength indicator, and 'Update Password' button.",
      footer: "Cancel and return to Sign In."
    },
    exactControls: [
      "New Password input field with visibility toggle",
      "Confirm Password input field",
      "Submit Button: 'Update Password & Sign In'"
    ],
    formValidation: {
      fields: [
        { name: "password", type: "password", required: true, limits: "Min 8 chars, 1 uppercase, 1 number", errorCopy: "Password does not meet minimum strength requirements." },
        { name: "confirmPassword", type: "password", required: true, errorCopy: "Passwords do not match." }
      ]
    },
    keyboardFocus: {
      initialFocus: "New Password field",
      tabOrder: ["New Password", "Confirm Password", "Submit Button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Submitting new password spinner.",
      empty: "Fields awaiting entry.",
      populated: "Matching passwords entered.",
      error: "Token expired or invalid banner with link to request a fresh link.",
      offline: "Offline notification.",
      permissionDenied: "Token invalid alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Enter new password and confirmation to reset your account password.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "100% width card.",
      tablet: "Centered 440px card.",
      desktop: "Centered 460px card."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/reset-password",
      authType: "Token",
      requestBody: "{ token: string, newPassword: string }",
      responseBody: "{ success: true, data: { message: 'Password updated successfully' } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden (Token Expired)"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "user_sessions"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.password_reset_completed"],
      bullmqJobs: ["revoke-prior-sessions"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "All existing sessions invalidated immediately upon successful password change."
    },
    testCriteria: {
      unit: ["validates password confirmation equality", "rejects reused token"],
      integration: ["POST /api/auth/reset-password hashes password and revokes previous sessions"],
      e2e: ["submits valid token with new password and signs in successfully"]
    },
    uiComponents: ["AuthCard", "InputField", "PasswordStrengthMeter", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-12",
    category: "Web & PWA — Auth & Onboarding",
    name: "Email Verification Confirmation Screen",
    userGoal: "Confirm email address ownership via verification link or trigger a resend if link is expired.",
    userStory: "As a newly registered member, I want to verify my email so that I can receive collaboration invites and print notifications.",
    entryExitRoutes: {
      entry: ["/verify-email", "/verify-email?token=:token"],
      exit: ["/onboarding/purpose", "/dashboard"],
      back: "/login",
      deepLink: "https://memoria.local/verify-email?token=:token"
    },
    personasPermissions: {
      roles: ["Registered User"],
      capabilities: ["verify_email"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Memoria seal with title 'Verify Your Archival Email'.",
      main: "Verification status icon (Pending / Success / Expired), confirmation message, 'Resend Verification' button with 60s cooldown timer.",
      footer: "Continue to Onboarding CTA button."
    },
    exactControls: [
      "Button: 'Resend Verification Email' (with active cooldown countdown)",
      "Button: 'Continue to Setup Your Space'"
    ],
    keyboardFocus: {
      initialFocus: "Continue CTA button",
      tabOrder: ["Resend Button", "Continue CTA"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Verifying token spinner.",
      empty: "N/A",
      populated: "Green checkmark with 'Email verified successfully'.",
      error: "Expired token banner with resend trigger.",
      offline: "Offline notification.",
      permissionDenied: "Invalid token notification."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Email verification confirmation status and resend button.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Centered card layout.",
      tablet: "Centered 440px card.",
      desktop: "Centered 460px card."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/verify-email",
      authType: "Token",
      requestBody: "{ token: string }",
      responseBody: "{ success: true, data: { verified: boolean, email: string } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.email_verified"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Verification status recorded in audit log."
    },
    testCriteria: {
      unit: ["enforces 60-second resend cooldown timer"],
      integration: ["POST /api/auth/verify-email marks user verified in database"],
      e2e: ["navigates with token, verifies success state, proceeds to onboarding"]
    },
    uiComponents: ["StatusBadge", "Button", "CooldownTimer"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-13",
    category: "Web & PWA — Auth & Onboarding",
    name: "Collaborative Invitation Acceptance Landing",
    userGoal: "Accept a family member or editor invitation to join an existing Memory Space.",
    userStory: "As an invited family member, I want to review the inviter's space name and assigned role so I can join the collaborative archive.",
    entryExitRoutes: {
      entry: ["/invite/:token"],
      exit: ["/register?invite=:token", "/login?invite=:token", "/spaces/:spaceId"],
      back: "/",
      deepLink: "https://memoria.local/invite/:token"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Authenticated Member"],
      capabilities: ["accept_invitation"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Brand header with space invitation emblem.",
      main: "Invitation preview card: Inviter name (e.g. 'Eleanor Vance'), Memory Space title ('Vance Family Archive'), Role badge ('Contributor'), Personal note excerpt, 'Accept Invitation' button, 'Decline' button.",
      footer: "Terms of contribution note."
    },
    exactControls: [
      "Button: 'Accept Invitation & Join Space'",
      "Secondary Button: 'Decline Invitation'",
      "Link: 'Sign in with a different account'"
    ],
    keyboardFocus: {
      initialFocus: "Accept Invitation button",
      tabOrder: ["Accept button", "Decline button", "Switch account link"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Fetching invitation metadata skeleton.",
      empty: "N/A",
      populated: "Inviter details, space cover thumbnail, role capabilities explanation.",
      error: "Invitation expired, revoked, or already accepted banner.",
      offline: "Offline notification: 'Internet connection required to join collaborative space.'",
      permissionDenied: "Token invalid alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Space invitation from Eleanor Vance to join Vance Family Archive as a Contributor.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width card.",
      tablet: "Centered 480px card.",
      desktop: "Centered 520px card with space cover banner."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/invitations/:token/accept",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { spaceId: string, role: string } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found", "410 Gone (Expired)"]
    },
    servicePersistence: {
      service: "identity-service / memory-service",
      databaseTables: ["space_invitations", "space_members"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.invitation_accepted"],
      bullmqJobs: ["notify-space-owner"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Member addition recorded in space audit trail."
    },
    testCriteria: {
      unit: ["handles unauthenticated visitor redirect to registration preserving token"],
      integration: ["POST /api/spaces/invitations/:token/accept creates space_members row"],
      e2e: ["accepts invitation, redirects to target space timeline"]
    },
    uiComponents: ["InvitationCard", "SpaceBadge", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-14",
    category: "Web & PWA — Auth & Onboarding",
    name: "Purpose Selection Onboarding Wizard",
    userGoal: "Select the primary purpose for the first memory archive (Family Heritage, Child Milestones, Wedding, Memorial, Travel Journey, or Personal Story).",
    userStory: "As a new user, I want to choose my primary memory purpose so that Memoria can customize initial prompts and book themes.",
    entryExitRoutes: {
      entry: ["/onboarding/purpose", "/register"],
      exit: ["/onboarding/first-space", "/dashboard"],
      back: "/register",
      deepLink: "https://memoria.local/onboarding/purpose"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["complete_onboarding"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 1 of 4 progress indicator; title 'What kind of memory archive are you creating?'.",
      main: "Grid of 6 purpose cards with archival illustrations: 1. Family Heritage, 2. Childhood Milestones, 3. Wedding & Love Story, 4. Memorial & Tribute, 5. Travel & Journeys, 6. Personal Memoir.",
      footer: "Bottom bar with 'Skip for now' link and 'Continue' CTA button."
    },
    exactControls: [
      "Selectable Purpose Cards (single selection radio group)",
      "Button: 'Continue to Space Details'",
      "Link: 'Skip to Dashboard'"
    ],
    keyboardFocus: {
      initialFocus: "First purpose card (Family Heritage)",
      tabOrder: ["Purpose cards 1-6", "Skip link", "Continue button"],
      shortcuts: ["ArrowRight (Next card)", "ArrowLeft (Prev card)", "Space (Select card)"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Purpose card skeletons.",
      empty: "N/A",
      populated: "6 cards with selected state indicated by Plum #76556F border and subtle checkmark badge.",
      error: "Selection error banner if submit attempted without picking a card.",
      offline: "Available offline in local session.",
      permissionDenied: "Redirect to login if unauthenticated."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Purpose selection wizard step 1. Radio group of 6 archive types.",
      touchTargetMin: "48x48 px card targets",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column vertical list of cards.",
      tablet: "2 column grid.",
      desktop: "3 column balanced grid."
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/users/me/onboarding",
      authType: "Bearer JWT",
      requestBody: "{ purpose: 'family' | 'childhood' | 'wedding' | 'memorial' | 'journey' | 'personal' }",
      responseBody: "{ success: true, data: { step: 'first-space', purpose: string } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["onboarding.purpose_selected"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "None",
      auditLogged: false,
      privacyNotes: "Stored as user preference."
    },
    testCriteria: {
      unit: ["selects card on click and keyboard arrow navigation", "disables Continue button until selection made"],
      integration: ["PATCH /api/users/me/onboarding stores purpose"],
      e2e: ["selects Family Heritage and clicks Continue"]
    },
    uiComponents: ["WizardHeader", "PurposeCardGrid", "OnboardingFooter"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-15",
    category: "Web & PWA — Auth & Onboarding",
    name: "Create First Memory Space Step",
    userGoal: "Name and describe the initial memory space (e.g. 'The Morrison Family Living Archive').",
    userStory: "As an archivist in onboarding, I want to configure my first space with a title, description, and privacy setting so my memories have a dedicated home.",
    entryExitRoutes: {
      entry: ["/onboarding/first-space", "/onboarding/purpose"],
      exit: ["/onboarding/first-profile", "/onboarding/purpose"],
      back: "/onboarding/purpose",
      deepLink: "https://memoria.local/onboarding/first-space"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["create_memory_space"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 2 of 4 progress indicator; title 'Name your living archive'.",
      main: "Form fields: Space Name (pre-populated with suggested name based on selected purpose), Short Description, Cover Color swatch picker (Forest, Plum, Ink, Sage).",
      footer: "Back button and 'Create Space & Continue' button."
    },
    exactControls: [
      "Space Name text input field",
      "Description textarea",
      "Color swatch selector buttons",
      "Back Button",
      "Primary Button: 'Create Space & Continue'"
    ],
    formValidation: {
      fields: [
        { name: "name", type: "text", required: true, limits: "1-100 characters", errorCopy: "Please give your memory space a name." },
        { name: "description", type: "text", required: false, limits: "0-500 characters" }
      ]
    },
    keyboardFocus: {
      initialFocus: "Space Name input field",
      tabOrder: ["Space Name", "Description", "Color swatches", "Back button", "Create button"],
      escapeBehavior: "Returns to previous step"
    },
    statesMatrix: {
      loading: "Creating space spinner on button.",
      empty: "Pre-filled default suggestion (e.g. 'My Family Archive').",
      populated: "Customized space details.",
      error: "Validation error banner.",
      offline: "Local IndexedDB draft preserved; syncs on reconnect.",
      permissionDenied: "Redirect to login."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Step 2 of onboarding. Name and configure your memory space.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width form.",
      tablet: "Centered 520px card.",
      desktop: "Centered 580px card."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces",
      authType: "Bearer JWT",
      requestBody: "{ name: string, description?: string, type: 'family' | 'personal' | 'event' | 'journey' }",
      responseBody: "{ success: true, data: { space: MemorySpace } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memory_spaces", "space_members", "space_storage_quotas"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.space_created"],
      bullmqJobs: ["initialize-space-defaults"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Creator automatically designated Owner."
    },
    testCriteria: {
      unit: ["validates Space name schema", "emits space_created event"],
      integration: ["POST /api/spaces inserts row and owner membership"],
      e2e: ["submits space name, navigates to profile creation"]
    },
    uiComponents: ["SpaceForm", "ColorSwatchPicker", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-16",
    category: "Web & PWA — Auth & Onboarding",
    name: "Create First Profile (Person, Child, Pet, Couple)",
    userGoal: "Add the first family member or subject profile to tag in future memories.",
    userStory: "As an archivist, I want to add my child, ancestor, or family member's profile so that stories can be attached to them.",
    entryExitRoutes: {
      entry: ["/onboarding/first-profile", "/onboarding/first-space"],
      exit: ["/onboarding/invite-members", "/onboarding/first-space"],
      back: "/onboarding/first-space",
      deepLink: "https://memoria.local/onboarding/first-profile"
    },
    personasPermissions: {
      roles: ["Authenticated Member (Space Owner)"],
      capabilities: ["create_profile"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 3 of 4; title 'Who is this archive celebrating?'.",
      main: "Profile card: Profile Type selector (Individual, Child, Pet, Couple, Ancestor), Full Name, Relationship (e.g. 'Daughter', 'Grandmother'), Birth Date (optional), Avatar photo placeholder.",
      footer: "'Skip profile creation' and 'Save Profile & Continue' buttons."
    },
    exactControls: [
      "Profile Type selector pills",
      "Full Name input field",
      "Relationship input field",
      "Birth Date picker",
      "Avatar upload trigger button",
      "Skip button",
      "Continue button"
    ],
    formValidation: {
      fields: [
        { name: "name", type: "text", required: true, limits: "1-100 characters", errorCopy: "Please enter the person's name." },
        { name: "type", type: "select", required: true, errorCopy: "Please select a profile category." },
        { name: "relationship", type: "text", required: false, limits: "0-50 characters" },
        { name: "birthDate", type: "date", required: false }
      ]
    },
    keyboardFocus: {
      initialFocus: "Full Name input field",
      tabOrder: ["Profile Type pills", "Full Name", "Relationship", "Birth Date", "Skip", "Continue"],
      escapeBehavior: "Returns to step 2"
    },
    statesMatrix: {
      loading: "Saving profile spinner.",
      empty: "Blank form awaiting input.",
      populated: "Valid profile data entered with preview avatar.",
      error: "Validation error banner.",
      offline: "Queued locally in IndexedDB.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Step 3 of onboarding. Add the first profile to your memory space.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width form.",
      tablet: "Centered 520px card.",
      desktop: "Centered 580px card."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/profiles",
      authType: "Bearer JWT",
      requestBody: "{ name: string, relationship?: string, type: ProfileType, birthDate?: string }",
      responseBody: "{ success: true, data: { profile: SpaceProfile } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["space_profiles"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.profile_created"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Children and personal dates protected by space tenant boundaries."
    },
    testCriteria: {
      unit: ["validates ProfileTypeSchema", "handles optional birth date parsing"],
      integration: ["POST /api/spaces/:spaceId/profiles persists profile record"],
      e2e: ["creates daughter profile with birthdate, navigates to invite contributors"]
    },
    uiComponents: ["ProfileForm", "TypeSelectorPill", "AvatarUploadTrigger", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-17",
    category: "Web & PWA — Auth & Onboarding",
    name: "Invite Family Members & Contributors Step",
    userGoal: "Invite relatives or co-creators via email with designated roles (Editor, Contributor, Viewer).",
    userStory: "As an archivist, I want to invite my siblings and spouse so they can add photos and memories to our shared space.",
    entryExitRoutes: {
      entry: ["/onboarding/invite-members", "/onboarding/first-profile"],
      exit: ["/onboarding/first-upload", "/dashboard"],
      back: "/onboarding/first-profile",
      deepLink: "https://memoria.local/onboarding/invite-members"
    },
    personasPermissions: {
      roles: ["Authenticated Member (Space Owner)"],
      capabilities: ["invite_members"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Step 4 of 4; title 'Who will help preserve these memories?'.",
      main: "Multi-row email invite form: Email input, Role dropdown (Contributor / Editor / Viewer), '+ Add another person' button, Sharable invite link generator.",
      footer: "'Skip for now' and 'Send Invitations & Continue' buttons."
    },
    exactControls: [
      "Email input fields (multi-row)",
      "Role select dropdowns",
      "Button: '+ Add another person'",
      "Button: 'Copy Private Invite Link'",
      "Button: 'Skip for now'",
      "Primary Button: 'Send Invites & Continue'"
    ],
    formValidation: {
      fields: [
        { name: "emails", type: "email[]", required: false, limits: "Valid email addresses", errorCopy: "Please check email formatting." }
      ]
    },
    keyboardFocus: {
      initialFocus: "First email input field",
      tabOrder: ["Email 1", "Role 1", "Add person button", "Copy link button", "Skip button", "Send button"],
      escapeBehavior: "Returns to step 3"
    },
    statesMatrix: {
      loading: "Sending invitation emails spinner.",
      empty: "Single empty email row with Contributor pre-selected.",
      populated: "Multiple invite rows with valid emails.",
      error: "Error banner if invitation delivery encounters failure.",
      offline: "Offline notification: 'Invitations will be dispatched when online.'",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Invite family members to collaborate on this memory space.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked row layout.",
      tablet: "Row with email input (70%) and role selector (30%).",
      desktop: "Clean tabular layout max-width 640px."
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/invitations",
      authType: "Bearer JWT",
      requestBody: "{ invitations: Array<{ email: string, role: 'editor' | 'contributor' | 'viewer' }> }",
      responseBody: "{ success: true, data: { invitedCount: number } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / identity-service",
      databaseTables: ["space_invitations"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.invitations_dispatched"],
      bullmqJobs: ["dispatch-invitation-emails"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Invitations generate secure cryptographically signed tokens."
    },
    testCriteria: {
      unit: ["validates list of emails", "disables send button when rows empty"],
      integration: ["POST /api/spaces/:spaceId/invitations generates invitation records"],
      e2e: ["adds 2 family emails, sends invitations, navigates to first upload"]
    },
    uiComponents: ["InviteRowList", "RoleSelectDropdown", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "PWA-18",
    category: "Web & PWA — Auth & Onboarding",
    name: "First Memory Upload & Drag-and-Drop Prompt",
    userGoal: "Upload the very first photograph, document, or audio memory to inaugurate the space.",
    userStory: "As an archivist finishing onboarding, I want to drag-and-drop a few initial photos so my space immediately comes to life.",
    entryExitRoutes: {
      entry: ["/onboarding/first-upload", "/onboarding/invite-members"],
      exit: ["/dashboard", "/memories/:memoryId"],
      back: "/onboarding/invite-members",
      deepLink: "https://memoria.local/onboarding/first-upload"
    },
    personasPermissions: {
      roles: ["Authenticated Member (Contributor+)"],
      capabilities: ["upload_media", "create_memory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Onboarding finale; title 'Add your first memory'.",
      main: "Large dashed drag-and-drop target zone, 'Choose files from device' button, supported format badges (JPEG, PNG, HEIC, MP4, MP3, PDF up to 500MB), thumbnail preview queue with progress bar.",
      footer: "Finish button and 'Go to Dashboard' link."
    },
    exactControls: [
      "Drag-and-Drop Dropzone area",
      "File input trigger button: 'Browse Photos & Documents'",
      "Remove item button on uploaded thumbnail cards",
      "Primary Button: 'Preserve & Enter Dashboard'"
    ],
    keyboardFocus: {
      initialFocus: "Browse files button",
      tabOrder: ["Browse files button", "Uploaded thumbnail items", "Finish button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Uploading and hashing files with live percentage bar.",
      empty: "Archival camera illustration inviting first upload.",
      populated: "Grid of uploaded thumbnails with green checkmark badges.",
      error: "Error badge on oversized or unsupported format files with retry button.",
      offline: "Queued in local IndexedDB storage queue for background upload.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Drop zone to upload photos and documents to your memory space.",
      touchTargetMin: "48x48 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Compact dropzone with prominent mobile camera/photo library picker trigger.",
      tablet: "Expansive drag and drop zone with 3-column thumbnail preview.",
      desktop: "Spacious dropzone with drag hover glow, 4-column thumbnail preview."
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
      databaseTables: ["media_assets", "memories", "memory_media"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["media.uploaded", "memory.created"],
      bullmqJobs: ["generate-derivatives", "extract-exif-metadata"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Original byte-for-byte SHA-256 verification; stored in tenant-isolated directory."
    },
    testCriteria: {
      unit: ["validates file size limit and MIME whitelist", "calculates client-side SHA-256 hash"],
      integration: ["completes direct-to-disk upload and generates thumbnail record"],
      e2e: ["drags photo fixture, observes progress, verifies redirect to dashboard"]
    },
    uiComponents: ["DropZone", "UploadQueueItem", "Button"],
    verifiedStatus: "Implemented & Verified"
  },

  // ==========================================
  // 1.3 HOME, SPACES, PEOPLE & COLLECTIONS (PWA-19 to PWA-28)
  // ==========================================
  {
    id: "PWA-19",
    category: "Web & PWA — Spaces & People",
    name: "Personal Dashboard & Living Archive Hub",
    userGoal: "View recent memories, today-in-history, active spaces, miniature 3D bookshelf, and quick-capture entry points.",
    userStory: "As an archivist, I want a comprehensive personal dashboard so that I can see what happened today in our family history and quickly add new stories.",
    entryExitRoutes: {
      entry: ["/dashboard", "/login", "/"],
      exit: ["/spaces/:spaceId", "/memories/:memoryId", "/books/:bookId", "/create-memory"],
      back: "/",
      deepLink: "https://memoria.local/dashboard"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_dashboard"],
      authRequired: true
    },
    contentHierarchy: {
      header: "App navigation bar: Memoria seal, space selector dropdown, search input, notification bell, user avatar menu.",
      main: "1. Today-in-History memory banner, 2. Quick capture action pills (+ Photo, + Story, + Voice Note), 3. Recent Memories masonry feed, 4. 3D Digital Bookshelf widget, 5. Storage health meter.",
      aside: "Right sidebar: Space Members online, upcoming anniversaries, quick tags.",
      footer: "Minimal authenticated footer."
    },
    exactControls: [
      "Quick Capture floating '+ Add Memory' button",
      "Capture type pills (Photo, Audio, Story, Scan)",
      "Space Switcher dropdown trigger",
      "Search trigger button (Command+K)",
      "Notification icon trigger with unread badge",
      "Bookshelf 'Open Studio' button"
    ],
    keyboardFocus: {
      initialFocus: "Main content landmark",
      tabOrder: ["Header navigation", "Quick capture buttons", "Today-in-history card", "Recent memories grid", "Bookshelf preview"],
      shortcuts: ["Cmd+K (Search)", "KeyC (Create Memory)", "KeyB (Open Bookshelf)"],
      escapeBehavior: "Closes any open popovers or menus"
    },
    statesMatrix: {
      loading: "Dashboard masonry and widget skeletons.",
      empty: "Warm empty state with prompt: 'Your archive is quiet. Preserve your first family story today.'",
      populated: "Vibrant living archive feed with chronological memory cards, EXIF timestamps, audio players.",
      error: "Service error banner with refresh button.",
      offline: "IndexedDB cached memories rendered with amber offline sync indicator.",
      permissionDenied: "Redirect to login."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Personal Dashboard. Space switcher, quick capture, today in history, and recent memories.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1 (Deep Ink on Warm Ivory)"
    },
    responsive: {
      mobile: "Single column feed, bottom navigation bar with Quick Capture center button, collapsible widgets.",
      tablet: "Two-column layout with sidebar tucked into sheet.",
      desktop: "Three-column dashboard layout (Navigation left, Main feed center, Widgets right)."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/dashboard/overview",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { spaces: Array<MemorySpace>, recentMemories: Array<Memory>, todayInHistory: Array<Memory>, storageUsedBytes: number } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / api-gateway",
      databaseTables: ["memories", "memory_spaces", "space_storage_quotas"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["dashboard.viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Strict tenant isolation: only spaces where user has verified membership are fetched."
    },
    testCriteria: {
      unit: ["renders today in history memory when date matches current month/day", "opens quick capture sheet on + click"],
      integration: ["GET /api/dashboard/overview returns authenticated user spaces and memories"],
      e2e: ["loads dashboard, verifies memory feed items, clicks Quick Capture"]
    },
    uiComponents: ["AppHeader", "TodayInHistoryBanner", "QuickCaptureBar", "MemoryCard", "BookshelfWidget"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-20",
    category: "Web & PWA — Spaces & People",
    name: "All Memory Spaces Directory Grid",
    userGoal: "View, filter, and switch between all owned and shared memory spaces.",
    userStory: "As a member of multiple spaces (e.g. maternal family, paternal family, personal), I want to browse my spaces with member counts and role badges.",
    entryExitRoutes: {
      entry: ["/spaces", "/dashboard"],
      exit: ["/spaces/:spaceId", "/spaces/new"],
      back: "/dashboard",
      deepLink: "https://memoria.local/spaces"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_spaces_directory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'Your Memory Spaces' with '+ Create New Space' button and search input.",
      main: "Grid of Space Cards: Space Cover, Name, Role badge (Owner, Editor, Contributor), Member avatars, Memory count, Last activity timestamp.",
      footer: "Archived spaces link."
    },
    exactControls: [
      "Button: '+ Create New Space'",
      "Search spaces input field",
      "Space card click (navigates to space overview)",
      "Space settings gear button on owned spaces"
    ],
    keyboardFocus: {
      initialFocus: "Search spaces input",
      tabOrder: ["Create space button", "Search input", "Space cards in grid"],
      escapeBehavior: "Clears search query"
    },
    statesMatrix: {
      loading: "6-card space grid skeleton.",
      empty: "Empty directory prompt with '+ Create First Space' button.",
      populated: "Cards styled with distinct cover colors and member counts.",
      error: "Error banner with retry button.",
      offline: "Cached space directory rendered from IndexedDB.",
      permissionDenied: "Redirect to login."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Memory spaces directory listing all owned and shared spaces.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column card list.",
      tablet: "Two-column grid.",
      desktop: "Three-column grid with subtle hover elevation."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { items: Array<MemorySpace & { role: string, memberCount: number, memoryCount: number }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memory_spaces", "space_members"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Only spaces with active user membership returned."
    },
    testCriteria: {
      unit: ["filters space cards by search text", "displays correct role badge"],
      integration: ["GET /api/spaces returns only member's spaces"],
      e2e: ["navigates to /spaces, searches space name, clicks card to enter space"]
    },
    uiComponents: ["SpaceGrid", "SpaceCard", "SearchInput", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-21",
    category: "Web & PWA — Spaces & People",
    name: "Create / Edit Memory Space Modal & View",
    userGoal: "Configure a memory space's name, description, cover color/photo, default privacy, and archival settings.",
    userStory: "As a space owner, I want to edit our space details and cover photo so that our family members feel warmly welcomed.",
    entryExitRoutes: {
      entry: ["/spaces/new", "/spaces/:spaceId/settings"],
      exit: ["/spaces/:spaceId", "/spaces"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/edit"
    },
    personasPermissions: {
      roles: ["Space Owner", "Space Editor"],
      capabilities: ["edit_space_metadata"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Modal title: 'Create Memory Space' or 'Edit Space Details' with close (X) button.",
      main: "Form fields: Space Name, Subtitle / Description, Space Type dropdown (Family, Personal, Event, Journey), Cover Theme / Image upload, Visibility defaults.",
      footer: "Cancel button and Save / Create Space button."
    },
    exactControls: [
      "Space Name input field",
      "Description textarea",
      "Type dropdown selector",
      "Cover image upload / color swatch selector",
      "Save Changes button",
      "Cancel / Close button"
    ],
    formValidation: {
      fields: [
        { name: "name", type: "text", required: true, limits: "1-100 characters", errorCopy: "Space name is required." },
        { name: "description", type: "text", required: false, limits: "0-1000 characters" }
      ]
    },
    keyboardFocus: {
      initialFocus: "Space Name input field",
      tabOrder: ["Space Name", "Description", "Type", "Cover Upload", "Cancel", "Save"],
      escapeBehavior: "Closes modal with unsaved changes prompt if form is dirty"
    },
    statesMatrix: {
      loading: "Saving changes spinner; button disabled.",
      empty: "Clean fields for creation.",
      populated: "Pre-filled with existing space metadata.",
      error: "Inline validation errors or server conflict banner.",
      offline: "Draft stored locally in IndexedDB.",
      permissionDenied: "Alert indicating only Owners and Editors can update space metadata."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Space configuration modal. Enter space name, description, and cover style.",
      touchTargetMin: "44x44 px",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full screen sheet.",
      tablet: "Centered modal max-width 560px.",
      desktop: "Centered modal max-width 640px."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/spaces/:spaceId",
      authType: "Bearer JWT",
      requestBody: "{ name: string, description?: string, coverUrl?: string, type?: SpaceType }",
      responseBody: "{ success: true, data: { space: MemorySpace } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memory_spaces"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.space_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Space modifications logged in tenant audit log."
    },
    testCriteria: {
      unit: ["prevents submission with empty space name", "warns on dirty exit"],
      integration: ["PUT /api/spaces/:spaceId updates database and verifies authorization"],
      e2e: ["edits space description, clicks Save, observes updated banner"]
    },
    uiComponents: ["Modal", "InputField", "ColorSwatchPicker", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-22",
    category: "Web & PWA — Spaces & People",
    name: "Memory Space Overview & Featured Stories",
    userGoal: "Explore a specific Memory Space's featured stories, recent member contributions, milestone snippets, and navigation tabs.",
    userStory: "As a space contributor, I want to view our family space overview so that I can see the latest additions and navigate to timeline or members.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId", "/spaces"],
      exit: ["/spaces/:spaceId/timeline", "/spaces/:spaceId/members", "/spaces/:spaceId/books", "/create-memory?spaceId=:spaceId"],
      back: "/spaces",
      deepLink: "https://memoria.local/spaces/:spaceId"
    },
    personasPermissions: {
      roles: ["Space Member (Owner, Editor, Contributor, Viewer)"],
      capabilities: ["view_space_overview"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Space hero banner with cover photography, space name, member badge count, '+ Add Memory' button, and tab bar (Overview, Timeline, People, Collections, Books, Settings).",
      main: "1. Featured archival memory spotlight card, 2. Recent stories carousel, 3. Chronological timeline preview, 4. Contributor avatars strip.",
      footer: "Space storage quota widget."
    },
    exactControls: [
      "Navigation Tabs (Overview, Timeline, People, Collections, Books, Settings)",
      "Primary Button: '+ Add to this Space'",
      "Memory spotlight card click (opens memory detail modal)",
      "Invite members button"
    ],
    keyboardFocus: {
      initialFocus: "Active tab (Overview)",
      tabOrder: ["Navigation tabs", "+ Add Memory button", "Featured card", "Recent cards", "Member avatars"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Space hero and featured card skeletons.",
      empty: "Notice inviting contributors to add the space's first memory.",
      populated: "Warm ivory canvas with featured photographic spotlight and contributor avatars.",
      error: "Error banner if space fails to load.",
      offline: "Offline indicator with cached space overview.",
      permissionDenied: "403 Forbidden screen if user is not a member."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Memory space overview for Morrison Family Archive. Lists tabs, featured memories, and contributors.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Compact hero banner, horizontal scrolling tabs, stacked memory feed.",
      tablet: "Hero banner with inline tabs, two-column content grid.",
      desktop: "Cinematic hero banner with archival serif typography, 3-column structured layout."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { space: MemorySpace, memberCount: number, recentMemories: Array<Memory>, featuredMemory: Memory } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden", "404 Not Found"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memory_spaces", "memories", "space_members"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["space.overview_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Restricted to authorized space members."
    },
    testCriteria: {
      unit: ["renders tabs and checks authorization role for Settings tab", "highlights active tab"],
      integration: ["GET /api/spaces/:spaceId checks user membership"],
      e2e: ["navigates between space tabs and clicks + Add Memory"]
    },
    uiComponents: ["SpaceHero", "TabBar", "FeaturedMemoryCard", "ContributorStrip", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-23",
    category: "Web & PWA — Spaces & People",
    name: "Space-Specific Chronological Timeline View",
    userGoal: "Explore the family timeline chronologically with year/decade jump index, milestones, and filtered view.",
    userStory: "As a family member, I want to scroll through our chronological timeline from 1950 to 2024 so I can trace generations and milestones in order.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/timeline", "/spaces/:spaceId"],
      exit: ["/memories/:memoryId", "/spaces/:spaceId/timeline?year=:year"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/timeline"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_timeline"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Timeline filter bar: Search memories, Filter by Profile, Filter by Tag, Year range slider.",
      main: "Chronological vertical spine: Year markers (e.g. '1974', '1982', '2004'), memory milestone cards with capture dates, thumbnails, and written story excerpts.",
      aside: "Sticky Year Jump Index right sidebar (decades: 1950s, 60s, 70s, 80s, 90s, 2000s, 2010s, 2020s).",
      footer: "Timeline end marker."
    },
    exactControls: [
      "Decade / Year jump pills (scrolling anchor)",
      "Profile filter dropdown",
      "Memory card click (opens detail modal)",
      "Sort toggle (Oldest First / Newest First)"
    ],
    keyboardFocus: {
      initialFocus: "First decade jump pill",
      tabOrder: ["Filter bar", "Decade pills", "Memory milestone cards"],
      shortcuts: ["PageDown (Next year)", "PageUp (Previous year)"],
      escapeBehavior: "Clears active filters"
    },
    statesMatrix: {
      loading: "Timeline spine with pulsating card skeletons.",
      empty: "Notice: 'No memories recorded for this era yet. Add the first story from this year.'",
      populated: "Beautiful vertical spine in Soft Sage #849483 with Warm Ivory milestone cards.",
      error: "Error banner with reload button.",
      offline: "Cached timeline rendered with offline status badge.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Chronological timeline view. Year markers and memory cards arranged in historical sequence.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single side vertical timeline with horizontal scrolling year jump bar at top.",
      tablet: "Alternating left-right timeline cards along central spine.",
      desktop: "Alternating milestone cards with sticky decade jump navigation sidebar."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/timeline",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { timeline: Array<{ year: number, memories: Array<Memory> }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memories", "memory_media", "space_profiles"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["timeline.browsed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Historical dates rendered in local capture timezone."
    },
    testCriteria: {
      unit: ["groups memories correctly by capture year", "handles leap years and BC dates"],
      integration: ["GET /api/spaces/:spaceId/timeline orders memories by captured_at ASC"],
      e2e: ["clicks 1980s decade pill, scrolls smoothly to target year marker"]
    },
    uiComponents: ["TimelineSpine", "YearMarker", "MilestoneCard", "DecadeJumpNav"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-24",
    category: "Web & PWA — Spaces & People",
    name: "Space Member Directory & Role Roster",
    userGoal: "Review all contributors in the space, inspect their assigned roles, and manage permissions.",
    userStory: "As a space owner, I want to view our member roster and change a relative from Viewer to Contributor so they can upload family photos.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/members", "/spaces/:spaceId"],
      exit: ["/spaces/:spaceId/invitations", "/spaces/:spaceId"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/members"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_members", "manage_members (Owner/Editor only)"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Member roster title, '+ Invite New Member' button, and search input.",
      main: "Member list table: Avatar, Name, Email (masked for non-owners), Role badge (Owner, Editor, Contributor, Viewer), Joined Date, Contribution count, Role dropdown / Remove button (Owners only).",
      footer: "Role capability definitions legend."
    },
    exactControls: [
      "Button: '+ Invite Member'",
      "Member search input",
      "Role selector dropdown (Owner only)",
      "Remove member action button (with confirmation modal)",
      "Leave Space button"
    ],
    keyboardFocus: {
      initialFocus: "Member search input",
      tabOrder: ["Invite button", "Search input", "Member rows", "Role dropdowns", "Action buttons"],
      escapeBehavior: "Closes confirmation dialog"
    },
    statesMatrix: {
      loading: "Table rows skeleton pulse.",
      empty: "N/A (At least 1 owner always exists).",
      populated: "Clean tabular roster with Plum #76556F role badges and clear action triggers.",
      error: "Error banner with refresh action.",
      offline: "Cached roster displayed.",
      permissionDenied: "403 Forbidden alert if non-member."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Space member directory with roles and contribution counts.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Card list format with avatar, name, role badge, and kebab menu.",
      tablet: "Table view with simplified columns.",
      desktop: "Full data table with activity count and inline role editing."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/members",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { members: Array<{ userId: string, fullName: string, email: string, role: string, joinedAt: string, contributionCount: number }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service / identity-service",
      databaseTables: ["space_members", "users"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.member_role_changed", "collab.member_removed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: true,
      privacyNotes: "Member email addresses masked unless viewer is Space Owner."
    },
    testCriteria: {
      unit: ["prevents removing the sole remaining Space Owner", "masks emails for non-owners"],
      integration: ["PATCH /api/spaces/:spaceId/members/:userId updates role in space_members"],
      e2e: ["updates contributor role to Editor and confirms updated badge"]
    },
    uiComponents: ["MemberTable", "RoleBadge", "InviteModal", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "PWA-25",
    category: "Web & PWA — Spaces & People",
    name: "Space Settings, Privacy & Danger Zone",
    userGoal: "Manage space-level privacy rules, storage quotas, data export, space ownership transfer, or archival deletion.",
    userStory: "As a space owner, I want to configure sharing permissions, export our complete archive, or transfer ownership safely.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/settings", "/spaces/:spaceId"],
      exit: ["/spaces/:spaceId", "/spaces"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/settings"
    },
    personasPermissions: {
      roles: ["Space Owner"],
      capabilities: ["manage_space_settings", "delete_space"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Settings navigation tabs (General, Privacy & Sharing, Storage & Export, Danger Zone).",
      main: "Section 1: General Metadata, Section 2: Default link expiration rules, Section 3: One-click Full Archive Export (ZIP + JSON metadata), Section 4: Danger Zone (Transfer Ownership, Archive Space, Permanently Delete Space).",
      footer: "Save Changes floating banner."
    },
    exactControls: [
      "Button: 'Export Entire Space (ZIP)'",
      "Button: 'Transfer Space Ownership'",
      "Button: 'Archive Space (Read-only)'",
      "Destructive Button: 'Permanently Delete Space' (Requires typing space name to confirm)"
    ],
    keyboardFocus: {
      initialFocus: "First setting input",
      tabOrder: ["Settings tabs", "General inputs", "Export button", "Transfer button", "Delete button"],
      escapeBehavior: "Closes modal dialogs"
    },
    statesMatrix: {
      loading: "Settings form loading skeleton.",
      empty: "N/A",
      populated: "Form populated with current space privacy rules and storage usage breakdown.",
      error: "Error banner with actionable message.",
      offline: "Settings updates disabled while offline.",
      permissionDenied: "403 Forbidden screen: Only the Space Owner can access Space Settings."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Space settings. Privacy, export, and danger zone operations.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Stacked vertical settings sections.",
      tablet: "Left vertical settings menu, right content pane.",
      desktop: "Max-width 960px settings layout with dedicated danger zone card."
    },
    apiContract: {
      method: "DELETE",
      endpoint: "/api/spaces/:spaceId",
      authType: "Bearer JWT",
      requestBody: "{ confirmationName: string }",
      responseBody: "{ success: true, data: { scheduledDeletionDate: string } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["memory_spaces", "audit_logs"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.space_deleted", "memory.space_archived"],
      bullmqJobs: ["schedule-space-data-cleanup"]
    },
    auditPrivacy: {
      piiLevel: "Admin Audited",
      auditLogged: true,
      privacyNotes: "Destructive space operations require exact name match confirmation and are immutable in audit logs."
    },
    testCriteria: {
      unit: ["requires exact space name matching before enabling delete button", "validates owner role"],
      integration: ["DELETE /api/spaces/:spaceId soft-deletes space and records audit log"],
      e2e: ["navigates to settings, requests ZIP export, verifies export job started"]
    },
    uiComponents: ["SettingsLayout", "ExportButton", "DangerZoneCard", "ConfirmModal"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "PWA-26",
    category: "Web & PWA — Spaces & People",
    name: "People & Profiles Directory",
    userGoal: "Browse and search all individuals, children, pets, ancestors, and couples associated with the space.",
    userStory: "As a family storyteller, I want to view all people profiles so I can find every memory connected to my grandfather.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/people", "/spaces/:spaceId"],
      exit: ["/spaces/:spaceId/people/:profileId", "/spaces/:spaceId/people/new"],
      back: "/spaces/:spaceId",
      deepLink: "https://memoria.local/spaces/:spaceId/people"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_profiles"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title 'People & Profiles' with '+ Add Person' button and search input.",
      main: "Grid of Profile Avatar Cards: Avatar photograph, Full Name, Relationship tag, Profile Type badge (Child, Ancestor, Pet), Number of tagged memories.",
      footer: "Profile count summary."
    },
    exactControls: [
      "Button: '+ Add Person'",
      "Profile search bar",
      "Type filter pills (All, Immediate Family, Ancestors, Pets)",
      "Profile card click (navigates to profile detail)"
    ],
    keyboardFocus: {
      initialFocus: "Profile search bar",
      tabOrder: ["Add Person button", "Search bar", "Filter pills", "Profile cards"],
      escapeBehavior: "Clears search bar"
    },
    statesMatrix: {
      loading: "Profile card grid skeleton.",
      empty: "Notice: 'No profiles created yet. Add family members to organize memories by person.'",
      populated: "Warm circular avatars with name badges and story counters.",
      error: "Error banner with refresh button.",
      offline: "Cached profiles rendered from local database.",
      permissionDenied: "403 Forbidden if non-member."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "People and profiles directory with avatars, relationships, and memory counts.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "2-column profile card grid.",
      tablet: "3 or 4-column grid.",
      desktop: "4 or 5-column balanced avatar grid."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/profiles",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { profiles: Array<SpaceProfile & { memoryCount: number }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["space_profiles", "memory_profiles"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Profiles protected within space tenant boundaries."
    },
    testCriteria: {
      unit: ["filters profile grid by name query", "displays correct profile type pill"],
      integration: ["GET /api/spaces/:spaceId/profiles returns profiles for space"],
      e2e: ["searches grandfather profile, clicks card, navigates to profile detail"]
    },
    uiComponents: ["ProfileGrid", "ProfileCard", "SearchInput", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-27",
    category: "Web & PWA — Spaces & People",
    name: "Profile Detail & Person Biography View",
    userGoal: "Inspect a person's biography, milestones, birthdate, linked memory timeline, and photo highlights.",
    userStory: "As a grandchild, I want to explore my grandmother's dedicated profile view so I can read her biography and see all photos of her.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/people/:profileId", "/spaces/:spaceId/people"],
      exit: ["/spaces/:spaceId/people/:profileId/edit", "/memories/:memoryId"],
      back: "/spaces/:spaceId/people",
      deepLink: "https://memoria.local/spaces/:spaceId/people/:profileId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_profile_detail", "edit_profile (Contributor+)"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Profile hero: Large circular avatar portrait, Full Name, Relationship (e.g. 'Paternal Grandmother 1928–2018'), 'Edit Profile' button.",
      main: "1. Biography narrative card, 2. Life Milestones chronological strip, 3. Tagged Memories photo grid, 4. Associated Books section.",
      footer: "Profile metadata note."
    },
    exactControls: [
      "Button: 'Edit Profile'",
      "Button: '+ Tag in New Memory'",
      "Memory card click (opens memory modal)",
      "Filter memories by year pills"
    ],
    keyboardFocus: {
      initialFocus: "Biography heading",
      tabOrder: ["Edit Profile button", "+ Tag Memory button", "Milestone cards", "Memory grid"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Profile hero and memory grid skeletons.",
      empty: "Notice: 'No memories tagged with this person yet.' with + Tag Memory action.",
      populated: "Rich profile layout with archival portrait, biography text, and chronological photo grid.",
      error: "Error banner if profile not found.",
      offline: "Cached profile view accessible offline.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Profile details for Eleanor Morrison. Biography, milestones, and tagged memories.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Centered avatar, stacked biography and single-column memory feed.",
      tablet: "Two-column layout (Profile card left, Memory feed right).",
      desktop: "Three-column layout with biographical milestones in sticky sidebar."
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/profiles/:profileId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { profile: SpaceProfile, memories: Array<Memory>, milestones: Array<any> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["space_profiles", "memory_profiles", "memories"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["profile.detail_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Sensitive family milestones protected."
    },
    testCriteria: {
      unit: ["formats lifespan dates correctly e.g. 1928–2018", "renders linked memory count"],
      integration: ["GET /api/spaces/:spaceId/profiles/:profileId returns profile with linked memories"],
      e2e: ["views grandmother profile, inspects biography, clicks memory thumbnail"]
    },
    uiComponents: ["ProfileHero", "BiographyCard", "MilestoneStrip", "MemoryGrid", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "PWA-28",
    category: "Web & PWA — Spaces & People",
    name: "Create / Edit Profile View with Avatar Cropping",
    userGoal: "Create or edit a person profile with name, category, birthdate, relationship, and avatar cropping.",
    userStory: "As an archivist, I want to edit my child's profile photo and crop her face cleanly so her portrait looks sharp throughout the archive.",
    entryExitRoutes: {
      entry: ["/spaces/:spaceId/people/new", "/spaces/:spaceId/people/:profileId/edit"],
      exit: ["/spaces/:spaceId/people/:profileId", "/spaces/:spaceId/people"],
      back: "/spaces/:spaceId/people",
      deepLink: "https://memoria.local/spaces/:spaceId/people/:profileId/edit"
    },
    personasPermissions: {
      roles: ["Space Member (Owner, Editor, Contributor)"],
      capabilities: ["edit_profile"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Title: 'Edit Profile' or 'Add Person' with cancel button.",
      main: "Form: 1. Avatar Photo Picker with circular crop preview, 2. Profile Category (Individual, Child, Pet, Couple, Ancestor), 3. Full Name, 4. Relationship, 5. Birth Date & Passing Date (optional), 6. Biography textarea.",
      footer: "Save Profile button and Cancel button."
    },
    exactControls: [
      "Avatar Upload & Interactive Crop Modal trigger",
      "Profile Type radio pills",
      "Full Name input",
      "Relationship input",
      "Birth Date picker",
      "Passing Date picker (optional)",
      "Biography textarea",
      "Save Profile Button"
    ],
    formValidation: {
      fields: [
        { name: "name", type: "text", required: true, limits: "1-100 characters", errorCopy: "Name is required." },
        { name: "type", type: "select", required: true, errorCopy: "Please choose a category." },
        { name: "biography", type: "textarea", required: false, limits: "0-5000 characters" }
      ]
    },
    keyboardFocus: {
      initialFocus: "Full Name input field",
      tabOrder: ["Avatar upload", "Type pills", "Full Name", "Relationship", "Birth Date", "Biography", "Save button"],
      escapeBehavior: "Prompts on unsaved changes"
    },
    statesMatrix: {
      loading: "Saving profile spinner.",
      empty: "Fresh inputs.",
      populated: "Pre-filled with existing profile data.",
      error: "Inline validation error alerts.",
      offline: "Queued in IndexedDB.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA",
      voiceOverSummary: "Profile editor form. Edit name, dates, relationship, and portrait avatar.",
      touchTargetMin: "44x44 px",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full width form.",
      tablet: "Centered 560px card.",
      desktop: "Centered 640px card with side-by-side avatar preview."
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/spaces/:spaceId/profiles/:profileId",
      authType: "Bearer JWT",
      requestBody: "{ name: string, type: ProfileType, relationship?: string, birthDate?: string, avatarMediaId?: string }",
      responseBody: "{ success: true, data: { profile: SpaceProfile } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["space_profiles"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.profile_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Biographical details protected by space isolation."
    },
    testCriteria: {
      unit: ["validates name requirement", "handles circular crop coordinate calculation"],
      integration: ["PUT /api/spaces/:spaceId/profiles/:profileId updates profile"],
      e2e: ["edits biography, uploads avatar, clicks Save, confirms updated detail"]
    },
    uiComponents: ["ProfileForm", "AvatarCropper", "Button"],
    verifiedStatus: "Implemented & Verified"
  }
];

