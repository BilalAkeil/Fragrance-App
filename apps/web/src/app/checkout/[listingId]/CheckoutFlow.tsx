"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useMemo, useState } from "react";
import {
  DELIVERY_SERVICES,
  checkoutBreakdown,
  formatGBP,
  validateAddress,
  type AddressInput,
  type DeliveryService,
} from "@fragrance/core";
import type { SavedAddress } from "@fragrance/api";
import { Field, inputClass } from "@/components/Field";
import { buttonPrimary, panel } from "@/components/ui";
import type { Quote } from "@/lib/shipping/types";
import { cancelCheckout, getDeliveryQuotes, startCheckout } from "./actions";

let stripePromise: Promise<Stripe | null> | undefined;

const EMPTY_ADDRESS: AddressInput = { name: "", line1: "", line2: "", town: "", postcode: "" };

// The checkout steps (003 AC-1.2 to AC-1.4, AC-4.1): address, delivery,
// summary, then Stripe's embedded payment form.
export function CheckoutFlow({
  listingId,
  itemPence,
  addresses,
  publishableKey,
}: {
  listingId: string;
  itemPence: number;
  addresses: SavedAddress[];
  publishableKey: string;
}) {
  const [addressId, setAddressId] = useState<string | "new">(addresses[0]?.id ?? "new");
  const [address, setAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>();
  const [service, setService] = useState<DeliveryService>();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<{ clientSecret: string; sessionId: string }>();

  const chosen = addressId === "new" ? undefined : addresses.find((a) => a.id === addressId);
  const postcode = chosen?.postcode ?? address.postcode;
  const quote = quotes?.find((q) => q.service === service);
  const price = quote ? checkoutBreakdown(itemPence, quote.pricePence) : undefined;
  const stripe = useMemo(() => (stripePromise ??= loadStripe(publishableKey)), [publishableKey]);

  // Step 1 → 2: check the address, then fetch the delivery prices for it.
  async function chooseDelivery() {
    const problems = addressId === "new" ? validateAddress(address) : [];
    setErrors(problems);
    if (problems.length) return;
    setBusy(true);
    const result = await getDeliveryQuotes(listingId, postcode);
    setBusy(false);
    if ("error" in result) {
      setQuotes([]);
      setErrors([result.error]);
      return;
    }
    setQuotes(result.quotes);
    setService(result.quotes[0]?.service);
  }

  async function pay() {
    if (!service) return;
    setBusy(true);
    setErrors([]);
    const result = await startCheckout({
      listingId,
      service,
      ...(addressId === "new" ? { address, saveAddress } : { addressId }),
    });
    setBusy(false);
    if ("errors" in result) setErrors(result.errors);
    else setPayment(result);
  }

  async function back() {
    const sessionId = payment?.sessionId;
    setPayment(undefined);
    await cancelCheckout(listingId, sessionId);
  }

  if (payment) {
    return (
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret: payment.clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
        <p className="text-sm text-muted">
          This item is held for you for 30 minutes while you pay.{" "}
          <button type="button" onClick={back} className="font-bold text-brand underline">
            Change address or delivery
          </button>
        </p>
      </div>
    );
  }

  const setField = (field: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress({ ...address, [field]: e.target.value });
    setQuotes(undefined);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className={`${panel} flex flex-col gap-4`}>
        <h2 className="text-lg font-extrabold">1. Delivery address</h2>
        {addresses.length > 0 && (
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="sr-only">Saved addresses</legend>
            {addresses.map((a) => (
              <label key={a.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <input
                  type="radio"
                  name="address"
                  checked={addressId === a.id}
                  onChange={() => {
                    setAddressId(a.id);
                    setQuotes(undefined);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="font-bold">{a.name}</span>, {[a.line1, a.line2, a.town, a.postcode].filter(Boolean).join(", ")}
                </span>
              </label>
            ))}
            <label className="flex items-center gap-3 rounded-xl border border-line p-3">
              <input
                type="radio"
                name="address"
                checked={addressId === "new"}
                onChange={() => {
                  setAddressId("new");
                  setQuotes(undefined);
                }}
              />
              <span className="font-bold">A new address</span>
            </label>
          </fieldset>
        )}
        {addressId === "new" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input value={address.name} onChange={setField("name")} autoComplete="name" className={inputClass} />
            </Field>
            <Field label="Postcode" hint="UK addresses only.">
              <input value={address.postcode} onChange={setField("postcode")} autoComplete="postal-code" className={inputClass} />
            </Field>
            <Field label="Address line 1">
              <input value={address.line1} onChange={setField("line1")} autoComplete="address-line1" className={inputClass} />
            </Field>
            <Field label="Address line 2 (optional)">
              <input value={address.line2} onChange={setField("line2")} autoComplete="address-line2" className={inputClass} />
            </Field>
            <Field label="Town or city">
              <input value={address.town} onChange={setField("town")} autoComplete="address-level2" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              Save this address for next time
            </label>
          </div>
        )}
        {!quotes && (
          <div>
            <button type="button" onClick={chooseDelivery} disabled={busy} className={buttonPrimary}>
              {busy ? "Getting delivery prices…" : "Choose delivery"}
            </button>
          </div>
        )}
      </section>

      {quotes && (
        <section className={`${panel} flex flex-col gap-4`}>
          <h2 className="text-lg font-extrabold">2. Delivery</h2>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted">No delivery services can reach this address.</p>
          ) : (
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="sr-only">Delivery service</legend>
              {quotes.map((q) => (
                <label key={q.service} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="service"
                      checked={service === q.service}
                      onChange={() => setService(q.service)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-bold">{DELIVERY_SERVICES[q.service].name}</span>
                      <span className="text-muted">{DELIVERY_SERVICES[q.service].description}</span>
                    </span>
                  </span>
                  <span className="font-bold">{formatGBP(q.pricePence)}</span>
                </label>
              ))}
            </fieldset>
          )}
        </section>
      )}

      {price && (
        <section className={`${panel} flex flex-col gap-4`}>
          <h2 className="text-lg font-extrabold">3. Summary</h2>
          <dl className="flex flex-col gap-2 text-[15px]">
            <Row label="Item" value={formatGBP(price.itemPence)} />
            <Row label="Postage" value={formatGBP(price.postagePence)} />
            <Row label="Buyer Protection" value={formatGBP(price.protectionFeePence)} />
            <div className="border-t border-line pt-3">
              <Row label="Total" value={formatGBP(price.buyerTotalPence)} bold />
            </div>
          </dl>
          <div className="rounded-xl bg-verified-tint p-4 text-sm text-verified-ink">
            <p className="font-bold">What Buyer Protection covers</p>
            <p className="mt-1">
              We hold your money until you confirm the item is OK. If it doesn&apos;t arrive, isn&apos;t as described or
              isn&apos;t genuine, you get a full refund.
            </p>
          </div>
          <div>
            <button type="button" onClick={pay} disabled={busy} className={buttonPrimary}>
              {busy ? "Starting payment…" : `Pay ${formatGBP(price.buyerTotalPence)}`}
            </button>
          </div>
        </section>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-xl border border-danger-line bg-white px-4 py-3 text-sm text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {quotes && (
        <p className="text-sm">
          <button type="button" onClick={() => setQuotes(undefined)} className="font-bold text-brand underline">
            Change address
          </button>
        </p>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "text-[17px] font-extrabold" : ""}`}>
      <dt className={bold ? "" : "text-muted"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
