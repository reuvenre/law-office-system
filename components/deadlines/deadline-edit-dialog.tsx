"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateDeadlineAction } from "@/app/(app)/deadlines/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toDatetimeLocalValue } from "@/lib/datetime";
import { PRIORITIES } from "@/lib/constants";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "שומר..." : "שמירה"}
    </Button>
  );
}

export function DeadlineEditDialog({
  deadline,
}: {
  deadline: {
    id: string;
    caseId: string;
    title: string;
    dueAt: string | Date;
    priority: string;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="עריכה" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת מועד</DialogTitle>
          </DialogHeader>
          <form
            action={async (fd) => {
              const res = await updateDeadlineAction(deadline.id, deadline.caseId, undefined, fd);
              if (res?.error) toast.error(res.error);
              else {
                toast.success("המועד עודכן");
                setOpen(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="e-dl-title">כותרת</Label>
              <Input id="e-dl-title" name="title" defaultValue={deadline.title} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="e-dueAt">מועד</Label>
                <Input
                  id="e-dueAt"
                  name="dueAt"
                  type="datetime-local"
                  dir="ltr"
                  defaultValue={toDatetimeLocalValue(deadline.dueAt)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-priority">דחיפות</Label>
                <select id="e-priority" name="priority" defaultValue={deadline.priority} className={selectClass}>
                  {Object.entries(PRIORITIES).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <SaveButton />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
