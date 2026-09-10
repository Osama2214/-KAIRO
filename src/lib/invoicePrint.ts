/**
 * ANIMEVERSE Archival Invoice & Packing Slip Printer
 * Generates an official, high-resolution physical packing slip / invoice for customer shipments.
 */

import { SavedOrder, SavedOrderItem, UserProfile } from "@/store/useAuthStore";
import { formatPrice } from "@/lib/utils";
import { escapeHtml } from "@/lib/security";
import { useStorefrontStore } from "@/store/useStorefrontStore";

export function printCustomerInvoice(order: SavedOrder, customer?: UserProfile | null) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Store contact details come from the CMS so a curator can change them
  // without a deploy.
  const editorial = useStorefrontStore.getState().editorialConfig;
  const storeEmail = editorial?.contactEmail || "animeversebooks@gmail.com";
  const storePhone = editorial?.contactPhone || "+20 10 36225385";
  const storeOwner = editorial?.ownerName || "";

  // Create an isolated hidden iframe dedicated strictly to the print document
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const patronName = order.customerName || customer?.name || "Valued Patron";
  const patronPhone = order.customerPhone || customer?.phone || "+20 100 000 0000";
  const patronEmail = order.customerEmail || customer?.email || "";
  const patronGovernorate = order.customerGovernorate || customer?.governorate || "Egypt Hub";
  const shippingAddress = order.customerAddress || customer?.address || "Archival Delivery Destination, Egypt";

  const paymentLabel =
    order.paymentMethod === "wallet"
      ? "Mobile Wallet (Vodafone Cash / Orange / Etisalat / WE)"
      : order.paymentMethod === "instapay"
      ? "InstaPay Electronic Transfer"
      : "Cash On Delivery (Doorstep Collection)";

  const paymentStatusText =
    order.paymentStatus === "Verified & Paid"
      ? "PAID IN FULL — VERIFIED"
      : order.paymentMethod === "cash"
      ? `COLLECT ON DELIVERY: ${formatPrice(order.total)}`
      : `PAYMENT PENDING VERIFICATION (${formatPrice(order.total)})`;

  const itemsRows = (order.items || [])
    .map(
      (item: SavedOrderItem) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; font-weight: 700; color: #0f172a;">
            ${escapeHtml(item.seriesTitle || "Manga Archive")}
          </div>
          <div style="color: #475569; font-size: 11px; margin-top: 1px;">
            ${escapeHtml(item.title || "Archival Volume")} ${item.volumeNumber ? `— Vol. ${item.volumeNumber}` : ""}
          </div>
          <div style="font-family: monospace; font-size: 9px; color: #64748b; margin-top: 3px; letter-spacing: 0.5px;">
            FORMAT: ${escapeHtml(item.format || "Tankōbon / Japanese Import Edition")}
          </div>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-family: monospace; font-weight: 600; color: #0f172a;">
          ${Number(item.quantity || 1)}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px; font-family: monospace; color: #475569;">
          ${formatPrice(Number(item.price) || 0)}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 12px; font-family: monospace; font-weight: 700; color: #0f172a;">
          ${formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}
        </td>
      </tr>
    `
    )
    .join("");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>ANIMEVERSE_PACKING_INVOICE_${order.id}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 14mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            background: #ffffff;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.45;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-container {
            max-width: 720px;
            margin: 0 auto;
            border: 2px solid #0f172a;
            padding: 24px 28px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 18px;
          }
          .brand-col {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .brand-title {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .brand-kanji {
            background: #D94A3A;
            color: #ffffff;
            font-size: 12px;
            font-weight: 900;
            padding: 2px 6px;
            border-radius: 2px;
            letter-spacing: 1px;
          }
          .brand-text {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .hub-text {
            font-family: monospace;
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
          }
          .meta-col {
            text-align: right;
            font-family: monospace;
          }
          .invoice-pill {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding: 3px 10px;
            border-radius: 2px;
            margin-bottom: 4px;
          }
          .meta-row {
            font-size: 11px;
            color: #334155;
            margin-top: 2px;
          }
          .addresses-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 16px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 14px 16px;
            margin-bottom: 18px;
            border-radius: 2px;
          }
          .section-label {
            font-family: monospace;
            font-size: 9px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
            display: block;
          }
          .customer-name {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .customer-detail {
            font-size: 11px;
            color: #334155;
            line-height: 1.4;
          }
          .payment-card {
            border-left: 3px solid #D94A3A;
            padding-left: 10px;
          }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          table.items-table th {
            background: #f1f5f9;
            border-top: 1.5px solid #0f172a;
            border-bottom: 1.5px solid #0f172a;
            padding: 8px 12px;
            font-family: monospace;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 16px;
            margin-bottom: 18px;
          }
          .notes-box {
            border: 1px dashed #cbd5e1;
            background: #f8fafc;
            padding: 12px 14px;
            font-size: 10px;
            color: #475569;
            border-radius: 2px;
            line-height: 1.45;
          }
          .notes-title {
            font-family: monospace;
            font-size: 9px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            display: block;
          }
          .totals-table {
            width: 100%;
            border-collapse: collapse;
            font-family: monospace;
          }
          .totals-table td {
            padding: 4px 6px;
            font-size: 11px;
          }
          .totals-table .val {
            text-align: right;
            font-weight: 700;
            color: #0f172a;
          }
          .grand-total-row td {
            border-top: 2px solid #0f172a;
            padding-top: 8px;
            padding-bottom: 4px;
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
          }
          .grand-total-row .val {
            font-size: 16px;
            font-weight: 900;
            color: #D94A3A;
          }
          .seal-banner {
            border: 1.5px solid #0f172a;
            background: #f8fafc;
            padding: 10px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: monospace;
            font-size: 10px;
          }
          .tracking-pill {
            background: #0f172a;
            color: #ffffff;
            padding: 3px 8px;
            border-radius: 2px;
            font-weight: 800;
            letter-spacing: 1px;
          }
          .footer-note {
            text-align: center;
            font-family: monospace;
            font-size: 9px;
            color: #64748b;
            margin-top: 14px;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="header">
            <div class="brand-col">
              <div class="brand-title">
                <span class="brand-kanji">アニメ</span>
                <span class="brand-text">ANIMEVERSE ARCHIVE</span>
              </div>
              <div class="hub-text">
                Central Fulfillment Hub • 6th of October City, Giza, Egypt
              </div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px;">
                Direct Tokyo & Kyoto Archival Pressings • Authenticity Guaranteed
              </div>
            </div>

            <div class="meta-col">
              <span class="invoice-pill">CUSTOMER PACKING INVOICE</span>
              <div class="meta-row"><strong>ORDER ID:</strong> #${escapeHtml(order.id)}</div>
              <div class="meta-row"><strong>DATE:</strong> ${escapeHtml(order.date)}</div>
              <div class="meta-row"><strong>STATUS:</strong> ${escapeHtml(order.status || "Processing")}</div>
            </div>
          </div>

          <!-- Customer & Shipment Info -->
          <div class="addresses-grid">
            <div>
              <span class="section-label">SHIP TO RECIPIENT (CUSTOMER)</span>
              <div class="customer-name">${escapeHtml(patronName)}</div>
              <div class="customer-detail">
                <strong>Phone:</strong> ${escapeHtml(patronPhone)}<br>
                ${patronEmail ? `<strong>Email:</strong> ${escapeHtml(patronEmail)}<br>` : ""}
                <strong>Governorate:</strong> ${escapeHtml(patronGovernorate)}<br>
                <strong>Delivery Address:</strong> ${escapeHtml(shippingAddress)}
              </div>
            </div>

            <div class="payment-card">
              <span class="section-label">PAYMENT & LOGISTICS PROTOCOL</span>
              <div class="customer-detail">
                <strong>Payment Method:</strong><br>${escapeHtml(paymentLabel)}<br><br>
                <strong>Payment Verification:</strong><br>
                <span style="font-weight: 800; color: ${order.paymentStatus === "Verified & Paid" ? "#15803d" : "#b45309"};">
                  ${escapeHtml(paymentStatusText)}
                </span>
                ${order.paymentSenderDetail ? `<br><span style="font-size: 9px; color: #64748b;">Ref: ${escapeHtml(order.paymentSenderDetail)}</span>` : ""}
                <br><br>
                <strong>Courier Service:</strong><br>
                ${escapeHtml(order.courier || "Egypt Nationwide Tracked Courier")}
              </div>
            </div>
          </div>

          <!-- Order Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left; width: 55%;">ITEM DESCRIPTION</th>
                <th style="text-align: center; width: 10%;">QTY</th>
                <th style="text-align: right; width: 15%;">UNIT PRICE</th>
                <th style="text-align: right; width: 20%;">TOTAL AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Totals and Packaging Notes -->
          <div class="summary-grid">
            <div class="notes-box">
              <span class="notes-title">ARCHIVAL PACKAGING & CARE INSTRUCTIONS</span>
              Every physical volume in this shipment has been inspected for spine alignment, structural binding integrity, and sealed inside protective archival sleeves.<br><br>
              Every physical volume unlocks lifetime instant Japanese RTL cloud reading access on <strong>your AnimeVerse account</strong>.
            </div>

            <div>
              <table class="totals-table">
                <tr>
                  <td style="color: #64748b;">Subtotal</td>
                  <td class="val">${formatPrice(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Shipping (${escapeHtml(patronGovernorate)})</td>
                  <td class="val">${order.shippingCost === 0 ? "FREE" : formatPrice(order.shippingCost)}</td>
                </tr>
                <tr class="grand-total-row">
                  <td>TOTAL DUE</td>
                  <td class="val">${formatPrice(order.total)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Seal and Tracking -->
          <div class="seal-banner">
            <div>
              <strong style="color: #0f172a;">AUTHENTICITY VERIFICATION:</strong>
              <span style="color: #475569;">AnimeVerse Egypt Seal #AV-OCT-88219</span>
            </div>
            <div>
              <strong style="color: #0f172a; margin-right: 6px;">TRACKING #:</strong>
              <span class="tracking-pill">${escapeHtml(order.trackingNumber || "EG-OCT-9842-CAI")}</span>
            </div>
          </div>

          <div class="footer-note">
            Thank you for being an AnimeVerse patron. • ${escapeHtml(storeEmail)} • ${escapeHtml(storePhone)}${storeOwner ? ` • ${escapeHtml(storeOwner)}` : ""}
          </div>
        </div>
      </body>
    </html>
  `);

  doc.close();

  // Trigger browser print dialog once content is fully rendered
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Clean up iframe after print dialog dismisses
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 400);
}
