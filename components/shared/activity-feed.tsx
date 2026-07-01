import { AuthorStamp } from "@/components/shared/author-stamp";

const ACTION_LABEL: Record<string, string> = {
  create: "יצירה",
  update: "עדכון",
  delete: "מחיקה",
  send_reminder: "שליחת תזכורת",
  drive_sync: "סנכרון דרייב",
};

const ENTITY_LABEL: Record<string, string> = {
  client: "לקוח",
  case: "תיק",
  document: "מסמך",
  hearing: "דיון",
  deadline: "מועד",
  task: "משימה",
  note: "הערה",
};

type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string | Date;
  actorName: string | null;
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">אין פעילות אחרונה</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm">
            {ACTION_LABEL[a.action] ?? a.action} ·{" "}
            <span className="text-muted-foreground">
              {ENTITY_LABEL[a.entityType] ?? a.entityType}
            </span>
          </span>
          <AuthorStamp name={a.actorName} at={a.createdAt} />
        </li>
      ))}
    </ul>
  );
}
