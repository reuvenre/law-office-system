"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { addTimeEntryAction } from "@/app/(app)/billing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "שומר..." : "רישום שעות"}
    </Button>
  );
}

export function TimeEntryComposer({ caseId }: { caseId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const action = addTimeEntryAction.bind(null, caseId);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        const res = await action(undefined, fd);
        if (res?.error) toast.error(res.error);
        else {
          toast.success("השעות נרשמו");
          ref.current?.reset();
        }
      }}
      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4"
    >
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="te-desc">תיאור העבודה</Label>
        <Input id="te-desc" name="description" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="te-min">משך (דקות)</Label>
        <Input id="te-min" name="durationMin" type="number" min="1" dir="ltr" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="te-rate">תעריף לשעה (₪)</Label>
        <Input
          id="te-rate"
          name="rate"
          type="number"
          min="0"
          step="0.01"
          dir="ltr"
          placeholder="ברירת מחדל: תעריף המשתמש"
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="billable" defaultChecked className="h-4 w-4" />
        לחיוב (billable)
      </label>
      <div className="sm:col-span-1 sm:justify-self-end">
        <SubmitButton />
      </div>
    </form>
  );
}
