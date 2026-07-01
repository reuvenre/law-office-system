import { listClients } from "@/lib/data/clients";
import { listActiveLawyers } from "@/lib/data/users";
import { getViewer } from "@/lib/auth/viewer";
import { createCaseAction } from "@/app/(app)/cases/actions";
import { PageHeader } from "@/components/shared/page-header";
import { ConflictChecker } from "@/components/shared/conflict-checker";
import { CaseForm } from "@/components/cases/case-form";

export const dynamic = "force-dynamic";

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const viewer = await getViewer();
  const [clientRows, lawyers] = await Promise.all([
    listClients(viewer.allowedIds),
    listActiveLawyers(),
  ]);
  const clients = clientRows.map((c) => ({ id: c.id, fullName: c.fullName }));

  return (
    <div>
      <PageHeader title="תיק חדש" description="בחירת תחום והזנת פרטי התיק" />
      <ConflictChecker />
      <CaseForm
        action={createCaseAction}
        clients={clients}
        lawyers={lawyers}
        fixedClientId={searchParams.clientId}
        submitLabel="יצירת תיק"
      />
    </div>
  );
}
