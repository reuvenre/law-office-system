import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { resolveResetToken } from "@/lib/auth/password-reset";

export const dynamic = "force-dynamic";
export const metadata = { title: "קביעת סיסמה חדשה", robots: { index: false } };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Check before rendering the form so a dead link says so immediately, rather
  // than after the visitor has typed a new password twice.
  const valid = await resolveResetToken(token);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl text-primary">
          קביעת סיסמה חדשה
        </CardTitle>
        <CardDescription>
          {valid ? "בחרו סיסמה באורך 8 תווים לפחות" : "הקישור אינו בתוקף"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              הקישור פג תוקף (הוא תקף לשעה אחת) או שכבר נעשה בו שימוש.
            </p>
            <Link href="/forgot-password" className="text-sm underline">
              שליחת קישור חדש
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
