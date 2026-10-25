import { sampleListings, sampleSellers } from "@fragrance/core";
import { ListingBrowser } from "@/components/ListingBrowser";

export default function Home() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Find your next fragrance</h1>
      <p className="mb-6 opacity-70">
        Full bottles, partials and decants from ID-verified sellers. No seller fees.
      </p>
      <ListingBrowser listings={sampleListings} sellers={sampleSellers} />
    </>
  );
}
