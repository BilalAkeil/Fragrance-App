import "server-only";
import Stripe from "stripe";

// The server's Stripe client. Amounts are always integer pence (GBP).
export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

let client: Stripe | undefined;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY isn't set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// 005: a restricted key that can read Identity's sensitive results (the date of
// birth, for the 18+ check). The secret key can't. Undefined when not set.
let identityResults: Stripe | undefined;
export function stripeIdentityResults(): Stripe | undefined {
  if (!process.env.STRIPE_IDENTITY_RESULTS_KEY) return undefined;
  identityResults ??= new Stripe(process.env.STRIPE_IDENTITY_RESULTS_KEY);
  return identityResults;
}
