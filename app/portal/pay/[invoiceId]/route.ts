import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { withPortalSession } from "@/lib/portal/session";
import { portalPayableInvoice } from "@/lib/portal/data";
import { getPaymentProvider } from "@/lib/payments/providers";
import { appBaseUrl } from "@/lib/url";
import { DOC_TYPES, type DocType } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ invoiceId: string }> };

function textError(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Start a payment for one of the client's own invoices: resolve (or create) a
 * hosted payment-page URL at the provider and redirect the payer there. The
 * amount is always taken from our invoice row — never from the request — so a
 * client cannot influence what they are charged.
 */
export const GET = withPortalSession<Ctx>(async (session, _req, { params }) => {
  const { invoiceId } = await params;
  const invoice = await portalPayableInvoice(
    invoiceId,
    session.clientId,
    session.firmId
  );
  if (!invoice) {
    return new Response("Not found", { status: 404 });
  }

  // Both providers are wired for shekels only (Cardcom is sent ISOCoinId: 1).
  // Refusing here beats silently charging the right number in the wrong
  // currency, which is a mischarge nobody would catch until reconciliation.
  if (invoice.currency !== "ILS") {
    return textError("תשלום מקוון זמין כרגע בשקלים בלבד. אנא פנו למשרד.", 503);
  }

  // Reuse a previously generated link when present.
  if (invoice.paymentLink) {
    return NextResponse.redirect(invoice.paymentLink, 302);
  }

  const provider = getPaymentProvider();
  if (!provider) {
    return textError("התשלום המקוון אינו זמין כרגע. אנא פנו למשרד.", 503);
  }

  const result = await provider.createPaymentLink({
    invoiceId: invoice.id,
    amount: Number(invoice.total),
    description: `${DOC_TYPES[invoice.docType as DocType]} #${invoice.docNumber}`,
    clientName: session.clientName,
    successUrl: `${appBaseUrl()}/portal`,
  });

  if (!result.ok) {
    console.error("portal payment link failed", result.error);
    return textError("יצירת קישור התשלום נכשלה. אנא פנו למשרד.", 502);
  }

  // Persist after responding — the payer shouldn't wait on our bookkeeping.
  after(async () => {
    await db
      .update(invoices)
      .set({ paymentLink: result.url })
      .where(eq(invoices.id, invoice.id));
  });

  return NextResponse.redirect(result.url, 302);
});
