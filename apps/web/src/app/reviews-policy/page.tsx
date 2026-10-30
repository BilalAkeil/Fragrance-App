import Link from "next/link";
import { CERTIFICATION_RULES, REVIEW_WINDOW_DAYS } from "@fragrance/core";
import { pageTitle } from "@/components/ui";

export const metadata = { title: "How reviews work" };

// 005: our review policy. UK law (the DMCC Act 2024 and the CMA's guidance on
// fake reviews) expects anyone publishing reviews to say how they handle them.
export default function ReviewsPolicyPage() {
  const { minAverageRating, minReviewsForRating } = CERTIFICATION_RULES;
  return (
    <article className="flex max-w-2xl flex-col gap-6 text-sm leading-relaxed">
      <h1 className={pageTitle}>How reviews work</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">Who can leave a review</h2>
        <p>
          Only a buyer who has bought from a seller here can review them, once per order. The order must be complete,
          or refunded after a dispute, and the review must be left within {REVIEW_WINDOW_DAYS} days. Every review is
          marked &quot;Verified purchase&quot;. Reviews after a swap are marked &quot;After a swap&quot;.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">What we show</h2>
        <p>
          We show every review on the seller&apos;s profile, newest first, with its date. We don&apos;t check reviews
          before they&apos;re published, we don&apos;t edit them, and we don&apos;t hide or reorder bad ones. A seller can
          reply to each review once, and their reply is shown under it.
        </p>
        <p>
          A seller&apos;s rating is the average of all their reviews. Sellers whose ID is verified, with at least{" "}
          {minReviewsForRating} reviews and an average of {minAverageRating}★ or more, get the Certified seller badge.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">Honest reviews only</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Review only what happened on your own order.</li>
          <li>
            Sellers must not offer anything (a discount, a refund, a free sample) for a review, or for a good one, and
            must not pressure a buyer to change one.
          </li>
          <li>Nobody may write, buy or arrange reviews that aren&apos;t a real buyer&apos;s own experience.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">Reviews we remove</h2>
        <p>We remove reviews, and may block the accounts behind them, when they:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>are fake, paid for, or written in return for something</li>
          <li>share someone&apos;s private details, such as their full name, address, phone number or bank details</li>
          <li>contain hate speech, harassment, or sexual or other unlawful content</li>
        </ul>
        <p>We never remove a review just because it&apos;s negative.</p>
      </section>

      <p>
        <Link href="/" className="font-bold text-brand underline">
          Back to browsing
        </Link>
      </p>
    </article>
  );
}
