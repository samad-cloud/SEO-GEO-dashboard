"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    redirect("/forgot-password?error=" + encodeURIComponent("Email is required"));
  }

  const supabase = await createClient();

  // Build the redirect URL pointing at our auth callback, which will
  // then forward the user to /reset-password once the session is set.
  const headerStore = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    headerStore.get("origin") ||
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    redirect("/forgot-password?error=" + encodeURIComponent(error.message));
  }

  redirect("/forgot-password?sent=1");
}
