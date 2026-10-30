import "server-only";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { UNDER_AGE_CODE, isAdult, type IdCheckStatus } from "@fragrance/core";
import { stripe, stripeIdentityResults } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentSeller } from "@/lib/supabase/server";

// The ID check before listing or swapping (005 US-1), with Stripe Identity:
// a photo ID and a matching selfie (plan Q-5). Stripe keeps the document; we
// keep only the outcome. Only server code writes id_checks and id_verified (R-1).

// A hosted Identity check for this seller, recorded as their latest.
export async function createIdCheck(sellerId: string, email: string | undefined, origin: string): Promise<string> {
  const session = await stripe().identity.verificationSessions.create(
    {
      type: "document",
      options: { document: { require_matching_selfie: true } },
      provided_details: email ? { email } : undefined,
      client_reference_id: sellerId,
      metadata: { seller_id: sellerId },
      return_url: `${origin}/account/verify/return`,
    },
    // Stops a double click making two sessions. Changes each minute, because
    // Stripe replays a failed request's error for the same key for 24 hours.
    { idempotencyKey: `id-check-${sellerId}-${Math.floor(Date.now() / 60_000)}` },
  );
  const { error } = await createServiceClient()
    .from("id_checks")
    .upsert({
      seller_id: sellerId,
      status: "not_started",
      stripe_verification_session_id: session.id,
      error_code: null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`Saving the ID check: ${error.message}`);
  if (!session.url) throw new Error(`Session ${session.id} has no URL`);
  return session.url;
}

// What a session means for the seller. `dob` is undefined when it wasn't read
// (development without the results key).
function checkFromSession(
  session: Stripe.Identity.VerificationSession,
  dob: Stripe.Identity.VerificationSession.VerifiedOutputs.Dob | null | undefined,
  now = new Date(),
): { status: IdCheckStatus; errorCode: string | null } {
  switch (session.status) {
    case "processing":
      return { status: "pending", errorCode: null };
    case "verified": {
      if (dob === undefined) return { status: "verified", errorCode: null };
      // Q-6 (plan): 18 or over, from the date of birth on their document.
      if (!dob?.day || !dob.month || !dob.year) return { status: "needs_input", errorCode: "dob_missing" };
      if (!isAdult({ day: dob.day, month: dob.month, year: dob.year }, now)) {
        return { status: "needs_input", errorCode: UNDER_AGE_CODE };
      }
      return { status: "verified", errorCode: null };
    }
    case "requires_input":
      // A new session waits for input with no error until they've tried.
      return session.last_error
        ? { status: "needs_input", errorCode: session.last_error.code ?? "unknown" }
        : { status: "not_started", errorCode: null };
    default:
      // Cancelled: they can start again.
      return { status: "not_started", errorCode: null };
  }
}

// The date of birth from a verified session. Only a restricted key can read it
// (docs/setup/stripe.md). Without one, development skips the age check and
// production refuses, so the webhook is retried once the key is set.
async function verifiedDob(sessionId: string) {
  const client = stripeIdentityResults();
  if (!client) {
    if (process.env.NODE_ENV === "production") throw new Error("STRIPE_IDENTITY_RESULTS_KEY isn't set");
    console.warn(`ID check ${sessionId}: age not checked, because STRIPE_IDENTITY_RESULTS_KEY isn't set`);
    return undefined;
  }
  const session = await client.identity.verificationSessions.retrieve(sessionId, {
    expand: ["verified_outputs", "verified_outputs.dob"],
  });
  return session.verified_outputs?.dob ?? null;
}

// The Identity webhooks and the return page: reads the session from Stripe and
// records the outcome, so events arriving late or out of order do no harm.
// Only the seller's latest session counts.
export async function syncIdCheck(sessionId: string): Promise<IdCheckStatus | undefined> {
  const db = createServiceClient();
  const { data: check } = await db
    .from("id_checks")
    .select("seller_id, status")
    .eq("stripe_verification_session_id", sessionId)
    .maybeSingle();
  if (!check) return undefined;
  // Verified is final for a session.
  if (check.status === "verified") return "verified";

  const session = await stripe().identity.verificationSessions.retrieve(sessionId);
  const dob = session.status === "verified" ? await verifiedDob(sessionId) : undefined;
  const { status, errorCode } = checkFromSession(session, dob);
  const { error } = await db
    .from("id_checks")
    .update({ status, error_code: errorCode, updated_at: new Date().toISOString() })
    .eq("seller_id", check.seller_id)
    .eq("stripe_verification_session_id", sessionId);
  if (error) throw new Error(`Updating the ID check for ${sessionId}: ${error.message}`);
  if (status === "verified") {
    const { error: sellerError } = await db.from("sellers").update({ id_verified: true }).eq("id", check.seller_id);
    if (sellerError) throw new Error(`Verifying seller ${check.seller_id}: ${sellerError.message}`);
  }
  return status;
}

// R-2, AC-1.1: listing, registering a bottle and swapping need a verified ID.
// Sends anyone else to sign in, set up a shop, or verify.
export async function requireVerifiedSeller() {
  const current = await getCurrentSeller();
  if (!current.user) redirect("/login");
  if (!current.seller) redirect("/account");
  if (!current.seller.id_verified) redirect("/account/verify");
  return { ...current, user: current.user, seller: current.seller };
}
