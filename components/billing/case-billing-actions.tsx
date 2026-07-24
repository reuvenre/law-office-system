"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  createChargesFromTimeAction,
  createProformaAction,
} from "@/app/(app)/billing/actions";
import { Button } from "@/components/ui/button";

/** "Bill un-invoiced time" — rolls billable time entries into a fee charge. */
export function BillTimeButton({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createChargesFromTimeAction(caseId);
          if (res?.error) toast.error(res.error);
          else toast.success("נוצר חיוב מהשעות");
        })
      }
    >
      {pending ? "מחשב..." : "חיוב שעות שטרם חויבו"}
    </Button>
  );
}

/** Create a proforma (חשבון עסקה) from the given pending charge ids. */
export function CreateProformaButton({
  clientId,
  chargeIds,
  caseId,
}: {
  clientId: string;
  chargeIds: string[];
  caseId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending || chargeIds.length === 0}
      onClick={() =>
        start(async () => {
          const res = await createProformaAction(clientId, chargeIds, caseId);
          if (res?.error) toast.error(res.error);
          else toast.success("נוצר חשבון עסקה");
        })
      }
    >
      {pending ? "יוצר..." : `צור חשבון עסקה (${chargeIds.length})`}
    </Button>
  );
}
