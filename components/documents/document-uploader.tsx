"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { uploadDocumentAction } from "@/app/(app)/documents/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "מעלה..." : "העלאה"}
    </Button>
  );
}

export function DocumentUploader({
  clientId,
  caseId,
}: {
  clientId: string;
  caseId?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        const res = await uploadDocumentAction(undefined, fd);
        if (res?.error) toast.error(res.error);
        else {
          toast.success("המסמך הועלה");
          ref.current?.reset();
        }
      }}
      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4"
    >
      <input type="hidden" name="clientId" value={clientId} />
      {caseId && <input type="hidden" name="caseId" value={caseId} />}
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="file">קובץ</Label>
        <Input id="file" name="file" type="file" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="category">קטגוריה</Label>
        <select id="category" name="category" defaultValue="other" className={selectClass}>
          {Object.entries(DOCUMENT_CATEGORIES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <SubmitButton />
      </div>
    </form>
  );
}
