import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import {
  catalogueNameMatches,
  certificationStatus,
  guideValuePence,
  matchesFilter,
  normaliseName,
  sampleFragrances,
  sampleFragranceSizes,
  sampleHouses,
  sampleListings,
  sampleSellers,
  sampleSourceBottles,
  type Fragrance,
  type FragranceSize,
  type House,
  type Listing,
  type ListingFilter,
  type Seller,
  type SourceBottle,
} from "@fragrance/core";
import {
  toFragrance,
  toFragranceSize,
  toHouse,
  toListing,
  toSeller,
  toSourceBottle,
  type FragranceRow,
  type FragranceSizeRow,
  type HouseRow,
  type ListingRow,
  type SellerRatingRow,
  type SellerRow,
  type SourceBottleRow,
} from "./rows";

export * from "./rows";
export * from "./orders";

export interface Marketplace {
  // False when no Supabase keys are set and sample data is being shown.
  live: boolean;
  // Active listings, newest first.
  listListings(filter?: ListingFilter): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getSellers(ids: string[]): Promise<Seller[]>;
  getSourceBottle(id: string): Promise<SourceBottle | undefined>;
  // Catalogue (002). Without a house: houses matching the text. With one: that
  // house's fragrances matching the text (or all of them when it's empty).
  searchCatalogue(query: string, houseId?: string): Promise<CatalogueResults>;
  listHouses(): Promise<House[]>;
  getFragrance(id: string): Promise<Fragrance | undefined>;
  // Each size counts the live listings at that size, for the guide price per ml.
  getFragranceSizes(fragranceId: string): Promise<FragranceSize[]>;
  // What a listing is worth in a swap, or undefined if it can't be valued (AC-4).
  getGuideValue(listing: Listing): Promise<number | undefined>;
}

export interface CatalogueResults {
  houses: House[];
  fragrances: Fragrance[];
}

const SUGGESTION_LIMIT = 10;

// The words someone typed, normalised the same way as the catalogue's search text.
const searchWords = (query: string) => normaliseName(query).split(" ").filter(Boolean);

