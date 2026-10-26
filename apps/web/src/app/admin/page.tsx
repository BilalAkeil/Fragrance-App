import Link from "next/link";
import { formatGBP } from "@fragrance/core";
import { inputClass } from "@/components/Field";
import { buttonSecondary, pageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { reviewBottle, reviewReceipt } from "./actions";

const BOTTLE_REASONS = [
  "Video unclear, please film it again",
  "Batch code not visible",
  "Note with your shop name and date not shown",
  "Bottle doesn't match the fragrance entered",
  "Suspected counterfeit",
];

const RECEIPT_REASONS = [
  "Receipt unreadable, please upload a clearer copy",
  "Receipt doesn't show this fragrance",
  "Name or shop on the receipt doesn't match",
];

interface QueueItem {
  key: string;
  kind: "bottle" | "receipt";
  id: string;
  path: string;
  seller: string;
  title: string;
  submitted: string;
}

function since(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; error?: string }>;
}) {
  const { item, error } = await searchParams;
  const supabase = await createClient();

  const [bottles, receipts, rejections] = await Promise.all([
    supabase
      .from("source_bottles")
      .select("id, house, name, size_ml, batch_code, video_path, receipt_path, created_at, sellers(display_name)")
      .is("verified_at", null)
      .order("created_at"),
    supabase
      .from("listings")
      .select(
        "id, house, name, size_ml, kind, batch_code, price_pence, receipt_path, created_at, sellers(display_name)",
      )
      .not("receipt_path", "is", null)
      .eq("receipt_verified", false)
      .order("created_at"),
    supabase.from("review_decisions").select("item_type, item_id, item_path").eq("approved", false),
  ]);

  // A rejection only holds for the file it was made on. A new upload goes back in the queue.
  const rejected = new Set((rejections.data ?? []).map((r) => `${r.item_type}:${r.item_id}:${r.item_path}`));
  const waiting = <T extends { id: string }>(kind: QueueItem["kind"], rows: T[] | null, path: (row: T) => string) =>
    (rows ?? []).filter((row) => !rejected.has(`${kind}:${row.id}:${path(row)}`));

  const sellerName = (s: unknown) =>
    (Array.isArray(s) ? s[0]?.display_name : (s as { display_name?: string } | null)?.display_name) ?? "Unknown seller";

  const queue: QueueItem[] = [
    ...waiting("bottle", bottles.data, (b) => b.video_path).map((b) => ({
      key: `bottle:${b.id}`,
      kind: "bottle" as const,
      id: b.id,
      path: b.video_path,
      seller: sellerName(b.sellers),
      title: `${b.house} ${b.name} ${b.size_ml}ml`,
      submitted: b.created_at,
    })),
    ...waiting("receipt", receipts.data, (l) => l.receipt_path ?? "").map((l) => ({
      key: `receipt:${l.id}`,
      kind: "receipt" as const,
      id: l.id,
      path: l.receipt_path ?? "",
      seller: sellerName(l.sellers),
      title: `${l.house} ${l.name} ${l.size_ml}ml`,
      submitted: l.created_at,
    })),
  ].sort((a, b) => a.submitted.localeCompare(b.submitted));

  const selected = queue.find((q) => q.key === item) ?? queue[0];
  const bottle = selected?.kind === "bottle" ? bottles.data?.find((b) => b.id === selected.id) : undefined;
  const listing = selected?.kind === "receipt" ? receipts.data?.find((l) => l.id === selected.id) : undefined;

  const signed = async (bucket: string, path: string | null | undefined) =>
    path ? (await supabase.storage.from(bucket).createSignedUrl(path, 600)).data?.signedUrl : undefined;
  const videoUrl = await signed("bottle-videos", bottle?.video_path);
  const receiptUrl = await signed("receipts", bottle?.receipt_path ?? listing?.receipt_path);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className={pageTitle}>Review queue</h1>
        <p className="text-muted">Oldest first. An approved bottle gives its decants the Verified source badge.</p>
      </div>

      {queue.length === 0 ? (
        <p className="rounded-2xl border border-line p-6 text-muted">Nothing waiting. Nice.</p>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <ul className="overflow-hidden rounded-2xl border border-line lg:w-80">
            {queue.map((q) => (
              <li key={q.key}>
                <Link
                  href={`/admin?item=${q.key}`}
                  aria-current={q.key === selected?.key ? "true" : undefined}
                  className={`flex flex-col gap-1 border-b border-line px-4 py-3 ${
                    q.key === selected?.key ? "bg-sky shadow-[inset_3px_0_0_var(--color-brand)]" : ""
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-extrabold">{q.seller}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        q.kind === "bottle" ? "bg-decant-tint text-decant-ink" : "bg-neutral-tint text-brand"
                      }`}
                    >
                      {q.kind === "bottle" ? "Bottle video" : "Receipt"}
                    </span>
                  </span>
                  <span className="text-sm text-muted">
                    {q.title} · waiting {since(q.submitted)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {selected && (
            <section className="flex min-w-0 flex-1 flex-col gap-4 rounded-2xl border border-line p-5">
              <h2 className="text-xl font-extrabold">
                {selected.kind === "bottle" ? "Bottle video" : "Proof of purchase"} · {selected.seller}
              </h2>

              {bottle && (
                <>
                  {videoUrl ? (
                    <video src={videoUrl} controls className="aspect-video w-full rounded-xl bg-black" />
                  ) : (
                    <p className="text-sm text-muted">The video couldn&apos;t be loaded.</p>
                  )}
                  <dl className="grid grid-cols-[minmax(110px,150px)_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted">Bottle claimed</dt>
                    <dd className="font-semibold">{selected.title}</dd>
                    <dt className="text-muted">Batch code entered</dt>
                    <dd className="font-semibold">{bottle.batch_code}</dd>
                    <dt className="text-muted">Receipt</dt>
                    <dd className="font-semibold">
                      {receiptUrl ? (
                        <a href={receiptUrl} target="_blank" className="underline">
                          Open receipt
                        </a>
                      ) : (
                        "None"
                      )}
                    </dd>
                  </dl>
                  <Checks
                    items={[
                      "Whole bottle visible, matches the fragrance claimed",
                      "Batch code readable and matches what was entered",
                      "Paper note shows the shop name and a recent date",
                      "One continuous take, no obvious edits",
                    ]}
                  />
                </>
              )}

              {listing && (
                <>
                  {receiptUrl && (
                    <a href={receiptUrl} target="_blank" className="underline">
                      Open the receipt in a new tab
                    </a>
                  )}
                  <dl className="grid grid-cols-[minmax(110px,150px)_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted">Listing</dt>
                    <dd className="font-semibold">
                      <Link href={`/listings/${listing.id}`} className="underline">
                        {selected.title} {listing.kind}
                      </Link>
                    </dd>
                    <dt className="text-muted">Batch code</dt>
                    <dd className="font-semibold">{listing.batch_code}</dd>
                    <dt className="text-muted">Price</dt>
                    <dd className="font-semibold">{formatGBP(listing.price_pence)}</dd>
                  </dl>
                  <Checks items={["Receipt shows this fragrance and size", "Receipt looks genuine and unedited"]} />
                </>
              )}

              <form
                action={selected.kind === "bottle" ? reviewBottle : reviewReceipt}
                className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end"
              >
                <input type="hidden" name="id" value={selected.id} />
                <input type="hidden" name="item" value={selected.key} />
                <input type="hidden" name="path" value={selected.path} />
                <label className="flex flex-1 flex-col gap-1 text-sm font-bold">
                  If rejecting, tell the seller why
                  <select name="reason" className={`${inputClass} font-normal`}>
                    <option value="">Choose a reason</option>
                    {(selected.kind === "bottle" ? BOTTLE_REASONS : RECEIPT_REASONS).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <button
                  name="decision"
                  value="reject"
                  className={`${buttonSecondary} border-danger-line text-danger hover:border-danger`}
                >
                  Reject
                </button>
                <button
                  name="decision"
                  value="approve"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-verified px-5 font-bold text-white hover:bg-verified-ink"
                >
                  Approve
                </button>
              </form>
              {error === "reason" && <p className="text-sm text-danger">Choose a reason before rejecting.</p>}
              {error === "changed" && (
                <p className="text-sm text-danger">
                  The seller uploaded a new file while you were reviewing. Check the new one.
                </p>
              )}
              {error === "save" && <p className="text-sm text-danger">That didn&apos;t save. Please try again.</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Checks({ items }: { items: string[] }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-extrabold">Checks</legend>
      {items.map((c) => (
        <label key={c} className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-verified" /> {c}
        </label>
      ))}
    </fieldset>
  );
}
