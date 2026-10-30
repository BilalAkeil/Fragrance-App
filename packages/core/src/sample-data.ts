import type { Fragrance, FragranceSize, House } from "./catalogue";
import type { Listing, Seller, SourceBottle } from "./types";

// Placeholder data for building screens before the database is connected.

export const sampleSellers: Seller[] = [
  { id: "s1", displayName: "ScentShelf", idVerified: true, reviewCount: 42, averageRating: 4.8 },
  { id: "s2", displayName: "DecantDen", idVerified: true, reviewCount: 3, averageRating: 5 },
  { id: "s3", displayName: "NewNose", idVerified: false, reviewCount: 0, averageRating: 0 },
];

// The starter catalogue for the sample listings. Guide prices are made-up
// sample values, not real prices.
export const sampleHouses: House[] = [
  { id: "h1", name: "Dior", aliases: ["Christian Dior"] },
  { id: "h2", name: "Tom Ford", aliases: [] },
  { id: "h3", name: "Creed", aliases: [] },
  { id: "h4", name: "Maison Margiela", aliases: ["Margiela"] },
  { id: "h5", name: "Parfums de Marly", aliases: ["PDM"] },
  { id: "h6", name: "Chanel", aliases: [] },
];

export const sampleFragrances: Fragrance[] = [
  { id: "f1", houseId: "h1", name: "Sauvage", concentration: "edp", launchYear: 2018, aliases: [] },
  { id: "f2", houseId: "h1", name: "Sauvage", concentration: "edt", launchYear: 2015, aliases: [] },
  { id: "f3", houseId: "h2", name: "Oud Wood", concentration: "edp", launchYear: 2007, aliases: [] },
  { id: "f4", houseId: "h3", name: "Aventus", concentration: "edp", launchYear: 2010, aliases: [] },
  { id: "f5", houseId: "h4", name: "Replica Jazz Club", concentration: "edt", launchYear: 2013, aliases: ["Jazz Club"] },
  { id: "f6", houseId: "h5", name: "Layton", concentration: "edp", launchYear: 2016, aliases: [] },
  { id: "f7", houseId: "h6", name: "Bleu de Chanel", concentration: "edp", launchYear: 2014, aliases: ["BDC"] },
];

export const sampleFragranceSizes: FragranceSize[] = [
  { id: "z1", fragranceId: "f1", sizeMl: 60, guidePricePence: 9000 },
  { id: "z2", fragranceId: "f1", sizeMl: 100, guidePricePence: 12000 },
  { id: "z3", fragranceId: "f2", sizeMl: 100, guidePricePence: 9500 },
  { id: "z4", fragranceId: "f3", sizeMl: 50, guidePricePence: 20000 },
  { id: "z5", fragranceId: "f3", sizeMl: 100, guidePricePence: 28000 },
  { id: "z6", fragranceId: "f4", sizeMl: 50, guidePricePence: 20000 },
  { id: "z7", fragranceId: "f4", sizeMl: 100, guidePricePence: 29000 },
  { id: "z8", fragranceId: "f5", sizeMl: 100, guidePricePence: 12000 },
  { id: "z9", fragranceId: "f6", sizeMl: 125, guidePricePence: 22000 },
  { id: "z10", fragranceId: "f7", sizeMl: 100, guidePricePence: 13000 },
];

export const sampleSourceBottles: SourceBottle[] = [
  {
    id: "b1",
    sellerId: "s2",
    house: "Creed",
    name: "Aventus Eau de Parfum",
    fragranceId: "f4",
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
    fragranceId: "f1",
    houseId: "h1",
    kind: "full",
    sizeMl: 100,
    condition: "new_sealed",
    batchCode: "3J01",
    pricePence: 9500,
    postagePence: 395,
    receiptVerified: true,
    photos: [],
    status: "active",
    notes: ["Bergamot", "Pepper", "Ambroxan"],
  },
  {
    id: "l2",
    sellerId: "s1",
    house: "Tom Ford",
    name: "Oud Wood Eau de Parfum",
    fragranceId: "f3",
    houseId: "h2",
    kind: "partial",
    sizeMl: 50,
    fillPercent: 80,
    condition: "used",
    batchCode: "B21",
    pricePence: 13000,
    postagePence: 395,
    receiptVerified: false,
    photos: [],
    status: "active",
    notes: ["Oud", "Sandalwood", "Cardamom"],
  },
  {
    id: "l3",
    sellerId: "s2",
    house: "Creed",
    name: "Aventus Eau de Parfum",
    fragranceId: "f4",
    houseId: "h3",
    kind: "decant",
    sizeMl: 10,
    condition: "new_unsealed",
    batchCode: "A4223K01",
    pricePence: 2800,
    postagePence: 175,
    receiptVerified: false,
    sourceBottleId: "b1",
    photos: [],
    status: "active",
    notes: ["Pineapple", "Birch", "Musk"],
  },
  {
    id: "l4",
    sellerId: "s3",
    house: "Maison Margiela",
    name: "Replica Jazz Club Eau de Toilette",
    fragranceId: "f5",
    houseId: "h4",
    kind: "partial",
    sizeMl: 100,
    fillPercent: 60,
    condition: "used",
    pricePence: 5500,
    postagePence: 395,
    receiptVerified: false,
    photos: [],
    status: "active",
    notes: ["Rum", "Tobacco", "Vanilla"],
  },
  {
    id: "l5",
    sellerId: "s2",
    // Not matched to the catalogue yet: the seller typed it in.
    house: "Parfums de Marly",
    name: "Layton",
    kind: "decant",
    sizeMl: 10,
    condition: "new_unsealed",
    pricePence: 2200,
    postagePence: 175,
    receiptVerified: false,
    photos: [],
    status: "active",
    notes: ["Apple", "Lavender", "Vanilla"],
  },
];
