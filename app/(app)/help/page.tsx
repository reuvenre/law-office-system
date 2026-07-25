import { getViewer } from "@/lib/auth/viewer";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_SECTIONS } from "@/lib/help/content";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  await getViewer();

  return (
    <div>
      <PageHeader
        title="מדריך למשתמש"
        description="כל מה שצריך כדי לעבוד עם המערכת — לפי נושא"
      />

      {/* Table of contents */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-2 pt-6">
          {HELP_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-md bg-muted px-3 py-1 text-sm text-primary hover:bg-primary/10"
            >
              {s.title}
            </a>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {HELP_SECTIONS.map((s) => (
          <Card key={s.id} id={s.id} className="scroll-mt-20">
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.intro && <p className="text-sm text-muted-foreground">{s.intro}</p>}
              <ol className="list-decimal space-y-1.5 pr-5 text-sm leading-relaxed">
                {s.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              {s.tips && s.tips.length > 0 && (
                <div className="rounded-lg border-r-2 border-primary/40 bg-muted/30 p-3">
                  {s.tips.map((tip, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      💡 {tip}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        מערכת לניהול משרד עורכי דין — מבית{" "}
        <a
          href="https://win-solutions.co.il"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          win-solutions.co.il
        </a>
      </p>
    </div>
  );
}
