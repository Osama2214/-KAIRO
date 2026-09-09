import "server-only";

/**
 * =======================================================================
 * 🏛️ YUJI — Admin Access Configuration (SERVER ONLY)
 * =======================================================================
 *
 * This module must never be imported from client code: it names the real
 * people who can reach the curator console. `import "server-only"` turns any
 * such import into a build error rather than a silent bundle leak.
 *
 * The master PIN is not here. It lives as a scrypt hash in Neon
 * (`kairo_admin_security`), bootstrapped from the ADMIN_PIN environment
 * variable — see `lib/adminSecurityStore.ts`.
 *
 * Client-safe constants are in `adminPublic.ts`.
 */

/**
 * 🛡️ Authorized administrator emails.
 * Only accounts matching these — or ADMIN_EMAIL — are granted curator access.
 */
export const AUTHORIZED_ADMIN_EMAILS: string[] = [
  "admin@kairo.archive",
  "karim@kairo.archive",
  "osamahamad261981@gmail.com",
];

/**
 * Resolves the full authorized set, including the ADMIN_EMAIL override.
 */
export function authorizedAdminEmails(): string[] {
  const envAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const list = AUTHORIZED_ADMIN_EMAILS.map((email) => email.trim().toLowerCase());
  return envAdmin && !list.includes(envAdmin) ? [...list, envAdmin] : list;
}

/**
 * True when `email` may hold a curator session.
 */
export function isAuthorizedAdminEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  return authorizedAdminEmails().includes(email.trim().toLowerCase());
}
