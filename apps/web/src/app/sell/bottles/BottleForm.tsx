"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CataloguePicker, UNPICKED_ERROR } from "@/components/CataloguePicker";
import { Field, inputClass } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadToOwnFolder } from "@/lib/upload";
import { buttonPrimary } from "@/components/ui";

// What the edit page loads for a bottle that hasn't been checked yet.
export interface ExistingBottle {
  id: string;
  house: string;
  name: string;
  fragranceId?: string;
  houseId?: string;
  sizeMl: number;
  batchCode?: string;
  hasReceipt: boolean;
}

export function BottleForm({ userId, existing }: { userId: string; existing?: ExistingBottle }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const video = form.get("video");
    const receipt = form.get("receipt");
    const hasVideo = video instanceof File && video.size > 0;
    if (form.get("catalogueState") === "unpicked") {
      setError(UNPICKED_ERROR);
      return;
    }
    if (!String(form.get("house")).trim() || !String(form.get("name")).trim()) {
      setError("Enter the brand and the fragrance name.");
      return;
    }
    if (!existing && !hasVideo) {
      setError("Add a video of the bottle.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const supabase = createClient();
      const videoPath = hasVideo ? await uploadToOwnFolder(supabase, "bottle-videos", userId, video) : undefined;
      const receiptPath =
        receipt instanceof File && receipt.size > 0
          ? await uploadToOwnFolder(supabase, "receipts", userId, receipt)
          : undefined;
      const fields = {
        house: String(form.get("house")).trim(),
        name: String(form.get("name")).trim(),
        fragrance_id: String(form.get("fragranceId") ?? "") || null,
        size_ml: Number(form.get("sizeMl")),
        batch_code: String(form.get("batchCode") ?? "").trim() || null,
        // When editing, files are only replaced if a new one was chosen.
        ...(videoPath ? { video_path: videoPath } : {}),
        ...(receiptPath ? { receipt_path: receiptPath } : {}),
      };
      if (existing) {
        // RLS only allows this while the bottle hasn't been checked.
        const { data, error } = await supabase.from("source_bottles").update(fields).eq("id", existing.id).select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("This bottle has been checked, so it can't be changed any more.");
      } else {
        const { error } = await supabase
          .from("source_bottles")
          .insert({ ...fields, seller_id: userId, receipt_path: receiptPath ?? null });
        if (error) throw new Error(error.message);
      }
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-5 rounded-2xl border border-line bg-white p-6">
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
        <Field label="Bottle size (ml)">
          <input name="sizeMl" type="number" min={5} required defaultValue={existing?.sizeMl} className={inputClass} />
        </Field>
        <Field label="Batch code (optional)" hint="Leave it empty if the bottle doesn't have one.">
          <input name="batchCode" defaultValue={existing?.batchCode} className={inputClass} />
        </Field>
      </div>
      <div className="rounded-xl bg-panel p-4 text-sm leading-relaxed">
        <p className="mb-1 font-bold">What the video must show, in one take</p>
        <ol className="list-decimal pl-5">
          <li>The whole bottle.</li>
          <li>The batch code, close up (if there is one).</li>
          <li>A paper note with your shop name and today&apos;s date.</li>
        </ol>
      </div>
      <Field label={existing ? "Replace the video (optional)" : "Video"}>
        <input name="video" type="file" accept="video/*" required={!existing} className={inputClass} />
      </Field>
      <Field label={existing?.hasReceipt ? "Replace proof of purchase (optional)" : "Proof of purchase (optional)"}>
        <input name="receipt" type="file" accept="image/*,application/pdf" className={inputClass} />
      </Field>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <button disabled={saving} className={`${buttonPrimary} justify-self-start`}>
        {saving ? "Uploading…" : existing ? "Save changes" : "Register bottle"}
      </button>
    </form>
  );
}
