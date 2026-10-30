import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

// The platform's own client (architecture: "Who writes what"). It bypasses RLS,
// so it's only used in webhooks, the scheduled job and admin actions, after
// checking who is asking. The key never leaves the server.
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY isn't set");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
