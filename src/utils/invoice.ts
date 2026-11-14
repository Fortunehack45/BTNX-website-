import { Order } from "../types";
import { formatNaira } from "./currency";

export interface InvoiceClientInfo {
  name?: string;
  email?: string;
  phone?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingZip?: string;
  shippingCountry?: string;
}

export function getDiscountPercent(price: number, originalPrice?: number): number | null {
  if (!originalPrice || originalPrice <= price || originalPrice <= 0) return null;
  const pct = Math.round(((originalPrice - price) / originalPrice) * 100);
  return pct > 0 ? pct : null;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadOrderInvoice(order: Order, client?: InvoiceClientInfo): void {
  const invoiceNumber = `INV-${order.id}`;
  const trackingNumber = `TRK-${order.id.replace(/^(KB-|BX-)/, "")}`;
  const computedSubtotal = order.items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );
  const voucherDiscount = Math.max(0, computedSubtotal - order.total);

  const clientName = client?.name?.trim() || "Customer";
  const clientEmail = client?.email?.trim() || "customer@btnx.store";
  const addressParts = [
    client?.shippingStreet,
    client?.shippingCity,
    client?.shippingZip,
    client?.shippingCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const rowsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:14px 12px;border-bottom:1px solid #E6E2DA;">
          <div style="font-weight:600;color:#141413;font-size:13px;">${escapeHtml(item.product?.name || "BTNX Garment")}</div>
          <div style="color:#66625B;font-size:11px;margin-top:3px;">Size ${escapeHtml(item.size)} &middot; ${escapeHtml(item.color)}</div>
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #E6E2DA;text-align:center;font-family:monospace;font-size:12px;">${item.quantity}</td>
        <td style="padding:14px 12px;border-bottom:1px solid #E6E2DA;text-align:right;font-family:monospace;font-size:12px;">${escapeHtml(formatNaira(item.product?.price || 0))}</td>
        <td style="padding:14px 12px;border-bottom:1px solid #E6E2DA;text-align:right;font-family:monospace;font-weight:600;font-size:12px;">${escapeHtml(formatNaira((item.product?.price || 0) * item.quantity))}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BTNX Store Invoice — ${escapeHtml(invoiceNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF9F7; color: #141413; margin: 0; padding: 36px 20px; }
    .sheet { max-width: 780px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E6E2DA; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #E6E2DA; padding-bottom: 24px; margin-bottom: 28px; }
    .brand { font-size: 24px; font-weight: 700; letter-spacing: 0.16em; }
    .muted { color: #66625B; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .box { background: #FAF9F7; border: 1px solid #E6E2DA; padding: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #66625B; border-bottom: 1px solid #141413; padding: 10px 12px; }
    .totals { max-width: 320px; margin-left: auto; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; color: #66625B; }
    .totals-grand { display: flex; justify-content: space-between; padding: 12px 0 0; margin-top: 8px; border-top: 1px solid #141413; font-size: 16px; font-weight: 700; color: #141413; }
    @media print { body { background: #FFFFFF; padding: 0; } .sheet { border: none; padding: 16px; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">BTNX STORE</div>
        <div style="font-size:12px;color:#66625B;margin-top:6px;">Osun &middot; Nationwide<br/>hello@btnx.store</div>
      </div>
      <div style="text-align:right;">
        <div class="muted">Order Invoice</div>
        <div style="font-family:monospace;font-size:16px;font-weight:600;margin-top:4px;">${escapeHtml(invoiceNumber)}</div>
        <div style="font-size:12px;color:#66625B;margin-top:4px;">Issued: ${escapeHtml(order.date)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="muted" style="margin-bottom:6px;">Billed To</div>
        <div style="font-weight:600;font-size:14px;">${escapeHtml(clientName)}</div>
        <div style="font-size:12px;color:#66625B;margin-top:4px;">${escapeHtml(clientEmail)}</div>
        ${client?.phone ? `<div style="font-size:12px;color:#66625B;margin-top:2px;">${escapeHtml(client.phone)}</div>` : ""}
        ${addressParts ? `<div style="font-size:12px;color:#66625B;margin-top:6px;line-height:1.4;">${escapeHtml(addressParts)}</div>` : ""}
      </div>
      <div class="box">
        <div class="muted" style="margin-bottom:6px;">Order Summary</div>
        <div style="font-size:12px;margin-bottom:4px;"><strong>Order ID:</strong> <span style="font-family:monospace;">${escapeHtml(order.id)}</span></div>
        <div style="font-size:12px;margin-bottom:4px;"><strong>Tracking:</strong> <span style="font-family:monospace;">${escapeHtml(trackingNumber)}</span></div>
        <div style="font-size:12px;margin-bottom:4px;"><strong>Status:</strong> ${escapeHtml(order.status)}</div>
        <div style="font-size:12px;"><strong>Payment:</strong> Paid &middot; Verified</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Garment Description</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span style="font-family:monospace;color:#141413;">${escapeHtml(formatNaira(computedSubtotal))}</span>
      </div>
      ${
        voucherDiscount > 0
          ? `<div class="totals-row" style="color:#966830;">
               <span>Promo Discount</span>
               <span style="font-family:monospace;">-${escapeHtml(formatNaira(voucherDiscount))}</span>
             </div>`
          : ""
      }
      <div class="totals-row">
        <span>Express Shipping</span>
        <span style="color:#141413;">Free</span>
      </div>
      <div class="totals-grand">
        <span>Total Paid</span>
        <span style="font-family:monospace;">${escapeHtml(formatNaira(order.total))}</span>
      </div>
    </div>

    <div style="margin-top:36px;padding-top:16px;border-top:1px solid #E6E2DA;font-size:11px;color:#66625B;display:flex;justify-content:space-between;">
      <span>Thank you for shopping with BTNX.</span>
      <span>14-Day Free Exchanges</span>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `BTNX-Invoice-${order.id}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
