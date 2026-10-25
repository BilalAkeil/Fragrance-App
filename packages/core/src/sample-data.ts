import type { Listing, Seller, SourceBottle } from "./types";

// Placeholder data for building screens before the database is connected.

export const sampleSellers: Seller[] = [
  { id: "s1", displayName: "ScentShelf", idVerified: true, reviewCount: 42, averageRating: 4.8 },
  { id: "s2", displayName: "DecantDen", idVerified: true, reviewCount: 3, averageRating: 5 },
  { id: "s3", displayName: "NewNose", idVerified: false, reviewCount: 0, averageRating: 0 },
];

export const sampleSourceBottles: SourceBottle[] = [
  {
    id: "b1",
    sellerId: "s2",
    house: "Creed",
    name: "Aventus",
    sizeMl: 100,
    batchCode: "A4223K01",
    videoUrl: "https://example.com/videos/b1.mp4",
    verifiedAt: "2026-10-20",
  },
];

export const sampleListings: Listing[] = [
  {
    id: "l1",
    sellerId: "s1",
    house: "Dior",
    name: "Sauvage Eau de Parfum",
    kind: "full",
    sizeMl: 100,
    condition: "new_sealed",
    batchCode: "3J01",
    pricePence: 9500,
    postagePence: 395,
    receiptVerified: true,
    photos: [],
    notes: ["Bergamot", "Pepper", "Ambroxan"],
  },
  {
    id: "l2",
    sellerId: "s1",
    house: "Tom Ford",
    name: "Oud Wood",
    kind: "partial",
    sizeMl: 50,
    fillPercent: 80,
    condition: "used",
    batchCode: "B21",
    pricePence: 13000,
    postagePence: 395,
    receiptVerified: false,
    photos: [],
    notes: ["Oud", "Sandalwood", "Cardamom"],
  },
  {
    id: "l3",
    sellerId: "s2",
    house: "Creed",
    name: "Aventus",
    kind: "decant",
    sizeMl: 10,
    condition: "new_unsealed",
    batchCode: "A4223K01",
    pricePence: 2800,
    postagePence: 175,
    receiptVerified: false,
    sourceBottleId: "b1",
    photos: [],
    notes: ["Pineapple", "Birch", "Musk"],
  },
];
