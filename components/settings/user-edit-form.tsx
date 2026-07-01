"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  updateUserAction,
  setPasswordAction,
  setUserActiveAction,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLES } from "@/lib/constants";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SaveButton({ label = "שמירה" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "שומר..." : label}
    </Button>
  );
}

type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
};

function ChangePasswordDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        שינוי סיסמה
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>שינוי סיסמה</DialogTitle>
          </DialogHeader>
          <form
            action={async (fd) => {
              await setPasswordAction(userId, fd);
              toast.success("הסיסמה עודכנה");
              setOpen(false);
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor={`pw-${userId}`}>סיסמה חדשה (8+ תווים)</Label>
              <Input id={`pw-${userId}`} name="password" type="password" minLength={8} required />
            </div>
            <div className="flex justify-end">
              <SaveButton />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UserEditForm({ user }: { user: User }) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <form
        action={async (fd) => {
          await updateUserAction(user.id, fd);
          toast.success("הפרטים נשמרו");
        }}
        className="grid gap-3 sm:grid-cols-3"
      >
        <div className="space-y-1">
          <Label htmlFor={`name-${user.id}`}>שם מלא</Label>
          <Input id={`name-${user.id}`} name="fullName" defaultValue={user.fullName} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`phone-${user.id}`}>טלפון</Label>
          <Input id={`phone-${user.id}`} name="phone" type="tel" dir="ltr" defaultValue={user.phone ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`role-${user.id}`}>תפקיד</Label>
          <select id={`role-${user.id}`} name="role" defaultValue={user.role} className={selectClass}>
            {Object.entries(ROLES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-3">
          <Label>אימייל (לא ניתן לעריכה)</Label>
          <Input value={user.email} dir="ltr" disabled />
        </div>
        <div className="sm:col-span-3">
          <SaveButton />
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <ChangePasswordDialog userId={user.id} />
        <form action={setUserActiveAction.bind(null, user.id, !user.isActive)}>
          <Button type="submit" variant="outline" size="sm">
            {user.isActive ? "השבתה" : "הפעלה"}
          </Button>
        </form>
        <span className={`text-xs ${user.isActive ? "text-success" : "text-muted-foreground"}`}>
          {user.isActive ? "פעיל/ה" : "מושבת/ת"}
        </span>
      </div>
    </div>
  );
}
