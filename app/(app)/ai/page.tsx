import { getViewer } from "@/lib/auth/viewer";
import { isAIEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/shared/page-header";
import { ModuleLocked } from "@/components/billing/module-locked";
import { DocumentDrafter } from "@/components/ai/document-drafter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  await getViewer();

  if (!isAIEnabled()) {
    return (
      <div>
        <PageHeader title="עוזר AI" description="ניסוח וסיכום מסמכים משפטיים" />
        <ModuleLocked
          title="עוזר ה-AI אינו פעיל"
          description="יש להגדיר מפתח ANTHROPIC_API_KEY בהגדרות הסביבה כדי להפעיל ניסוח וסיכום חכם."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="עוזר AI"
        description="ניסוח טיוטות מסמכים ומכתבים משפטיים בעברית"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ניסוח מסמך</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentDrafter />
        </CardContent>
      </Card>
    </div>
  );
}
