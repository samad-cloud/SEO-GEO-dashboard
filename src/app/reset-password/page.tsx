import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invited?: string; next?: string }>;
}) {
  const { error, invited, next } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {invited ? "Set your password" : "Reset password"}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {invited
              ? "Welcome! Please set a password to complete your account setup."
              : "Enter and confirm your new password."}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/seo"} />
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[var(--muted-foreground)]"
            >
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              placeholder="Min. 8 characters"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-[var(--muted-foreground)]"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              placeholder="Repeat your password"
            />
          </div>

          <button
            formAction={updatePassword}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--card)] transition-colors"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
