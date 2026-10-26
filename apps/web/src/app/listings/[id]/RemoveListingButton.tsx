"use client";

import { useState, useTransition } from "react";
import { removeListing } from "./actions";

export function RemoveListingButton({ listingId, className }: { listingId: string; className?: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Remove this listing? Buyers won't be able to find it any more.")) return;
    setError(undefined);
    startTransition(async () => {
      try {
        await removeListing(listingId);
      } catch (err) {
        // redirect() throws to navigate; anything else is a real failure.
        if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
        setError((err as Error).message);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={remove} disabled={pending} className={className}>
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && <span className="text-sm text-danger">{error}</span>}
    </>
  );
}
