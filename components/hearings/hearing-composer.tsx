"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { addHearingAction } from "@/app/(app)/hearings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "שומר..." : "הוספת דיון"}
    </Button>
  );
}

export function HearingComposer({ caseId }: { caseId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        const res = await addHearingAction(undefined, fd);
        if (res?.error) toast.error(res.error);
        else ref.current?.reset();
      }}
      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="hearingAt">תאריך ושעה</Label>
        <Input id="hearingAt" name="hearingAt" type="datetime-local" dir="ltr" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hearingType">סוג</Label>
        <Input id="hearingType" name="hearingType" placeholder="קדם משפט / הוכחות" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="location">מיקום</Label>
        <Input id="location" name="location" />
      </div>
      <div className="sm:col-span-4">
        <SubmitButton />
      </div>
    </form>
  );
}
