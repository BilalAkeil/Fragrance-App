import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Seller payouts through Stripe Connect Express accounts (003 AC-3.1).

export type PayoutStatus = "not_started" | "in_progress" | "needs_info" | "ready";

export const PAYOUT_STATUS_TEXT: Record<PayoutStatus, string> = {
  not_started: "Set up payouts so buyers can buy your listings. Stripe asks for your bank details and checks who you are.",
  in_progress: "You've started setting up payouts. Carry on where you left off.",
  needs_info: "Stripe needs a bit more information before it can pay you.",
  ready: "Payouts are set up. When an order completes, the item price is sent to your bank.",
};

export function payoutStatus(account: Stripe.Account | undefined): PayoutStatus {
  if (!account) return "not_started";
  if (account.details_submitted && account.payouts_enabled) return "ready";
  if (account.details_submitted) return "needs_info";
  return "in_progress";
}

// account.updated, and the return from onboarding: only server code sets payouts_ready.
export async function syncPayoutsReady(account: Stripe.Account) {
  const ready = payoutStatus(account) === "ready";
  const { error } = await createServiceClient()
    .from("sellers")
    .update({ payouts_ready: ready })
    .eq("stripe_account_id", account.id);
  if (error) throw new Error(`Updating payouts for ${account.id}: ${error.message}`);
}

// The seller's Express account, made the first time they set up payouts.
export async function payoutAccountFor(sellerId: string, email: string | undefined): Promise<string> {
  const db = createServiceClient();
  const { data: seller } = await db.from("sellers").select("stripe_account_id").eq("id", sellerId).single();
  if (seller?.stripe_account_id) return seller.stripe_account_id;
  const account = await stripe().accounts.create(
    {
      type: "express",
      country: "GB",
      email,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      business_profile: { product_description: "Selling pre-owned fragrances on Fragrance Marketplace" },
      metadata: { seller_id: sellerId },
    },
    { idempotencyKey: `payout-account-${sellerId}` },
  );
  const { error } = await db.from("sellers").update({ stripe_account_id: account.id }).eq("id", sellerId);
  if (error) throw new Error(`Saving the payouts account: ${error.message}`);
  return account.id;
}

// A one-time link into Stripe's onboarding for this account.
export async function onboardingLink(accountId: string, origin: string): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${origin}/account/payouts/refresh`,
    return_url: `${origin}/account/payouts/return`,
  });
  return link.url;
}
