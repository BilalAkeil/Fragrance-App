import Link from "next/link";
import { CONCENTRATION_LABELS, CONCENTRATIONS, catalogueNameMatches, formatGBP, type Concentration } from "@fragrance/core";
import { inputClass } from "@/components/Field";
import { buttonPrimary, buttonSecondary, pageTitle, panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { addFragrance, addHouse, updateHouse } from "./actions";

const ERRORS: Record<string, string> = {
  house: "Give the house a name.",
  fragrance: "A fragrance needs a house, a name and a concentration.",
  duplicate: "That's already in the catalogue.",
  save: "That didn't save. Please try again.",
};

interface HouseWithFragrances {
  id: string;
  name: string;
  aliases: string[];
  fragrances: {
    id: string;
    name: string;
    concentration: Concentration;
    launch_year: number | null;
    aliases: string[];
    fragrance_sizes: { size_ml: number; guide_price_pence: number }[];
  }[];
}

export default async function AdminCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; added?: string }>;
}) {
  const { q = "", error, added } = await searchParams;
  const supabase = await createClient();
  const [{ data }, unmatchedListings, unmatchedBottles] = await Promise.all([
    supabase
      .from("houses")
      .select("id, name, aliases, fragrances(id, name, concentration, launch_year, aliases, fragrance_sizes(size_ml, guide_price_pence))")
      .order("name"),
    supabase.from("listings").select("id", { count: "exact", head: true }).is("fragrance_id", null).eq("status", "active"),
    supabase.from("source_bottles").select("id", { count: "exact", head: true }).is("fragrance_id", null),
  ]);
  const houses = (data ?? []) as unknown as HouseWithFragrances[];
  const unmatched = (unmatchedListings.count ?? 0) + (unmatchedBottles.count ?? 0);

  // The whole catalogue is small enough to filter here for now.
  const query = q.trim();
  const shown = houses
    .map((h) => {
      const houseMatches = !query || catalogueNameMatches(query, h.name, h.aliases);
      const fragrances = h.fragrances
        .filter((f) => houseMatches || catalogueNameMatches(query, f.name, f.aliases))
        .sort((a, b) => a.name.localeCompare(b.name) || a.concentration.localeCompare(b.concentration));
      return { ...h, fragrances, show: houseMatches || fragrances.length > 0 };
    })
    .filter((h) => h.show);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Catalogue</h1>
          <p className="text-muted">Houses, fragrances and the guide prices swaps are valued with.</p>
        </div>
        <Link href="/admin/catalogue/unmatched" className={buttonSecondary}>
          Unmatched ({unmatched})
        </Link>
      </div>

      {error && ERRORS[error] && <p className="text-sm text-danger">{ERRORS[error]}</p>}
      {added && <p className="text-sm text-verified">Added {added}.</p>}

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search houses and fragrances" className={`${inputClass} flex-1`} />
        <button className={buttonSecondary}>Search</button>
      </form>

      {shown.length === 0 ? (
        <p className="text-muted">{query ? "Nothing in the catalogue matches that." : "The catalogue is empty."}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((h) => (
            <section key={h.id} className={panel}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-2">
                  <h2 className="text-lg font-extrabold">{h.name}</h2>
                  {h.aliases.length > 0 && <span className="text-sm text-muted">also {h.aliases.join(", ")}</span>}
                  <span className="text-xs font-bold text-brand underline">Edit</span>
                </summary>
                <form action={updateHouse} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
                  <input type="hidden" name="id" value={h.id} />
                  <label className="flex flex-col gap-1 font-bold">
                    Name
                    <input name="name" defaultValue={h.name} required className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1 font-bold">
                    Other names (commas between)
                    <input name="aliases" defaultValue={h.aliases.join(", ")} className={inputClass} />
                  </label>
                  <button className={buttonSecondary}>Save house</button>
                </form>
              </details>
              {h.fragrances.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No fragrances yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {h.fragrances.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                      <Link href={`/admin/catalogue/${f.id}`} className="font-semibold text-brand underline">
                        {f.name}
                      </Link>
                      <span className="text-sm text-muted">
                        {CONCENTRATION_LABELS[f.concentration]}
                        {f.launch_year ? `, ${f.launch_year}` : ""}
                        {" · "}
                        {f.fragrance_sizes.length === 0
                          ? "no guide price"
                          : [...f.fragrance_sizes]
                              .sort((a, b) => a.size_ml - b.size_ml)
                              .map((s) => `${s.size_ml}ml ${formatGBP(s.guide_price_pence)}`)
                              .join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <form action={addHouse} className={`${panel} flex flex-col gap-3 text-sm`}>
          <h2 className="text-lg font-extrabold">Add a house</h2>
          <label className="flex flex-col gap-1 font-bold">
            Name
            <input name="name" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Other names (optional, commas between)
            <input name="aliases" className={inputClass} />
          </label>
          <button className={buttonPrimary}>Add house</button>
        </form>

        <form action={addFragrance} className={`${panel} flex flex-col gap-3 text-sm`}>
          <h2 className="text-lg font-extrabold">Add a fragrance</h2>
          <label className="flex flex-col gap-1 font-bold">
            House
            <select name="houseId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Choose a house
              </option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Name
            <input name="name" required className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 font-bold">
              Concentration
              <select name="concentration" required defaultValue="edp" className={inputClass}>
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
          </div>
          <label className="flex flex-col gap-1 font-bold">
            Other names (optional, commas between)
            <input name="aliases" className={inputClass} />
          </label>
          <button className={buttonPrimary}>Add fragrance</button>
          <p className="text-muted">You add its sizes and guide prices on the next page.</p>
        </form>
      </div>
    </div>
  );
}
