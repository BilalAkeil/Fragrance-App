import Link from "next/link";
import { redirect } from "next/navigation";
import { formatGBP } from "@fragrance/core";
import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { inputClass } from "@/components/Field";
import { buttonPrimary, buttonSecondary, pageTitle, panel } from "@/components/ui";
import { getCurrentSeller } from "@/lib/supabase/server";
import { createSellerProfile, signOut } from "./actions";

const ERRORS: Record<string, string> = {
  name: "Choose a shop name between 2 and 40 characters.",
  save: "That name couldn't be saved. Please try again.",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user, seller } = await getCurrentSeller();
  if (!user) redirect("/login");
  const { error } = await searchParams;

  const [listings, bottles, rejections] = seller
    ? await Promise.all([
        supabase
          .from("listings")
          .select("id, house, name, kind, size_ml, price_pence, status, receipt_path")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("source_bottles")
          .select("id, house, name, size_ml, verified_at, video_path")
          .eq("seller_id", user.id),
        // Only the seller and admins can read these.
        supabase
          .from("review_decisions")
          .select("item_type, item_id, item_path, reason")
          .eq("seller_id", user.id)
          .eq("approved", false)
          .order("decided_at"),
      ])
    : [null, null, null];

  // A rejection only applies to the file it was made on. Later ones overwrite earlier ones.
  const reasons = new Map(
    (rejections?.data ?? []).map((r) => [`${r.item_type}:${r.item_id}:${r.item_path}`, r.reason as string]),
  );
  const rejectedReason = (type: "bottle" | "receipt", id: string, path: string | null) =>
    path ? reasons.get(`${type}:${id}:${path}`) : undefined;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className={pageTitle}>Your account</h1>
        <form action={signOut}>
          <button className="text-sm text-muted hover:underline">Sign out</button>
        </form>
      </div>
      <p className="text-muted">Signed in as {user.email}</p>

      {!seller ? (
        <form action={createSellerProfile} className="flex max-w-sm flex-col gap-3">
          <h2 className="text-lg font-extrabold">Start selling</h2>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Shop name
            <input name="displayName" required minLength={2} maxLength={40} className={`${inputClass} font-normal`} />
          </label>
          {error && ERRORS[error] && <p className="text-sm text-danger">{ERRORS[error]}</p>}
          <button className={buttonPrimary}>Create seller profile</button>
        </form>
      ) : (
        <>
          <section className={panel}>
            <h2 className="text-lg font-extrabold">{seller.display_name}</h2>
            <p className="mt-1 text-sm">
              ID check:{" "}
              {seller.id_verified ? (
                <span className="font-semibold text-verified">verified</span>
              ) : (
                <span className="text-muted">not done yet (coming with payments)</span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/sell" className={buttonPrimary}>
                Sell a fragrance
              </Link>
              <Link href="/sell/bottles" className={buttonSecondary}>
                Register a bottle for decants
              </Link>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-extrabold">Your listings</h2>
            {listings?.data?.length ? (
              <ul className="divide-y divide-line">
                {listings.data.map((l) => {
                  const receiptReason = rejectedReason("receipt", l.id, l.receipt_path);
                  return (
                    <li key={l.id} className="flex justify-between py-2 text-sm">
                      <Link href={`/listings/${l.id}`} className="hover:underline">
                        {l.house} {l.name}, {l.size_ml}ml {l.kind}
                      </Link>
                      <span className="text-right">
                        {formatGBP(l.price_pence)} · {l.status}
                        {receiptReason && (
                          <span className="block text-xs text-danger">Receipt not approved: {receiptReason}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing listed yet.</p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-extrabold">Bottles registered for decants</h2>
            {bottles?.data?.length ? (
              <ul className="divide-y divide-line text-sm">
                {bottles.data.map((b) => {
                  const bottleReason = rejectedReason("bottle", b.id, b.video_path);
                  return (
                    <li key={b.id} className="flex justify-between py-2">
                      <span>
                        {b.house} {b.name}, {b.size_ml}ml
                      </span>
                      <span
                        className={
                          b.verified_at ? "font-semibold text-verified" : bottleReason ? "text-danger" : "text-muted"
                        }
                      >
                        {b.verified_at
                          ? "Video checked"
                          : bottleReason
                            ? `Not approved: ${bottleReason}`
                            : "Waiting for video check"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">None yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
