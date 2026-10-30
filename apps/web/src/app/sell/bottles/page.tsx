import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { requireVerifiedSeller } from "@/lib/identity";
import { BottleForm } from "./BottleForm";

export default async function RegisterBottlePage() {
  if (!supabaseConfigured) return <NotConnected />;
  // 005 AC-1.1: unverified sellers are sent to verify their ID first.
  const { user } = await requireVerifiedSeller();

  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Register a bottle for decants</h1>
      <p className="mb-8 text-muted">
        Link your decants to this bottle. Once our team has checked the video, they get a Verified source badge. You
        can sell decants up to the bottle&apos;s size in total.
      </p>
      <BottleForm userId={user.id} />
    </>
  );
}
