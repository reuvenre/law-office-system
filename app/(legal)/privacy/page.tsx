import { LEGAL_LAST_UPDATED, OPERATOR } from "@/lib/legal/operator";

export const metadata = {
  title: "מדיניות פרטיות",
  description: "כיצד מערכת ניהול משרד עורכי הדין אוספת, מאחסנת ומעבדת מידע.",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl text-primary">מדיניות פרטיות</h1>
        <p className="text-xs text-muted-foreground">
          עודכן לאחרונה: {LEGAL_LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">1. מי אנחנו</h2>
        <p>
          המערכת מופעלת על ידי {OPERATOR.legalName} (&ldquo;המפעילה&rdquo;),{" "}
          {OPERATOR.companyNumber}, {OPERATOR.address}. יצירת קשר בנושאי פרטיות:{" "}
          <a href={`mailto:${OPERATOR.privacyEmail}`} dir="ltr" className="underline">
            {OPERATOR.privacyEmail}
          </a>
          .
        </p>
        <p>
          המערכת נמכרת למשרדי עורכי דין. ביחס למידע על לקוחות המשרד, <strong>המשרד
          הוא בעל המאגר</strong> והמפעילה משמשת כמחזיקה/מעבדת מידע מטעמו בלבד,
          ופועלת לפי הוראותיו.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">2. איזה מידע נשמר</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>משתמשי המשרד:</strong> שם, אימייל, טלפון, תפקיד, הרשאות, וגיבוב
            (hash) של הסיסמה — לעולם לא הסיסמה עצמה.
          </li>
          <li>
            <strong>לקוחות המשרד:</strong> פרטי התקשרות ומזהים שהמשרד מזין, העדפות
            תזכורת והסכמה לקבלתן.
          </li>
          <li>
            <strong>תיקים:</strong> כותרת, תחום, מספר תיק, ערכאה, צד שכנגד, מועדים,
            משימות, הערות פנימיות ומסמכים שהועלו.
          </li>
          <li>
            <strong>חיוב:</strong> רישומי זמן, חיובים, חשבוניות, תשלומים ומספרי אסמכתא
            מספק הסליקה. <strong>פרטי כרטיס אשראי אינם עוברים דרך המערכת ואינם
            נשמרים בה</strong> — הסליקה מתבצעת בעמוד המאורח של הספק.
          </li>
          <li>
            <strong>יומן פעילות:</strong> מי ביצע איזו פעולה ומתי, לצורכי ביקורת.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">3. ספקי משנה</h2>
        <p>
          המידע מעובד אצל ספקי התשתית הבאים. לכל אחד מהם נמסר רק המידע הדרוש
          לתפקידו:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-2 font-medium">ספק</th>
                <th className="py-2 font-medium">תפקיד</th>
                <th className="py-2 font-medium">מיקום</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b">
              <tr>
                <td className="py-2">Vercel</td>
                <td className="py-2">אירוח האפליקציה ואחסון קבצים</td>
                <td className="py-2">ארה״ב / אירופה</td>
              </tr>
              <tr>
                <td className="py-2">Neon</td>
                <td className="py-2">בסיס הנתונים</td>
                <td className="py-2">האיחוד האירופי (פרנקפורט)</td>
              </tr>
              <tr>
                <td className="py-2">Google</td>
                <td className="py-2">התחברות (OAuth) — אימות זהות בלבד</td>
                <td className="py-2">ארה״ב</td>
              </tr>
              <tr>
                <td className="py-2">Anthropic</td>
                <td className="py-2">עוזר ה-AI — רק אם המשרד הפעיל אותו</td>
                <td className="py-2">ארה״ב</td>
              </tr>
              <tr>
                <td className="py-2">Green API / Twilio / Resend</td>
                <td className="py-2">שליחת תזכורות ב-WhatsApp / SMS / אימייל</td>
                <td className="py-2">בהתאם לספק</td>
              </tr>
              <tr>
                <td className="py-2">Grow (משולם) / Cardcom</td>
                <td className="py-2">סליקת תשלומי לקוחות</td>
                <td className="py-2">ישראל</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">4. עוזר ה-AI — גילוי מפורש</h2>
        <p>
          עוזר ה-AI <strong>כבוי כברירת מחדל</strong> וניתן להפעלה רק ביוזמת המשרד.
          כשהוא פעיל, ורק כאשר משתמש/ת מפעיל/ה אותו במפורש, נשלחים ל-API של{" "}
          <span dir="ltr">Anthropic</span>:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>בסיכום תיק — כותרת התיק, שמות הצדדים, הערכאה, מועדי דיונים ותאריכי יעד, ועד שמונה הערות התיק האחרונות כלשונן.</li>
          <li>בניסוח מסמך — ההנחיה שהוקלדה, ופרטי התיק אם נבחר תיק.</li>
        </ul>
        <p>
          מדובר בחומר שעשוי להיות חסוי (חיסיון עו״ד–לקוח). על המשרד לוודא שהשימוש
          תואם את חובותיו המקצועיות, ולשקול הסדרת הסכם עיבוד נתונים ישירות מול
          ספק ה-AI. משרד שאינו מעוניין בכך פשוט משאיר את המודול כבוי — שאר
          המערכת פועלת במלואה בלעדיו.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">5. פורטל הלקוחות</h2>
        <p>
          הגישה לפורטל היא באמצעות קישור אישי חד-פעמי שהמשרד מנפיק. הקישור נשמר
          אצלנו כגיבוב בלבד, פג תוקף, וניתן לביטול מיידי. הפורטל חושף ללקוח אך ורק
          את תיקיו, מועדיו, חשבוניותיו, ומסמכים שהמשרד סימן במפורש כמשותפים. הערות
          פנימיות, משימות ורישומי זמן אינם נחשפים לעולם.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">6. אבטחה</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>תעבורה מוצפנת ב-HTTPS; הנתונים מוצפנים במנוחה אצל ספק בסיס הנתונים.</li>
          <li>סיסמאות נשמרות כ-bcrypt; טוקני גישה נשמרים כ-SHA-256 בלבד.</li>
          <li>הפרדה מלאה בין משרדים: כל שאילתה מסוננת לפי מזהה המשרד.</li>
          <li>הרשאות לפי תפקיד והיקף ראות, הניתנות להגדרה בכל משרד.</li>
          <li>קבצים מוגשים דרך המערכת בלבד; כתובת האחסון אינה נחשפת.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">7. שמירה ומחיקה</h2>
        <p>
          המידע נשמר כל עוד ההתקשרות בתוקף. חשבוניות ומסמכי חיוב נשמרים בהתאם
          לחובות שמירת רשומות בדין הישראלי, ואינם נמחקים אלא מבוטלים. עם סיום
          ההתקשרות ניתן לקבל ייצוא של נתוני המשרד, ולאחריו הנתונים נמחקים לפי
          בקשת המשרד.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">8. זכויות</h2>
        <p>
          לפי חוק הגנת הפרטיות, התשמ״א–1981, לאדם זכות לעיין במידע עליו ולבקש את
          תיקונו. מאחר שבעל המאגר הוא המשרד, פניות של לקוחות קצה יש להפנות למשרד
          המטפל; המפעילה תסייע למשרד לממש אותן.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">9. שינויים</h2>
        <p>
          נודיע על שינוי מהותי במדיניות זו למשרדים הלקוחות מראש. המשך שימוש לאחר
          מועד הכניסה לתוקף מהווה הסכמה לנוסח המעודכן.
        </p>
      </section>

      <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
        <strong>הערה:</strong> מסמך זה מתאר את התנהגות המערכת בפועל ומשמש בסיס
        לניסוח. יש להעבירו לבדיקת עורך/ת דין ולהשלים את פרטי המפעילה לפני פרסום
        כמסמך מחייב.
      </p>
    </div>
  );
}
