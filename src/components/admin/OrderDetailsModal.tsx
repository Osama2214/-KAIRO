"use client";

import React, { useState } from "react";
import { X, Package, User, Banknote, Smartphone, Zap, CheckCircle2, Clock, ShieldCheck, Printer } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain"
    >
      <div className="bg-ink-surface border border-ink-border rounded-sm w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gold" />
            <div>
              <h2 className="font-serif text-lg text-paper font-bold flex items-center gap-2">
                Order #{order.id}
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getStatusBadgeClass(selectedStatus)}`}>
                  {selectedStatus}
                </span>
              </h2>
              <p className="text-xs text-text-muted font-mono">
                Placed on {new Date(order.date).toLocaleDateString()} at {new Date(order.date).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printCustomerInvoice(order, customer)}
              title="Print Customer Packing Slip & Invoice"
              className="px-2.5 py-1 text-gold bg-gold/10 hover:bg-gold hover:text-ink border border-gold/30 rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
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
          className="p-6 overflow-y-auto space-y-6 flex-1 text-xs overscroll-contain"
        >
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
              ]}
              buttonClassName="bg-ink-surface border-ink-border py-1.5 px-3 text-xs"
              className="w-48"
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
                    className="px-3.5 py-1.5 bg-gold hover:bg-gold-light text-ink font-mono font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-gold/25 ring-2 ring-gold/60 hover:ring-gold hover:scale-105 active:scale-95"
                    title="Confirm payment received and mark verified"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
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
                    {order.paymentSenderDetail || "Not provided by customer (Verify via WhatsApp/Phone)"}
                  </strong>
                </div>
                {paymentStatus === "Pending Verification" && (
                  <span className="text-gold font-bold text-[10px] flex items-center gap-1 bg-gold/10 px-2.5 py-1 rounded-xs border border-gold/30">
                    Action Required: Verify transfer before releasing for delivery
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-ink border border-ink-border rounded-sm space-y-2">
              <div className="flex items-center gap-2 text-gold font-bold text-[11px] uppercase tracking-wider font-mono">
                <User className="w-3.5 h-3.5" />
                Customer Profile
              </div>
              <div className="text-paper font-bold text-sm">
                {customer?.name || "Guest Collector"}
              </div>
              <div className="text-text-muted">{customer?.email || "No email provided"}</div>
              <div className="text-text-muted">{customer?.phone || "No phone provided"}</div>
            </div>

            <div className="p-4 bg-ink border border-ink-border rounded-sm space-y-2">
              <div className="text-gold font-bold text-[11px] uppercase tracking-wider font-mono">
                Delivery Address
              </div>
              <div className="text-paper">
                {customer?.address || "6th of October City Hub"}
              </div>
              <div className="text-text-muted">
                {customer?.governorate || "Giza"}, Egypt
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
            <div className="flex justify-between text-text-muted">
              <span>Shipping (6th of October Logistics)</span>
              <span className="text-paper">{order.shippingCost === 0 ? "FREE" : formatPrice(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-ink-border font-bold text-sm text-paper">
              <span className="text-gold">Total Amount</span>
              <span className="text-gold">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-t border-ink-border bg-ink">
          <button
            type="button"
            onClick={() => printCustomerInvoice(order, customer)}
            className="px-4 py-2 bg-paper text-ink hover:bg-gold font-mono font-bold text-xs uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
          >
            <Printer strokeWidth={1.6} className="w-4 h-4 text-ink" />
            <span>Print Customer Invoice / Packing Slip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-ink-border text-paper hover:bg-ink-elevated rounded-sm uppercase tracking-wider transition-colors cursor-pointer text-xs font-mono text-center"
          >
            Close Window
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
