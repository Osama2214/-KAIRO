import crypto from "crypto";

/**
 * Order references are minted on the server from 64 bits of entropy.
 *
 * The previous scheme (`KRO-` plus a 4-digit browser random) had only 9,000
 * possible values, which made two problems unavoidable: real customers
 * collided on the same reference after roughly a hundred orders — and the
 * upsert in saveServerOrder silently replaced the earlier order — while an
 * attacker could enumerate the whole space in a few hundred requests.
 */
export function createOrderId(): string {
  return `KRO-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}
