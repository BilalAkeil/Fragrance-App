import Link from "next/link";
import { redirect } from "next/navigation";
import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentSeller } from "@/lib/supabase/server";
import { SellForm } from "./SellForm";

export default async function SellPage() {
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user, seller } = await getCurrentSeller();
  if (!user) redirect("/login");
  if (!seller) redirect("/account");

  const { data: bottles } = await supabase
    .from("source_bottles")
    .select("id, house, name, size_ml")
    .eq("seller_id", user.id)
    .not("verified_at", "is", null);

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Sell a fragrance</h1>
      <p className="mb-6 opacity-70">
        Selling is free. <Link href="/account" className="underline">Back to your account</Link>
      </p>
      <SellForm
        userId={user.id}
        bottles={(bottles ?? []).map((b) => ({ id: b.id, label: `${b.house} ${b.name}, ${b.size_ml}ml` }))}
      />
    </>
  );
}
