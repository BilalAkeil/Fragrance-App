import { NextResponse, type NextRequest } from "next/server";
import { onboardingLink } from "@/lib/payouts";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

// Stripe sends the seller here when an onboarding link has expired: make a new one.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { data: seller } = await createServiceClient()
    .from("sellers")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!seller?.stripe_account_id) return NextResponse.redirect(new URL("/account#payouts", request.url));
  return NextResponse.redirect(await onboardingLink(seller.stripe_account_id, request.nextUrl.origin));
}
