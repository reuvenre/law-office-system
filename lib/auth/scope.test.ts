import { describe, it, expect, beforeAll } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

/**
 * The tenant boundary, tested without a database.
 *
 * These builders return SQL conditions, so the property that actually matters —
 * "the firm predicate is present on every branch, including the see-everything
 * one" — can be asserted by rendering the condition and reading it. That is the
 * regression this file exists to catch: the see-everything branch previously
 * returned no firm filter at all, which let an admin read other firms' data.
 */

const dialect = new PgDialect();

function render(condition: SQL | undefined): { sql: string; params: unknown[] } {
  if (!condition) throw new Error("scope returned undefined — never expected here");
  const query = dialect.sqlToQuery(condition);
  return { sql: query.sql, params: query.params };
}

const FIRM = "11111111-1111-1111-1111-111111111111";
const OTHER_USER = "22222222-2222-2222-2222-222222222222";

// scope.ts builds subqueries through the shared db proxy, which parses (but
// does not open) a connection string on first use.
beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/db";
});

// Imported after the env guard above so the proxy can initialise.
const {
  caseScope,
  clientScope,
  taskScope,
  documentScope,
  invoiceScope,
  withScope,
} = await import("./scope");

const BUILDERS = [
  { name: "caseScope", fn: caseScope, table: "cases" },
  { name: "clientScope", fn: clientScope, table: "clients" },
  { name: "taskScope", fn: taskScope, table: "tasks" },
  { name: "documentScope", fn: documentScope, table: "documents" },
  { name: "invoiceScope", fn: invoiceScope, table: "invoices" },
] as const;

describe("every scope filters by firm", () => {
  for (const { name, fn, table } of BUILDERS) {
    it(`${name} filters ${table}.firm_id for a restricted viewer`, () => {
      const { sql, params } = render(fn({ firmId: FIRM, allowedIds: [OTHER_USER] }));
      expect(sql).toContain(`"${table}"."firm_id"`);
      expect(params).toContain(FIRM);
    });

    // The regression that motivated this file: an admin (allowedIds === null)
    // sees the whole firm — and must still see ONLY their own firm.
    it(`${name} still filters ${table}.firm_id for an admin / 'all' scope`, () => {
      const { sql, params } = render(fn({ firmId: FIRM, allowedIds: null }));
      expect(sql).toContain(`"${table}"."firm_id"`);
      expect(params).toContain(FIRM);
    });

    it(`${name} matches nothing for an empty allow-list`, () => {
      // Must be a false predicate, never `undefined` — an undefined WHERE
      // degrades into an unfiltered query that returns the entire table.
      const condition = fn({ firmId: FIRM, allowedIds: [] });
      expect(condition).toBeDefined();
      expect(render(condition).sql.toLowerCase()).toContain("false");
    });
  }
});

describe("withScope", () => {
  it("ANDs the base filter with the scope", () => {
    const scope = caseScope({ firmId: FIRM, allowedIds: null });
    const { sql } = render(withScope(scope, scope));
    expect(sql).toContain(" and ");
  });

  it("returns whichever side is present when the other is undefined", () => {
    const scope = caseScope({ firmId: FIRM, allowedIds: null });
    expect(withScope(undefined, scope)).toBe(scope);
    expect(withScope(scope, undefined)).toBe(scope);
  });

  it("is undefined only when both sides are — an unscoped query must be explicit", () => {
    expect(withScope(undefined, undefined)).toBeUndefined();
  });
});
