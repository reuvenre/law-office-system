import { describe, it, expect } from "vitest";
import { normalizePayload, growWebhookRef, cardcomWebhookRef } from "./webhook";

describe("growWebhookRef", () => {
  it("extracts the process reference", () => {
    expect(growWebhookRef({ processId: "p1", processToken: "t1" })).toEqual({
      processId: "p1",
      processToken: "t1",
    });
  });
  it("accepts the alternate spellings Meshulam uses", () => {
    expect(growWebhookRef({ processID: "p2", process_token: "t2" })).toEqual({
      processId: "p2",
      processToken: "t2",
    });
  });
  it("returns null when either half is missing — nothing to confirm against", () => {
    expect(growWebhookRef({ processId: "p" })).toBeNull();
    expect(growWebhookRef({ processToken: "t" })).toBeNull();
    expect(growWebhookRef({})).toBeNull();
  });
  it("ignores an attacker-supplied amount — only the reference is taken", () => {
    const ref = growWebhookRef({ processId: "p", processToken: "t", sum: 99999 });
    expect(ref).toEqual({ processId: "p", processToken: "t" });
    expect(ref).not.toHaveProperty("sum");
  });
});

describe("cardcomWebhookRef", () => {
  it("extracts the LowProfile id under its known spellings", () => {
    expect(cardcomWebhookRef({ LowProfileId: "lp1" })).toBe("lp1");
    expect(cardcomWebhookRef({ lowProfileId: "lp2" })).toBe("lp2");
    expect(cardcomWebhookRef({ LowProfileDealId: "lp3" })).toBe("lp3");
  });
  it("returns null when absent", () => {
    expect(cardcomWebhookRef({ ReturnValue: "inv-1", Amount: 500 })).toBeNull();
  });
});

describe("normalizePayload", () => {
  it("passes a generic body through unchanged", () => {
    expect(
      normalizePayload({
        invoiceId: "inv-1",
        amount: 1180,
        provider: "manual",
        providerTxnId: "tx-9",
      })
    ).toEqual({
      invoiceId: "inv-1",
      amount: 1180,
      provider: "manual",
      providerTxnId: "tx-9",
    });
  });

  it("maps a Grow/Meshulam payload (cField1 + sum + asmachta)", () => {
    expect(
      normalizePayload({ cField1: "inv-grow", sum: "250.50", asmachta: "77" })
    ).toEqual({
      invoiceId: "inv-grow",
      amount: 250.5,
      provider: "grow",
      providerTxnId: "77",
    });
  });

  it("maps a Cardcom payload (ReturnValue + Amount + TranzactionId)", () => {
    expect(
      normalizePayload({
        ReturnValue: "inv-cc",
        Amount: 900,
        TranzactionId: 12345,
      })
    ).toEqual({
      invoiceId: "inv-cc",
      amount: 900,
      provider: "cardcom",
      providerTxnId: "12345",
    });
  });

  it("yields an empty invoiceId when the provider sends none (request is rejected upstream)", () => {
    const out = normalizePayload({ amount: 100 });
    expect(out.invoiceId).toBe("");
    expect(out.provider).toBe("unknown");
  });

  it("coerces a non-numeric amount to 0 rather than NaN", () => {
    expect(normalizePayload({ invoiceId: "i", amount: "abc" }).amount).toBe(0);
  });

  it("never infers a transaction id when the provider omits one", () => {
    expect(normalizePayload({ cField1: "i", sum: 10 }).providerTxnId).toBeUndefined();
  });

  it("trims whitespace around ids", () => {
    expect(normalizePayload({ cField1: "  inv-x  ", sum: 5 }).invoiceId).toBe("inv-x");
  });

  it("an explicit provider field wins over inference", () => {
    expect(normalizePayload({ cField1: "i", sum: 1, provider: "bit" }).provider).toBe(
      "bit"
    );
  });
});
