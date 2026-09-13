import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { neon } from "@neondatabase/serverless";

export interface ServerOrderItem {
  id?: string;
  volumeId?: string;
  title?: string;
  seriesTitle?: string;
  volumeNumber?: number | string;
  coverImage?: string;
  format?: string;
  /** Figures and posters only; see lib/variants.ts. */
  productType?: "book" | "figure" | "poster";
  parentId?: string;
  variantLabel?: string;
  variantLabelAr?: string;
  price?: number;
  quantity?: number;
}

export interface ServerOrder {
  id: string;
  date: string;
  items: ServerOrderItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount?: number;
  appliedCoupon?: string;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentSenderDetail?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGovernorate?: string;
  timeline: string[];
  trackingNumber?: string;
  trackingUrl?: string;
  courier?: string;
  estimatedDelivery?: string;
  createdAt?: number;
  updatedAt?: number;
  expiresAt?: number;
}

/**
 * Electronic payment hold timeout: 36 hours (1.5 days)
 * Orders paid via electronic wallet or InstaPay that remain unverified by admin for 36 hours are automatically cancelled.
 */
export const PAYMENT_HOLD_TIMEOUT_MS = 36 * 60 * 60 * 1000; // 36 hours (1.5 days)

declare global {
  var __kairo_orders_cache: ServerOrder[] | undefined;
}

const ORDERS_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(ORDERS_DIR, "orders.json");

let writeQueue = Promise.resolve();
const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

/**
 * Vercel's filesystem is ephemeral, so production uses Neon/Postgres whenever
 * DATABASE_URL is configured. The JSON file remains a development fallback.
 */
