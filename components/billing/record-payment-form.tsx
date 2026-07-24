"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { recordPaymentAction } from "@/app/(app)/billing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHODS } from "@/lib/constants";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "רושם..." : "רישום תשלום"}
    </Button>
  );
}

export function RecordPaymentForm({
  invoiceId,
  defaultAmount,
}: {
  invoiceId: string;
  defaultAmount?: number;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const action = recordPaymentAction.bind(null, invoiceId);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        const res = await action(undefined, fd);
        if (res?.error) toast.error(res.error);
        else {
          toast.success("התשלום נרשם");
          ref.current?.reset();
        }
      }}
      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4"
    >
      <div className="space-y-1">
        <Label htmlFor="pay-amount">סכום (₪)</Label>
        <Input
          id="pay-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          dir="ltr"
          defaultValue={defaultAmount != null && defaultAmount > 0 ? defaultAmount : undefined}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pay-method">אמצעי</Label>
        <select id="pay-method" name="method" defaultValue="bank_transfer" className={selectClass}>
          {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="pay-ref">אסמכתא (אופציונלי)</Label>
        <Input id="pay-ref" name="reference" dir="ltr" />
      </div>
      <div className="sm:col-span-4">
        <SubmitButton />
      </div>
    </form>
  );
}
