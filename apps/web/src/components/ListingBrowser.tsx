import Link from "next/link";
import { formatGBP, type ListingFilter, type Listing, type ListingKind, type Seller } from "@fragrance/core";
import { BottleTile } from "./BottleTile";
import { inputClass } from "./Field";
import { CONDITION_LABELS, KIND_LABELS } from "./labels";
import { SellerBadge } from "./SellerBadge";
import { buttonPrimary } from "./ui";

const KIND_FILTERS: { value?: ListingKind; label: string }[] = [
  { label: "Everything" },
  { value: "full", label: "Full bottles" },
  { value: "partial", label: "Partials" },
  { value: "decant", label: "Decants" },
];

const pounds = (pence?: number) => (pence === undefined ? "" : String(pence / 100));

// The browse URL for a filter, e.g. /?q=oud&kind=decant&certified=1#listings
export function browseHref(filter: ListingFilter): string {
  const params = new URLSearchParams();
  if (filter.query) params.set("q", filter.query);
  if (filter.kind) params.set("kind", filter.kind);
  if (filter.condition) params.set("condition", filter.condition);
  if (filter.minPence !== undefined) params.set("min", pounds(filter.minPence));
  if (filter.maxPence !== undefined) params.set("max", pounds(filter.maxPence));
  if (filter.certifiedOnly) params.set("certified", "1");
  const query = params.toString();
  return `/${query ? `?${query}` : ""}#listings`;
}

// Results come already filtered from the server; the filters live in the URL.
export function ListingBrowser({
  listings,
  sellers,
  filter,
}: {
  listings: Listing[];
  sellers: Seller[];
  filter: ListingFilter;
}) {
  const filtered = Object.keys(filter).length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Type" className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((f) => {
            const active = filter.kind === f.value;
            return (
              <Link
                key={f.label}
                href={browseHref({ ...filter, kind: f.value })}
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${
                  active ? "border-brand bg-brand text-white" : "border-field bg-white text-ink hover:border-brand"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <form action="/#listings" className="flex flex-wrap items-end gap-3 text-sm">
          {filter.query && <input type="hidden" name="q" value={filter.query} />}
          {filter.kind && <input type="hidden" name="kind" value={filter.kind} />}
          <label className="flex flex-col gap-1 font-bold">
            Condition
            <select name="condition" defaultValue={filter.condition ?? ""} className={inputClass}>
              <option value="">Any</option>
              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Min price (£)
            <input name="min" inputMode="decimal" defaultValue={pounds(filter.minPence)} className={`${inputClass} w-28`} />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Max price (£)
            <input name="max" inputMode="decimal" defaultValue={pounds(filter.maxPence)} className={`${inputClass} w-28`} />
          </label>
          <label className="flex min-h-11 items-center gap-2 font-bold">
            <input type="checkbox" name="certified" value="1" defaultChecked={filter.certifiedOnly} className="size-4" />
            Certified sellers only
          </label>
          <button className={buttonPrimary}>Apply</button>
          {filtered && (
            <Link href="/#listings" className="min-h-11 content-center font-bold text-brand underline">
              Clear filters
            </Link>
          )}
        </form>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted">No fragrances match your search.</p>
          {filtered && (
            <Link href="/#listings" className="font-bold text-brand underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-x-5 gap-y-8">
          {listings.map((l) => {
            const seller = sellers.find((s) => s.id === l.sellerId);
            return (
              <li key={l.id}>
                <Link href={`/listings/${l.id}`} className="group flex flex-col gap-2.5 text-ink">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl group-hover:outline-2 group-hover:outline-brand">
                    <BottleTile kind={l.kind} photo={l.photos[0]} alt={`${l.house} ${l.name}`} />
                    <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold">
                      {KIND_LABELS[l.kind]}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-muted">{l.house}</span>
                    <span className="font-bold">{l.name}</span>
                    <span className="text-sm text-muted">
                      {l.sizeMl}ml{l.fillPercent !== undefined ? ` · ${l.fillPercent}% full` : ""}
                    </span>
                    <span className="mt-1 text-[17px] font-extrabold">{formatGBP(l.pricePence)}</span>
                    {seller && (
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="text-muted">{seller.displayName}</span>
                        <SellerBadge seller={seller} />
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
