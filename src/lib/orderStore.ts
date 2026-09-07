import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

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
 * Safely persists orders with sequential atomic writes
 */
async function persistOrders(orders: ServerOrder[]): Promise<void> {
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
  await persistOrders(updatedList);
  return { updated, previous: current };
}

