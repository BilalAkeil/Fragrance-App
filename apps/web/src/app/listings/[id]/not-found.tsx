import Link from "next/link";
import { buttonPrimary, pageTitle } from "@/components/ui";

// Removed listings are hidden from everyone but their seller, so they land here.
export default function ListingNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className={pageTitle}>This listing is no longer available</h1>
      <p className="text-muted">The seller may have removed it, or the link may be wrong.</p>
      <Link href="/" className={buttonPrimary}>
        Browse fragrances
      </Link>
    </div>
  );
}
