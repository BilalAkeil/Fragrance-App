"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Takes the listing off the marketplace. RLS only lets the owner do this, and
// only while the listing is active.
export async function removeListing(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("listings")
    .update({ status: "removed" })
    .eq("id", id)
    .eq("seller_id", user.id)
    .eq("status", "active")
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("This listing can't be removed.");

  revalidatePath("/");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/account");
  redirect("/account?removed=1");
}
