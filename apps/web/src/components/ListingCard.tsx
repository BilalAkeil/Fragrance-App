import Link from "next/link";
import { formatGBP, type Listing, type Seller } from "@fragrance/core";
import { BottleTile } from "./BottleTile";
import { KIND_LABELS } from "./labels";
import { SellerBadge } from "./SellerBadge";
import { SellerLink } from "./SellerLink";

// A listing in a grid, for browsing and seller profiles. Without a seller, the
// card leaves out the seller line (on their own profile, say).
export function ListingCard({ listing: l, seller }: { listing: Listing; seller?: Seller }) {
  return (
    <li className="flex flex-col gap-1">
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
        </div>
      </Link>
      {/* Outside the card's link, so the name can link to the profile (005 AC-4.2). */}
      {seller && (
        <span className="flex flex-wrap items-center gap-2 text-[13px]">
          <SellerLink seller={seller} className="text-muted hover:text-brand hover:underline" />
          <SellerBadge seller={seller} />
        </span>
      )}
    </li>
  );
}

export function ListingGrid({ listings, sellers = [] }: { listings: Listing[]; sellers?: Seller[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-x-5 gap-y-8">
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} seller={sellers.find((s) => s.id === l.sellerId)} />
      ))}
    </ul>
  );
}
