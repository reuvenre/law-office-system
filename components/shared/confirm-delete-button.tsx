"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

/**
 * Confirmation gate for hard deletes (spec §5 — deletes are physical but
 * always logged to activity_log). `action` is a bound server action.
 */
export function ConfirmDeleteButton({
  action,
  triggerLabel = "מחיקה",
  title = "אישור מחיקה",
  description = "פעולה זו אינה הפיכה. הרשומה תימחק לצמיתות (הפעולה תתועד ביומן).",
}: {
  action: () => Promise<void>;
  triggerLabel?: string;
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 text-destructive" />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="secondary">ביטול</Button>
            </DialogClose>
            <form action={action}>
              <Button type="submit" variant="destructive">
                מחיקה לצמיתות
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