export function createMarketplace(config: {
  url?: string;
  anonKey?: string;
  storage?: SupportedStorage;
}): Marketplace {
  if (!config.url || !config.anonKey) return sampleMarketplace;
  const client = createClient(config.url, config.anonKey, {
    auth: config.storage
      ? { storage: config.storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      : { persistSession: false },
  });
  return supabaseMarketplace(client);
}

const LISTING_FIELDS =
  "id, seller_id, house, name, kind, size_ml, fill_percent, condition, batch_code, price_pence, postage_pence, receipt_verified, source_bottle_id, fragrance_id, notes, status, reserved_by, reserved_until, listing_photos(path, position)";
const LISTING_COLUMNS = `${LISTING_FIELDS}, fragrances(house_id)`;
// An inner join, so only listings matched to a fragrance come back.
const LISTING_COLUMNS_BY_HOUSE = `${LISTING_FIELDS}, fragrances!inner(house_id)`;

export function supabaseMarketplace(client: SupabaseClient): Marketplace {
  const photoUrl = (path: string) =>
    client.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;

  return {
    live: true,

    async listListings(filter = {}) {
      let q = client
        .from("listings")
        .select(filter.houseId ? LISTING_COLUMNS_BY_HOUSE : LISTING_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (filter.kind) q = q.eq("kind", filter.kind);
      if (filter.condition) q = q.eq("condition", filter.condition);
      if (filter.minPence !== undefined) q = q.gte("price_pence", filter.minPence);
      if (filter.maxPence !== undefined) q = q.lte("price_pence", filter.maxPence);
      if (filter.houseId) q = q.eq("fragrances.house_id", filter.houseId);
      if (filter.query?.trim()) {
        q = q.textSearch("search", filter.query.trim(), {
          type: "websearch",
          config: "english",
        });
      }
      const { data, error } = await q;
      if (error) throw error;
      const listings = (data as unknown as ListingRow[]).map((r) => toListing(r, photoUrl));
      if (!filter.certifiedOnly) return listings;
      // Certification is a core rule, so it's applied here rather than in SQL.
      const sellers = await this.getSellers([...new Set(listings.map((l) => l.sellerId))]);
      const certified = new Set(sellers.filter((s) => certificationStatus(s) === "certified").map((s) => s.id));
      return listings.filter((l) => certified.has(l.sellerId));
    },

    async getListing(id) {
      const { data, error } = await client
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toListing(data as unknown as ListingRow, photoUrl) : undefined;
    },

    async getSellers(ids) {
      if (ids.length === 0) return [];
      const [sellers, ratings] = await Promise.all([
        client.from("sellers").select("id, display_name, id_verified, payouts_ready").in("id", ids),
        client.from("seller_ratings").select("seller_id, review_count, average_rating").in("seller_id", ids),
      ]);
      if (sellers.error) throw sellers.error;
      if (ratings.error) throw ratings.error;
      const byId = new Map((ratings.data as SellerRatingRow[]).map((r) => [r.seller_id, r]));
      return (sellers.data as SellerRow[]).map((s) => toSeller(s, byId.get(s.id)));
    },

    async getSourceBottle(id) {
      const { data, error } = await client
        .from("source_bottles")
        .select("id, seller_id, house, name, size_ml, batch_code, video_path, receipt_path, verified_at, fragrance_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toSourceBottle(data as SourceBottleRow) : undefined;
    },

    async searchCatalogue(query, houseId) {
      // The search text starts with a space, so "% word%" matches the start of any word.
      const words = searchWords(query);
      if (!houseId) {
        if (words.length === 0) return { houses: [], fragrances: [] };
        let q = client.from("houses").select("id, name, aliases").order("name").limit(SUGGESTION_LIMIT);
        for (const w of words) q = q.ilike("search_text", `% ${w}%`);
        const { data, error } = await q;
        if (error) throw error;
        return { houses: (data as HouseRow[]).map(toHouse), fragrances: [] };
      }
      let q = client
        .from("fragrances")
        .select("id, house_id, name, concentration, launch_year, aliases")
        .eq("house_id", houseId)
        .order("name")
        .limit(SUGGESTION_LIMIT);
      for (const w of words) q = q.ilike("search_text", `% ${w}%`);
      const { data, error } = await q;
      if (error) throw error;
      return { houses: [], fragrances: (data as FragranceRow[]).map(toFragrance) };
    },

    async listHouses() {
      const { data, error } = await client.from("houses").select("id, name, aliases").order("name");
      if (error) throw error;
      return (data as HouseRow[]).map(toHouse);
    },

    async getFragrance(id) {
      const { data, error } = await client
        .from("fragrances")
        .select("id, house_id, name, concentration, launch_year, aliases")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toFragrance(data as FragranceRow) : undefined;
    },

    async getFragranceSizes(fragranceId) {
      const [sizes, listings] = await Promise.all([
        client
          .from("fragrance_sizes")
          .select("id, fragrance_id, size_ml, guide_price_pence, updated_at")
          .eq("fragrance_id", fragranceId)
          .order("size_ml"),
        client
          .from("listings")
          .select("size_ml")
          .eq("fragrance_id", fragranceId)
          .neq("kind", "decant")
          .neq("status", "removed"),
      ]);
      if (sizes.error) throw sizes.error;
      if (listings.error) throw listings.error;
      return (sizes.data as FragranceSizeRow[]).map((row) =>
        toFragranceSize(row, (listings.data as { size_ml: number }[]).filter((l) => l.size_ml === row.size_ml).length),
      );
    },

    async getGuideValue(listing) {
      if (!listing.fragranceId) return undefined;
      return guideValuePence(listing, await this.getFragranceSizes(listing.fragranceId));
    },
  };
}

export const sampleMarketplace: Marketplace = {
  live: false,
  async listListings(filter = {}) {
    return sampleListings.filter(
      (l) => l.status === "active" && matchesFilter(l, sampleSellers.find((s) => s.id === l.sellerId), filter),
    );
  },
  async getListing(id) {
    return sampleListings.find((l) => l.id === id);
  },
  async getSellers(ids) {
    return sampleSellers.filter((s) => ids.includes(s.id));
  },
  async getSourceBottle(id) {
    return sampleSourceBottles.find((b) => b.id === id);
  },
  async searchCatalogue(query, houseId) {
    const typed = searchWords(query).length > 0;
    if (!houseId) {
      if (!typed) return { houses: [], fragrances: [] };
      return {
        houses: sampleHouses.filter((h) => catalogueNameMatches(query, h.name, h.aliases)).slice(0, SUGGESTION_LIMIT),
        fragrances: [],
      };
    }
    return {
      houses: [],
      fragrances: sampleFragrances
        .filter((f) => f.houseId === houseId && (!typed || catalogueNameMatches(query, f.name, f.aliases)))
        .slice(0, SUGGESTION_LIMIT),
    };
  },
  async listHouses() {
    return [...sampleHouses].sort((a, b) => a.name.localeCompare(b.name));
  },
  async getFragrance(id) {
    return sampleFragrances.find((f) => f.id === id);
  },
  async getFragranceSizes(fragranceId) {
    const live = sampleListings.filter(
      (l) => l.fragranceId === fragranceId && l.kind !== "decant" && l.status !== "removed",
    );
    return sampleFragranceSizes
      .filter((s) => s.fragranceId === fragranceId)
      .map((s) => ({ ...s, listingCount: live.filter((l) => l.sizeMl === s.sizeMl).length }));
  },
  async getGuideValue(listing) {
    if (!listing.fragranceId) return undefined;
    return guideValuePence(listing, await this.getFragranceSizes(listing.fragranceId));
  },
};
