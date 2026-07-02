import { recordPayment } from "@/lib/erp/billing";

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

  const invoiceId = String(body.invoiceId ?? "");
  const amount = Number(body.amount ?? 0);
  if (!invoiceId || !amount) {
    return Response.json({ ok: false, error: "missing invoiceId/amount" }, { status: 400 });
  }

  try {
    const result = await recordPayment(invoiceId, {
      method: (body.method as PaymentMethod) ?? "credit_card",
      amount,
      reference: body.reference as string | undefined,
      provider: body.provider as string | undefined,
      providerTxnId: body.providerTxnId as string | undefined,
    });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("payment webhook failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
