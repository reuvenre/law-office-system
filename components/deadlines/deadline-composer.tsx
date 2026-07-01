"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { addDeadlineAction } from "@/app/(app)/deadlines/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRIORITIES } from "@/lib/constants";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "שומר..." : "הוספת מועד"}
    </Button>
  );
}

export function DeadlineComposer({ caseId }: { caseId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        const res = await addDeadlineAction(undefined, fd);
        if (res?.error) toast.error(res.error);
        else ref.current?.reset();
      }}
      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="dl-title">כותרת</Label>
        <Input id="dl-title" name="title" placeholder="הגשת כתב הגנה" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dueAt">מועד</Label>
        <Input id="dueAt" name="dueAt" type="datetime-local" dir="ltr" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="priority">דחיפות</Label>
        <select id="priority" name="priority" defaultValue="normal" className={selectClass}>
          {Object.entries(PRIORITIES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-4">
        <SubmitButton />
      </div>
    </form>
  );
}
