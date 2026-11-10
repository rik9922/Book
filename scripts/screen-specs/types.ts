export interface ScreenSpec {
  id: string; // e.g., PWA-01, IOS-01, ADMIN-01
  category: string;
  name: string;
  userGoal: string;
  userStory: string;
  entryExitRoutes: {
    entry: string[];
    exit: string[];
    back: string;
    deepLink?: string;
  };
  personasPermissions: {
    roles: string[];
    capabilities: string[];
    authRequired: boolean;
  };
  contentHierarchy: {
    header: string;
    main: string;
    aside?: string;
    footer?: string;
    safeArea?: string;
  };
  exactControls: string[];
  formValidation?: {
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      limits?: string;
      validationRule?: string;
      errorCopy?: string;
    }>;
  };
  keyboardFocus: {
    initialFocus: string;
    tabOrder: string[];
    shortcuts?: string[];
    escapeBehavior: string;
  };
  statesMatrix: {
    loading: string;
    empty: string;
    populated: string;
    error: string;
    offline: string;
    conflictOrStale?: string;
    permissionDenied: string;
  };
  confirmationCancellation?: string;
  accessibility: {
    wcagStandard: string;
    voiceOverSummary: string;
    touchTargetMin: string;
    focusTrapping: boolean;
    contrastRatio: string;
  };
  responsive: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  apiContract: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "N/A";
    endpoint: string;
    authType: string;
    requestBody?: string;
    responseBody: string;
    statusCodes: string[];
  };
  servicePersistence: {
    service: string;
    databaseTables: string[];
    outboxPattern: boolean;
  };
  eventsJobs: {
    eventsEmitted: string[];
    bullmqJobs: string[];
  };
  auditPrivacy: {
    piiLevel: "None" | "Low" | "Medium" | "High - Confidential" | "Admin Audited";
    auditLogged: boolean;
    privacyNotes: string;
  };
  testCriteria: {
    unit: string[];
    integration: string[];
    e2e: string[];
  };
  uiComponents: string[];
  verifiedStatus: "Implemented & Verified" | "Implemented (UI/Route Scaffolded)" | "Specified & Ready for Generation";
}

