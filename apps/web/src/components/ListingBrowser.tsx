"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatGBP, type Listing, type ListingKind, type Seller } from "@fragrance/core";
import { SellerBadge } from "./SellerBadge";

const KIND_LABELS: Record<ListingKind, string> = {
  full: "Full bottle",
  partial: "Partial",
  decant: "Decant",
};

export function ListingBrowser({ listings, sellers }: { listings: Listing[]; sellers: Seller[] }) {
  const [query, setQuery] = useState("");
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
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by brand, name or note"
          className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ListingKind | "all")}
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        >
          <option value="all">All sizes</option>
          <option value="full">Full bottles</option>
          <option value="partial">Partials</option>
          <option value="decant">Decants</option>
        </select>
      </div>

      {results.length === 0 ? (
        <p className="opacity-70">No fragrances match your search.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((l) => {
            const seller = sellers.find((s) => s.id === l.sellerId)!;
            return (
              <li key={l.id}>
                <Link
                  href={`/listings/${l.id}`}
                  className="block rounded-xl border border-black/10 p-4 hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
                >
                  <p className="text-sm opacity-70">{l.house}</p>
                  <p className="font-semibold">{l.name}</p>
                  <p className="mt-1 text-sm">
                    {KIND_LABELS[l.kind]} · {l.sizeMl}ml
                    {l.fillPercent !== undefined ? ` · ${l.fillPercent}% full` : ""}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{formatGBP(l.pricePence)}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span>{seller.displayName}</span>
                    <SellerBadge seller={seller} />
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
