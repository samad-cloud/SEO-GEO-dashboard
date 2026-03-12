/**
 * Returns true if the given user has admin privileges.
 * Admin is identified by the ADMIN_EMAIL environment variable.
 */
export function isAdminUser(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@printerpix.com";
  return !!email && email === adminEmail;
}
