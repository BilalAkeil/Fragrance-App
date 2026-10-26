import { describe, expect, it } from "vitest";
import { listingFilterFromParams, matchesFilter } from "./filters";
import { sampleListings, sampleSellers } from "./sample-data";

const sellerFor = (id: string) => sampleSellers.find((s) => s.id === id);
const matching = (filter: Parameters<typeof matchesFilter>[2]) =>
  sampleListings.filter((l) => matchesFilter(l, sellerFor(l.sellerId), filter)).map((l) => l.id);

describe("listingFilterFromParams", () => {
  it("reads every filter", () => {
    expect(
      listingFilterFromParams({
        q: " oud ",
        kind: "partial",
        condition: "used",
        min: "10",
        max: "£150.50",
        certified: "1",
      }),
    ).toEqual({
      query: "oud",
      kind: "partial",
      condition: "used",
      minPence: 1000,
      maxPence: 15050,
      certifiedOnly: true,
    });
  });

  it("ignores values it doesn't recognise", () => {
    expect(listingFilterFromParams({ kind: "tester", condition: "mint", min: "cheap", certified: "yes" })).toEqual(
      {},
    );
  });
});

describe("matchesFilter", () => {
  it("matches everything with no filter", () => {
    expect(matching({})).toHaveLength(sampleListings.length);
  });

  it("filters by kind and condition", () => {
    expect(matching({ kind: "decant" })).toEqual(["l3", "l5"]);
    expect(matching({ condition: "used" })).toEqual(["l2", "l4"]);
  });

  it("filters by price range", () => {
    expect(matching({ minPence: 5000, maxPence: 10000 })).toEqual(["l1", "l4"]);
  });

  it("keeps only certified sellers", () => {
    expect(matching({ certifiedOnly: true })).toEqual(["l1", "l2"]);
  });

  it("searches house, name and notes", () => {
    expect(matching({ query: "vanilla" })).toEqual(["l4", "l5"]);
    expect(matching({ query: "creed" })).toEqual(["l3"]);
  });
});
