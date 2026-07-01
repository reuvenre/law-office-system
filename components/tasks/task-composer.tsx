"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { addTaskAction } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; fullName: string };

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "שומר..." : "הוספת משימה"}
    </Button>
  );
}

export function TaskComposer({
  caseId,
  lawyers,
}: {
  caseId?: string;
  lawyers: Option[];
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        const res = await addTaskAction(undefined, fd);
        if (res?.error) toast.error(res.error);
        else ref.current?.reset();
      }}
      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4"
    >
      {caseId && <input type="hidden" name="caseId" value={caseId} />}
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="task-title">משימה</Label>
        <Input id="task-title" name="title" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="assignedTo">אחראית</Label>
        <select id="assignedTo" name="assignedTo" defaultValue="" className={selectClass}>
          <option value="">—</option>
          {lawyers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="task-dueAt">מועד</Label>
        <Input id="task-dueAt" name="dueAt" type="datetime-local" dir="ltr" />
      </div>
      <div className="sm:col-span-4">
        <SubmitButton />
      </div>
    </form>
  );
}
