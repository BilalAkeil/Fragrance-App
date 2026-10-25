import { describe, expect, it } from "vitest";
import { buyerProtectionFee, cardProcessingFee, checkoutBreakdown, formatGBP } from "./fees";

describe("fees", () => {
  it("charges 4% + 50p buyer protection", () => {
    expect(buyerProtectionFee(10000)).toBe(450);
  });

  it("charges Stripe standard and premium UK card rates", () => {
    expect(cardProcessingFee(10000)).toBe(170);
    expect(cardProcessingFee(10000, "premium")).toBe(300);
  });

  it("pays the seller the full item price and postage", () => {
    const b = checkoutBreakdown(10000, 395);
    expect(b.buyerTotalPence).toBe(10000 + 395 + 450);
    expect(b.sellerReceivesPence).toBe(10395);
    expect(b.cardFeePence).toBe(Math.round(10845 * 0.015) + 20);
    expect(b.platformKeepsPence).toBe(450 - b.cardFeePence);
  });

  it("formats pounds", () => {
    expect(formatGBP(10450)).toBe("£104.50");
  });
});
