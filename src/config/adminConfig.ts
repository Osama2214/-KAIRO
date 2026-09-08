/**
 * =======================================================================
 * 🏛️ KAIRO — Admin & Security Configuration
 * =======================================================================
 * 
 * Manage administrative access, security thresholds, and authorized accounts:
 * 1. Master Security PIN (DEFAULT_ADMIN_PIN)
 * 2. Authorized Administrator Emails (AUTHORIZED_ADMIN_EMAILS)
 * 3. Initial Pre-Configured Admin Accounts (INITIAL_ADMIN_ACCOUNTS)
 *
 * NOTE: You can also update the PIN or manage authorized curators directly
 * from inside the Admin Console dashboard under: Settings & Data Integrity.
 */

export interface AdminAccountConfig {
  email: string;
  name: string;
  phone?: string;
  governorate?: string;
}

/**
 * 🔑 1. Master Security PIN
 * Managed securely via server environment variables (ADMIN_PIN) and Neon DB.
 */
export const DEFAULT_ADMIN_PIN = "1234";

/**
 * 🔒 Cryptographic Salt & Initial Hash for Default PIN
 */
export const PIN_SALT = "kairo_master_curator_pin_salt_2026_";
export const DEFAULT_PIN_HASH = "4f966d8470de7fb33f26094bd25c23e927ce49508a0fb115f4744dd4eedd5889";

/**
 * 🛑 Maximum Consecutive Failed Attempts before Security Lockout (Brute-Force Protection)
 */
export const MAX_PIN_ATTEMPTS = 5;

/**
 * ⏳ Security Lockout Duration upon Exhausting Attempts (15 minutes)
 */
export const PIN_LOCKOUT_MS = 15 * 60 * 1000;

/**
 * 🛡️ 2. Authorized Administrator Emails
 * Only authenticated accounts matching these emails are granted administrative curator access.
 */
export const AUTHORIZED_ADMIN_EMAILS: string[] = [
  "admin@kairo.archive",
  "karim@kairo.archive",
];

/**
 * 👤 3. Initial Admin Profile Metadatas
 */
export const INITIAL_ADMIN_ACCOUNTS: AdminAccountConfig[] = [
  {
    email: "admin@kairo.archive",
    name: "Master Curator",
    phone: "+20 100 000 0000",
    governorate: "Cairo",
  },
  {
    email: "karim@kairo.archive",
    name: "Karim El-Sayed",
    phone: "+20 100 234 5678",
    governorate: "Giza",
  },
];
