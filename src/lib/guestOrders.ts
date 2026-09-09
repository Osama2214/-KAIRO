/**
 * Guest order references kept in the browser.
 *
 * Only the reference and the date are stored — never the customer's name,
 * phone, delivery address, e-mail or payment reference, which previously sat
 * in localStorage under `kairo_orders` on whatever device placed the order.
 * The details are fetched from /api/orders/lookup when they are needed.
 */

const REF_KEY = "kairo_order_refs";

/** The retired key that held complete orders, including personal data. */
const LEGACY_KEY = "kairo_orders";

export interface GuestOrderRef {
  id: string;
  date: string;
}

let migrated = false;

export function readGuestOrderRefs(): GuestOrderRef[] {
  if (typeof window === "undefined") return [];
  // Run the migration on first read rather than relying on a parent component's
  // effect: React runs child effects first, so the account page would otherwise
  // read an empty list on the very first load after this upgrade.
  if (!migrated) purgeLegacyGuestOrders();
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry) => ({ id: entry.id, date: typeof entry.date === "string" ? entry.date : "" }))
      .slice(0, 50);
  } catch {
    return [];
  }
}

export function rememberGuestOrder(id: string, date: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const existing = readGuestOrderRefs().filter((entry) => entry.id !== id);
    localStorage.setItem(REF_KEY, JSON.stringify([{ id, date }, ...existing].slice(0, 50)));
  } catch {}
}

/**
 * Migrates any legacy record to bare references and deletes the personal data
 * that older builds left behind on this device.
 */
export function purgeLegacyGuestOrders(): void {
  if (typeof window === "undefined") return;
  migrated = true;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const carried = parsed
        .filter((order) => order && typeof order.id === "string")
        .map((order) => ({ id: order.id, date: typeof order.date === "string" ? order.date : "" }));
      const merged = [...carried, ...readGuestOrderRefs()];
      const seen = new Set<string>();
      const unique = merged.filter((entry) => !seen.has(entry.id) && seen.add(entry.id));
      localStorage.setItem(REF_KEY, JSON.stringify(unique.slice(0, 50)));
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
  }
}

/** Fetches the server-held records for the references on this device. */
export async function fetchGuestOrders(): Promise<Record<string, unknown>[]> {
  const refs = readGuestOrderRefs();
  if (refs.length === 0) return [];
  try {
    const res = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: refs.map((ref) => ref.id) }),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return data?.success && Array.isArray(data.orders) ? data.orders : [];
  } catch {
    return [];
  }
}
