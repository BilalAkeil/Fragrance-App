import Link from "next/link";
import { redirect } from "next/navigation";
import { CANNOT_BUY_MESSAGES, canBuy, formatGBP } from "@fragrance/core";
import { getAddresses } from "@fragrance/api";
import { BottleTile } from "@/components/BottleTile";
import { NotConnected } from "@/components/NotConnected";
import { KIND_LABELS } from "@/components/labels";
import { pageTitle, panel } from "@/components/ui";
import { marketplace } from "@/lib/marketplace";
import { stripeConfigured } from "@/lib/stripe";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { CheckoutFlow } from "./CheckoutFlow";

export const dynamic = "force-dynamic";

// /checkout/[listingId] (003).
export default async function CheckoutPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  if (!supabaseConfigured) return <NotConnected />;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // AC-1.1: sign in, then come back to the listing.
  if (!user) redirect(`/login?reason=buy&next=${encodeURIComponent(`/listings/${listingId}`)}`);

  const listing = await marketplace.getListing(listingId);
  if (!listing) redirect(`/listings/${listingId}`);
  const [seller] = await marketplace.getSellers([listing.sellerId]);
  const reasons = canBuy({
    listing,
    buyerId: user.id,
    sellerPayoutsReady: Boolean(seller?.payoutsReady),
    reservation: {
      reservedBy: listing.reservedBy,
      reservedUntil: listing.reservedUntil ? new Date(listing.reservedUntil) : undefined,
    },
    now: new Date(),
  });
  const title = `${listing.house} ${listing.name}`;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/listings/${listing.id}`} className="text-sm font-bold text-brand underline">
          Back to the listing
        </Link>
        <h1 className={pageTitle}>Checkout</h1>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <div className="min-w-0 flex-[1_1_480px]">
          {reasons.length > 0 ? (
            <div className={`${panel} flex flex-col gap-2`}>
              <p className="font-bold">You can&apos;t buy this right now.</p>
              {reasons.map((r) => (
                <p key={r} className="text-muted">
                  {CANNOT_BUY_MESSAGES[r]}
                </p>
              ))}
            </div>
          ) : !stripeConfigured || !publishableKey ? (
            <p className={`${panel} text-muted`}>Payments need the Stripe keys, which aren&apos;t set on this site yet.</p>
          ) : (
            <CheckoutFlow
              listingId={listing.id}
              itemPence={listing.pricePence}
              addresses={await getAddresses(supabase)}
              publishableKey={publishableKey}
            />
          )}
        </div>
        <aside className={`${panel} flex flex-[0_1_320px] flex-col gap-3`}>
          <div className="aspect-square overflow-hidden rounded-2xl">
            <BottleTile kind={listing.kind} photo={listing.photos[0]} alt={title} />
          </div>
          <p className="font-bold text-brand">{listing.house}</p>
          <p className="text-xl font-extrabold">{listing.name}</p>
          <p className="text-sm text-muted">
            {KIND_LABELS[listing.kind]} · {listing.sizeMl}ml
            {listing.fillPercent !== undefined ? ` · ${listing.fillPercent}% full` : ""} · sold by {seller?.displayName}
          </p>
          <p className="text-2xl font-extrabold">{formatGBP(listing.pricePence)}</p>
        </aside>
      </div>
    </div>
  );
}
