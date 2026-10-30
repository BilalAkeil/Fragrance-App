import { describe, expect, it } from "vitest";
import { certificationProgress, certificationStatus } from "./certification";
import type { Seller } from "./types";

const seller = (overrides: Partial<Seller>): Seller => ({
  id: "x",
  displayName: "x",
  idVerified: true,
  reviewCount: 10,
  averageRating: 4.5,
  payoutsReady: true,
  ...overrides,
});

describe("certificationStatus", () => {
  it("needs a verified ID", () => {
    expect(certificationStatus(seller({ idVerified: false }))).toBe("unverified");
  });

  it("waits for enough reviews", () => {
    expect(certificationStatus(seller({ reviewCount: 4 }))).toBe("new_seller");
  });

  it("certifies at 4 stars and above", () => {
    expect(certificationStatus(seller({ averageRating: 4 }))).toBe("certified");
  });

  it("pauses below 4 stars", () => {
    expect(certificationStatus(seller({ averageRating: 3.9 }))).toBe("below_rating");
  });
});

describe("certificationProgress", () => {
  it("asks an unverified seller to verify", () => {
    expect(certificationProgress(seller({ idVerified: false }))).toMatchObject({
      status: "unverified",
      label: "Not verified",
      nextStep: "Verify your ID to start selling.",
    });
  });

  it("counts the reviews a new seller still needs (AC-5.2)", () => {
    expect(certificationProgress(seller({ reviewCount: 2 })).nextStep).toMatch(/^3 more reviews to become certified/);
    expect(certificationProgress(seller({ reviewCount: 4 })).nextStep).toMatch(/^1 more review to become certified/);
  });

  it("tells a certified seller how to keep the badge", () => {
    expect(certificationProgress(seller({})).status).toBe("certified");
    expect(certificationProgress(seller({})).nextStep).toMatch(/Keep your average at 4★/);
  });

  it("tells a paused seller how many 5★ reviews would restore the badge", () => {
    // 5 reviews averaging 3.6 total 18; two more 5★ make 28 from 7 = 4.0.
    const progress = certificationProgress(seller({ reviewCount: 5, averageRating: 3.6 }));
    expect(progress.status).toBe("below_rating");
    expect(progress.nextStep).toBe("Raise your average to 4★ to get your badge back. 2 more 5★ reviews would do it.");
  });

  it("needs at least one review to recover, even just under 4★", () => {
    expect(certificationProgress(seller({ reviewCount: 10, averageRating: 3.99 })).nextStep).toMatch(/1 more 5★ review would/);
  });
});
