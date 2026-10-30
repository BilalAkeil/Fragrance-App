"use server";

import { redirect } from "next/navigation";
import { isUkPostcode, normalisePostcode } from "@fragrance/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSellerProfile(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName.length < 2 || displayName.length > 40) {
    redirect("/account?error=name");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("sellers").insert({ id: user.id, display_name: displayName });
  if (error) redirect("/account?error=save");
  revalidatePath("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// 004: where the seller posts from, for delivery quotes. Only they can see it.
export async function setDispatchPostcode(formData: FormData) {
  const postcode = String(formData.get("postcode") ?? "");
  if (!isUkPostcode(postcode)) redirect("/account?postcode=invalid#payouts");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase
    .from("seller_settings")
    .upsert({ seller_id: user.id, dispatch_postcode: normalisePostcode(postcode), updated_at: new Date().toISOString() });
  if (error) redirect("/account?postcode=invalid#payouts");
  revalidatePath("/account");
  redirect("/account?postcode=saved#payouts");
}
