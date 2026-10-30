import type { Seller } from "./types";

export const CERTIFICATION_RULES = {
  minAverageRating: 4,
  // 005 Q-1 (settled): 5 reviews before the 4-star rule applies. Vinted has no
  // certification to copy, so this is ours.
  minReviewsForRating: 5,
};

export type CertificationStatus =
  // ID not yet checked.
  | "unverified"
  // ID checked, not enough reviews yet to judge.
  | "new_seller"
  | "certified"
  // Enough reviews, but the average fell below the minimum.
  | "below_rating";

export function certificationStatus(seller: Seller): CertificationStatus {
  if (!seller.idVerified) return "unverified";
  if (seller.reviewCount < CERTIFICATION_RULES.minReviewsForRating) return "new_seller";
  if (seller.averageRating < CERTIFICATION_RULES.minAverageRating) return "below_rating";
  return "certified";
}

export function isCertified(seller: Seller): boolean {
  return certificationStatus(seller) === "certified";
}

export const CERTIFICATION_LABELS: Record<CertificationStatus, string> = {
  unverified: "Not verified",
  new_seller: "ID verified, new seller",
  certified: "Certified seller",
  below_rating: "Certification paused",
};

export interface CertificationProgress {
  status: CertificationStatus;
  label: string;
  // What's needed for the next step (AC-5.2), or how to keep the badge.
  nextStep: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// AC-5.1, AC-5.2: where a seller stands and what they need next.
export function certificationProgress(seller: Seller): CertificationProgress {
  const status = certificationStatus(seller);
  const { minAverageRating, minReviewsForRating } = CERTIFICATION_RULES;
  const label = CERTIFICATION_LABELS[status];
  switch (status) {
    case "unverified":
      return { status, label, nextStep: "Verify your ID to start selling." };
    case "new_seller": {
      const more = minReviewsForRating - seller.reviewCount;
      return {
        status,
        label,
        nextStep: `${plural(more, "more review", "more reviews")} to become certified, with an average of ${minAverageRating}★ or more.`,
      };
    }
    case "certified":
      return { status, label, nextStep: `Keep your average at ${minAverageRating}★ or more to keep your badge.` };
    case "below_rating": {
      // How many 5★ reviews would lift the average back to the minimum.
      const n = seller.reviewCount;
      const needed = Math.max(1, Math.ceil((n * (minAverageRating - seller.averageRating)) / (5 - minAverageRating) - 1e-9));
      return {
        status,
        label,
        nextStep: `Raise your average to ${minAverageRating}★ to get your badge back. ${plural(needed, "more 5★ review", "more 5★ reviews")} would do it.`,
      };
    }
  }
}
