"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Megaphone, Plus, Save, Ticket, Trash2 } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { DateTimeField } from "@/components/admin/DateTimeField";
import { Checkbox } from "@/components/admin/Checkbox";

/**
 * Create and run discount codes from the console.
 *
 * Before this the shop had exactly one coupon: a private per-patron welcome
 * code, fixed at 20%, issued automatically and editable nowhere. The console's
 * "voucher code" field was display text that discounted nothing at all. A
 * curator wanting to run a promotion had no way to make one.
 *
 * Everything a code is worth is decided by the server; this only describes it.
 */

interface Coupon {
  code: string;
  label: string;
  percentOff: number;
  amountOff: number;
  freeShipping: boolean;
  startsAt: number | null;
  expiresAt: number | null;
  maxTotalUses: number | null;
  timesUsed: number;
  announce: boolean;
  active: boolean;
  newCustomersOnly: boolean;
}

const BLANK: Coupon = {
  code: "",
  label: "",
  percentOff: 0,
  amountOff: 0,
  freeShipping: false,
  startsAt: null,
  expiresAt: null,
  maxTotalUses: null,
  timesUsed: 0,
  announce: false,
  active: true,
  newCustomersOnly: false,
};

/**
 * A checkbox with its own explanation on hover.
 *
 * These three read as near-synonyms at a glance — "active", "first orders
 * only", "show in the top bar" — and the difference between them decides who
 * gets a discount, so each says what it does rather than relying on the label
 * being self-evident. Shown on focus as well as hover, so the keyboard gets the
 * same explanation the mouse does.
 */
