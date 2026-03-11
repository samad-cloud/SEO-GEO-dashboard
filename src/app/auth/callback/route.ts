import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 *
 * Exchanges the Supabase auth code (from email links) for a session,
 * then redirects the user to `next` (default: /seo).
 *
 * Used by:
 *  - Password reset emails  → ?next=/reset-password
 *  - Magic link emails      → ?next=/seo (or wherever)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/seo";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=` +
        encodeURIComponent("Reset link is invalid or has expired. Please request a new one.")
    );
  }

  return NextResponse.redirect(`${origin}/login`);
}
