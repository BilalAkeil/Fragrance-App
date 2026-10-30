import { describe, expect, it } from "vitest";
import { sampleListings } from "@fragrance/core";
import { sampleMarketplace } from "./index";

describe("sampleMarketplace.listListings", () => {
  it("returns every active sample listing with no filter", async () => {
    const all = await sampleMarketplace.listListings();
    expect(all.map((l) => l.id)).toEqual(sampleListings.filter((l) => l.status === "active").map((l) => l.id));
  });

  it("keeps only certified sellers' listings when asked", async () => {
    const certified = await sampleMarketplace.listListings({ certifiedOnly: true });
    expect(certified.length).toBeGreaterThan(0);
    expect(certified.every((l) => l.sellerId === "s1")).toBe(true);
  });

  it("combines filters with the search", async () => {
    const results = await sampleMarketplace.listListings({ kind: "full", query: "sauvage" });
    expect(results.map((l) => l.id)).toEqual(["l1"]);
  });
});
