import { describe, expect, it } from "vitest";
import {
  catalogueNameMatches,
  fragranceDisplayName,
  guidePriceError,
  guidePricePerMl,
  guideValuePence,
  normaliseName,
  type FragranceSize,
} from "./catalogue";

const size = (sizeMl: number, guidePricePence: number, listingCount?: number): FragranceSize => ({
  id: `z${sizeMl}`,
  fragranceId: "f1",
  sizeMl,
  guidePricePence,
  listingCount,
});

const sizes = [size(50, 9000), size(100, 15000)];

describe("normaliseName", () => {
  it("drops case, accents and punctuation", () => {
    expect(normaliseName("  Hermès Terre d'Hermès ")).toBe("hermes terre d hermes");
    expect(normaliseName("L'Homme-Idéal")).toBe("l homme ideal");
  });
});

describe("fragranceDisplayName", () => {
  it("adds the concentration, except for other", () => {
    expect(fragranceDisplayName({ name: "Sauvage", concentration: "edp" })).toBe("Sauvage Eau de Parfum");
    expect(fragranceDisplayName({ name: "Aventus", concentration: "other" })).toBe("Aventus");
  });
});

describe("catalogueNameMatches", () => {
  it("matches word starts in the name or an alias", () => {
    expect(catalogueNameMatches("sauv", "Sauvage")).toBe(true);
    expect(catalogueNameMatches("terre herm", "Terre d'Hermès")).toBe(true);
    expect(catalogueNameMatches("bdc", "Bleu de Chanel", ["BDC"])).toBe(true);
    expect(catalogueNameMatches("vage", "Sauvage")).toBe(false);
    expect(catalogueNameMatches("  ", "Sauvage")).toBe(false);
  });
});

describe("guidePriceError", () => {
  it("accepts whole pence above zero", () => {
    expect(guidePriceError(1)).toBeUndefined();
    expect(guidePriceError(0)).toBeDefined();
    expect(guidePriceError(-100)).toBeDefined();
    expect(guidePriceError(10.5)).toBeDefined();
  });
});

describe("guidePricePerMl", () => {
  it("uses the size with the most listings", () => {
    expect(guidePricePerMl([size(50, 9000, 3), size(100, 15000, 1)])).toBe(180);
  });

  it("breaks ties with the larger size", () => {
    expect(guidePricePerMl(sizes)).toBe(150);
  });

  it("is undefined with no priced sizes", () => {
    expect(guidePricePerMl([])).toBeUndefined();
  });
});

describe("guideValuePence", () => {
  it("full bottle: that size's guide price (AC-4.1)", () => {
    expect(guideValuePence({ kind: "full", sizeMl: 50, fragranceId: "f1" }, sizes)).toBe(9000);
  });

  it("partial: the size's price times its fill, to the nearest penny (AC-4.2, R-3)", () => {
    expect(guideValuePence({ kind: "partial", sizeMl: 100, fillPercent: 80, fragranceId: "f1" }, sizes)).toBe(12000);
    expect(guideValuePence({ kind: "partial", sizeMl: 50, fillPercent: 33, fragranceId: "f1" }, [size(50, 8999)])).toBe(
      2970,
    );
  });

  it("decant: price per ml times its ml, to the nearest penny (AC-4.3, R-4)", () => {
    expect(guideValuePence({ kind: "decant", sizeMl: 10, fragranceId: "f1" }, sizes)).toBe(1500);
    expect(guideValuePence({ kind: "decant", sizeMl: 5, fragranceId: "f1" }, [size(75, 10000)])).toBe(667);
  });

  it("has no value when unmatched or unpriced (AC-4.4)", () => {
    expect(guideValuePence({ kind: "full", sizeMl: 50 }, sizes)).toBeUndefined();
    expect(guideValuePence({ kind: "full", sizeMl: 75, fragranceId: "f1" }, sizes)).toBeUndefined();
    expect(guideValuePence({ kind: "decant", sizeMl: 10, fragranceId: "f1" }, [])).toBeUndefined();
    expect(guideValuePence({ kind: "full", sizeMl: 50, fragranceId: "f2" }, sizes)).toBeUndefined();
  });
});
