import "server-only";
import { redirect } from "next/navigation";
import { getCurrentSeller } from "@/lib/supabase/server";

// R-2, AC-1.1: listing, registering a bottle and swapping need a verified ID.
// Sends anyone else to sign in, set up a shop, or verify. The check itself is
// part of payout setup (005 Q-5): see syncSellerAccount in lib/payouts.ts.
export async function requireVerifiedSeller() {
  const current = await getCurrentSeller();
  if (!current.user) redirect("/login");
  if (!current.seller) redirect("/account");
  if (!current.seller.id_verified) redirect("/account/verify");
  return { ...current, user: current.user, seller: current.seller };
}
