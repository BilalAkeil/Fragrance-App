"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatGBP, type Listing, type ListingKind, type Seller } from "@fragrance/core";
import { BottleTile } from "./BottleTile";
import { inputClass } from "./Field";
import { KIND_LABELS } from "./labels";
import { SellerBadge } from "./SellerBadge";

const FILTERS: { value: ListingKind | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "full", label: "Full bottles" },
  { value: "partial", label: "Partials" },
  { value: "decant", label: "Decants" },
];

export function ListingBrowser({
  listings,
  sellers,
  initialQuery = "",
}: {
  listings: Listing[];
  sellers: Seller[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<ListingKind | "all">("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (kind !== "all" && l.kind !== kind) return false;
      if (!q) return true;
      return [l.house, l.name, ...l.notes].some((s) => s.toLowerCase().includes(q));
    });
  }, [listings, query, kind]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label htmlFor="listing-search" className="sr-only">
          Search listings
        </label>
        <input
          id="listing-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by brand, name or note"
          className={`${inputClass} flex-1`}
        />
        <div role="group" aria-label="Type" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={kind === f.value}
              onClick={() => setKind(f.value)}
              className={`min-h-11 rounded-full border px-4 text-sm font-bold ${
                kind === f.value ? "border-brand bg-brand text-white" : "border-field bg-white text-ink hover:border-brand"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="text-muted">No fragrances match your search.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-x-5 gap-y-8">
          {results.map((l) => {
            const seller = sellers.find((s) => s.id === l.sellerId)!;
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
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="text-muted">{seller.displayName}</span>
                      <SellerBadge seller={seller} />
                    </span>
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
