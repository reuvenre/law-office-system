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

export interface PaymentProvider {
  /** Stable provider key — selects the provider via PAYMENT_PROVIDER. */
  readonly key: string;
  /** True when the provider's credentials are configured. */
  isConfigured(): boolean;
  createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLinkResult>;
}
