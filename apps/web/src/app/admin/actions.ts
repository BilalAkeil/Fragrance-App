"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function decisionFrom(formData: FormData) {
  return {
    id: String(formData.get("id") ?? ""),
    approve: formData.get("decision") === "approve",
    seenPath: String(formData.get("path") ?? ""),
    reason: String(formData.get("reason") ?? "").trim() || null,
  };
}

async function review(fn: "admin_review_bottle" | "admin_review_receipt", formData: FormData) {
  const { id, approve, seenPath, reason } = decisionFrom(formData);
  if (!approve && !reason) redirect(`/admin?error=reason&item=${formData.get("item")}`);
  const supabase = await createClient();
  const key = fn === "admin_review_bottle" ? "bottle_id" : "listing_id";
  const { error } = await supabase.rpc(fn, {
    [key]: id,
    approve,
    seen_path: seenPath,
    reason,
  });
  if (error) {
    // The database refuses if the seller swapped the file after the admin opened it.
    const changed = error.message.includes("uploaded a new");
    redirect(`/admin?error=${changed ? "changed" : "save"}&item=${formData.get("item")}`);
  }
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
  const { error } = await supabase.rpc("admin_set_id_verified", {
    target_seller: String(formData.get("id")),
    verified: formData.get("verified") === "true",
  });
  if (error) redirect("/admin/sellers?error=save");
  revalidatePath("/admin/sellers");
}
