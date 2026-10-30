import { describe, expect, it } from "vitest";
import {
  batchCodeLabel,
  canEditListing,
  parseNotes,
  parsePounds,
  validateListingInput,
  type ListingInput,
} from "./listing-input";

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
    expect(validateListingInput(base, 1)).toEqual([]);
  });

  it("refuses bottles Royal Mail won't carry (004 Q-6)", () => {
    expect(validateListingInput({ ...base, sizeMl: 150 }, 1)).toEqual([]);
    expect(validateListingInput({ ...base, sizeMl: 200 }, 1)).toEqual([
      "Royal Mail only takes perfume up to 150ml, so bigger bottles can't be listed yet.",
    ]);
  });

  it("accepts a listing with no batch code", () => {
    expect(validateListingInput({ ...base, batchCode: undefined }, 1)).toEqual([]);
  });

  it("needs a fill level for partials", () => {
    expect(validateListingInput({ ...base, kind: "partial" }, 1)).toContain(
      "Add how full the bottle is, from 1 to 100%.",
    );
  });

  it("only asks decants for the 5ml minimum, not a source bottle", () => {
    expect(validateListingInput({ ...base, kind: "decant", sizeMl: 3 }, 1)).toEqual([
      "Decants must be at least 5ml.",
    ]);
    expect(validateListingInput({ ...base, kind: "decant", sizeMl: 10 }, 1)).toEqual([]);
  });

  it("needs at least one photo", () => {
    expect(validateListingInput(base, 0)).toEqual(["Add at least one photo of the bottle."]);
  });

  it("rejects a missing price", () => {
    expect(validateListingInput({ ...base, pricePence: NaN }, 1)).toContain("Add a price.");
  });
});

describe("batchCodeLabel", () => {
  it("shows the code when there is one", () => {
    expect(batchCodeLabel("3J01")).toBe("Batch 3J01");
  });

  it("says when there isn't one", () => {
    expect(batchCodeLabel(undefined)).toBe("No batch code");
    expect(batchCodeLabel("  ")).toBe("No batch code");
  });
});

describe("canEditListing", () => {
  it("lets the owner edit an active listing", () => {
    expect(canEditListing("active", true)).toBe(true);
  });

  it("refuses other people and finished listings", () => {
    expect(canEditListing("active", false)).toBe(false);
    expect(canEditListing("sold", true)).toBe(false);
    expect(canEditListing("removed", true)).toBe(false);
  });
});
