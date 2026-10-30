import Link from "next/link";
import { notFound } from "next/navigation";
import type { Review } from "@fragrance/core";
import { ListingGrid } from "@/components/ListingCard";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { SellerBadge } from "@/components/SellerBadge";
import { pageTitle, panel } from "@/components/ui";
import { marketplace } from "@/lib/marketplace";

export const revalidate = 60;

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

// 005 US-4: a seller's public profile, so buyers can judge them (AC-4.1).
export default async function SellerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const page = Math.max(0, Math.floor(Number((await searchParams).page) || 0));
  const profile = await marketplace.getSellerProfile(id);
  if (!profile) notFound();
  const { seller, listings } = profile;
  const { reviews, hasMore } = page === 0 ? profile : await marketplace.listReviews(id, page);

  return (
    <div className="flex flex-col gap-10">
      {!marketplace.live && <SampleDataNotice />}
      <section className="flex flex-wrap items-center gap-5">
        <span className="flex size-20 flex-none items-center justify-center rounded-full bg-sky text-2xl font-extrabold text-brand">
          {seller.displayName.slice(0, 2).toUpperCase()}
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={pageTitle}>{seller.displayName}</h1>
            <SellerBadge seller={seller} />
          </div>
          <p className="text-sm text-muted">
            {seller.reviewCount > 0 ? (
              <>
                <span className="font-bold text-ink">{seller.averageRating.toFixed(1)}★</span> from{" "}
                {seller.reviewCount} {seller.reviewCount === 1 ? "review" : "reviews"}
              </>
            ) : (
              "No reviews yet"
            )}
            {seller.joinedAt && <> · Joined {monthYear(seller.joinedAt)}</>}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">
          For sale{listings.length > 0 ? ` (${listings.length})` : ""}
        </h2>
        {listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <p className="text-muted">
            Nothing for sale right now.{" "}
            <Link href="/#listings" className="font-bold text-brand underline">
              Browse other fragrances
            </Link>
          </p>
        )}
      </section>

      <section id="reviews" className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-extrabold">Reviews</h2>
          <Link href="/reviews-policy" className="text-sm font-bold text-brand underline">
            How reviews work
          </Link>
        </div>
        {reviews.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </ul>
        ) : (
          <p className="text-muted">
            {page === 0 ? "No reviews yet. Reviews appear here once buyers' orders are complete." : "No more reviews."}
          </p>
        )}
        {(page > 0 || hasMore) && (
          <nav className="flex gap-4 text-sm font-bold">
            {page > 0 && (
              <Link href={`/sellers/${id}${page > 1 ? `?page=${page - 1}` : ""}#reviews`} className="text-brand underline">
                Newer reviews
              </Link>
            )}
            {hasMore && (
              <Link href={`/sellers/${id}?page=${page + 1}#reviews`} className="text-brand underline">
                Older reviews
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className={`${panel} flex flex-col gap-1.5 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg text-brand" aria-label={`${review.rating} out of 5 stars`}>
          {stars(review.rating)}
        </span>
        <span className="text-sm text-muted">{date(review.createdAt)}</span>
      </div>
      {review.text && <p className="text-sm">{review.text}</p>}
      <p className="text-xs text-muted">{review.swapId ? "After a swap" : "Verified purchase"}</p>
      {review.reply && (
        <div className="mt-1 rounded-xl bg-panel p-3 text-sm">
          <p className="font-bold">Seller&apos;s reply · {date(review.reply.at)}</p>
          <p>{review.reply.text}</p>
        </div>
      )}
    </li>
  );
}
