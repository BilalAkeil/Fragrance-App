"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  parseNotes,
  parsePounds,
  validateListingInput,
  type Condition,
  type ListingInput,
  type ListingKind,
} from "@fragrance/core";
import { Field, inputClass } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadToOwnFolder } from "@/lib/upload";
import { buttonPrimary } from "@/components/ui";

export interface BottleOption {
  id: string;
  label: string;
}

export function SellForm({ userId, bottles }: { userId: string; bottles: BottleOption[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<ListingKind>("full");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const input: ListingInput = {
      house: text("house").trim(),
      name: text("name").trim(),
      kind,
      sizeMl: Number(text("sizeMl")),
      fillPercent: kind === "partial" ? Number(text("fillPercent")) : undefined,
      condition: text("condition") as Condition,
      batchCode: text("batchCode").trim() || undefined,
      pricePence: parsePounds(text("price")),
      postagePence: parsePounds(text("postage")),
      notes: parseNotes(text("notes")),
      sourceBottleId: kind === "decant" ? text("sourceBottleId") || undefined : undefined,
    };
    const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const receipt = form.get("receipt");

    const found = validateListingInput(input, photos.length);
    setErrors(found);
    if (found.length) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const receiptPath =
        receipt instanceof File && receipt.size > 0
          ? await uploadToOwnFolder(supabase, "receipts", userId, receipt)
          : null;
      const photoPaths = await Promise.all(
        photos.map((p) => uploadToOwnFolder(supabase, "listing-photos", userId, p)),
      );

      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          seller_id: userId,
          house: input.house,
          name: input.name,
          kind: input.kind,
          size_ml: input.sizeMl,
          fill_percent: input.fillPercent ?? null,
          condition: input.condition,
          batch_code: input.batchCode ?? null,
          price_pence: input.pricePence,
          postage_pence: input.postagePence,
          notes: input.notes,
          source_bottle_id: input.sourceBottleId ?? null,
          receipt_path: receiptPath,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const { error: photoError } = await supabase
        .from("listing_photos")
        .insert(photoPaths.map((path, position) => ({ listing_id: listing.id, path, position })));
      if (photoError) throw new Error(photoError.message);

      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setErrors([(err as Error).message]);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-5 rounded-2xl border border-line bg-white p-6">
      <Field label="What are you selling?">
        <select value={kind} onChange={(e) => setKind(e.target.value as ListingKind)} className={inputClass}>
          <option value="full">Full bottle</option>
          <option value="partial">Partial bottle</option>
          <option value="decant">Decant</option>
        </select>
      </Field>
      {kind === "decant" && (
        <Field label="Source bottle" hint="Decants must come from a bottle you registered with a video.">
          {bottles.length ? (
            <select name="sourceBottleId" className={inputClass}>
              {bottles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-muted">
              You have no checked bottles yet. <a href="/sell/bottles" className="font-bold text-brand underline">Register one first.</a>
            </span>
          )}
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand">
          <input name="house" required className={inputClass} />
        </Field>
        <Field label="Fragrance name">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Size (ml)">
          <input name="sizeMl" type="number" min={1} required className={inputClass} />
        </Field>
        {kind === "partial" && (
          <Field label="How full (%)">
            <input name="fillPercent" type="number" min={1} max={100} required className={inputClass} />
          </Field>
        )}
        <Field label="Condition">
          <select name="condition" className={inputClass}>
            <option value="new_sealed">New, sealed</option>
            <option value="new_unsealed">New, unsealed</option>
            <option value="used">Used</option>
          </select>
        </Field>
        <Field label="Batch code (optional)" hint="Printed on the bottom of the bottle or box. Leave it empty if there isn't one.">
          <input name="batchCode" className={inputClass} />
        </Field>
        <Field label="Price (£)">
          <input name="price" inputMode="decimal" required className={inputClass} />
        </Field>
        <Field label="Postage (£)" hint="Tracked postage with any carrier.">
          <input name="postage" inputMode="decimal" required className={inputClass} />
        </Field>
      </div>
      <Field label="Notes" hint="Separate with commas, for example: bergamot, pepper, amber">
        <input name="notes" className={inputClass} />
      </Field>
      <Field label="Photos" hint="Show the bottle, the box and the batch code.">
        <input name="photos" type="file" accept="image/*" multiple className={inputClass} />
      </Field>
      <Field label="Proof of purchase (optional)" hint="A receipt or order confirmation. Only our team sees it.">
        <input name="receipt" type="file" accept="image/*,application/pdf" className={inputClass} />
      </Field>
      {errors.length > 0 && (
        <ul className="list-disc rounded-xl bg-red-50 py-3 pl-8 pr-4 text-sm text-red-800">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <button
        disabled={saving}
        className={`${buttonPrimary} justify-self-start`}
      >
        {saving ? "Listing…" : "List it"}
      </button>
    </form>
  );
}
