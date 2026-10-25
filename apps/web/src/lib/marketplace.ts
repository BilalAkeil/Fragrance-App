import { createMarketplace } from "@fragrance/api";

export const marketplace = createMarketplace({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
