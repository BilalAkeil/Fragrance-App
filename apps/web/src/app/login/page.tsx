import { NotConnected } from "@/components/NotConnected";
import { supabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Sign in or sign up</h1>
      <p className="mb-6 opacity-70">We&apos;ll email you a link. No password needed.</p>
      {supabaseConfigured ? <LoginForm /> : <NotConnected />}
    </>
  );
}
