"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { checkConflictsAction } from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = {
  clientMatches: { id: string; fullName: string }[];
  opposingMatches: { id: string; title: string; opposingParty: string | null }[];
};

/**
 * Conflict-of-interest check (spec §6.8) — non-blocking warning. Searches the
 * name against existing clients and against opposing parties in existing cases.
 */
export function ConflictChecker() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      setResult(await checkConflictsAction(name));
    });

  const hasConflicts =
    result &&
    (result.clientMatches.length > 0 || result.opposingMatches.length > 0);

  return (
    <div className="mb-6 max-w-2xl rounded-lg border bg-muted/30 p-4">
      <Label htmlFor="conflict-name" className="text-sm font-medium">
        בדיקת ניגוד עניינים
      </Label>
      <div className="mt-2 flex items-center gap-2">
        <Input
          id="conflict-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם הצד לבדיקה"
        />
        <Button type="button" variant="secondary" onClick={run} disabled={pending}>
          {pending ? "בודק..." : "בדיקה"}
        </Button>
      </div>

      {result && !hasConflicts && (
        <p className="mt-3 flex items-center gap-2 text-sm text-success">
          <ShieldCheck className="h-4 w-4" />
          לא נמצאו התנגשויות.
        </p>
      )}

      {hasConflicts && (
        <div className="mt-3 space-y-2 rounded-md bg-warning/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            נמצאו התאמות אפשריות — יש לבדוק ניגוד עניינים:
          </p>
          {result!.clientMatches.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">לקוחות קיימים:</p>
              <ul className="list-inside list-disc">
                {result!.clientMatches.map((c) => (
                  <li key={c.id}>{c.fullName}</li>
                ))}
              </ul>
            </div>
          )}
          {result!.opposingMatches.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">כצד שכנגד בתיקים:</p>
              <ul className="list-inside list-disc">
                {result!.opposingMatches.map((c) => (
                  <li key={c.id}>
                    {c.title} (נגד {c.opposingParty})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
