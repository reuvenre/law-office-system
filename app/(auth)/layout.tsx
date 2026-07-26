export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-4">
      {children}
      <a
        href="https://win-solutions.co.il"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-primary"
      >
        מבית win-solutions.co.il
      </a>
    </div>
  );
}
