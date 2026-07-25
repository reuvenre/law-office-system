/**
 * Payment-link providers (Israeli market). Mirrors the messaging-provider
 * shape: a small interface, one implementation per provider, fail-closed when
 * credentials are absent. The provider returns a hosted payment page URL that
 * we store on the invoice and hand to the client; the provider then calls
 * /api/webhooks/payment to confirm.
 */

export type PaymentLinkRequest = {
  /** Our invoice id — echoed back by the provider webhook. */
  invoiceId: string;
  /** Gross amount to charge, in ILS. */
  amount: number;
  /** Shown on the provider's payment page. */
  description: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  /** Where the provider should send the payer after a successful charge. */
  successUrl?: string;
};

export type PaymentLinkResult =
  | { ok: true; url: string; provider: string; providerResponse: unknown }
  | { ok: false; error: string };

export type PaymentMethod =
  | "bank_transfer"
  | "credit_card"
  | "bit"
  | "check"
  | "cash";

/** A charge the provider's own API has confirmed actually happened. */
export type VerifiedPayment = {
  /** Our invoice id, echoed back by the provider. */
  invoiceId: string;
  /** The amount the provider says it actually captured, in ILS. */
  amount: number;
  /** The provider's transaction id — the idempotency key. */
  providerTxnId: string;
  method: PaymentMethod;
};

export interface PaymentProvider {
  /** Stable provider key — selects the provider via PAYMENT_PROVIDER. */
  readonly key: string;
  /** True when the provider's credentials are configured. */
  isConfigured(): boolean;
  createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLinkResult>;
  /**
   * Confirm a webhook callback against the provider's own API.
   *
   * Webhook bodies are unauthenticated and forgeable, and neither Grow nor
   * Cardcom can send a shared secret of ours. So we treat the callback purely
   * as a "something happened" nudge: we take only the provider's transaction
   * reference from it, then ask the provider's API what really occurred and
   * record *that*. A forged body is worthless — it can't make the provider
   * confirm a charge that never happened.
   *
   * Returns null whenever the transaction cannot be independently confirmed.
   */
  verifyWebhook(body: Record<string, unknown>): Promise<VerifiedPayment | null>;
}
