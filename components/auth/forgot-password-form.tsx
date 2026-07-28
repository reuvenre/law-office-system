"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  requestPasswordResetAction,
  type ForgotState,
} from "@/app/(auth)/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "שולח..." : "שליחת קישור לאיפוס"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotState, FormData>(
    requestPasswordResetAction,
    undefined
  );

  if (state?.sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">
          אם הכתובת רשומה במערכת, נשלח אליה קישור לקביעת סיסמה חדשה.
          הקישור תקף לשעה אחת.
        </p>
        <p className="text-xs text-muted-foreground">
          לא הגיע? בדקו בתיקיית הספאם, או פנו למנהל/ת המשרד שיכול/ה לקבוע לכם
          סיסמה ישירות במסך ההגדרות.
        </p>
        <Link href="/login" className="text-sm underline">
          חזרה להתחברות
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">אימייל</Label>
        <Input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="username"
          required
          placeholder="name@example.com"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
      <p className="text-center text-sm">
        <Link href="/login" className="underline text-muted-foreground">
          חזרה להתחברות
        </Link>
      </p>
    </form>
  );
}
