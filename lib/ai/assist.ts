import { AI_MODEL, getClient, isAIEnabled, textOf } from "@/lib/ai/client";

/**
 * AI assist for the law office (win-solutions). Hebrew legal context; the model
 * drafts and summarizes but never gives binding legal advice — outputs are a
 * starting point a lawyer reviews. All functions are no-ops (return an error
 * result) when the API key isn't configured.
 */

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

const NOT_CONFIGURED: AiResult = {
  ok: false,
  error: "עוזר ה-AI אינו מוגדר (חסר ANTHROPIC_API_KEY).",
};

const SYSTEM = `אתה עוזר משפטי במשרד עורכי דין ישראלי. אתה כותב בעברית תקנית,
בניסוח משפטי מקצועי ומדויק, ומותאם לדין הישראלי. אתה מסייע בניסוח וסיכום בלבד —
אינך נותן ייעוץ משפטי מחייב, וכל תוצר מיועד לבדיקה ואישור של עורך/ת הדין לפני שימוש.
כשחסר מידע, ציין זאת במקום להמציא עובדות.`;

async function ask(userPrompt: string, maxTokens = 4000): Promise<AiResult> {
  if (!isAIEnabled()) return NOT_CONFIGURED;
  try {
    const message = await getClient().messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = textOf(message);
    if (!text) return { ok: false, error: "לא התקבל טקסט מהמודל." };
    return { ok: true, text };
  } catch (e) {
    console.error("AI assist failed", e);
    return { ok: false, error: "פנייה לעוזר ה-AI נכשלה. נסו שוב מאוחר יותר." };
  }
}

export type CaseSummaryContext = {
  title: string;
  practiceArea: string;
  status: string;
  clientName?: string | null;
  opposingParty?: string | null;
  court?: string | null;
  hearings: { at: string; type?: string | null; location?: string | null }[];
  deadlines: { title: string; dueAt: string; done: boolean }[];
  notes: { body: string; at: string }[];
};

/** Concise Hebrew status summary of a case for the lawyer. */
export function summarizeCase(ctx: CaseSummaryContext): Promise<AiResult> {
  const lines: string[] = [
    `כותרת: ${ctx.title}`,
    `תחום: ${ctx.practiceArea}`,
    `סטטוס: ${ctx.status}`,
    ctx.clientName ? `לקוח: ${ctx.clientName}` : "",
    ctx.opposingParty ? `צד שכנגד: ${ctx.opposingParty}` : "",
    ctx.court ? `ערכאה: ${ctx.court}` : "",
    "",
    "דיונים:",
    ...(ctx.hearings.length
      ? ctx.hearings.map((h) => `- ${h.at} ${h.type ?? ""} ${h.location ?? ""}`.trim())
      : ["- אין"]),
    "",
    "מועדים:",
    ...(ctx.deadlines.length
      ? ctx.deadlines.map((d) => `- ${d.title} עד ${d.dueAt}${d.done ? " (בוצע)" : ""}`)
      : ["- אין"]),
    "",
    "הערות אחרונות:",
    ...(ctx.notes.length ? ctx.notes.map((n) => `- (${n.at}) ${n.body}`) : ["- אין"]),
  ].filter(Boolean);

  const prompt = `להלן נתוני תיק. כתוב סיכום מצב תמציתי (עד 8 שורות) בעברית: היכן
עומד התיק, מה הצעדים הקרובים, ומה דורש תשומת לב. אל תמציא עובדות שאינן בנתונים.

${lines.join("\n")}`;
  return ask(prompt, 1500);
}

/** Draft a legal document/letter in Hebrew from a free-text instruction + case context. */
export function draftDocument(
  instruction: string,
  context?: string
): Promise<AiResult> {
  const prompt = `נסח מסמך/מכתב משפטי בעברית לפי ההנחיה הבאה. החזר טקסט מוכן
לעריכה, ללא הערות פתיחה. סמן בסוגריים מרובעים כל פרט חסר שיש להשלים ([...]).

הנחיה:
${instruction}
${context ? `\nהקשר התיק:\n${context}` : ""}`;
  return ask(prompt, 4000);
}