function ExplainedCheckbox({
  checked,
  onChange,
  label,
  explanation,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  explanation: string;
}) {
  return (
    <label className="relative group flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <span
        aria-hidden="true"
        className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold/50 ${
          checked ? "bg-gold border-gold text-ink" : "border-ink-border group-hover:border-paper/60"
        }`}
      >
        {checked && <Check strokeWidth={3} className="w-3 h-3" />}
      </span>
      <span className="text-paper border-b border-dotted border-text-muted/40">{label}</span>

      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 bottom-full mb-2 w-60 p-2.5 bg-ink border border-gold/40 rounded-xs text-[11px] leading-relaxed text-paper-muted font-sans shadow-xl opacity-0 translate-y-1 transition-all duration-150 z-50 group-hover:opacity-100 group-hover:translate-y-0 peer-focus-visible:opacity-100 peer-focus-visible:translate-y-0"
      >
        {explanation}
      </span>
    </label>
  );
}

export function CouponManager({ onToast }: { onToast: (message: string) => void }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Coupon | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Reading the clock during render is not a pure operation; this is the
  // project's shared ticking clock, which is.
  const now = useNow();

  /**
   * Fetches the list. Deliberately does not flip `loading` on the way in: doing
   * so made the first call a synchronous setState inside an effect, which
   * cascades a render before the request has even left. The initial `loading`
   * state covers the first load, and a refresh after saving simply replaces the
   * list when it arrives.
   */
  /** Fetches the list without touching state, so callers decide what to do. */
  const fetchCoupons = useCallback(async (): Promise<Coupon[]> => {
    try {
      const response = await fetch("/api/admin/coupons", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      return payload?.success ? (payload.coupons as Coupon[]) : [];
    } catch {
      return [];
    }
  }, []);

  /** Re-reads the list after a save or a delete. */
  const load = useCallback(async () => {
    setCoupons(await fetchCoupons());
  }, [fetchCoupons]);

  useEffect(() => {
    // Subscribing to an external system, with state updated in the callback —
    // nothing is set synchronously as the effect runs.
    let active = true;
    void fetchCoupons().then((list) => {
      if (!active) return;
      setCoupons(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchCoupons]);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => null);
      if (!payload?.success) {
        setError(payload?.message || "Could not save that voucher.");
        return;
      }
      onToast(payload.message);
      setDraft(null);
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (code: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json().catch(() => null);
      onToast(payload?.message || "Removed.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  /** What a coupon takes off, read back in the shop's own terms. */
  const describe = (coupon: Coupon): string => {
    const parts: string[] = [];
    if (coupon.percentOff > 0) parts.push(`${coupon.percentOff}% off`);
    if (coupon.amountOff > 0) parts.push(`EGP ${coupon.amountOff} off`);
    if (coupon.freeShipping) parts.push("free delivery");
    return parts.join(" + ") || "nothing yet";
  };

  return (
    <div className="p-4 sm:p-6 bg-ink-surface border border-ink-border rounded-sm space-y-5">
      <div className="flex items-center justify-between border-b border-ink-border/50 pb-3 gap-3">
        <h2 className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Ticket className="w-4 h-4" />
          <span>01. Vouchers &amp; Discount Codes</span>
        </h2>
        <button
          type="button"
          onClick={() => {
            setDraft({ ...BLANK });
            setError("");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-muted text-ink font-bold text-[11px] uppercase tracking-wider rounded-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New voucher</span>
        </button>
      </div>

      {draft && (
        <div className="p-4 bg-ink/70 border border-gold/30 rounded-xs space-y-4 font-mono text-xs">
          {error && (
            <div role="alert" className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-muted mb-1">Code *</label>
              <input
                type="text"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="RAMADAN25"
                className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none uppercase tracking-wider"
              />
              <span className="text-[10px] text-text-muted">3-32 characters: letters, numbers, - or _</span>
            </div>
            <div>
              <label className="block text-text-muted mb-1">What shoppers see</label>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="25% off everything this Ramadan"
                className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none font-sans"
              />
              <span className="text-[10px] text-text-muted">Leave blank to describe it automatically.</span>
            </div>
          </div>

          <div className="pt-3 border-t border-ink-border/60">
            <p className="text-[11px] text-gold font-bold uppercase tracking-wider mb-2">What it takes off</p>
            <p className="text-[10px] text-text-muted mb-3">Combine as many as you like — 10% and free delivery, say.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-text-muted mb-1">Percentage (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.percentOff || ""}
                  onChange={(e) => setDraft({ ...draft, percentOff: Number(e.target.value) || 0 })}
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none"
                />
              </div>
              <div>
                <label className="block text-text-muted mb-1">Fixed amount (EGP)</label>
                <input
                  type="number"
                  min={0}
                  value={draft.amountOff || ""}
                  onChange={(e) => setDraft({ ...draft, amountOff: Number(e.target.value) || 0 })}
                  className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer self-end h-10">
                <Checkbox
                  checked={draft.freeShipping}
                  onChange={(freeShipping) => setDraft({ ...draft, freeShipping })}
                  label={<span className="text-paper">Free delivery</span>}
                />
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-ink-border/60 grid grid-cols-1 md:grid-cols-3 gap-4">
            <DateTimeField
              label="Starts"
              hint="Not set = right away"
              value={draft.startsAt}
              onChange={(startsAt) => setDraft({ ...draft, startsAt })}
            />
            <DateTimeField
              label="Ends"
              hint="Not set = no end"
              value={draft.expiresAt}
              onChange={(expiresAt) => setDraft({ ...draft, expiresAt })}
            />
            <div>
              <label className="block text-text-muted mb-1">Total uses</label>
              <input
                type="number"
                min={1}
                value={draft.maxTotalUses ?? ""}
                onChange={(e) => setDraft({ ...draft, maxTotalUses: Number(e.target.value) || null })}
                placeholder="unlimited"
                className="w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none"
              />
              <span className="text-[10px] text-text-muted">Each shopper may use it once regardless.</span>
            </div>
          </div>

          <div className="pt-3 border-t border-ink-border/60 flex flex-wrap gap-x-6 gap-y-3">
            <ExplainedCheckbox
              checked={draft.announce}
              onChange={(value) => setDraft({ ...draft, announce: value })}
              label="Show in the top bar"
              explanation="Advertises this code in the bar across the top of the shop, where every visitor sees it. Leave it off for a code you hand out yourself — on Instagram, or to one customer."
            />
            <ExplainedCheckbox
              checked={draft.newCustomersOnly}
              onChange={(value) => setDraft({ ...draft, newCustomersOnly: value })}
              label="First orders only"
              explanation="Restricts it to shoppers who have never ordered before. Anyone with a previous order is turned down. Leave it off and any customer may use it — still only once each."
            />
            <ExplainedCheckbox
              checked={draft.active}
              onChange={(value) => setDraft({ ...draft, active: value })}
              label="Active"
              explanation="The on/off switch. Turn it off to stop the code working immediately without deleting it — useful for pausing a promotion and keeping its history."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink-border">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="px-4 py-2 text-xs uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save voucher</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-text-muted flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading vouchers…
        </p>
      ) : coupons.length === 0 ? (
        <p className="text-xs text-text-muted py-6 text-center">
          No vouchers yet. Create one to run a promotion.
        </p>
      ) : (
        <div className="space-y-2 font-mono text-xs">
          {coupons.map((coupon) => {
            const expired = coupon.expiresAt !== null && now !== null && coupon.expiresAt <= now;
            const claimed = coupon.maxTotalUses !== null && coupon.timesUsed >= coupon.maxTotalUses;
            return (
              <div
                key={coupon.code}
                className="flex flex-wrap items-center justify-between gap-3 p-3 bg-ink border border-ink-border rounded-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gold font-bold tracking-wider">{coupon.code}</span>
                    {coupon.announce && (
                      <span className="flex items-center gap-1 text-[9px] text-gold/80 border border-gold/30 rounded-xs px-1.5 py-0.5">
                        <Megaphone className="w-2.5 h-2.5" /> In top bar
                      </span>
                    )}
                    {coupon.newCustomersOnly && (
                      <span className="text-[9px] text-text-muted border border-ink-border rounded-xs px-1.5 py-0.5">
                        First orders
                      </span>
                    )}
                    {(!coupon.active || expired || claimed) && (
                      <span className="text-[9px] text-vermilion border border-vermilion/40 rounded-xs px-1.5 py-0.5">
                        {!coupon.active ? "Off" : expired ? "Expired" : "Fully claimed"}
                      </span>
                    )}
                  </div>
                  <p className="text-text-muted text-[11px] mt-1">
                    {describe(coupon)} · used {coupon.timesUsed}
                    {coupon.maxTotalUses !== null ? ` of ${coupon.maxTotalUses}` : ""} time
                    {coupon.timesUsed === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(coupon);
                      setError("");
                    }}
                    className="px-3 py-1.5 bg-ink-elevated hover:bg-gold/15 text-text-muted hover:text-gold border border-ink-border rounded-xs uppercase tracking-wider text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(coupon.code)}
                    disabled={busy}
                    title="Remove this voucher"
                    className="p-1.5 text-text-muted hover:text-vermilion bg-ink-elevated border border-ink-border rounded-xs cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
