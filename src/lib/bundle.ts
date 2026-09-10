import type { MangaVolume } from "@/data/manga";

/**
 * Box sets as real bundles.
 *
 * A box used to be an ordinary catalogue row with a stock number of its own,
 * so the shop happily sold ten boxes and ten of every volume out of one shelf
 * of books. A box now holds no stock: what it can sell is derived from the
 * volumes it is assembled from, and buying one draws those volumes down.
 *
 * Every number here is computed at read time. Nothing about a bundle is stored
 * twice, so a member's price or stock changing is reflected immediately and
 * there is no second copy to fall out of step.
 */

export type VolumeLike = Pick<MangaVolume, "id" | "price" | "originalPrice" | "stock" | "format"> & {
  bundleOf?: string[];
};

export function isBundle(volume: Pick<VolumeLike, "bundleOf">): boolean {
  return Array.isArray(volume?.bundleOf) && volume.bundleOf.length > 0;
}

/** Indexes a catalogue by id for the lookups below. */
export function indexById<T extends { id?: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (item?.id) map.set(String(item.id), item);
  }
  return map;
}

export interface BundleFacts {
  /** The member rows that were found, in the order the bundle lists them. */
  members: VolumeLike[];
  /** Ids listed by the bundle that are not in the catalogue at all. */
  missing: string[];
  /** How many complete boxes can be assembled right now. */
  stock: number;
  /** What the members would cost bought separately, at their list prices. */
  listPrice: number;
  /** The member holding the fewest copies — the one capping the bundle. */
  limitingMemberId: string | null;
}

/**
 * Works out what a bundle can currently do.
 *
 * A listed member that no longer exists drops the bundle to zero rather than
 * being skipped: silently selling an incomplete "complete collection" is worse
 * than showing it as unavailable.
 */
export function describeBundle(
  bundle: Pick<VolumeLike, "bundleOf">,
  byId: Map<string, VolumeLike>
): BundleFacts {
  const ids = bundle?.bundleOf || [];
  const members: VolumeLike[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const member = byId.get(String(id));
    if (member) members.push(member);
    else missing.push(String(id));
  }

  if (ids.length === 0 || missing.length > 0) {
    return { members, missing, stock: 0, listPrice: 0, limitingMemberId: null };
  }

  let stock = Infinity;
  let limitingMemberId: string | null = null;
  let listPrice = 0;

  for (const member of members) {
    const available = Math.max(0, Math.floor(Number(member.stock) || 0));
    if (available < stock) {
      stock = available;
      limitingMemberId = String(member.id);
    }
    const list = Number(member.originalPrice);
    listPrice += Number.isFinite(list) && list > 0 ? list : Number(member.price) || 0;
  }

  return {
    members,
    missing,
    stock: Number.isFinite(stock) ? stock : 0,
    listPrice: Math.round(listPrice * 100) / 100,
    limitingMemberId,
  };
}

/**
 * Returns the volume with its bundle-derived stock and list price applied.
 * Non-bundles come back untouched.
 */
export function applyBundleFacts<T extends VolumeLike>(volume: T, byId: Map<string, VolumeLike>): T {
  if (!isBundle(volume)) return volume;
  const facts = describeBundle(volume, byId);
  return {
    ...volume,
    stock: facts.stock,
    // The saving shown on a box has to be measured against its own contents,
    // or it drifts the moment a member's price is edited.
    originalPrice: facts.listPrice > 0 ? facts.listPrice : volume.originalPrice,
  };
}

/** Applies the above across a whole catalogue, resolving members within it. */
export function withBundleFacts<T extends VolumeLike>(volumes: T[]): T[] {
  const byId = indexById(volumes);
  return volumes.map((volume) => applyBundleFacts(volume, byId));
}

export interface PhysicalRequirement {
  id: string;
  quantity: number;
}

/**
 * Turns what the shopper asked for into what actually leaves the shelves.
 *
 * One box of thirty-one volumes is thirty-one books, and a shopper who also
 * added volume 5 on its own needs one more of that. Aggregating before the
 * reservation is what stops the two from being checked against the same copy.
 */
export function expandToPhysicalUnits(
  requests: PhysicalRequirement[],
  byId: Map<string, VolumeLike>
): { units: Map<string, number>; unknown: string[] } {
  const units = new Map<string, number>();
  const unknown: string[] = [];

  const add = (id: string, quantity: number) => {
    units.set(id, (units.get(id) || 0) + quantity);
  };

  for (const request of requests) {
    const id = String(request.id);
    const quantity = Math.max(1, Math.floor(Number(request.quantity) || 1));
    const item = byId.get(id);

    if (!item) {
      unknown.push(id);
      continue;
    }

    if (isBundle(item)) {
      const ids = item.bundleOf || [];
      for (const memberId of ids) {
        if (!byId.has(String(memberId))) {
          unknown.push(String(memberId));
          continue;
        }
        add(String(memberId), quantity);
      }
      continue;
    }

    add(id, quantity);
  }

  return { units, unknown };
}

/**
 * Guards against a box that contains itself, or contains another box that
 * contains it. Returns the offending id when the chain loops.
 */
export function findBundleCycle(
  bundleId: string,
  memberIds: string[],
  byId: Map<string, VolumeLike>
): string | null {
  const seen = new Set<string>([bundleId]);
  const queue = [...memberIds.map(String)];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id)) return id;
    seen.add(id);
    const item = byId.get(id);
    if (item && isBundle(item)) queue.push(...(item.bundleOf || []).map(String));
  }

  return null;
}
