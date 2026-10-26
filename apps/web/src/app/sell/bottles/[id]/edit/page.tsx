import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentSeller } from "@/lib/supabase/server";
import { BottleForm } from "../../BottleForm";

export default async function EditBottlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured) return <NotConnected />;
  const { supabase, user } = await getCurrentSeller();
  if (!user) redirect("/login");

  const { data: bottle } = await supabase
    .from("source_bottles")
    .select("id, seller_id, house, name, size_ml, batch_code, receipt_path, verified_at")
    .eq("id", id)
    .maybeSingle();
  if (!bottle || bottle.seller_id !== user.id) notFound();
  // A checked bottle is final.
  if (bottle.verified_at) redirect("/account");

  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Change your bottle</h1>
      <p className="mb-8 text-muted">
        A new video goes back in the queue for a check.{" "}
        <Link href="/account" className="font-bold text-brand underline">
          Back to your account
        </Link>
      </p>
      <BottleForm
        userId={user.id}
        existing={{
          id: bottle.id,
          house: bottle.house,
          name: bottle.name,
          sizeMl: bottle.size_ml,
          batchCode: bottle.batch_code ?? undefined,
          hasReceipt: Boolean(bottle.receipt_path),
        }}
      />
    </>
  );
}
