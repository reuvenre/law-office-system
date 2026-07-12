"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  /** ISO timestamp */
  at: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "hearing" | "deadline";
  hasTime: boolean;
};

const JLM = "Asia/Jerusalem";
const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/** YYYY-MM-DD in the Israel timezone — stable key for grouping events by day. */
function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JLM,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
    timeZone: JLM,
  }).format(d);
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: JLM,
  }).format(new Date(iso));
}

export function OfficeCalendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1, 12)
  );
  const [selected, setSelected] = useState(() => dayKey(today));

  // Group events by day key for quick lookup.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const k = dayKey(new Date(e.at));
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    Array.from(map.values()).forEach((arr) =>
      arr.sort((a, b) => a.at.localeCompare(b.at))
    );
    return map;
  }, [events]);

  // Build a fixed 6-week (42-cell) grid starting on the Sunday on/before the 1st.
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1, 12).getDay(); // 0=Sun
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(year, month, 1 - firstDow + i, 12);
      return d;
    });
  }, [cursor]);

  const todayKey = dayKey(today);
  const selectedEvents = byDay.get(selected) ?? [];
  const currentMonth = cursor.getMonth();

  return (
    <div className="space-y-4">
      {/* Header: navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* In RTL, "previous" points right */}
          <Button
            variant="outline"
            size="icon"
            aria-label="חודש קודם"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="חודש הבא"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1, 12));
              setSelected(dayKey(now));
            }}
          >
            היום
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{monthLabel(cursor)}</h2>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" /> דיון
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> מועד
        </span>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{w[0]}׳</span>
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {cells.map((d) => {
          const k = dayKey(d);
          const inMonth = d.getMonth() === currentMonth;
          const isToday = k === todayKey;
          const isSelected = k === selected;
          const dayEvents = byDay.get(k) ?? [];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSelected(k)}
              className={cn(
                "flex min-h-[64px] flex-col gap-1 bg-card p-1.5 text-start transition-colors sm:min-h-[96px]",
                !inMonth && "bg-muted/40 text-muted-foreground",
                isSelected && "ring-2 ring-inset ring-primary"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary font-bold text-primary-foreground"
                )}
                dir="ltr"
              >
                {d.getDate()}
              </span>

              {/* Desktop: event chips. Mobile: dots. */}
              <div className="hidden flex-col gap-0.5 sm:flex">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] leading-tight text-white",
                      e.kind === "hearing" ? "bg-primary" : "bg-amber-600"
                    )}
                    title={`${e.title} — ${e.subtitle}`}
                  >
                    {e.hasTime ? `${timeLabel(e.at)} ` : ""}
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} נוספים
                  </span>
                )}
              </div>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 sm:hidden">
                  {dayEvents.slice(0, 4).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        e.kind === "hearing" ? "bg-primary" : "bg-amber-600"
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected-day agenda */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">
          {new Intl.DateTimeFormat("he-IL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: JLM,
          }).format(new Date(`${selected}T12:00:00`))}
        </h3>
        {selectedEvents.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            אין אירועים ביום זה.
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedEvents.map((e) => (
              <li key={e.id}>
                <Link
                  href={e.href}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <span
                    className={cn(
                      "h-10 w-1 rounded-full",
                      e.kind === "hearing" ? "bg-primary" : "bg-amber-600"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.subtitle}
                    </p>
                  </div>
                  {e.hasTime && (
                    <span className="text-sm tabular-nums text-muted-foreground" dir="ltr">
                      {timeLabel(e.at)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
