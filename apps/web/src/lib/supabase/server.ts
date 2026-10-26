import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session instead.
        }
      },
    },
  });
}

// The signed-in user and their seller profile, if any.
export async function getCurrentSeller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, seller: null };
  const { data: seller } = await supabase
    .from("sellers")
    .select("id, display_name, id_verified")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, seller };
}
