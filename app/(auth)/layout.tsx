import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-4">
      {children}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-primary">
          מדיניות פרטיות
        </Link>
        <Link href="/terms" className="hover:text-primary">
          תנאי שימוש
        </Link>
        <a
          href="https://win-solutions.co.il"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary"
        >
          מבית win-solutions.co.il
        </a>
      </div>
    </div>
  );
}
