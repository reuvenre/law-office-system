import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { getPortalSession } from "@/lib/portal/session";
import { portalPayableInvoice } from "@/lib/portal/data";
import { getPaymentProvider } from "@/lib/payments/providers";
import { DOC_TYPES, type DocType } from "@/lib/constants";

export const dynamic = "force-dynamic";

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000"
  );
}

/**
 * Start a payment for one of the client's own invoices: resolve (or create) a
 * hosted payment-page URL at the provider and redirect the payer there. The
 * amount is always taken from our invoice row — never from the request — so a
 * client cannot influence what they are charged.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.redirect(new URL("/portal/expired", appBaseUrl()), 302);
  }

  const { invoiceId } = await params;
  const invoice = await portalPayableInvoice(
    invoiceId,
    session.clientId,
    session.firmId
  );
  if (!invoice) {
    return new Response("Not found", { status: 404 });
  }

  // Reuse a previously generated link when present.
  if (invoice.paymentLink) {
    return NextResponse.redirect(invoice.paymentLink, 302);
  }

  const provider = getPaymentProvider();
  if (!provider) {
    return new Response("התשלום המקוון אינו זמין כרגע. אנא פנו למשרד.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
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
    return new Response("יצירת קישור התשלום נכשלה. אנא פנו למשרד.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  await db
    .update(invoices)
    .set({ paymentLink: result.url })
    .where(eq(invoices.id, invoice.id));

  return NextResponse.redirect(result.url, 302);
}
