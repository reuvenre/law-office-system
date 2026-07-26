import { cn } from "@/lib/utils";

/** win-solutions attribution — one definition for every surface that shows it. */
export function PoweredBy({ className }: { className?: string }) {
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      מבית{" "}
      <a
        href="https://win-solutions.co.il"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        win-solutions.co.il
      </a>
    </span>
  );
}
