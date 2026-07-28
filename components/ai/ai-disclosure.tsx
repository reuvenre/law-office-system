import Link from "next/link";
import { Info } from "lucide-react";

/**
 * Says out loud where the data goes. A law firm's first procurement question
 * about an AI feature is "what leaves the building, and to whom" — burying the
 * answer in a policy page is not an answer.
 */
export function AiDisclosure({ model }: { model: string }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">מה נשלח החוצה</p>
        <p className="text-muted-foreground">
          הבקשות מעובדות אצל <span dir="ltr">Anthropic</span> (דגם{" "}
          <span dir="ltr">{model}</span>). בסיכום תיק נשלחים כותרת התיק, שמות
          הצדדים, הערכאה, מועדי דיונים ותאריכי יעד, ועד שמונה הערות התיק
          האחרונות כלשונן. בניסוח מסמך נשלחת ההנחיה שהקלדתם, ואם בחרתם תיק — גם
          פרטיו.
        </p>
        <p className="text-muted-foreground">
          אין לשלוח חומר שאסור להוציא מהמשרד. הפלט הוא טיוטה בלבד וטעון בדיקת
          עורך/ת דין.{" "}
          <Link href="/privacy" className="underline">
            מדיניות הפרטיות
          </Link>
        </p>
      </div>
    </div>
  );
}
