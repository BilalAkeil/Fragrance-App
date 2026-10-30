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

