import Link from "next/link";
import { redirect } from "next/navigation";
import { formatGBP } from "@fragrance/core";
import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentSeller } from "@/lib/supabase/server";
import { createSellerProfile, signOut } from "./actions";

const ERRORS: Record<string, string> = {
  name: "Choose a shop name between 2 and 40 characters.",
  save: "That name couldn't be saved. Please try again.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user, seller } = await getCurrentSeller();
  if (!user) redirect("/login");
  const { error } = await searchParams;

  const [listings, bottles] = seller
    ? await Promise.all([
        supabase
          .from("listings")
          .select("id, house, name, kind, size_ml, price_pence, status, receipt_rejected_reason")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("source_bottles")
          .select("id, house, name, size_ml, verified_at, rejected_reason")
          .eq("seller_id", user.id),
      ])
    : [null, null];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your account</h1>
        <form action={signOut}>
          <button className="text-sm opacity-70 hover:underline">Sign out</button>
        </form>
      </div>
      <p className="opacity-70">Signed in as {user.email}</p>

      {!seller ? (
        <form action={createSellerProfile} className="flex max-w-sm flex-col gap-3">
          <h2 className="text-lg font-semibold">Start selling</h2>
          <label className="flex flex-col gap-1 text-sm">
            Shop name
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={40}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
            />
          </label>
          {error && ERRORS[error] && <p className="text-sm text-red-700 dark:text-red-300">{ERRORS[error]}</p>}
          <button className="rounded-lg bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black">
            Create seller profile
          </button>
        </form>
      ) : (
        <>
          <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <h2 className="font-semibold">{seller.display_name}</h2>
            <p className="mt-1 text-sm">
              ID check:{" "}
              {seller.id_verified ? (
                <span className="text-emerald-700 dark:text-emerald-300">verified</span>
              ) : (
                <span className="opacity-70">not done yet (coming with payments)</span>
              )}
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/sell" className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
                Sell a fragrance
              </Link>
              <Link href="/sell/bottles" className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20">
                Register a bottle for decants
              </Link>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Your listings</h2>
            {listings?.data?.length ? (
              <ul className="divide-y divide-black/10 dark:divide-white/10">
                {listings.data.map((l) => (
                  <li key={l.id} className="flex justify-between py-2 text-sm">
                    <Link href={`/listings/${l.id}`} className="hover:underline">
                      {l.house} {l.name}, {l.size_ml}ml {l.kind}
                    </Link>
                    <span className="text-right">
                      {formatGBP(l.price_pence)} · {l.status}
                      {l.receipt_rejected_reason && (
                        <span className="block text-xs text-red-700 dark:text-red-300">
                          Receipt not approved: {l.receipt_rejected_reason}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-70">Nothing listed yet.</p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Bottles registered for decants</h2>
            {bottles?.data?.length ? (
              <ul className="divide-y divide-black/10 text-sm dark:divide-white/10">
                {bottles.data.map((b) => (
                  <li key={b.id} className="flex justify-between py-2">
                    <span>
                      {b.house} {b.name}, {b.size_ml}ml
                    </span>
                    <span className={b.rejected_reason ? "text-red-700 dark:text-red-300" : "opacity-70"}>
                      {b.verified_at
                        ? "Video checked"
                        : b.rejected_reason
                          ? `Not approved: ${b.rejected_reason}`
                          : "Waiting for video check"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-70">None yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
