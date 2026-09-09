/**
 * Admin constants that are safe to ship in the browser bundle.
 *
 * Everything identifying (the curator allow-list) or secret (PIN material)
 * lives in `adminConfig.ts`, which is server-only. Keeping them in one shared
 * module meant the allow-list — real personal e-mail addresses — was readable
 * in the public JavaScript of every page.
 */

/** Maximum consecutive failed PIN attempts before lockout. */
export const MAX_PIN_ATTEMPTS = 5;

/** Lockout duration once attempts are exhausted (15 minutes). */
export const PIN_LOCKOUT_MS = 15 * 60 * 1000;
