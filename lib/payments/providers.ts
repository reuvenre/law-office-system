import type {
  PaymentProvider,
  PaymentLinkRequest,
  PaymentLinkResult,
  VerifiedPayment,
} from "./types";
import { growWebhookRef, cardcomWebhookRef, str } from "./webhook";
import { appBaseUrl } from "@/lib/url";

const GROW_SANDBOX_BASE = "https://sandbox.meshulam.co.il/api/light/server/1.0";

/**
 * Meshulam's API host. Defaulting to sandbox is right for development and
 * dangerous in production: a deploy that forgets GROW_API_BASE would send real
 * charges to a test environment and nobody would notice until the money never
 * arrived. So in production the variable is required.
 */
function growApiBase(): string {
  const configured = process.env.GROW_API_BASE?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "GROW_API_BASE is not set. Refusing to fall back to the Meshulam " +
        "sandbox in production — set it to the live API base."
    );
  }
  return GROW_SANDBOX_BASE;
}

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
    const base = growApiBase();
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

  /**
   * Confirm with Meshulam's getPaymentProcessInfo. We send only the process
   * reference from the callback; the amount, transaction id and our invoice id
   * all come back from Meshulam, so a forged callback cannot invent a payment.
   */
  async verifyWebhook(body): Promise<VerifiedPayment | null> {
    const userId = process.env.GROW_USER_ID;
    const pageCode = process.env.GROW_PAGE_CODE;
    if (!userId || !pageCode) return null;

    const ref = growWebhookRef(body);
    if (!ref) return null;

    try {
      const res = await fetch(`${growApiBase()}/getPaymentProcessInfo`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          userId,
          pageCode,
          processId: ref.processId,
          processToken: ref.processToken,
          ...(process.env.GROW_API_KEY ? { apiKey: process.env.GROW_API_KEY } : {}),
        }),
      });
      if (!res.ok) return null;

      const json = (await res.json().catch(() => null)) as {
        status?: number;
        data?: Record<string, unknown>;
      } | null;
      // Meshulam signals success with status === 1.
      if (!json || json.status !== 1 || !json.data) return null;

      const d = json.data;
      // Only a settled transaction counts as a payment, and the check must fail
      // CLOSED: an absent status field means "we could not confirm this", not
      // "assume it went through". (transactionTypeId is the transaction *type*
      // — regular / instalments / standing order — so it is deliberately not
      // consulted here.)
      const settled = str(d.statusCode) ?? str(d.status);
      if (settled !== "1") return null;

      const invoiceId = str(d.cField1);
      const amount = Number(d.sum ?? d.paymentSum ?? 0);
      // No fallback to the request's own processId: the idempotency key must
      // come from the provider, or a replay could choose its own key.
      const providerTxnId = str(d.asmachta) ?? str(d.transactionId);
      if (!invoiceId || !providerTxnId) return null;
      if (!Number.isFinite(amount) || amount <= 0) return null;

      return { invoiceId, amount, providerTxnId, method: "credit_card" };
    } catch (e) {
      console.error("grow verifyWebhook failed", e);
      return null;
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
          // ILS. The pay route refuses non-ILS invoices before reaching here.
          ISOCoinId: 1,
          ProductName: req.description,
          ReturnValue: req.invoiceId,
          SuccessRedirectUrl: req.successUrl,
          // Point Cardcom at the provider-native, self-verifying endpoint.
          WebHookUrl:
            process.env.CARDCOM_WEBHOOK_URL ||
            `${appBaseUrl()}/api/webhooks/payment/cardcom`,
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

  /**
   * Confirm with Cardcom's LowProfile/GetLpResult. The callback supplies only
   * the LowProfileId; the authoritative amount, transaction id and ReturnValue
   * (our invoice id) come from Cardcom's response.
   */
  async verifyWebhook(body): Promise<VerifiedPayment | null> {
    const terminal = process.env.CARDCOM_TERMINAL;
    const apiName = process.env.CARDCOM_API_NAME;
    if (!terminal || !apiName) return null;

    const lowProfileId = cardcomWebhookRef(body);
    if (!lowProfileId) return null;

    try {
      const res = await fetch(
        "https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            TerminalNumber: Number(terminal),
            ApiName: apiName,
            LowProfileId: lowProfileId,
          }),
        }
      );
      if (!res.ok) return null;

      const json = (await res.json().catch(() => null)) as {
        ResponseCode?: number;
        ReturnValue?: string;
        TranzactionInfo?: { ResponseCode?: number; Amount?: number; TranzactionId?: number };
      } | null;
      // Both the request and the transaction itself must have succeeded.
      if (!json || json.ResponseCode !== 0) return null;
      const txn = json.TranzactionInfo;
      if (!txn || txn.ResponseCode !== 0) return null;

      const invoiceId = str(json.ReturnValue);
      const amount = Number(txn.Amount ?? 0);
      const providerTxnId = str(txn.TranzactionId);
      if (!invoiceId || !providerTxnId || !Number.isFinite(amount) || amount <= 0) {
        return null;
      }

      return { invoiceId, amount, providerTxnId, method: "credit_card" };
    } catch (e) {
      console.error("cardcom verifyWebhook failed", e);
      return null;
    }
  },
};

const PROVIDERS: PaymentProvider[] = [growProvider, cardcomProvider];

/** Look up a configured provider by its key — used to route its webhook. */
export function getProviderByKey(key: string): PaymentProvider | null {
  const p = PROVIDERS.find((x) => x.key === key);
  return p && p.isConfigured() ? p : null;
}

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
