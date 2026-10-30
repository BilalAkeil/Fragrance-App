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

describe("sampleMarketplace catalogue", () => {
  it("suggests houses as you type, by name or alias", async () => {
    expect((await sampleMarketplace.searchCatalogue("chr")).houses.map((h) => h.name)).toEqual(["Dior"]);
    expect((await sampleMarketplace.searchCatalogue("pdm")).houses.map((h) => h.name)).toEqual(["Parfums de Marly"]);
    expect(await sampleMarketplace.searchCatalogue("  ")).toEqual({ houses: [], fragrances: [] });
  });

  it("suggests a house's fragrances, all of them before anything is typed", async () => {
    const all = await sampleMarketplace.searchCatalogue("", "h1");
    expect(all.fragrances.map((f) => `${f.name} ${f.concentration}`)).toEqual(["Sauvage edp", "Sauvage edt"]);
    expect((await sampleMarketplace.searchCatalogue("jazz", "h4")).fragrances.map((f) => f.id)).toEqual(["f5"]);
    expect((await sampleMarketplace.searchCatalogue("jazz", "h1")).fragrances).toEqual([]);
  });

  it("filters browse by house", async () => {
    expect((await sampleMarketplace.listListings({ houseId: "h3" })).map((l) => l.id)).toEqual(["l3"]);
  });

  it("values listings from the catalogue", async () => {
    const byId = (id: string) => sampleListings.find((l) => l.id === id)!;
    // Full 100ml Sauvage EDP: that size's guide price.
    expect(await sampleMarketplace.getGuideValue(byId("l1"))).toBe(12000);
    // Partial 50ml Oud Wood at 80%.
    expect(await sampleMarketplace.getGuideValue(byId("l2"))).toBe(16000);
    // 10ml Aventus decant: no listings decide the common size, so the larger (100ml) sets the per-ml price.
    expect(await sampleMarketplace.getGuideValue(byId("l3"))).toBe(2900);
    // Unmatched.
    expect(await sampleMarketplace.getGuideValue(byId("l5"))).toBeUndefined();
  });
});
