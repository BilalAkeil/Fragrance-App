import { DELIVERY_SERVICES, type DeliveryService, type Parcel } from "@fragrance/core";
import type { ShippingProvider, ShipTo } from "./types";

// Prices until the broker is chosen (004 Q-1). Placeholder: roughly Royal
// Mail's online prices for a small and a medium parcel.
const FAKE_PRICES_PENCE: Record<Parcel["sizeClass"], Record<DeliveryService, number>> = {
  small: { tracked48: 335, tracked24: 425 },
  medium: { tracked48: 595, tracked24: 695 },
};

// The fake provider: fixed prices, a printable placeholder label, and tracking
// that an admin steps through by hand on /admin/shipments.
export const fakeProvider: ShippingProvider = {
  name: "fake",

  async quote(parcel) {
    return (["tracked48", "tracked24"] as DeliveryService[]).map((service) => ({
      service,
      pricePence: FAKE_PRICES_PENCE[parcel.sizeClass][service],
    }));
  },

  async createLabel({ orderId }) {
    const ref = `FK${orderId.replace(/-/g, "").slice(0, 10).toUpperCase()}GB`;
    return { providerRef: `fake-${orderId}`, trackingRef: ref, labelRef: ref };
  },

  async labelPdf(labelRef, shipTo, service) {
    return simplePdf([
      "TEST LABEL - NOT VALID FOR POSTING",
      DELIVERY_SERVICES[service].name,
      `Tracking: ${labelRef}`,
      "ID8000 - perfume, limited quantity",
      "",
      "Deliver to:",
      shipTo.name,
      shipTo.line1,
      ...(shipTo.line2 ? [shipTo.line2] : []),
      shipTo.town,
      shipTo.postcode,
    ]);
  },

  async parseWebhook() {
    // Tracking for the fake provider is stepped on /admin/shipments instead.
    throw new Error("The fake shipping provider has no webhooks");
  },
};

// A one-page PDF with lines of text, enough for a placeholder label.
function simplePdf(lines: string[]): Uint8Array {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "?");
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 14 : 12} Tf 40 ${380 - i * 22} Td (${escape(l)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    // A 4x6 inch label.
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 288 432] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

export type { ShipTo };
