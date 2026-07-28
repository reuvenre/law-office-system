import { LEGAL_LAST_UPDATED, OPERATOR } from "@/lib/legal/operator";

export const metadata = {
  title: "תנאי שימוש",
  description: "תנאי השימוש במערכת ניהול משרד עורכי הדין.",
};

export default function TermsPage() {
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl text-primary">תנאי שימוש</h1>
        <p className="text-xs text-muted-foreground">
          עודכן לאחרונה: {LEGAL_LAST_UPDATED}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">1. הצדדים</h2>
        <p>
          תנאים אלה חלים על השימוש במערכת ניהול משרד עורכי הדין המסופקת על ידי{" "}
          {OPERATOR.legalName} (&ldquo;המפעילה&rdquo;) למשרד המנוי
          (&ldquo;הלקוח&rdquo;). השימוש במערכת מהווה הסכמה להם.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">2. השירות</h2>
        <p>
          המערכת היא כלי ניהול משרדי: לקוחות, תיקים, יומן, משימות, מסמכים, חיוב
          וגבייה, פורטל לקוחות ותזכורות. היקף המודולים ומספר המשתמשים נקבעים לפי
          התוכנית שנרכשה.
        </p>
        <p className="rounded-md bg-muted/50 p-3">
          <strong>המערכת אינה מספקת ייעוץ משפטי.</strong> כל תוכן שנוצר בה — לרבות
          פלט של עוזר ה-AI — הוא טיוטה בלבד, והאחריות המקצועית לבדיקתו ולשימוש בו
          היא של עורך/ת הדין.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">3. חשבונות ואבטחה</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>הלקוח אחראי לניהול משתמשיו, להרשאותיהם ולשמירת סודיות פרטי הכניסה.</li>
          <li>אין לשתף חשבון בין מספר אנשים — מכסת המשתמשים נמדדת לפי משתמשים פעילים.</li>
          <li>יש להודיע למפעילה מיד על חשד לשימוש לרעה בחשבון.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">4. נתוני הלקוח</h2>
        <p>
          כל הנתונים שהלקוח מזין נותרים בבעלותו. המפעילה מעבדת אותם אך ורק לצורך
          אספקת השירות, ואינה עושה בהם שימוש לכל מטרה אחרת. הלקוח אחראי לחוקיות
          המידע שהוא מזין ולקבלת ההסכמות הנדרשות מלקוחותיו — לרבות הסכמה לקבלת
          תזכורות ב-WhatsApp/SMS/אימייל, הנרשמת במערכת לכל לקוח בנפרד.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">5. עוזר ה-AI</h2>
        <p>
          המודול כבוי כברירת מחדל. הפעלתו היא החלטה של הלקוח, ומשמעותה שליחת פרטי
          תיק — שעשויים להיות חסויים — לשירות של צד שלישי, כמפורט במדיניות
          הפרטיות. הלקוח מאשר שבחן את ההשלכות המקצועיות של כך.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">6. תשלומים</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>דמי המנוי, מחזור החיוב ותנאי התשלום נקבעים בהזמנה החתומה.</li>
          <li>שינוי תוכנית או מודולים מתבצע על ידי המפעילה לפי בקשת הלקוח.</li>
          <li>
            סליקת תשלומי לקוחות הקצה מתבצעת מול חשבון הסולק של הלקוח; המפעילה אינה
            צד לעסקאות אלה ואינה מחזיקה בכספים.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">7. זמינות ותמיכה</h2>
        <p>
          המפעילה תפעל לזמינות רציפה של השירות, אך אינה מתחייבת לפעילות ללא הפרעה.
          תחזוקה מתוכננת תבוצע ככל האפשר בשעות שאינן שעות עבודה. תמיכה:{" "}
          <a href={`mailto:${OPERATOR.supportEmail}`} dir="ltr" className="underline">
            {OPERATOR.supportEmail}
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">8. סיום התקשרות</h2>
        <p>
          כל צד רשאי לסיים את ההתקשרות בהודעה מראש כמוסכם בהזמנה. עם הסיום יקבל
          הלקוח ייצוא של נתוניו, ולאחר מכן הם יימחקו — למעט רשומות שחובה לשמור על
          פי דין.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">9. אחריות</h2>
        <p>
          השירות מסופק כמות שהוא. אחריות המפעילה, ככל שתחול, לא תעלה על סכום דמי
          המנוי ששולמו בפועל בשנים-עשר החודשים שקדמו לאירוע. אין באמור כדי לגרוע
          מאחריות שלא ניתן להגבילה על פי דין.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg">10. דין וסמכות שיפוט</h2>
        <p>
          על תנאים אלה יחולו דיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה לבתי
          המשפט המוסמכים במחוז תל אביב.
        </p>
      </section>

      <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
        <strong>הערה:</strong> מסמך זה הוא בסיס לניסוח ואינו תחליף לייעוץ משפטי.
        יש להתאימו להזמנה החתומה ולהעבירו לבדיקת עורך/ת דין לפני פרסום כמסמך
        מחייב.
      </p>
    </div>
  );
}
