"use client";

import { useFormStatus } from "react-dom";
import { CASE_STATUSES, type CaseStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "מעדכן..." : "עדכון סטטוס"}
    </Button>
  );
}

export function StatusChanger({
  action,
  current,
}: {
  action: (formData: FormData) => Promise<void>;
  current: CaseStatus;
}) {
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="status">סטטוס</Label>
        <select id="status" name="status" defaultValue={current} className={selectClass}>
          {Object.entries(CASE_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">סיבת השינוי (אופציונלי)</Label>
        <Input id="note" name="note" />
      </div>
      <SaveButton />
    </form>
  );
}
