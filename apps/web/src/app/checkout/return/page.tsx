import Link from "next/link";
import { redirect } from "next/navigation";
import { formatGBP } from "@fragrance/core";
import { buttonPrimary, buttonSecondary, pageTitle, panel } from "@/components/ui";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { WaitForOrder } from "./WaitForOrder";

export const dynamic = "force-dynamic";

// Where Stripe sends the buyer after paying (003 AC-1.5, AC-1.6).
export default async function CheckoutReturnPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!sessionId || !stripeConfigured) redirect("/orders");

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    redirect("/orders");
  }
  // Only the buyer who paid sees this.
  if (session.metadata?.buyerId !== user.id) redirect("/orders");
  const listingId = session.metadata?.listingId;

  if (session.status !== "complete" || session.payment_status !== "paid") {
    // AC-1.6: nothing was bought, and the listing is still there.
    return (
      <div className={`${panel} flex max-w-xl flex-col gap-4`}>
        <h1 className={pageTitle}>Payment not taken</h1>
        <p>
          {session.status === "expired"
            ? "The 30 minutes to pay ran out, so nothing was charged."
            : "Your payment didn't go through, so nothing was charged. Your bank may have declined it, or the card details weren't right."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/checkout/${listingId}`} className={buttonPrimary}>
            Try again
          </Link>
          <Link href={`/listings/${listingId}`} className={buttonSecondary}>
            Back to the listing
          </Link>
        </div>
      </div>
    );
  }

  // The order is made by the webhook, which can land a moment after the buyer does.
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  return (
    <div className={`${panel} flex max-w-xl flex-col gap-4`}>
      <h1 className={pageTitle}>Thank you, it&apos;s yours</h1>
      <p>
        You paid {formatGBP(session.amount_total ?? 0)}. We hold the money until you confirm the item arrived as
        described.
      </p>
      <p className="font-semibold">The seller has 5 working days to send it. We&apos;ll let you know when it&apos;s on its way.</p>
      {order ? (
        <Link href={`/orders/${order.id}`} className={buttonPrimary}>
          See your order
        </Link>
      ) : (
        <WaitForOrder />
      )}
    </div>
  );
}
