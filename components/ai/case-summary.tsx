"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { summarizeCaseAction } from "@/app/(app)/ai/actions";
import { Button } from "@/components/ui/button";

/** On-demand AI status summary of a case (win-solutions AI assist). */
export function CaseSummary({ caseId }: { caseId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          סיכום מצב אוטומטי של התיק, מבוסס על הדיונים, המועדים וההערות.
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await summarizeCaseAction(caseId);
              if (res.ok) setSummary(res.text);
              else toast.error(res.error);
            })
          }
        >
          <Sparkles className="h-4 w-4" />
          {pending ? "מסכם..." : summary ? "רענון סיכום" : "צור סיכום AI"}
        </Button>
      </div>
      {summary && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            נוצר על ידי עוזר AI — לבדיקת עורך/ת הדין לפני שימוש.
          </p>
        </div>
      )}
    </div>
  );
}
