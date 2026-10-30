import type { DeliveryService, Parcel } from "@fragrance/core";

// Architecture: the shipping broker sits behind this interface, so the fake
// one can be swapped for Sendcloud or Royal Mail (004 Q-1) without touching
// the rest of the app.

export interface Quote {
  service: DeliveryService;
  pricePence: number;
}

export interface ShipTo {
  name: string;
  line1: string;
  line2?: string;
  town: string;
  postcode: string;
}

export interface Label {
  providerRef: string;
  trackingRef: string;
  labelRef: string;
}

export interface TrackingUpdate {
  trackingRef: string;
  at: Date;
  status: "scanned" | "in_transit" | "delivered" | "exception";
  description: string;
}

export interface ShippingProvider {
  name: string;
  // Prices for each service that can carry this parcel.
  quote(parcel: Parcel, fromPostcode: string | undefined, toPostcode: string): Promise<Quote[]>;
  createLabel(shipment: { orderId: string; service: DeliveryService; parcel: Parcel; shipTo: ShipTo }): Promise<Label>;
  // The label as a PDF, for the seller to print.
  labelPdf(labelRef: string, shipTo: ShipTo, service: DeliveryService): Promise<Uint8Array>;
  // Tracking updates from the provider's webhook. Throws if it isn't genuine.
  parseWebhook(request: Request): Promise<TrackingUpdate[]>;
}
