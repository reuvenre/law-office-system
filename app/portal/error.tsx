"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * The portal's audience is the firm's own clients, not staff — so the failure
 * message is reassuring rather than diagnostic, and points them at the office
 * instead of at a support queue they have no access to.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="font-heading text-xl font-bold text-primary">
        לא הצלחנו לטעון את הדף
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        אירעה תקלה זמנית. נסו לרענן — ואם זה חוזר, אפשר לפנות למשרד ונטפל בזה.
      </p>
      <Button onClick={() => reset()}>נסו שוב</Button>
    </div>
  );
}
