import { cn } from "@/lib/utils";
import {
  CASE_STATUSES,
  CASE_STATUS_VARIANT,
  PRIORITIES,
  HEARING_STATUSES,
  TASK_STATUSES,
  type CaseStatus,
  type Priority,
  type HearingStatus,
  type TaskStatus,
} from "@/lib/constants";

export type Tone =
  | "neutral"
  | "info"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-primary/10 text-primary",
  gold: "bg-gold/15 text-gold",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <StatusBadge tone={CASE_STATUS_VARIANT[status]}>{CASE_STATUSES[status]}</StatusBadge>;
}

const PRIORITY_TONE: Record<Priority, Tone> = {
  low: "muted",
  normal: "neutral",
  high: "warning",
  critical: "danger",
};
export function PriorityBadge({ priority }: { priority: Priority }) {
  return <StatusBadge tone={PRIORITY_TONE[priority]}>{PRIORITIES[priority]}</StatusBadge>;
}

const HEARING_TONE: Record<HearingStatus, Tone> = {
  scheduled: "info",
  completed: "success",
  postponed: "warning",
  cancelled: "muted",
};
export function HearingStatusBadge({ status }: { status: HearingStatus }) {
  return <StatusBadge tone={HEARING_TONE[status]}>{HEARING_STATUSES[status]}</StatusBadge>;
}

const TASK_TONE: Record<TaskStatus, Tone> = {
  open: "info",
  in_progress: "warning",
  done: "success",
};
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <StatusBadge tone={TASK_TONE[status]}>{TASK_STATUSES[status]}</StatusBadge>;
}
