import Link from "next/link";
import { buttonPrimary, pageTitle } from "@/components/ui";

export default function SellerNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className={pageTitle}>We couldn&apos;t find that seller</h1>
      <p className="text-muted">The link may be wrong.</p>
      <Link href="/" className={buttonPrimary}>
        Browse fragrances
      </Link>
    </div>
  );
}
