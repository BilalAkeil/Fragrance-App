import { describe, expect, it } from "vitest";
import { toListing, toSeller } from "./rows";

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
        listing_photos: [
          { path: "b.jpg", position: 1 },
          { path: "a.jpg", position: 0 },
        ],
      },
      (p) => `https://cdn/${p}`,
    );
    expect(listing.photos).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg"]);
    expect(listing.fillPercent).toBeUndefined();
    expect(listing.sourceBottleId).toBeUndefined();
  });
});
