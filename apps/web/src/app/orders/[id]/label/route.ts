import { NextResponse, type NextRequest } from "next/server";
import type { DeliveryService } from "@fragrance/core";
import { createShipment } from "@/lib/orders";
import { shippingProvider, type ShipTo } from "@/lib/shipping";
import { createClient } from "@/lib/supabase/server";

// 004 AC-2.1: the seller's label, and nobody else's.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // RLS only returns the order to its buyer, its seller and admins.
  const { data: order } = await supabase
    .from("orders")
    .select("id, seller_id, status, delivery_service, ship_to")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.seller_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "paid") return NextResponse.json({ error: "This order has already been sent" }, { status: 409 });

  const shipment = await createShipment(id);
  const pdf = await shippingProvider().labelPdf(
    shipment.label_ref,
    order.ship_to as ShipTo,
    order.delivery_service as DeliveryService,
  );
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="label-${shipment.tracking_ref}.pdf"`,
    },
  });
}
