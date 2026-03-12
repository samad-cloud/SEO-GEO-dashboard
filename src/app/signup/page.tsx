"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const full_name = formData.get("full_name") as string;

    const res = await fetch("/api/signup-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setErrorMessage(data.error ?? "Something went wrong. Please try again.");
    } else {
      setStatus("success");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Request access
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Submit your email and an admin will review your request.
          </p>
        </div>

        {status === "success" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              Your request has been submitted. You&apos;ll receive an invite
              email once an admin approves your access.
            </div>
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              <Link href="/login" className="text-[var(--accent)] hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {status === "error" && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="full_name"
                className="text-sm font-medium text-[var(--muted-foreground)]"
              >
                Full name <span className="text-[var(--muted)]">(optional)</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[var(--muted-foreground)]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--card)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Submitting…" : "Request access"}
            </button>

            <p className="text-center text-sm text-[var(--muted-foreground)]">
              Already have access?{" "}
              <Link href="/login" className="text-[var(--accent)] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
