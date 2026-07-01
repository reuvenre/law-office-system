"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="font-heading text-2xl font-bold text-primary">אירעה שגיאה</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        משהו השתבש בטעינת הדף. נסה שוב, ואם הבעיה חוזרת פנה לתמיכה.
      </p>
      <Button onClick={() => reset()}>נסה שוב</Button>
    </div>
  );
}
