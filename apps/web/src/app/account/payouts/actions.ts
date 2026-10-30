"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { onboardingLink, payoutAccountFor } from "@/lib/payouts";
import { getCurrentSeller } from "@/lib/supabase/server";

// 003 AC-3.1: sends the seller to Stripe to set up payouts.
export async function startPayoutSetup() {
  const { user, seller } = await getCurrentSeller();
  if (!user) redirect("/login");
  if (!seller) redirect("/account");
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let url: string;
  try {
    url = await onboardingLink(await payoutAccountFor(seller.id, user.email), origin);
  } catch (err) {
    console.error("Payout setup failed:", err);
    redirect("/account?payouts=error");
  }
  redirect(url);
}
