"use server";

import { redirect } from "next/navigation";
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
