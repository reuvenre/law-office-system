import { describe, it, expect } from "vitest";
import {
  VAT_RATE,
  round2,
  computeInvoiceTotals,
  feeFromMinutes,
  feeFromEntries,
  retainerOverage,
  buildRetainerCharges,
  paymentStatus,
  retainerFiresToday,
  lastDayOfMonth,
} from "./calc";

describe("round2", () => {
  it("rounds to two decimals", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.345)).toBe(2.35);
    expect(round2(10)).toBe(10);
  });
  it("avoids binary float drift", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe("computeInvoiceTotals", () => {
  it("adds 18% VAT by default", () => {
    expect(computeInvoiceTotals([1000])).toEqual({
      subtotal: 1000,
      vatAmount: 180,
      total: 1180,
    });
  });
  it("sums multiple amounts before VAT", () => {
    expect(computeInvoiceTotals([100, 250, 50])).toEqual({
      subtotal: 400,
      vatAmount: 72,
      total: 472,
    });
  });
  it("honours a custom VAT rate", () => {
    expect(computeInvoiceTotals([200], 17)).toEqual({
      subtotal: 200,
      vatAmount: 34,
      total: 234,
    });
  });
  it("handles an empty charge set", () => {
    expect(computeInvoiceTotals([])).toEqual({ subtotal: 0, vatAmount: 0, total: 0 });
  });
  it("VAT_RATE is 18", () => {
    expect(VAT_RATE).toBe(18);
  });
});

describe("feeFromMinutes / feeFromEntries", () => {
  it("computes fee for minutes at an hourly rate", () => {
    expect(feeFromMinutes(90, 400)).toBe(600); // 1.5h * 400
    expect(feeFromMinutes(60, 350)).toBe(350);
  });
  it("sums entries with numeric or string rates", () => {
    expect(
      feeFromEntries([
        { durationMin: 60, rate: 400 },
        { durationMin: 30, rate: "500" },
      ])
    ).toBe(650); // 400 + 250
  });
  it("is zero for no entries", () => {
    expect(feeFromEntries([])).toBe(0);
  });
});

describe("retainerOverage", () => {
  it("is zero when under the allotment", () => {
    expect(retainerOverage(8, 10, 300)).toEqual({ overageHours: 0, overageAmount: 0 });
  });
  it("bills only the hours beyond the allotment", () => {
    expect(retainerOverage(12.5, 10, 300)).toEqual({
      overageHours: 2.5,
      overageAmount: 750,
    });
  });
  it("is zero exactly at the allotment", () => {
    expect(retainerOverage(10, 10, 300)).toEqual({ overageHours: 0, overageAmount: 0 });
  });
});

describe("buildRetainerCharges", () => {
  const agreement = {
    id: "a1",
    firmId: "f1",
    clientId: "c1",
    retainerAmount: 5000,
    retainerHours: 10,
    overageRate: 300,
    hourlyRate: 400,
  };

  it("emits only the base retainer charge when within allotment", () => {
    const res = buildRetainerCharges(agreement, 8 * 60, "2026-07");
    expect(res.overageHours).toBe(0);
    expect(res.charges).toHaveLength(1);
    expect(res.charges[0]).toMatchObject({
      chargeType: "retainer",
      amount: "5000",
      vatRate: "18",
      clientId: "c1",
      firmId: "f1",
    });
  });

  it("adds an overage charge when hours exceed the allotment", () => {
    const res = buildRetainerCharges(agreement, 13 * 60, "2026-07");
    expect(res.overageHours).toBe(3);
    expect(res.charges).toHaveLength(2);
    expect(res.charges[1]).toMatchObject({ chargeType: "fee", amount: "900" }); // 3*300
  });

  it("falls back to hourlyRate when overageRate is missing", () => {
    const res = buildRetainerCharges(
      { ...agreement, overageRate: null },
      12 * 60,
      "2026-07"
    );
    expect(res.charges[1]).toMatchObject({ amount: "800" }); // 2 * 400
  });

  it("treats a null retainerAmount as 0", () => {
    const res = buildRetainerCharges(
      { ...agreement, retainerAmount: null },
      5 * 60,
      "2026-07"
    );
    expect(res.charges[0].amount).toBe("0");
  });
});

describe("paymentStatus", () => {
  it("is paid when total is met or exceeded", () => {
    expect(paymentStatus(1180, 1180)).toBe("paid");
    expect(paymentStatus(1200, 1180)).toBe("paid");
  });
  it("is partial when under the total", () => {
    expect(paymentStatus(500, 1180)).toBe("partially_paid");
  });
});

describe("lastDayOfMonth", () => {
  it("knows month lengths", () => {
    expect(lastDayOfMonth(2026, 2)).toBe(28); // Feb 2026, not a leap year
    expect(lastDayOfMonth(2024, 2)).toBe(29); // leap year
    expect(lastDayOfMonth(2026, 4)).toBe(30);
    expect(lastDayOfMonth(2026, 12)).toBe(31);
  });
});

describe("retainerFiresToday", () => {
  it("fires on the exact billing day", () => {
    expect(retainerFiresToday(15, 15, 31)).toBe(true);
    expect(retainerFiresToday(15, 14, 31)).toBe(false);
  });
  it("clamps a day-31 agreement to the last day of a short month", () => {
    // Billing day 31, but April only has 30 days → fires on the 30th.
    expect(retainerFiresToday(31, 30, 30)).toBe(true);
    // ...and not before.
    expect(retainerFiresToday(31, 29, 30)).toBe(false);
  });
  it("clamps a day-30 agreement in February", () => {
    expect(retainerFiresToday(30, 28, 28)).toBe(true);
  });
  it("does not double-fire: a valid mid-month day is unaffected by the clamp", () => {
    // Billing day 15 in April: only the 15th, never the 30th.
    expect(retainerFiresToday(15, 30, 30)).toBe(false);
  });
});
