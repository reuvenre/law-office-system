"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateHearingAction } from "@/app/(app)/hearings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toDatetimeLocalValue } from "@/lib/datetime";
import { HEARING_STATUSES } from "@/lib/constants";

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

export function HearingEditDialog({
  hearing,
}: {
  hearing: {
    id: string;
    caseId: string;
    hearingAt: string | Date;
    location: string | null;
    hearingType: string | null;
    status: string;
    outcome: string | null;
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
            <DialogTitle>עריכת דיון</DialogTitle>
          </DialogHeader>
          <form
            action={async (fd) => {
              const res = await updateHearingAction(hearing.id, hearing.caseId, undefined, fd);
              if (res?.error) toast.error(res.error);
              else {
                toast.success("הדיון עודכן");
                setOpen(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="e-hearingAt">תאריך ושעה</Label>
              <Input
                id="e-hearingAt"
                name="hearingAt"
                type="datetime-local"
                dir="ltr"
                defaultValue={toDatetimeLocalValue(hearing.hearingAt)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="e-hearingType">סוג</Label>
                <Input id="e-hearingType" name="hearingType" defaultValue={hearing.hearingType ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-location">מיקום</Label>
                <Input id="e-location" name="location" defaultValue={hearing.location ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-status">סטטוס</Label>
              <select id="e-status" name="status" defaultValue={hearing.status} className={selectClass}>
                {Object.entries(HEARING_STATUSES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-outcome">סיכום תוצאה</Label>
              <Textarea id="e-outcome" name="outcome" rows={3} defaultValue={hearing.outcome ?? ""} />
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
