import { listUsersForSettings } from "@/lib/data/users";
import { getSettings } from "@/lib/data/settings";
import { PageHeader } from "@/components/shared/page-header";
import { UserEditForm } from "@/components/settings/user-edit-form";
import { AddUserForm } from "@/components/settings/add-user-form";
import { ReminderSettingsForm } from "@/components/settings/reminder-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [lawyers, settings] = await Promise.all([
    listUsersForSettings(),
    getSettings(),
  ]);

  return (
    <div>
      <PageHeader title="הגדרות" description="משתמשות, תזכורות וחיבורים" />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">משתמשות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddUserForm />
            <div className="space-y-3">
              {lawyers.map((l) => (
                <UserEditForm key={l.id} user={l} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              להתחברות עם Google — יש להוסיף את האימייל גם ל-<code>ALLOWED_EMAILS</code> בהגדרות הסביבה.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">תזכורות</CardTitle>
          </CardHeader>
          <CardContent>
            <ReminderSettingsForm settings={settings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
