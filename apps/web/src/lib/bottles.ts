import type { SupabaseClient } from "@supabase/supabase-js";

export type BottleReview =
  | { status: "checked" }
  | { status: "waiting" }
  | { status: "rejected"; reason: string };

export interface OwnBottle {
  id: string;
  house: string;
  name: string;
  sizeMl: number;
  review: BottleReview;
}

export const BOTTLE_STATUS_LABELS: Record<BottleReview["status"], string> = {
  checked: "Video checked",
  waiting: "Waiting for a check",
  rejected: "Not approved",
};

// The seller's registered bottles with where their video check stands. A
// rejection only counts for the video it was made on, so a new upload goes
// back to waiting.
export async function loadOwnBottles(supabase: SupabaseClient, userId: string): Promise<OwnBottle[]> {
  const [bottles, rejections] = await Promise.all([
    supabase
      .from("source_bottles")
      .select("id, house, name, size_ml, verified_at, video_path")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("review_decisions")
      .select("item_id, item_path, reason")
      .eq("seller_id", userId)
      .eq("item_type", "bottle")
      .eq("approved", false)
      .order("decided_at"),
  ]);
  if (bottles.error) throw new Error(bottles.error.message);
  // Later decisions overwrite earlier ones.
  const reasons = new Map((rejections.data ?? []).map((r) => [`${r.item_id}:${r.item_path}`, r.reason as string]));

  return (bottles.data ?? []).map((b) => {
    const reason = reasons.get(`${b.id}:${b.video_path}`);
    return {
      id: b.id,
      house: b.house,
      name: b.name,
      sizeMl: b.size_ml,
      review: b.verified_at ? { status: "checked" } : reason ? { status: "rejected", reason } : { status: "waiting" },
    };
  });
}

export function bottleOptions(bottles: OwnBottle[]) {
  return bottles.map((b) => ({
    id: b.id,
    label: `${b.house} ${b.name}, ${b.sizeMl}ml`,
    status: BOTTLE_STATUS_LABELS[b.review.status].toLowerCase(),
  }));
}
