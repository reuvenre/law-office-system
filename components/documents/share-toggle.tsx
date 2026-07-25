"use client";

import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { setDocumentSharedAction } from "@/app/(app)/documents/actions";
import { Button } from "@/components/ui/button";

/** Toggle whether a document is visible in the client portal. */
export function ShareToggle({
  docId,
  caseId,
  clientId,
  shared,
}: {
  docId: string;
  caseId: string | null;
  clientId: string;
  shared: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      size="sm"
      variant={shared ? "secondary" : "ghost"}
      disabled={pending}
      title={shared ? "משותף עם הלקוח — לחצו לביטול" : "שיתוף עם הלקוח בפורטל"}
      onClick={() =>
        start(async () => {
          await setDocumentSharedAction(docId, caseId, clientId, !shared);
          toast.success(shared ? "השיתוף בוטל" : "המסמך שותף עם הלקוח");
        })
      }
    >
      {shared ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {shared ? "משותף" : "שתף"}
    </Button>
  );
}
