import { ListingBrowser } from "@/components/ListingBrowser";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { marketplace } from "@/lib/marketplace";

export const revalidate = 60;

export default async function Home() {
  const listings = await marketplace.listListings();
  const sellers = await marketplace.getSellers([...new Set(listings.map((l) => l.sellerId))]);

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Find your next fragrance</h1>
      <p className="mb-6 opacity-70">
        Full bottles, partials and decants from ID-verified sellers. No seller fees.
      </p>
      {!marketplace.live && <SampleDataNotice />}
      <ListingBrowser listings={listings} sellers={sellers} />
    </>
  );
}
