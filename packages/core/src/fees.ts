// Sellers pay nothing. Buyers pay a Buyer Protection fee at checkout that
// covers card processing and refunds for fakes.

// Placeholder rate until the real level is decided.
export const BUYER_PROTECTION = { percent: 0.04, fixedPence: 50 };

// Stripe UK rates per successful card payment (stripe.com/gb/pricing).
export const CARD_RATES = {
  standard: { percent: 0.015, fixedPence: 20 },
  premium: { percent: 0.028, fixedPence: 20 },
} as const;

export type CardType = keyof typeof CARD_RATES;

export function buyerProtectionFee(itemPence: number): number {
  return Math.round(itemPence * BUYER_PROTECTION.percent) + BUYER_PROTECTION.fixedPence;
}

export function cardProcessingFee(chargedPence: number, card: CardType = "standard"): number {
  const rate = CARD_RATES[card];
  return Math.round(chargedPence * rate.percent) + rate.fixedPence;
}

export interface CheckoutBreakdown {
  itemPence: number;
  postagePence: number;
  protectionFeePence: number;
  buyerTotalPence: number;
  cardFeePence: number;
  sellerReceivesPence: number;
  platformKeepsPence: number;
}

export function checkoutBreakdown(
  itemPence: number,
  postagePence: number,
  card: CardType = "standard",
): CheckoutBreakdown {
  const protectionFeePence = buyerProtectionFee(itemPence);
  const buyerTotalPence = itemPence + postagePence + protectionFeePence;
  const cardFeePence = cardProcessingFee(buyerTotalPence, card);
  return {
    itemPence,
    postagePence,
    protectionFeePence,
    buyerTotalPence,
    cardFeePence,
    sellerReceivesPence: itemPence + postagePence,
    platformKeepsPence: protectionFeePence - cardFeePence,
  };
}

export function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}
