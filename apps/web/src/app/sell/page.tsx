import Link from "next/link";
import { redirect } from "next/navigation";
import { NotConnected } from "@/components/NotConnected";
import { bottleOptions, loadOwnBottles } from "@/lib/bottles";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentSeller } from "@/lib/supabase/server";
import { ListingForm } from "./ListingForm";

export default async function SellPage() {
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user, seller } = await getCurrentSeller();
  if (!user) redirect("/login");
  if (!seller) redirect("/account");

  const bottles = await loadOwnBottles(supabase, user.id);

  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Sell a fragrance</h1>
      <p className="mb-8 text-muted">
        Selling is free. <Link href="/account" className="font-bold text-brand underline">Back to your account</Link>
      </p>
      <ListingForm userId={user.id} bottles={bottleOptions(bottles)} />
    </>
  );
}
