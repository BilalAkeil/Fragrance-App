import type { Seller } from "./types";

export const CERTIFICATION_RULES = {
  minAverageRating: 4,
  // Placeholder: how many reviews before the rating rule applies is still open.
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
