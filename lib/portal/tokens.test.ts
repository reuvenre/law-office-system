import { describe, it, expect, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

/**
 * Portal-token verification, tested against a stubbed database.
 *
 * The security-relevant property is not "expired tokens are rejected" in the
 * abstract — it is that expiry and revocation are enforced *inside the lookup
 * query* rather than checked afterwards, where a later refactor could drop the
 * check while the tests still passed. So the test captures the WHERE condition
 * the module builds and reads it.
 */

const captured: { where: SQL | undefined } = { where: undefined };

vi.mock("@/lib/db", () => {
  const builder = {
    select: () => builder,
    from: () => builder,
    innerJoin: () => builder,
    where: (condition: SQL | undefined) => {
      captured.where = condition;
      return builder;
    },
    limit: async () => [],
    update: () => builder,
    set: () => builder,
    insert: () => builder,
    values: async () => undefined,
  };
  return { db: builder };
});

const { verifyPortalToken, createPortalToken, DEFAULT_TTL_DAYS } = await import(
  "./tokens"
);

const dialect = new PgDialect();
const renderWhere = () => dialect.sqlToQuery(captured.where!).sql;

beforeEach(() => {
  captured.where = undefined;
});

describe("verifyPortalToken", () => {
  it("rejects absent or implausibly short tokens without querying at all", async () => {
    for (const bad of [undefined, null, "", "short"]) {
      expect(await verifyPortalToken(bad)).toBeNull();
    }
    expect(captured.where).toBeUndefined();
  });

  it("enforces the hash match, revocation and expiry in one query", async () => {
    await verifyPortalToken("a".repeat(43));
    const sql = renderWhere();
    expect(sql).toContain('"token_hash"');
    expect(sql).toContain('"revoked_at" is null');
    expect(sql).toContain('"expires_at" >');
  });

  it("looks the token up by hash — the secret itself is never compared", async () => {
    const raw = "b".repeat(43);
    await verifyPortalToken(raw);
    const { params } = dialect.sqlToQuery(captured.where!);
    expect(params).not.toContain(raw);
    // SHA-256 hex.
    expect(params.some((p) => typeof p === "string" && /^[0-9a-f]{64}$/.test(p))).toBe(
      true
    );
  });

  it("returns null when no row matches", async () => {
    expect(await verifyPortalToken("c".repeat(43))).toBeNull();
  });
});

describe("createPortalToken", () => {
  it("issues at least 256 bits of entropy", async () => {
    const { raw } = await createPortalToken({ clientId: "c1", firmId: "f1" });
    // 32 random bytes, base64url — 43 chars, no padding.
    expect(raw.length).toBeGreaterThanOrEqual(43);
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("issues distinct tokens", async () => {
    const a = await createPortalToken({ clientId: "c1", firmId: "f1" });
    const b = await createPortalToken({ clientId: "c1", firmId: "f1" });
    expect(a.raw).not.toBe(b.raw);
  });

  it("honours the default TTL", async () => {
    const { expiresAt } = await createPortalToken({ clientId: "c1", firmId: "f1" });
    const days = (expiresAt.getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(DEFAULT_TTL_DAYS - 1);
    expect(days).toBeLessThanOrEqual(DEFAULT_TTL_DAYS);
  });
});
