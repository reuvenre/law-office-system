import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Compact delete control for list rows. `action` is a bound server action. */
export function InlineDelete({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button type="submit" variant="ghost" size="icon" aria-label="מחיקה">
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </form>
  );
}
