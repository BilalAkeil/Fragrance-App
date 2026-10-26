import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Sign in or sign up</h1>
      <p className="mb-8 text-muted">We&apos;ll email you a link. No password needed.</p>
      {supabaseConfigured ? <LoginForm /> : <NotConnected />}
    </>
  );
}
