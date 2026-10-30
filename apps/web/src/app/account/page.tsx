import Link from "next/link";
import { redirect } from "next/navigation";
import { canEditListing, certificationProgress, formatGBP, type ListingKind } from "@fragrance/core";
import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { inputClass } from "@/components/Field";
import { buttonPrimary, buttonSecondary, pageTitle, panel } from "@/components/ui";
import { KIND_LABELS } from "@/components/labels";
import { BOTTLE_STATUS_LABELS, loadOwnBottles } from "@/lib/bottles";
import { marketplace } from "@/lib/marketplace";
import { getCurrentSeller } from "@/lib/supabase/server";
import { RemoveListingButton } from "../listings/[id]/RemoveListingButton";
import { createSellerProfile, setDispatchPostcode, signOut } from "./actions";
import { startPayoutSetup } from "./payouts/actions";
import { PAYOUT_STATUS_TEXT, payoutStatus, retrievePayoutAccount, type PayoutStatus } from "@/lib/payouts";
import { stripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

const ERRORS: Record<string, string> = {
  name: "Choose a shop name between 2 and 40 characters.",
  save: "That name couldn't be saved. Please try again.",
};

const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  not_started: "Not set up",
  in_progress: "In progress",
  needs_info: "Needs more information",
  ready: "Ready",
};

