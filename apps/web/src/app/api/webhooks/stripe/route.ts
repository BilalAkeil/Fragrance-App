import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createOrderFromCheckout, releaseReservation, type CheckoutMetadata } from "@/lib/orders";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Stripe's payment webhooks (architecture: signature checked, each event
// handled once). Seller account changes are v2 events, on ./accounts.
// Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  // Stored before handling, so a resent event does nothing.
  const db = createServiceClient();
  const { error: seenError } = await db.from("webhook_events").insert({ id: event.id, type: event.type });
  if (seenError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (seenError) return NextResponse.json({ error: seenError.message }, { status: 500 });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await createOrderFromCheckout(event.data.object);
        break;
      case "checkout.session.expired": {
        const md = event.data.object.metadata as unknown as CheckoutMetadata | null;
        if (md?.listingId) await releaseReservation(md.listingId, md.buyerId);
        break;
      }
    }
  } catch (err) {
    // Forget the event so Stripe's retry gets handled.
    await db.from("webhook_events").delete().eq("id", event.id);
    console.error(`Stripe ${event.type} ${event.id} failed:`, err);
    return NextResponse.json({ error: "Handling failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
