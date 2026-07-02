"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  updateUserAction,
  setPasswordAction,
  setUserActiveAction,
  setUserScopeAction,
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
import { ROLES, ACCESS_SCOPES } from "@/lib/constants";

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
  isAdmin: boolean;
  accessScope: string;
  visibleUserIds: string[];
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

export function UserEditForm({
  user,
  canManage,
  allUsers,
}: {
  user: User;
  canManage: boolean;
  allUsers: { id: string; fullName: string }[];
}) {
  const [scope, setScope] = useState(user.accessScope);

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <form
        action={async (fd) => {
          const res = await updateUserAction(user.id, fd);
          if (res?.error) toast.error(res.error);
          else toast.success("הפרטים נשמרו");
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
        {canManage && (
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
        )}
        <div className="space-y-1 sm:col-span-3">
          <Label htmlFor={`email-${user.id}`}>אימייל</Label>
          <Input
            id={`email-${user.id}`}
            name="email"
            type="email"
            dir="ltr"
            defaultValue={user.email}
            disabled={!canManage}
            required={canManage}
          />
          {canManage && (
            <p className="text-xs text-muted-foreground">
              שינוי האימייל משנה את זהות ההתחברות של המשתמש/ת.
            </p>
          )}
        </div>
        <div className="sm:col-span-3">
          <SaveButton />
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <ChangePasswordDialog userId={user.id} />
        {canManage && (
          <form action={setUserActiveAction.bind(null, user.id, !user.isActive)}>
            <Button type="submit" variant="outline" size="sm">
              {user.isActive ? "השבתה" : "הפעלה"}
            </Button>
          </form>
        )}
        <span className={`text-xs ${user.isActive ? "text-success" : "text-muted-foreground"}`}>
          {user.isActive ? "פעיל/ה" : "מושבת/ת"}
        </span>
      </div>

      {canManage && (
        <form
          action={async (fd) => {
            await setUserScopeAction(user.id, fd);
            toast.success("ההרשאות נשמרו");
          }}
          className="grid gap-3 border-t pt-3 sm:grid-cols-3"
        >
          <div className="flex items-center gap-2 pt-6">
            <input
              id={`admin-${user.id}`}
              name="isAdmin"
              type="checkbox"
              defaultChecked={user.isAdmin}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor={`admin-${user.id}`} className="font-normal">
              מנהל/ת (רואה הכול)
            </Label>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`scope-${user.id}`}>היקף צפייה</Label>
            <select
              id={`scope-${user.id}`}
              name="accessScope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className={selectClass}
            >
              {Object.entries(ACCESS_SCOPES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {scope === "custom" && (
            <div className="space-y-1">
              <Label htmlFor={`vis-${user.id}`}>רואה גם את</Label>
              <select
                id={`vis-${user.id}`}
                name="visibleUserIds"
                multiple
                defaultValue={user.visibleUserIds}
                className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {allUsers
                  .filter((u) => u.id !== user.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-3">
            <SaveButton label="שמירת הרשאות" />
          </div>
        </form>
      )}
    </div>
  );
}
