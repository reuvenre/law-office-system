"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLIENT_TYPES, REMINDER_CHANNELS } from "@/lib/constants";
import type { ClientFormState } from "@/app/(app)/clients/actions";

type ClientDefaults = {
  fullName?: string;
  idNumber?: string | null;
  clientType?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  reminderConsent?: boolean;
  reminderChannel?: string | null;
  onedriveUrl?: string | null;
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

export function ClientForm({
  action,
  defaults,
  submitLabel = "שמירה",
}: {
  action: (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  defaults?: ClientDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">שם מלא / שם תאגיד</Label>
          <Input id="fullName" name="fullName" defaultValue={defaults?.fullName ?? ""} required />
          <FieldError messages={state?.errors?.fullName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientType">סוג לקוח</Label>
          <select
            id="clientType"
            name="clientType"
            defaultValue={defaults?.clientType ?? "individual"}
            className={selectClass}
          >
            {Object.entries(CLIENT_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="idNumber">ת״ז / ח״פ</Label>
          <Input id="idNumber" name="idNumber" dir="ltr" defaultValue={defaults?.idNumber ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">טלפון</Label>
          <Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={defaults?.phone ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">אימייל</Label>
          <Input id="email" name="email" type="email" dir="ltr" defaultValue={defaults?.email ?? ""} />
          <FieldError messages={state?.errors?.email} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">כתובת</Label>
          <Input id="address" name="address" defaultValue={defaults?.address ?? ""} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">הערות</Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="onedriveUrl">קישור תיקייה ב-OneDrive</Label>
          <Input
            id="onedriveUrl"
            name="onedriveUrl"
            type="url"
            dir="ltr"
            placeholder="https://..."
            defaultValue={defaults?.onedriveUrl ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminderChannel">ערוץ תזכורות מועדף</Label>
          <select
            id="reminderChannel"
            name="reminderChannel"
            defaultValue={defaults?.reminderChannel ?? "whatsapp"}
            className={selectClass}
          >
            {Object.entries(REMINDER_CHANNELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-7">
          <input
            id="reminderConsent"
            name="reminderConsent"
            type="checkbox"
            defaultChecked={defaults?.reminderConsent ?? false}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="reminderConsent" className="font-normal">
            הסכמה לקבלת תזכורות
          </Label>
        </div>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
