import { getViewer } from "@/lib/auth/viewer";
import { aiAvailableFor } from "@/lib/ai/gate";
import { AI_MODEL } from "@/lib/ai/client";
import { PageHeader } from "@/components/shared/page-header";
import { ModuleLocked } from "@/components/billing/module-locked";
import { DocumentDrafter } from "@/components/ai/document-drafter";
import { AiDisclosure } from "@/components/ai/ai-disclosure";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const viewer = await getViewer();

  if (!(await aiAvailableFor(viewer.firmId))) {
    return (
      <div>
        <PageHeader title="עוזר AI" description="ניסוח וסיכום מסמכים משפטיים" />
        <ModuleLocked
          title="עוזר ה-AI אינו פעיל"
          description="עוזר ה-AI כבוי כברירת מחדל, מפני שהשימוש בו שולח פרטי תיק לשירות חיצוני. להפעלה — לאחר סקירת ההשלכות — פנו ל-win-solutions.co.il."
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
      <div className="space-y-4">
        <AiDisclosure model={AI_MODEL} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ניסוח מסמך</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentDrafter />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
