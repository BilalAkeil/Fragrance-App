import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canEditListing } from "@fragrance/core";
import { NotConnected } from "@/components/NotConnected";
import { bottleOptions, loadOwnBottles } from "@/lib/bottles";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentSeller } from "@/lib/supabase/server";
import { ListingForm } from "../../../sell/ListingForm";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user } = await getCurrentSeller();
  if (!user) redirect("/login");

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, seller_id, kind, house, name, fragrance_id, fragrances(house_id), size_ml, fill_percent, condition, batch_code, price_pence, postage_pence, notes, source_bottle_id, receipt_path, status, listing_photos(id, path, position)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!listing) notFound();
  // Only the owner, and only while it's active.
  if (!canEditListing(listing.status, listing.seller_id === user.id)) redirect(`/listings/${id}`);

  const bottles = await loadOwnBottles(supabase, user.id);
  const photoUrl = (path: string) => supabase.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;

  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Edit your listing</h1>
      <p className="mb-8 text-muted">
        <Link href={`/listings/${id}`} className="font-bold text-brand underline">
          Back to the listing
        </Link>
      </p>
      <ListingForm
        userId={user.id}
        bottles={bottleOptions(bottles)}
        existing={{
          id: listing.id,
          kind: listing.kind,
          house: listing.house,
          name: listing.name,
          fragranceId: listing.fragrance_id ?? undefined,
          // A many-to-one embed is one object at runtime, not the array the untyped client infers.
          houseId: (listing.fragrances as unknown as { house_id: string } | null)?.house_id,
          sizeMl: listing.size_ml,
          fillPercent: listing.fill_percent ?? undefined,
          condition: listing.condition,
          batchCode: listing.batch_code ?? undefined,
          pricePence: listing.price_pence,
          postagePence: listing.postage_pence,
          notes: listing.notes,
          sourceBottleId: listing.source_bottle_id ?? undefined,
          hasReceipt: Boolean(listing.receipt_path),
          photos: [...(listing.listing_photos ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((p) => ({ id: p.id, path: p.path, url: photoUrl(p.path) })),
        }}
      />
    </>
  );
}
