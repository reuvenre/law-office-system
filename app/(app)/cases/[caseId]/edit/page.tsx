import { notFound } from "next/navigation";
import { getCase } from "@/lib/data/cases";
import { listClients } from "@/lib/data/clients";
import { listActiveLawyers } from "@/lib/data/users";
import { getViewer } from "@/lib/auth/viewer";
import { updateCaseAction } from "@/app/(app)/cases/actions";
import { PageHeader } from "@/components/shared/page-header";
import { CaseForm } from "@/components/cases/case-form";
import type { PracticeArea } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EditCasePage({
  params,
}: {
  params: { caseId: string };
}) {
  const viewer = await getViewer();
  const caseRow = await getCase(params.caseId, viewer.allowedIds);
  if (!caseRow) notFound();

  const [clientRows, lawyers] = await Promise.all([
    listClients(viewer.allowedIds),
    listActiveLawyers(),
  ]);
  const clients = clientRows.map((c) => ({ id: c.id, fullName: c.fullName }));
  const action = updateCaseAction.bind(null, caseRow.id);

  return (
    <div>
      <PageHeader title="עריכת תיק" description={caseRow.title} />
      <CaseForm
        action={action}
        clients={clients}
        lawyers={lawyers}
        submitLabel="שמירת שינויים"
        defaults={{
          clientId: caseRow.clientId,
          title: caseRow.title,
          practiceArea: caseRow.practiceArea as PracticeArea,
          caseNumber: caseRow.caseNumber,
          opposingParty: caseRow.opposingParty,
          court: caseRow.court,
          responsibleLawyerId: caseRow.responsibleLawyerId,
          onedriveUrl: caseRow.onedriveUrl,
          typeFields: caseRow.typeFields as Record<string, unknown>,
        }}
      />
    </div>
  );
}
