import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, full_name } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("signup_requests")
    .insert({ email: email.toLowerCase().trim(), full_name: full_name ?? null });

  if (error) {
    if (error.code === "23505") {
      // unique_violation — email already requested
      return NextResponse.json(
        { error: "A request with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
