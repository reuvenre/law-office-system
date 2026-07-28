"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { updateFirmPlanAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PLANS, MODULES, planFor, isModuleEnabled, type ModuleKey } from "@/lib/plans";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type Firm = { licensePlan: string; modules: Partial<Record<ModuleKey, boolean>> };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "שומר..." : "שמירת תוכנית"}
    </Button>
  );
}

function Seats({ firm, activeSeats }: { firm: Firm; activeSeats: number }) {
  const plan = planFor(firm.licensePlan);
  return (
    <p className="pt-2 text-sm" dir="ltr">
      {activeSeats}
      {plan.maxSeats != null ? ` / ${plan.maxSeats}` : " (ללא הגבלה)"}
    </p>
  );
}

/**
 * The plan is what the firm pays for, so only vendor staff may change it — a
 * customer admin sees the same information read-only. `canEdit` mirrors the
 * server-side gate in updateFirmPlanAction; it hides the controls, it is not
 * the check.
 */
export function FirmPlanForm({
  firm,
  activeSeats,
  canEdit,
}: {
  firm: Firm;
  activeSeats: number;
  canEdit: boolean;
}) {
  const plan = planFor(firm.licensePlan);

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>תוכנית</Label>
            <p className="pt-2 text-sm">
              {plan.label} — {plan.priceHint}
            </p>
          </div>
          <div className="space-y-1">
            <Label>משתמשים פעילים</Label>
            <Seats firm={firm} activeSeats={activeSeats} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>מודולים פעילים</Label>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {(Object.keys(MODULES) as ModuleKey[]).map((k) => (
              <li key={k} className="text-muted-foreground">
                {isModuleEnabled(firm, k) ? "✓" : "—"} {MODULES[k]}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          לשדרוג תוכנית או להוספת מודולים פנו ל-
          <a
            href="https://win-solutions.co.il"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            win-solutions.co.il
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      action={async (fd) => {
        const res = await updateFirmPlanAction(fd);
        if (res?.error) toast.error(res.error);
        else toast.success("התוכנית עודכנה");
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fp-plan">תוכנית</Label>
          <select
            id="fp-plan"
            name="licensePlan"
            defaultValue={firm.licensePlan}
            className={selectClass}
          >
            {Object.values(PLANS).map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} — {p.priceHint}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>משתמשים פעילים</Label>
          <Seats firm={firm} activeSeats={activeSeats} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>מודולים פעילים</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(MODULES) as ModuleKey[]).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`module_${k}`}
                defaultChecked={isModuleEnabled(firm, k)}
                className="h-4 w-4"
              />
              {MODULES[k]}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          המודולים מוגדרים לפי התוכנית; ניתן לעקוף ידנית פר-משרד. שינוי התוכנית
          אינו משנה אוטומטית את המודולים — סמנו לפי הצורך.
        </p>
      </div>

      <SaveButton />
    </form>
  );
}
