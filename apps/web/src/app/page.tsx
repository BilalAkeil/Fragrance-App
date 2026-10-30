import Link from "next/link";
import { listingFilterFromParams } from "@fragrance/core";
import { ListingBrowser } from "@/components/ListingBrowser";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { marketplace } from "@/lib/marketplace";

export const revalidate = 60;

const REASONS = [
  {
    title: "Certified sellers",
    text: "Photo ID checked, proof of purchase where possible, and a 4 star average to keep the badge.",
    icon: (
      <>
        <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    tone: "text-verified-ink",
  },
  {
    title: "Decants you can trace",
    text: "Look for the Verified source badge: the decant comes from a bottle we have seen on video. 5ml minimum, always labelled.",
    icon: (
      <>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="M16 10l5-3v10l-5-3" />
      </>
    ),
    tone: "text-brand",
  },
  {
    title: "Buyer Protection on every order",
    text: "Payment is held until you confirm delivery. A small fee at checkout covers it; sellers pay nothing.",
    icon: (
      <>
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </>
    ),
    tone: "text-ink",
  },
];

const STEPS = [
  ["Pick a bottle or decant", "Check the batch code, fill level, photos and the seller's rating."],
  ["Pay with Buyer Protection", "We hold your money. The seller posts with tracking using their chosen carrier."],
  [
    "Confirm it arrived",
    "Once you confirm, or 48 hours after delivery, the seller is paid. Something wrong? Report it within those 48 hours.",
  ],
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = listingFilterFromParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
  );
  const q = filter.query;
  const [listings, houses] = await Promise.all([marketplace.listListings(filter), marketplace.listHouses()]);
  const sellers = await marketplace.getSellers([...new Set(listings.map((l) => l.sellerId))]);

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-wrap items-center gap-10">
        <div className="flex flex-[1_1_480px] flex-col gap-6">
          <span className="self-start rounded-full bg-verified-tint px-3 py-1.5 text-[13px] font-bold text-verified-ink">
            Every seller is ID-verified
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] md:text-6xl">
            Pre-loved fragrance from sellers we&apos;ve checked.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Full bottles, partials and decants from UK sellers. Your payment is held until the bottle arrives, and
            refunded in full if it isn&apos;t genuine.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="#listings" className={buttonPrimary}>
              Browse fragrances
            </Link>
            <Link href="/sell" className={buttonSecondary}>
              Sell for free
            </Link>
          </div>
        </div>
        <div className="flex flex-[1_1_380px] flex-col gap-5 rounded-3xl bg-sky p-8">
          <h2 className="text-lg font-extrabold">Why buy here</h2>
          {REASONS.map((r) => (
            <div key={r.title} className="flex items-start gap-4">
              <div className={`flex size-11 flex-none items-center justify-center rounded-xl bg-white ${r.tone}`}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {r.icon}
                </svg>
              </div>
              <div>
                <p className="font-bold">{r.title}</p>
                <p className="text-[15px] leading-normal text-muted">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="listings" className="flex scroll-mt-6 flex-col gap-5">
        <h2 className="text-2xl font-extrabold tracking-tight">{q ? `Results for “${q}”` : "Just listed"}</h2>
        {!marketplace.live && <SampleDataNotice />}
        <ListingBrowser listings={listings} sellers={sellers} houses={houses} filter={filter} />
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-extrabold tracking-tight">How buying works</h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex flex-col gap-2.5 rounded-2xl border border-line p-6">
              <span className="text-3xl font-extrabold text-brand">{i + 1}</span>
              <p className="text-[17px] font-bold">{title}</p>
              <p className="text-[15px] leading-normal text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-brand px-10 py-12 text-white">
        <div className="flex flex-[1_1_420px] flex-col gap-2.5">
          <h2 className="text-3xl font-extrabold tracking-tight">Sell for free. Keep your full price.</h2>
          <p className="text-[17px] leading-normal text-sky">
            No selling fees. Verify your ID once, list in a few minutes, and post with any carrier you like.
          </p>
        </div>
        <Link
          href="/sell"
          className="inline-flex min-h-11 items-center rounded-full bg-white px-5 font-bold text-ink hover:bg-sky"
        >
          Start selling
        </Link>
      </section>
    </div>
  );
}
