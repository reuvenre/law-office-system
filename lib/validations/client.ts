import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const clientSchema = z.object({
  fullName: z.string().trim().min(1, "שם הוא שדה חובה"),
  idNumber: optionalText,
  clientType: z.enum(["individual", "company"]),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email("אימייל לא תקין")
    .optional()
    .or(z.literal("")),
  address: optionalText,
  notes: optionalText,
  reminderConsent: z.boolean(),
  reminderChannel: z.enum(["whatsapp", "sms", "email"]),
});

export type ClientInput = z.infer<typeof clientSchema>;
