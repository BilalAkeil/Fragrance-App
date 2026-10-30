import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Seller payouts through Stripe Connect (003 AC-3.1), with Accounts v2: each
// seller is a "recipient" account with the Express Dashboard. The platform
// takes the payment and transfers the item price later (separate charges and
// transfers), so it pays Stripe's fees and covers losses, as Stripe requires
// for recipient accounts.

type Account = Stripe.V2.Core.Account;

export type PayoutStatus = "not_started" | "in_progress" | "needs_info" | "ready";

export const PAYOUT_STATUS_TEXT: Record<PayoutStatus, string> = {
  not_started: "Set up payouts so buyers can buy your listings. Stripe asks for your bank details and checks who you are.",
  in_progress: "You've started setting up payouts. Carry on where you left off.",
  needs_info: "Stripe needs a bit more information before it can pay you.",
  ready: "Payouts are set up. When an order completes, the item price is sent to your bank.",
};

// Fields a v2 account only returns when asked for.
const INCLUDE: Stripe.V2.Core.AccountRetrieveParams.Include[] = ["configuration.recipient", "requirements"];

export function payoutStatus(account: Account | undefined): PayoutStatus {
  if (!account) return "not_started";
  const transfers = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
  if (transfers?.status === "active") return "ready";
  if (transfers?.status_details?.some((d) => d.code === "requirements_past_due")) return "needs_info";
  return "in_progress";
}

export async function retrievePayoutAccount(accountId: string): Promise<Account> {
  return stripe().v2.core.accounts.retrieve(accountId, { include: INCLUDE });
}

// The account webhooks, and the return from onboarding: only server code sets payouts_ready.
export async function syncPayoutsReady(accountId: string) {
  const ready = payoutStatus(await retrievePayoutAccount(accountId)) === "ready";
  const { error } = await createServiceClient()
    .from("sellers")
    .update({ payouts_ready: ready })
    .eq("stripe_account_id", accountId);
  if (error) throw new Error(`Updating payouts for ${accountId}: ${error.message}`);
}

// The seller's account, made the first time they set up payouts.
export async function payoutAccountFor(
  seller: { id: string; displayName: string },
  email: string | undefined,
): Promise<string> {
  const db = createServiceClient();
  const { data } = await db.from("sellers").select("stripe_account_id").eq("id", seller.id).single();
  if (data?.stripe_account_id) return data.stripe_account_id;
  const account = await stripe().v2.core.accounts.create(
    {
      display_name: seller.displayName,
      contact_email: email,
      dashboard: "express",
      identity: { country: "gb", entity_type: "individual" },
      defaults: {
        currency: "gbp",
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      metadata: { seller_id: seller.id },
    },
    // Stops a double click making two accounts. Changes each minute, because
    // Stripe replays a failed request's error for the same key for 24 hours.
    { idempotencyKey: `payout-account-${seller.id}-${Math.floor(Date.now() / 60_000)}` },
  );
  const { error } = await db.from("sellers").update({ stripe_account_id: account.id }).eq("id", seller.id);
  if (error) throw new Error(`Saving the payouts account: ${error.message}`);
  return account.id;
}

// A one-time link into Stripe's hosted onboarding for this account.
export async function onboardingLink(accountId: string, origin: string): Promise<string> {
  const link = await stripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${origin}/account/payouts/refresh`,
        return_url: `${origin}/account/payouts/return`,
      },
    },
  });
  return link.url;
}
