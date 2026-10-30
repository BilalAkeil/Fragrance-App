// Prints a sign-in link for local testing, without sending an email. Supabase's
// built-in email sender only allows a couple of emails an hour, which runs out
// fast when testing.
//
//   npx tsx scripts/dev-sign-in.ts you@example.com [http://localhost:3000] [/page/to/land/on]
//
// Open the printed link in any browser and you're signed in as that user. If
// there's no account for the address yet, it creates one, as signing up would.
//
// Needs SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local (Supabase: Project
// Settings > API). Only ever use the development project's key here. It never
// goes in a NEXT_PUBLIC_ variable and is never committed.

import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ENV_FILE = "apps/web/.env.local";

async function main() {
  const [email, site = "http://localhost:3000", next = "/account"] = process.argv.slice(2);
  if (!email?.includes("@")) {
    console.error("Usage: npx tsx scripts/dev-sign-in.ts <email> [site, default http://localhost:3000] [page, default /account]");
    process.exit(1);
  }
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(`Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to ${ENV_FILE} first.`);
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin;
  let link = await admin.generateLink({ type: "magiclink", email });
  if (link.error && (link.error.code === "user_not_found" || link.error.status === 404)) {
    // A new address: create the account first, already confirmed, as clicking a sign-up link would.
    const created = await admin.createUser({ email, email_confirm: true });
    if (created.error) throw created.error;
    link = await admin.generateLink({ type: "magiclink", email });
  }
  if (link.error) throw link.error;

  const params = new URLSearchParams({
    token_hash: link.data.properties.hashed_token,
    type: "magiclink",
    next,
  });
  console.log(`${site}/auth/callback?${params}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
