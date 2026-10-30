import Link from "next/link";
import { redirect } from "next/navigation";
import { formatGBP, nextStep, timeLeft, type Order } from "@fragrance/core";
import { listOrders } from "@fragrance/api";
import { BottleTile } from "@/components/BottleTile";
import { NotConnected } from "@/components/NotConnected";
import { ORDER_STATUS_LABELS } from "@/components/labels";
import { pageTitle } from "@/components/ui";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// My orders (004 AC-5.1): Buying and Selling, newest first.
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (!supabaseConfigured) return <NotConnected />;
  const { tab } = await searchParams;
  const role = tab === "selling" ? "seller" : "buyer";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");
  const orders = await listOrders(supabase, user.id, role);

  // The other person: the seller's shop for a buyer, the delivery name for a seller.
  const sellerIds = [...new Set(orders.map((o) => o.sellerId))];
  const { data: shops } = role === "buyer" && sellerIds.length
    ? await supabase.from("sellers").select("id, display_name").in("id", sellerIds)
    : { data: [] };
  const shopOf = new Map((shops ?? []).map((s) => [s.id, s.display_name as string]));
  const other = (o: Order) => (role === "buyer" ? `from ${shopOf.get(o.sellerId) ?? "a seller"}` : `to ${o.shipTo?.name ?? "the buyer"}`);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <h1 className={pageTitle}>Your orders</h1>
      <div role="tablist" className="flex gap-2">
        {(["buyer", "seller"] as const).map((r) => (
          <Link
            key={r}
            role="tab"
            aria-selected={role === r}
            href={r === "seller" ? "/orders?tab=selling" : "/orders"}
            className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-bold ${
              role === r ? "border-brand bg-brand text-white" : "border-field bg-white hover:border-brand"
            }`}
          >
            {r === "buyer" ? "Buying" : "Selling"}
          </Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <p className="text-muted">
          {role === "buyer" ? (
            <>
              Nothing bought yet.{" "}
              <Link href="/#listings" className="font-bold text-brand underline">
                Browse fragrances
              </Link>
            </>
          ) : (
            "Nothing sold yet. Your sales show here, with the label to print."
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const step = nextStep(o, role);
            return (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 hover:border-brand">
                  <span className="size-16 flex-none overflow-hidden rounded-xl">
                    <BottleTile kind={o.item.kind} photo={o.item.photo} alt="" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-extrabold">
                      {o.item.house} {o.item.name}
                    </span>
                    <span className="text-sm text-muted">
                      {o.item.sizeMl}ml · {formatGBP(o.itemPence)} · {other(o)} · {new Date(o.createdAt).toLocaleDateString("en-GB")}
                    </span>
                    <span className="text-sm font-semibold">
                      {step.text}
                      {step.deadline ? ` · ${timeLeft(new Date(step.deadline), now)}` : ""}
                    </span>
                  </span>
                  <span className="rounded-full bg-sky px-3 py-1 text-xs font-bold text-brand-dark">{ORDER_STATUS_LABELS[o.status]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
