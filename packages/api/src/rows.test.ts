import { describe, expect, it } from "vitest";
import { toFragrance, toFragranceSize, toListing, toReview, toSeller } from "./rows";

describe("row mapping", () => {
  it("maps a seller with its rating", () => {
    expect(
      toSeller(
        { id: "s1", display_name: "ScentShelf", id_verified: true },
        { seller_id: "s1", review_count: 7, average_rating: "4.29" },
      ),
    ).toEqual({
      id: "s1",
      displayName: "ScentShelf",
      idVerified: true,
      reviewCount: 7,
      averageRating: 4.29,
      payoutsReady: false,
    });
  });

  it("keeps when a seller joined", () => {
    expect(toSeller({ id: "s1", display_name: "A", id_verified: true, created_at: "2026-10-01T10:00:00Z" }).joinedAt).toBe(
      "2026-10-01T10:00:00Z",
    );
  });

  it("maps an order review", () => {
    expect(
      toReview({
        id: "r1",
        order_id: "o1",
        swap_id: null,
        reviewee_id: "s1",
        rating: 4,
        text: "Good",
        created_at: "2026-10-30T10:00:00Z",
      }),
    ).toEqual({ id: "r1", orderId: "o1", swapId: undefined, revieweeId: "s1", rating: 4, text: "Good", createdAt: "2026-10-30T10:00:00Z" });
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

describe("order mapping", () => {
  it("maps an order with its item, tracking in time order, and first photo", async () => {
    const { toOrder } = await import("./orders");
    const order = toOrder({
      id: "o1",
      listing_id: "l1",
      buyer_id: "b1",
      seller_id: "s1",
      status: "shipped",
      item_pence: 8200,
      postage_pence: 335,
      protection_fee_pence: 276,
      delivery_service: "tracked48",
      ship_to: { name: "B", line1: "1 Test St", town: "Leeds", postcode: "LS1 1AA" },
      created_at: "2026-11-02T10:00:00Z",
      ship_by: "2026-11-09T23:59:59Z",
      shipped_at: "2026-11-03T09:00:00Z",
      delivered_at: null,
      complete_after: null,
      completed_at: null,
      cancelled_at: null,
      listings: {
        house: "Dior",
        name: "Sauvage Eau de Parfum",
        kind: "full",
        size_ml: 100,
        listing_photos: [
          { path: "b.jpg", position: 1 },
          { path: "a.jpg", position: 0 },
        ],
      },
      shipments: {
        tracking_ref: "FK1",
        tracking_events: [
          { at: "2026-11-03T12:00:00Z", status: "in_transit", description: "In transit" },
          { at: "2026-11-03T09:00:00Z", status: "scanned", description: "Accepted" },
        ],
      },
    });
    expect(order.item).toEqual({ house: "Dior", name: "Sauvage Eau de Parfum", kind: "full", sizeMl: 100, photo: "a.jpg" });
    expect(order.tracking.map((t) => t.status)).toEqual(["scanned", "in_transit"]);
    expect(order).toMatchObject({ status: "shipped", trackingRef: "FK1", shipBy: "2026-11-09T23:59:59Z", deliveredAt: undefined });
  });
});
