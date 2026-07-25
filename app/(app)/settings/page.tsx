import { listUsersForSettings } from "@/lib/data/users";
import { getSettings } from "@/lib/data/settings";
import { getViewer } from "@/lib/auth/viewer";
import { getFirm, countActiveSeats } from "@/lib/data/firm";
import { PageHeader } from "@/components/shared/page-header";
import { UserEditForm } from "@/components/settings/user-edit-form";
import { AddUserForm } from "@/components/settings/add-user-form";
import { ReminderSettingsForm } from "@/components/settings/reminder-settings-form";
import { FirmPlanForm } from "@/components/settings/firm-plan-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await getViewer();
  const [allRows, settings, firm, activeSeats] = await Promise.all([
    listUsersForSettings(),
    getSettings(),
    getFirm(viewer.firmId),
    countActiveSeats(viewer.firmId),
  ]);

  const allUsers = allRows.map((u) => ({ id: u.id, fullName: u.fullName }));
  const rows = viewer.isAdmin
    ? allRows
    : allRows.filter((u) => u.id === viewer.id);

  return (
    <div>
      <PageHeader title="הגדרות" description="פרופיל, משתמשות ותזכורות" />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {viewer.isAdmin ? "משתמשות" : "הפרופיל שלי"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {viewer.isAdmin && <AddUserForm />}
            <div className="space-y-3">
              {rows.map((u) => (
                <UserEditForm
                  key={u.id}
                  user={u}
                  canManage={viewer.isAdmin}
                  allUsers={allUsers}
                />
              ))}
            </div>
            {viewer.isAdmin && (
              <p className="text-xs text-muted-foreground">
                להתחברות עם Google — יש להוסיף את האימייל גם ל-<code>ALLOWED_EMAILS</code> בהגדרות הסביבה.
              </p>
            )}
          </CardContent>
        </Card>

        {viewer.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">תוכנית ומודולים</CardTitle>
            </CardHeader>
            <CardContent>
              <FirmPlanForm firm={firm} activeSeats={activeSeats} />
            </CardContent>
          </Card>
        )}

        {viewer.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">תזכורות</CardTitle>
            </CardHeader>
            <CardContent>
              <ReminderSettingsForm settings={settings} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
