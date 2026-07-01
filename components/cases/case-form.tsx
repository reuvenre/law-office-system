"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRACTICE_AREAS, type PracticeArea } from "@/lib/constants";
import { PRACTICE_AREA_FIELDS } from "@/lib/practice-areas";
import type { CaseFormState } from "@/app/(app)/cases/actions";

type Option = { id: string; fullName: string };

type CaseDefaults = {
  clientId?: string;
  title?: string;
  practiceArea?: PracticeArea;
  caseNumber?: string | null;
  opposingParty?: string | null;
  court?: string | null;
  responsibleLawyerId?: string | null;
  typeFields?: Record<string, unknown> | null;
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "שומר..." : label}
    </Button>
  );
}

export function CaseForm({
  action,
  clients,
  lawyers,
  defaults,
  fixedClientId,
  submitLabel = "שמירה",
}: {
  action: (prev: CaseFormState, formData: FormData) => Promise<CaseFormState>;
  clients: Option[];
  lawyers: Option[];
  defaults?: CaseDefaults;
  fixedClientId?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, undefined);
  const [practiceArea, setPracticeArea] = useState<PracticeArea>(
    defaults?.practiceArea ?? "civil_commercial"
  );
  const tf = defaults?.typeFields ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Client */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientId">לקוח</Label>
          {fixedClientId ? (
            <input type="hidden" name="clientId" value={fixedClientId} />
          ) : null}
          {fixedClientId ? (
            <Input
              disabled
              value={clients.find((c) => c.id === fixedClientId)?.fullName ?? ""}
            />
          ) : (
            <select
              id="clientId"
              name="clientId"
              defaultValue={defaults?.clientId ?? ""}
              className={selectClass}
              required
            >
              <option value="" disabled>
                בחר לקוח
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          )}
          <FieldError messages={state?.errors?.clientId} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">כותרת התיק</Label>
          <Input id="title" name="title" defaultValue={defaults?.title ?? ""} required />
          <FieldError messages={state?.errors?.title} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="practiceArea">תחום</Label>
          <select
            id="practiceArea"
            name="practiceArea"
            value={practiceArea}
            onChange={(e) => setPracticeArea(e.target.value as PracticeArea)}
            className={selectClass}
          >
            {Object.entries(PRACTICE_AREAS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="caseNumber">מספר תיק פנימי</Label>
          <Input id="caseNumber" name="caseNumber" dir="ltr" defaultValue={defaults?.caseNumber ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsibleLawyerId">עו״ד אחראית</Label>
          <select
            id="responsibleLawyerId"
            name="responsibleLawyerId"
            defaultValue={defaults?.responsibleLawyerId ?? ""}
            className={selectClass}
          >
            <option value="">—</option>
            {lawyers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="court">בית משפט / לשכה</Label>
          <Input id="court" name="court" defaultValue={defaults?.court ?? ""} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="opposingParty">צד שכנגד</Label>
          <Input
            id="opposingParty"
            name="opposingParty"
            defaultValue={defaults?.opposingParty ?? ""}
          />
        </div>
      </div>

      {/* Practice-area-specific fields */}
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">
          שדות ייעודיים — {PRACTICE_AREAS[practiceArea]}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRACTICE_AREA_FIELDS[practiceArea].map((field) => {
            const current = tf[field.key];
            if (field.type === "checkbox") {
              return (
                <div key={field.key} className="flex items-center gap-2 pt-6">
                  <input
                    id={`tf_${field.key}`}
                    name={`tf_${field.key}`}
                    type="checkbox"
                    defaultChecked={Boolean(current)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor={`tf_${field.key}`} className="font-normal">
                    {field.label}
                  </Label>
                </div>
              );
            }
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`tf_${field.key}`}>{field.label}</Label>
                <Input
                  id={`tf_${field.key}`}
                  name={`tf_${field.key}`}
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  dir={field.type === "number" ? "ltr" : undefined}
                  defaultValue={
                    current === null || current === undefined ? "" : String(current)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
