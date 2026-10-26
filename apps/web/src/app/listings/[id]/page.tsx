import Link from "next/link";
import { notFound } from "next/navigation";
import { batchCodeLabel, checkoutBreakdown, formatGBP, hasVerifiedSource } from "@fragrance/core";
import { BottleTile } from "@/components/BottleTile";
import { KIND_LABELS } from "@/components/labels";
import { SellerBadge } from "@/components/SellerBadge";
import { buttonPrimary, panel } from "@/components/ui";
import { marketplace } from "@/lib/marketplace";

export const revalidate = 60;

const CONDITION_LABELS = {
  new_sealed: "New, sealed",
  new_unsealed: "New, unsealed",
  used: "Used",
} as const;

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await marketplace.getListing(id);
  if (!listing) notFound();

  const [[seller], bottle] = await Promise.all([
    marketplace.getSellers([listing.sellerId]),
    listing.sourceBottleId ? marketplace.getSourceBottle(listing.sourceBottleId) : undefined,
  ]);
  const price = checkoutBreakdown(listing.pricePence, listing.postagePence);
  const title = `${listing.house} ${listing.name}`;

  return (
    <article className="flex flex-col gap-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="text-brand hover:underline">
          Home
        </Link>{" "}
        / {title}
      </nav>

      <div className="flex flex-wrap items-start gap-12">
        <section aria-label="Photos" className="flex min-w-0 flex-[1_1_440px] flex-col gap-3">
          <div className="aspect-square overflow-hidden rounded-3xl">
            <BottleTile kind={listing.kind} photo={listing.photos[0]} alt={title} large />
          </div>
          {listing.photos.length > 1 && (
            <ul className="grid grid-cols-5 gap-2.5">
              {listing.photos.slice(1, 6).map((src, i) => (
                <li key={src} className="aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${title}, photo ${i + 2}`} className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Listing details" className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="font-bold text-brand">{listing.house}</p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">{listing.name}</h1>
            <div className="mt-1 flex flex-wrap gap-2 text-[13px] font-bold">
              <span
                className={`rounded-full px-3 py-1 ${listing.kind === "decant" ? "bg-decant-tint text-decant-ink" : "bg-sky text-brand-dark"}`}
              >
                {KIND_LABELS[listing.kind]} · {listing.sizeMl}ml
                {listing.fillPercent !== undefined ? ` · ${listing.fillPercent}% full` : ""}
              </span>
              <span className="rounded-full bg-neutral-tint px-3 py-1 text-neutral-ink">{batchCodeLabel(listing.batchCode)}</span>
              {listing.receiptVerified && (
                <span className="rounded-full bg-verified-tint px-3 py-1 text-verified-ink">Receipt verified</span>
              )}
              {hasVerifiedSource(listing, bottle) && (
                <span className="rounded-full bg-verified-tint px-3 py-1 text-verified-ink">Verified source</span>
              )}
            </div>
          </div>

          <div className={`${panel} flex flex-col gap-3.5`}>
            <p className="text-3xl font-extrabold tracking-tight">{formatGBP(price.itemPence)}</p>
            <dl className="flex flex-col gap-2 text-[15px]">
              <Row label="Postage (tracked)" value={formatGBP(price.postagePence)} />
              <Row label="Buyer Protection" value={formatGBP(price.protectionFeePence)} />
              <div className="border-t border-line pt-3">
                <Row label="Total" value={formatGBP(price.buyerTotalPence)} bold />
              </div>
            </dl>
            <button disabled className={`${buttonPrimary} w-full`}>
              Buy now (checkout coming soon)
            </button>
            <p className="text-[13px] leading-normal text-muted">
              Your payment is held until you confirm delivery. Refunded in full if the item isn&apos;t as described or
              isn&apos;t genuine.
            </p>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-line p-4">
            <span className="flex size-12 flex-none items-center justify-center rounded-full bg-sky font-extrabold text-brand">
              {seller.displayName.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold">{seller.displayName}</span>
                <SellerBadge seller={seller} />
              </span>
              <span className="text-sm text-muted">
                {seller.reviewCount > 0
                  ? `${seller.averageRating.toFixed(1)}★ from ${seller.reviewCount} reviews`
                  : "No reviews yet"}
              </span>
            </span>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-12">
        {hasVerifiedSource(listing, bottle) && bottle && (
          <section className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
            <h2 className="text-xl font-extrabold">Where this decant came from</h2>
            <div className="flex flex-col gap-1.5 rounded-2xl bg-panel p-5">
              <p className="font-bold">
                Source bottle: {bottle.house} {bottle.name} {bottle.sizeMl}ml
              </p>
              <p className="text-sm leading-normal text-muted">
                Filmed by the seller{bottle.batchCode ? ` with batch code ${bottle.batchCode}` : ""}. Video checked by our team.
              </p>
            </div>
          </section>
        )}
        <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
          <h2 className="text-xl font-extrabold">Details</h2>
          <dl className="grid grid-cols-[minmax(120px,160px)_1fr] gap-x-4 gap-y-3 text-[15px]">
            {listing.notes.length > 0 && (
              <>
                <dt className="text-muted">Notes</dt>
                <dd>{listing.notes.join(", ")}</dd>
              </>
            )}
            <dt className="text-muted">Condition</dt>
            <dd>{CONDITION_LABELS[listing.condition]}</dd>
            <dt className="text-muted">Batch code</dt>
            <dd>{listing.batchCode ?? "None"}</dd>
          </dl>
        </section>
      </div>
    </article>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "text-[17px] font-extrabold" : ""}`}>
      <dt className={bold ? "" : "text-muted"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
