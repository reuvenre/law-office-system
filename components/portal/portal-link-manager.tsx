"use client";

import { useState, useTransition } from "react";
import { Link2, Copy, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import {
  createPortalLinkAction,
  revokePortalLinksAction,
} from "@/app/(app)/clients/portal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

/** Issue / revoke client-portal magic links (staff side). */
export function PortalLinkManager({ clientId }: { clientId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        קישור אישי המאפשר ללקוח לצפות בתיקים, בדיונים, במסמכים ששותפו ולשלם
        חשבוניות. הקישור מוצג פעם אחת בלבד — העתיקו ושלחו ללקוח.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createPortalLinkAction(clientId);
              if (res.ok) {
                setUrl(res.url);
                setExpiresAt(res.expiresAt);
                toast.success("נוצר קישור חדש");
              } else {
                toast.error(res.error);
              }
            })
          }
        >
          <Link2 className="h-4 w-4" />
          {pending ? "יוצר..." : "יצירת קישור ללקוח"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await revokePortalLinksAction(clientId);
              setUrl(null);
              setExpiresAt(null);
              toast.success("כל הקישורים בוטלו");
            })
          }
        >
          <ShieldOff className="h-4 w-4" />
          ביטול כל הקישורים
        </Button>
      </div>

      {url && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex gap-2">
            <Input readOnly value={url} dir="ltr" className="font-mono text-xs" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast.success("הועתק");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              בתוקף עד {formatDate(expiresAt)}. הקישור לא יוצג שוב — שמרו או שלחו
              אותו כעת.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
