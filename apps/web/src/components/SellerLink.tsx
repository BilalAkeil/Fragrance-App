import Link from "next/link";
import type { Seller } from "@fragrance/core";

// 005 AC-4.2: a seller's name, linking to their public profile.
export function SellerLink({ seller, className = "font-bold text-brand hover:underline" }: { seller: Pick<Seller, "id" | "displayName">; className?: string }) {
  return (
    <Link href={`/sellers/${seller.id}`} className={className}>
      {seller.displayName}
    </Link>
  );
}
