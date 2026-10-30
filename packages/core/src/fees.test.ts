import { describe, expect, it } from "vitest";
import { buyerProtectionFee, cardProcessingFee, checkoutBreakdown, formatGBP } from "./fees";

describe("fees", () => {
  it("charges 3% + 30p buyer protection", () => {
    expect(buyerProtectionFee(10000)).toBe(330);
  });

  it("charges Stripe standard and premium UK card rates", () => {
    expect(cardProcessingFee(10000)).toBe(170);
    expect(cardProcessingFee(10000, "premium")).toBe(300);
  });

  it("pays the seller the full item price, and nothing for postage (R-2)", () => {
    const b = checkoutBreakdown(10000, 395);
    expect(b.buyerTotalPence).toBe(10000 + 395 + 330);
    expect(b.sellerReceivesPence).toBe(10000);
    expect(b.cardFeePence).toBe(Math.round(10725 * 0.015) + 20);
    expect(b.platformKeepsPence).toBe(330 - b.cardFeePence);
  });

  it("formats pounds", () => {
    expect(formatGBP(10450)).toBe("£104.50");
  });
});
