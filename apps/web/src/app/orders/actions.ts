"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { completeOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

// 004 AC-4.1: the buyer says everything's OK, so the order completes and the
// seller is paid.
export async function confirmEverythingOk(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // RLS returns the order only to its buyer, seller and admins; only the buyer may confirm.
  const { data: order } = await supabase.from("orders").select("id, buyer_id, status").eq("id", id).maybeSingle();
  if (!order || order.buyer_id !== user.id || order.status !== "delivered") redirect(`/orders/${id}?error=confirm`);
  try {
    await completeOrder(id, "everything_ok");
  } catch (err) {
    // The order is complete; paying the seller is retried by the scheduled job.
    console.error(`Completing order ${id}:`, err);
  }
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}?confirmed=1`);
}
