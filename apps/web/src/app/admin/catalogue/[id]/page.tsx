import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CONCENTRATION_LABELS,
  CONCENTRATIONS,
  formatGBP,
  guidePricePerMl,
  type Concentration,
} from "@fragrance/core";
import { inputClass } from "@/components/Field";
import { buttonPrimary, buttonSecondary, pageTitle, panel } from "@/components/ui";
import { marketplace } from "@/lib/marketplace";
import { createClient } from "@/lib/supabase/server";
import { mergeFragrance, setSize, updateFragrance } from "../actions";

const ERRORS: Record<string, string> = {
  fragrance: "A fragrance needs a name and a concentration.",
  duplicate: "That house already has a fragrance with this name and concentration.",
  size: "Enter the size as a whole number of ml.",
  price: "Enter a guide price above £0.",
  merge: "Those couldn't be merged. Pick a different fragrance and try again.",
  save: "That didn't save. Please try again.",
};

const pounds = (pence: number) => (pence / 100).toFixed(2);

export default async function AdminFragrancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; merged?: string; added?: string }>;
}) {
  const { id } = await params;
  const { error, saved, merged, added } = await searchParams;
  const supabase = await createClient();

  const { data: fragrance } = await supabase
    .from("fragrances")
    .select("id, name, concentration, launch_year, aliases, houses(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!fragrance) notFound();
  const house = fragrance.houses as unknown as { id: string; name: string };
  const concentration = fragrance.concentration as Concentration;

  const [sizes, { data: others }, { count: listingCount }] = await Promise.all([
    marketplace.getFragranceSizes(id),
    supabase.from("fragrances").select("id, name, concentration, houses(name)").neq("id", id).order("name"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("fragrance_id", id),
  ]);
  const { data: history } = sizes.length
    ? await supabase
        .from("guide_price_changes")
        .select("id, size_id, old_pence, new_pence, changed_by, changed_at")
        .in("size_id", sizes.map((s) => s.id))
        .order("changed_at", { ascending: false })
    : { data: [] };
  const changers = [...new Set((history ?? []).map((h) => h.changed_by).filter(Boolean))] as string[];
  const { data: changerNames } = changers.length
    ? await supabase.from("sellers").select("id, display_name").in("id", changers)
    : { data: [] };
  const nameOf = new Map((changerNames ?? []).map((s) => [s.id, s.display_name as string]));
  const sizeOf = new Map(sizes.map((s) => [s.id, s.sizeMl]));
  const perMl = guidePricePerMl(sizes);
  const otherOptions = (others ?? [])
    .map((o) => ({
      id: o.id as string,
      label: `${(o.houses as unknown as { name: string }).name} ${o.name} (${CONCENTRATION_LABELS[o.concentration as Concentration]})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogue" className="text-sm font-bold text-brand underline">
          Catalogue
        </Link>
        <h1 className={pageTitle}>
          {house.name} {fragrance.name}
        </h1>
        <p className="text-muted">
          {CONCENTRATION_LABELS[concentration]}
          {fragrance.launch_year ? `, ${fragrance.launch_year}` : ""} · {listingCount ?? 0} listings matched
        </p>
      </div>

      {error && ERRORS[error] && <p className="text-sm text-danger">{ERRORS[error]}</p>}
      {saved && <p className="text-sm text-verified">Saved.</p>}
      {merged && <p className="text-sm text-verified">Merged. Its listings and bottles are now on this entry.</p>}
      {added && <p className="text-sm text-verified">Added and matched. Now give it a size and guide price.</p>}

      <section className={`${panel} flex flex-col gap-4`}>
        <h2 className="text-lg font-extrabold">Sizes and guide prices</h2>
        {sizes.length === 0 ? (
          <p className="text-sm text-muted">No sizes yet, so listings of this fragrance have no guide value.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sizes.map((s) => (
              <li key={s.id}>
                <form action={setSize} className="flex flex-wrap items-center gap-3 text-sm">
                  <input type="hidden" name="fragranceId" value={id} />
                  <input type="hidden" name="sizeMl" value={s.sizeMl} />
                  <span className="w-16 font-bold">{s.sizeMl}ml</span>
                  <label className="flex items-center gap-2">
                    £
                    <input
                      name="guidePrice"
                      inputMode="decimal"
                      defaultValue={pounds(s.guidePricePence)}
                      aria-label={`Guide price for ${s.sizeMl}ml`}
                      className={`${inputClass} w-28`}
                    />
                  </label>
                  <button className={buttonSecondary}>Update</button>
                  <span className="text-muted">
                    {s.listingCount ?? 0} listings
                    {s.updatedAt ? ` · set ${new Date(s.updatedAt).toLocaleDateString("en-GB")}` : ""}
                  </span>
                </form>
              </li>
            ))}
          </ul>
        )}
        {perMl !== undefined && (
          <p className="text-sm text-muted">
            Decants are valued at {formatGBP(Math.round(perMl * 10))} per 10ml, from the size with the most listings
            (or the largest, when that&apos;s tied).
          </p>
        )}
        <form action={setSize} className="flex flex-wrap items-end gap-3 border-t border-line pt-4 text-sm">
          <input type="hidden" name="fragranceId" value={id} />
          <label className="flex flex-col gap-1 font-bold">
            Size (ml)
            <input name="sizeMl" type="number" min={1} required className={`${inputClass} w-28`} />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Guide price (£)
            <input name="guidePrice" inputMode="decimal" required className={`${inputClass} w-28`} />
          </label>
          <button className={buttonPrimary}>Add size</button>
        </form>
      </section>

      <section className={`${panel} flex flex-col gap-3`}>
        <h2 className="text-lg font-extrabold">Price history</h2>
        {!history?.length ? (
          <p className="text-sm text-muted">No prices set yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {history.map((h) => (
              <li key={h.id}>
                <span className="font-semibold">{sizeOf.get(h.size_id)}ml</span>:{" "}
                {h.old_pence === null ? "set to" : `${formatGBP(h.old_pence)} to`} {formatGBP(h.new_pence)}{" "}
                <span className="text-muted">
                  by {h.changed_by ? (nameOf.get(h.changed_by) ?? "an admin") : "the import"} on{" "}
                  {new Date(h.changed_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={updateFragrance} className={`${panel} flex flex-col gap-3 text-sm`}>
        <h2 className="text-lg font-extrabold">Details</h2>
        <input type="hidden" name="id" value={id} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 font-bold">
            Name
            <input name="name" defaultValue={fragrance.name} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Concentration
            <select name="concentration" defaultValue={concentration} className={inputClass}>
              {CONCENTRATIONS.map((c) => (
                <option key={c} value={c}>
                  {CONCENTRATION_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Launch year
            <input
              name="launchYear"
              type="number"
              min={1700}
              max={2100}
              defaultValue={fragrance.launch_year ?? undefined}
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 font-bold">
          Other names (commas between)
          <input name="aliases" defaultValue={(fragrance.aliases as string[]).join(", ")} className={inputClass} />
        </label>
        <div>
          <button className={buttonSecondary}>Save details</button>
        </div>
        <p className="text-muted">Listings already matched keep the name they were matched with until they&apos;re edited.</p>
      </form>

      <form action={mergeFragrance} className={`${panel} flex flex-col gap-3 text-sm`}>
        <h2 className="text-lg font-extrabold">Merge into another entry</h2>
        <p className="text-muted">
          If this is the same fragrance as another entry, merge it. Its listings and bottles move to the kept entry, and
          this name becomes one of its other names. This entry is then deleted.
        </p>
        <input type="hidden" name="fromId" value={id} />
        <label className="flex flex-col gap-1 font-bold">
          Keep
          <select name="toId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose the entry to keep
            </option>
            {otherOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" required />
          Yes, merge and delete this entry
        </label>
        <div>
          <button className={buttonSecondary}>Merge</button>
        </div>
      </form>
    </div>
  );
}
