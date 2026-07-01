"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { addNoteAction } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "שומר..." : "הוספת הערה"}
    </Button>
  );
}

export function NoteComposer({
  caseId,
  clientId,
}: {
  caseId?: string;
  clientId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addNoteAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-2"
    >
      {caseId && <input type="hidden" name="caseId" value={caseId} />}
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <Textarea name="body" rows={2} placeholder="הוספת הערה..." required />
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
