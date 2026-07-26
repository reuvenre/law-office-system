"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { FileCheck } from "lucide-react";
import { toast } from "sonner";
import { issueInvoiceAction } from "@/app/(app)/billing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const ISSUE_TYPES = {
  tax_invoice: "חשבונית מס",
  invoice_receipt: "חשבונית מס-קבלה",
  receipt: "קבלה",
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "מפיק..." : "הפקת מסמך"}
    </Button>
  );
}

/** Issue an official tax document from a proforma (finance only). */
export function IssueInvoiceDialog({ proformaId }: { proformaId: string }) {
  const [open, setOpen] = useState(false);
  const action = issueInvoiceAction.bind(null, proformaId);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <FileCheck className="h-4 w-4" />
        הפקת חשבונית מס
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הפקת מסמך רשמי</DialogTitle>
            <DialogDescription>
              המסמך יופק בסדרת מספור נפרדת. חשבון העסקה נשמר במקביל (כללי מס).
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (fd) => {
              const res = await action(undefined, fd);
              if (res?.error) toast.error(res.error);
              else {
                toast.success("המסמך הופק");
                setOpen(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="ii-type">סוג מסמך</Label>
              <select id="ii-type" name="docType" defaultValue="tax_invoice" className={selectClass}>
                {Object.entries(ISSUE_TYPES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ii-alloc">מספר הקצאה (רשות המסים)</Label>
              <Input
                id="ii-alloc"
                name="allocationNumber"
                dir="ltr"
                inputMode="numeric"
                placeholder="9 ספרות — אופציונלי מתחת לסף"
              />
              <p className="text-xs text-muted-foreground">
                נדרש לחשבוניות מעל הסף השנתי. ניתן להשלים מאוחר יותר.
              </p>
            </div>
            <div className="flex justify-end">
              <SubmitButton />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
