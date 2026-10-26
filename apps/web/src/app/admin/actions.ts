"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function decisionFrom(formData: FormData) {
  return {
    id: String(formData.get("id") ?? ""),
    approve: formData.get("decision") === "approve",
    reason: String(formData.get("reason") ?? "").trim() || null,
  };
}

async function review(fn: "admin_review_bottle" | "admin_review_receipt", formData: FormData) {
  const { id, approve, reason } = decisionFrom(formData);
  if (!approve && !reason) redirect(`/admin?error=reason&item=${formData.get("item")}`);
  const supabase = await createClient();
  const key = fn === "admin_review_bottle" ? "bottle_id" : "listing_id";
  const { error } = await supabase.rpc(fn, { [key]: id, approve, reason });
  if (error) redirect(`/admin?error=save&item=${formData.get("item")}`);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function reviewBottle(formData: FormData) {
  await review("admin_review_bottle", formData);
}

export async function reviewReceipt(formData: FormData) {
  await review("admin_review_receipt", formData);
}

export async function setIdVerified(formData: FormData) {
  const supabase = await createClient();
  await supabase.rpc("admin_set_id_verified", {
    target_seller: String(formData.get("id")),
    verified: formData.get("verified") === "true",
  });
  revalidatePath("/admin/sellers");
}
