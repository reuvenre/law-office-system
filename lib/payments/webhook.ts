/**
 * Provider-payload normalization for the payment webhook. Pure (no DB, no I/O)
 * so the mapping from each provider's field names onto our payment shape is
 * unit-testable.
 */

export type NormalizedPayment = {
  invoiceId: string;
  amount: number;
  provider: string;
  providerTxnId?: string;
};

const str = (v: unknown): string | undefined => {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
};

/**
 * Map a provider-specific webhook body onto our payment shape.
 * Grow/Meshulam echoes our invoice id in `cField1`; Cardcom in `ReturnValue`.
 * A generic `{ invoiceId, amount }` body keeps working unchanged.
 */
export function normalizePayload(body: Record<string, unknown>): NormalizedPayment {
  const growInvoice = str(body.cField1);
  const cardcomInvoice = str(body.ReturnValue);

  const invoiceId = str(body.invoiceId) ?? growInvoice ?? cardcomInvoice ?? "";

  const rawAmount = Number(
    body.amount ?? body.sum ?? body.Amount ?? body.TranzactionSum ?? 0
  );

  const provider =
    str(body.provider) ??
    (growInvoice ? "grow" : cardcomInvoice ? "cardcom" : "unknown");

  const providerTxnId =
    str(body.providerTxnId) ??
    str(body.transactionId) ??
    str(body.TranzactionId) ??
    str(body.asmachta);

  return {
    invoiceId,
    amount: Number.isFinite(rawAmount) ? rawAmount : 0,
    provider,
    providerTxnId,
  };
}
