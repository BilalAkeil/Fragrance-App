import { CERTIFICATION_LABELS, certificationStatus, type Seller } from "@fragrance/core";

export function SellerBadge({ seller }: { seller: Seller }) {
  const status = certificationStatus(seller);
  const tone = status === "certified" ? "bg-verified-tint text-verified-ink" : "bg-neutral-tint text-neutral-ink";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {CERTIFICATION_LABELS[status]}
    </span>
  );
}
