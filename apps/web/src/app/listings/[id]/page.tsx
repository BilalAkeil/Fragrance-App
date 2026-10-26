import Link from "next/link";
import { notFound } from "next/navigation";
import { checkoutBreakdown, formatGBP } from "@fragrance/core";
import { SellerBadge } from "@/components/SellerBadge";
import { marketplace } from "@/lib/marketplace";

export const revalidate = 60;

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await marketplace.getListing(id);
  if (!listing) notFound();

  const [[seller], bottle] = await Promise.all([
    marketplace.getSellers([listing.sellerId]),
    listing.sourceBottleId ? marketplace.getSourceBottle(listing.sourceBottleId) : undefined,
  ]);
  const price = checkoutBreakdown(listing.pricePence, listing.postagePence);

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div>
        <Link href="/" className="text-sm opacity-70 hover:underline">
          ← Back to search
        </Link>
        <p className="mt-4 opacity-70">{listing.house}</p>
        <h1 className="text-2xl font-semibold">{listing.name}</h1>
        <p className="mt-2">
          {listing.sizeMl}ml {listing.kind}
          {listing.fillPercent !== undefined ? `, ${listing.fillPercent}% full` : ""}
        </p>
        <p className="mt-1 text-sm opacity-70">Batch code {listing.batchCode}</p>
        {listing.receiptVerified && (
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">Receipt verified</p>
        )}
        {bottle && (
          <p className="mt-1 text-sm opacity-70">
            Decanted from a verified {bottle.sizeMl}ml bottle, batch {bottle.batchCode}
          </p>
        )}
        <p className="mt-4 text-sm">Notes: {listing.notes.join(", ")}</p>
        <div className="mt-6 flex items-center gap-2">
          <span className="font-medium">{seller.displayName}</span>
          <SellerBadge seller={seller} />
        </div>
        {seller.reviewCount > 0 && (
          <p className="text-sm opacity-70">
            {seller.averageRating.toFixed(1)} stars from {seller.reviewCount} reviews
          </p>
        )}
      </div>

      <aside className="h-fit rounded-xl border border-black/10 p-5 dark:border-white/10">
        <dl className="space-y-2 text-sm">
          <Row label="Item" value={formatGBP(price.itemPence)} />
          <Row label="Postage (tracked)" value={formatGBP(price.postagePence)} />
          <Row label="Buyer Protection" value={formatGBP(price.protectionFeePence)} />
          <div className="border-t border-black/10 pt-2 dark:border-white/10">
            <Row label="Total" value={formatGBP(price.buyerTotalPence)} bold />
          </div>
        </dl>
        <button
          disabled
          className="mt-4 w-full rounded-lg bg-black px-4 py-2 font-medium text-white opacity-60 dark:bg-white dark:text-black"
        >
          Buy now (checkout coming soon)
        </button>
        <p className="mt-3 text-xs opacity-70">
          Your payment is held until you confirm delivery. Refunded in full if the item is fake.
        </p>
      </aside>
    </article>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
