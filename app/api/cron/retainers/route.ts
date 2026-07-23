import { and, eq, gte, inArray, lte } from "drizzle-orm";
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
    // Business dates are Israel-local, not UTC (the 04:00 UTC cron run is
    // already the 6th/7th hour of the day in Asia/Jerusalem).
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()); // YYYY-MM-DD
    const [y, m, day] = todayStr.split("-").map(Number);
    const lastDayOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const month = `${y}-${String(m).padStart(2, "0")}`; // YYYY-MM

    const agreements = (
      await db
        .select()
        .from(feeAgreements)
        .where(
          and(
            eq(feeAgreements.isActive, true),
            inArray(feeAgreements.agreementType, ["retainer", "mixed"])
          )
        )
    ).filter((ag) => {
      const billingDay = ag.retainerBillingDay ?? 1;
      // Clamp: a billing day past the end of a short month fires on its last day.
      return billingDay === day || (day === lastDayOfMonth && billingDay > lastDayOfMonth);
    });

    let proformas = 0;
    let chargesCreated = 0;
    let skippedAlreadyBilled = 0;
    for (const ag of agreements) {
      // Idempotency: never bill the same client's retainer twice in a month
      // (protects against manual re-runs and duplicate cron fires).
      const already = await db
        .select({ id: charges.id })
        .from(charges)
        .where(
          and(
            eq(charges.clientId, ag.clientId),
            eq(charges.chargeType, "retainer"),
            gte(charges.chargeDate, `${month}-01`),
            lte(charges.chargeDate, `${month}-${String(lastDayOfMonth).padStart(2, "0")}`)
          )
        )
        .limit(1);
      if (already.length > 0) {
        skippedAlreadyBilled++;
        continue;
      }

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
      skippedAlreadyBilled,
    });
  } catch (e) {
    console.error("retainers cron failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
