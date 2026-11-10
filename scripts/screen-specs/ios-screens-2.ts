import { ScreenSpec } from "./types.js";

export const iosScreens2: ScreenSpec[] = [
  // ==========================================
  // 2.4 CONTINUED: BROWSING & MANAGEMENT (IOS-29 to IOS-34)
  // ==========================================
  {
    id: "IOS-29",
    category: "Native iOS — Browsing & Management",
    name: "AVPlayer Native Video Playback View",
    userGoal: "Watch recorded family video memories with native hardware-accelerated AVPlayer, scrubbing controls, and AirPlay streaming.",
    userStory: "As a family member, I want to watch high-definition video memories with smooth scrubbing and AirPlay support on my iOS device.",
    entryExitRoutes: {
      entry: ["IOS-24 Media Grid", "IOS-26 Memory Detail", "memoria://video/:mediaId"],
      exit: ["IOS-26 Memory Detail", "IOS-28 Image/Video Editor"],
      back: "IOS-26",
      deepLink: "memoria://video/:mediaId"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_media", "stream_video"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Dismiss close button, AirPlay route picker button, title overlay with capture date.",
      main: "AVPlayerLayer with native video canvas, gesture controls (double tap to skip 10s, pinch to zoom), custom scrubber with thumbnail preview track.",
      footer: "Playback controls bar (Play/Pause, time elapsed/remaining, volume, picture-in-picture button)."
    },
    exactControls: [
      "AVPlayerViewController / Custom AVPlayer controls",
      "Play/Pause toggle button",
      "ScrubberSlider with AVAssetImageGenerator thumbnail preview",
      "10-second Rewind and Forward buttons",
      "Picture-in-Picture (AVPictureInPictureController) button",
      "AirPlay route picker button"
    ],
    keyboardFocus: {
      initialFocus: "Play/Pause button",
      tabOrder: ["Dismiss", "AirPlay", "Video Canvas", "Scrubber", "Play/Pause", "Skip buttons", "PiP"],
      escapeBehavior: "Dismisses full screen video"
    },
    statesMatrix: {
      loading: "AVPlayer status .unknown spinner on black backdrop.",
      empty: "Notice: 'Video asset unavailable.'",
      populated: "Active video playback with smooth 60fps rendering via Metal AVPlayerLayer.",
      error: "Alert: 'Video failed to play. Check connection or file format.' with Retry button.",
      offline: "Plays cached video asset from local Caches/media/ if previously downloaded.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Video player for family memory. Duration and elapsed time reported dynamically. Double tap to toggle play/pause.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "14:1 (White controls over dark video overlay)"
    },
    responsive: {
      mobile: "Full screen portrait or landscape rotation with auto-hiding controls after 3 seconds.",
      tablet: "Modal presentation or split view on iPad with picture-in-picture option.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/media/:mediaId/stream",
      authType: "Bearer JWT",
      responseBody: "Binary video stream (HLS / MP4 chunk) with range headers 206 Partial Content",
      statusCodes: ["200 OK", "206 Partial Content", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "media-service / Local Disk Storage",
      databaseTables: ["media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["media.streamed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Encrypted stream URL; video memory protected under space tenant boundaries."
    },
    testCriteria: {
      unit: ["initializes AVPlayerItem with authenticated media URL", "handles backgrounding and PiP transitions"],
      integration: ["GET /api/media/:mediaId/stream supports 206 range requests"],
      e2e: ["taps video thumbnail, verifies playback starts, scrubs forward 30 seconds"]
    },
    uiComponents: ["AVPlayerCanvasView", "VideoScrubberSlider", "AirPlayPicker", "PlaybackControlBar"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-30",
    category: "Native iOS — Browsing & Management",
    name: "Audio Player with Synchronized Transcript View",
    userGoal: "Listen to recorded elder voice notes or oral history audio with synchronized scrolling transcript.",
    userStory: "As a grandchild, I want to listen to Grandma's voice note while watching the spoken words highlight in real time so I can follow every treasured detail.",
    entryExitRoutes: {
      entry: ["IOS-26 Memory Detail", "memoria://audio/:memoryId"],
      exit: ["IOS-26 Memory Detail", "IOS-27 Edit Memory"],
      back: "IOS-26",
      deepLink: "memoria://audio/:memoryId"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["listen_audio", "read_transcript"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Audio Story', speaker avatar, and close sheet button.",
      main: "1. Animated waveform visualizer reflecting amplitude, 2. Synchronized transcript list (ScrollView with highlighted sentence based on currentTime), 3. Audio scrubber slider with timestamp labels.",
      footer: "Playback controls (0.75x, 1x, 1.25x speed selector, Play/Pause, 15s skip buttons)."
    },
    exactControls: [
      "Waveform visualizer scrubber",
      "Play/Pause button (large circular Ivory/Ink)",
      "15-second skip backward and forward buttons",
      "Playback speed selector menu (0.75x, 1x, 1.25x, 1.5x)",
      "Transcript sentence tap gesture (scrubs audio directly to timestamp)",
      "Copy transcript button"
    ],
    keyboardFocus: {
      initialFocus: "Play/Pause button",
      tabOrder: ["Close button", "Waveform", "Transcript", "Play/Pause", "Skip backward", "Skip forward", "Speed menu"],
      escapeBehavior: "Dismisses audio player sheet"
    },
    statesMatrix: {
      loading: "Waveform shimmer and transcript skeleton pulse.",
      empty: "Displays audio player with placeholder: 'Transcript generating via Whisper engine...'",
      populated: "Waveform oscillates with audio power; transcript auto-scrolls with active sentence highlighted in Warm Ochre.",
      error: "Alert: 'Audio decoding failed.' with Retry button.",
      offline: "Plays cached audio from local cache; cached transcript rendered from SQLite.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Audio story player with real-time transcript. VoiceOver announces spoken words and playback progress.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1 (Deep Ink on Warm Ivory)"
    },
    responsive: {
      mobile: "Half-sheet or full modal presentation with swipe down dismissal.",
      tablet: "Side panel or floating inspector on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/memories/:memoryId/audio-transcript",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { audioUrl: string, durationSeconds: number, transcript: Array<{ start: number, end: number, text: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memories", "media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["audio.played"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Voice recordings and transcriptions contain family oral histories; zero third-party leakage."
    },
    testCriteria: {
      unit: ["syncs active transcript line with audio playback time", "handles audio interruptions (phone call) gracefully"],
      integration: ["GET /api/memories/:memoryId/audio-transcript returns valid timestamps"],
      e2e: ["plays voice note, taps on transcript sentence at 0:45, verifies playback jumps to 0:45"]
    },
    uiComponents: ["AudioWaveformVisualizer", "TranscriptScrollView", "AudioPlaybackBar", "SpeedSelectorMenu"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-31",
    category: "Native iOS — Browsing & Management",
    name: "Favorites Filter View & Quick Collection",
    userGoal: "Quickly view starred and treasured family moments filtered by favorites flag across all media formats.",
    userStory: "As a family curator, I want to quickly pull up all starred heirloom memories so I can select them for the annual print book.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar", "IOS-23 Timeline", "IOS-24 Grid"],
      exit: ["IOS-26 Memory Detail", "IOS-45 Book Creator Wizard"],
      back: "IOS-11",
      deepLink: "memoria://favorites"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_favorites"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Treasured Memories' title, Star icon counter, and 'Create Book' action.",
      main: "2-column Masonry photo and story card feed of all is_favorite=true memories; filter chip bar (All, Photos, Stories, Audio).",
      footer: "Batch selection floating pill ('Add X items to Book')."
    },
    exactControls: [
      "Format filter chips (All, Photos, Audio, Stories)",
      "Favorite star button on each card (toggles is_favorite)",
      "Card tap gesture (opens IOS-26)",
      "Select mode toggle button in toolbar",
      "Floating 'Create Book from Favorites' CTA"
    ],
    keyboardFocus: {
      initialFocus: "First favorite card",
      tabOrder: ["Filter chips", "Cards", "Select mode", "Create Book CTA"],
      escapeBehavior: "Dismisses selection mode"
    },
    statesMatrix: {
      loading: "Masonry shimmer skeleton with golden star badges.",
      empty: "Notice: 'No treasured memories yet. Tap the star icon on any memory to collect it here.'",
      populated: "Rich masonry grid of starred memories with gold star badge and capture date.",
      error: "Error banner with refresh button.",
      offline: "Loads favorites from local SQLite database seamlessly.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Favorites archive. Starred family memories list. Double tap memory to view.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "2-column masonry grid on iPhone.",
      tablet: "3 or 4-column masonry grid on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/memories",
      authType: "Bearer JWT",
      requestBody: "Query: { is_favorite: true }",
      responseBody: "{ success: true, data: { items: Array<Memory> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
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
      privacyNotes: "Favorite tags kept private within space boundary."
    },
    testCriteria: {
      unit: ["filters memory store by is_favorite == true", "optimistically updates star state"],
      integration: ["GET /api/spaces/:spaceId/memories?is_favorite=true returns only starred memories"],
      e2e: ["toggles favorite on memory, opens Favorites view, verifies memory appears"]
    },
    uiComponents: ["MasonryGridView", "MemoryCard", "FavoriteToggleBadge", "FilterChipBar", "FloatingCTAButton"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-32",
    category: "Native iOS — Browsing & Management",
    name: "Collections & Thematic Albums Library",
    userGoal: "Browse and manage thematic albums (e.g., 'Summer Vacations', 'Family Recipes', 'Baby Firsts', 'Military Service') on iOS.",
    userStory: "As an archivist, I want to see our thematic memory collections in beautiful card albums so that our stories are structured logically.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar (Collections)", "IOS-23"],
      exit: ["IOS-33 Collection Detail", "IOS-32 New Collection Sheet"],
      back: "IOS-11",
      deepLink: "memoria://collections"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_collections", "create_collection"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Collections' title, search bar, and '+' create album button.",
      main: "Card list / 2-column grid of collections: Cover image collage with linen texture border, collection title, memory count badge, and contributors avatars.",
      footer: "Total collections count."
    },
    exactControls: [
      "Create Collection '+' button in toolbar",
      "Search Collections text field",
      "Collection card tap (opens IOS-33)",
      "Context menu on collection card (Edit, Share, Delete)",
      "Sort order selector (Recent, Alphabetical, Memory Count)"
    ],
    keyboardFocus: {
      initialFocus: "Search collections field",
      tabOrder: ["Create button", "Search field", "Sort menu", "Collection cards"],
      escapeBehavior: "Clears search filter"
    },
    statesMatrix: {
      loading: "Collection cards skeleton pulse.",
      empty: "Archival placeholder: 'No collections yet. Group your memories into thematic chapters like Summer Vacations or Milestones.' with 'Create Collection' button.",
      populated: "Rich cards with album cover composites and Cormorant Garamond typography.",
      error: "Error banner with retry.",
      offline: "Rendered from SQLite collection table cache.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Collections list. Shows themed memory collections with counts. Double tap to open.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column list or 2-column grid on iPhone.",
      tablet: "3-column grid with wide album cover cards on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/collections",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { collections: Array<Collection> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memory_spaces", "memories"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: false,
      privacyNotes: "Collection names and cover selections restricted to space members."
    },
    testCriteria: {
      unit: ["sorts collections by recent activity", "filters collections via search query"],
      integration: ["GET /api/spaces/:spaceId/collections returns collections list with item counts"],
      e2e: ["taps '+' button, creates 'Summer 1990' album, verifies it appears in list"]
    },
    uiComponents: ["CollectionGrid", "CollectionCard", "AlbumCoverCollage", "SearchTextField", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-33",
    category: "Native iOS — Browsing & Management",
    name: "Collection Detail & Memory Curator View",
    userGoal: "View all memories within a specific collection, reorder them, add new memories, or launch book creation from this collection.",
    userStory: "As an archivist, I want to open our 'Grandpa's Letters' collection to read the letters in chronological order and add new scans.",
    entryExitRoutes: {
      entry: ["IOS-32 Collections Library", "memoria://collections/:collectionId"],
      exit: ["IOS-26 Memory Detail", "IOS-45 Book Creator Wizard", "IOS-16 Quick Capture Hub"],
      back: "IOS-32",
      deepLink: "memoria://collections/:collectionId"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_collection", "edit_collection", "add_to_collection"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Collapsing parallax header with collection cover photo, title, description, memory count, and contributor bubbles.",
      main: "Chronological feed or grid of memories in this collection with drag handle to reorder (if custom sort enabled).",
      footer: "Floating action bar: 'Add Memories' and 'Print as Book'."
    },
    exactControls: [
      "Collection Edit button in toolbar",
      "View toggle (Grid vs Timeline)",
      "Add Memories button (opens memory picker sheet)",
      "'Print as Book' primary CTA button",
      "Reorder handle in list view",
      "Memory card tap gesture"
    ],
    keyboardFocus: {
      initialFocus: "Add Memories button",
      tabOrder: ["Edit button", "View toggle", "Collection header", "Memory cards", "Print CTA"],
      escapeBehavior: "Pops navigation stack back to IOS-32"
    },
    statesMatrix: {
      loading: "Parallax header shimmer and memory grid skeleton.",
      empty: "Archival empty state: 'This collection is empty. Tap Add Memories to curate items from your space.'",
      populated: "Rich list of memories with timeline indicators, dates, and media cards.",
      error: "Alert: 'Failed to load collection.' with retry.",
      offline: "Served from local SQLite cache.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Collection detail view. Shows title, description, and curated items. Double tap to open item.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Parallax header with sticky title on scroll, dynamic grid.",
      tablet: "Split-view on iPad with album metadata on left and memory grid on right.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/collections/:collectionId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { collection: Collection, memories: Array<Memory> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
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
      privacyNotes: "Preserves personal notes and letters securely."
    },
    testCriteria: {
      unit: ["parses collection items array", "handles parallax scroll offset calculations"],
      integration: ["GET /api/spaces/:spaceId/collections/:id returns items in specified sort order"],
      e2e: ["opens collection, reorders two items, verifies new order persists"]
    },
    uiComponents: ["ParallaxHeaderView", "MemoryGridView", "ReorderableList", "FloatingActionBar", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-34",
    category: "Native iOS — Browsing & Management",
    name: "Trash & Soft-Delete Restoration Sheet",
    userGoal: "Inspect soft-deleted memories, restore accidentally deleted heirloom items, or permanently purge them within 30-day grace window.",
    userStory: "As a space admin or memory creator, I want to view deleted memories in the trash so that I can restore an accidentally removed photo before 30 days elapse.",
    entryExitRoutes: {
      entry: ["IOS-54 Space Settings", "IOS-13 Space Overview"],
      exit: ["IOS-11 Home Feed", "IOS-54 Settings"],
      back: "IOS-54",
      deepLink: "memoria://trash"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member (own items)"],
      capabilities: ["view_trash", "restore_memory", "purge_memory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Trash' title, 'Select' mode button, and Close sheet button.",
      main: "1. Archival warning banner: 'Items in trash will be permanently purged after 30 days', 2. List of soft-deleted items with thumbnail, title, deletion date, and days remaining badge.",
      footer: "Toolbar buttons: 'Restore All' and 'Empty Trash'."
    },
    exactControls: [
      "Individual item Restore button (curved arrow SF Symbol)",
      "Individual item Permanent Delete button (trash SF Symbol)",
      "Select mode checkbox on cards",
      "Bottom toolbar: 'Restore (X)' and 'Delete Permanently (X)'",
      "Close sheet button"
    ],
    confirmationCancellation: "Permanent deletion requires double confirmation modal: 'This cannot be undone. All original media and metadata will be permanently deleted from local disk.'",
    keyboardFocus: {
      initialFocus: "First trashed item",
      tabOrder: ["Close button", "Warning banner", "Trashed items", "Restore button", "Empty Trash button"],
      escapeBehavior: "Dismisses trash sheet"
    },
    statesMatrix: {
      loading: "Trash list skeleton pulse.",
      empty: "Notice: 'Trash is empty. All heirloom memories are safe in your living archive.'",
      populated: "Cards with soft red accent border, deleted date, and days remaining badge.",
      error: "Error banner with retry.",
      offline: "Action requires network or queued for sync.",
      permissionDenied: "Alert: 'Only space administrators or authors can manage trash.'"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Trash sheet. Lists deleted items with restoration and permanent delete options.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Modal sheet with scrollable list and sticky bottom action bar.",
      tablet: "Form sheet modal on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/trash",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { items: Array<DeletedMemory> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memories", "media_assets", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.restored", "memory.purged"],
      bullmqJobs: ["purge-expired-trash"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Purge removes disk assets and database records permanently."
    },
    testCriteria: {
      unit: ["calculates remaining days from deleted_at + 30 days", "verifies soft-delete filtering"],
      integration: ["POST /api/spaces/:spaceId/trash/restore restores memory.deleted_at to null"],
      e2e: ["deletes memory to trash, opens trash sheet, taps Restore, verifies memory returns to feed"]
    },
    uiComponents: ["TrashListView", "TrashedMemoryCard", "AlertModal", "ToolbarActionBar", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 2.5 PROFILES & COLLABORATION (IOS-35 to IOS-42)
  // ==========================================
  {
    id: "IOS-35",
    category: "Native iOS — Profiles & Collaboration",
    name: "People & Profiles Directory with Family Bubbles",
    userGoal: "Explore family tree members, children, ancestors, and beloved pets in an interactive visual bubble directory.",
    userStory: "As a family member, I want to tap on my grandfather's profile bubble to explore his life milestones, stories, and photographs.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar (People Tab)", "IOS-13 Space Overview"],
      exit: ["IOS-36 Profile Detail", "IOS-37 Create Profile Sheet"],
      back: "IOS-11",
      deepLink: "memoria://people"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_profiles", "create_profile"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'People & Profiles' title, filter segmented control (All, Family, Ancestors, Pets), and '+' button.",
      main: "1. Top horizontal scroll of large featured avatar bubbles with gold archival rings, 2. Alphabetical list of profiles with relationship tags, birth/passing years, and memory counts.",
      footer: "Total profiles count badge."
    },
    exactControls: [
      "Segmented control filter (All, Immediate, Ancestors, Pets)",
      "Add Profile '+' button in navigation bar",
      "Avatar bubble tap (opens IOS-36)",
      "Profile list row tap (opens IOS-36)",
      "Search bar filtering by name or relationship"
    ],
    keyboardFocus: {
      initialFocus: "Search people field",
      tabOrder: ["Add button", "Segmented filter", "Search field", "Avatar bubbles", "Profile rows"],
      escapeBehavior: "Clears search field"
    },
    statesMatrix: {
      loading: "Circular avatar shimmer placeholders and list skeleton.",
      empty: "Notice: 'No profiles created yet. Add family members to tag them in memories.'",
      populated: "Vibrant avatar bubbles with high-res portraits, relationship badges, and memory counts.",
      error: "Error banner with refresh action.",
      offline: "Served from local SQLite space_profiles cache.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Family profiles directory. 12 members. Double tap member to view life milestones and stories.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Avatar bubble carousel on top with full list below on iPhone.",
      tablet: "3-column grid of rich profile cards on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/profiles",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { profiles: Array<Profile> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["space_profiles"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Contains family relationships and birth dates; strictly isolated to space members."
    },
    testCriteria: {
      unit: ["groups profiles by relationship category", "matches search queries across names and aliases"],
      integration: ["GET /api/spaces/:spaceId/profiles returns profiles with media count metadata"],
      e2e: ["taps '+' button, creates child profile, verifies avatar bubble appears"]
    },
    uiComponents: ["AvatarBubbleCarousel", "ProfileRowCell", "SegmentedControl", "SearchTextField", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-36",
    category: "Native iOS — Profiles & Collaboration",
    name: "Profile Milestone Detail & Biographical Archive",
    userGoal: "View an individual's complete biographical dossier, life milestones, tagged memories, and audio oral histories.",
    userStory: "As a grandchild, I want to view my grandmother's profile to see all memories where she is tagged, sorted from her youth to present day.",
    entryExitRoutes: {
      entry: ["IOS-35 People Directory", "IOS-26 Memory Detail (tagged user bubble)"],
      exit: ["IOS-37 Edit Profile Sheet", "IOS-26 Memory Detail", "IOS-45 Create Book for Profile"],
      back: "IOS-35",
      deepLink: "memoria://people/:profileId"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_profile", "edit_profile"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Collapsing hero with large portrait, full name, relationship badge, birth & passing dates, and Edit button.",
      main: "1. Biographical summary & quotes card, 2. Life milestone timeline (Birth, School, Marriage, Career, Milestones), 3. Tagged memories grid.",
      footer: "Primary CTA button: 'Generate Biography Book'."
    },
    exactControls: [
      "Edit Profile button in navigation bar",
      "Milestone card tap gesture",
      "Memory thumbnail tap (opens IOS-26)",
      "'Generate Biography Book' CTA button",
      "Add Milestone '+' button"
    ],
    keyboardFocus: {
      initialFocus: "Edit button",
      tabOrder: ["Edit button", "Hero header", "Milestones", "Memory grid", "Generate Book CTA"],
      escapeBehavior: "Pops navigation view back to IOS-35"
    },
    statesMatrix: {
      loading: "Hero portrait shimmer and timeline skeleton.",
      empty: "Notice: 'No memories or milestones tagged for this person yet.'",
      populated: "Rich biographical page with sepia photo frame, milestone markers, and tagged photos.",
      error: "Error banner with retry.",
      offline: "Cached biographical data and offline photos displayed from SQLite.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Profile for Eleanor Vance. Grandmother. Born May 12, 1932. 48 memories recorded. Double tap to view milestones.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Collapsing hero portrait with vertical milestone timeline on iPhone.",
      tablet: "Two-column layout with biographical dossier on left and memory grid on right on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/profiles/:profileId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { profile: Profile, milestones: Array<Milestone>, memories: Array<Memory> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["space_profiles", "memories", "memory_profiles"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Contains full birth/death dates and personal family history."
    },
    testCriteria: {
      unit: ["sorts tagged memories chronologically by captured_at", "formats life date span correctly"],
      integration: ["GET /api/spaces/:spaceId/profiles/:id returns profile with associated milestones"],
      e2e: ["navigates to Grandma profile, scrolls to 1954 wedding photo, taps photo to view detail"]
    },
    uiComponents: ["ProfileHeroHeader", "MilestoneTimelineView", "MemoryThumbnailGrid", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-37",
    category: "Native iOS — Profiles & Collaboration",
    name: "Profile Creator & Editor Sheet",
    userGoal: "Create or edit a person profile with full name, relationship, birthdate, portrait photo, and biographical notes.",
    userStory: "As a space contributor, I want to create a profile for my newborn daughter with her birth date and baby picture.",
    entryExitRoutes: {
      entry: ["IOS-35 People Directory", "IOS-36 Profile Detail"],
      exit: ["IOS-36 Profile Detail", "IOS-35 People Directory"],
      back: "Cancel sheet dismiss",
      deepLink: "memoria://people/new"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Contributor"],
      capabilities: ["create_profile", "edit_profile"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Cancel' on left, 'New Profile' in center, 'Save' on right.",
      main: "1. Avatar picker button with camera/photos prompt, 2. Full Name TextField, 3. Relationship picker (Self, Parent, Child, Grandparent, Pet, Ancestor), 4. Date of Birth DatePicker, 5. Deceased toggle with Passing Date DatePicker, 6. Short Bio TextEditor.",
      footer: "Privacy disclaimer: 'Profile info is only visible to invited space members.'"
    },
    exactControls: [
      "Avatar photo picker (PhotosPicker / Camera)",
      "Full Name TextField",
      "Relationship menu / picker",
      "Birth Date DatePicker (wheel / graphical style)",
      "Is Deceased toggle switch",
      "Passing Date DatePicker (conditional)",
      "Biography TextEditor",
      "Save button (navigation bar)",
      "Cancel button"
    ],
    formValidation: {
      fields: [
        { name: "name", type: "text", required: true, limits: "1-100 characters", errorCopy: "Please enter a profile name." },
        { name: "relationship", type: "select", required: true, errorCopy: "Please select a relationship." },
        { name: "birthDate", type: "date", required: false, validationRule: "Date must not be in the future", errorCopy: "Birth date cannot be in the future." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Full Name field",
      tabOrder: ["Cancel", "Avatar", "Full Name", "Relationship", "Birth Date", "Deceased Toggle", "Bio", "Save"],
      escapeBehavior: "Prompts if unsaved changes exist"
    },
    statesMatrix: {
      loading: "Save button shows ProgressView; inputs disabled.",
      empty: "Clean form with default avatar placeholder.",
      populated: "Pre-filled with existing profile data when editing.",
      error: "Red inline validation text and UINotificationFeedbackGenerator(.error).",
      offline: "Queues profile mutation into local outbox queue for synchronization.",
      permissionDenied: "Alert: 'You do not have permission to edit profiles in this space.'"
    },
    confirmationCancellation: "If user taps Cancel after modifying fields: ActionSheet 'Discard Unsaved Changes?' with 'Keep Editing' and 'Discard' buttons.",
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Profile editor sheet. Enter name, relationship, and birthday. Double tap Save to finish.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Modal form sheet with keyboard avoidance on iPhone.",
      tablet: "Centered form sheet max-width 540pt on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/profiles",
      authType: "Bearer JWT",
      requestBody: "{ name: string, relationship: string, birthDate?: string, bio?: string, avatarMediaId?: string }",
      responseBody: "{ success: true, data: { profile: Profile } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["space_profiles", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["profile.created", "profile.updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Child profiles and dates protected under strict space permissions."
    },
    testCriteria: {
      unit: ["validates name is not empty", "ensures passing date is after birth date"],
      integration: ["POST /api/spaces/:spaceId/profiles writes to database and stages outbox event"],
      e2e: ["fills profile form, picks avatar, taps Save, verifies profile created in directory"]
    },
    uiComponents: ["PhotosPicker", "TextField", "DatePicker", "Toggle", "TextEditor", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-38",
    category: "Native iOS — Profiles & Collaboration",
    name: "Space Members & Access Governance List",
    userGoal: "Manage collaborative contributors in a memory space, inspect assigned roles, and adjust contributor permissions.",
    userStory: "As a space administrator, I want to see which family members have joined our space and verify that kids are set to Contributor role.",
    entryExitRoutes: {
      entry: ["IOS-13 Space Overview", "IOS-54 Space Settings"],
      exit: ["IOS-39 Invitation Share Sheet", "IOS-40 Role Permission Editor"],
      back: "IOS-13",
      deepLink: "memoria://space/:spaceId/members"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["view_members", "manage_roles"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Space Members' title and 'Invite Member' '+' button.",
      main: "1. Member list grouped by role (Owners, Admins, Contributors, Viewers), 2. Each row displays avatar, user name, email, join date, and current role pill.",
      footer: "Role explanations footer (Owner: Full control; Contributor: Can add memories; Viewer: Read-only)."
    },
    exactControls: [
      "Invite Member button in toolbar",
      "Member row tap (opens IOS-40 if admin)",
      "Swipe-to-remove member action (with confirmation)",
      "Role description info button"
    ],
    confirmationCancellation: "Removing a member triggers modal alert: 'Remove [Name] from space? They will lose access to all memories in this space.'",
    keyboardFocus: {
      initialFocus: "First member row",
      tabOrder: ["Invite button", "Member rows", "Role footer"],
      escapeBehavior: "Pops navigation view back"
    },
    statesMatrix: {
      loading: "Members list skeleton pulse.",
      empty: "Notice: 'You are the only member in this space. Invite family to collaborate!'",
      populated: "Alphabetical rows grouped by role with status badges.",
      error: "Error banner with refresh button.",
      offline: "Cached membership directory from SQLite.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Space members list. 5 members. Double tap member to view or edit permissions.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native inset grouped list on iPhone.",
      tablet: "Sidebar and detail pane on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/members",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { members: Array<SpaceMember> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service / Local SQLite",
      databaseTables: ["space_members", "users"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: false,
      privacyNotes: "Member emails visible only to space administrators."
    },
    testCriteria: {
      unit: ["groups members by role hierarchy (Owner > Admin > Contributor > Viewer)", "prevents removing space owner"],
      integration: ["GET /api/spaces/:spaceId/members returns list of active collaborators"],
      e2e: ["opens member list, taps on contributor, inspects role settings"]
    },
    uiComponents: ["MembersListView", "MemberRowCell", "RolePillBadge", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-39",
    category: "Native iOS — Profiles & Collaboration",
    name: "Native Invitation Link & Share Sheet",
    userGoal: "Generate and share cryptographic invitation links to bring relatives into a memory space via iOS UIActivityViewController.",
    userStory: "As an archivist, I want to tap 'Invite Family' and send an invitation link directly via iMessage or AirDrop to my sister.",
    entryExitRoutes: {
      entry: ["IOS-38 Members List", "IOS-10 Contact Picker Invite", "IOS-13 Space Overview"],
      exit: ["IOS-38 Members List", "System Share Sheet"],
      back: "Dismiss sheet",
      deepLink: "memoria://space/:spaceId/invite"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["create_invite_link"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Invite to Family Archive' with Close 'X' button.",
      main: "1. Space cover emblem and welcome headline, 2. Default assigned role picker (Contributor vs Viewer), 3. Expiration picker (7 days, 30 days, Never), 4. Generated invite link card with 'Copy Link' button, 5. QR Code preview for in-person scanning.",
      footer: "Primary CTA: 'Share via Messages / AirDrop' (opens UIActivityViewController)."
    },
    exactControls: [
      "Role picker menu (Contributor, Viewer)",
      "Link expiration menu",
      "Copy Link button (with 'Copied!' toast confirmation)",
      "QR Code tap gesture (magnifies for scanning)",
      "Native Share Sheet button (UIActivityViewController)",
      "Close button"
    ],
    keyboardFocus: {
      initialFocus: "Share button",
      tabOrder: ["Close button", "Role picker", "Expiration picker", "Copy Link", "Share Button"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Generating cryptographic token spinner.",
      empty: "N/A",
      populated: "Active invite link display with QR code rendered via CoreImage CIFilter.",
      error: "Alert: 'Could not generate invite link.' with retry.",
      offline: "Alert: 'Internet connection required to generate secure invite link.'",
      permissionDenied: "Alert: 'Only space administrators can invite new members.'"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Invitation sheet. Share secure invite link for Vance Family Archive. Double tap to open system share sheet.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Medium detent modal sheet on iPhone.",
      tablet: "Centered modal presentation on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/invites",
      authType: "Bearer JWT",
      requestBody: "{ role: 'contributor' | 'viewer', expiresInDays: number }",
      responseBody: "{ success: true, data: { inviteUrl: string, token: string, expiresAt: string } }",
      statusCodes: ["201 Created", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["space_invitations"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["space.invite_created"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Invitation tokens are cryptographically signed with HMAC-SHA256 and expire automatically."
    },
    testCriteria: {
      unit: ["generates QR code from invite URL with CIFilter", "copies invite text to UIPasteboard"],
      integration: ["POST /api/spaces/:spaceId/invites generates valid cryptographic token in database"],
      e2e: ["generates invite, taps Copy Link, verifies link in clipboard"]
    },
    uiComponents: ["QRCodeImageView", "CopyLinkBox", "UIActivityViewController", "Menu", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-40",
    category: "Native iOS — Profiles & Collaboration",
    name: "Role & Permission Granular Editor",
    userGoal: "Modify a member's role (Admin, Contributor, Viewer) or adjust granular capabilities (upload, delete, export, order books).",
    userStory: "As a space administrator, I want to change Uncle Bob's role to Admin so he can help manage scanned letters and member invites.",
    entryExitRoutes: {
      entry: ["IOS-38 Members List"],
      exit: ["IOS-38 Members List"],
      back: "IOS-38",
      deepLink: "memoria://space/:spaceId/members/:userId/role"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Owner"],
      capabilities: ["change_member_role"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Edit Permissions' and 'Save' button.",
      main: "1. Member profile card (Avatar, name, email, current role), 2. Role selection list (Admin, Contributor, Viewer) with detailed permission checkmarks, 3. Granular override toggles (Allow 3D Book Orders, Allow Media Export, Allow Member Invites).",
      footer: "Destructive button: 'Remove Member from Space'."
    },
    exactControls: [
      "Role selection radio rows (Admin, Contributor, Viewer)",
      "Toggle switch: Can order print books",
      "Toggle switch: Can export full archive",
      "Toggle switch: Can invite new members",
      "Save button in toolbar",
      "Destructive 'Remove Member' button"
    ],
    confirmationCancellation: "Demoting an Admin or removing a member prompts: 'Confirm permission change for [Name]?'",
    keyboardFocus: {
      initialFocus: "Role selection list",
      tabOrder: ["Role rows", "Permission toggles", "Save button", "Remove button"],
      escapeBehavior: "Prompts if unsaved changes exist"
    },
    statesMatrix: {
      loading: "Saving permission updates spinner.",
      empty: "N/A",
      populated: "Current role selected with active capability toggles.",
      error: "Error banner with retry.",
      offline: "Alert: 'Internet connection required to modify security permissions.'",
      permissionDenied: "Alert: 'Only space owners or administrators can change roles.'"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Role editor for Robert Vance. Current role: Contributor. Double tap to change to Admin or Viewer.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Grouped form list on iPhone.",
      tablet: "Centered form sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/spaces/:spaceId/members/:userId",
      authType: "Bearer JWT",
      requestBody: "{ role: 'admin' | 'contributor' | 'viewer', permissionsOverrides?: Record<string, boolean> }",
      responseBody: "{ success: true, data: { member: SpaceMember } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["space_members", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["space.member_role_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Role changes are recorded in immutable security audit logs."
    },
    testCriteria: {
      unit: ["prevents self-demotion if caller is the sole space owner", "maps role to permission flags"],
      integration: ["PATCH /api/spaces/:spaceId/members/:userId updates role in database and publishes event"],
      e2e: ["changes contributor to admin, taps Save, verifies badge updates to Admin in member list"]
    },
    uiComponents: ["RoleSelectionRow", "Toggle", "DestructiveButton", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-41",
    category: "Native iOS — Profiles & Collaboration",
    name: "Collaborative Activity Stream with Pull-to-Refresh",
    userGoal: "Follow recent family uploads, newly published books, audio additions, and member contributions in a real-time activity feed.",
    userStory: "As a family member, I want to pull down to refresh the space activity stream to see what new stories Uncle Dave added today.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar", "IOS-13 Space Overview"],
      exit: ["IOS-26 Memory Detail", "IOS-36 Profile Detail", "IOS-44 Book Detail"],
      back: "IOS-11",
      deepLink: "memoria://activity"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_activity"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar: 'Family Activity' with filter button (All, Memories, Books, Members).",
      main: "Chronological activity event timeline: Avatar of actor, event copy ('Sarah added 4 photos to Summer 1984'), timestamp ('2 hours ago'), embedded thumbnail preview strip.",
      footer: "End of recent activity notice."
    },
    exactControls: [
      "Pull-to-refresh gesture (UIRefreshControl)",
      "Filter menu (All events, Memories added, Books created, New members)",
      "Activity row tap gesture (routes to affected entity)",
      "Quick heart reaction button on activity item"
    ],
    keyboardFocus: {
      initialFocus: "First activity row",
      tabOrder: ["Filter button", "Activity rows"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Activity rows skeleton pulse.",
      empty: "Archival notice: 'No recent activity in this space. Add a memory or photo to get started!'",
      populated: "Smooth scrolling list of collaborative actions with rich thumbnail previews.",
      error: "Error banner with retry.",
      offline: "Served from local SQLite activity cache.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Family activity stream. 8 recent events. Sarah added 4 photos 2 hours ago. Double tap to view.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native scroll view with pull-to-refresh on iPhone.",
      tablet: "Activity stream panel with detail inspector on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/activity",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { activities: Array<ActivityItem> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["space_activity", "users", "memories"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: false,
      privacyNotes: "Activity feed restricted strictly to members of the space."
    },
    testCriteria: {
      unit: ["formats relative timestamps (just now, 2h ago, yesterday)", "dispatches pull-to-refresh reload"],
      integration: ["GET /api/spaces/:spaceId/activity returns recent events in descending order"],
      e2e: ["pulls down to refresh activity feed, verifies spinner spins and new items appear"]
    },
    uiComponents: ["ActivityFeedView", "ActivityRowCell", "ThumbnailPreviewStrip", "UIRefreshControl"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-42",
    category: "Native iOS — Profiles & Collaboration",
    name: "Memory Comments & Emotional Reaction Sheet",
    userGoal: "Leave heartfelt comments, family voice reactions, and warm emotional reflections on an archival memory.",
    userStory: "As an aunt, I want to comment on my nephew's baby photo and attach a 10-second voice note remembering that day.",
    entryExitRoutes: {
      entry: ["IOS-26 Memory Detail"],
      exit: ["IOS-26 Memory Detail"],
      back: "Dismiss sheet",
      deepLink: "memoria://memories/:memoryId/comments"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_comments", "post_comment", "add_reaction"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Reflections & Notes' with close 'X' button.",
      main: "1. Heartfelt reaction bar (Heart, Tear of Joy, Vintage Camera, Hug, Clapping), 2. Chronological comments stream with author avatar, timestamp, text, and optional voice snippet player.",
      footer: "Comment composer bar: Avatar, TextEditor ('Share a memory or reflection...'), Voice note microphone button, Send button."
    },
    exactControls: [
      "Reaction buttons bar (haptic feedback on selection)",
      "Comment TextEditor input",
      "Voice snippet record button (hold to record audio snippet)",
      "Send comment button (SF Symbol arrow.up.circle.fill)",
      "Delete comment context menu (for author/admin)",
      "Close sheet button"
    ],
    formValidation: {
      fields: [
        { name: "commentText", type: "text", required: true, limits: "1-1000 characters", errorCopy: "Please write a comment or record a voice note." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Comment text editor",
      tabOrder: ["Reactions bar", "Comments list", "TextEditor", "Mic button", "Send button"],
      escapeBehavior: "Dismisses keyboard then sheet"
    },
    statesMatrix: {
      loading: "Comments list skeleton pulse.",
      empty: "Archival notice: 'Be the first to leave a reflection on this treasured moment.'",
      populated: "Heartwarming list of family reflections and audio reactions.",
      error: "Error banner with retry.",
      offline: "Queues new comments locally; syncs upon reconnect.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Comments and reflections for this memory. 4 comments. Double tap text field to write a reflection.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Medium-to-large detent presentation sheet with keyboard avoidance on iPhone.",
      tablet: "Side inspector sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/memories/:memoryId/comments",
      authType: "Bearer JWT",
      requestBody: "{ content: string, audioMediaId?: string }",
      responseBody: "{ success: true, data: { comment: MemoryComment } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memory_comments", "memory_reactions", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.comment_added", "memory.reaction_added"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Comments are strictly private to space collaborators."
    },
    testCriteria: {
      unit: ["enforces 1000 character limit on comment text", "triggers UIImpactFeedbackGenerator on reaction tap"],
      integration: ["POST /api/memories/:memoryId/comments inserts comment and returns hydrated record"],
      e2e: ["types reflection, taps Send, verifies comment appears in thread"]
    },
    uiComponents: ["ReactionBar", "CommentsListView", "CommentCell", "CommentComposerBar", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 2.6 BOOKS & PUBLISHING (IOS-43 to IOS-51)
  // ==========================================
  {
    id: "IOS-43",
    category: "Native iOS — Books & RealityKit 3D",
    name: "3D Bookshelf with Apple RealityKit Interactive Models",
    userGoal: "Browse family memory volumes rendered as interactive 3D books on a virtual wooden library shelf using RealityKit.",
    userStory: "As an archivist, I want to see our published volumes on an interactive 3D shelf, rotate them in 3D space, and tap to read.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar (Books Tab)", "IOS-13 Space Overview"],
      exit: ["IOS-44 Book Detail Sheet", "IOS-49 Immersive 3D Reader", "IOS-45 Book Creator Wizard"],
      back: "IOS-11",
      deepLink: "memoria://bookshelf"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_books", "read_books", "create_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Archival Bookshelf', view toggle (3D Shelf vs 2D Grid), and '+' Create Book button.",
      main: "RealityView rendering realistic 3D wooden library shelf: 3D book models with cloth materials (Deep Ink, Heritage Plum, Forest Sage), gold foil stamped spines, and dynamic lighting.",
      footer: "Selected book banner with title, volume number, page count, and 'Open Book' button."
    },
    exactControls: [
      "RealityView touch gesture (drag to orbit shelf, pinch to zoom)",
      "Entity tap gesture (RealityKit SpatialTapGesture selects 3D book with haptic pop)",
      "View toggle button in navigation bar (3D Shelf vs 2D Grid)",
      "Create Book '+' button",
      "Selected book 'Open Volume' primary CTA button"
    ],
    keyboardFocus: {
      initialFocus: "First book entity",
      tabOrder: ["Create button", "View toggle", "Bookshelf canvas", "Open Volume CTA"],
      escapeBehavior: "Deselects highlighted 3D book"
    },
    statesMatrix: {
      loading: "Wood grain shelf skeleton with soft ambient light fade-in.",
      empty: "Notice: 'Your bookshelf is empty. Create your first family memory book to fill your archive.' with 'Create Volume' button.",
      populated: "Photorealistic RealityKit 3D scene with physical cloth textures, foil shimmers, and smooth 60fps rendering.",
      error: "Falls back to high-resolution 2D book cover grid if Metal/RealityKit fails.",
      offline: "Cached book models and textures loaded directly from local app bundle/cache.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "3D memory bookshelf. 4 family books on display. Double tap Volume 1: Vance Family Chronicle 1970-1990 to open.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single shelf row with horizontal swipe carousel on iPhone.",
      tablet: "Multi-tier library bookcase in RealityKit on iPad with full perspective orbit.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/books",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { books: Array<Book> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service / Local RealityKit USDZ Assets",
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
      privacyNotes: "Book metadata and spine titles rendered locally."
    },
    testCriteria: {
      unit: ["initializes RealityKit scene with correct book entities", "handles fallback to 2D grid when RealityView unavailable"],
      integration: ["GET /api/spaces/:spaceId/books returns list of space books"],
      e2e: ["taps 3D book model on shelf, verifies selection banner updates, taps Open Volume"]
    },
    uiComponents: ["RealityView", "BookshelfSceneEntity", "BookModel3D", "BookDetailBanner", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-44",
    category: "Native iOS — Books & RealityKit 3D",
    name: "Book Detail Sheet & Specifications Inspector",
    userGoal: "Inspect book specifications (page count, format, cover finish, frozen print status) and launch reader or ordering.",
    userStory: "As an archivist, I want to inspect our 8x10 Hardcover volume to see its page count, chapters, and print readiness.",
    entryExitRoutes: {
      entry: ["IOS-43 3D Bookshelf", "memoria://books/:bookId"],
      exit: ["IOS-49 3D Book Reader", "IOS-50 2D Spread Previewer", "IOS-51 Print Preflight", "IOS-52 Apple Pay Checkout"],
      back: "Dismiss sheet",
      deepLink: "memoria://books/:bookId"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["view_book_detail", "order_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar with book title, Close 'X' button, and Edit button (if admin).",
      main: "1. 3D Book preview thumbnail with cloth texture, 2. Book metadata (Title, Subtitle, Space name, Volume number, Page count, Last updated), 3. Physical specification pills (Format: 8x10 Hardcover, Paper: 148gsm Archival Matte, Foil: Gold Leaf), 4. Chapter breakdown list.",
      footer: "Action bar: 'Read 3D Book' (Secondary) and 'Order Heirloom Print' (Primary CTA)."
    },
    exactControls: [
      "Read 3D Book button (opens IOS-49)",
      "View 2D Spreads button (opens IOS-50)",
      "Order Heirloom Print button (opens IOS-51/52)",
      "Edit Book button in toolbar",
      "Chapter row tap (jumps to spread in reader)",
      "Close button"
    ],
    keyboardFocus: {
      initialFocus: "Read 3D Book button",
      tabOrder: ["Close button", "Edit button", "Read 3D button", "Order button", "Chapter rows"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Metadata cards skeleton pulse.",
      empty: "Notice: 'This book has no chapters or pages yet.'",
      populated: "Complete book specifications, chapter index, and print status indicators.",
      error: "Error banner with retry.",
      offline: "Cached book specs rendered from local SQLite.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Book details for Vance Family Chronicle. 64 pages. 8 by 10 hardcover. Double tap Read 3D Book to open reader.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Medium-to-large detent presentation sheet on iPhone.",
      tablet: "Side inspector panel alongside 3D shelf on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/books/:bookId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { book: Book, spreadsCount: number, chapters: Array<Chapter> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "book-service / Local SQLite",
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
      privacyNotes: "Book specifications contain public volume metadata."
    },
    testCriteria: {
      unit: ["computes total page count accurately from spreads", "formats physical specs description"],
      integration: ["GET /api/books/:bookId returns book structure and chapters"],
      e2e: ["taps book on shelf, verifies detail sheet displays 64 pages, taps Read 3D Book"]
    },
    uiComponents: ["BookPreviewCard", "SpecPillGroup", "ChapterList", "PrimaryActionButton", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-45",
    category: "Native iOS — Books & RealityKit 3D",
    name: "Mobile Book Creator Wizard & Curated Assembler",
    userGoal: "Assemble a new heirloom memory volume step-by-step from selected dates, tags, people, or collections.",
    userStory: "As an archivist, I want a 3-step wizard on iOS to compile all 2024 memories into an annual family yearbook.",
    entryExitRoutes: {
      entry: ["IOS-43 Bookshelf", "IOS-31 Favorites", "IOS-33 Collection Detail"],
      exit: ["IOS-46 Memory Selection Tray", "IOS-48 Cover & Foil Sheet", "IOS-43 Bookshelf"],
      back: "Cancel / Previous Step",
      deepLink: "memoria://books/create"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["create_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Wizard navigation bar: Step indicator (1 of 3: Details; 2 of 3: Memories; 3 of 3: Cover & Theme), Cancel button.",
      main: "Step 1: Book Title TextField, Subtitle TextField, Curation Strategy picker (Date Range, Entire Space, Specific Collection, Starred Favorites), Format selector (Standard 8x10 Hardcover, Compact 6x8, Deluxe Leather 10x12).",
      footer: "Bottom navigation: 'Next: Select Memories' primary button."
    },
    exactControls: [
      "Title TextField with Cormorant Garamond font preview",
      "Subtitle TextField",
      "Curation strategy picker (segmented control / cards)",
      "Book format cards (Standard Hardcover, Compact, Deluxe Leather)",
      "Next Step button",
      "Cancel wizard button"
    ],
    formValidation: {
      fields: [
        { name: "title", type: "text", required: true, limits: "1-100 characters", errorCopy: "Please enter a book title." },
        { name: "format", type: "select", required: true, errorCopy: "Please select a physical book format." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Title field",
      tabOrder: ["Cancel", "Title", "Subtitle", "Strategy", "Format", "Next Button"],
      escapeBehavior: "Prompts to discard book draft"
    },
    statesMatrix: {
      loading: "Generating draft layout spinner.",
      empty: "Clean wizard fields with placeholder examples.",
      populated: "Valid titles and selected curation strategy with memory estimate badge ('~45 memories found').",
      error: "Inline red validation callout under affected fields.",
      offline: "Draft book creation saved locally in SQLite.",
      permissionDenied: "Alert: 'You do not have permission to create books in this space.'"
    },
    confirmationCancellation: "Tapping Cancel prompts: 'Discard book creation? Your draft settings will not be saved.'",
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Book creator wizard. Step 1 of 3. Enter volume title and format. Double tap Next to proceed.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Modal wizard sheet with keyboard avoidance on iPhone.",
      tablet: "Centered modal wizard container on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/books",
      authType: "Bearer JWT",
      requestBody: "{ title: string, subtitle?: string, format: string, curationStrategy: string }",
      responseBody: "{ success: true, data: { book: Book } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service / Local SQLite",
      databaseTables: ["books", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.created"],
      bullmqJobs: ["generate-auto-book-layout"]
    },
    auditPrivacy: {
      piiLevel: "Medium",
      auditLogged: true,
      privacyNotes: "Draft book stored locally before final publication."
    },
    testCriteria: {
      unit: ["validates title length and format options", "advances wizard steps sequentially"],
      integration: ["POST /api/spaces/:spaceId/books creates book record with draft status"],
      e2e: ["completes step 1, verifies transition to Step 2 Memory Selection Tray"]
    },
    uiComponents: ["WizardStepBar", "TextField", "FormatSelectionCard", "SegmentedPicker", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-46",
    category: "Native iOS — Books & RealityKit 3D",
    name: "Memory Selection & Inclusion Tray",
    userGoal: "Select, filter, and organize the exact photos, voice notes, and stories to include in a book volume.",
    userStory: "As an archivist, I want to scroll through our photos and tap checkmarks to include 40 specific pictures in the new book.",
    entryExitRoutes: {
      entry: ["IOS-45 Book Creator Wizard (Step 2)", "IOS-44 Book Detail (Add Memories)"],
      exit: ["IOS-47 Spread Reordering", "IOS-45 Step 1"],
      back: "IOS-45 Step 1",
      deepLink: "memoria://books/:bookId/select-memories"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["edit_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Select Memories', selected counter badge ('38 selected'), and 'Select All' button.",
      main: "3-column photo grid with round selection checkmarks: filter chips on top (All, Photos, Stories, Starred, People).",
      footer: "Bottom floating bar: Selected memories preview tray and 'Next: Arrange Spreads' primary CTA."
    },
    exactControls: [
      "Memory cell tap (toggles selection checkmark with haptic feedback)",
      "Select All / Deselect All button in toolbar",
      "Filter chip bar (All, Favorites, People, Media Type)",
      "Bottom tray horizontal thumbnail strip of selected items",
      "'Next: Arrange Spreads' CTA button",
      "Back button"
    ],
    keyboardFocus: {
      initialFocus: "First memory cell",
      tabOrder: ["Filter chips", "Select All", "Memory cells", "Next Button"],
      escapeBehavior: "Clears selection or goes back"
    },
    statesMatrix: {
      loading: "3-column grid skeleton pulse.",
      empty: "Notice: 'No memories match current filter.'",
      populated: "Grid of photos and stories with prominent blue checkmarks on selected items.",
      error: "Error banner with refresh.",
      offline: "Selects from cached SQLite memories.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Memory selection tray. 38 items selected. Double tap to toggle item selection.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "3-column grid on iPhone with collapsible bottom tray.",
      tablet: "4-column grid with persistent right-side selection tray on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/books/:bookId/memories",
      authType: "Bearer JWT",
      requestBody: "{ memoryIds: Array<string> }",
      responseBody: "{ success: true, data: { book: Book, selectedCount: number } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service / Local SQLite",
      databaseTables: ["books", "memories"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Selected memories mapped strictly within space."
    },
    testCriteria: {
      unit: ["toggles memory selection in state array", "calculates estimated book spread count"],
      integration: ["PUT /api/books/:bookId/memories saves selected memory list"],
      e2e: ["selects 10 photos, verifies counter updates to 10, taps Next"]
    },
    uiComponents: ["SelectableMediaGrid", "CheckmarkOverlay", "SelectionTrayStrip", "FilterChipBar", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-47",
    category: "Native iOS — Books & RealityKit 3D",
    name: "Drag-and-Drop Chapter & Spread Reordering Studio",
    userGoal: "Visually reorder chapters, individual pages, and photo spreads using native iOS drag-and-drop gestures.",
    userStory: "As an archivist, I want to long-press and drag our wedding spread before the honeymoon chapter so the book flows chronologically.",
    entryExitRoutes: {
      entry: ["IOS-46 Memory Selection", "IOS-44 Book Detail"],
      exit: ["IOS-48 Cover & Foil Sheet", "IOS-50 2D Spread Previewer"],
      back: "IOS-46",
      deepLink: "memoria://books/:bookId/arrange"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["edit_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Arrange Spreads', 'Auto-Chronological' sort button, and 'Next' button.",
      main: "2-column spread thumbnail grid (Left Page + Right Page miniature card) with page numbers, chapter divider headers, and drag handles.",
      footer: "Page count warning banner (e.g., 'Total: 48 pages • Multiples of 4 required for print binding')."
    },
    exactControls: [
      "Long-press and drag gesture to reorder spreads (SwiftUI .onDrag / .onDrop)",
      "Auto-Chronological sort button in toolbar",
      "Add Blank Spread / Title Page button",
      "Delete spread button on miniature card",
      "Chapter divider tap (renames chapter)",
      "Next: Cover & Foil button"
    ],
    keyboardFocus: {
      initialFocus: "First spread thumbnail",
      tabOrder: ["Auto sort", "Spread thumbnails", "Add Page", "Next Button"],
      escapeBehavior: "Cancels active drag operation"
    },
    statesMatrix: {
      loading: "Miniature spread thumbnails loading shimmer.",
      empty: "Notice: 'No spreads in book yet.'",
      populated: "Visual grid of 2-page spreads with realistic paper textures and page numbers.",
      error: "Error banner with retry.",
      offline: "Reorders locally in SQLite state store.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Spread reordering studio. Spread 12: Pages 24 and 25. Double tap and hold to drag or use actions rotor to move up or down.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single column of 2-page spread pairs on iPhone.",
      tablet: "Multi-column spread board with chapter outline drawer on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/books/:bookId/spreads/reorder",
      authType: "Bearer JWT",
      requestBody: "{ orderedSpreadIds: Array<string> }",
      responseBody: "{ success: true, data: { spreadsCount: number } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service / Local SQLite",
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
      privacyNotes: "Spread order layout stored locally."
    },
    testCriteria: {
      unit: ["handles drag-and-drop array reordering correctly", "validates page count divisible by 4 for print"],
      integration: ["PUT /api/books/:bookId/spreads/reorder updates spread_index values"],
      e2e: ["drags spread 3 to position 1, verifies new order persists and page numbers recalculate"]
    },
    uiComponents: ["SpreadReorderGrid", "SpreadMiniatureCard", "ChapterDividerView", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-48",
    category: "Native iOS — Books & RealityKit 3D",
    name: "Cover Style, Fabric & Metallic Foil Studio",
    userGoal: "Customize physical cover fabric (Linen, Buckram, Leather), foil stamping color (Gold, Silver, Rose, Copper), and cover typography.",
    userStory: "As an archivist, I want to choose Deep Forest Green cloth with embossed Gold Foil lettering for our heirloom family bible volume.",
    entryExitRoutes: {
      entry: ["IOS-47 Spread Studio", "IOS-44 Book Detail"],
      exit: ["IOS-49 Immersive 3D Reader", "IOS-43 Bookshelf"],
      back: "IOS-47",
      deepLink: "memoria://books/:bookId/cover-style"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["edit_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Cover & Foil Studio' and 'Finish Volume' button.",
      main: "1. Interactive 3D cover model preview reacting to device gyroscope (tilts to show metallic foil specular reflection via Metal shader), 2. Cloth material swatch picker, 3. Foil color swatch picker, 4. Cover typography style selector (Serif, Sans, Classic Archival).",
      footer: "Primary CTA button: 'Save & View in 3D Reader'."
    },
    exactControls: [
      "Interactive 3D cover preview (drag to rotate, gyroscope shimmer)",
      "Cloth material swatches (Deep Ink #20242C, Heritage Plum #76556F, Forest Sage #849483, Warm Ochre #D8973C, Crimson Leather)",
      "Metallic foil swatches (Gold Leaf, Platinum Silver, Rose Gold, Blind Deboss)",
      "Typography selector menu (Cormorant Garamond, Inter, Bodoni)",
      "Embossed Title TextField",
      "Finish Volume button"
    ],
    keyboardFocus: {
      initialFocus: "Title TextField",
      tabOrder: ["Title", "Cloth swatches", "Foil swatches", "Typography menu", "Finish Button"],
      escapeBehavior: "Pops back to IOS-47"
    },
    statesMatrix: {
      loading: "Generating Metal material shader spinner.",
      empty: "N/A",
      populated: "Photorealistic 3D cover reacting to ambient gyroscope motion with dynamic foil gleam.",
      error: "Error banner with retry.",
      offline: "Renders Metal shader locally on GPU.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Cover styling studio. Deep Forest Sage cloth with Gold Leaf foil selected. Double tap swatches to change.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Top half 3D cover canvas, bottom half scrollable swatch controls on iPhone.",
      tablet: "Side-by-side 3D book cover and material inspector on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/books/:bookId/cover",
      authType: "Bearer JWT",
      requestBody: "{ coverColor: string, materialType: string, foilColor: string, typographyStyle: string }",
      responseBody: "{ success: true, data: { book: Book } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service / Local SQLite",
      databaseTables: ["books", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["book.cover_updated"],
      bullmqJobs: ["generate-book-3d-model"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Cover style preferences stored in book record."
    },
    testCriteria: {
      unit: ["updates cover color hex and foil type in state", "binds gyroscope tilt to Metal shader uniform"],
      integration: ["PATCH /api/books/:bookId/cover persists cover styling"],
      e2e: ["selects Heritage Plum and Gold Foil, tilts phone, verifies foil shimmers, taps Finish"]
    },
    uiComponents: ["Cover3DPreviewCanvas", "MaterialSwatchPicker", "FoilSwatchPicker", "TypographySelector", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-49",
    category: "Native iOS — Books & RealityKit 3D",
    name: "Immersive RealityKit 3D Book Reader & Physics Page Turn",
    userGoal: "Read a published memory book with lifelike 3D cloth binding, page curl physics, and spatial audio paper sounds using RealityKit.",
    userStory: "As a reader, I want to swipe my finger across the screen to turn the physical-feeling paper pages and hear the gentle paper rustle sound.",
    entryExitRoutes: {
      entry: ["IOS-43 3D Bookshelf", "IOS-44 Book Detail Sheet"],
      exit: ["IOS-43 3D Bookshelf", "IOS-50 2D Spread Previewer", "IOS-42 Memory Comments"],
      back: "IOS-43",
      deepLink: "memoria://books/:bookId/read"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["read_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Floating semi-transparent navigation bar (fades out during reading): Back to Shelf button, Book Title, Page Scrubber slider ('Page 24 of 64'), Table of Contents button.",
      main: "Full screen RealityView: Dynamic 3D Book entity with realistic paper shader, curled page geometry responding to drag gesture in real time, cast shadows, and cloth spine.",
      footer: "Bottom floating reading bar: Audio memory play icon (if voice note attached to spread), Bookmark button, 2D view toggle."
    },
    exactControls: [
      "Horizontal drag gesture on page edge (curls page dynamically with RealityKit vertex deformation)",
      "Single tap on page edge (triggers animated smooth page turn)",
      "RealityKit SpatialAudio (plays subtle binaural paper rustle audio sample upon page turn)",
      "Page scrubber slider in top toolbar",
      "Table of Contents drawer button",
      "Floating Audio Play button (plays attached memory voice note)",
      "Back button (closes reader)"
    ],
    keyboardFocus: {
      initialFocus: "Page Canvas",
      tabOrder: ["Back button", "Table of contents", "Page Scrubber", "Page Canvas", "Audio button"],
      escapeBehavior: "Closes 3D reader"
    },
    statesMatrix: {
      loading: "Opening book animation with ivory page skeleton pulse.",
      empty: "Notice: 'Book has no pages.'",
      populated: "Full 60/120fps RealityKit interactive 3D book with high-res page spreads, soft lighting, and dynamic shadows.",
      error: "Falls back to IOS-50 2D Spread Previewer if RealityKit pipeline encounters GPU memory pressure.",
      offline: "All page spreads and 3D textures cached in local storage.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "3D Book Reader. Pages 24 and 25 of 64. Left page: Summer Picnic 1984. Right page: Photo of Grandma smiling by the lake. Swipe left to turn page.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single page view in portrait, full two-page open spread in landscape on iPhone.",
      tablet: "Two-page spread open with natural desk shadow on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/books/:bookId/spreads",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { spreads: Array<BookSpread> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "book-service / Local RealityKit Assets",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["book.read"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Page contents kept strictly within space tenancy."
    },
    testCriteria: {
      unit: ["deforms page mesh vertices according to drag gesture percent", "plays spatial audio sound effect on page turn completion"],
      integration: ["GET /api/books/:bookId/spreads returns all pages with layout nodes"],
      e2e: ["swipes left to turn page, verifies page curl animation executes smoothly and page index advances to 2"]
    },
    uiComponents: ["RealityView", "PageCurlEntity", "SpatialAudioPlayer", "PageScrubberBar", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-50",
    category: "Native iOS — Books & RealityKit 3D",
    name: "2D Flat Spread Previewer & Accessible Reader",
    userGoal: "Read book spreads in a clean, accessible 2D layout with zoomable high-resolution imagery and selectable text.",
    userStory: "As a reader with visual impairments or on low-battery mode, I want a flat 2D spread viewer where I can zoom in on captions and photos.",
    entryExitRoutes: {
      entry: ["IOS-49 3D Reader", "IOS-44 Book Detail"],
      exit: ["IOS-49 3D Reader", "IOS-44 Book Detail"],
      back: "IOS-44",
      deepLink: "memoria://books/:bookId/spreads/:spreadIndex"
    },
    personasPermissions: {
      roles: ["Space Member", "Space Contributor", "Space Admin"],
      capabilities: ["read_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with '2D Spread Viewer', Spread index ('Spread 12 of 32'), and 'Switch to 3D' button.",
      main: "Horizontal paging ScrollView / TabView: High-resolution left and right pages with double-tap zoom (UIScrollView pinch-to-zoom), rendered typography, and tap-to-inspect photos.",
      footer: "Bottom thumbnail filmstrip for rapid page scrubbing."
    },
    exactControls: [
      "Horizontal paging swipe gesture",
      "Pinch-to-zoom gesture on pages (up to 4x magnification)",
      "Double-tap to reset zoom",
      "Switch to 3D Reader button in toolbar",
      "Bottom thumbnail filmstrip scrubbing",
      "Audio note play button on spreads with recordings"
    ],
    keyboardFocus: {
      initialFocus: "Active spread canvas",
      tabOrder: ["Toolbar", "Active spread", "Switch to 3D", "Scrubbing filmstrip"],
      escapeBehavior: "Exits reader"
    },
    statesMatrix: {
      loading: "Spread placeholder skeleton.",
      empty: "Notice: 'No spreads available.'",
      populated: "High-resolution flat page layout with crisp vector Cormorant Garamond typography.",
      error: "Error banner with retry.",
      offline: "Served from local SQLite and image cache.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AAA / Dynamic Type & VoiceOver",
      voiceOverSummary: "2D spread view. Spread 12. Left page: Grandpa's Workshop. Right page: Family photo. Double tap to inspect.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1 (Deep Ink on Warm Ivory)"
    },
    responsive: {
      mobile: "Single page paging in portrait; side-by-side spread in landscape on iPhone.",
      tablet: "Side-by-side spread with thumbnail filmstrip on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/books/:bookId/spreads",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { spreads: Array<BookSpread> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service / Local SQLite",
      databaseTables: ["books", "book_spreads"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Local rendering of archival memory spreads."
    },
    testCriteria: {
      unit: ["handles pinch-to-zoom scales up to 4x", "updates spread index upon horizontal page scroll"],
      integration: ["GET /api/books/:bookId/spreads returns spread data correctly"],
      e2e: ["swipes through 2D spreads, double-taps to zoom in on image"]
    },
    uiComponents: ["PagingSpreadScrollView", "ZoomablePageView", "ThumbnailFilmstripBar", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-51",
    category: "Native iOS — Books & RealityKit 3D",
    name: "Print Preflight & Archival Quality Inspection Sheet",
    userGoal: "Validate that all images meet 300 DPI print standards, verify bleed margins, check page counts, and inspect print readiness before checkout.",
    userStory: "As an archivist, I want the preflight tool to warn me if an old scanned photo is too low resolution so that my printed book looks sharp.",
    entryExitRoutes: {
      entry: ["IOS-44 Book Detail", "IOS-50 Spread Previewer"],
      exit: ["IOS-52 Apple Pay Checkout", "IOS-47 Spread Studio (to fix issues)"],
      back: "IOS-44",
      deepLink: "memoria://books/:bookId/preflight"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["preflight_book", "order_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Print Preflight Inspection' with Close button.",
      main: "1. Overall Readiness Badge ('Ready for Heirloom Printing' or '2 Warnings Found'), 2. Automated audit checklist (Page count is multiple of 4: PASS; All photos >= 300 DPI: 1 WARNING; Bleed & safety margins: PASS; CMYK color profile conversion: PASS), 3. Interactive warning locator list (tapping warning shows affected page thumbnail).",
      footer: "Primary CTA button: 'Proceed to Checkout' (or 'Fix Warnings')."
    },
    exactControls: [
      "Preflight check rows tap (expands technical details: actual DPI vs required DPI)",
      "Jump to Page button on warning row (opens spread in editor)",
      "Proceed to Checkout button (enabled if 0 blocking errors)",
      "Ignore Non-Blocking Warnings checkbox",
      "Close sheet button"
    ],
    keyboardFocus: {
      initialFocus: "Proceed to Checkout button",
      tabOrder: ["Close button", "Checklist rows", "Ignore checkbox", "Proceed button"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Scanning image resolutions and margin bounds spinner.",
      empty: "N/A",
      populated: "Complete technical report with green checkmarks and amber warning callouts.",
      error: "Alert: 'Preflight analysis failed.' with retry.",
      offline: "Executes preflight validation locally using CoreGraphics image inspection.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Print preflight report. Status: Ready with 1 warning. Page 14 has photo below 300 DPI. Double tap to inspect.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Modal inspection sheet on iPhone.",
      tablet: "Centered inspection card on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/books/:bookId/preflight",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { isReady: boolean, checks: Array<{ name: string, status: 'pass' | 'warn' | 'fail', details: string, pageNumber?: number }> } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "book-service / Local CoreGraphics",
      databaseTables: ["books", "book_spreads", "media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["book.preflight_executed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Preflight evaluates image pixel dimensions and bounding boxes."
    },
    testCriteria: {
      unit: ["flags photos below 300 DPI as warnings", "verifies spread count conforms to print signature rules"],
      integration: ["POST /api/books/:bookId/preflight returns structured checklist array"],
      e2e: ["runs preflight on book, inspects warning on page 14, proceeds to checkout"]
    },
    uiComponents: ["PreflightChecklistView", "ChecklistStatusRow", "WarningDetailCallout", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 2.7 COMMERCE & ACCOUNT (IOS-52 to IOS-56)
  // ==========================================
  {
    id: "IOS-52",
    category: "Native iOS — Commerce & Account",
    name: "Apple Pay & Physical Print Checkout Sheet",
    userGoal: "Order a physical heirloom memory book with one-tap native Apple Pay, shipping address validation, and quantity selection.",
    userStory: "As a customer, I want to tap Apple Pay on my iPhone to buy 3 copies of our family book for Christmas gifts with biometric Touch/Face ID.",
    entryExitRoutes: {
      entry: ["IOS-51 Print Preflight", "IOS-44 Book Detail Sheet"],
      exit: ["IOS-53 Order Status & Tracking", "IOS-44 Book Detail"],
      back: "Cancel sheet dismiss",
      deepLink: "memoria://books/:bookId/checkout"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["order_book"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Order Heirloom Print' with Cancel button.",
      main: "1. Book summary card (Thumbnail, title, format, page count), 2. Quantity stepper (1 to 20 copies), 3. Shipping method selector (Standard 5-7 days, Express 2-3 days, Archival Presentation Box included), 4. Price breakdown (Book copies, Shipping, Sales Tax, Total).",
      footer: "Primary CTA: Native Apple Pay button (PKPaymentButton) and fallback credit card option."
    },
    exactControls: [
      "Quantity Stepper (+ / - buttons)",
      "Shipping address picker (or fetched via PKPaymentRequest)",
      "Shipping speed segmented picker (Standard vs Express)",
      "Native Apple Pay PKPaymentButton (Black, .buy style)",
      "Fallback manual card entry button",
      "Cancel button"
    ],
    formValidation: {
      fields: [
        { name: "quantity", type: "number", required: true, limits: "1-20 copies", errorCopy: "Please select between 1 and 20 copies." },
        { name: "shippingAddress", type: "text", required: true, errorCopy: "Please provide a valid shipping address." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Quantity Stepper",
      tabOrder: ["Quantity", "Shipping method", "Apple Pay button", "Cancel"],
      escapeBehavior: "Dismisses checkout sheet"
    },
    statesMatrix: {
      loading: "PKPaymentAuthorizationController biometric processing overlay.",
      empty: "N/A",
      populated: "Calculated itemized pricing breakdown with tax and shipping.",
      error: "Alert: 'Payment authorization failed. Please try again or use another payment method.'",
      offline: "Alert: 'Internet connection required to place physical print orders.'",
      permissionDenied: "Alert: 'You do not have permission to place print orders for this space.'"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Checkout sheet. 1 copy of Vance Family Chronicle. Total $84.00. Double tap Apple Pay to complete order.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Modal checkout sheet with native PKPaymentButton on iPhone.",
      tablet: "Centered modal checkout container on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/orders/checkout",
      authType: "Bearer JWT",
      requestBody: "{ bookId: string, quantity: number, shippingMethod: string, applePayToken?: string, shippingAddress: ShippingAddress }",
      responseBody: "{ success: true, data: { orderId: string, status: string, totalCents: number } }",
      statusCodes: ["201 Created", "400 Bad Request", "401 Unauthorized", "402 Payment Required"]
    },
    servicePersistence: {
      service: "commerce-service / Local SQLite",
      databaseTables: ["print_orders", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["order.placed"],
      bullmqJobs: ["generate-print-cmyk-pdf", "notify-fulfillment-partner"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Payment tokens processed through secure PassKit framework; zero raw credit card numbers stored."
    },
    testCriteria: {
      unit: ["builds PKPaymentRequest with correct line items and merchant ID", "computes total cents with tax and shipping"],
      integration: ["POST /api/orders/checkout writes print_orders record and publishes order.placed outbox event"],
      e2e: ["selects 2 copies, authorizes Apple Pay simulator sheet, verifies navigation to Order Status screen"]
    },
    uiComponents: ["PKPaymentButton", "QuantityStepper", "PriceBreakdownCard", "ShippingMethodPicker", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-53",
    category: "Native iOS — Commerce & Account",
    name: "Order Status, Binding & Shipping Tracking Timeline",
    userGoal: "Track physical book production status (Preflight Approved, Printing, Hand Binding, Shipped, Delivered) in real time.",
    userStory: "As an excited customer, I want to check my order status and view the courier tracking link so I know when our family book arrives.",
    entryExitRoutes: {
      entry: ["IOS-52 Apple Pay Checkout", "IOS-54 User Account Orders", "memoria://orders/:orderId"],
      exit: ["IOS-11 Home Feed", "External Courier Tracking URL", "IOS-56 Support Sheet"],
      back: "IOS-11",
      deepLink: "memoria://orders/:orderId"
    },
    personasPermissions: {
      roles: ["Order Placer", "Space Admin"],
      capabilities: ["view_order_status"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Order Details', Order number ('#MEM-8921'), and Share Receipt button.",
      main: "1. Animated status illustration with status badge ('In Hand Binding'), 2. Production step progress timeline (Order Placed -> Digital Preflight -> Printing -> Hand Binding -> Shipped -> Delivered) with completion dates, 3. Shipping courier tracking card with tracking number and 'Track Package' button, 4. Order summary & shipping address card.",
      footer: "Support CTA: 'Questions about your order? Contact Archival Support'."
    },
    exactControls: [
      "Share Receipt button in toolbar",
      "'Track Package' courier button (opens Safari with carrier URL)",
      "Contact Support button (opens IOS-56 with pre-filled order ID)",
      "Download PDF Proof button",
      "Done / Back to Home button"
    ],
    keyboardFocus: {
      initialFocus: "Done button",
      tabOrder: ["Share button", "Track Package button", "Contact Support", "Done button"],
      escapeBehavior: "Pops back to home feed"
    },
    statesMatrix: {
      loading: "Order tracking skeleton pulse.",
      empty: "Notice: 'Order details not found.'",
      populated: "Real-time production step tracker with active pulse on current stage.",
      error: "Error banner with refresh action.",
      offline: "Cached order status displayed from SQLite.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Order status for order MEM-8921. Current stage: Hand Binding. Estimated delivery December 22. Double tap to track package.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Vertical timeline scroll view on iPhone.",
      tablet: "Two-column order summary and timeline layout on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/orders/:orderId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { order: Order, trackingUrl?: string, stages: Array<{ name: string, completed: boolean, date?: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "commerce-service / Local SQLite",
      databaseTables: ["print_orders"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Shipping address and tracking details restricted strictly to order creator."
    },
    testCriteria: {
      unit: ["maps order status enum to progress timeline step index", "formats tracking carrier URL"],
      integration: ["GET /api/orders/:orderId returns order details and stages"],
      e2e: ["opens order status view, verifies 'Hand Binding' active, taps Track Package"]
    },
    uiComponents: ["OrderTimelineView", "StatusIllustrationCard", "CarrierTrackingBox", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-54",
    category: "Native iOS — Commerce & Account",
    name: "User Profile, Biometric Security & Preferences",
    userGoal: "Manage account details, Face ID / Touch ID biometric locks, notification preferences, and active spaces.",
    userStory: "As an iOS user, I want to enable Face ID app lock so that my private family journals remain secure even if someone borrows my unlocked phone.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar (Account Tab)", "IOS-13 Space Overview"],
      exit: ["IOS-55 Storage & Export", "IOS-56 Help & Support", "IOS-02 Sign-Out"],
      back: "IOS-11",
      deepLink: "memoria://account"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["manage_account", "configure_security"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Account & Preferences' and Edit Profile button.",
      main: "1. User profile card (Avatar, full name, verified email, member since date), 2. Security Section (Face ID / Biometric Lock toggle, Change Password, Active Devices & Sessions), 3. Notification Preferences (Daily memory prompt, Family activity, Order updates), 4. App Preferences (Appearance: Light Archival Theme, Haptic Feedback toggle, Auto-play audio toggle), 5. Data & Storage link.",
      footer: "Destructive Sign Out and Delete Account buttons."
    },
    exactControls: [
      "Avatar photo change button",
      "Face ID / Biometrics toggle switch (LocalAuthentication context)",
      "Push Notifications toggle switches",
      "Haptic Feedback toggle switch",
      "Active Sessions row (tap to view logged-in devices)",
      "Storage & Export row (navigates to IOS-55)",
      "Sign Out button",
      "Delete Account button"
    ],
    confirmationCancellation: "Sign Out prompts: 'Sign out of Memoria? Your local cache will be preserved.' Delete Account prompts double confirmation modal.",
    keyboardFocus: {
      initialFocus: "First preference toggle",
      tabOrder: ["Profile card", "Face ID toggle", "Notifications", "Storage", "Sign Out"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Preferences skeleton pulse.",
      empty: "N/A",
      populated: "Account preferences loaded with active toggle states.",
      error: "Error banner with retry.",
      offline: "Security toggles (Face ID) configurable offline in local Keychain.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Account preferences. Profile: Jane Vance. Face ID lock is enabled. Double tap to toggle settings.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native inset grouped list on iPhone.",
      tablet: "Split view settings layout on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "PATCH",
      endpoint: "/api/users/me/preferences",
      authType: "Bearer JWT",
      requestBody: "{ notificationsEnabled?: boolean, biometricLockEnabled?: boolean, hapticsEnabled?: boolean }",
      responseBody: "{ success: true, data: { user: UserProfile } }",
      statusCodes: ["200 OK", "400 Bad Request", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service / Local iOS Keychain",
      databaseTables: ["users", "user_sessions"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["user.preferences_updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Biometric preference stored locally; password changes revoke active refresh tokens."
    },
    testCriteria: {
      unit: ["triggers LAContext evaluatePolicy for biometric enrollment", "persists haptic settings to UserDefaults"],
      integration: ["PATCH /api/users/me/preferences updates user record in database"],
      e2e: ["toggles Face ID lock, locks app, verifies Face ID prompt appears on re-entry"]
    },
    uiComponents: ["AccountProfileCard", "Toggle", "ListRowNavigation", "DestructiveButton", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-55",
    category: "Native iOS — Commerce & Account",
    name: "Storage Quota Meter, Offline Cache & Data Export Console",
    userGoal: "Inspect space storage utilization against 500MB free quota, clear local thumbnail caches, or download full archival backup.",
    userStory: "As an archivist, I want to see how much of our 500MB storage quota is used and export our full family archive to my local Mac.",
    entryExitRoutes: {
      entry: ["IOS-54 Account Preferences", "IOS-13 Space Overview"],
      exit: ["IOS-54 Account Preferences", "System Share Sheet (Export Archive)"],
      back: "IOS-54",
      deepLink: "memoria://storage"
    },
    personasPermissions: {
      roles: ["Space Admin", "Space Member"],
      capabilities: ["view_storage", "export_data", "clear_cache"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with 'Storage & Data Sovereignty'.",
      main: "1. Circular / Bar storage gauge: Used MB / 500 MB limit (e.g., '142 MB of 500 MB used • 28%'), 2. Media breakdown bar (Photos: 94 MB, Audio: 36 MB, Books: 12 MB), 3. On-Device Cache section: 'Thumbnail Cache: 45 MB' with 'Clear Local Cache' button, 4. Data Sovereignty & Export card: 'Export Entire Living Archive' button (generates signed ZIP containing original uncompressed files and JSON metadata).",
      footer: "Zero-budget policy pledge: 'Memoria guarantees $0 cardless hosting and absolute data ownership.'"
    },
    exactControls: [
      "Storage meter progress bar",
      "Clear Local Cache button (frees disk space on device without touching cloud archive)",
      "Export Archive button (triggers background zip compilation and share sheet)",
      "Offline sync status toggle",
      "Back button"
    ],
    confirmationCancellation: "Tapping 'Clear Local Cache' confirms: 'Clear 45 MB of cached thumbnails? High-resolution photos will re-download when viewed.'",
    keyboardFocus: {
      initialFocus: "Export Archive button",
      tabOrder: ["Storage gauge", "Clear Cache button", "Export Archive button"],
      escapeBehavior: "Pops back to IOS-54"
    },
    statesMatrix: {
      loading: "Calculating disk storage breakdown spinner.",
      empty: "N/A",
      populated: "Detailed byte usage breakdown with color-coded category meter.",
      error: "Error banner with refresh.",
      offline: "Displays cached local storage statistics.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Storage management. 142 megabytes used of 500 megabyte quota. 28 percent full. Double tap Export to download full archive.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native grouped scroll view on iPhone.",
      tablet: "Card grid layout on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/storage/breakdown",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { usedBytes: number, maxBytes: number, breakdown: { photos: number, audio: number, books: number } } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "media-service / Local SQLite",
      databaseTables: ["space_storage_quotas", "media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["storage.cache_cleared"],
      bullmqJobs: ["compile-space-export-zip"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Export file encrypted and delivered securely over HTTPS."
    },
    testCriteria: {
      unit: ["calculates storage percentage accurately against 500MB cap", "removes files in CachesDirectory upon cache clear"],
      integration: ["GET /api/spaces/:spaceId/storage/breakdown returns exact quota bytes"],
      e2e: ["taps Clear Local Cache, confirms dialog, verifies cache size resets to 0 MB"]
    },
    uiComponents: ["StorageUsageGauge", "StorageCategoryBreakdownBar", "ActionCard", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-56",
    category: "Native iOS — Commerce & Account",
    name: "Help, Archival Knowledge Base & Support Submission Sheet",
    userGoal: "Search preservation guides (scanning tips, audio recording guidelines, book binding advice) or submit support ticket.",
    userStory: "As an archivist, I want to read tips on how to scan fragile 19th-century tintypes without glare, or message support if I have questions.",
    entryExitRoutes: {
      entry: ["IOS-54 Account Preferences", "IOS-53 Order Status"],
      exit: ["IOS-54 Account Preferences", "Article Reader View"],
      back: "Dismiss sheet",
      deepLink: "memoria://support"
    },
    personasPermissions: {
      roles: ["Authenticated Member", "Anonymous Visitor"],
      capabilities: ["view_faq", "submit_ticket"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Preservation Help & Support' with Close button.",
      main: "1. Search FAQ text field, 2. Preservation Guides section (How to scan old photos, Recording oral histories, Customizing book covers), 3. Frequently Asked Questions accordion, 4. 'Contact Archival Support' message form (Subject, Category picker, Message text area, Attach diagnostic logs toggle).",
      footer: "Primary CTA button: 'Submit Support Request'."
    },
    exactControls: [
      "Search FAQ TextField",
      "Preservation guide article tap (opens modal article reader)",
      "FAQ accordion disclosure groups",
      "Support Category picker (Book Printing, Media Uploads, Account, Bug Report)",
      "Message TextEditor",
      "Attach Diagnostic Logs toggle",
      "Submit Request button",
      "Close button"
    ],
    formValidation: {
      fields: [
        { name: "category", type: "select", required: true, errorCopy: "Please select a topic category." },
        { name: "message", type: "text", required: true, limits: "10-2000 characters", errorCopy: "Please enter a message of at least 10 characters." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Search FAQ field",
      tabOrder: ["Search field", "FAQ items", "Category", "Message", "Submit", "Close"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Submitting ticket spinner.",
      empty: "N/A",
      populated: "Rich FAQ articles and interactive support submission form.",
      error: "Error banner with retry.",
      offline: "FAQ articles available offline from local bundle.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "WCAG 2.2 AA / VoiceOver accessible",
      voiceOverSummary: "Help and support sheet. Search preservation guides or submit support request. Double tap to search.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Modal form sheet on iPhone.",
      tablet: "Centered modal container on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/support/tickets",
      authType: "Bearer JWT or Anonymous",
      requestBody: "{ category: string, subject: string, message: string, appVersion: string, deviceModel: string }",
      responseBody: "{ success: true, data: { ticketId: string, status: 'received' } }",
      statusCodes: ["201 Created", "400 Bad Request"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["support_tickets"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["support.ticket_created"],
      bullmqJobs: ["send-support-confirmation-email"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Diagnostic logs sanitize all private memory content and tokens."
    },
    testCriteria: {
      unit: ["validates support message length requirement", "filters FAQ items by search keywords"],
      integration: ["POST /api/support/tickets creates support ticket in database"],
      e2e: ["fills out support form, attaches logs, taps Submit, verifies success confirmation alert"]
    },
    uiComponents: ["FAQAccordionView", "SearchTextField", "Picker", "TextEditor", "Toggle", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  }
];
