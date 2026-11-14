function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNaira(amount: number): string {
  return "₦" + Number(amount || 0).toLocaleString("en-NG");
}

const BASE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #FAF9F7;
    color: #141413;
    padding: 24px 16px;
    -webkit-font-smoothing: antialiased;
  }
  .luxury-serif { font-family: 'Cinzel', Georgia, serif; }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
  .btnx-gold { color: #966830; }
  .btnx-gold-bg { background-color: #966830; }
  .btnx-border { border-color: #E6E2DA; }
  .btnx-dark { background-color: #141413; color: #FAF9F7; }
  .btnx-card {
    background: #FFFFFF;
    border: 1px solid #E6E2DA;
    border-radius: 2px;
    box-shadow: 0 4px 20px -2px rgba(20,20,19,0.06);
  }
  @media (prefers-color-scheme: dark) {
    body { background: #111110; color: #F3F1EC; }
    .btnx-card { background: #191816; border-color: #2C2A26; }
    .btnx-border { border-color: #2C2A26; }
    .btnx-dark { background-color: #FAF9F7; color: #141413; }
  }
`;

export function renderProductCardHtml(product: any, storeOrigin = "http://localhost:3000"): string {
  const p = product;
  const imgUrl = p.image?.startsWith("http") ? p.image : `${storeOrigin}/${p.image?.replace(/^\//, "")}`;
  const checkoutUrl = `${storeOrigin}/?product=${encodeURIComponent(p.id)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(p.name)} — BTNX Atelier</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div style="max-width: 440px; margin: 0 auto;" class="btnx-card">
    <div style="position: relative; aspect-ratio: 4/5; overflow: hidden; background: #EDEAE5;">
      <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80'" />
      ${p.badge ? `<span style="position: absolute; top: 12px; left: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; background: #141413; color: #FAF9F7; padding: 4px 8px; border-radius: 1px;">${escapeHtml(p.badge)}</span>` : ""}
      <span style="position: absolute; bottom: 12px; right: 12px; font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; background: rgba(250,249,247,0.92); color: #141413; padding: 4px 8px; backdrop-filter: blur(4px); border: 1px solid #E6E2DA;">Osun Atelier &middot; Express</span>
    </div>

    <div style="padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #966830; font-weight: 600;">${escapeHtml(p.category || "Apparel")}</span>
        <span class="font-mono" style="font-size: 15px; font-weight: 600;">${formatNaira(p.price)}</span>
      </div>

      <h2 class="luxury-serif" style="font-size: 18px; font-weight: 600; margin-bottom: 8px; line-height: 1.3;">${escapeHtml(p.name)}</h2>
      <p style="font-size: 12px; color: #66625B; line-height: 1.5; margin-bottom: 16px;">${escapeHtml(p.description || "Contemporary structured silhouette tailored with refined finishes.")}</p>

      <div style="border-top: 1px solid #E6E2DA; padding-top: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
          <span style="color: #66625B; text-transform: uppercase; letter-spacing: 0.12em;">Available Sizes:</span>
          <span style="font-weight: 600;">${(p.sizes || ["S", "M", "L", "XL"]).join(" &middot; ")}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
          <span style="color: #66625B; text-transform: uppercase; letter-spacing: 0.12em;">Delivery:</span>
          <span>${escapeHtml(p.deliveryTimeline || "2-4 Business Days")}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span style="color: #66625B; text-transform: uppercase; letter-spacing: 0.12em;">Packaging:</span>
          <span>${escapeHtml(p.packagingType || "Cotton Garment Box")}</span>
        </div>
      </div>

      <a href="${escapeHtml(checkoutUrl)}" target="_blank" class="btnx-dark" style="display: block; text-align: center; text-decoration: none; padding: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; border-radius: 1px; transition: opacity 0.2s;">
        Inspect &amp; Express Checkout &rarr;
      </a>
    </div>
  </div>
</body>
</html>`;
}

export function renderInvoiceHtml(order: any): string {
  const orderId = order.id || "BX-000000";
  const items = order.items || [];
  const dateStr = order.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const clientName = order.customerName || order.clientName || "Valued Customer";
  const clientEmail = order.customerEmail || order.userEmail || "customer@btnx.store";
  const shippingAddress = order.shippingAddress || "Osun State, Nigeria";
  const total = Number(order.total || 0);
  const subtotal = Number(order.subtotal || total);
  const discountAmount = Number(order.discountAmount || 0);
  const shippingFee = Number(order.shippingFee || 0);

  const rows = items.map((it: any) => {
    const pName = it.product?.name || it.productName || "BTNX Luxury Garment";
    const size = it.size || it.selectedSize || "M";
    const color = it.color || it.selectedColor || "Standard";
    const price = Number(it.product?.price || it.price || 0);
    const qty = Number(it.quantity || 1);
    const lineTotal = price * qty;
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E6E2DA;">
          <div style="font-weight: 600; font-size: 13px;">${escapeHtml(pName)}</div>
          <div style="color: #66625B; font-size: 11px; margin-top: 2px;">Size ${escapeHtml(size)} &middot; ${escapeHtml(color)}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E6E2DA; text-align: center; font-family: monospace;">${qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E6E2DA; text-align: right; font-family: monospace;">${formatNaira(price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E6E2DA; text-align: right; font-family: monospace; font-weight: 600;">${formatNaira(lineTotal)}</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BTNX Invoice — #${escapeHtml(orderId)}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div style="max-width: 680px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E6E2DA; padding: 32px;" class="btnx-card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #141413; padding-bottom: 18px; margin-bottom: 24px;">
      <div>
        <h1 class="luxury-serif" style="font-size: 24px; font-weight: 700; letter-spacing: 0.16em;">BTNX STORE</h1>
        <p style="font-size: 10px; color: #66625B; text-transform: uppercase; letter-spacing: 0.14em; margin-top: 3px;">Haute Tailoring &middot; Osun, Nigeria</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #966830; font-weight: 600;">Official Receipt</span>
        <div class="font-mono" style="font-size: 14px; font-weight: 700; margin-top: 2px;">#INV-${escapeHtml(orderId)}</div>
        <div style="font-size: 11px; color: #66625B; margin-top: 2px;">${escapeHtml(dateStr)}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #FAF9F7; border: 1px solid #E6E2DA; padding: 16px; margin-bottom: 24px;">
      <div>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #66625B; font-weight: 600; display: block; margin-bottom: 4px;">Billed To:</span>
        <div style="font-size: 13px; font-weight: 600;">${escapeHtml(clientName)}</div>
        <div style="font-size: 11px; color: #66625B; margin-top: 2px;">${escapeHtml(clientEmail)}</div>
      </div>
      <div>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #66625B; font-weight: 600; display: block; margin-bottom: 4px;">Destination:</span>
        <div style="font-size: 12px; color: #141413; line-height: 1.4;">${escapeHtml(shippingAddress)}</div>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 1px solid #141413;">
          <th style="padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #66625B;">Garment</th>
          <th style="padding: 8px 12px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #66625B;">Qty</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #66625B;">Price</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #66625B;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="max-width: 280px; margin-left: auto; border-top: 1px solid #E6E2DA; padding-top: 12px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #66625B; margin-bottom: 4px;">
        <span>Subtotal</span>
        <span class="font-mono">${formatNaira(subtotal)}</span>
      </div>
      ${discountAmount > 0 ? `
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #966830; margin-bottom: 4px;">
        <span>Privilege Discount (BTNX50)</span>
        <span class="font-mono">-${formatNaira(discountAmount)}</span>
      </div>` : ""}
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #66625B; margin-bottom: 8px;">
        <span>Shipping &amp; Logistics</span>
        <span class="font-mono">${shippingFee > 0 ? formatNaira(shippingFee) : "FREE"}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; border-top: 1px solid #141413; padding-top: 8px;">
        <span>Grand Total</span>
        <span class="font-mono">${formatNaira(total)}</span>
      </div>
    </div>

    <div style="border-top: 1px dashed #E6E2DA; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #66625B; text-transform: uppercase; letter-spacing: 0.12em;">
      <span>Status: <strong style="color: #141413;">${escapeHtml(order.status || "CONFIRMED")}</strong></span>
      <span>Authentic Nigerian Craftsmanship &middot; Osogbo</span>
    </div>
  </div>
</body>
</html>`;
}

export function renderTrackingStepperHtml(order: any): string {
  const orderId = order.id || "BX-000000";
  const status = String(order.status || "Processing").toLowerCase();
  const address = order.shippingAddress || "Client Delivery Address";

  const isConfirmed = true;
  const isInspected = status.includes("processing") || status.includes("ship") || status.includes("transit") || status.includes("deliver");
  const isDispatched = status.includes("ship") || status.includes("transit") || status.includes("deliver");
  const isDelivered = status.includes("deliver");

  const steps = [
    { title: "Order Confirmed", desc: "Payment verified & ticket opened", active: isConfirmed },
    { title: "Atelier Inspection", desc: "Garment hand-checked & packed in Cotton Box", active: isInspected },
    { title: "Courier Dispatch", desc: "Package in transit from Osogbo dispatch hub", active: isDispatched },
    { title: "Client Handover", desc: "Signature verified delivery to door", active: isDelivered },
  ];

  const stepsHtml = steps.map((s, idx) => `
    <div style="display: flex; gap: 14px; position: relative; padding-bottom: ${idx === 3 ? "0" : "24px"};">
      ${idx < 3 ? `<div style="position: absolute; left: 11px; top: 24px; bottom: 0; width: 2px; background: ${s.active ? "#141413" : "#E6E2DA"};"></div>` : ""}
      <div style="width: 24px; height: 24px; border-radius: 50%; background: ${s.active ? "#141413" : "#FAF9F7"}; border: 2px solid ${s.active ? "#141413" : "#E6E2DA"}; color: ${s.active ? "#FAF9F7" : "#66625B"}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; shrink-0; z-index: 2;">
        ${s.active ? "✓" : idx + 1}
      </div>
      <div>
        <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 2px; ${s.active ? "color: #141413;" : "color: #66625B;"}">${s.title}</h4>
        <p style="font-size: 11px; color: #66625B;">${s.desc}</p>
      </div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BTNX Tracking — #${escapeHtml(orderId)}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div style="max-width: 520px; margin: 0 auto; padding: 24px;" class="btnx-card">
    <div style="border-bottom: 1px solid #E6E2DA; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: baseline;">
      <div>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: #966830; font-weight: 600;">Dispatch Intelligence</span>
        <h2 class="luxury-serif" style="font-size: 20px; font-weight: 600; margin-top: 2px;">Shipment Tracking</h2>
      </div>
      <div class="font-mono" style="font-size: 13px; font-weight: 700;">#${escapeHtml(orderId)}</div>
    </div>

    <div style="background: #FAF9F7; border: 1px solid #E6E2DA; padding: 14px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
        <span style="color: #66625B; text-transform: uppercase; letter-spacing: 0.12em;">Current Status:</span>
        <span style="font-weight: 700; text-transform: uppercase; color: #966830;">${escapeHtml(order.status || "Processing")}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
        <span style="color: #66625B; text-transform: uppercase; letter-spacing: 0.12em;">Origin Hub:</span>
        <span>Osogbo Atelier, Osun State</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span style="color: #66625B; text-transform: uppercase; letter-spacing: 0.12em;">Destination:</span>
        <span style="font-weight: 500;">${escapeHtml(address)}</span>
      </div>
    </div>

    <div style="padding-left: 6px;">${stepsHtml}</div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E6E2DA; text-align: center;">
      <span style="font-size: 11px; color: #66625B;">Complimentary Size Exchanges: 14-Day Free Returns</span>
    </div>
  </div>
</body>
</html>`;
}

export function renderSupportTicketHtml(ticket: any): string {
  const t = ticket || {};
  const ticketId = t.id || "TICK-0000";
  const messages = t.messages || [];

  const msgsHtml = messages.map((m: any) => {
    const isClient = m.sender === "client";
    return `
      <div style="display: flex; flex-direction: column; align-items: ${isClient ? "flex-end" : "flex-start"}; margin-bottom: 12px;">
        <span style="font-size: 10px; color: #66625B; margin-bottom: 2px;">${isClient ? "You (Client)" : escapeHtml(m.senderName || "BTNX Concierge")} &middot; ${new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <div style="max-width: 80%; padding: 10px 14px; font-size: 12px; line-height: 1.4; border-radius: 2px; ${isClient ? "background: #141413; color: #FAF9F7;" : "background: #FAF9F7; border: 1px solid #E6E2DA; color: #141413;"}">
          ${escapeHtml(m.text)}
        </div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BTNX Client Care — #${escapeHtml(ticketId)}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; height: 90vh; display: flex; flex-direction: column;" class="btnx-card">
    <div style="padding: 16px; border-bottom: 1px solid #E6E2DA; display: flex; justify-content: space-between; align-items: center; shrink-0;">
      <div>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #966830; font-weight: 600;">Client Care Thread</span>
        <h3 class="luxury-serif" style="font-size: 16px; font-weight: 600;">${escapeHtml(t.topic || "Customer Assistance")}</h3>
      </div>
      <div style="text-align: right;">
        <span class="font-mono" style="font-size: 12px; font-weight: 600;">#${escapeHtml(ticketId)}</span>
        <div style="font-size: 10px; text-transform: uppercase; color: ${t.mode === "human" ? "#966830" : "#66625B"}; font-weight: 600; margin-top: 2px;">
          ${t.mode === "human" ? "Human Specialist" : "Concierge AI"}
        </div>
      </div>
    </div>

    <div style="flex: 1; padding: 16px; overflow-y: auto;">
      ${msgsHtml || `<p style="text-align:center;color:#66625B;font-size:12px;margin-top:20px;">No messages in this inquiry thread yet.</p>`}
    </div>

    <div style="padding: 12px 16px; border-top: 1px solid #E6E2DA; background: #FAF9F7; font-size: 11px; color: #66625B; text-align: center;">
      Active SLA: Human specialists respond within 15 minutes during operating hours.
    </div>
  </div>
</body>
</html>`;
}
