import { requirePortalSession } from "@/lib/portal/session";

/**
 * Auth boundary for portal pages — mirrors app/(app)/layout.tsx on the staff
 * side. Everything under this route group is gated here, so a new portal page
 * cannot ship unauthenticated by forgetting its own check. `access/` and
 * `expired/` sit outside the group because they must be reachable without a
 * session.
 *
 * Route handlers are not covered by layouts — those use withPortalSession()
 * from lib/portal/session.ts.
 */
export default async function SecurePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePortalSession();
  return <>{children}</>;
}
