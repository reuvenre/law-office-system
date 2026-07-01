"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateTaskAction } from "@/app/(app)/tasks/actions";
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
import { TASK_STATUSES } from "@/lib/constants";

type Option = { id: string; fullName: string };

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

export function TaskEditDialog({
  task,
  lawyers,
}: {
  task: {
    id: string;
    caseId: string | null;
    title: string;
    assignedTo: string | null;
    dueAt: string | Date | null;
    status: string;
  };
  lawyers: Option[];
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
            <DialogTitle>עריכת משימה</DialogTitle>
          </DialogHeader>
          <form
            action={async (fd) => {
              const res = await updateTaskAction(task.id, task.caseId, undefined, fd);
              if (res?.error) toast.error(res.error);
              else {
                toast.success("המשימה עודכנה");
                setOpen(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="e-task-title">משימה</Label>
              <Input id="e-task-title" name="title" defaultValue={task.title} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="e-assignedTo">אחראית</Label>
                <select id="e-assignedTo" name="assignedTo" defaultValue={task.assignedTo ?? ""} className={selectClass}>
                  <option value="">—</option>
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-task-dueAt">מועד</Label>
                <Input
                  id="e-task-dueAt"
                  name="dueAt"
                  type="datetime-local"
                  dir="ltr"
                  defaultValue={toDatetimeLocalValue(task.dueAt)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-task-status">סטטוס</Label>
              <select id="e-task-status" name="status" defaultValue={task.status} className={selectClass}>
                {Object.entries(TASK_STATUSES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
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
