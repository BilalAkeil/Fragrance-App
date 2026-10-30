import "server-only";
import { fakeProvider } from "./fake";
import type { ShippingProvider } from "./types";

export * from "./types";

// Picked with SHIPPING_PROVIDER. Only "fake" exists until 004 Q-1 is settled.
export const shippingProviderName = process.env.SHIPPING_PROVIDER ?? "fake";

export function shippingProvider(): ShippingProvider {
  if (shippingProviderName === "fake") return fakeProvider;
  throw new Error(`Unknown SHIPPING_PROVIDER "${shippingProviderName}"`);
}
