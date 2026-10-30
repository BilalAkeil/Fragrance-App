import Link from "next/link";
import { DELIVERY_SERVICES, type DeliveryService, type OrderStatus } from "@fragrance/core";
import { ORDER_STATUS_LABELS } from "@/components/labels";
import { buttonPrimary, pageTitle, panel } from "@/components/ui";
import { shippingProviderName } from "@/lib/shipping";
import { createClient } from "@/lib/supabase/server";
import { expireDeadline, runScheduledJob, stepTracking } from "./actions";

const small = "rounded-full border border-field bg-white px-3 py-1.5 text-xs font-bold hover:border-brand";

interface Row {
  id: string;
  status: OrderStatus;
  ship_by: string | null;
  complete_after: string | null;
  listings: { house: string; name: string } | null;
  shipments: { tracking_ref: string; service: DeliveryService } | null;
}

// Development only: step the fake provider's tracking and the deadlines.
export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; cancelled?: string; completed?: string; failures?: string }>;
}) {
  if (shippingProviderName !== "fake") {
    return <p className="text-muted">Tracking comes from {shippingProviderName}, so there&apos;s nothing to step here.</p>;
  }
  const { done, cancelled, completed, failures } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, status, ship_by, complete_after, listings(house, name), shipments(tracking_ref, service)")
    .in("status", ["paid", "shipped", "delivered"])
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as unknown as Row[];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className={pageTitle}>Test shipments</h1>
        <p className="text-muted">
          Development only. Stands in for Royal Mail&apos;s tracking and for time passing, until a real shipping provider
          is chosen.
        </p>
      </div>
      {done === "job" && (
        <p className="text-sm font-semibold">
          Scheduled job ran: {cancelled} cancelled, {completed} completed{Number(failures) ? `, ${failures} failed (see the server log)` : ""}.
        </p>
      )}
      <form action={runScheduledJob}>
        <button className={buttonPrimary}>Run the scheduled job now</button>
      </form>
      {orders.length === 0 ? (
        <p className="text-muted">No orders on their way.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id} className={`${panel} flex flex-col gap-3`}>
              <p>
                <Link href={`/orders/${o.id}`} className="font-bold text-brand underline">
                  {o.listings?.house} {o.listings?.name}
                </Link>{" "}
                <span className="text-sm text-muted">
                  · {ORDER_STATUS_LABELS[o.status]}
                  {o.shipments ? ` · ${DELIVERY_SERVICES[o.shipments.service].name} ${o.shipments.tracking_ref}` : " · no label yet"}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {o.shipments &&
                  (["scanned", "in_transit", "delivered"] as const).map((status) => (
                    <form key={status} action={stepTracking}>
                      <input type="hidden" name="trackingRef" value={o.shipments!.tracking_ref} />
                      <input type="hidden" name="status" value={status} />
                      <button className={small}>Tracking: {status.replace("_", " ")}</button>
                    </form>
                  ))}
                {o.status === "paid" && (
                  <form action={expireDeadline}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="deadline" value="ship_by" />
                    <button className={small}>Make ship-by overdue</button>
                  </form>
                )}
                {o.status === "delivered" && (
                  <form action={expireDeadline}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="deadline" value="complete_after" />
                    <button className={small}>End the 48 hours</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
