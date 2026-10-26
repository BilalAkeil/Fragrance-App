"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/Field";
import { buttonPrimary } from "@/components/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(undefined);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
    });
    if (error) {
      setError(error.message);
      setState("idle");
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <p className="max-w-md rounded-2xl bg-verified-tint p-6 font-semibold text-verified-ink">
        Check {email} for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4 rounded-2xl border border-line bg-white p-6">
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <button
        disabled={state === "sending"}
        className={buttonPrimary}
      >
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
