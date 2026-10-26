import { redirect } from "next/navigation";
import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentSeller } from "@/lib/supabase/server";
import { BottleForm } from "./BottleForm";

export default async function RegisterBottlePage() {
  if (!supabaseConfigured) return <NotConnected />;
  const { user, seller } = await getCurrentSeller();
  if (!user) redirect("/login");
  if (!seller) redirect("/account");

  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Register a bottle for decants</h1>
      <p className="mb-8 text-muted">
        Our team checks the video before you can sell decants from this bottle. You can sell decants
        up to the bottle&apos;s size in total.
      </p>
      <BottleForm userId={user.id} />
    </>
  );
}
