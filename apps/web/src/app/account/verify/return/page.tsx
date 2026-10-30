import Link from "next/link";
import { redirect } from "next/navigation";
import { NotConnected } from "@/components/NotConnected";
import { buttonSecondary, pageTitle, panel } from "@/components/ui";
import { syncIdCheck } from "@/lib/identity";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentSeller } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 005 AC-1.2: Stripe sends the seller back here. Shows "Checking…" and looks
// again every few seconds until the result is in, then goes to the result.
export default async function VerifyReturnPage() {
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user, seller } = await getCurrentSeller();
  if (!user) redirect("/login?next=/account/verify");
  if (!seller) redirect("/account");

  const { data: check } = await supabase
    .from("id_checks")
    .select("status, stripe_verification_session_id")
    .eq("seller_id", seller.id)
    .maybeSingle();
  let status = check?.status;
  // Asks Stripe directly too, in case the webhook hasn't landed yet.
  if (check?.stripe_verification_session_id && status !== "verified") {
    status = (await syncIdCheck(check.stripe_verification_session_id).catch(() => undefined)) ?? status;
  }
  if (status !== "pending") redirect("/account/verify");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <meta httpEquiv="refresh" content="3" />
      <h1 className={pageTitle}>Verify your ID</h1>
      <section className={`${panel} flex flex-col gap-4`} aria-live="polite">
        <h2 className="text-lg font-extrabold">Checking…</h2>
        <p className="text-sm text-muted">
          Stripe is checking your document and selfie. This page updates by itself, usually within a minute.
        </p>
        <div>
          <Link href="/account" className={buttonSecondary}>
            Back to your account
          </Link>
        </div>
      </section>
    </div>
  );
}