const LISTING_GROUPS = [
  { status: "active", label: "Active" },
  { status: "sold", label: "Sold" },
  { status: "removed", label: "Removed" },
] as const;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; removed?: string; payouts?: string; postcode?: string }>;
}) {
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user, seller } = await getCurrentSeller();
  if (!user) redirect("/login");
  const { error, removed, payouts, postcode } = await searchParams;

  const [listings, bottles, receiptRejections] = seller
    ? await Promise.all([
        supabase
          .from("listings")
          .select("id, house, name, kind, size_ml, price_pence, status, receipt_path")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false }),
        loadOwnBottles(supabase, user.id),
        // Only the seller and admins can read these.
        supabase
          .from("review_decisions")
          .select("item_id, item_path, reason")
          .eq("seller_id", user.id)
          .eq("item_type", "receipt")
          .eq("approved", false)
          .order("decided_at"),
      ])
    : [null, [], null];

  // 005 AC-5: certification comes from the core rules, with their rating.
  const ratedSeller = seller ? (await marketplace.getSellers([seller.id]))[0] : undefined;
  const progress = ratedSeller ? certificationProgress(ratedSeller) : undefined;

  // 003 AC-3.1: payouts, read live from Stripe. 004: where the seller posts from.
  let payoutState: PayoutStatus = "not_started";
  let dispatchPostcode: string | null = null;
  if (seller) {
    const [{ data: account }, { data: settings }] = await Promise.all([
      createServiceClient().from("sellers").select("stripe_account_id").eq("id", seller.id).single(),
      supabase.from("seller_settings").select("dispatch_postcode").eq("seller_id", seller.id).maybeSingle(),
    ]);
    dispatchPostcode = settings?.dispatch_postcode ?? null;
    if (account?.stripe_account_id && stripeConfigured) {
      payoutState = payoutStatus(await retrievePayoutAccount(account.stripe_account_id).catch(() => undefined));
    }
  }

  // A rejection only applies to the file it was made on. Later ones overwrite earlier ones.
  const reasons = new Map(
    (receiptRejections?.data ?? []).map((r) => [`${r.item_id}:${r.item_path}`, r.reason as string]),
  );
  const receiptReason = (id: string, path: string | null) => (path ? reasons.get(`${id}:${path}`) : undefined);
  const groups = LISTING_GROUPS.map((g) => ({
    ...g,
    listings: (listings?.data ?? []).filter((l) => l.status === g.status),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className={pageTitle}>Your account</h1>
        <form action={signOut}>
          <button className="text-sm text-muted hover:underline">Sign out</button>
        </form>
      </div>
      <p className="text-muted">Signed in as {user.email}</p>

      {!seller ? (
        <form action={createSellerProfile} className="flex max-w-sm flex-col gap-3">
          <h2 className="text-lg font-extrabold">Start selling</h2>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Shop name
            <input name="displayName" required minLength={2} maxLength={40} className={`${inputClass} font-normal`} />
          </label>
          {error && ERRORS[error] && <p className="text-sm text-danger">{ERRORS[error]}</p>}
          <button className={buttonPrimary}>Create seller profile</button>
        </form>
      ) : (
        <>
          <section className={panel}>
            <h2 className="text-lg font-extrabold">{seller.display_name}</h2>
            {/* 005 AC-5.1, AC-5.2: where they stand on certification, and what's next. */}
            {progress && (
              <div className="mt-2 flex flex-col gap-1 text-sm">
                <p>
                  <span className="font-semibold">Status: </span>
                  <span className={progress.status === "certified" ? "font-semibold text-verified" : "font-semibold"}>
                    {progress.label}
                  </span>
                  {ratedSeller && ratedSeller.reviewCount > 0 && (
                    <span className="text-muted">
                      {" "}
                      · {ratedSeller.averageRating.toFixed(1)}★ from {ratedSeller.reviewCount}{" "}
                      {ratedSeller.reviewCount === 1 ? "review" : "reviews"}
                    </span>
                  )}
                </p>
                <p className="text-muted">
                  {progress.status === "unverified" ? (
                    <Link href="/account/verify" className="font-bold text-brand underline">
                      {progress.nextStep}
                    </Link>
                  ) : (
                    progress.nextStep
                  )}
                </p>
                <p>
                  <Link href={`/sellers/${seller.id}`} className="font-bold text-brand underline">
                    Your public profile
                  </Link>
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/sell" className={buttonPrimary}>
                Sell a fragrance
              </Link>
              <Link href="/sell/bottles" className={buttonSecondary}>
                Register a bottle for decants
              </Link>
            </div>
          </section>

          <section id="payouts" className={`${panel} flex flex-col gap-3`}>
            <h2 className="text-lg font-extrabold">Payouts</h2>
            <p className="text-sm">
              <span className={payoutState === "ready" ? "font-semibold text-verified" : "font-semibold"}>
                {PAYOUT_STATUS_LABELS[payoutState]}.
              </span>{" "}
              <span className="text-muted">{PAYOUT_STATUS_TEXT[payoutState]}</span>
            </p>
            {payouts === "error" && <p className="text-sm text-danger">Stripe couldn&apos;t start payout setup. Please try again in a few minutes.</p>}
            {payoutState !== "ready" &&
              (stripeConfigured ? (
                <form action={startPayoutSetup}>
                  <button className={buttonPrimary}>
                    {payoutState === "not_started" ? "Set up payouts" : "Continue with Stripe"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-muted">Payouts need the Stripe keys, which aren&apos;t set on this site yet.</p>
              ))}
            <form action={setDispatchPostcode} className="mt-2 flex flex-wrap items-end gap-3 border-t border-line pt-4 text-sm">
              <label className="flex flex-col gap-1 font-bold">
                Where you post from (postcode)
                <input
                  name="postcode"
                  defaultValue={dispatchPostcode ?? ""}
                  placeholder="For example LS1 1AA"
                  className={`${inputClass} w-44 font-normal`}
                />
              </label>
              <button className={buttonSecondary}>Save</button>
              <span className="w-full text-muted">Used to price delivery. Only you can see it.</span>
              {postcode === "saved" && <span className="text-verified">Saved.</span>}
              {postcode === "invalid" && <span className="text-danger">Enter a UK postcode, for example LS1 1AA.</span>}
            </form>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-extrabold">Your listings</h2>
            {removed && <p className="rounded-xl bg-sky px-4 py-3 text-sm">Your listing has been removed.</p>}
            {!listings?.data?.length && <p className="text-sm text-muted">Nothing listed yet.</p>}
            {groups.map(
              (g) =>
                g.listings.length > 0 && (
                  <div key={g.status}>
                    <h3 className="text-sm font-bold text-muted">
                      {g.label} ({g.listings.length})
                    </h3>
                    <ul className="divide-y divide-line">
                      {g.listings.map((l) => {
                        const reason = receiptReason(l.id, l.receipt_path);
                        return (
                          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                            <span>
                              {g.status === "removed" ? (
                                <span className="text-muted">
                                  {l.house} {l.name}, {l.size_ml}ml {KIND_LABELS[l.kind as ListingKind].toLowerCase()}
                                </span>
                              ) : (
                                <Link href={`/listings/${l.id}`} className="hover:underline">
                                  {l.house} {l.name}, {l.size_ml}ml {KIND_LABELS[l.kind as ListingKind].toLowerCase()}
                                </Link>
                              )}
                              {reason && <span className="block text-xs text-danger">Receipt not approved: {reason}</span>}
                            </span>
                            <span className="flex flex-wrap items-center gap-3">
                              {formatGBP(l.price_pence)}
                              {canEditListing(l.status, true) && (
                                <>
                                  <Link href={`/listings/${l.id}/edit`} className="font-bold text-brand hover:underline">
                                    Edit
                                  </Link>
                                  <RemoveListingButton listingId={l.id} className="font-bold text-danger hover:underline" />
                                </>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ),
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-extrabold">Bottles registered for decants</h2>
            {bottles.length ? (
              <ul className="divide-y divide-line text-sm">
                {bottles.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {b.house} {b.name}, {b.sizeMl}ml
                    </span>
                    <span className="flex flex-wrap items-center gap-3 text-right">
                      <span
                        className={
                          b.review.status === "checked"
                            ? "font-semibold text-verified"
                            : b.review.status === "rejected"
                              ? "text-danger"
                              : "text-muted"
                        }
                      >
                        {BOTTLE_STATUS_LABELS[b.review.status]}
                        {b.review.status === "rejected" && `: ${b.review.reason}`}
                      </span>
                      {b.review.status !== "checked" && (
                        <Link href={`/sell/bottles/${b.id}/edit`} className="font-bold text-brand hover:underline">
                          Change
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">None yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
