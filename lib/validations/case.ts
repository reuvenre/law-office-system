import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const PRACTICE_AREA_VALUES = [
  "civil_commercial",
  "real_estate",
  "power_of_attorney",
  "wills_inheritance",
  "enforcement",
] as const;

export const CASE_STATUS_VALUES = [
  "new",
  "in_progress",
  "waiting_client",
  "waiting_court",
  "hearing_scheduled",
  "on_hold",
  "closed_won",
  "closed_lost",
  "archived",
] as const;

export const caseBaseSchema = z.object({
  clientId: z.string().uuid("יש לבחור לקוח"),
  title: z.string().trim().min(1, "כותרת היא שדה חובה"),
  practiceArea: z.enum(PRACTICE_AREA_VALUES),
  caseNumber: optionalText,
  opposingParty: optionalText,
  court: optionalText,
  responsibleLawyerId: z.string().uuid().optional().or(z.literal("")),
  onedriveUrl: optionalText,
});

export type CaseBaseInput = z.infer<typeof caseBaseSchema>;
