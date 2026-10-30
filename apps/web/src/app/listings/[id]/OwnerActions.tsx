"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { canEditListing, type ListingStatus } from "@fragrance/core";
import { buttonSecondary } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import { RemoveListingButton } from "./RemoveListingButton";

// Edit and Remove for the seller. Checked in the browser so the listing page
// itself can stay cached for everyone else.
export function OwnerActions({ listingId, sellerId, status }: { listingId: string; sellerId: string; status: ListingStatus }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    createClient()
      .auth.getUser()
      .then(({ data }) => setIsOwner(data.user?.id === sellerId));
  }, [sellerId]);

  if (!canEditListing(status, isOwner)) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line p-4">
      <p className="text-sm font-bold">This is your listing</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/listings/${listingId}/edit`} className={buttonSecondary}>
          Edit
        </Link>
        <RemoveListingButton listingId={listingId} className={`${buttonSecondary} text-danger`} />
      </div>
    </div>
  );
}
