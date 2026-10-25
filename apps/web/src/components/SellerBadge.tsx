import { CERTIFICATION_LABELS, certificationStatus, type Seller } from "@fragrance/core";

export function SellerBadge({ seller }: { seller: Seller }) {
  const status = certificationStatus(seller);
  const tone =
    status === "certified"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
      : "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {CERTIFICATION_LABELS[status]}
    </span>
  );
}
