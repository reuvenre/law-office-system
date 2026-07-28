"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Print / save-as-PDF for a billing document. The browser's own print dialog
 * is what makes the invoice deliverable to the client; the page's print styles
 * (globals.css) strip the app chrome so the output is the document alone.
 */
export function PrintInvoiceButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 print-hide"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      הדפסה / PDF
    </Button>
  );
}
