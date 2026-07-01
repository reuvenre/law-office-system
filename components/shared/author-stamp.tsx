import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatDateTime } from "@/lib/format";

/**
 * Recurring audit element (spec §3.3 / §10.6): who performed an action + when.
 */
export function AuthorStamp({
  name,
  at,
}: {
  name?: string | null;
  at?: string | Date | null;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Avatar className="h-5 w-5">
        <AvatarFallback className="bg-secondary text-[10px] text-secondary-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span>{name || "—"}</span>
      {at && (
        <>
          <span aria-hidden>·</span>
          <time dir="ltr">{formatDateTime(at)}</time>
        </>
      )}
    </div>
  );
}
