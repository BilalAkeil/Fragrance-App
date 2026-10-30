import { describe, expect, it } from "vitest";
import { parcelFor, royalMailPerfumeProblems } from "./shipping";

describe("parcelFor", () => {
  it("estimates a packed weight and size class", () => {
    expect(parcelFor([{ kind: "full", sizeMl: 100 }])).toEqual({ sizeClass: "small", weightGrams: 450 });
    expect(parcelFor([{ kind: "decant", sizeMl: 10 }])).toEqual({ sizeClass: "small", weightGrams: 145 });
    expect(parcelFor(Array(6).fill({ kind: "full", sizeMl: 150 })).sizeClass).toBe("medium");
  });
});

describe("royalMailPerfumeProblems", () => {
  it("allows up to 150ml per item and 8 per parcel (R-6)", () => {
    expect(royalMailPerfumeProblems([{ kind: "full", sizeMl: 150 }])).toEqual([]);
    expect(royalMailPerfumeProblems([{ kind: "full", sizeMl: 200 }])).toHaveLength(1);
    expect(royalMailPerfumeProblems(Array(9).fill({ kind: "decant", sizeMl: 5 }))).toHaveLength(1);
  });
});
