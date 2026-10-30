import Link from "next/link";
import { NotConnected } from "@/components/NotConnected";
import { bottleOptions, loadOwnBottles } from "@/lib/bottles";
import { supabaseConfigured } from "@/lib/supabase/config";
import { requireVerifiedSeller } from "@/lib/identity";
import { ListingForm } from "./ListingForm";

export default async function SellPage() {
  if (!supabaseConfigured) return <NotConnected />;
  // 005 AC-1.1: unverified sellers are sent to verify their ID first.
  const { supabase, user } = await requireVerifiedSeller();

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
