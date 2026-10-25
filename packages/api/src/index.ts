import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import {
  sampleListings,
  sampleSellers,
  sampleSourceBottles,
  type Listing,
  type ListingKind,
  type Seller,
  type SourceBottle,
} from "@fragrance/core";
import {
  toListing,
  toSeller,
  toSourceBottle,
  type ListingRow,
  type SellerRatingRow,
  type SellerRow,
  type SourceBottleRow,
} from "./rows";

export * from "./rows";

export interface Marketplace {
  // False when no Supabase keys are set and sample data is being shown.
  live: boolean;
  listListings(filter?: { query?: string; kind?: ListingKind }): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getSellers(ids: string[]): Promise<Seller[]>;
  getSourceBottle(id: string): Promise<SourceBottle | undefined>;
}

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

const LISTING_COLUMNS =
  "id, seller_id, house, name, kind, size_ml, fill_percent, condition, batch_code, price_pence, postage_pence, receipt_verified, source_bottle_id, notes, listing_photos(path, position)";

export function supabaseMarketplace(client: SupabaseClient): Marketplace {
  const photoUrl = (path: string) =>
    client.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;

  return {
    live: true,

    async listListings(filter = {}) {
      let q = client
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (filter.kind) q = q.eq("kind", filter.kind);
      if (filter.query?.trim()) {
        q = q.textSearch("search", filter.query.trim(), {
          type: "websearch",
          config: "english",
        });
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as ListingRow[]).map((r) => toListing(r, photoUrl));
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
        client.from("sellers").select("id, display_name, id_verified").in("id", ids),
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
        .select("id, seller_id, house, name, size_ml, batch_code, video_path, receipt_path, verified_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toSourceBottle(data as SourceBottleRow) : undefined;
    },
  };
}

export const sampleMarketplace: Marketplace = {
  live: false,
  async listListings(filter = {}) {
    const q = filter.query?.trim().toLowerCase();
    return sampleListings.filter(
      (l) =>
        (!filter.kind || l.kind === filter.kind) &&
        (!q || [l.house, l.name, ...l.notes].some((s) => s.toLowerCase().includes(q))),
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
};
