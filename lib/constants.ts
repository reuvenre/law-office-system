/**
 * Enum values mirrored from the database, with Hebrew display labels.
 * Single source of truth for the UI (spec appendices א'/ב' and §4).
 */

export const PRACTICE_AREAS = {
  civil_commercial: "אזרחי-מסחרי",
  real_estate: 'נדל"ן',
  power_of_attorney: "ייפויי כוח",
  wills_inheritance: "צוואות וירושות",
  enforcement: 'הוצאה לפועל (הוצל"פ)',
} as const;
export type PracticeArea = keyof typeof PRACTICE_AREAS;

export const CASE_STATUSES = {
  new: "חדש",
  in_progress: "בטיפול",
  waiting_client: "ממתין ללקוח",
  waiting_court: "ממתין לבית משפט",
  hearing_scheduled: "נקבע דיון",
  on_hold: "מוקפא",
  closed_won: "נסגר (הצלחה)",
  closed_lost: "נסגר",
  archived: "בארכיון",
} as const;
export type CaseStatus = keyof typeof CASE_STATUSES;

/** Badge color intent per case status (maps to design tokens). */
export const CASE_STATUS_VARIANT: Record<
  CaseStatus,
  "neutral" | "info" | "gold" | "success" | "warning" | "muted"
> = {
  new: "info",
  in_progress: "info",
  waiting_client: "warning",
  waiting_court: "warning",
  hearing_scheduled: "gold",
  on_hold: "muted",
  closed_won: "success",
  closed_lost: "neutral",
  archived: "muted",
};

export const PRIORITIES = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
  critical: "קריטית",
} as const;
export type Priority = keyof typeof PRIORITIES;

export const HEARING_STATUSES = {
  scheduled: "מתוכנן",
  completed: "התקיים",
  postponed: "נדחה",
  cancelled: "בוטל",
} as const;
export type HearingStatus = keyof typeof HEARING_STATUSES;

export const TASK_STATUSES = {
  open: "פתוחה",
  in_progress: "בביצוע",
  done: "הושלמה",
} as const;
export type TaskStatus = keyof typeof TASK_STATUSES;

export const ROLES = {
  lawyer: 'עו"ד',
  assistant: "עוזר/ת",
} as const;
export type Role = keyof typeof ROLES;

export const ACCESS_SCOPES = {
  all: "כל המשרד",
  own: "רק שלי",
  custom: 'עו"ד נבחרים',
} as const;
export type AccessScope = keyof typeof ACCESS_SCOPES;

export const CLIENT_TYPES = {
  individual: "יחיד",
  company: "תאגיד",
} as const;
export type ClientType = keyof typeof CLIENT_TYPES;

export const REMINDER_CHANNELS = {
  whatsapp: "וואטסאפ",
  sms: "SMS",
  email: 'דוא"ל',
} as const;
export type ReminderChannel = keyof typeof REMINDER_CHANNELS;

export const DOCUMENT_CATEGORIES = {
  contract: "חוזה",
  id: "תעודת זהות",
  power_of_attorney: "ייפוי כוח",
  court_filing: "כתב בי-דין",
  tabu: "נסח טאבו",
  will: "צוואה",
  other: "אחר",
} as const;
export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;

export const SYNC_STATUSES = {
  pending: "ממתין לסנכרון",
  synced: "מסונכרן",
  failed: "סנכרון נכשל",
} as const;
export type SyncStatus = keyof typeof SYNC_STATUSES;
