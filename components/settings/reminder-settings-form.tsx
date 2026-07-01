"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { updateReminderSettingsAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REMINDER_CHANNELS } from "@/lib/constants";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "שומר..." : "שמירת הגדרות"}
    </Button>
  );
}

type Settings = {
  hearingTemplate: string;
  deadlineTemplate: string;
  hearingDaysBefore: number[];
  deadlineCriticalDays: number[];
  deadlineHighDays: number[];
  defaultChannel: string;
};

export function ReminderSettingsForm({ settings }: { settings: Settings }) {
  return (
    <form
      action={async (fd) => {
        await updateReminderSettingsAction(fd);
        toast.success("ההגדרות נשמרו");
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="hearingTemplate">תבנית תזכורת לדיון</Label>
        <Textarea
          id="hearingTemplate"
          name="hearingTemplate"
          rows={4}
          defaultValue={settings.hearingTemplate}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="deadlineTemplate">תבנית תזכורת למועד</Label>
        <Textarea
          id="deadlineTemplate"
          name="deadlineTemplate"
          rows={4}
          defaultValue={settings.deadlineTemplate}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        משתנים זמינים: {"{client_name}"}, {"{case_title}"}, {"{date}"}, {"{time}"}, {"{court}"}, {"{title}"}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="hearingDaysBefore">ימים לפני דיון</Label>
          <Input
            id="hearingDaysBefore"
            name="hearingDaysBefore"
            dir="ltr"
            defaultValue={settings.hearingDaysBefore.join(",")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadlineCriticalDays">מועד קריטי — ימים לפני</Label>
          <Input
            id="deadlineCriticalDays"
            name="deadlineCriticalDays"
            dir="ltr"
            defaultValue={settings.deadlineCriticalDays.join(",")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadlineHighDays">מועד גבוה — ימים לפני</Label>
          <Input
            id="deadlineHighDays"
            name="deadlineHighDays"
            dir="ltr"
            defaultValue={settings.deadlineHighDays.join(",")}
          />
        </div>
      </div>

      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="defaultChannel">ערוץ ברירת מחדל</Label>
        <select
          id="defaultChannel"
          name="defaultChannel"
          defaultValue={settings.defaultChannel}
          className={selectClass}
        >
          {Object.entries(REMINDER_CHANNELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <SaveButton />
    </form>
  );
}
