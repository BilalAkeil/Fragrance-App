"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createIdCheck } from "@/lib/identity";
import { getCurrentSeller } from "@/lib/supabase/server";

// 005 AC-1.1: sends the seller to Stripe's hosted ID check.
export async function startIdCheck() {
  const { user, seller } = await getCurrentSeller();
  if (!user) redirect("/login?next=/account/verify");
  if (!seller) redirect("/account");
  if (seller.id_verified) redirect("/account/verify");
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let url: string;
  try {
    url = await createIdCheck(seller.id, user.email, origin);
  } catch (err) {
    console.error("Starting the ID check failed:", err);
    redirect("/account/verify?error=start");
  }
  redirect(url);
}
