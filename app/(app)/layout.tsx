import { requireLawyer } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireLawyer();
  return <AppShell user={user}>{children}</AppShell>;
}
