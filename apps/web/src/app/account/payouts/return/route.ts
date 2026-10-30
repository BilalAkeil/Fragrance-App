import { NextResponse, type NextRequest } from "next/server";
import { syncSellerAccount } from "@/lib/payouts";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

// Back from Stripe's onboarding. The webhook updates payouts and the ID check
// too; this makes the pages right straight away. Someone who isn't verified yet
// goes back to "Verify your ID" (005 AC-1.2).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: seller } = await createServiceClient()
      .from("sellers")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();
    if (seller?.stripe_account_id) await syncSellerAccount(seller.stripe_account_id);
    const { data: after } = await supabase.from("sellers").select("id_verified").eq("id", user.id).maybeSingle();
    if (after && !after.id_verified) return NextResponse.redirect(new URL("/account/verify", request.url));
  }
  return NextResponse.redirect(new URL("/account?payouts=back#payouts", request.url));
}
