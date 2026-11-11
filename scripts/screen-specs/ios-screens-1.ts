import { ScreenSpec } from "./types.js";

export const iosScreens1: ScreenSpec[] = [
  // ==========================================
  // 2.1 AUTHENTICATION & ONBOARDING (IOS-01 to IOS-10)
  // ==========================================
  {
    id: "IOS-01",
    category: "Native iOS — Auth & Onboarding",
    name: "Launch Splash & Heirloom Branding Animation",
    userGoal: "Launch the native Memoria app smoothly with branded 3D book emblem animation and fast session restoration.",
    userStory: "As an iPhone user, I want the app to open instantly with an elegant heirloom animation, validating Keychain credentials without decorative delays.",
    entryExitRoutes: {
      entry: ["SpringBoard launch", "Universal link"],
      exit: ["IOS-11 Home Feed (if session valid)", "IOS-02 / IOS-03 Auth (if unauthenticated)", "IOS-06 Deep Link"],
      back: "N/A",
      deepLink: "memoria://launch"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor", "Authenticated Member"],
      capabilities: ["launch_app"],
      authRequired: false
    },
    contentHierarchy: {
      header: "N/A (Full screen branding view).",
      main: "Deep Ink #20242C emblem of the Memoria archival book on Warm Ivory #F7F4EE canvas; golden tree-of-life foil shimmer.",
      footer: "Tagline: 'Your memories, made timeless.'"
    },
    exactControls: [
      "Animated brand emblem (Lottie / SwiftUI keyframe animation)",
      "Automatic navigation trigger upon Keychain session resolution"
    ],
    keyboardFocus: {
      initialFocus: "N/A (Splash transition)",
      tabOrder: [],
      escapeBehavior: "N/A"
    },
    statesMatrix: {
      loading: "Smooth 60/120 FPS SwiftUI phase animator; Keychain check executes asynchronously.",
      empty: "N/A",
      populated: "Brand logo with Cormorant Garamond typography.",
      error: "Falls back to Sign-In screen if session token is corrupted or expired.",
      offline: "Session restored directly from local Keychain without network dependency.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Memoria. Your memories, made timeless. Loading your living archive.",
      touchTargetMin: "N/A",
      focusTrapping: false,
      contrastRatio: "7.2:1 (Deep Ink on Warm Ivory)"
    },
    responsive: {
      mobile: "Adapts to Dynamic Island, notch, and home indicator across all iPhone models.",
      tablet: "Centered branding asset with proportional iPad typography.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/auth/session/validate",
      authType: "Keychain Bearer JWT",
      responseBody: "{ success: true, data: { valid: boolean, user: UserProfile } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service / Local iOS Keychain",
      databaseTables: ["user_sessions"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["ios.app_launched"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Tokens stored in kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly."
    },
    testCriteria: {
      unit: ["restores session from mock Keychain within 200ms", "routes to HomeFeed when valid"],
      integration: ["GET /api/auth/session/validate validates token"],
      e2e: ["launches simulator app, verifies transition to HomeFeed or Sign-In"]
    },
    uiComponents: ["LaunchSplashView", "BrandEmblemAnimation", "TypographyTitle"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-02",
    category: "Native iOS — Auth & Onboarding",
    name: "Native Sign-Up with Apple Sign-In / Email",
    userGoal: "Create a Memoria account natively using Sign in with Apple or email/password with privacy consent.",
    userStory: "As an iOS user, I want to tap 'Sign in with Apple' to create my account in 2 seconds with biometric privacy.",
    entryExitRoutes: {
      entry: ["IOS-01", "memoria://register"],
      exit: ["IOS-07 Onboarding Carousel", "IOS-08 First Space", "IOS-03 Sign-In"],
      back: "IOS-01",
      deepLink: "memoria://register"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor"],
      capabilities: ["register_account"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Navigation bar with 'Already have an account? Sign In' button.",
      main: "1. Brand Title: 'Begin Your Family Archive', 2. Sign in with Apple button (SignInWithAppleButton), 3. 'or with email' divider, 4. Full Name TextField, 5. Email TextField, 6. SecureField Password, 7. Data Privacy consent toggle.",
      footer: "Primary Button: 'Create Living Archive'."
    },
    exactControls: [
      "SignInWithAppleButton (White on Ink style)",
      "Full Name TextField",
      "Email Address TextField",
      "Password SecureField with reveal eye button",
      "Data Sovereignty & Terms Toggle",
      "Button: 'Create Living Archive'"
    ],
    formValidation: {
      fields: [
        { name: "fullName", type: "text", required: true, limits: "2-100 chars", errorCopy: "Please enter your name." },
        { name: "email", type: "email", required: true, limits: "RFC 5322", errorCopy: "Please enter a valid email." },
        { name: "password", type: "password", required: true, limits: "Min 8 chars, 1 number", errorCopy: "Password must be at least 8 characters with a number." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Full Name field",
      tabOrder: ["Apple button", "Name", "Email", "Password", "Toggle", "Submit"],
      escapeBehavior: "Dismisses keyboard on tap outside"
    },
    statesMatrix: {
      loading: "ProgressView on button; fields disabled.",
      empty: "Fresh native form fields with SF Symbols icons.",
      populated: "Valid input with real-time green checkmarks on password rules.",
      error: "Inline red validation callout under affected fields; Haptic feedback (UINotificationFeedbackGenerator error).",
      offline: "Alert: 'Internet connection required to create a new archive.'",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Sign up view. Sign in with Apple or create account with name, email, and password.",
      touchTargetMin: "44x44 pt minimum",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native scroll view with keyboard avoidance (ignoresSafeArea(.keyboard)).",
      tablet: "Centered form card max-width 480pt on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/register",
      authType: "None",
      requestBody: "{ fullName: string, email: string, password: string }",
      responseBody: "{ success: true, data: { user: UserProfile, accessToken: string, refreshToken: string } }",
      statusCodes: ["201 Created", "400 Bad Request", "409 Conflict"]
    },
    servicePersistence: {
      service: "identity-service / iOS Keychain",
      databaseTables: ["users", "user_sessions"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.user_registered"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "JWT tokens saved directly to Keychain; biometric access control enabled."
    },
    testCriteria: {
      unit: ["validates email regex and password rules in Swift ViewModel", "haptics fire on validation error"],
      integration: ["POST /api/auth/register creates user and returns tokens"],
      e2e: ["submits registration in iOS Simulator, verifies Keychain write and transition to onboarding"]
    },
    uiComponents: ["NativeRegisterView", "SignInWithAppleButton", "SecureField", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-03",
    category: "Native iOS — Auth & Onboarding",
    name: "Native Sign-In & FaceID / Biometric Unlock",
    userGoal: "Sign in with email/password or unlock an existing session instantly using Face ID / Touch ID.",
    userStory: "As an archivist opening the app, I want Face ID to scan my face and open my family memories seamlessly.",
    entryExitRoutes: {
      entry: ["IOS-01", "IOS-02", "memoria://login"],
      exit: ["IOS-11 Home Feed", "IOS-04 Password Recovery"],
      back: "IOS-01",
      deepLink: "memoria://login"
    },
    personasPermissions: {
      roles: ["Registered Member"],
      capabilities: ["login", "biometric_unlock"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Brand seal with title 'Welcome Back'.",
      main: "1. Face ID quick unlock trigger button (if biometric enrolled), 2. Email TextField, 3. Password SecureField, 4. Forgot Password button, 5. Sign In Button.",
      footer: "Don't have an archive yet? Create Account button."
    },
    exactControls: [
      "Button: 'Unlock with Face ID' (LAContext evaluation)",
      "Email TextField",
      "Password SecureField",
      "Button: 'Forgot Password?'",
      "Primary Button: 'Sign In'",
      "Create Account button"
    ],
    formValidation: {
      fields: [
        { name: "email", type: "email", required: true, errorCopy: "Please enter your email." },
        { name: "password", type: "password", required: true, errorCopy: "Please enter your password." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Face ID prompt or Email field",
      tabOrder: ["Face ID", "Email", "Password", "Sign In", "Forgot Password"],
      escapeBehavior: "Dismisses keyboard on scroll"
    },
    statesMatrix: {
      loading: "ProgressView on Sign In button; fields disabled.",
      empty: "Clean fields with autofill email/password from iOS AutoFill Keychain.",
      populated: "Valid credentials entered.",
      error: "Haptic notification error with banner: 'Invalid email or password.'",
      offline: "Offline alert; cached biometric unlock permitted if offline mode enabled.",
      permissionDenied: "Account suspended alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Sign in view. Face ID unlock or enter email and password.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native scroll view with Dynamic Type support.",
      tablet: "Centered 440pt card on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/login",
      authType: "None",
      requestBody: "{ email: string, password: string }",
      responseBody: "{ success: true, data: { accessToken: string, refreshToken: string, user: UserProfile } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service / iOS Keychain",
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
      privacyNotes: "Biometric unlock verified locally via LocalAuthentication framework."
    },
    testCriteria: {
      unit: ["triggers LAContext evaluatePolicy for biometrics", "saves tokens securely on successful login"],
      integration: ["POST /api/auth/login validates credentials"],
      e2e: ["logs in with test user in simulator, checks HomeFeed displays"]
    },
    uiComponents: ["NativeLoginView", "BiometricButton", "SecureField", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-04",
    category: "Native iOS — Auth & Onboarding",
    name: "Password Recovery Request Sheet",
    userGoal: "Request a secure password recovery email via native iOS sheet.",
    userStory: "As an iOS user who forgot my password, I want to enter my email in a clean native sheet and receive recovery instructions.",
    entryExitRoutes: {
      entry: ["IOS-03"],
      exit: ["IOS-05 Verification Code Sheet", "IOS-03"],
      back: "IOS-03",
      deepLink: "memoria://recovery"
    },
    personasPermissions: {
      roles: ["Anonymous Visitor"],
      capabilities: ["request_password_reset"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Reset Password' with Cancel button.",
      main: "1. Explanatory text, 2. Email Address TextField, 3. 'Send Recovery Code' Button.",
      footer: "Privacy reminder."
    },
    exactControls: [
      "Email Address TextField",
      "Button: 'Send Recovery Code'",
      "Cancel sheet button"
    ],
    formValidation: {
      fields: [
        { name: "email", type: "email", required: true, errorCopy: "Please enter your email." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Email field",
      tabOrder: ["Cancel", "Email", "Send button"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "ProgressView on button.",
      empty: "Empty email input.",
      populated: "Valid email entered.",
      error: "Inline error callout.",
      offline: "Offline alert.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Password reset request sheet. Enter email to receive a recovery code.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Standard iOS modal sheet with presentationDetents([.medium]).",
      tablet: "Form sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/forgot-password",
      authType: "None",
      requestBody: "{ email: string }",
      responseBody: "{ success: true, data: { message: 'Instructions sent if account exists.' } }",
      statusCodes: ["200 OK"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.password_reset_requested"],
      bullmqJobs: ["send-recovery-code-email"]
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Privacy-preserving neutral message."
    },
    testCriteria: {
      unit: ["validates email format before dispatch", "handles sheet dismiss"],
      integration: ["POST /api/auth/forgot-password enqueues job"],
      e2e: ["submits recovery email in simulator, sheet advances to code entry"]
    },
    uiComponents: ["RecoverySheetView", "TextField", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-05",
    category: "Native iOS — Auth & Onboarding",
    name: "Verification Code Entry Sheet",
    userGoal: "Enter a 6-digit verification code received via email with AutoFill One-Time Code support.",
    userStory: "As an archivist, I want the 6-digit code from my email to AutoFill automatically above the iOS keyboard so I can confirm instantly.",
    entryExitRoutes: {
      entry: ["IOS-04", "IOS-02"],
      exit: ["IOS-08 First Space", "IOS-03 Sign-In"],
      back: "IOS-04",
      deepLink: "memoria://verify?code=:code"
    },
    personasPermissions: {
      roles: ["User with Code"],
      capabilities: ["verify_code"],
      authRequired: false
    },
    contentHierarchy: {
      header: "Sheet title 'Enter Verification Code' with email recipient subtitle.",
      main: "1. 6-digit code input boxes with .oneTimeCode contentType, 2. 'Resend Code' button with 60s cooldown timer, 3. 'Verify & Continue' button.",
      footer: "Trouble receiving code? contact link."
    },
    exactControls: [
      "6-digit OTP code text field (.textContentType(.oneTimeCode))",
      "Button: 'Verify & Continue'",
      "Button: 'Resend Code' (with timer)"
    ],
    formValidation: {
      fields: [
        { name: "code", type: "text", required: true, limits: "Exactly 6 digits", errorCopy: "Please enter the complete 6-digit code." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Code input field (opens number keypad automatically)",
      tabOrder: ["Code boxes", "Verify button", "Resend button"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Verifying code spinner.",
      empty: "Empty 6-box pin entry.",
      populated: "6 digits filled; automatically triggers verification submit.",
      error: "Haptic error; boxes turn red with shake animation: 'Incorrect code. Please try again.'",
      offline: "Offline alert.",
      permissionDenied: "Code expired alert with resend option."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Verification code entry. Enter the 6-digit code sent to your email.",
      touchTargetMin: "44x44 pt for digit boxes",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Centered keypad sheet with presentationDetents([.medium]).",
      tablet: "Centered sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/auth/verify-code",
      authType: "None",
      requestBody: "{ email: string, code: string }",
      responseBody: "{ success: true, data: { verified: boolean, accessToken: string } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "identity-service",
      databaseTables: ["users", "user_sessions"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["identity.code_verified"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Verification codes expire after 15 minutes."
    },
    testCriteria: {
      unit: ["auto-submits when 6th digit entered", "triggers UINotificationFeedbackGenerator on error"],
      integration: ["POST /api/auth/verify-code validates code"],
      e2e: ["enters code '123456', verifies auto-submit and navigation"]
    },
    uiComponents: ["OTPCodeField", "CountdownTimer", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-06",
    category: "Native iOS — Auth & Onboarding",
    name: "Deep-Linked Invitation Acceptance View",
    userGoal: "Accept a space invitation launched via universal link (https://memoria.local/invite/:token).",
    userStory: "As an invited family member tapping a link in Messages, I want Memoria to open directly to the space invitation card with Accept button.",
    entryExitRoutes: {
      entry: ["Universal link", "memoria://invite/:token"],
      exit: ["IOS-11 Home Feed (target space selected)", "IOS-02 Register"],
      back: "IOS-11",
      deepLink: "https://memoria.local/invite/:token"
    },
    personasPermissions: {
      roles: ["Invited Recipient"],
      capabilities: ["accept_invitation"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar with close button.",
      main: "1. Space cover photo banner, 2. Space Name, 3. Inviter attribution ('Eleanor invited you to collaborate'), 4. Assigned Role badge ('Contributor'), 5. Personal invitation note.",
      footer: "Buttons: 'Accept & Enter Space' and 'Decline'."
    },
    exactControls: [
      "Button: 'Accept Invitation & Enter Space'",
      "Button: 'Decline'",
      "Haptic feedback on tap (.impact(.medium))"
    ],
    keyboardFocus: {
      initialFocus: "Accept button",
      tabOrder: ["Accept button", "Decline button"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Fetching invitation details spinner.",
      empty: "N/A",
      populated: "Vibrant invitation card with cover photo and inviter avatar.",
      error: "Alert: 'This invitation has expired or been revoked.'",
      offline: "Offline alert; requires network to join space.",
      permissionDenied: "Token invalid alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Space invitation from Eleanor to join Vance Family Archive as a Contributor.",
      touchTargetMin: "48x48 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native modal sheet with rich card.",
      tablet: "Form sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/invitations/:token/accept",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { spaceId: string, role: string } }",
      statusCodes: ["200 OK", "401 Unauthorized", "410 Gone"]
    },
    servicePersistence: {
      service: "memory-service",
      databaseTables: ["space_invitations", "space_members"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.invitation_accepted"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Space addition logged."
    },
    testCriteria: {
      unit: ["parses universal link token parameter in SceneDelegate / MemoriaApp", "navigates on accept"],
      integration: ["POST /api/spaces/invitations/:token/accept creates space_members row"],
      e2e: ["launches deep link, taps Accept, verifies active space updates"]
    },
    uiComponents: ["InvitationSheetView", "SpaceBanner", "RoleBadge", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-07",
    category: "Native iOS — Auth & Onboarding",
    name: "Mobile Onboarding Carousel",
    userGoal: "Swipe through 3 visual cards explaining Memoria's philosophy (Originals Preserved, Family Collaboration, 3D Heirloom Books).",
    userStory: "As a new mobile archivist, I want a brief 3-page walkthrough of how our memories become keepsake books with page indicator dots.",
    entryExitRoutes: {
      entry: ["IOS-02 Sign-Up", "IOS-03 Sign-In"],
      exit: ["IOS-08 Create First Space", "IOS-11 Home Feed"],
      back: "N/A",
      deepLink: "memoria://onboarding"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["complete_onboarding"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Top bar with 'Skip' text button.",
      main: "TabView with .tabViewStyle(.page): 1. Lossless Archival Media (SHA-256 byte integrity), 2. Collaborative Family Spaces, 3. Articulated 3D Books with RealityKit.",
      footer: "UIPageControl dots, 'Continue' Primary Button."
    },
    exactControls: [
      "Swipe gestures across TabView pages",
      "Page indicator dots (tap to change page)",
      "Button: 'Skip'",
      "Primary Button: 'Continue' / 'Get Started'"
    ],
    keyboardFocus: {
      initialFocus: "Continue button",
      tabOrder: ["Skip button", "Continue button"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "N/A",
      empty: "N/A",
      populated: "High-resolution archival imagery, Cormorant Garamond headings, smooth page transitions.",
      error: "N/A",
      offline: "Fully available offline.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Onboarding page 1 of 3: Lossless Archival Media. Swipe right to view next page.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Full screen page view with safe area padding.",
      tablet: "Centered 500pt carousel on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "N/A",
      endpoint: "N/A (Client presentation)",
      authType: "None",
      responseBody: "N/A",
      statusCodes: ["200 OK"]
    },
    servicePersistence: {
      service: "Local UserDefaults / AppStorage",
      databaseTables: [],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["ios.onboarding_completed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "None",
      auditLogged: false,
      privacyNotes: "Local state."
    },
    testCriteria: {
      unit: ["advances page index on button click", "sets hasSeenOnboarding flag in AppStorage"],
      integration: ["renders all 3 pages cleanly"],
      e2e: ["swipes through 3 onboarding pages, taps Get Started, lands on Create Space"]
    },
    uiComponents: ["OnboardingCarouselView", "PageCard", "PageIndicator", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-08",
    category: "Native iOS — Auth & Onboarding",
    name: "Create First Space Sheet",
    userGoal: "Name and choose a theme color for the first family memory space natively in iOS.",
    userStory: "As a new user, I want a clean native sheet to name our space 'Vance Family Heritage' and select Forest Green.",
    entryExitRoutes: {
      entry: ["IOS-07", "IOS-12 Space Switcher"],
      exit: ["IOS-09 First Profile", "IOS-11 Home Feed"],
      back: "IOS-07",
      deepLink: "memoria://spaces/new"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["create_memory_space"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'New Memory Space' with 'Cancel' and 'Create' buttons.",
      main: "1. Space Name TextField (with clear button), 2. Space Type Picker (Family, Personal, Event, Journey), 3. Theme Color circular swatch selector (Forest, Plum, Ink, Sage), 4. Description TextField.",
      footer: "Privacy explanation note."
    },
    exactControls: [
      "Space Name TextField",
      "Segmented Space Type Picker",
      "Color Swatch Buttons with haptic selection (.selection)",
      "Create NavigationBarButton"
    ],
    formValidation: {
      fields: [
        { name: "name", type: "text", required: true, limits: "1-100 chars", errorCopy: "Please name your space." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Space Name field",
      tabOrder: ["Cancel", "Name", "Type picker", "Swatches", "Create"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "ProgressView in navigation bar; Create button disabled.",
      empty: "Placeholder: 'e.g. Vance Family Archive'.",
      populated: "Valid space details entered.",
      error: "Haptic notification error with inline alert.",
      offline: "Queued in local SQLite for background sync.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Create memory space sheet. Enter space name and select a color theme.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet presentationDetents([.large]).",
      tablet: "Form sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces",
      authType: "Bearer JWT",
      requestBody: "{ name: string, type: SpaceType, coverColor?: string }",
      responseBody: "{ success: true, data: { space: MemorySpace } }",
      statusCodes: ["201 Created", "400 Bad Request"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memory_spaces", "space_members"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.space_created"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Owner role assigned."
    },
    testCriteria: {
      unit: ["enforces non-empty name before enabling Create button", "fires haptic on swatch tap"],
      integration: ["POST /api/spaces creates space row in database"],
      e2e: ["enters space name, taps Create, verifies transition to Profile sheet"]
    },
    uiComponents: ["CreateSpaceSheet", "ColorSwatchRow", "SegmentedPicker", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-09",
    category: "Native iOS — Auth & Onboarding",
    name: "Create First Profile Sheet",
    userGoal: "Add the first family member, child, ancestor, or pet profile using native iOS form controls.",
    userStory: "As an archivist, I want to add my daughter's profile with her photo from my iPhone camera roll and birthdate.",
    entryExitRoutes: {
      entry: ["IOS-08", "IOS-35 People Directory"],
      exit: ["IOS-10 Invite Contacts", "IOS-11 Home Feed"],
      back: "IOS-08",
      deepLink: "memoria://profiles/new"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["create_profile"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Add Person or Subject' with 'Skip' and 'Save' buttons.",
      main: "1. Avatar photo circular picker button (with camera badge), 2. Full Name TextField, 3. Profile Category Picker (Person, Child, Pet, Couple, Ancestor), 4. Relationship TextField, 5. Birthdate DatePicker (.graphical or .compact).",
      footer: "Privacy note."
    },
    exactControls: [
      "Avatar photo picker button (PhotosPicker)",
      "Name TextField",
      "Type Picker",
      "Relationship TextField",
      "DatePicker (Birthdate)",
      "Save NavigationBarButton"
    ],
    formValidation: {
      fields: [
        { name: "name", type: "text", required: true, limits: "1-100 chars", errorCopy: "Please enter a name." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Name TextField",
      tabOrder: ["Avatar", "Name", "Type", "Relationship", "Birthdate", "Save"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Saving profile spinner.",
      empty: "Blank form.",
      populated: "Name entered and photo selected.",
      error: "Inline red error callout.",
      offline: "Queued in local SQLite.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Create profile sheet. Enter name, relationship, and optional birthdate.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet presentationDetents([.large]).",
      tablet: "Form sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/profiles",
      authType: "Bearer JWT",
      requestBody: "{ name: string, type: ProfileType, relationship?: string, birthDate?: string }",
      responseBody: "{ success: true, data: { profile: SpaceProfile } }",
      statusCodes: ["201 Created", "400 Bad Request"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
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
      privacyNotes: "Children and personal dates protected by space tenant boundary."
    },
    testCriteria: {
      unit: ["parses birthdate to ISO string", "handles PhotosPicker selection"],
      integration: ["POST /api/spaces/:spaceId/profiles creates profile"],
      e2e: ["creates profile with photo, verifies saved state in database"]
    },
    uiComponents: ["CreateProfileSheet", "AvatarPickerButton", "DatePickerField", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-10",
    category: "Native iOS — Auth & Onboarding",
    name: "Contact Picker Contributor Invite View",
    userGoal: "Invite family members using native iOS CNContactPickerViewController or manual email entry.",
    userStory: "As an archivist, I want to tap 'Pick from Contacts' to select my brother's email address and send him a space invitation.",
    entryExitRoutes: {
      entry: ["IOS-09", "IOS-38 Members"],
      exit: ["IOS-11 Home Feed", "IOS-16 Quick Capture"],
      back: "IOS-09",
      deepLink: "memoria://spaces/:spaceId/invite"
    },
    personasPermissions: {
      roles: ["Space Owner", "Space Editor"],
      capabilities: ["invite_members"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Invite Family' with 'Skip' and 'Send' buttons.",
      main: "1. 'Choose from Contacts' Button with SF Symbol person.crop.circle.badge.plus, 2. Invited recipients token field, 3. Role selector (Contributor, Editor, Viewer), 4. Personal note TextField, 5. Sharable Link button.",
      footer: "Invitations are private and secure note."
    },
    exactControls: [
      "Button: 'Choose from Contacts' (triggers CNContactPickerViewController)",
      "Manual Email TextField",
      "Role Picker (Contributor / Editor / Viewer)",
      "Button: 'Copy Private Invite Link'",
      "Send Button"
    ],
    formValidation: {
      fields: [
        { name: "emails", type: "email[]", required: false, errorCopy: "Please verify email format." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Manual Email field",
      tabOrder: ["Choose Contacts", "Email field", "Role picker", "Copy link", "Send"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Sending invites spinner.",
      empty: "Empty recipient list.",
      populated: "Selected contact chips with avatars and emails.",
      error: "Error banner with retry.",
      offline: "Queued for dispatch on reconnect.",
      permissionDenied: "Contact permission denied: manual email input remains available."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Invite contributors. Choose from iOS contacts or enter email manually.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet presentationDetents([.large]).",
      tablet: "Form sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/spaces/:spaceId/invitations",
      authType: "Bearer JWT",
      requestBody: "{ invitations: Array<{ email: string, role: string }> }",
      responseBody: "{ success: true, data: { invitedCount: number } }",
      statusCodes: ["201 Created", "400 Bad Request"]
    },
    servicePersistence: {
      service: "memory-service / identity-service",
      databaseTables: ["space_invitations"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["collab.invitations_dispatched"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Contacts accessed only via user-selected CNContactPicker; zero address book mass scanning."
    },
    testCriteria: {
      unit: ["handles CNContactPicker delegate callbacks without requesting broad contacts permission"],
      integration: ["POST /api/spaces/:spaceId/invitations stores invitations"],
      e2e: ["selects email, sends invite, completes onboarding, lands on HomeFeed"]
    },
    uiComponents: ["ContactInviteSheet", "RecipientTokenField", "RolePicker", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 2.2 HOME & NAVIGATION (IOS-11 to IOS-16)
  // ==========================================
  {
    id: "IOS-11",
    category: "Native iOS — Home & Navigation",
    name: "TabBar Home View & Memory Feed",
    userGoal: "Browse the living memory feed, view today-in-history, switch spaces, and navigate between native tabs.",
    userStory: "As an iPhone user, I want a smooth 120 FPS native feed of family photos and today-in-history with bottom tabs.",
    entryExitRoutes: {
      entry: ["IOS-01 Launch", "IOS-03 Login", "memoria://home"],
      exit: ["IOS-26 Memory Detail", "IOS-16 Quick Capture", "IOS-12 Space Switcher", "IOS-43 Bookshelf"],
      back: "N/A (Root Tab)",
      deepLink: "memoria://home"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_feed"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Top Navigation Bar: Active Space Name button with chevron, Search icon button (IOS-15), Notification bell with unread badge (IOS-14).",
      main: "LazyVStack Feed: 1. 'Today in History' memory card (if memories exist on today's calendar date), 2. Chronological memory cards with photo thumbnails, EXIF capture date, location, and heart button.",
      footer: "Native UITabBar (5 tabs: Home, Archive, + Capture Center, Books, Settings)."
    },
    exactControls: [
      "Space Switcher navigation bar title button (opens IOS-12)",
      "Search icon button",
      "Notification bell button",
      "Memory card tap (opens IOS-26)",
      "Favorite heart button with haptic feedback (.impact(.light))",
      "Center TabBar '+' Capture button (opens IOS-16)"
    ],
    keyboardFocus: {
      initialFocus: "First memory card",
      tabOrder: ["Space switcher", "Search", "Notifications", "Memory cards", "Tabs"],
      escapeBehavior: "N/A"
    },
    statesMatrix: {
      loading: "Skeleton shimmer cards matching Warm Ivory #F7F4EE canvas.",
      empty: "Archival empty state card with prompt: 'Your archive is quiet. Tap + to add the first memory.'",
      populated: "High-performance LazyVStack with async Image loading, cached thumbnails, and fluid inertial scrolling.",
      error: "Error banner with pull-to-refresh trigger.",
      offline: "Offline indicator pill in navigation bar; feed served directly from local SQLite database.",
      permissionDenied: "Redirect to sign-in."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Home memory feed for Vance Family Archive. Today in history and recent memories.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native iOS TabBar with safe area inset handling on all iPhone sizes.",
      tablet: "NavigationSplitView with sidebar on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/dashboard/overview",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { recentMemories: Array<Memory>, todayInHistory: Array<Memory> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memories", "memory_media"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["ios.feed_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Memories cached securely in app sandbox."
    },
    testCriteria: {
      unit: ["renders Today in History card when dates match", "triggers haptic on heart tap"],
      integration: ["GET /api/dashboard/overview populates feed"],
      e2e: ["launches app to HomeFeedView, scrolls through feed, taps memory card"]
    },
    uiComponents: ["HomeFeedView", "TodayInHistoryCard", "MemoryFeedCard", "MemoriaTabBar"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-12",
    category: "Native iOS — Home & Navigation",
    name: "Memory Space Switcher Sheet with Haptic Feedback",
    userGoal: "Switch between owned and shared memory spaces with haptic feedback or create a new space.",
    userStory: "As a member of multiple family spaces, I want to tap the title to switch from my personal space to our family space with a satisfying haptic click.",
    entryExitRoutes: {
      entry: ["IOS-11", "IOS-13"],
      exit: ["IOS-11 (with new space active)", "IOS-08 New Space Sheet"],
      back: "IOS-11",
      deepLink: "memoria://spaces"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["switch_space"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Your Memory Spaces' with '+ New Space' button.",
      main: "List of Space Rows: Color swatch indicator, Space Name, Role badge (Owner, Editor, Contributor), Member avatars count, Checkmark on currently active space.",
      footer: "Storage summary note."
    },
    exactControls: [
      "Space row tap (switches active space, triggers .selection haptic, dismisses sheet)",
      "Button: '+ New Memory Space' (opens IOS-08)",
      "Dismiss drag gesture"
    ],
    keyboardFocus: {
      initialFocus: "Active space row",
      tabOrder: ["New space button", "Space rows"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "List skeleton pulse.",
      empty: "Notice: 'No spaces found.'",
      populated: "Clean list of spaces with checkmark on active row.",
      error: "Error banner with refresh button.",
      offline: "Cached space list served from SQLite.",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Memory space switcher sheet. Currently selected: Vance Family Archive. Double tap another space to switch.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet presentationDetents([.medium, .large]).",
      tablet: "Popover on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { items: Array<MemorySpace & { role: string }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memory_spaces", "space_members"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["ios.space_switched"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Active space ID saved in AppStorage."
    },
    testCriteria: {
      unit: ["fires UISelectionFeedbackGenerator on space tap", "updates active space state"],
      integration: ["GET /api/spaces returns spaces list"],
      e2e: ["opens space switcher, selects second space, verifies home feed reloads"]
    },
    uiComponents: ["SpaceSwitcherSheet", "SpaceRow", "RoleBadge", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-13",
    category: "Native iOS — Home & Navigation",
    name: "Space Overview & Mobile Quick Actions",
    userGoal: "Inspect active space details, contributor avatars, storage meter, and launch quick capture actions.",
    userStory: "As an archivist, I want a dedicated space overview view to see member counts, storage status, and open space settings.",
    entryExitRoutes: {
      entry: ["IOS-11", "IOS-12"],
      exit: ["IOS-38 Members", "IOS-23 Timeline", "IOS-16 Capture Hub"],
      back: "IOS-11",
      deepLink: "memoria://spaces/:spaceId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_space_overview"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Space Cover parallax header: Space title, role badge, settings gear icon.",
      main: "1. Quick action grid: + Photo, + Audio, + Story, 2. Space Stats card (Memories count, Contributors count, Books count), 3. Recent activity highlights, 4. Storage meter bar.",
      footer: "Invite contributors banner."
    },
    exactControls: [
      "Quick action buttons (+ Photo, + Audio, + Story)",
      "Settings gear button (opens space settings sheet)",
      "Members strip tap (opens IOS-38)",
      "View Timeline button (opens IOS-23)"
    ],
    keyboardFocus: {
      initialFocus: "Quick action buttons",
      tabOrder: ["Settings gear", "Quick actions", "Stats cards", "Timeline button"],
      escapeBehavior: "Returns to home"
    },
    statesMatrix: {
      loading: "Parallax header and stats skeletons.",
      empty: "Notice inviting first contribution.",
      populated: "Rich space view with photographic cover and stats.",
      error: "Error banner with reload.",
      offline: "Cached overview available.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Space overview for Vance Family Archive. 142 memories, 6 members. Quick action buttons.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native scroll view with sticky nav bar on scroll.",
      tablet: "Two-column overview on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { space: MemorySpace, memberCount: number, memoryCount: number } }",
      statusCodes: ["200 OK", "401 Unauthorized", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
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
      privacyNotes: "Space tenant isolated."
    },
    testCriteria: {
      unit: ["renders correct member count and role badge", "navigates to settings on gear tap"],
      integration: ["GET /api/spaces/:spaceId returns valid metadata"],
      e2e: ["navigates to space overview, taps + Photo quick action"]
    },
    uiComponents: ["SpaceOverviewView", "ParallaxHeader", "QuickActionGrid", "StatsCard"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-14",
    category: "Native iOS — Home & Navigation",
    name: "Native Notification List with Action Buttons",
    userGoal: "Review in-app family notifications, comment mentions, space invitations, and media processing updates.",
    userStory: "As an archivist, I want to tap the notification bell to see when family members comment on our memories and tap directly into the photo.",
    entryExitRoutes: {
      entry: ["IOS-11", "Push notification tap"],
      exit: ["IOS-26 Memory Detail", "IOS-06 Invite", "IOS-11"],
      back: "IOS-11",
      deepLink: "memoria://notifications"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_notifications"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar: 'Notifications' with 'Mark All as Read' button.",
      main: "List of notification rows: Category icon (Comment, Invite, Processing, Book), Title, Relative timestamp ('2h ago'), Preview snippet, Unread indicator dot, Swipe-to-delete action.",
      footer: "End of notifications marker."
    },
    exactControls: [
      "Notification row tap (navigates to target entity, marks read)",
      "Button: 'Mark All as Read'",
      "Swipe-to-delete row action"
    ],
    keyboardFocus: {
      initialFocus: "First unread notification",
      tabOrder: ["Mark All button", "Notification rows"],
      escapeBehavior: "Returns to home"
    },
    statesMatrix: {
      loading: "List row skeleton pulse.",
      empty: "Notice: 'No notifications. You're all caught up.'",
      populated: "List of notifications with unread items styled in Warm Ivory and Plum accent dot.",
      error: "Error banner with refresh button.",
      offline: "Cached notifications served offline.",
      permissionDenied: "Redirect to sign-in."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Notifications list. Eleanor commented on Family Reunion 1984. 2 hours ago.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native List with swipe actions.",
      tablet: "Centered 600pt list on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/notifications",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { notifications: Array<any> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "identity-service / Local SQLite",
      databaseTables: ["audit_logs"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["ios.notifications_read"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Sensitive story content excluded from lock screen push notifications."
    },
    testCriteria: {
      unit: ["marks single item read on tap", "deletes notification on swipe"],
      integration: ["GET /api/notifications returns user alerts"],
      e2e: ["opens notifications, taps row, confirms navigation to memory"]
    },
    uiComponents: ["NotificationListView", "NotificationRow", "SwipeActions", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-15",
    category: "Native iOS — Home & Navigation",
    name: "Global Search with Voice Search Integration",
    userGoal: "Search memories, profiles, scanned OCR text, and tags using keyboard or Siri / Speech framework dictation.",
    userStory: "As an archivist, I want to tap the microphone and say 'Grandpa fishing 1972' to find matching photos instantly.",
    entryExitRoutes: {
      entry: ["IOS-11", "memoria://search"],
      exit: ["IOS-26 Memory Detail", "IOS-36 Profile Detail", "IOS-11"],
      back: "IOS-11",
      deepLink: "memoria://search?q=:query"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["search_memories"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Native search bar (.searchable) with voice dictation button and clear query button.",
      main: "1. Recent searches chips, 2. People results horizontal bubble strip, 3. Memory results grid with OCR text snippet matches, 4. Tag chips.",
      footer: "Search results count."
    },
    exactControls: [
      "Search TextField (.searchable)",
      "Voice dictation button (SFSpeechRecognizer)",
      "Filter chip selector (All, Photos, Audio, OCR Scans)",
      "Memory result card tap (opens IOS-26)"
    ],
    keyboardFocus: {
      initialFocus: "Search input field",
      tabOrder: ["Search bar", "Filter chips", "Result cards"],
      escapeBehavior: "Cancels search"
    },
    statesMatrix: {
      loading: "Search skeleton pulse.",
      empty: "Notice: 'No memories found matching your search.'",
      populated: "Categorized search results with highlighted matching words.",
      error: "Error banner with refresh.",
      offline: "Local SQLite FTS5 full-text search executed offline.",
      permissionDenied: "Voice search permission denied: standard typing remains active."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Search view. Search across memories, people, and scanned text with voice search support.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native searchable interface with dynamic keyboard.",
      tablet: "Expanded grid on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/search",
      authType: "Bearer JWT",
      requestBody: "Query: { q: string, spaceId?: string }",
      responseBody: "{ success: true, data: { items: Array<Memory>, total: number } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "search-service / Local SQLite FTS5",
      databaseTables: ["memories", "media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["search.executed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Search strictly scoped to authorized spaces."
    },
    testCriteria: {
      unit: ["debounces query input by 300ms", "executes local SQLite FTS when offline"],
      integration: ["GET /api/search returns query matches"],
      e2e: ["types query 'wedding', verifies results appear, taps result card"]
    },
    uiComponents: ["NativeSearchView", "SearchFilterChips", "ResultCard", "VoiceDictationButton"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-16",
    category: "Native iOS — Home & Navigation",
    name: "Quick Capture Modal Hub (+ Button Sheet)",
    userGoal: "Launch any memory capture workflow from the center '+' tab bar button: Take Photo, Pick from Roll, Record Video, Record Audio, or Write Story.",
    userStory: "As an archivist, I want to tap the big '+' button to immediately choose whether I am snapping a photo, recording a voice note, or writing a thought.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar '+' center button", "memoria://capture"],
      exit: ["IOS-17 Camera / PHPicker", "IOS-18 Video Capture", "IOS-19 Voice Recorder", "IOS-20 Quick Story"],
      back: "IOS-11",
      deepLink: "memoria://capture"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["create_memory", "upload_media"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet title 'Preserve a Memory' with space indicator and close button.",
      main: "Grid of 5 tactile capture buttons with SF Symbols and warm color accents: 1. Camera / Photo Roll, 2. Record Home Video, 3. Record Voice Note, 4. Write Quick Story, 5. Scan Physical Document.",
      footer: "Cancel button."
    },
    exactControls: [
      "Capture option buttons (Camera, Video, Audio, Story, Scan)",
      "Close / Cancel button",
      "Haptic feedback on tap (.impact(.medium))"
    ],
    keyboardFocus: {
      initialFocus: "First capture button (Camera)",
      tabOrder: ["Capture buttons", "Cancel"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "N/A",
      empty: "N/A",
      populated: "Warm Ivory sheet with tactile Plum/Sage button cards.",
      error: "N/A",
      offline: "All capture actions fully supported offline.",
      permissionDenied: "Alert if user is only Viewer in the active space."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Quick capture hub. Choose photo, video, voice note, story, or document scanning.",
      touchTargetMin: "56x56 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet presentationDetents([.medium]).",
      tablet: "Centered modal popover on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "N/A",
      endpoint: "N/A (Client workflow router)",
      authType: "None",
      responseBody: "N/A",
      statusCodes: ["200 OK"]
    },
    servicePersistence: {
      service: "iOS Client",
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
      privacyNotes: "Local action router."
    },
    testCriteria: {
      unit: ["routes to correct subview on button tap", "checks space role permissions"],
      integration: ["opens target sheet with active spaceId"],
      e2e: ["taps center '+' tab bar button, verifies Quick Capture sheet appears with all 5 options"]
    },
    uiComponents: ["QuickCaptureSheet", "CaptureOptionCard", "Button"],
    verifiedStatus: "Implemented & Verified"
  },

  // ==========================================
  // 2.3 CAPTURE & UPLOADS (IOS-17 to IOS-22)
  // ==========================================
  {
    id: "IOS-17",
    category: "Native iOS — Capture & Uploads",
    name: "Custom Camera Viewfinder & PHPicker Integration",
    userGoal: "Capture new photos with AVFoundation camera or select multiple high-resolution photos via PHPickerViewController.",
    userStory: "As an archivist, I want to take a crisp photo of grandmother's heirloom necklace or select 10 photos from my camera roll with lossless SHA-256 preservation.",
    entryExitRoutes: {
      entry: ["IOS-16", "memoria://camera"],
      exit: ["IOS-27 Edit Metadata", "IOS-21 Upload Queue", "IOS-11"],
      back: "IOS-16",
      deepLink: "memoria://camera"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["capture_photo", "upload_media"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Camera top bar: Flash toggle (Auto/On/Off), Camera flip button, Cancel button.",
      main: "AVCaptureVideoPreviewLayer full screen viewfinder with framing grid, or PHPicker multi-selection sheet.",
      footer: "Shutter button (circular white trigger with haptic feedback), Photo roll thumbnail button (opens PHPicker)."
    },
    exactControls: [
      "Shutter Button (AVCapturePhotoOutput trigger)",
      "Photo Roll Picker button (PHPickerConfiguration with .images filter and selectionLimit: 50)",
      "Flash Toggle button",
      "Camera Flip button",
      "Close button"
    ],
    keyboardFocus: {
      initialFocus: "Shutter button",
      tabOrder: ["Flash", "Camera flip", "Shutter", "Photo roll", "Close"],
      escapeBehavior: "Dismisses camera"
    },
    statesMatrix: {
      loading: "Camera session initializing spinner.",
      empty: "Live camera stream.",
      populated: "Captured photo preview thumbnail displayed in bottom-left corner.",
      error: "Camera permission denied alert with 'Open Settings' button.",
      offline: "Captured photos saved locally to Documents/memoria_originals and queued in SQLite.",
      permissionDenied: "Camera / Photos permission denied alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Camera viewfinder. Double tap shutter button to take a photo. Tap photo roll to select existing photos.",
      touchTargetMin: "64x64 pt shutter button",
      focusTrapping: true,
      contrastRatio: "12:1 (White controls over camera feed)"
    },
    responsive: {
      mobile: "Full screen viewfinder adapted to device aspect ratio.",
      tablet: "Viewfinder on iPad with side shutter control.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/media/upload-session",
      authType: "Bearer JWT",
      requestBody: "{ spaceId: string, fileName: string, mimeType: string, fileSizeBytes: number, checksumSha256: string }",
      responseBody: "{ success: true, data: { mediaId: string, uploadUrl: string } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "media-service / Local Disk Storage",
      databaseTables: ["media_assets", "memories"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["media.photo_captured"],
      bullmqJobs: ["generate-derivatives"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Original byte-for-byte SHA-256 preserved; EXIF GPS coordinates retained locally."
    },
    testCriteria: {
      unit: ["computes SHA-256 of captured image data before upload", "handles PHPicker result array"],
      integration: ["creates upload session on backend"],
      e2e: ["simulates photo capture, verifies image saved to local disk and upload queued"]
    },
    uiComponents: ["CameraViewfinder", "ShutterButton", "PHPickerWrapper", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-18",
    category: "Native iOS — Capture & Uploads",
    name: "Video Capture & Native Trim Preview",
    userGoal: "Record short family video clips (up to 10 minutes) and trim start/end points using UIVideoEditorController.",
    userStory: "As an archivist, I want to record my children singing happy birthday to grandfather and trim out the first 2 seconds.",
    entryExitRoutes: {
      entry: ["IOS-16"],
      exit: ["IOS-27 Edit Metadata", "IOS-21 Upload Queue"],
      back: "IOS-16",
      deepLink: "memoria://video/capture"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["capture_video", "upload_media"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Recording timer (00:00 / 10:00 max) and cancel button.",
      main: "Live camera stream during recording; or AVPlayer video preview with frame scrubber during trim review.",
      footer: "Record/Stop button; or Trim scrubber bar with 'Use Video' button."
    },
    exactControls: [
      "Record / Stop Button (Red circular trigger)",
      "Trim Start and End drag handles",
      "Play / Pause preview button",
      "Button: 'Use Video'",
      "Button: 'Retake'"
    ],
    keyboardFocus: {
      initialFocus: "Record button",
      tabOrder: ["Record", "Trim handles", "Use video", "Retake"],
      escapeBehavior: "Prompts if unsaved video exists"
    },
    statesMatrix: {
      loading: "Exporting trimmed video spinner.",
      empty: "Live viewfinder ready to record.",
      populated: "Recorded video loaded in AVPlayer preview.",
      error: "Camera/Mic permission denied alert.",
      offline: "Saved to local storage and queued in SQLite offline queue.",
      permissionDenied: "Permission denied alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Video recording. Double tap to start recording. Maximum length 10 minutes.",
      touchTargetMin: "64x64 pt record button",
      focusTrapping: true,
      contrastRatio: "12:1"
    },
    responsive: {
      mobile: "Full screen video capture.",
      tablet: "Full screen with iPad layout.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/media/upload-session",
      authType: "Bearer JWT",
      requestBody: "{ spaceId: string, fileName: string, mimeType: 'video/mp4', fileSizeBytes: number }",
      responseBody: "{ success: true, data: { mediaId: string, uploadUrl: string } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "media-service / Local Storage",
      databaseTables: ["media_assets", "memories"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["media.video_captured"],
      bullmqJobs: ["generate-video-poster"]
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Home videos encrypted at rest on device."
    },
    testCriteria: {
      unit: ["enforces 10-minute maximum recording limit", "trims AVAsset using AVAssetExportSession"],
      integration: ["initiates upload session for MP4 video"],
      e2e: ["records 3-second test clip, trims 1 second, confirms export"]
    },
    uiComponents: ["VideoCaptureView", "VideoTrimScrubber", "AVPlayerPreview", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-19",
    category: "Native iOS — Capture & Uploads",
    name: "Native Voice Note Recorder & Live Waveform",
    userGoal: "Record high-quality oral history voice notes with AVAudioRecorder, live audio waveform rendering, and pause/resume.",
    userStory: "As an interviewer, I want to record grandfather telling war stories with live audio wave visualization on my iPhone and pause when he takes a sip of water.",
    entryExitRoutes: {
      entry: ["IOS-16", "memoria://record"],
      exit: ["IOS-27 Edit Metadata", "IOS-21 Upload Queue"],
      back: "IOS-16",
      deepLink: "memoria://record"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["record_audio", "upload_media"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar: 'Oral History Recording' with Cancel button.",
      main: "1. Timer display (00:00 / max 60:00), 2. Live SwiftUI audio waveform reacting to AVAudioRecorder.averagePower, 3. Record / Pause / Resume controls, 4. Audio review playback scrubber.",
      footer: "Buttons: 'Discard' and 'Save Oral History'."
    },
    exactControls: [
      "Large Record / Pause circular button (with haptic feedback)",
      "Stop & Review button",
      "Playback Play/Pause button",
      "Button: 'Save Audio Recording'",
      "Button: 'Discard' (with confirmation prompt)"
    ],
    keyboardFocus: {
      initialFocus: "Record button",
      tabOrder: ["Record", "Stop", "Save", "Discard"],
      escapeBehavior: "Prompts if recording active"
    },
    statesMatrix: {
      loading: "Configuring AVAudioSession spinner.",
      empty: "Ready to record with microphone emblem and zeroed timer.",
      populated: "Animated green/plum waveform reacting to vocal decibels.",
      error: "Microphone permission denied alert.",
      offline: "Audio saved locally in m4a format and queued for sync.",
      permissionDenied: "Microphone permission alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Oral history voice recorder. Double tap record button to start.",
      touchTargetMin: "64x64 pt record trigger",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet with full screen recording stage.",
      tablet: "Centered 500pt recording card on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/media/upload-audio",
      authType: "Bearer JWT",
      requestBody: "Multipart audio/m4a binary payload with spaceId",
      responseBody: "{ success: true, data: { mediaId: string, durationSeconds: number } }",
      statusCodes: ["201 Created", "400 Bad Request"]
    },
    servicePersistence: {
      service: "media-service / Local Storage",
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
      privacyNotes: "Audio recorded via AAC codec; stored locally in app Documents."
    },
    testCriteria: {
      unit: ["updates timer every 0.1s during active recording", "handles audio interruptions e.g. phone calls"],
      integration: ["POST /api/media/upload-audio stores audio asset"],
      e2e: ["records 4 seconds, pauses, resumes, saves, verifies audio file exists"]
    },
    uiComponents: ["VoiceRecorderView", "AudioWaveformCanvas", "RecordButton", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-20",
    category: "Native iOS — Capture & Uploads",
    name: "Quick Thought, Quote & Micro-Story Composer",
    userGoal: "Compose a family quote or written memory quickly with title, body, date, and person tag.",
    userStory: "As an archivist, I want to quickly jot down a funny quote my daughter said at breakfast before I forget it.",
    entryExitRoutes: {
      entry: ["IOS-16"],
      exit: ["IOS-11 Home Feed", "IOS-26 Memory Detail"],
      back: "IOS-16",
      deepLink: "memoria://story/new"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["create_memory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Quick Story & Quote' with Cancel and 'Publish' buttons.",
      main: "1. Story Title TextField, 2. TextEditor for story narrative / quotation, 3. Tag Person selector pill, 4. DatePicker for when it was said/happened.",
      footer: "Word count badge."
    },
    exactControls: [
      "Title TextField",
      "Narrative TextEditor",
      "Tag Person selector button",
      "DatePicker (Capture Date)",
      "Publish NavigationBarButton"
    ],
    formValidation: {
      fields: [
        { name: "title", type: "text", required: true, limits: "1-120 chars", errorCopy: "Please provide a title." },
        { name: "content", type: "text", required: true, limits: "1-10000 chars", errorCopy: "Story content cannot be empty." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Title TextField",
      tabOrder: ["Title", "TextEditor", "Person pill", "DatePicker", "Publish"],
      escapeBehavior: "Prompts on unsaved text"
    },
    statesMatrix: {
      loading: "Publishing story spinner.",
      empty: "Placeholder: 'What happened? Write down the words, date, and who said them.'",
      populated: "Valid narrative entered.",
      error: "Validation error banner.",
      offline: "Saved to local SQLite database; immediately visible in feed.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Quick story composer. Write a quote or story, tag a person, and publish.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet with keyboard avoidance.",
      tablet: "Centered sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/memories",
      authType: "Bearer JWT",
      requestBody: "{ spaceId: string, title: string, content: string, format: 'story', capturedAt: string }",
      responseBody: "{ success: true, data: { memory: Memory } }",
      statusCodes: ["201 Created", "400 Bad Request"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memories"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.created"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Written memoirs protected by space tenant boundary."
    },
    testCriteria: {
      unit: ["validates non-empty title and content", "stores memory optimistically in SQLite"],
      integration: ["POST /api/memories stores story"],
      e2e: ["composes quote, tags person, taps Publish, confirms appears in HomeFeed"]
    },
    uiComponents: ["StoryComposerView", "TextEditor", "TagPersonPill", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-21",
    category: "Native iOS — Capture & Uploads",
    name: "Background Upload Queue & Progress Sheet",
    userGoal: "Monitor multi-file background URLSession transfers, SHA-256 hashing, and processing progress.",
    userStory: "As an archivist uploading 30 photos over cellular, I want to see upload progress and know transfers continue in background even if I switch apps.",
    entryExitRoutes: {
      entry: ["IOS-11 navigation bar upload pill", "IOS-17"],
      exit: ["IOS-11", "IOS-22 Offline Queue"],
      back: "IOS-11",
      deepLink: "memoria://uploads"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["view_uploads"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Upload Status' with overall percentage bar and close button.",
      main: "List of active transfers: Thumbnail, File name, Byte progress (e.g. '12.4 MB of 18.2 MB · 68%'), Status badge (Hashing, Uploading, Processing), Cancel button.",
      footer: "Buttons: 'Pause All' and 'Clear Completed'."
    },
    exactControls: [
      "Cancel item button (X)",
      "Pause All uploads button",
      "Resume All uploads button",
      "Clear completed items button"
    ],
    keyboardFocus: {
      initialFocus: "First active upload row",
      tabOrder: ["Pause button", "Upload rows", "Clear button"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Active streaming progress bars.",
      empty: "Notice: 'All media items verified and uploaded.'",
      populated: "List of active URLSessionUploadTask items with progress indicators.",
      error: "Amber failed state with 'Retry' button.",
      offline: "Paused badge: 'Uploads will resume automatically when online.'",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Background upload queue. Uploading 4 of 12 items. 45% complete.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet presentationDetents([.medium, .large]).",
      tablet: "Sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "N/A",
      endpoint: "Native URLSession background delegate events",
      authType: "Bearer JWT",
      responseBody: "N/A",
      statusCodes: ["200 OK"]
    },
    servicePersistence: {
      service: "iOS Background URLSession / Local SQLite",
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
      privacyNotes: "Upload tasks persist across app restarts using background URLSessionConfiguration."
    },
    testCriteria: {
      unit: ["handles URLSession delegate progress updates", "resumes interrupted tasks"],
      integration: ["completes multi-part direct upload to media service"],
      e2e: ["initiates 2 uploads, verifies progress bars advance to 100%"]
    },
    uiComponents: ["UploadQueueSheet", "UploadTaskRow", "ProgressBar", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-22",
    category: "Native iOS — Capture & Uploads",
    name: "Offline Queue, Retry Management & Conflict Sheet",
    userGoal: "Inspect offline pending mutations, retry failed network requests, and resolve sync conflicts safely.",
    userStory: "As an archivist traveling in rural areas without cellular service, I want to review my offline created memories and ensure they sync without data loss when I reach Wi-Fi.",
    entryExitRoutes: {
      entry: ["IOS-21", "IOS-55 Storage & Sync"],
      exit: ["IOS-11", "IOS-26"],
      back: "IOS-11",
      deepLink: "memoria://offline-queue"
    },
    personasPermissions: {
      roles: ["Authenticated Member"],
      capabilities: ["manage_offline_queue"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Offline Sync Queue' with 'Sync Now' button.",
      main: "1. Network status banner (Offline / Reconnecting / Connected), 2. Pending mutations list (Created Memories, Uploaded Photos, Profile Edits), 3. Conflict resolution section (Keep Local vs Keep Server vs Keep Both).",
      footer: "All offline changes are preserved safely in local SQLite note."
    },
    exactControls: [
      "Button: 'Sync Now' (triggers immediate retry)",
      "Button: 'Keep Both Versions' (on conflict)",
      "Delete pending offline change button"
    ],
    keyboardFocus: {
      initialFocus: "Sync Now button",
      tabOrder: ["Sync button", "Pending item rows", "Resolution buttons"],
      escapeBehavior: "Dismisses sheet"
    },
    statesMatrix: {
      loading: "Synchronizing mutations spinner.",
      empty: "Notice: 'All offline changes synchronized with server.'",
      populated: "List of pending database mutations awaiting network transmission.",
      error: "Error banner with diagnostic code.",
      offline: "Amber offline badge: 'Waiting for network connection...'",
      permissionDenied: "N/A"
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Offline sync queue. 5 changes pending network synchronization.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet presentationDetents([.medium, .large]).",
      tablet: "Sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/sync/batch",
      authType: "Bearer JWT",
      requestBody: "{ mutations: Array<{ operationId: string, type: string, payload: any, timestamp: string }> }",
      responseBody: "{ success: true, data: { processedCount: number, conflicts: Array<any> } }",
      statusCodes: ["200 OK", "409 Conflict"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite outbox",
      databaseTables: ["memories", "outbox_events"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["ios.offline_sync_completed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: true,
      privacyNotes: "Idempotency keys prevent duplicate records on reconnect."
    },
    testCriteria: {
      unit: ["queues mutations in SQLite outbox table when network unreachable", "replays in order"],
      integration: ["POST /api/sync/batch processes batch idempotently"],
      e2e: ["creates memory in airplane mode, turns on network, confirms auto-sync to server"]
    },
    uiComponents: ["OfflineQueueSheet", "PendingMutationRow", "ConflictCard", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },

  // ==========================================
  // 2.4 MEMORY BROWSING & MANAGEMENT (IOS-23 to IOS-28)
  // ==========================================
  {
    id: "IOS-23",
    category: "Native iOS — Browsing & Management",
    name: "Native Fluid Timeline with Inertial Scrolling",
    userGoal: "Scroll through family memories chronologically with buttery smooth 120 FPS ProMotion inertia and year jump scrubbing.",
    userStory: "As an archivist, I want to glide smoothly through 50 years of family history with decade markers and tap to open any memory.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar (Archive Tab)", "IOS-13"],
      exit: ["IOS-26 Memory Detail", "IOS-25 Calendar"],
      back: "IOS-11",
      deepLink: "memoria://timeline"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_timeline"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar: 'Timeline' with Year jump button, Filter icon button, and view mode toggle (Timeline / Grid / Calendar).",
      main: "Continuous LazyVStack Timeline: Year headers (e.g. '1974', '1982'), timeline nodes in Soft Sage #849483, memory cards with photo thumbnails, EXIF dates, and audio play buttons.",
      aside: "Right-hand vertical decade scrubber index (tap or drag to scrub years).",
      footer: "Timeline origin milestone."
    },
    exactControls: [
      "Decade scrubber vertical bar (haptic ticks on year boundaries)",
      "View mode segmented picker (Timeline / Grid / Calendar)",
      "Memory card tap (opens IOS-26)",
      "Audio play button on audio memories"
    ],
    keyboardFocus: {
      initialFocus: "First memory card",
      tabOrder: ["View picker", "Scrubber", "Timeline cards"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Pulsing timeline skeleton spine.",
      empty: "Notice: 'No memories recorded yet. Add memories to start your timeline.'",
      populated: "ProMotion 120 FPS timeline with thumbnail caching and smooth scrolling.",
      error: "Error banner with refresh action.",
      offline: "Fully available from local SQLite database.",
      permissionDenied: "403 Forbidden screen."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Chronological timeline view. Year markers and memory cards arranged in historical sequence.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Single vertical timeline spine with right-hand scrubber.",
      tablet: "Two-column staggered timeline on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/timeline",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { timeline: Array<{ year: number, memories: Array<Memory> }> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
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
      privacyNotes: "Historical capture dates indexed locally."
    },
    testCriteria: {
      unit: ["groups memories by capture year accurately", "fires UISelectionFeedbackGenerator during scrubbing"],
      integration: ["GET /api/spaces/:spaceId/timeline orders chronologically"],
      e2e: ["scrubs timeline to 1980, verifies smooth scroll, taps memory card"]
    },
    uiComponents: ["TimelineView", "TimelineNode", "DecadeScrubberBar", "MemoryCard"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-24",
    category: "Native iOS — Browsing & Management",
    name: "Responsive Media Grid with Pinch-to-Zoom Density",
    userGoal: "Browse family photos and scans in a responsive grid with pinch gestures to toggle between 2, 3, and 5 columns.",
    userStory: "As an archivist, I want to pinch the photo grid to zoom out to 5 columns for bird's-eye browsing or pinch in to 2 columns for large previews.",
    entryExitRoutes: {
      entry: ["IOS-11 TabBar (Archive Tab)", "IOS-23"],
      exit: ["IOS-26 Memory Detail", "IOS-28 Image Editor"],
      back: "IOS-11",
      deepLink: "memoria://grid"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_grid"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar: 'Media Grid' with column density picker and filter button.",
      main: "LazyVGrid with dynamic columns (2, 3, or 5 columns) responding to magnification gesture: square thumbnail cells with format badges (Video length, Audio waveform icon, Document badge).",
      footer: "Total photos count badge."
    },
    exactControls: [
      "MagnificationGesture (pinch in/out changes column count 2 ↔ 3 ↔ 5)",
      "Column density button in toolbar",
      "Thumbnail cell tap (opens IOS-26)",
      "Select mode button for batch operations"
    ],
    keyboardFocus: {
      initialFocus: "First grid cell",
      tabOrder: ["Toolbar", "Grid cells"],
      escapeBehavior: "Exits select mode"
    },
    statesMatrix: {
      loading: "Grid skeleton shimmer.",
      empty: "Notice: 'No photos or media in this space.'",
      populated: "High-density photo grid with thumbnail caching.",
      error: "Error banner with refresh.",
      offline: "Cached thumbnails served from local disk cache.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Photo media grid. 142 items. Double tap photo to inspect.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "2 to 5 columns on iPhone.",
      tablet: "4 to 8 columns on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/spaces/:spaceId/memories",
      authType: "Bearer JWT",
      requestBody: "Query: { format: 'image' }",
      responseBody: "{ success: true, data: { items: Array<Memory> } }",
      statusCodes: ["200 OK", "401 Unauthorized"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memories", "media_assets"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: [],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Thumbnails stored in local caches directory."
    },
    testCriteria: {
      unit: ["updates grid column count on magnification gesture", "handles thumbnail cache memory pressure"],
      integration: ["GET /api/spaces/:spaceId/memories returns media list"],
      e2e: ["pinches grid, verifies column transition from 3 to 2, taps cell"]
    },
    uiComponents: ["MediaGridView", "GridThumbnailCell", "DensityPicker", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-25",
    category: "Native iOS — Browsing & Management",
    name: "Interactive Calendar Memory Heatmap",
    userGoal: "Explore memories and family anniversaries mapped onto an interactive calendar heatmap on iOS.",
    userStory: "As an archivist, I want to tap on June 18 in the calendar to see all memories from that date across different years.",
    entryExitRoutes: {
      entry: ["IOS-23", "IOS-11"],
      exit: ["IOS-26 Memory Detail", "IOS-23 Timeline"],
      back: "IOS-23",
      deepLink: "memoria://calendar"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_calendar"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Navigation bar: 'Memory Calendar' with month/year navigation chevrons and 'Today' button.",
      main: "1. 7-column Calendar Grid: Day numbers with colored dots representing memory volume (Heatmap: Sage for 1-3, Plum for 4+), 2. Day memory list below calendar for selected date.",
      footer: "Calendar legend."
    },
    exactControls: [
      "Month navigation chevrons (Prev, Next)",
      "Calendar day cell tap (selects date, triggers .selection haptic)",
      "Today button",
      "Memory row tap in bottom drawer"
    ],
    keyboardFocus: {
      initialFocus: "Today's cell",
      tabOrder: ["Navigation", "Calendar days", "Day memories"],
      escapeBehavior: "None"
    },
    statesMatrix: {
      loading: "Calendar grid skeleton pulse.",
      empty: "Clean calendar cells without memory dots.",
      populated: "Heatmap decorated with memory dots and anniversary flags.",
      error: "Error banner with reload.",
      offline: "Cached calendar rendered from SQLite.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Calendar memory view. June 18 has 4 memories. Double tap to view.",
      touchTargetMin: "44x44 pt for all day cells",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Calendar top half, memory list bottom half.",
      tablet: "Side-by-side calendar and day inspector on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/memories/calendar",
      authType: "Bearer JWT",
      requestBody: "Query: { month: number, year: number }",
      responseBody: "{ success: true, data: { days: Record<string, any> } }",
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
      privacyNotes: "Birthdays and anniversaries kept confidential."
    },
    testCriteria: {
      unit: ["computes heatmap dot colors based on daily memory count", "handles month transitions"],
      integration: ["GET /api/memories/calendar returns aggregated data"],
      e2e: ["taps June 18 cell, confirms memory list updates below calendar"]
    },
    uiComponents: ["CalendarHeatmapView", "CalendarDayCell", "DayMemoryList", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-26",
    category: "Native iOS — Browsing & Management",
    name: "Memory Detail View with Parallax Header & Audio Player",
    userGoal: "Inspect a memory's high-resolution media, narrative story, EXIF data, listen to audio recording, and read family comments.",
    userStory: "As an archivist, I want to open a memory to see the high-res photo with parallax scroll, listen to grandmother's voice recording, and read family comments.",
    entryExitRoutes: {
      entry: ["IOS-11", "IOS-23", "IOS-24", "memoria://memories/:memoryId"],
      exit: ["IOS-27 Edit Metadata", "IOS-28 Image Editor", "IOS-42 Comments", "IOS-11"],
      back: "IOS-11",
      deepLink: "memoria://memories/:memoryId"
    },
    personasPermissions: {
      roles: ["Space Member"],
      capabilities: ["view_memory", "edit_memory (Author/Editor)"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Parallax media header: Photo carousel / video player with safe area blur navigation bar (Back button, Favorite heart, Edit button, Share button).",
      main: "1. Memory title in Cormorant Garamond, 2. Capture date and location badge, 3. Tagged profiles bubbles, 4. Audio player waveform bar (if audio attached), 5. Written narrative story card, 6. EXIF data section (Camera, Lens, ISO, SHA-256), 7. Comments preview row.",
      footer: "Comment input field."
    },
    exactControls: [
      "Favorite heart button (.impact(.medium))",
      "Edit button (opens IOS-27)",
      "Image tap (opens full-screen near-black photo viewer)",
      "Audio Play / Pause button",
      "Tagged profile bubble tap (opens IOS-36)",
      "Comments row tap (opens IOS-42)"
    ],
    keyboardFocus: {
      initialFocus: "Memory title",
      tabOrder: ["Navigation buttons", "Media carousel", "Audio player", "Profile bubbles", "Comments"],
      escapeBehavior: "Returns to feed"
    },
    statesMatrix: {
      loading: "Parallax header and text skeletons.",
      empty: "N/A",
      populated: "Immersive memory view with high-res photography and Cormorant Garamond typography.",
      error: "Memory not found alert.",
      offline: "Cached memory details served from local SQLite and disk cache.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Memory detail: 50th Wedding Anniversary. August 14, 1968. Photo attached. Double tap to hear audio.",
      touchTargetMin: "44x44 pt",
      focusTrapping: false,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native scroll view with smooth parallax header stretch.",
      tablet: "Two-column detail layout on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "GET",
      endpoint: "/api/memories/:memoryId",
      authType: "Bearer JWT",
      responseBody: "{ success: true, data: { memory: Memory, media: Array<MediaAsset> } }",
      statusCodes: ["200 OK", "401 Unauthorized", "404 Not Found"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memories", "media_assets", "memory_media"],
      outboxPattern: false
    },
    eventsJobs: {
      eventsEmitted: ["ios.memory_viewed"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: false,
      privacyNotes: "Original photo bytes verified by SHA-256."
    },
    testCriteria: {
      unit: ["calculates parallax offset during scroll", "toggles favorite state in SQLite"],
      integration: ["GET /api/memories/:memoryId returns full memory"],
      e2e: ["opens memory detail, plays audio recording, taps edit button"]
    },
    uiComponents: ["MemoryDetailView", "ParallaxMediaHeader", "AudioWaveformBar", "StoryText", "Button"],
    verifiedStatus: "Implemented & Verified"
  },
  {
    id: "IOS-27",
    category: "Native iOS — Browsing & Management",
    name: "Edit Memory Metadata Sheet",
    userGoal: "Edit memory title, capture date/time, location, tagged profiles, and tags via native iOS sheet.",
    userStory: "As an archivist, I want to correct the capture date from 1974 to 1976 and tag my aunt in the memory.",
    entryExitRoutes: {
      entry: ["IOS-26"],
      exit: ["IOS-26"],
      back: "IOS-26",
      deepLink: "memoria://memories/:memoryId/edit"
    },
    personasPermissions: {
      roles: ["Author", "Space Owner", "Space Editor"],
      capabilities: ["edit_memory"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Sheet navigation bar: 'Edit Memory' with 'Cancel' and 'Save' buttons.",
      main: "Form: 1. Title TextField, 2. Story Content TextEditor, 3. DatePicker for Capture Date, 4. Location TextField with MapPin symbol, 5. Associated Profiles picker, 6. Tags TextField.",
      footer: "Delete Memory button (red destructive callout with confirmation)."
    },
    exactControls: [
      "Title TextField",
      "Story TextEditor",
      "Capture DatePicker",
      "Location TextField",
      "Profile tag selector",
      "Save Button",
      "Destructive Button: 'Move to Trash'"
    ],
    formValidation: {
      fields: [
        { name: "title", type: "text", required: true, limits: "1-120 chars", errorCopy: "Title is required." }
      ]
    },
    keyboardFocus: {
      initialFocus: "Title field",
      tabOrder: ["Title", "Story", "DatePicker", "Location", "Profiles", "Save"],
      escapeBehavior: "Prompts if dirty"
    },
    statesMatrix: {
      loading: "Saving memory spinner.",
      empty: "N/A",
      populated: "Pre-filled with existing metadata.",
      error: "Inline red error callout.",
      offline: "Optimistically updated in SQLite; queued in sync outbox.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Edit memory sheet. Update title, story text, capture date, and tagged people.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "7.2:1"
    },
    responsive: {
      mobile: "Native sheet presentationDetents([.large]).",
      tablet: "Form sheet on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "PUT",
      endpoint: "/api/memories/:memoryId",
      authType: "Bearer JWT",
      requestBody: "{ title: string, content?: string, capturedAt: string, location?: string }",
      responseBody: "{ success: true, data: { memory: Memory } }",
      statusCodes: ["200 OK", "400 Bad Request", "403 Forbidden"]
    },
    servicePersistence: {
      service: "memory-service / Local SQLite",
      databaseTables: ["memories"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["memory.updated"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "High - Confidential",
      auditLogged: true,
      privacyNotes: "Version history preserved; prior version staged in memory_history."
    },
    testCriteria: {
      unit: ["validates title input", "stages update in SQLite outbox"],
      integration: ["PUT /api/memories/:memoryId updates record"],
      e2e: ["edits title, taps Save, verifies updated title in detail view"]
    },
    uiComponents: ["EditMemorySheet", "TextField", "DatePicker", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  },
  {
    id: "IOS-28",
    category: "Native iOS — Browsing & Management",
    name: "CoreImage-Powered Filter, Crop & Orientation Editor",
    userGoal: "Rotate, crop, and adjust archival contrast/warmth non-destructively using Apple's CoreImage framework.",
    userStory: "As an archivist, I want to rotate a scanned photo 90 degrees and warm up faded colors without overwriting the master archival file.",
    entryExitRoutes: {
      entry: ["IOS-26", "IOS-24"],
      exit: ["IOS-26"],
      back: "IOS-26",
      deepLink: "memoria://editor/:mediaId"
    },
    personasPermissions: {
      roles: ["Space Member (Contributor+)"],
      capabilities: ["edit_media"],
      authRequired: true
    },
    contentHierarchy: {
      header: "Dark navigation bar: 'Archival Photo Studio' with 'Reset' and 'Save Derivative' buttons.",
      main: "CoreImage metal canvas with interactive crop boundary handles, rotation wheel, and filter intensity sliders (Exposure, Contrast, Warmth, Monochrome Sepia).",
      footer: "Filter preset pills (Original, Archival Warm, Faded Print, High Contrast Black & White)."
    },
    exactControls: [
      "Rotate 90° Clockwise Button",
      "Crop aspect ratio picker (Free, Original, Square, 8x10)",
      "Adjustment sliders (Warmth, Exposure, Contrast)",
      "Filter preset buttons",
      "Save Button"
    ],
    keyboardFocus: {
      initialFocus: "Rotate button",
      tabOrder: ["Rotate", "Crop", "Sliders", "Presets", "Save"],
      escapeBehavior: "Prompts if adjustments uncommitted"
    },
    statesMatrix: {
      loading: "Rendering CoreImage pipeline spinner.",
      empty: "N/A",
      populated: "Live GPU Metal shader rendering filter adjustments with zero lag.",
      error: "Error banner with retry.",
      offline: "CoreImage runs 100% locally on device GPU.",
      permissionDenied: "403 Forbidden alert."
    },
    accessibility: {
      wcagStandard: "VoiceOver accessible",
      voiceOverSummary: "Photo editor. Rotate, crop, and adjust photo warmth with CoreImage.",
      touchTargetMin: "44x44 pt",
      focusTrapping: true,
      contrastRatio: "12:1 (White controls over near-black canvas)"
    },
    responsive: {
      mobile: "Full screen photo editor with bottom adjustment drawer.",
      tablet: "Side-by-side photo and slider panel on iPad.",
      desktop: "N/A"
    },
    apiContract: {
      method: "POST",
      endpoint: "/api/media/:mediaId/derivatives",
      authType: "Bearer JWT",
      requestBody: "{ crop: any, rotationDegrees: number, filterSettings: any }",
      responseBody: "{ success: true, data: { derivativeUrl: string } }",
      statusCodes: ["200 OK", "400 Bad Request"]
    },
    servicePersistence: {
      service: "media-service / Local Storage",
      databaseTables: ["media_assets"],
      outboxPattern: true
    },
    eventsJobs: {
      eventsEmitted: ["media.derivative_created"],
      bullmqJobs: []
    },
    auditPrivacy: {
      piiLevel: "Low",
      auditLogged: false,
      privacyNotes: "Original master bytes remain 100% immutable; only derivative recipe saved."
    },
    testCriteria: {
      unit: ["applies CIFilter pipeline without modifying original image data", "calculates crop coordinates"],
      integration: ["POST /api/media/:mediaId/derivatives saves derivative metadata"],
      e2e: ["rotates image 90 degrees, applies Archival Warm preset, taps Save"]
    },
    uiComponents: ["CoreImageCanvas", "CropHandles", "AdjustmentSlider", "Button"],
    verifiedStatus: "Implemented (UI/Route Scaffolded)"
  }
];

