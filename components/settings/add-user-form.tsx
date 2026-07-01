"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { addUserAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES } from "@/lib/constants";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "מוסיף..." : "הוספת משתמש/ת"}
    </Button>
  );
}

export function AddUserForm() {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        const res = await addUserAction(undefined, fd);
        if (res?.error) toast.error(res.error);
        else {
          toast.success("המשתמש/ת נוספ/ה");
          ref.current?.reset();
        }
      }}
      className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2"
    >
      <div className="space-y-1">
        <Label htmlFor="au-name">שם מלא</Label>
        <Input id="au-name" name="fullName" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="au-email">אימייל</Label>
        <Input id="au-email" name="email" type="email" dir="ltr" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="au-role">תפקיד</Label>
        <select id="au-role" name="role" defaultValue="lawyer" className={selectClass}>
          {Object.entries(ROLES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="au-password">סיסמה (8+ תווים)</Label>
        <Input id="au-password" name="password" type="password" minLength={8} required />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}
