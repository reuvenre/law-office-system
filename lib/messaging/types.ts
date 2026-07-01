export type SendResult = {
  status: "sent" | "failed";
  providerResponse: unknown;
};

export interface Channel {
  send(to: string, text: string): Promise<SendResult>;
}

/** Normalize an Israeli phone to international digits (e.g. 0501234567 → 972501234567). */
export function normalizeIsraeliPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}
