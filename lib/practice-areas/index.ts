import type { PracticeArea } from "@/lib/constants";

export type FieldType = "text" | "number" | "date" | "checkbox";

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
};

/**
 * Practice-area-specific fields stored in cases.type_fields (spec appendix א').
 * Array fields (heirs, estate_assets) are deferred — represented as free text
 * in v1 if needed.
 */
export const PRACTICE_AREA_FIELDS: Record<PracticeArea, FieldConfig[]> = {
  civil_commercial: [
    { key: "claim_amount", label: "סכום התביעה", type: "number" },
    { key: "court_instance", label: "ערכאה", type: "text" },
    { key: "claim_type", label: "סוג התביעה", type: "text" },
    { key: "opposing_counsel", label: "ב״כ הצד שכנגד", type: "text" },
  ],
  real_estate: [
    { key: "gush", label: "גוש", type: "text" },
    { key: "helka", label: "חלקה", type: "text" },
    { key: "tat_helka", label: "תת-חלקה", type: "text" },
    { key: "property_address", label: "כתובת הנכס", type: "text" },
    { key: "transaction_type", label: "סוג עסקה", type: "text" },
    { key: "purchase_tax_status", label: "סטטוס מס רכישה", type: "text" },
    { key: "tabu_status", label: "סטטוס טאבו", type: "text" },
  ],
  power_of_attorney: [
    { key: "poa_type", label: "סוג ייפוי כוח", type: "text" },
    { key: "grantor", label: "מייפה הכוח", type: "text" },
    { key: "attorney_in_fact", label: "מיופה הכוח", type: "text" },
    { key: "scope", label: "היקף", type: "text" },
    { key: "valid_from", label: "בתוקף מ־", type: "date" },
    { key: "valid_until", label: "בתוקף עד", type: "date" },
    { key: "is_irrevocable", label: "בלתי חוזר", type: "checkbox" },
  ],
  wills_inheritance: [
    { key: "testator", label: "מצווה", type: "text" },
    { key: "will_type", label: "סוג צוואה", type: "text" },
    { key: "executor", label: "מנהל עיזבון", type: "text" },
    { key: "probate_status", label: "סטטוס צו ירושה / קיום צוואה", type: "text" },
  ],
  enforcement: [
    { key: "enforcement_file_number", label: "מספר תיק הוצל״פ", type: "text" },
    { key: "bureau", label: "לשכה", type: "text" },
    { key: "debtor", label: "חייב", type: "text" },
    { key: "creditor", label: "זוכה", type: "text" },
    { key: "debt_amount", label: "סכום החוב", type: "number" },
    { key: "case_role", label: "תפקיד בתיק", type: "text" },
    { key: "proceeding_stage", label: "שלב ההליך", type: "text" },
  ],
};

/** Build a type_fields object from raw form values keyed `tf_<key>`. */
export function collectTypeFields(
  practiceArea: PracticeArea,
  formData: FormData
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of PRACTICE_AREA_FIELDS[practiceArea]) {
    const raw = formData.get(`tf_${field.key}`);
    if (field.type === "checkbox") {
      result[field.key] = raw === "on";
    } else if (field.type === "number") {
      const n = raw ? Number(raw) : null;
      result[field.key] = Number.isFinite(n) ? n : null;
    } else {
      result[field.key] = (raw as string)?.trim() || "";
    }
  }
  return result;
}
