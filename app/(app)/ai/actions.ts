"use server";

import { getViewer } from "@/lib/auth/viewer";
import { canAccessCase } from "@/lib/auth/scope";
import {
  getCase,
  getCaseHearings,
  getCaseDeadlines,
  getCaseNotes,
} from "@/lib/data/cases";
import { summarizeCase, draftDocument, type AiResult } from "@/lib/ai/assist";
import { logActivity } from "@/lib/activity";
import { formatDate, formatDateTime } from "@/lib/format";
import { PRACTICE_AREAS, CASE_STATUSES } from "@/lib/constants";

/** AI status summary for a case (any user with case access). */
export async function summarizeCaseAction(caseId: string): Promise<AiResult> {
  const viewer = await getViewer();
  if (!(await canAccessCase(caseId, viewer))) {
    return { ok: false, error: "אין הרשאה לתיק זה" };
  }
  const caseRow = await getCase(caseId, viewer);
  if (!caseRow) return { ok: false, error: "התיק לא נמצא" };

  const [hearings, deadlines, notes] = await Promise.all([
    getCaseHearings(caseId),
    getCaseDeadlines(caseId),
    getCaseNotes(caseId),
  ]);

  const result = await summarizeCase({
    title: caseRow.title,
    practiceArea:
      PRACTICE_AREAS[caseRow.practiceArea as keyof typeof PRACTICE_AREAS] ??
      caseRow.practiceArea,
    status: CASE_STATUSES[caseRow.status as keyof typeof CASE_STATUSES] ?? caseRow.status,
    clientName: caseRow.clientName,
    opposingParty: caseRow.opposingParty,
    court: caseRow.court,
    hearings: hearings.map((h) => ({
      at: formatDateTime(h.hearingAt),
      type: h.hearingType,
      location: h.location,
    })),
    deadlines: deadlines.map((d) => ({
      title: d.title,
      dueAt: formatDate(d.dueAt),
      done: d.isDone,
    })),
    notes: notes.slice(0, 8).map((n) => ({
      body: n.body,
      at: formatDate(n.createdAt),
    })),
  });

  if (result.ok) {
    await logActivity({
      actorId: viewer.id,
      entityType: "case",
      entityId: caseId,
      action: "update",
      metadata: { kind: "ai_summary" },
    });
  }
  return result;
}

/** AI document draft from a free-text instruction, optionally scoped to a case. */
export async function draftDocumentAction(
  instruction: string,
  caseId?: string
): Promise<AiResult> {
  const viewer = await getViewer();
  const trimmed = instruction.trim();
  if (trimmed.length < 5) {
    return { ok: false, error: "יש להזין הנחיה מפורטת יותר" };
  }

  let context: string | undefined;
  if (caseId) {
    if (!(await canAccessCase(caseId, viewer))) {
      return { ok: false, error: "אין הרשאה לתיק זה" };
    }
    const caseRow = await getCase(caseId, viewer);
    if (caseRow) {
      context = [
        `כותרת: ${caseRow.title}`,
        caseRow.clientName ? `לקוח: ${caseRow.clientName}` : "",
        caseRow.opposingParty ? `צד שכנגד: ${caseRow.opposingParty}` : "",
        caseRow.court ? `ערכאה: ${caseRow.court}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  return draftDocument(trimmed, context);
}
