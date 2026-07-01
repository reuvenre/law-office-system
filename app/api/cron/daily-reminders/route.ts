import { runDailyReminders } from "@/lib/reminders/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminder job (spec §8.3). Scheduled by Vercel Cron (see vercel.json).
 * Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const summary = await runDailyReminders();
    return Response.json({ ok: true, ...summary });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
