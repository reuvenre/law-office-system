"use client";

import { useState, useTransition } from "react";
import { Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { draftDocumentAction } from "@/app/(app)/ai/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Free-text legal document drafting via AI (win-solutions). */
export function DocumentDrafter() {
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="ai-instruction">מה לנסח?</Label>
        <Textarea
          id="ai-instruction"
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="לדוגמה: מכתב התראה לפני נקיטת הליכים בגין חוב שלא שולם; ייפוי כוח כללי; טיוטת תצהיר..."
        />
      </div>
      <Button
        disabled={pending || instruction.trim().length < 5}
        onClick={() =>
          start(async () => {
            const res = await draftDocumentAction(instruction);
            if (res.ok) setDraft(res.text);
            else toast.error(res.error);
          })
        }
      >
        <Sparkles className="h-4 w-4" />
        {pending ? "מנסח..." : "ניסוח"}
      </Button>

      {draft && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>הטיוטה</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(draft);
                toast.success("הועתק");
              }}
            >
              <Copy className="h-4 w-4" />
              העתקה
            </Button>
          </div>
          <Textarea
            rows={16}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            נוצר על ידי עוזר AI — יש לבדוק, להשלים פרטים חסרים ולאשר לפני שימוש.
          </p>
        </div>
      )}
    </div>
  );
}
