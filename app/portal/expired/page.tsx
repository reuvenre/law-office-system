import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function PortalExpiredPage() {
  return (
    <Card>
      <CardContent className="space-y-3 py-12 text-center">
        <h1 className="font-heading text-lg font-semibold">הקישור אינו בתוקף</h1>
        <p className="text-sm text-muted-foreground">
          קישור הכניסה שברשותכם פג, בוטל או שאינו תקין.
        </p>
        <p className="text-sm text-muted-foreground">
          לקבלת קישור חדש, פנו למשרד עורכי הדין המטפל.
        </p>
      </CardContent>
    </Card>
  );
}
