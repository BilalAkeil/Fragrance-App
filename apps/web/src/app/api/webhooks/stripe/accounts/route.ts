import { NextResponse, type NextRequest } from "next/server";
import { syncSellerAccount } from "@/lib/payouts";
import { stripe } from "@/lib/stripe";

// Stripe's v2 account events (thin events), which say a seller's payout account
// changed (003 AC-3.1). They only carry the account id, so it's read again and
// payouts_ready set from what Stripe says now. Locally:
//   stripe listen --thin-events 'v2.core.account[configuration.recipient].capability_status_updated,v2.core.account[requirements].updated' \
//     --forward-thin-to localhost:3000/api/webhooks/stripe/accounts
const ACCOUNT_EVENTS = new Set([
  "v2.core.account[configuration.recipient].capability_status_updated",
  "v2.core.account[requirements].updated",
]);

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Not configured" }, { status: 400 });

  let notification;
  try {
    notification = stripe().parseEventNotification(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  // Safe to handle twice: it only re-reads the account.
  const related = "related_object" in notification ? notification.related_object : undefined;
  const accountId = related && "id" in related && typeof related.id === "string" ? related.id : undefined;
  if (ACCOUNT_EVENTS.has(notification.type) && accountId) {
    try {
      await syncSellerAccount(accountId);
    } catch (err) {
      console.error(`Stripe ${notification.type} ${notification.id} failed:`, err);
      return NextResponse.json({ error: "Handling failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
