import { notFound } from "next/navigation";
import { getClient } from "@/lib/data/clients";
import { updateClientAction } from "@/app/(app)/clients/actions";
import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/clients/client-form";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: { clientId: string };
}) {
  const client = await getClient(params.clientId);
  if (!client) notFound();

  const action = updateClientAction.bind(null, client.id);

  return (
    <div>
      <PageHeader title="עריכת לקוח" description={client.fullName} />
      <ClientForm
        action={action}
        submitLabel="שמירת שינויים"
        defaults={{
          fullName: client.fullName,
          idNumber: client.idNumber,
          clientType: client.clientType,
          phone: client.phone,
          email: client.email,
          address: client.address,
          notes: client.notes,
          reminderConsent: client.reminderConsent,
          reminderChannel: client.reminderChannel,
        }}
      />
    </div>
  );
}
