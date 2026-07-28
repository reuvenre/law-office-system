import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * The portal home is force-dynamic and runs four queries in parallel, so
 * without this the client stares at a blank page while it resolves.
 */
export default function PortalLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="טוען">
      <div className="h-6 w-48 animate-pulse rounded bg-muted-foreground/15" />
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/15" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/10" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted-foreground/10" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
