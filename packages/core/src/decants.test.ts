import { describe, expect, it } from "vitest";
import { decantLabel, validateDecantListing } from "./decants";
import { sampleListings, sampleSourceBottles } from "./sample-data";

const decant = sampleListings.find((l) => l.kind === "decant")!;
const bottle = sampleSourceBottles[0];

describe("validateDecantListing", () => {
  it("accepts a valid decant", () => {
    expect(validateDecantListing(decant, bottle, 0)).toEqual([]);
  });

  it("rejects decants under 5ml", () => {
    expect(validateDecantListing({ ...decant, sizeMl: 3 }, bottle, 0)).toContain(
      "Decants must be at least 5ml.",
    );
  });

  it("requires a source bottle", () => {
    expect(validateDecantListing(decant, undefined, 0)).toContain(
      "Decants must link to a registered source bottle.",
    );
  });

  it("requires a checked video", () => {
    const unchecked = { ...bottle, verifiedAt: undefined };
    expect(validateDecantListing(decant, unchecked, 0)).toContain(
      "The source bottle video has not been checked yet.",
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
});
