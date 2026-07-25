import { PoweredBy } from "@/components/shared/powered-by";

export const metadata = {
  title: "אזור אישי ללקוח",
  // The portal is private, per-client content — keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <span className="font-heading text-base font-bold text-primary">
            אזור אישי ללקוח
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
      <footer className="pb-8 text-center">
        <PoweredBy />
      </footer>
    </div>
  );
}
