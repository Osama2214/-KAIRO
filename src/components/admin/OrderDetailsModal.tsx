"use client";

import React, { useState, useSyncExternalStore } from "react";
import {
  X,
  Package,
  User,
  Banknote,
  Smartphone,
  Zap,
  CheckCircle2,
  Printer,
  Clock,
  Truck,
  ExternalLink,
  Save,
  Check,
} from "lucide-react";
import { SavedOrder, UserProfile } from "@/store/useAuthStore";
import { formatPrice } from "@/lib/utils";
import { CustomSelect } from "@/components/CustomSelect";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { printCustomerInvoice } from "@/lib/invoicePrint";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SavedOrder | null;
  customer?: UserProfile | null;
  onUpdateStatus?: (orderId: string, newStatus: string) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<SavedOrder>) => void;
}

function OrderDetailsDialog({
  order,
  customer,
  onClose,
  onUpdateStatus,
  onUpdateOrder,
}: {
  order: SavedOrder;
  customer?: UserProfile | null;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, newStatus: string) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<SavedOrder>) => void;
}) {
  useModalScrollLock(true);
  const [selectedStatus, setSelectedStatus] = useState(order.status || "Confirmed");
  const [paymentStatus, setPaymentStatus] = useState(
    order.paymentStatus || (order.paymentMethod === "cash" ? "Pending Collection" : "Pending Verification")
  );

  // Real Logistics & Courier Tracking State
  const [courierName, setCourierName] = useState(order.courier || "Bosta Egypt Express");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || "");
  const [trackingSavedSuccess, setTrackingSavedSuccess] = useState(false);

  // Synchronize current time safely across client renders without setState-in-effect or impure render calls
  const currentTime = useSyncExternalStore(
    (callback) => {
      const interval = setInterval(callback, 30000);
      return () => clearInterval(interval);
    },
    () => Date.now(),
    () => 0
  );

  // 36-Hour Payment Hold Calculation (1.5 Days)
  const isElectronic = order.paymentMethod === "wallet" || order.paymentMethod === "instapay";
  const isPendingVerification = paymentStatus === "Pending Verification" || selectedStatus === "Pending Payment";
  const orderCreatedAt = order.createdAt || (order.date ? new Date(order.date).getTime() : 0);
  const elapsedMs = currentTime && orderCreatedAt ? Math.max(0, currentTime - orderCreatedAt) : 0;
  const HOLD_36H_MS = 36 * 60 * 60 * 1000;
  const remainingMs = Math.max(0, HOLD_36H_MS - elapsedMs);
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const isHoldExpired = isElectronic && isPendingVerification && remainingMs === 0;

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    if (onUpdateOrder) {
      onUpdateOrder(order.id, { status: newStatus });
    } else if (onUpdateStatus) {
      onUpdateStatus(order.id, newStatus);
    }
  };

  const handlePaymentStatusChange = (newPaymentStatus: string) => {
    setPaymentStatus(newPaymentStatus);
    const updates: Partial<SavedOrder> = { paymentStatus: newPaymentStatus };
    if (newPaymentStatus === "Verified & Paid" && selectedStatus === "Pending Payment") {
      updates.status = "Processing";
      setSelectedStatus("Processing");
    }
    if (onUpdateOrder) {
      onUpdateOrder(order.id, updates);
    }
  };

  const handleConfirmPaid = () => {
    handlePaymentStatusChange("Verified & Paid");
  };

  const handleSaveTracking = () => {
    const updates: Partial<SavedOrder> = {
      courier: courierName.trim(),
      trackingNumber: trackingNumber.trim(),
      trackingUrl: trackingUrl.trim() || undefined,
      status: "Shipped",
    };
    setSelectedStatus("Shipped");
    if (onUpdateOrder) {
      onUpdateOrder(order.id, updates);
    }
    setTrackingSavedSuccess(true);
    setTimeout(() => setTrackingSavedSuccess(false), 2500);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "Shipped":
        return "bg-sky-500/20 text-sky-400 border-sky-500/40";
      case "Processing":
      case "Confirmed":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "Pending Payment":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse";
      case "Cancelled":
      case "Cancelled (Payment Expired)":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      default:
        return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    }
  };

  const paymentMethodKey = order.paymentMethod || "cash";

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain"
    >
      <div className="bg-ink-surface border border-ink-border rounded-sm w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-ink-border bg-ink">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gold shrink-0" />
            <div className="min-w-0">
              <h2 className="font-serif text-base sm:text-lg text-paper font-bold flex items-center gap-2">
                <span>Order #{order.id}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadgeClass(selectedStatus)}`}>
                  {selectedStatus}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-text-muted font-mono">
                {new Date(order.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => printCustomerInvoice(order, customer)}
              title="Print Customer Packing Slip & Invoice"
              className="px-2.5 py-1 text-gold bg-gold/10 hover:bg-gold hover:text-ink border border-gold/30 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Slip</span>
              <span className="sm:hidden">Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-paper hover:bg-ink-elevated rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          data-lenis-prevent
          className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-xs overscroll-contain"
        >
          {/* 36-Hour Payment Expiration Hold Alert */}
          {isElectronic && isPendingVerification && (
            <div
              className={`p-3.5 rounded-sm border text-xs font-mono flex items-start gap-2.5 ${
                isHoldExpired
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                  : "bg-amber-500/10 border-amber-500/40 text-amber-300"
              }`}
            >
              <Clock
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isHoldExpired ? "text-rose-400" : "text-amber-400 animate-pulse"
                }`}
              />
              <div className="space-y-1">
                <div className="font-bold uppercase tracking-wider flex items-center gap-2">
                  <span>36-Hour Payment Hold Protocol (1.5 Days)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${
                      isHoldExpired
                        ? "bg-rose-500 text-white"
                        : "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                    }`}
                  >
                    {isHoldExpired
                      ? "HOLD EXPIRED (AUTO-CANCELLED)"
                      : `${remainingHours}h ${remainingMinutes}m REMAINING`}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {isHoldExpired
                    ? "This electronic payment order exceeded the 36-hour limit without confirmation and has been marked expired to release reserved inventory."
                    : "Orders placed via Mobile Wallet or InstaPay must be confirmed within 36 hours. If unverified, the order will be automatically cancelled."}
                </p>
              </div>
            </div>
          )}

          {/* Status Updater */}
          <div className="bg-ink p-4 border border-ink-border rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-paper mb-0.5">Order Fulfillment Status</div>
              <div className="text-text-muted text-[11px]">Update the dispatch state for this customer order.</div>
            </div>
            <CustomSelect
              value={selectedStatus}
              onChange={handleStatusChange}
              options={[
                { value: "Pending Payment", label: "Pending Payment" },
                { value: "Confirmed", label: "Confirmed" },
                { value: "Processing", label: "Processing" },
                { value: "Shipped", label: "Shipped" },
                { value: "Delivered", label: "Delivered" },
                { value: "Cancelled", label: "Cancelled" },
                { value: "Cancelled (Payment Expired)", label: "Cancelled (Payment Expired)" },
              ]}
              buttonClassName="bg-ink-surface border-ink-border py-1.5 px-3 text-xs"
              className="w-56"
            />
          </div>

          {/* Payment Verification Protocol Card */}
          <div className="bg-ink p-4 border border-ink-border rounded-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ink-border/50">
              <div className="flex items-center gap-2.5">
                {paymentMethodKey === "wallet" ? (
                  <Smartphone className="w-4 h-4 text-gold" />
                ) : paymentMethodKey === "instapay" ? (
                  <Zap className="w-4 h-4 text-gold" />
                ) : (
                  <Banknote className="w-4 h-4 text-gold" />
                )}
                <div>
                  <span className="font-bold text-paper block text-xs">
                    {paymentMethodKey === "wallet"
                      ? "Mobile Wallet Transfer (Vodafone / Orange / WE)"
                      : paymentMethodKey === "instapay"
                      ? "InstaPay Electronic Transfer"
                      : "Cash on Delivery"}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    Payment Gateway Protocol
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded-xs font-mono text-[10px] uppercase font-bold border ${
                    paymentStatus === "Verified & Paid"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 flex items-center gap-1"
                      : paymentStatus === "Pending Verification"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse"
                      : "bg-sky-500/15 text-sky-400 border-sky-500/40"
                  }`}
                >
                  {paymentStatus === "Verified & Paid" && <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />}
                  <span>{paymentStatus}</span>
                </span>

                {paymentStatus !== "Verified & Paid" && (
                  <button
                    type="button"
                    onClick={handleConfirmPaid}
                    className="px-2.5 py-1 bg-gold hover:bg-gold-light text-ink font-mono font-bold text-[10px] uppercase tracking-wider rounded-xs transition-all inline-flex items-center gap-1 cursor-pointer border border-gold shadow-xs hover:brightness-105 active:scale-95"
                    title="Confirm payment received and mark verified"
                  >
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    <span>Confirm Paid</span>
                  </button>
                )}
              </div>
            </div>

            {/* Additional details if wallet or instapay */}
            {(paymentMethodKey === "wallet" || paymentMethodKey === "instapay") && (
              <div className="text-[11px] text-text-muted flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-ink-border/50 font-mono">
                <div>
                  <span className="text-text-muted">Sender Reference: </span>
                  <strong className="text-paper">
                    {order.paymentSenderDetail || "Not provided by customer (Verify via Phone)"}
                  </strong>
                </div>
                {paymentStatus === "Pending Verification" && (
                  <span className="text-gold font-bold text-[10px] flex items-center gap-1 bg-gold/10 px-2.5 py-1 rounded-xs border border-gold/30">
                    Action Required: Verify transfer within 36h
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Logistics & Tracking Protocol Card */}
          <div className="bg-ink p-4 border border-ink-border rounded-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-ink-border/50">
              <div className="flex items-center gap-2 text-gold font-bold text-xs font-mono uppercase">
                <Truck className="w-4 h-4 text-gold" />
                <span>Logistics, Carrier & Tracking Management</span>
              </div>
              {trackingSavedSuccess && (
                <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved to Order!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block text-text-muted text-[10px] uppercase mb-1">Carrier / Courier</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. Bosta Egypt, Aramex"
                  className="w-full bg-ink-surface border border-ink-border px-2.5 py-1.5 rounded-xs text-paper focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-text-muted text-[10px] uppercase mb-1">Tracking Number / Waybill</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BST-9948210"
                  className="w-full bg-ink-surface border border-ink-border px-2.5 py-1.5 rounded-xs text-paper focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-text-muted text-[10px] uppercase mb-1">Direct Tracking Link</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://track.bosta.co/..."
                  className="w-full bg-ink-surface border border-ink-border px-2.5 py-1.5 rounded-xs text-paper focus:border-gold outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-gold hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Tracking Link</span>
                </a>
              ) : <div />}

              <button
                type="button"
                onClick={handleSaveTracking}
                className="px-3 py-1 bg-ink-surface hover:bg-gold/20 border border-ink-border hover:border-gold/60 text-gold text-xs font-mono uppercase font-bold rounded-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Save className="w-3 h-3" />
                <span>Save Logistics</span>
              </button>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-ink border border-ink-border rounded-sm space-y-2">
              <div className="flex items-center gap-2 text-gold font-bold text-[11px] uppercase tracking-wider font-mono">
                <User className="w-3.5 h-3.5" />
                Customer Profile
              </div>
              <div className="text-paper font-bold text-sm">
                {customer?.name || order.customerName || "Guest Collector"}
              </div>
              <div className="text-text-muted">{customer?.email || order.customerEmail || "No email provided"}</div>
              <div className="text-text-muted">{customer?.phone || order.customerPhone || "No phone provided"}</div>
            </div>

            <div className="p-4 bg-ink border border-ink-border rounded-sm space-y-2">
              <div className="text-gold font-bold text-[11px] uppercase tracking-wider font-mono">
                Delivery Address
              </div>
              <div className="text-paper">
                {customer?.address || order.customerAddress || "Archival Delivery Destination"}
              </div>
              <div className="text-text-muted">
                {customer?.governorate || order.customerGovernorate || "Cairo"}, Egypt
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div>
            <h3 className="font-mono text-xs text-gold uppercase tracking-wider mb-2">
              Ordered Volumes ({order.items.length})
            </h3>
            <div className="border border-ink-border rounded-sm overflow-hidden bg-ink">
              <table className="w-full text-left">
                <thead className="bg-ink-elevated text-[10px] font-mono text-text-muted uppercase border-b border-ink-border">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Format</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-border/50">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-ink-elevated/40">
                      <td className="px-3 py-2.5 flex items-center gap-2.5">
                        {item.coverImage && (
                          <div className="w-8 h-11 border border-ink-border overflow-hidden rounded-xs shrink-0 bg-ink">
                            <img src={item.coverImage} alt={item.title || "Volume"} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <div className="text-paper font-bold">{item.title || "Archival Volume"}</div>
                          <div className="text-[10px] text-text-muted">{item.seriesTitle || ""}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">{item.format || "Manga"}</td>
                      <td className="px-3 py-2.5 text-center text-paper font-bold">{item.quantity || 1}</td>
                      <td className="px-3 py-2.5 text-right text-gold font-bold">{formatPrice(item.price || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="p-4 bg-ink border border-ink-border rounded-sm space-y-1.5 font-mono">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span className="text-paper">{formatPrice(order.subtotal)}</span>
            </div>
            {(order.discountAmount && order.discountAmount > 0) || order.appliedCoupon ? (
              <div className="flex justify-between text-emerald-400">
                <span>Voucher Discount ({order.appliedCoupon || "Promo"})</span>
                <span>-{formatPrice(order.discountAmount || 0)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-text-muted">
              <span>Shipping ({order.customerGovernorate || "Egypt Hub"})</span>
              <span className="text-paper">{order.shippingCost === 0 ? "FREE" : formatPrice(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-ink-border font-bold text-sm text-paper">
              <span className="text-gold">Total Amount</span>
              <span className="text-gold">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-4 sm:px-6 py-3 border-t border-ink-border bg-ink">
          <button
            type="button"
            onClick={() => printCustomerInvoice(order, customer)}
            className="px-4 py-2 bg-paper text-ink hover:bg-gold font-mono font-bold text-xs uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
          >
            <Printer strokeWidth={1.6} className="w-4 h-4 text-ink" />
            <span>Print Invoice &amp; Slip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-ink-border text-paper hover:bg-ink-elevated rounded-sm uppercase tracking-wider transition-colors cursor-pointer text-xs font-mono text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  customer,
  onUpdateStatus,
  onUpdateOrder,
}: OrderDetailsModalProps) {
  if (!isOpen || !order) return null;

  return (
    <OrderDetailsDialog
      key={order.id}
      order={order}
      customer={customer}
      onClose={onClose}
      onUpdateStatus={onUpdateStatus}
      onUpdateOrder={onUpdateOrder}
    />
  );
}
