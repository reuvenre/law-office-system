import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** Upsell shown when a licensed module isn't part of the firm's plan. */
export function ModuleLocked({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {description && (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          לשדרוג התוכנית פנו למנהל/ת המשרד או ל־
          <a
            href="https://win-solutions.co.il"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            win-solutions.co.il
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
