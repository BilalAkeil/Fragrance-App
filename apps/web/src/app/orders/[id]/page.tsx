import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  DELIVERY_SERVICES,
  PACKING_GUIDANCE,
  REVIEW_TEXT_MAX,
  canReview,
  checkoutBreakdown,
  formatGBP,
  nextStep,
  orderEndedAt,
  reviewWindowEnds,
  timeLeft,
  type Order,
  type Review,
} from "@fragrance/core";
import { getOrder, getOrderReview } from "@fragrance/api";
import { BottleTile } from "@/components/BottleTile";
import { inputClass } from "@/components/Field";
import { NotConnected } from "@/components/NotConnected";
import { SellerLink } from "@/components/SellerLink";
import { KIND_LABELS, ORDER_STATUS_LABELS } from "@/components/labels";
import { buttonPrimary, buttonSecondary, pageTitle, panel } from "@/components/ui";
import { marketplace } from "@/lib/marketplace";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { confirmEverythingOk, replyToReview, submitReview } from "../actions";

export const dynamic = "force-dynamic";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

// The order page (004 AC-5.2), for its buyer and its seller.
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmed?: string; error?: string; review?: string }>;
}) {
  if (!supabaseConfigured) return <NotConnected />;
  const { id } = await params;
  const { confirmed, error, review: reviewNotice } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/orders/${id}`);
  const order = await getOrder(supabase, id);
  if (!order) notFound();
  const role = order.sellerId === user.id ? "seller" : "buyer";
  const price = checkoutBreakdown(order.itemPence, order.postagePence);
  const step = nextStep(order, role);
  const now = new Date();
  const endedAt = orderEndedAt(order);
  const [review, [seller]] = await Promise.all([
    endedAt ? getOrderReview(supabase, order.id) : undefined,
    role === "buyer" ? marketplace.getSellers([order.sellerId]) : [],
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={role === "seller" ? "/orders?tab=selling" : "/orders"} className="text-sm font-bold text-brand underline">
          Your orders
        </Link>
        <h1 className={pageTitle}>
          {order.item.house} {order.item.name}
        </h1>
        <p className="text-muted">
          {ORDER_STATUS_LABELS[order.status]} · ordered {when(order.createdAt)}
        </p>
      </div>
      {confirmed && <p className="text-sm font-semibold text-verified">Thanks. The order is complete and the seller is being paid.</p>}
      {error === "confirm" && <p className="text-sm text-danger">That can&apos;t be done on this order any more.</p>}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
          <NextStep order={order} role={role} step={step} now={now} />
          {endedAt && (
            <ReviewSection order={order} role={role} review={review} endedAt={endedAt} now={now} notice={reviewNotice} />
          )}
          <Timeline order={order} />
        </div>

        <aside className="flex flex-[0_1_340px] flex-col gap-4">
          <div className={`${panel} flex flex-col gap-3`}>
            <div className="flex items-center gap-3">
              <span className="size-16 flex-none overflow-hidden rounded-xl">
                <BottleTile kind={order.item.kind} photo={order.item.photo} alt="" />
              </span>
              <span className="text-sm">
                {KIND_LABELS[order.item.kind]} · {order.item.sizeMl}ml
                <br />
                <Link href={`/listings/${order.listingId}`} className="font-bold text-brand underline">
                  The listing
                </Link>
                {seller && (
                  <>
                    <br />
                    Sold by <SellerLink seller={seller} />
                  </>
                )}
              </span>
            </div>
            <dl className="flex flex-col gap-1.5 text-sm">
              <Row label="Item" value={formatGBP(price.itemPence)} />
              {role === "buyer" ? (
                <>
                  <Row label="Postage" value={formatGBP(price.postagePence)} />
                  <Row label="Buyer Protection" value={formatGBP(order.protectionFeePence)} />
                  <Row label="You paid" value={formatGBP(price.itemPence + price.postagePence + order.protectionFeePence)} bold />
                </>
              ) : (
                // 003 AC-3.3: the seller gets the item price; postage pays for the label.
                <Row label="You receive" value={formatGBP(price.sellerReceivesPence)} bold />
              )}
            </dl>
          </div>
          <div className={`${panel} flex flex-col gap-1 text-sm`}>
            <p className="font-bold">{order.deliveryService ? DELIVERY_SERVICES[order.deliveryService].name : "Delivery"}</p>
            {order.trackingRef && <p className="text-muted">Tracking {order.trackingRef}</p>}
            {order.shipTo && (
              <address className="mt-2 not-italic">
                {[order.shipTo.name, order.shipTo.line1, order.shipTo.line2, order.shipTo.town, order.shipTo.postcode]
                  .filter(Boolean)
                  .map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
              </address>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function NextStep({
  order,
  role,
  step,
  now,
}: {
  order: Order;
  role: "buyer" | "seller";
  step: { text: string; deadline?: string };
  now: Date;
}) {
  if (order.status === "paid" && role === "seller") {
    return (
      <section className={`${panel} flex flex-col gap-4`}>
        <h2 className="text-lg font-extrabold">Send it by {order.shipBy ? day(order.shipBy) : "the deadline"}</h2>
        {order.shipBy && (
          <p className="text-sm text-muted">
            {timeLeft(new Date(order.shipBy), now)}. If it isn&apos;t sent in time, the order is cancelled and the buyer is
            refunded.
          </p>
        )}
        <div>
          <a href={`/orders/${order.id}/label`} target="_blank" rel="noopener" className={buttonPrimary}>
            Print the label
          </a>
        </div>
        <div className="rounded-xl bg-panel p-4 text-sm">
          <p className="font-bold">Packing perfume for Royal Mail</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {PACKING_GUIDANCE.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  if (order.status === "delivered" && role === "buyer") {
    return (
      <section className={`${panel} flex flex-col gap-4`}>
        <h2 className="text-lg font-extrabold">Is everything OK?</h2>
        <p className="text-sm text-muted">
          Check it&apos;s what you ordered and genuine.
          {order.completeAfter
            ? ` You have until ${when(order.completeAfter)} (${timeLeft(new Date(order.completeAfter), now)}) to report a problem. After that the order completes and the seller is paid.`
            : ""}
        </p>
        <div className="flex flex-wrap gap-3">
          <form action={confirmEverythingOk}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className={buttonPrimary}>Everything&apos;s OK</button>
          </form>
          {/* 004 AC-4.2: opens a dispute once 008 is built. */}
          <button disabled className={buttonSecondary} title="Coming with disputes">
            Report a problem
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className={`${panel} flex flex-col gap-1`}>
      <h2 className="text-lg font-extrabold">{step.text}</h2>
      {step.deadline && <p className="text-sm text-muted">{timeLeft(new Date(step.deadline), now)}</p>}
      {order.status === "cancelled" && (
        <p className="text-sm text-muted">
          {role === "buyer"
            ? "The seller didn't send it in time, so you've been refunded in full."
            : "It wasn't sent in time, so the buyer was refunded in full."}
        </p>
      )}
      {order.status === "completed" && role === "seller" && (
        <p className="text-sm text-muted">The item price is on its way to your bank.</p>
      )}
    </section>
  );
}

const REVIEW_NOTICES: Record<string, string> = {
  rating: "Choose a rating from 1 to 5 stars.",
  long: `Keep your review to ${REVIEW_TEXT_MAX} characters.`,
  closed: "That can't be done on this review.",
  reply: `Write a reply of up to ${REVIEW_TEXT_MAX} characters.`,
  error: "Your review couldn't be saved. Please try again.",
};

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

// 005 US-2: the buyer reviews the seller once the order is finished. The seller
// sees the review they were given.
function ReviewSection({
  order,
  role,
  review,
  endedAt,
  now,
  notice,
}: {
  order: Order;
  role: "buyer" | "seller";
  review?: Review;
  endedAt: Date;
  now: Date;
  notice?: string;
}) {
  if (review) {
    return (
      <section id="review" className={`${panel} flex flex-col gap-2`}>
        <h2 className="text-lg font-extrabold">
          {role === "buyer" ? (notice === "thanks" ? "Thanks for your review" : "Your review") : "The buyer's review"}
        </h2>
        <p className="text-lg text-brand" aria-label={`${review.rating} out of 5 stars`}>
          {stars(review.rating)}
        </p>
        {review.text && <p className="text-sm">{review.text}</p>}
        {review.reply && (
          <div className="mt-1 rounded-xl bg-panel p-3 text-sm">
            <p className="font-bold">{role === "seller" ? "Your reply" : "The seller's reply"}</p>
            <p>{review.reply.text}</p>
          </div>
        )}
        {role === "seller" && !review.reply && (
          <form action={replyToReview} className="mt-2 flex flex-col gap-2">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="reviewId" value={review.id} />
            <label className="flex flex-col gap-1 text-sm font-bold">
              Reply (optional, once, shown on your profile)
              <textarea name="reply" rows={2} required maxLength={REVIEW_TEXT_MAX} className={`${inputClass} font-normal`} />
            </label>
            {notice && REVIEW_NOTICES[notice] && <p className="text-sm text-danger">{REVIEW_NOTICES[notice]}</p>}
            <div>
              <button className={buttonSecondary}>Post reply</button>
            </div>
          </form>
        )}
        {role === "buyer" && notice === "thanks" && (
          <p className="text-sm text-muted">
            It&apos;s on the seller&apos;s{" "}
            <Link href={`/sellers/${order.sellerId}`} className="font-bold text-brand underline">
              profile
            </Link>{" "}
            now, where it helps other buyers.
          </p>
        )}
      </section>
    );
  }
  if (role !== "buyer") return null;
  const open = canReview({ status: order.status, endedAt, alreadyReviewed: false, now });
  if (!open) {
    return (
      <section id="review" className={`${panel} text-sm text-muted`}>
        {notice && REVIEW_NOTICES[notice] ? REVIEW_NOTICES[notice] : "The time to review this order has passed."}
      </section>
    );
  }
  return (
    <section id="review" className={`${panel} flex flex-col gap-4`}>
      <div>
        <h2 className="text-lg font-extrabold">How was the seller?</h2>
        <p className="text-sm text-muted">
          Your review goes on their public profile, with the date. You can leave one until{" "}
          {when(reviewWindowEnds(endedAt).toISOString())}.{" "}
          <Link href="/reviews-policy" className="font-bold text-brand underline">
            How reviews work
          </Link>
        </p>
      </div>
      <form action={submitReview} className="flex flex-col gap-4">
        <input type="hidden" name="orderId" value={order.id} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold">Rating</legend>
          <div className="flex flex-wrap gap-2">
            {[5, 4, 3, 2, 1].map((n) => (
              <label
                key={n}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-field px-4 text-sm has-[:checked]:border-brand has-[:checked]:bg-sky"
              >
                <input type="radio" name="rating" value={n} required className="size-4 accent-brand" />
                <span className="text-brand" aria-hidden>
                  {stars(n)}
                </span>
                <span className="sr-only">{n} out of 5 stars</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm font-bold">
          What was it like? (optional)
          <textarea
            name="text"
            rows={3}
            maxLength={REVIEW_TEXT_MAX}
            className={`${inputClass} font-normal`}
            placeholder="Was it as described? How was it packed?"
          />
        </label>
        {notice && REVIEW_NOTICES[notice] && <p className="text-sm text-danger">{REVIEW_NOTICES[notice]}</p>}
        <div>
          <button className={buttonPrimary}>Post review</button>
        </div>
      </form>
    </section>
  );
}

// AC-3.3: every step and tracking event, oldest first.
function Timeline({ order }: { order: Order }) {
  const entries: { at: string; text: string }[] = [
    { at: order.createdAt, text: "Paid" },
    ...order.tracking.map((t) => ({ at: t.at, text: t.description || t.status })),
    ...(order.deliveredAt && !order.tracking.some((t) => t.status === "delivered")
      ? [{ at: order.deliveredAt, text: "Delivered" }]
      : []),
    ...(order.completedAt ? [{ at: order.completedAt, text: "Completed" }] : []),
    ...(order.cancelledAt ? [{ at: order.cancelledAt, text: "Cancelled and refunded" }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section className={`${panel} flex flex-col gap-3`}>
      <h2 className="text-lg font-extrabold">Timeline</h2>
      <ol className="flex flex-col gap-3 border-l-2 border-line pl-4">
        {entries.map((e, i) => (
          <li key={`${e.at}-${i}`} className="text-sm">
            <span className="font-semibold">{e.text}</span>
            <span className="block text-muted">{when(e.at)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-extrabold" : ""}`}>
      <dt className={bold ? "" : "text-muted"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
