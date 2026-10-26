import { describe, expect, it } from "vitest";
import { parseNotes, parsePounds, validateListingInput, type ListingInput } from "./listing-input";

const base: ListingInput = {
  house: "Dior",
  name: "Sauvage",
  kind: "full",
  sizeMl: 100,
  condition: "used",
  batchCode: "3J01",
  pricePence: 9500,
  postagePence: 395,
  notes: [],
};

describe("parsePounds", () => {
  it("reads pounds and pence", () => {
    expect(parsePounds("12.5")).toBe(1250);
    expect(parsePounds("£3.95")).toBe(395);
    expect(parsePounds("0")).toBe(0);
  });

  it("rejects anything else", () => {
    expect(parsePounds("abc")).toBeNaN();
    expect(parsePounds("1.234")).toBeNaN();
    expect(parsePounds("")).toBeNaN();
  });
});

describe("parseNotes", () => {
  it("splits on commas", () => {
    expect(parseNotes(" Oud, ,Rose ")).toEqual(["Oud", "Rose"]);
  });
});

describe("validateListingInput", () => {
  it("accepts a complete full bottle", () => {
    expect(validateListingInput(base)).toEqual([]);
  });

  it("needs a fill level for partials", () => {
    expect(validateListingInput({ ...base, kind: "partial" })).toContain(
      "Add how full the bottle is, from 1 to 100%.",
    );
  });

  it("applies decant rules", () => {
    expect(validateListingInput({ ...base, kind: "decant", sizeMl: 3 })).toEqual([
      "Decants must be at least 5ml.",
      "Choose the source bottle this decant came from.",
    ]);
  });

  it("rejects a missing price", () => {
    expect(validateListingInput({ ...base, pricePence: NaN })).toContain("Add a price.");
  });
});