async function ensureDatabaseSchema(): Promise<void> {
  if (!sql) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_orders (
          id TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          customer_email TEXT,
          customer_phone TEXT
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS kairo_orders_created_at_idx
        ON kairo_orders (created_at DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS kairo_orders_customer_email_idx
        ON kairo_orders (customer_email)
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function parseOrderPayload(payload: unknown): ServerOrder | null {
  try {
    const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
    return parsed && typeof parsed === "object" ? (parsed as ServerOrder) : null;
  } catch {
    return null;
  }
}

async function ensureOrdersFile(): Promise<void> {
  if (!existsSync(ORDERS_DIR)) {
    await mkdir(ORDERS_DIR, { recursive: true });
  }
  if (!existsSync(ORDERS_FILE)) {
    await writeFile(ORDERS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

/**
 * Automatically evaluates and cancels electronic payment orders that exceeded 36 hours without admin verification
 */
export function processExpiredPendingOrders(orders: ServerOrder[]): {
  orders: ServerOrder[];
  changed: ServerOrder[];
  hasChanges: boolean;
  /** Restock and notification work. Await it before the response ends. */
  settled: Promise<void>;
} {
  const now = Date.now();
  const expiredOrdersToNotify: ServerOrder[] = [];

  const updatedOrders = orders.map((order) => {
    const isElectronic = order.paymentMethod === "wallet" || order.paymentMethod === "instapay";
    const isPending = order.paymentStatus === "Pending Verification" || order.status === "Pending Payment";
    const isAlreadyCancelled = order.status.toLowerCase().includes("cancelled");
    const orderTime = order.createdAt || (order.date ? new Date(order.date).getTime() : 0);

    if (isElectronic && isPending && !isAlreadyCancelled && orderTime > 0) {
      if (now - orderTime >= PAYMENT_HOLD_TIMEOUT_MS) {
        const timeline = order.timeline || [];
        const expiredOrder: ServerOrder = {
          ...order,
          status: "Cancelled (Payment Expired)",
          paymentStatus: "Expired / Unverified",
          timeline: [
            ...timeline,
            `Auto-Cancelled: Electronic payment was not verified by admin within 36 hours (1.5 days).`,
          ],
          updatedAt: now,
        };
        expiredOrdersToNotify.push(expiredOrder);
        return expiredOrder;
      }
    }
    return order;
  });

  let settled: Promise<void> = Promise.resolve();

  if (expiredOrdersToNotify.length > 0) {
    settled = (async () => {
      try {
        const { restoreCatalogItems } = await import("./storefrontDataStore");
        for (const exp of expiredOrdersToNotify) {
          if (Array.isArray(exp.items)) {
            await restoreCatalogItems(exp.items);
          }
        }
      } catch (err) {
        console.error("[AUTO-CANCEL RESTOCK ERROR]:", err);
      }

      try {
        const { sendCustomerOrderAutoCancelledEmail } = await import("./email");
        for (const exp of expiredOrdersToNotify) {
          await sendCustomerOrderAutoCancelledEmail(exp);
        }
      } catch (err) {
        console.error("[AUTO-CANCEL EMAIL ERROR]:", err);
      }
    })();
  }

  return {
    orders: updatedOrders,
    changed: expiredOrdersToNotify,
    hasChanges: expiredOrdersToNotify.length > 0,
    settled,
  };
}

/**
 * Loads all orders from central server storage and processes any expired orders
 */
export async function getAllServerOrders(): Promise<ServerOrder[]> {
  if (sql) {
    try {
      await ensureDatabaseSchema();
      const rows = await sql`SELECT payload FROM kairo_orders ORDER BY created_at DESC`;
      const orders = rows
        .map((row) => parseOrderPayload(row.payload))
        .filter((order): order is ServerOrder => order !== null);
      const { orders: processed, changed, settled } = processExpiredPendingOrders(orders);
      // Persist only the orders that expired. This used to rewrite every row in
      // the table whenever a single order timed out.
      if (changed.length > 0) {
        await Promise.all(changed.map((order) => persistOrders(order)));
      }
      await settled;
      return processed;
    } catch (error) {
      console.error("Error reading Neon orders store:", error);
      return [];
    }
  }

  if (globalThis.__kairo_orders_cache) {
    const { orders: processed, hasChanges, settled } = processExpiredPendingOrders(globalThis.__kairo_orders_cache);
    if (hasChanges) {
      await settled;
      globalThis.__kairo_orders_cache = processed;
      persistOrders(processed).catch(console.error);
    }
    return processed;
  }

  try {
    await ensureOrdersFile();
    const raw = await readFile(ORDERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const orders: ServerOrder[] = Array.isArray(parsed) ? parsed : [];
    const { orders: processed, hasChanges, settled } = processExpiredPendingOrders(orders);
    globalThis.__kairo_orders_cache = processed;
    if (hasChanges) {
      await settled;
      persistOrders(processed).catch(console.error);
    }
    return processed;
  } catch (error) {
    console.error("Error reading orders store:", error);
    return globalThis.__kairo_orders_cache || [];
  }
}

/**
 * Loads only the orders owned by one verified patron. This avoids loading the
 * full order archive into a customer-facing request as the database grows.
 */
export async function getServerOrdersByCustomerEmail(email: string): Promise<ServerOrder[]> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return [];

  if (sql) {
    try {
      await ensureDatabaseSchema();
      const rows = await sql`
        SELECT payload FROM kairo_orders
        WHERE LOWER(customer_email) = ${normalizedEmail}
        ORDER BY created_at DESC
      `;
      return rows
        .map((row) => parseOrderPayload(row.payload))
        .filter((order): order is ServerOrder => order !== null);
    } catch (error) {
      console.error("Error reading customer orders from Neon store:", error);
      return [];
    }
  }

  const orders = await getAllServerOrders();
  return orders.filter((order) => order.customerEmail?.trim().toLowerCase() === normalizedEmail);
}

/**
 * Safely persists orders with sequential atomic writes
 */
async function persistOrders(orders: ServerOrder[] | ServerOrder): Promise<void> {
  if (sql) {
    const ordersToSave = Array.isArray(orders) ? orders : [orders];
    await ensureDatabaseSchema();
    await Promise.all(
      ordersToSave.map(async (order) => {
        const createdAt = order.createdAt || Date.now();
        const updatedAt = order.updatedAt || Date.now();
        await sql`
          INSERT INTO kairo_orders (
            id, payload, created_at, updated_at, customer_email, customer_phone
          ) VALUES (
            ${order.id},
            ${JSON.stringify(order)}::jsonb,
            ${createdAt},
            ${updatedAt},
            ${order.customerEmail || null},
            ${order.customerPhone || null}
          )
          ON CONFLICT (id) DO UPDATE SET
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at,
            customer_email = EXCLUDED.customer_email,
            customer_phone = EXCLUDED.customer_phone
        `;
      })
    );
    return;
  }

  if (!Array.isArray(orders)) {
    throw new Error("Local order persistence requires the full orders list.");
  }
  globalThis.__kairo_orders_cache = orders;
  writeQueue = writeQueue.then(async () => {
    try {
      await ensureOrdersFile();
      const tmpFile = `${ORDERS_FILE}.tmp-${Date.now()}`;
      await writeFile(tmpFile, JSON.stringify(orders, null, 2), "utf-8");
      // Atomic overwrite
      const { rename } = await import("fs/promises");
      await rename(tmpFile, ORDERS_FILE);
    } catch (err) {
      console.error("Failed to persist orders file:", err);
    }
  });
  await writeQueue;
}

/**
 * Adds or updates an order in central storage
 */
export async function saveServerOrder(order: ServerOrder): Promise<ServerOrder> {
  const createdAt = order.createdAt || Date.now();
  const isElectronic = order.paymentMethod === "wallet" || order.paymentMethod === "instapay";
  const expiresAt = isElectronic ? createdAt + PAYMENT_HOLD_TIMEOUT_MS : undefined;

  const enrichedOrder: ServerOrder = {
    ...order,
    createdAt,
    expiresAt,
    updatedAt: Date.now(),
  };

  if (sql) {
    // A single upsert; loading the full archive to append one order made every
    // checkout scale with the number of orders ever placed.
    await persistOrders(enrichedOrder);
    return enrichedOrder;
  }

  const orders = await getAllServerOrders();
  const existingIdx = orders.findIndex((o) => o.id === enrichedOrder.id);
  const updatedList = existingIdx >= 0 ? [...orders] : [enrichedOrder, ...orders];
  if (existingIdx >= 0) {
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...enrichedOrder };
  }
  await persistOrders(updatedList);
  return enrichedOrder;
}

export interface UpdateOrderResult {
  updated: ServerOrder;
  previous: ServerOrder;
}

/**
 * Updates status or details of an existing order
 */
export async function updateServerOrderStatus(
  orderId: string,
  updates: Partial<ServerOrder>
): Promise<UpdateOrderResult | null> {
  const orders = sql ? [] : await getAllServerOrders();
  const idx = sql ? -1 : orders.findIndex((o) => o.id === orderId);
  const current = sql ? await getServerOrderById(orderId) : (idx >= 0 ? orders[idx] : null);
  if (!current) return null;
  
  // If payment status is marked verified, clear the expiration requirement
  let expiresAt = current.expiresAt;
  if (updates.paymentStatus === "Verified & Paid" || updates.status === "Confirmed") {
    expiresAt = undefined;
  }

  const updated: ServerOrder = {
    ...current,
    ...updates,
    expiresAt,
    timeline: updates.timeline || current.timeline,
    updatedAt: Date.now(),
  };

  // If order is transitioned to Cancelled, return reserved items back to catalogue
  const isNowCancelled = String(updates.status || "").toLowerCase().includes("cancelled");
  const wasAlreadyCancelled = String(current.status || "").toLowerCase().includes("cancelled");
  if (isNowCancelled && !wasAlreadyCancelled && Array.isArray(current.items)) {
    try {
      const { restoreCatalogItems } = await import("./storefrontDataStore");
      await restoreCatalogItems(current.items);
    } catch (restockErr) {
      console.error("[ADMIN CANCEL RESTOCK ERROR]:", restockErr);
    }
  }

  if (sql) {
    await persistOrders(updated);
    return { updated, previous: current };
  }

  const updatedList = [...orders];
  updatedList[idx] = updated;
  await persistOrders(updatedList);
  return { updated, previous: current };
}

/**
 * Loads a single order by reference without pulling the whole archive.
 */
export async function getServerOrderById(orderId: string): Promise<ServerOrder | null> {
  if (!sql) {
    const orders = await getAllServerOrders();
    return orders.find((order) => order.id === orderId) || null;
  }
  await ensureDatabaseSchema();
  const rows = await sql`SELECT payload FROM kairo_orders WHERE id = ${orderId} LIMIT 1`;
  return rows[0] ? parseOrderPayload(rows[0].payload) : null;
}

/**
 * Loads a bounded set of orders by reference. Used by the status poller so it
 * never has to read every order in the table to answer for a handful of ids.
 */
export async function getServerOrdersByIds(orderIds: string[]): Promise<ServerOrder[]> {
  const ids = [...new Set(orderIds.filter(Boolean))].slice(0, 30);
  if (ids.length === 0) return [];

  if (!sql) {
    const orders = await getAllServerOrders();
    const idSet = new Set(ids);
    return orders.filter((order) => idSet.has(order.id));
  }

  await ensureDatabaseSchema();
  const rows = await sql`
    SELECT payload FROM kairo_orders
    WHERE id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
  `;
  const orders = rows
    .map((row) => parseOrderPayload(row.payload))
    .filter((order): order is ServerOrder => order !== null);
  const { orders: processed, changed, settled } = processExpiredPendingOrders(orders);
  if (changed.length > 0) await Promise.all(changed.map((order) => persistOrders(order)));
  await settled;
  return processed;
}
