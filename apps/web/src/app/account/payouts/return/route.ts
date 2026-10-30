import { NextResponse, type NextRequest } from "next/server";
import { syncPayoutsReady } from "@/lib/payouts";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

// Back from Stripe's onboarding. The webhook updates payouts_ready too; this
// makes the account page right straight away.
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
    if (seller?.stripe_account_id) await syncPayoutsReady(await stripe().accounts.retrieve(seller.stripe_account_id));
  }
  return NextResponse.redirect(new URL("/account?payouts=back#payouts", request.url));
}
