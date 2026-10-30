import Link from "next/link";
import { redirect } from "next/navigation";
import { idCheckOutcome, type IdCheckOutcome, type IdCheckStatus } from "@fragrance/core";
import { NotConnected } from "@/components/NotConnected";
import { buttonPrimary, buttonSecondary, pageTitle, panel } from "@/components/ui";
import { stripeConfigured } from "@/lib/stripe";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentSeller } from "@/lib/supabase/server";
import { startIdCheck } from "./actions";

export const dynamic = "force-dynamic";

// 005 US-1: "Verify your ID", before someone's first listing or swap.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user, seller } = await getCurrentSeller();
  if (!user) redirect("/login?next=/account/verify");
  if (!seller) redirect("/account");
  const { error } = await searchParams;

  const { data: check } = await supabase
    .from("id_checks")
    .select("status, error_code")
    .eq("seller_id", seller.id)
    .maybeSingle();
  // An admin can also verify someone by hand (009), without a Stripe check.
  const outcome: IdCheckOutcome = seller.id_verified
    ? idCheckOutcome("verified")
    : idCheckOutcome((check?.status as IdCheckStatus) ?? "not_started", check?.error_code);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/account" className="text-sm font-bold text-brand underline">
          Your account
        </Link>
        <h1 className={pageTitle}>Verify your ID</h1>
      </div>
      {error === "start" && (
        <p className="text-sm text-danger">Stripe couldn&apos;t start the check. Please try again in a few minutes.</p>
      )}
      <IdCheckPanel outcome={outcome} />
    </div>
  );
}

function IdCheckPanel({ outcome }: { outcome: IdCheckOutcome }) {
  switch (outcome.screen) {
    case "verified":
      return (
        <section className={`${panel} flex flex-col gap-4`}>
          <h2 className="text-lg font-extrabold text-verified">Your ID is verified</h2>
          <p className="text-sm text-muted">You can list fragrances and register bottles for decants.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sell" className={buttonPrimary}>
              Sell a fragrance
            </Link>
            <Link href="/account" className={buttonSecondary}>
              Back to your account
            </Link>
          </div>
        </section>
      );
    case "in_progress":
      return (
        <section className={`${panel} flex flex-col gap-4`}>
          <h2 className="text-lg font-extrabold">We&apos;re checking your ID</h2>
          <p className="text-sm text-muted">
            This usually takes a minute or two. You can leave this page: your account shows the result when it&apos;s
            done.
          </p>
          <div>
            <Link href="/account/verify" className={buttonSecondary}>
              Check again
            </Link>
          </div>
        </section>
      );
    case "needs_input":
    case "failed":
      return (
        <section className={`${panel} flex flex-col gap-4`}>
          <h2 className="text-lg font-extrabold">
            {outcome.screen === "failed" ? "We couldn't verify your ID" : "Stripe needs more information"}
          </h2>
          <p className="text-sm">{outcome.message}</p>
          {outcome.canRetry ? <StartButton label="Try again" /> : <p className="text-sm text-muted">If you think this is wrong, contact us.</p>}
        </section>
      );
    case "not_started":
      return (
        <section className={`${panel} flex flex-col gap-4`}>
          <h2 className="text-lg font-extrabold">Before you list or swap</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
            <li>
              <span className="font-bold">Why we ask:</span> every seller and swapper proves who they are, so buyers know
              they&apos;re dealing with a real person. It helps keep fakes and scammers out.
            </li>
            <li>
              <span className="font-bold">How long it takes:</span> a few minutes. You&apos;ll need a passport, driving
              licence or national ID card, and your phone&apos;s camera for a selfie.
            </li>
            <li>
              <span className="font-bold">Your document:</span> the check is done by our payments partner, Stripe. We
              don&apos;t keep a copy of your document or selfie, only whether the check passed.
            </li>
            <li>You must be 18 or over. Buying never needs an ID check.</li>
          </ul>
          <StartButton label="Verify my ID" />
        </section>
      );
  }
}

function StartButton({ label }: { label: string }) {
  if (!stripeConfigured) {
    return <p className="text-sm text-muted">The ID check needs the Stripe keys, which aren&apos;t set on this site yet.</p>;
  }
  return (
    <form action={startIdCheck}>
      <button className={buttonPrimary}>{label}</button>
    </form>
  );
}
