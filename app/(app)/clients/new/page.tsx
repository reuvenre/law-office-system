import { PageHeader } from "@/components/shared/page-header";
import { ConflictChecker } from "@/components/shared/conflict-checker";
import { ClientForm } from "@/components/clients/client-form";
import { createClientAction } from "@/app/(app)/clients/actions";

export default function NewClientPage() {
  return (
    <div>
      <PageHeader title="לקוח חדש" description="הזנת פרטי לקוח" />
      <ConflictChecker />
      <ClientForm action={createClientAction} submitLabel="יצירת לקוח" />
    </div>
  );
}
