"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyTrackingUpdate } from "@/lib/orders";
import { runOrderDeadlines } from "@/lib/scheduled";
import { shippingProviderName } from "@/lib/shipping";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

// Development only: stands in for the carrier and the clock while the fake
// shipping provider is in use (004 plan).

const TRACKING_TEXT = {
  scanned: "Accepted at the Post Office",
  in_transit: "In transit",
  delivered: "Delivered",
} as const;

async function requireDevAdmin() {
  if (shippingProviderName !== "fake") redirect("/admin");
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/admin");
}

export async function stepTracking(formData: FormData) {
  await requireDevAdmin();
  const status = String(formData.get("status")) as keyof typeof TRACKING_TEXT;
  if (!(status in TRACKING_TEXT)) redirect("/admin/shipments");
  await applyTrackingUpdate({
    trackingRef: String(formData.get("trackingRef")),
    at: new Date(),
    status,
    description: TRACKING_TEXT[status],
  });
  revalidatePath("/admin/shipments");
  redirect("/admin/shipments?done=tracking");
}

// Moves an order's deadline into the past, so the scheduled job acts on it.
export async function expireDeadline(formData: FormData) {
  await requireDevAdmin();
  const id = String(formData.get("orderId"));
  const past = new Date(Date.now() - 60_000).toISOString();
  const field = formData.get("deadline") === "complete_after" ? "complete_after" : "ship_by";
  await createServiceClient().from("orders").update({ [field]: past }).eq("id", id);
  revalidatePath("/admin/shipments");
  redirect("/admin/shipments?done=deadline");
}

export async function runScheduledJob() {
  await requireDevAdmin();
  const result = await runOrderDeadlines();
  revalidatePath("/admin/shipments");
  redirect(
    `/admin/shipments?done=job&cancelled=${result.cancelled}&completed=${result.completed}&failures=${result.failures.length}`,
  );
}
