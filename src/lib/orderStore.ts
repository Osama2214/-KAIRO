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
export function processExpiredPendingOrders(orders: ServerOrder[]): { orders: ServerOrder[]; hasChanges: boolean } {
  const now = Date.now();
  let hasChanges = false;
  const expiredOrdersToNotify: ServerOrder[] = [];

  const updatedOrders = orders.map((order) => {
    const isElectronic = order.paymentMethod === "wallet" || order.paymentMethod === "instapay";
    const isPending = order.paymentStatus === "Pending Verification" || order.status === "Pending Payment";
    const isAlreadyCancelled = order.status.toLowerCase().includes("cancelled");
    const orderTime = order.createdAt || (order.date ? new Date(order.date).getTime() : 0);

    if (isElectronic && isPending && !isAlreadyCancelled && orderTime > 0) {
      if (now - orderTime >= PAYMENT_HOLD_TIMEOUT_MS) {
        hasChanges = true;
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

  if (expiredOrdersToNotify.length > 0) {
    (async () => {
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

  return { orders: updatedOrders, hasChanges };
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
      const { orders: processed, hasChanges } = processExpiredPendingOrders(orders);
      if (hasChanges) {
        await Promise.all(processed.map((order) => persistOrders(order)));
      }
      return processed;
    } catch (error) {
      console.error("Error reading Neon orders store:", error);
      return [];
    }
  }

  if (globalThis.__kairo_orders_cache) {
    const { orders: processed, hasChanges } = processExpiredPendingOrders(globalThis.__kairo_orders_cache);
    if (hasChanges) {
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
    const { orders: processed, hasChanges } = processExpiredPendingOrders(orders);
    globalThis.__kairo_orders_cache = processed;
    if (hasChanges) {
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
  const orders = await getAllServerOrders();
  const existingIdx = orders.findIndex((o) => o.id === order.id);

  const createdAt = order.createdAt || Date.now();
  const isElectronic = order.paymentMethod === "wallet" || order.paymentMethod === "instapay";
  const expiresAt = isElectronic ? createdAt + PAYMENT_HOLD_TIMEOUT_MS : undefined;

  const enrichedOrder: ServerOrder = {
    ...order,
    createdAt,
    expiresAt,
    updatedAt: Date.now(),
  };

  let updatedList: ServerOrder[];
  if (existingIdx >= 0) {
    updatedList = [...orders];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...enrichedOrder };
  } else {
    updatedList = [enrichedOrder, ...orders];
  }

  await persistOrders(sql ? enrichedOrder : updatedList);
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
  const orders = await getAllServerOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;

  const current = orders[idx];
  
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

  const updatedList = [...orders];
  updatedList[idx] = updated;
  await persistOrders(sql ? updated : updatedList);
  return { updated, previous: current };
}
