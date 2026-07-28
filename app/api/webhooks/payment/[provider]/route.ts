import { recordPayment } from "@/lib/erp/billing";
import { getProviderByKey } from "@/lib/payments/providers";

export const dynamic = "force-dynamic";

/**
 * Provider-native payment webhook: /api/webhooks/payment/grow|cardcom
 *
 * Real payment providers cannot send a shared secret of ours, so this endpoint
 * is deliberately unauthenticated at the transport level and instead derives
 * ALL of its trust from a server-to-server confirmation:
 *
 *   1. Take only the provider's transaction reference from the (untrusted) body.
 *   2. Ask the provider's own API what actually happened.
 *   3. Record the amount and transaction id the PROVIDER reports — never the
 *      ones in the request.
 *
 * A forged POST therefore achieves nothing: the attacker would have to make the
 * provider confirm a charge that never occurred. Replays are absorbed by the
 * (provider, provider_txn_id) unique constraint plus recordPayment's duplicate
 * short-circuit.
 *
 * The legacy /api/webhooks/payment endpoint (shared bearer secret) remains for
 * manual and proxied integrations.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: key } = await params;
  const provider = getProviderByKey(key);
  if (!provider) {
    // Unknown or unconfigured provider — fail closed.
    return new Response("Unknown provider", { status: 404 });
  }

  // Providers post either JSON or form-encoded bodies.
  let body: Record<string, unknown>;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      body = Object.fromEntries((await request.formData()).entries());
    }
  } catch {
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const verified = await provider.verifyWebhook(body);
  if (!verified) {
    // Could not confirm with the provider: forged, malformed, or not settled.
    console.warn(`payment webhook (${key}) could not be verified`);
    return Response.json({ ok: false, error: "unverified" }, { status: 202 });
  }

  try {
    const result = await recordPayment(verified.invoiceId, {
      method: verified.method,
      amount: verified.amount,
      provider: provider.key,
      providerTxnId: verified.providerTxnId,
    }, null);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error(`payment webhook (${key}) failed`, e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
