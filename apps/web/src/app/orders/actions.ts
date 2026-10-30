"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { REVIEW_TEXT_MAX, canReview, isRating, orderEndedAt } from "@fragrance/core";
import { getOrder, getOrderReview } from "@fragrance/api";
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

// 005 AC-2.1, AC-2.2: the buyer rates the seller once the order is finished.
// The database checks the same rules (R-5): their order, completed or refunded
// after a dispute, within the window, and only once.
export async function submitReview(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  const rating = Number(formData.get("rating"));
  const text = String(formData.get("text") ?? "").trim();
  if (!isRating(rating)) redirect(`/orders/${id}?review=rating#review`);
  if (text.length > REVIEW_TEXT_MAX) redirect(`/orders/${id}?review=long#review`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/orders/${id}`);
  const order = await getOrder(supabase, id);
  const allowed =
    order?.buyerId === user.id &&
    canReview({
      status: order.status,
      endedAt: orderEndedAt(order),
      alreadyReviewed: Boolean(await getOrderReview(supabase, id)),
      now: new Date(),
    });
  if (!order || !allowed) redirect(`/orders/${id}?review=closed#review`);

  const { error } = await supabase.from("reviews").insert({ order_id: id, reviewee_id: order.sellerId, rating, text });
  if (error) {
    console.error(`Reviewing order ${id}:`, error);
    redirect(`/orders/${id}?review=${error.code === "23505" ? "closed" : "error"}#review`);
  }
  revalidatePath(`/sellers/${order.sellerId}`);
  revalidatePath(`/orders/${id}`);
  redirect(`/orders/${id}?review=thanks#review`);
}
