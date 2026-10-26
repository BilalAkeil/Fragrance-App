import { describe, expect, it } from "vitest";
import { decantLabel, hasVerifiedSource, validateDecantListing } from "./decants";
import { sampleListings, sampleSourceBottles } from "./sample-data";

const decant = sampleListings.find((l) => l.kind === "decant" && l.sourceBottleId)!;
const unlinked = sampleListings.find((l) => l.kind === "decant" && !l.sourceBottleId)!;
const bottle = sampleSourceBottles[0];

describe("validateDecantListing", () => {
  it("accepts a valid linked decant", () => {
    expect(validateDecantListing(decant, bottle, 0)).toEqual([]);
  });

  it("accepts a decant with no source bottle", () => {
    expect(validateDecantListing(unlinked, undefined, 0)).toEqual([]);
  });

  it("rejects decants under 5ml, linked or not", () => {
    expect(validateDecantListing({ ...decant, sizeMl: 3 }, bottle, 0)).toContain("Decants must be at least 5ml.");
    expect(validateDecantListing({ ...unlinked, sizeMl: 3 }, undefined, 0)).toContain(
      "Decants must be at least 5ml.",
    );
  });

  it("allows a bottle that hasn't been checked yet", () => {
    expect(validateDecantListing(decant, { ...bottle, verifiedAt: undefined }, 0)).toEqual([]);
  });

  it("rejects someone else's bottle", () => {
    expect(validateDecantListing(decant, { ...bottle, sellerId: "someone-else" }, 0)).toContain(
      "The source bottle belongs to a different seller.",
    );
  });

  it("stops decants once the bottle is used up", () => {
    expect(validateDecantListing(decant, bottle, 95)).toContain(
      "Only 5ml is left to decant from this 100ml bottle.",
    );
  });

  it("ignores full bottles", () => {
    expect(validateDecantListing(sampleListings[0], undefined, 0)).toEqual([]);
  });
});

describe("hasVerifiedSource", () => {
  it("is true for a decant linked to a checked bottle", () => {
    expect(hasVerifiedSource(decant, bottle)).toBe(true);
  });

  it("is false when the bottle hasn't been checked or isn't linked", () => {
    expect(hasVerifiedSource(decant, { ...bottle, verifiedAt: undefined })).toBe(false);
    expect(hasVerifiedSource(decant, undefined)).toBe(false);
    expect(hasVerifiedSource(unlinked, bottle)).toBe(false);
  });

  it("is false for full bottles", () => {
    expect(hasVerifiedSource(sampleListings[0], bottle)).toBe(false);
  });
});

describe("decantLabel", () => {
  it("includes batch code and date", () => {
    expect(decantLabel(decant, bottle, "2026-10-25")).toEqual([
      "Creed",
      "Aventus",
      "10ml decant",
      "Batch A4223K01",
      "Decanted 2026-10-25",
    ]);
  });

  it("leaves out the batch code when there isn't one", () => {
    expect(decantLabel(unlinked, undefined, "2026-10-25")).toEqual([
      "Parfums de Marly",
      "Layton",
      "10ml decant",
      "Decanted 2026-10-25",
    ]);
  });
});
