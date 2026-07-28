import Link from "next/link";
import { PoweredBy } from "@/components/shared/powered-by";

/**
 * Public shell for the policy pages. Deliberately outside the app layout so a
 * prospective customer (or a client following a portal link) can read them
 * without an account.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <div className="mx-auto w-full max-w-3xl px-4">
        <article className="rounded-lg border bg-background p-6 sm:p-8">
          {children}
        </article>
        <footer className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-primary">
            מדיניות פרטיות
          </Link>
          <Link href="/terms" className="hover:text-primary">
            תנאי שימוש
          </Link>
          <Link href="/login" className="hover:text-primary">
            התחברות
          </Link>
          <PoweredBy />
        </footer>
      </div>
    </div>
  );
}
