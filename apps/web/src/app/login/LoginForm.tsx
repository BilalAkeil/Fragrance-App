"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    return <p>Check {email} for a sign-in link.</p>;
  }

  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </label>
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <button
        disabled={state === "sending"}
        className="rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
