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
import { CataloguePicker, UNPICKED_ERROR } from "@/components/CataloguePicker";
import { Field, inputClass } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadToOwnFolder } from "@/lib/upload";
import { buttonPrimary, buttonSecondary } from "@/components/ui";

export interface BottleOption {
  id: string;
  label: string;
  status: string;
}

export interface ExistingPhoto {
  id: string;
  path: string;
  url: string;
}

// What the edit page loads from the listing. Prices are in pence.
export interface ExistingListing {
  id: string;
  kind: ListingKind;
  house: string;
  name: string;
  // Set when the listing is matched to the catalogue.
  fragranceId?: string;
  houseId?: string;
  sizeMl: number;
  fillPercent?: number;
  condition: Condition;
  batchCode?: string;
  pricePence: number;
  postagePence: number;
  notes: string[];
  sourceBottleId?: string;
  hasReceipt: boolean;
  photos: ExistingPhoto[];
}

const pounds = (pence: number) => (pence / 100).toFixed(2);

// Used to create a listing on /sell and to edit one on /listings/[id]/edit.
export function ListingForm({
  userId,
  bottles,
  existing,
}: {
  userId: string;
  bottles: BottleOption[];
  existing?: ExistingListing;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ListingKind>(existing?.kind ?? "full");
  const [photos, setPhotos] = useState<ExistingPhoto[]>(existing?.photos ?? []);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function movePhoto(index: number, by: -1 | 1) {
    setPhotos((list) => {
      const next = [...list];
      const [photo] = next.splice(index, 1);
      next.splice(index + by, 0, photo);
      return next;
    });
  }

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
    const newPhotos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const receipt = form.get("receipt");

    const found = validateListingInput(input, photos.length + newPhotos.length);
    if (text("catalogueState") === "unpicked") found.unshift(UNPICKED_ERROR);
    setErrors(found);
    if (found.length) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const receiptPath =
        receipt instanceof File && receipt.size > 0
          ? await uploadToOwnFolder(supabase, "receipts", userId, receipt)
          : undefined;
      const newPaths = await Promise.all(
        newPhotos.map((p) => uploadToOwnFolder(supabase, "listing-photos", userId, p)),
      );

      const fields = {
        // The database copies the catalogue's spelling over these when it's matched.
        house: input.house,
        name: input.name,
        fragrance_id: text("fragranceId") || null,
        size_ml: input.sizeMl,
        fill_percent: input.fillPercent ?? null,
        condition: input.condition,
        batch_code: input.batchCode ?? null,
        price_pence: input.pricePence,
        postage_pence: input.postagePence,
        notes: input.notes,
        source_bottle_id: input.sourceBottleId ?? null,
        // Left out when editing without a new file, so the current receipt stays.
        ...(receiptPath !== undefined || !existing ? { receipt_path: receiptPath ?? null } : {}),
      };

      let listingId: string;
      if (existing) {
        const { data, error } = await supabase.from("listings").update(fields).eq("id", existing.id).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("This listing can no longer be edited.");
        listingId = existing.id;

        const kept = new Set(photos.map((p) => p.id));
        const dropped = existing.photos.filter((p) => !kept.has(p.id));
        if (dropped.length) {
          const { error: deleteError } = await supabase
            .from("listing_photos")
            .delete()
            .in("id", dropped.map((p) => p.id));
          if (deleteError) throw new Error(deleteError.message);
          await supabase.storage.from("listing-photos").remove(dropped.map((p) => p.path));
        }
        for (const [position, photo] of photos.entries()) {
          const { error: moveError } = await supabase.from("listing_photos").update({ position }).eq("id", photo.id);
          if (moveError) throw new Error(moveError.message);
        }
      } else {
        const { data, error } = await supabase
          .from("listings")
          .insert({ ...fields, seller_id: userId, kind: input.kind, status: "active" })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        listingId = data.id;
      }

      if (newPaths.length) {
        const { error: photoError } = await supabase
          .from("listing_photos")
          .insert(newPaths.map((path, i) => ({ listing_id: listingId, path, position: photos.length + i })));
        if (photoError) throw new Error(photoError.message);
      }

      router.push(`/listings/${listingId}`);
      router.refresh();
    } catch (err) {
      setErrors([(err as Error).message]);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-5 rounded-2xl border border-line bg-white p-6">
      <Field
        label="What are you selling?"
        hint={existing ? "This can't be changed. Remove the listing and list it again instead." : undefined}
      >
        <select
          value={kind}
          disabled={Boolean(existing)}
          onChange={(e) => setKind(e.target.value as ListingKind)}
          className={inputClass}
        >
          <option value="full">Full bottle</option>
          <option value="partial">Partial bottle</option>
          <option value="decant">Decant</option>
        </select>
      </Field>
      {kind === "decant" && (
        <Field
          label="Source bottle (optional)"
          hint="Link the bottle this decant came from. Once our team has checked its video, the listing gets a Verified source badge."
        >
          <select name="sourceBottleId" defaultValue={existing?.sourceBottleId ?? ""} className={inputClass}>
            <option value="">None</option>
            {bottles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label} ({b.status})
              </option>
            ))}
          </select>
          <a href="/sell/bottles" className="text-[13px] font-bold text-brand underline">
            Register a bottle
          </a>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <CataloguePicker
          initial={
            existing && {
              fragranceId: existing.fragranceId,
              houseId: existing.houseId,
              house: existing.house,
              name: existing.name,
            }
          }
        />
        <Field label="Size (ml)">
          <input name="sizeMl" type="number" min={1} required defaultValue={existing?.sizeMl} className={inputClass} />
        </Field>
        {kind === "partial" && (
          <Field label="How full (%)">
            <input
              name="fillPercent"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={existing?.fillPercent}
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Condition">
          <select name="condition" defaultValue={existing?.condition} className={inputClass}>
            <option value="new_sealed">New, sealed</option>
            <option value="new_unsealed">New, unsealed</option>
            <option value="used">Used</option>
          </select>
        </Field>
        <Field label="Batch code (optional)" hint="Printed on the bottom of the bottle or box. Leave it empty if there isn't one.">
          <input name="batchCode" defaultValue={existing?.batchCode} className={inputClass} />
        </Field>
        <Field label="Price (£)">
          <input
            name="price"
            inputMode="decimal"
            required
            defaultValue={existing ? pounds(existing.pricePence) : undefined}
            className={inputClass}
          />
        </Field>
        <Field label="Postage (£)" hint="Tracked postage with any carrier.">
          <input
            name="postage"
            inputMode="decimal"
            required
            defaultValue={existing ? pounds(existing.postagePence) : undefined}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Notes" hint="Separate with commas, for example: bergamot, pepper, amber">
        <input name="notes" defaultValue={existing?.notes.join(", ")} className={inputClass} />
      </Field>
      {photos.length > 0 && (
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1.5 font-bold">Current photos</legend>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {photos.map((p, i) => (
              <li key={p.id} className="flex flex-col gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-square rounded-xl object-cover" />
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Move photo ${i + 1} earlier`}
                    disabled={i === 0}
                    onClick={() => movePhoto(i, -1)}
                    className="rounded-lg border border-field px-2 disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label={`Move photo ${i + 1} later`}
                    disabled={i === photos.length - 1}
                    onClick={() => movePhoto(i, 1)}
                    className="rounded-lg border border-field px-2 disabled:opacity-40"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotos((list) => list.filter((x) => x.id !== p.id))}
                    className="rounded-lg border border-field px-2 text-danger"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <Field
        label={existing ? "Add photos" : "Photos"}
        hint="Show the bottle, the box and the batch code. The first photo is the one buyers see in search."
      >
        <input name="photos" type="file" accept="image/*" multiple className={inputClass} />
      </Field>
      <Field
        label={existing?.hasReceipt ? "Replace proof of purchase (optional)" : "Proof of purchase (optional)"}
        hint="A receipt or order confirmation. Only our team sees it."
      >
        <input name="receipt" type="file" accept="image/*,application/pdf" className={inputClass} />
      </Field>
      {errors.length > 0 && (
        <ul role="alert" className="list-disc rounded-xl bg-red-50 py-3 pl-8 pr-4 text-sm text-red-800">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <button disabled={saving} className={buttonPrimary}>
          {existing ? (saving ? "Saving…" : "Save changes") : saving ? "Listing…" : "List it"}
        </button>
        {existing && (
          <a href={`/listings/${existing.id}`} className={buttonSecondary}>
            Cancel
          </a>
        )}
      </div>
    </form>
  );
}
