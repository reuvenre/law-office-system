import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-heading text-3xl font-bold text-primary">הדף לא נמצא</h1>
      <p className="text-muted-foreground">ייתכן שהכתובת שגויה או שהפריט נמחק.</p>
      <Button asChild>
        <Link href="/dashboard">חזרה לדשבורד</Link>
      </Button>
    </div>
  );
}
