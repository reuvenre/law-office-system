import type {
  PaymentProvider,
  PaymentLinkRequest,
  PaymentLinkResult,
} from "./types";

/**
 * Grow / Meshulam — the common Israeli option for small firms.
 * Docs: createPaymentProcess returns a hosted payment page URL.
 */
export const growProvider: PaymentProvider = {
  key: "grow",
  isConfigured() {
    return !!(process.env.GROW_USER_ID && process.env.GROW_PAGE_CODE);
  },
  async createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLinkResult> {
    const userId = process.env.GROW_USER_ID;
    const pageCode = process.env.GROW_PAGE_CODE;
    const apiKey = process.env.GROW_API_KEY;
    if (!userId || !pageCode) {
      return { ok: false, error: "ספק הסליקה (Grow) אינו מוגדר" };
    }
    const base =
      process.env.GROW_API_BASE || "https://sandbox.meshulam.co.il/api/light/server/1.0";
    try {
      const body = new URLSearchParams({
        pageCode,
        userId,
        sum: req.amount.toFixed(2),
        description: req.description,
        // Echoed back on the webhook so we can match the payment to the invoice.
        cField1: req.invoiceId,
        ...(req.clientName ? { pageField_fullName: req.clientName } : {}),
        ...(req.clientEmail ? { pageField_email: req.clientEmail } : {}),
        ...(req.clientPhone ? { pageField_phone: req.clientPhone } : {}),
        ...(req.successUrl ? { successUrl: req.successUrl } : {}),
        ...(apiKey ? { apiKey } : {}),
      });
      const res = await fetch(`${base}/createPaymentProcess`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: number;
        data?: { url?: string };
        err?: unknown;
      };
      const url = json?.data?.url;
      if (!res.ok || !url) {
        return { ok: false, error: "יצירת קישור התשלום נכשלה אצל הספק" };
      }
      return { ok: true, url, provider: "grow", providerResponse: json };
    } catch (e) {
      console.error("grow createPaymentLink failed", e);
      return { ok: false, error: "שגיאת תקשורת מול ספק הסליקה" };
    }
  },
};

/** Cardcom — LowProfile hosted payment page. */
export const cardcomProvider: PaymentProvider = {
  key: "cardcom",
  isConfigured() {
    return !!(process.env.CARDCOM_TERMINAL && process.env.CARDCOM_API_NAME);
  },
  async createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLinkResult> {
    const terminal = process.env.CARDCOM_TERMINAL;
    const apiName = process.env.CARDCOM_API_NAME;
    if (!terminal || !apiName) {
      return { ok: false, error: "ספק הסליקה (Cardcom) אינו מוגדר" };
    }
    try {
      const res = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TerminalNumber: Number(terminal),
          ApiName: apiName,
          Amount: req.amount,
          ISOCoinId: 1, // ILS
          ProductName: req.description,
          ReturnValue: req.invoiceId,
          SuccessRedirectUrl: req.successUrl,
          WebHookUrl: process.env.CARDCOM_WEBHOOK_URL,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ResponseCode?: number;
        Url?: string;
      };
      if (!res.ok || json.ResponseCode !== 0 || !json.Url) {
        return { ok: false, error: "יצירת קישור התשלום נכשלה אצל הספק" };
      }
      return { ok: true, url: json.Url, provider: "cardcom", providerResponse: json };
    } catch (e) {
      console.error("cardcom createPaymentLink failed", e);
      return { ok: false, error: "שגיאת תקשורת מול ספק הסליקה" };
    }
  },
};

const PROVIDERS: PaymentProvider[] = [growProvider, cardcomProvider];

/** The configured provider (PAYMENT_PROVIDER pins one), or null when none is. */
export function getPaymentProvider(): PaymentProvider | null {
  const pinned = process.env.PAYMENT_PROVIDER;
  if (pinned) {
    const p = PROVIDERS.find((x) => x.key === pinned);
    return p && p.isConfigured() ? p : null;
  }
  return PROVIDERS.find((p) => p.isConfigured()) ?? null;
}

export function isPaymentsEnabled(): boolean {
  return getPaymentProvider() !== null;
}
