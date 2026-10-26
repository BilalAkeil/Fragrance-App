"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadToOwnFolder } from "@/lib/upload";
import { buttonPrimary } from "@/components/ui";

export function BottleForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const video = form.get("video");
    const receipt = form.get("receipt");
    if (!(video instanceof File) || video.size === 0) {
      setError("Add a video of the bottle.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const supabase = createClient();
      const videoPath = await uploadToOwnFolder(supabase, "bottle-videos", userId, video);
      const receiptPath =
        receipt instanceof File && receipt.size > 0
          ? await uploadToOwnFolder(supabase, "receipts", userId, receipt)
          : null;
      const { error } = await supabase.from("source_bottles").insert({
        seller_id: userId,
        house: String(form.get("house")).trim(),
        name: String(form.get("name")).trim(),
        size_ml: Number(form.get("sizeMl")),
        batch_code: String(form.get("batchCode")).trim(),
        video_path: videoPath,
        receipt_path: receiptPath,
      });
      if (error) throw new Error(error.message);
      router.push("/account");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-5 rounded-2xl border border-line bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand">
          <input name="house" required className={inputClass} />
        </Field>
        <Field label="Fragrance name">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Bottle size (ml)">
          <input name="sizeMl" type="number" min={5} required className={inputClass} />
        </Field>
        <Field label="Batch code">
          <input name="batchCode" required className={inputClass} />
        </Field>
      </div>
      <Field
        label="Video"
        hint="Film the bottle, box and batch code next to a note with your shop name and today's date."
      >
        <input name="video" type="file" accept="video/*" required className={inputClass} />
      </Field>
      <Field label="Proof of purchase (optional)">
        <input name="receipt" type="file" accept="image/*,application/pdf" className={inputClass} />
      </Field>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <button
        disabled={saving}
        className={`${buttonPrimary} justify-self-start`}
      >
        {saving ? "Uploading…" : "Register bottle"}
      </button>
    </form>
  );
}
