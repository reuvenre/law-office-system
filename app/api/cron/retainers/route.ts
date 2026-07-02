import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { feeAgreements, charges } from "@/lib/db/schema";
import { computeMonthlyRetainer, createProforma } from "@/lib/erp/billing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily retainer billing (integration kit). For active retainer/mixed fee
 * agreements whose billing day is today: compute the monthly retainer + overage,
 * create charges, and issue a proforma. Scheduled by Vercel Cron (vercel.json),
 * protected by CRON_SECRET (fail-closed).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Cron not configured", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const today = new Date();
    const day = today.getDate();
    const month = today.toISOString().slice(0, 7); // YYYY-MM

    const agreements = await db
      .select()
      .from(feeAgreements)
      .where(
        and(
          eq(feeAgreements.isActive, true),
          eq(feeAgreements.retainerBillingDay, day)
        )
      );

    let proformas = 0;
    let chargesCreated = 0;
    for (const ag of agreements) {
      if (ag.agreementType !== "retainer" && ag.agreementType !== "mixed") continue;
      const { charges: payloads } = await computeMonthlyRetainer(ag, month);
      if (!payloads.length) continue;

      const inserted = await db
        .insert(charges)
        .values(
          payloads.map((p) => ({
            firmId: p.firmId,
            clientId: p.clientId,
            chargeType: p.chargeType,
            description: p.description,
            amount: p.amount,
            vatRate: p.vatRate,
          }))
        )
        .returning({ id: charges.id });
      chargesCreated += inserted.length;

      await createProforma(
        ag.clientId,
        inserted.map((r) => r.id),
        null,
        ag.firmId
      );
      proformas++;
    }

    return Response.json({
      ok: true,
      agreements: agreements.length,
      proformas,
      chargesCreated,
    });
  } catch (e) {
    console.error("retainers cron failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
