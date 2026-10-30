"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CANNOT_BUY_MESSAGES, canBuy, type Listing } from "@fragrance/core";
import { buttonPrimary } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

// Buy now and the reasons it can't be used (003 AC-1.1, AC-2.1, AC-3.1). Worked
// out in the browser, since the listing page is cached for everyone. Checkout
// checks all of this again on the server.
export function BuyButton({
  listing,
  sellerPayoutsReady,
}: {
  listing: Pick<Listing, "id" | "status" | "sellerId" | "kind" | "sizeMl" | "reservedBy" | "reservedUntil">;
  sellerPayoutsReady: boolean;
}) {
  const [userId, setUserId] = useState<string | null>();

  useEffect(() => {
    if (!supabaseConfigured) return setUserId(null);
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  if (!supabaseConfigured) {
    return (
      <button disabled className={`${buttonPrimary} w-full`}>
        Buy now (needs the database connected)
      </button>
    );
  }
  // Until we know who's looking.
  if (userId === undefined) return <button disabled className={`${buttonPrimary} w-full`}>Buy now</button>;

  const reasons = canBuy({
    listing,
    buyerId: userId ?? undefined,
    sellerPayoutsReady,
    reservation: {
      reservedBy: listing.reservedBy,
      reservedUntil: listing.reservedUntil ? new Date(listing.reservedUntil) : undefined,
    },
    now: new Date(),
  });

  // Signed out is the only reason that has a way forward: sign in and come back.
  if (reasons.length === 1 && reasons[0] === "signed_out") {
    return (
      <Link href={`/login?reason=buy&next=${encodeURIComponent(`/listings/${listing.id}`)}`} className={`${buttonPrimary} w-full`}>
        Buy now
      </Link>
    );
  }
  const blocking = reasons.filter((r) => r !== "signed_out");
  if (blocking.length) {
    if (blocking.includes("own_listing")) return null;
    return (
      <div className="flex flex-col gap-2">
        <button disabled className={`${buttonPrimary} w-full`}>
          Buy now
        </button>
        <p className="text-center text-sm font-semibold text-neutral-ink">{CANNOT_BUY_MESSAGES[blocking[0]]}</p>
      </div>
    );
  }
  return (
    <Link href={`/checkout/${listing.id}`} className={`${buttonPrimary} w-full`}>
      Buy now
    </Link>
  );
}
