import type { Channel, SendResult } from "./types";
import { normalizeIsraeliPhone } from "./types";

/** WhatsApp via Green API (default for the Israeli audience). */
export const greenApiWhatsApp: Channel = {
  async send(to, text): Promise<SendResult> {
    const idInstance = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;
    if (!idInstance || !apiToken) {
      return { status: "failed", providerResponse: { error: "green-api not configured" } };
    }
    try {
      const res = await fetch(
        `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: `${normalizeIsraeliPhone(to)}@c.us`,
            message: text,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      return { status: res.ok ? "sent" : "failed", providerResponse: body };
    } catch (e) {
      return { status: "failed", providerResponse: { error: String(e) } };
    }
  },
};

/** SMS via Twilio (backup channel). */
export const twilioSms: Channel = {
  async send(to, text): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) {
      return { status: "failed", providerResponse: { error: "twilio not configured" } };
    }
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          },
          body: new URLSearchParams({
            From: from,
            To: "+" + normalizeIsraeliPhone(to),
            Body: text,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      return { status: res.ok ? "sent" : "failed", providerResponse: body };
    } catch (e) {
      return { status: "failed", providerResponse: { error: String(e) } };
    }
  },
};

/** Email via Resend. `to` is an email address. */
export const resendEmail: Channel = {
  async send(to, text): Promise<SendResult> {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      return { status: "failed", providerResponse: { error: "resend not configured" } };
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "office@example.com",
          to,
          subject: "תזכורת מהמשרד",
          text,
        }),
      });
      const body = await res.json().catch(() => ({}));
      return { status: res.ok ? "sent" : "failed", providerResponse: body };
    } catch (e) {
      return { status: "failed", providerResponse: { error: String(e) } };
    }
  },
};

export function getChannel(channel: "whatsapp" | "sms" | "email"): Channel {
  switch (channel) {
    case "sms":
      return twilioSms;
    case "email":
      return resendEmail;
    case "whatsapp":
    default:
      return greenApiWhatsApp;
  }
}
