import { createClient } from "@/lib/supabase/server";
import { setIdVerified } from "../actions";

export default async function AdminSellersPage() {
  const supabase = await createClient();
  const [{ data: sellers }, { data: ratings }] = await Promise.all([
    supabase.from("sellers").select("id, display_name, id_verified, created_at").order("created_at", { ascending: false }),
    supabase.from("seller_ratings").select("seller_id, review_count, average_rating"),
  ]);
  const ratingFor = new Map((ratings ?? []).map((r) => [r.seller_id, r]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Sellers</h1>
        <p className="opacity-70">
          Mark a seller as ID checked by hand for now. This moves to an automatic Stripe check once payments are set up.
        </p>
      </div>
      {!sellers?.length ? (
        <p className="opacity-70">No sellers yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/5 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Reviews</th>
                <th className="px-4 py-3">ID check</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((s) => {
                const r = ratingFor.get(s.id);
                return (
                  <tr key={s.id} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-4 py-3 font-semibold">{s.display_name}</td>
                    <td className="px-4 py-3">{new Date(s.created_at).toLocaleDateString("en-GB")}</td>
                    <td className="px-4 py-3">
                      {r ? `${Number(r.average_rating).toFixed(1)} stars from ${r.review_count}` : "None yet"}
                    </td>
                    <td className="px-4 py-3">
                      <form action={setIdVerified} className="flex items-center gap-3">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="verified" value={s.id_verified ? "false" : "true"} />
                        <span className={s.id_verified ? "font-semibold text-[#0B6B5E]" : "opacity-70"}>
                          {s.id_verified ? "Verified" : "Not checked"}
                        </span>
                        <button className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-bold dark:border-white/20">
                          {s.id_verified ? "Undo" : "Mark verified"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
