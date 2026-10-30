import { NextResponse, type NextRequest } from "next/server";
import { applyTrackingUpdate } from "@/lib/orders";
import { shippingProvider } from "@/lib/shipping";

// Tracking updates from the shipping provider (004 AC-3). The provider checks
// the request is genuine. The fake provider has no webhooks: an admin steps its
// tracking on /admin/shipments.
export async function POST(request: NextRequest) {
  let updates;
  try {
    updates = await shippingProvider().parseWebhook(request);
  } catch {
    return NextResponse.json({ error: "Not accepted" }, { status: 400 });
  }
  for (const update of updates) await applyTrackingUpdate(update);
  return NextResponse.json({ received: updates.length });
}
