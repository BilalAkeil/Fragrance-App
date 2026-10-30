import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Finishes an email sign-in. Two kinds of link land here:
//   ?code=...                    the emailed link (PKCE), opened in the browser that asked for it
//   ?token_hash=...&type=...     a link with a one-time token, which works in any browser
//                                (scripts/dev-sign-in.ts prints these for local testing)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  // Only allow redirects within this site.
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";

  if (code || (tokenHash && type)) {
    const supabase = await createClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: type!, token_hash: tokenHash! });
    if (!error) return NextResponse.redirect(`${origin}${target}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
