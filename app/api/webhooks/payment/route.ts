import { recordPayment } from "@/lib/erp/billing";
import { normalizePayload } from "@/lib/payments/webhook";

export const dynamic = "force-dynamic";

type PaymentMethod = "bank_transfer" | "credit_card" | "bit" | "check" | "cash";

/**
 * Payment-provider webhook (Grow/Meshulam/Cardcom etc.) → recordPayment().
 * Protected by PAYMENT_WEBHOOK_SECRET (fail-closed). Expected JSON:
 * { invoiceId, amount, method?, provider?, providerTxnId?, reference? }.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // Normalize the provider payload: Grow echoes our invoice id in cField1,
  // Cardcom in ReturnValue; both also name the amount and transaction id
  // differently. A generic { invoiceId, amount } body keeps working.
  const norm = normalizePayload(body);
  if (!norm.invoiceId || norm.amount <= 0) {
    return Response.json({ ok: false, error: "missing invoiceId/amount" }, { status: 400 });
  }

  try {
    const result = await recordPayment(norm.invoiceId, {
      method: (body.method as PaymentMethod) ?? "credit_card",
      amount: norm.amount,
      reference: body.reference as string | undefined,
      // Always store a concrete provider so the (provider, provider_txn_id)
      // unique constraint actually dedupes retried webhooks.
      provider: norm.provider,
      providerTxnId: norm.providerTxnId,
    });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("payment webhook failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
