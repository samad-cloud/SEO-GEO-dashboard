import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/seo";

  const supabase = await createClient();

  // Handle PKCE code exchange (password reset, magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=` +
        encodeURIComponent("Link is invalid or has expired.")
    );
  }

  // Handle token_hash exchange (invite emails)
  if (tokenHash && type) {
    const validTypes = ["invite", "email", "recovery", "magiclink"] as const;
    type ValidOtpType = typeof validTypes[number];

    if (!validTypes.includes(type as ValidOtpType)) {
      return NextResponse.redirect(
        `${origin}/login?error=` + encodeURIComponent("Invalid verification link.")
      );
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as ValidOtpType,
    });
    if (!error) {
      // Redirect to password setup so user can set their password
      return NextResponse.redirect(
        `${origin}/reset-password?invited=true&next=${encodeURIComponent(next)}`
      );
    }
    return NextResponse.redirect(
      `${origin}/login?error=` +
        encodeURIComponent("Invite link is invalid or has expired.")
    );
  }

  return NextResponse.redirect(`${origin}/login`);
}
