import { describe, expect, it } from "vitest";
import { certificationStatus } from "./certification";
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
