import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  // Only pages on this site (the callback checks this again).
  const back = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Sign in or sign up</h1>
      <p className="mb-8 text-muted">
        {reason === "buy" ? "Sign in to buy. We'll bring you straight back to the listing. " : ""}
        We&apos;ll email you a link. No password needed.
      </p>
      {supabaseConfigured ? <LoginForm next={back} /> : <NotConnected />}
    </>
  );
}
