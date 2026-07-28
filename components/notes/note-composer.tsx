"use client";

import { useRef, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        const result = await addNoteAction(formData);
        // Only clear the textarea once the note is actually stored — otherwise a
        // rejected save silently destroys what was typed.
        if (result?.ok) {
          setError(null);
          formRef.current?.reset();
        } else {
          setError(result?.error ?? "שמירת ההערה נכשלה");
        }
      }}
      className="space-y-2"
    >
      {caseId && <input type="hidden" name="caseId" value={caseId} />}
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <Textarea name="body" rows={2} placeholder="הוספת הערה..." required />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
