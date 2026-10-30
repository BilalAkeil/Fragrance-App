import { describe, expect, it } from "vitest";
import { toFragrance, toFragranceSize, toListing, toSeller } from "./rows";

describe("row mapping", () => {
  it("maps a seller with its rating", () => {
    expect(
      toSeller(
        { id: "s1", display_name: "ScentShelf", id_verified: true },
        { seller_id: "s1", review_count: 7, average_rating: "4.29" },
      ),
    ).toEqual({ id: "s1", displayName: "ScentShelf", idVerified: true, reviewCount: 7, averageRating: 4.29 });
  });

  it("treats a seller with no reviews as zero", () => {
    expect(toSeller({ id: "s1", display_name: "A", id_verified: false })).toMatchObject({
      reviewCount: 0,
      averageRating: 0,
    });
  });

  it("maps a listing and orders its photos", () => {
    const listing = toListing(
      {
        id: "l1",
        seller_id: "s1",
        house: "Dior",
        name: "Sauvage",
        kind: "full",
        size_ml: 100,
        fill_percent: null,
        condition: "used",
        batch_code: "3J01",
        price_pence: 9500,
        postage_pence: 395,
        receipt_verified: true,
        source_bottle_id: null,
        notes: ["Pepper"],
        status: "active",
        listing_photos: [
          { path: "b.jpg", position: 1 },
          { path: "a.jpg", position: 0 },
        ],
      },
      (p) => `https://cdn/${p}`,
    );
    expect(listing.photos).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg"]);
    expect(listing.status).toBe("active");
    expect(listing.batchCode).toBe("3J01");
    expect(listing.fillPercent).toBeUndefined();
    expect(listing.sourceBottleId).toBeUndefined();
  });

  it("maps a missing batch code to undefined", () => {
    const listing = toListing({
      id: "l2",
      seller_id: "s1",
      house: "Creed",
      name: "Aventus",
      kind: "decant",
      size_ml: 10,
      fill_percent: null,
      condition: "new_unsealed",
      batch_code: null,
      price_pence: 2800,
      postage_pence: 175,
      receipt_verified: false,
      source_bottle_id: null,
      notes: [],
      status: "sold",
    });
    expect(listing.batchCode).toBeUndefined();
    expect(listing.sourceBottleId).toBeUndefined();
    expect(listing.status).toBe("sold");
  });

  it("takes the catalogue link and its house from a listing", () => {
    const listing = toListing({
      id: "l1",
      seller_id: "s1",
      house: "Dior",
      name: "Sauvage Eau de Parfum",
      kind: "full",
      size_ml: 100,
      fill_percent: null,
      condition: "used",
      batch_code: null,
      price_pence: 9500,
      postage_pence: 395,
      receipt_verified: false,
      source_bottle_id: null,
      notes: [],
      status: "active",
      fragrance_id: "f1",
      fragrances: { house_id: "h1" },
    });
    expect(listing).toMatchObject({ fragranceId: "f1", houseId: "h1" });
  });

  it("maps catalogue fragrances and sizes", () => {
    expect(
      toFragrance({ id: "f1", house_id: "h1", name: "Sauvage", concentration: "edp", launch_year: null, aliases: [] }),
    ).toEqual({ id: "f1", houseId: "h1", name: "Sauvage", concentration: "edp", launchYear: undefined, aliases: [] });
    expect(
      toFragranceSize(
        { id: "z1", fragrance_id: "f1", size_ml: 100, guide_price_pence: 12000, updated_at: "2026-10-30" },
        2,
      ),
    ).toEqual({
      id: "z1",
      fragranceId: "f1",
      sizeMl: 100,
      guidePricePence: 12000,
      listingCount: 2,
      updatedAt: "2026-10-30",
    });
  });
});
