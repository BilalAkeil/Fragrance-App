import "server-only";
import { cancelUnshippedOrder, completeOrder, retryUnfinishedMoney } from "@/lib/orders";
import { createServiceClient } from "@/lib/supabase/service";

// The order steps of the scheduled job (architecture: "Deadlines and the
// scheduled job"). Each one only picks up orders whose deadline has passed, and
// each order step is safe to run twice.
export async function runOrderDeadlines(now = new Date()) {
  const db = createServiceClient();
  const [{ data: unshipped }, { data: due }] = await Promise.all([
    db.from("orders").select("id").eq("status", "paid").lt("ship_by", now.toISOString()),
    db.from("orders").select("id").eq("status", "delivered").lt("complete_after", now.toISOString()),
  ]);

  const failures: string[] = [];
  const run = async (what: string, id: string, step: () => Promise<unknown>) => {
    try {
      await step();
    } catch (err) {
      failures.push(`${what} ${id}: ${err instanceof Error ? err.message : err}`);
    }
  };
  // 004 AC-2.3 and R-2: not sent in time, so cancelled and refunded in full.
  for (const { id } of unshipped ?? []) await run("cancel", id, () => cancelUnshippedOrder(id));
  // 004 AC-4.3: 48 hours after delivery with no report, so completed and the seller paid.
  for (const { id } of due ?? []) await run("complete", id, () => completeOrder(id, "window_ended"));
  const retried = await retryUnfinishedMoney().catch((err) => {
    failures.push(`retry: ${err instanceof Error ? err.message : err}`);
    return { refunds: 0, transfers: 0 };
  });

  if (failures.length) console.error("Scheduled order steps failed:", failures);
  return { cancelled: unshipped?.length ?? 0, completed: due?.length ?? 0, retried, failures };
}
