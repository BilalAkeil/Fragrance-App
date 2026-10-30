import Link from "next/link";
import { CONCENTRATION_LABELS, CONCENTRATIONS, formatGBP } from "@fragrance/core";
import { CataloguePicker } from "@/components/CataloguePicker";
import { inputClass } from "@/components/Field";
import { KIND_LABELS } from "@/components/labels";
import { buttonPrimary, buttonSecondary, pageTitle, panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { addAndMatch, matchItem } from "../actions";

const ERRORS: Record<string, string> = {
  pick: "Pick a fragrance from the suggestions first.",
  fragrance: "A new fragrance needs a house, a name and a concentration.",
  duplicate: "That fragrance is already in the catalogue. Match to it instead.",
  save: "That didn't save. Please try again.",
};

interface QueueItem {
  type: "listing" | "bottle";
  id: string;
  house: string;
  name: string;
  detail: string;
  sellerId: string;
  createdAt: string;
  href?: string;
}

// Listings and bottles that sellers typed in because they weren't in the catalogue (AC-3.2).
export default async function UnmatchedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; item?: string; matched?: string }>;
}) {
  const { error, item, matched } = await searchParams;
  const supabase = await createClient();
  const [{ data: listings }, { data: bottles }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, seller_id, house, name, kind, size_ml, price_pence, created_at")
      .is("fragrance_id", null)
      .eq("status", "active")
      .order("created_at")
      .limit(100),
    supabase
      .from("source_bottles")
      .select("id, seller_id, house, name, size_ml, created_at")
      .is("fragrance_id", null)
      .order("created_at")
      .limit(100),
  ]);

  const queue: QueueItem[] = [
    ...(listings ?? []).map((l) => ({
      type: "listing" as const,
      id: l.id,
      house: l.house,
      name: l.name,
      detail: `${KIND_LABELS[l.kind as keyof typeof KIND_LABELS]}, ${l.size_ml}ml, ${formatGBP(l.price_pence)}`,
      sellerId: l.seller_id,
      createdAt: l.created_at,
      href: `/listings/${l.id}`,
    })),
    ...(bottles ?? []).map((b) => ({
      type: "bottle" as const,
      id: b.id,
      house: b.house,
      name: b.name,
      detail: `Source bottle, ${b.size_ml}ml`,
      sellerId: b.seller_id,
      createdAt: b.created_at,
    })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const sellerIds = [...new Set(queue.map((q) => q.sellerId))];
  const { data: sellers } = sellerIds.length
    ? await supabase.from("sellers").select("id, display_name").in("id", sellerIds)
    : { data: [] };
  const shopOf = new Map((sellers ?? []).map((s) => [s.id, s.display_name as string]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogue" className="text-sm font-bold text-brand underline">
          Catalogue
        </Link>
        <h1 className={pageTitle}>Unmatched</h1>
        <p className="text-muted">
          Sellers typed these in because they couldn&apos;t find them. Match each one to the catalogue, or add it.
        </p>
      </div>
      {matched && <p className="text-sm text-verified">Matched.</p>}

      {queue.length === 0 ? (
        <p className="text-muted">Nothing waiting. Every listing and bottle is matched.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {queue.map((q) => (
            <li key={q.id} className={`${panel} flex flex-col gap-4`}>
              <div>
                <p className="text-lg font-extrabold">
                  {q.house} {q.name}
                </p>
                <p className="text-sm text-muted">
                  {q.detail} · {shopOf.get(q.sellerId) ?? "Unknown shop"} ·{" "}
                  {new Date(q.createdAt).toLocaleDateString("en-GB")}
                  {q.href && (
                    <>
                      {" · "}
                      <Link href={q.href} className="font-bold text-brand underline">
                        View listing
                      </Link>
                    </>
                  )}
                </p>
                {item === q.id && error && ERRORS[error] && <p className="mt-1 text-sm text-danger">{ERRORS[error]}</p>}
              </div>

              <form action={matchItem} className="grid items-end gap-3 text-sm sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="itemType" value={q.type} />
                <input type="hidden" name="itemId" value={q.id} />
                <CataloguePicker allowTyping={false} fragranceLabel="Match to" />
                <button className={buttonPrimary}>Match</button>
              </form>

              <details className="text-sm">
                <summary className="cursor-pointer font-bold text-brand underline">Not in the catalogue? Add it</summary>
                <form action={addAndMatch} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="itemType" value={q.type} />
                  <input type="hidden" name="itemId" value={q.id} />
                  <label className="flex flex-col gap-1 font-bold">
                    House (a new one is added if needed)
                    <input name="house" defaultValue={q.house} required className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1 font-bold">
                    Name
                    <input name="name" defaultValue={q.name} required className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1 font-bold">
                    Concentration
                    <select name="concentration" defaultValue="edp" className={inputClass}>
                      {CONCENTRATIONS.map((c) => (
                        <option key={c} value={c}>
                          {CONCENTRATION_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 font-bold">
                    Launch year (optional)
                    <input name="launchYear" type="number" min={1700} max={2100} className={inputClass} />
                  </label>
                  <div>
                    <button className={buttonSecondary}>Add and match</button>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
