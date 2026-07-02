import { runDailyReminders } from "@/lib/reminders/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminder job (spec §8.3). Scheduled by Vercel Cron (see vercel.json).
 * Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Fail closed: without a configured secret the job must not be callable.
  if (!secret) {
    return new Response("Cron not configured", { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await runDailyReminders();
    return Response.json({ ok: true, ...summary });
  } catch (e) {
    console.error("daily-reminders failed", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
