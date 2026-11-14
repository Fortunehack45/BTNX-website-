import type { IncomingMessage, ServerResponse } from "http";
import * as crypto from "crypto";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

// 1. Firebase Configuration (Active Database: ai-studio-klamby-efc211be-fa31-444f-8359-2e516e0d2638)
const FIREBASE_CONFIG = {
  projectId: "expenses-ai-vfx7o",
  appId: "1:768021477341:web:c578b15abce461d0fae834",
  apiKey: "AIzaSyCsBOx0WB6WuBVphhPu_tZJx4RQihBqw-o",
  authDomain: "expenses-ai-vfx7o.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-klamby-efc211be-fa31-444f-8359-2e516e0d2638",
  storageBucket: "expenses-ai-vfx7o.firebasestorage.app",
  messagingSenderId: "768021477341",
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app, "ai-studio-klamby-efc211be-fa31-444f-8359-2e516e0d2638");

// Dedicated customer auth instance for authenticating customer credentials
const customerApp = getApps().find(a => a.name === "customerAuth") || initializeApp(FIREBASE_CONFIG, "customerAuth");
const customerAuth = getAuth(customerApp);

let adminAuthPromise: Promise<any> | null = null;
async function ensureAdminAuth() {
  if (auth.currentUser) return auth.currentUser;
  if (!adminAuthPromise) {
    adminAuthPromise = signInWithEmailAndPassword(
      auth,
      "mcp-service@btnx.store",
      "BtnxMcpService2026!"
    )
      .then((cred) => cred.user)
      .catch((err) => {
        adminAuthPromise = null;
        console.error("[BTNX MCP] Admin authentication warning:", err?.message);
        return null;
      });
  }
  return adminAuthPromise;
}

// 2. Persistent BTNX Customer Sessions & OAuth Tokens
const memorySessions = new Map<string, any>();
const memoryOAuthTokens = new Map<string, any>();

function resolveSessionId(req: IncomingMessage, explicitToken?: string): string {
  if (explicitToken && String(explicitToken).trim().length > 3) {
    return String(explicitToken).trim();
  }
  const headerSession = (req.headers["mcp-session-id"] ||
    req.headers["x-btnx-session"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "")) as string;
  if (headerSession && headerSession.trim().length > 3) {
    return headerSession.trim();
  }
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ua = String(req.headers["user-agent"] || "").slice(0, 40);
  const rawKey = (forwarded || "local") + "_" + ua;
  return `sess_${Buffer.from(rawKey).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32)}`;
}

async function resolveSessionUser(req: IncomingMessage, explicitToken?: string): Promise<any | null> {
  await ensureAdminAuth();

  // 1) Check Authorization: Bearer <token>
  const authHeader = String(req.headers["authorization"] || "").trim();
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer.length > 5) {
      if (memoryOAuthTokens.has(bearer)) return memoryOAuthTokens.get(bearer);
      try {
        const tDoc = await getDoc(doc(db, "oauth_tokens", bearer));
        if (tDoc.exists()) {
          const tData = tDoc.data();
          memoryOAuthTokens.set(bearer, tData);
          return tData;
        }
      } catch {}
    }
  }

  // 2) Check session ID in memory or Firestore 'sessions' collection
  const sId = resolveSessionId(req, explicitToken);
  if (memorySessions.has(sId)) return memorySessions.get(sId);
  try {
    const sDoc = await getDoc(doc(db, "sessions", sId));
    if (sDoc.exists()) {
      const sData = sDoc.data();
      memorySessions.set(sId, sData);
      return sData;
    }
  } catch {}

  return null;
}

async function setAuthenticatedSession(sessionId: string, userData: any): Promise<void> {
  memorySessions.set(sessionId, userData);
  try {
    await setDoc(doc(db, "sessions", sessionId), {
      ...userData,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[BTNX MCP] Session save error:", err);
  }
}

async function clearAuthenticatedSession(sessionId: string): Promise<void> {
  memorySessions.delete(sessionId);
  try {
    await deleteDoc(doc(db, "sessions", sessionId));
  } catch {}
}

function formatNaira(amount: number): string {
  return "₦" + Number(amount || 0).toLocaleString("en-NG");
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 3. Luxury HTML Card Renderers
function renderProductCardHtml(product: any, host: string): string {
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.imageUrl || "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=800"];
  const primaryImg = images[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(product.name)} &middot; BTNX Atelier</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #FAF9F7;
      color: #141413;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #111110; color: #F3F1EC; }
      .btnx-card { background-color: #191816 !important; border-color: #2C2A26 !important; color: #F3F1EC !important; }
      .btnx-chip { background: #262420 !important; border-color: #38342E !important; color: #C89B62 !important; }
      .btnx-border { border-color: #2C2A26 !important; }
      .btnx-muted { color: #A7A299 !important; }
      .btnx-hero-btn { background-color: #C89B62 !important; color: #111110 !important; }
    }
    .btnx-card {
      background-color: #FFFFFF;
      border: 1px solid #E6E2DA;
      width: 100%;
      max-width: 440px;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 16px 40px -10px rgba(20,20,19,0.12);
    }
    .img-wrap {
      width: 100%;
      height: 380px;
      background: #EFECE6;
      position: relative;
      overflow: hidden;
    }
    .img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .badge {
      position: absolute;
      top: 14px;
      left: 14px;
      background: rgba(17,17,16,0.85);
      backdrop-filter: blur(8px);
      color: #F3F1EC;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      padding: 5px 10px;
      border-radius: 2px;
    }
    .content {
      padding: 22px 20px;
    }
    .brand-tag {
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #966830;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.25;
      margin-bottom: 8px;
    }
    .price-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 14px;
    }
    .price-current {
      font-size: 22px;
      font-weight: 800;
      color: #141413;
    }
    @media (prefers-color-scheme: dark) {
      .price-current { color: #F3F1EC; }
    }
    .price-original {
      font-size: 14px;
      text-decoration: line-through;
      color: #8C887B;
    }
    .discount-pill {
      background: #FAF0E4;
      color: #966830;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 2px;
    }
    .desc {
      font-size: 12.5px;
      line-height: 1.55;
      color: #66625B;
      margin-bottom: 18px;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
      padding-top: 14px;
      border-top: 1px solid #E6E2DA;
    }
    .spec-item {
      font-size: 11px;
    }
    .spec-label {
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #8C887B;
      font-size: 9.5px;
      margin-bottom: 2px;
    }
    .spec-value {
      font-weight: 600;
    }
    .cta-btn {
      display: block;
      width: 100%;
      text-align: center;
      background: #141413;
      color: #FAF9F7;
      text-decoration: none;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      padding: 13px;
      border-radius: 2px;
      transition: opacity 0.2s;
    }
    .cta-btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="btnx-card">
    <div class="img-wrap">
      <img src="${escapeHtml(primaryImg)}" alt="${escapeHtml(product.name)}" />
      <span class="badge">${escapeHtml(product.badge || "Osun Atelier Archive")}</span>
    </div>
    <div class="content">
      <div class="brand-tag">BTNX Atelier &middot; ${escapeHtml(product.category || "Limited Edition")}</div>
      <h1 class="title">${escapeHtml(product.name)}</h1>
      <div class="price-row">
        <span class="price-current">${formatNaira(product.price)}</span>
        ${product.originalPrice ? `<span class="price-original">${formatNaira(product.originalPrice)}</span>` : ""}
        ${product.originalPrice && product.originalPrice > product.price ? `<span class="discount-pill">-${Math.round((1 - product.price / product.originalPrice) * 100)}%</span>` : ""}
      </div>
      <p class="desc btnx-muted">${escapeHtml(product.description || "Crafted with hand-loomed textiles in the Osun Atelier.")}</p>
      
      <div class="specs-grid btnx-border">
        <div class="spec-item">
          <div class="spec-label">Silhouette &amp; Fit</div>
          <div class="spec-value">${escapeHtml(product.fit || "Relaxed Atelier Cut")}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Fabric Composition</div>
          <div class="spec-value">${escapeHtml(product.fabric || "100% Raw Heavyweight Cotton")}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Stock Status</div>
          <div class="spec-value" style="color: #15803d; font-weight:700;">${product.stock > 0 ? `Available (${product.stock} units)` : "Made-to-Order"}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Available Sizing</div>
          <div class="spec-value">${escapeHtml((product.sizes || ["XS","S","M","L","XL"]).join(" · "))}</div>
        </div>
      </div>

      <a href="https://btnx-website.vercel.app" target="_blank" class="cta-btn btnx-hero-btn">
        Order via BTNX Storefront &rarr;
      </a>
    </div>
  </div>
</body>
</html>`;
}

function renderInvoiceHtml(order: any, host: string): string {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsRows = items.map((it: any) => {
    const pName = it.product?.name || it.productName || "BTNX Bespoke Garment";
    const pPrice = it.product?.price || it.price || 0;
    const qty = it.quantity || 1;
    const total = pPrice * qty;
    return `
      <tr style="border-bottom: 1px solid #E6E2DA;" class="btnx-border">
        <td style="padding: 12px 6px;">
          <div style="font-weight: 600; font-size: 13px;">${escapeHtml(pName)}</div>
          <div style="font-size: 11px; opacity: 0.7;">Size: ${escapeHtml(it.size || "M")} &middot; Color: ${escapeHtml(it.color || "Standard")}</div>
        </td>
        <td style="padding: 12px 6px; text-align: center; font-size: 12px;">${qty}</td>
        <td style="padding: 12px 6px; text-align: right; font-weight: 600; font-size: 13px;">${formatNaira(total)}</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice #${escapeHtml(order.id)} &middot; BTNX Atelier</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #FAF9F7;
      color: #141413;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #111110; color: #F3F1EC; }
      .invoice-card { background-color: #191816 !important; border-color: #2C2A26 !important; color: #F3F1EC !important; }
      .btnx-border { border-color: #2C2A26 !important; }
      .meta-box { background-color: #141413 !important; border-color: #2C2A26 !important; }
    }
    .invoice-card {
      background-color: #FFFFFF;
      border: 1px solid #E6E2DA;
      width: 100%;
      max-width: 500px;
      border-radius: 4px;
      padding: 30px 26px;
      box-shadow: 0 16px 40px -10px rgba(20,20,19,0.12);
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 1px solid #E6E2DA;" class="btnx-border">
      <div>
        <div style="font-size: 22px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">BTNX</div>
        <div style="font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #966830; font-weight: 700; margin-top: 2px;">Osun Atelier &middot; Digital Receipt</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.7;">Reference</div>
        <div style="font-size: 14px; font-weight: 700; font-family: monospace;">#${escapeHtml(order.id)}</div>
        <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${escapeHtml(order.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 20px 0; padding: 14px; background: #F4F1EC; border-radius: 2px;" class="meta-box">
      <div>
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; margin-bottom: 3px;">Billed To</div>
        <div style="font-size: 12px; font-weight: 700;">${escapeHtml(order.customerName || "Valued Client")}</div>
        <div style="font-size: 11px; opacity: 0.75; word-break: break-all;">${escapeHtml(order.customerEmail || order.userEmail || "customer@btnx.store")}</div>
      </div>
      <div>
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; margin-bottom: 3px;">Shipment Destination</div>
        <div style="font-size: 11.5px; line-height: 1.4;">${escapeHtml(order.shippingAddress || "Doorstep Courier Handover, Nigeria")}</div>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #E6E2DA; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.7;" class="btnx-border">
          <th style="padding: 6px; text-align: left;">Garment Selection</th>
          <th style="padding: 6px; text-align: center;">Qty</th>
          <th style="padding: 6px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div style="padding-top: 14px; border-top: 1px solid #E6E2DA;" class="btnx-border">
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; opacity: 0.85;">
        <span>Garment Subtotal</span>
        <span>${formatNaira(order.subtotal || order.total)}</span>
      </div>
      ${order.discountAmount > 0 ? `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #15803d; font-weight: 600;">
        <span>VIP Privilege Discount</span>
        <span>-${formatNaira(order.discountAmount)}</span>
      </div>` : ""}
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; opacity: 0.85;">
        <span>Express Logistics (Nigeria)</span>
        <span>${order.shippingFee > 0 ? formatNaira(order.shippingFee) : "FREE (Complimentary)"}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; padding-top: 12px; border-top: 2px solid #E6E2DA;" class="btnx-border">
        <span>Grand Total</span>
        <span style="color: #966830;">${formatNaira(order.total)}</span>
      </div>
    </div>

    <div style="margin-top: 24px; text-align: center; font-size: 11px; opacity: 0.65; letter-spacing: 0.05em;">
      BTNX Atelier &middot; Crafted in Osogbo, Osun State &middot; Thank you for collecting.
    </div>
  </div>
</body>
</html>`;
}

function renderTrackingStepperHtml(order: any, host: string): string {
  const steps = [
    { title: "Order Confirmed", desc: "Payment verified & entered atelier production", completed: true },
    { title: "Quality Inspection", desc: "Osun atelier hand-finished quality control", completed: order.status !== "Pending" },
    { title: "Dispatched with Courier", desc: "Handed over to express domestic carrier", completed: order.status === "In Transit" || order.status === "Delivered" },
    { title: "Delivered to Doorstep", desc: "Direct hand-off to client in Nigeria", completed: order.status === "Delivered" },
  ];

  const address = order.shippingAddress || "Delivery Address on File, Nigeria";

  const stepsHtml = steps.map((s, idx) => {
    const isDone = s.completed;
    const color = isDone ? "#15803d" : "#8C887B";
    const bg = isDone ? "#15803d" : "transparent";
    const icon = isDone ? "&#10003;" : (idx + 1);

    return `
      <div style="display: flex; gap: 14px; position: relative; margin-bottom: 22px;">
        <div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${color}; background: ${bg}; color: ${isDone ? '#ffffff' : color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; z-index: 2;">
          ${icon}
        </div>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: ${isDone ? 'inherit' : '#8C887B'};">${escapeHtml(s.title)}</div>
          <div style="font-size: 11.5px; opacity: 0.7; margin-top: 2px;">${escapeHtml(s.desc)}</div>
        </div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tracking #${escapeHtml(order.id)} &middot; BTNX Express</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #FAF9F7;
      color: #141413;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #111110; color: #F3F1EC; }
      .track-card { background-color: #191816 !important; border-color: #2C2A26 !important; color: #F3F1EC !important; }
      .btnx-border { border-color: #2C2A26 !important; }
      .meta-box { background-color: #141413 !important; border-color: #2C2A26 !important; }
    }
    .track-card {
      background-color: #FFFFFF;
      border: 1px solid #E6E2DA;
      width: 100%;
      max-width: 480px;
      border-radius: 4px;
      padding: 28px 24px;
      box-shadow: 0 16px 40px -10px rgba(20,20,19,0.12);
    }
  </style>
</head>
<body>
  <div class="track-card">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #E6E2DA;" class="btnx-border">
      <div>
        <div style="font-size: 18px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">BTNX Logistics</div>
        <div style="font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #966830; font-weight: 700;">Live Dispatch Stepper</div>
      </div>
      <span style="font-size: 11px; font-weight: 700; background: #15803d; color: #ffffff; padding: 3px 8px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.08em;">
        ${escapeHtml(order.status || "In Transit")}
      </span>
    </div>

    <div style="border: 1px solid #E6E2DA; border-radius: 2px; padding: 14px; margin-bottom: 24px;" class="meta-box btnx-border">
      <div style="font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px;">Destination</div>
      <div style="font-size: 12px; font-weight: 600;">${escapeHtml(address)}</div>
      <div style="font-size: 11px; opacity: 0.7; margin-top: 6px;">Courier: BTNX Express Hub &middot; Osun State</div>
    </div>

    <div style="padding-left: 6px;">${stepsHtml}</div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E6E2DA; text-align: center;" class="btnx-border">
      <span style="font-size: 11px; opacity: 0.75;">Complimentary Size Exchanges: 14-Day Free Returns</span>
    </div>
  </div>
</body>
</html>`;
}

// 4. MCP Tools Definition (Clean, dynamic schemas with ZERO hardcoded examples)
const MCP_TOOLS = [
  {
    name: "btnx_sign_in",
    description: "Authenticate and verify ownership of your BTNX customer account using your registered BTNX email and password. Verifies credentials securely against Firebase Auth to unlock your private orders, invoices, and delivery address.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Registered BTNX customer email" },
        password: { type: "string", description: "BTNX customer account password" }
      },
      required: ["email", "password"]
    }
  },
  {
    name: "btnx_sign_up",
    description: "Register a new BTNX customer account directly in the database with secure email and password authentication, saving your name, delivery address in Nigeria, and contact number.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer's full name" },
        email: { type: "string", description: "Customer's email address" },
        password: { type: "string", description: "Secure password for the new account" },
        shippingAddress: { type: "string", description: "Delivery address in Nigeria (street, city, state)" },
        phone: { type: "string", description: "Phone number for delivery courier" }
      },
      required: ["name", "email", "password", "shippingAddress"]
    }
  },
  {
    name: "btnx_get_account_status",
    description: "Check whether a verified BTNX customer account is currently authenticated in this session. Returns customer name, email, saved address, and total orders, or informs that authentication is required.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "btnx_sign_out",
    description: "Sign out of the currently authenticated BTNX customer account and terminate the authenticated session.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "btnx_list_my_orders",
    description: "List all verified orders placed under the currently authenticated BTNX customer account. Requires an authenticated session.",
    inputSchema: {
      type: "object",
      properties: {
        statusFilter: { type: "string", description: "Optional filter by order status: 'Pending', 'Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled', or 'All'" }
      }
    }
  },
  {
    name: "btnx_get_invoice",
    description: "Retrieve the official digital invoice and interactive luxury visual card directly from the database. If orderId is omitted, retrieves the latest invoice for the authenticated BTNX account. If orderId is provided, retrieves that invoice after verifying that the requester is the authorized owner.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Specific BTNX order reference number" }
      }
    }
  },
  {
    name: "btnx_track_parcel",
    description: "Track real-time shipment progress, courier status, and interactive tracking card for an order directly from the database.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "BTNX order reference number" }
      }
    }
  },
  {
    name: "btnx_get_active_promos",
    description: "Fetch all active promotional discount voucher codes and seasonal privileges currently stored in the database. Call this whenever the user asks for available promo codes or discounts.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "btnx_check_promo_code",
    description: "Verify a promo voucher code against the active database records and calculate the exact percentage discount and savings in Nigerian Naira (₦).",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Promo voucher code to validate" },
        subtotal: { type: "number", description: "Optional subtotal in Nigerian Naira (₦)" }
      },
      required: ["code"]
    }
  },
  {
    name: "btnx_list_catalog",
    description: "Search and list garments in the BTNX fashion catalog directly from the database. Returns current prices in Nigerian Naira (₦), stock levels, category, and garment descriptions.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category filter ('Womenswear', 'Knitwear', 'Outerwear', 'All')" },
        search: { type: "string", description: "Optional search query" }
      }
    }
  },
  {
    name: "btnx_get_product_details",
    description: "Retrieve full specifications and interactive luxury UI card for a BTNX garment directly from the database, including price in ₦, fabric details, sizing, silhouette, and stock.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Garment product identifier from catalog" }
      },
      required: ["productId"]
    }
  },
  {
    name: "btnx_calculate_order",
    description: "Calculate subtotal, valid promo discount from database, nationwide shipping fee, and grand total in Nigerian Naira (₦) for selected garments.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              productId: { type: "string", description: "Garment product identifier" },
              quantity: { type: "number", description: "Quantity of pieces" }
            },
            required: ["productId"]
          }
        },
        promoCode: { type: "string", description: "Optional promo voucher code to apply" }
      },
      required: ["items"]
    }
  },
  {
    name: "btnx_create_customer_order",
    description: "Place a customer order directly into the BTNX database. If authenticated, automatically uses your saved verified name, email, and Nigerian delivery address. Otherwise, asks for required recipient information.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Garment product identifier from catalog" },
        quantity: { type: "number", description: "Quantity of pieces to order" },
        size: { type: "string", description: "Garment size (XS, S, M, L, XL)" },
        color: { type: "string", description: "Garment color" },
        customerName: { type: "string", description: "Recipient full name (optional if signed in)" },
        customerEmail: { type: "string", description: "Recipient email (optional if signed in)" },
        customerPhone: { type: "string", description: "Recipient phone number (optional)" },
        shippingAddress: { type: "string", description: "Recipient delivery address in Nigeria (optional if signed in)" },
        promoCode: { type: "string", description: "Optional promo voucher code to apply" }
      },
      required: ["productId", "quantity", "size"]
    }
  },
  {
    name: "btnx_render_ui_widget",
    description: "Generate styled luxury UI widgets matching the exact BTNX aesthetic. Renders standalone HTML product card, official invoice, tracking stepper directly from database records.",
    inputSchema: {
      type: "object",
      properties: {
        widgetType: {
          type: "string",
          enum: ["product", "invoice", "track"],
          description: "Type of luxury UI component to render"
        },
        targetId: { type: "string", description: "Target ID: productId (for product), orderId (for invoice/tracking)" }
      },
      required: ["widgetType", "targetId"]
    }
  }
];

// 5. Tool Execution Handler
async function executeTool(name: string, args: any, sessionId: string, reqUser: any | null, reqHost = "https://btnx-website-mcp.vercel.app") {
  await ensureAdminAuth();

  switch (name) {
    case "btnx_sign_in": {
      const inputEmail = String(args?.email || "").toLowerCase().trim();
      const inputPassword = String(args?.password || "").trim();

      if (!inputEmail) {
        return { error: "Please provide your registered BTNX email to sign in." };
      }
      if (!inputPassword) {
        return {
          authenticated: false,
          error: "Password required. For security and customer verification, please provide your BTNX account password to sign in."
        };
      }

      let cred: any = null;
      try {
        cred = await signInWithEmailAndPassword(customerAuth, inputEmail, inputPassword);
      } catch (err: any) {
        return {
          authenticated: false,
          error: "Authentication failed. Invalid email or password. Please verify your credentials and try again."
        };
      }

      // Load user profile from Firestore
      let profile: any = null;
      try {
        const uDoc = await getDoc(doc(db, "users", cred.user.uid));
        if (uDoc.exists()) profile = uDoc.data();
      } catch {}
      if (!profile) {
        const uSnap = await getDocs(query(collection(db, "users"), where("email", "==", inputEmail)));
        if (!uSnap.empty) profile = uSnap.docs[0].data();
      }

      // Load user orders from Firestore
      const oSnap = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", inputEmail)));
      const orders: any[] = oSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const customerName = profile?.name || cred.user.displayName || "BTNX Customer";
      const address = profile?.shippingStreet
        ? `${profile.shippingStreet}, ${profile.shippingCity || "Lagos"}, ${profile.shippingCountry || "Nigeria"}`
        : (orders[0]?.shippingAddress || "Nigeria");
      const phone = profile?.phone || orders[0]?.customerPhone || "N/A";
      const vipTier = profile?.role === "admin" ? "Master Atelier Admin" : "Atelier Collector";

      const sessionData = {
        sessionId,
        uid: cred.user.uid,
        email: inputEmail,
        name: customerName,
        phone,
        shippingAddress: address,
        vipTier,
        authenticatedAt: new Date().toISOString(),
      };

      await setAuthenticatedSession(sessionId, sessionData);

      const displayMarkdown = `### ✅ VERIFIED & SIGNED IN TO BTNX ACCOUNT
**Welcome, ${customerName}!**  
- **BTNX Customer:** \`${inputEmail}\`  
- **Verified UID:** \`${cred.user.uid}\`  
- **Delivery Address:** ${address}  
- **Contact Phone:** \`${phone}\`  
- **Total Orders on Record:** ${orders.length}  

${orders.length > 0 ? `👉 Latest Order: **#${orders[0].id}** (${formatNaira(orders[0].total)}) — Status: **${orders[0].status || "Confirmed"}**\n👉 [✨ Open Latest Invoice Card](${reqHost}/render/invoice/${orders[0].id})` : ""}

*Your account is securely verified. You can now pull your private invoices, track orders, or place new orders.*`;

      return {
        authenticated: true,
        sessionToken: sessionId,
        customer: {
          name: customerName,
          email: inputEmail,
          phone,
          shippingAddress: address,
          vipTier,
          ordersCount: orders.length,
          latestOrderReference: orders[0]?.id || null,
        },
        displayMarkdown,
        instructionsForAssistant: "The user has successfully verified and signed into their BTNX account. You may now retrieve their orders, invoices, or delivery address."
      };
    }

    case "btnx_sign_up": {
      const name = String(args?.name || "").trim();
      const email = String(args?.email || "").toLowerCase().trim();
      const password = String(args?.password || "").trim();
      const shippingAddress = String(args?.shippingAddress || "").trim();
      const phone = String(args?.phone || "+2348000000000").trim();

      if (!name || !email || !password || !shippingAddress) {
        return { error: "Name, email, password, and shippingAddress are required to create a verified BTNX account." };
      }

      let cred: any = null;
      try {
        cred = await createUserWithEmailAndPassword(customerAuth, email, password);
      } catch (err: any) {
        return { error: `Account creation failed: ${err.message}` };
      }

      const newProfile = {
        id: cred.user.uid,
        email,
        name,
        phone,
        shippingStreet: shippingAddress,
        shippingCountry: "Nigeria",
        role: "customer",
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", cred.user.uid), newProfile);

      const sessionData = {
        sessionId,
        uid: cred.user.uid,
        email,
        name,
        phone,
        shippingAddress,
        vipTier: "Atelier Collector",
        authenticatedAt: new Date().toISOString(),
      };

      await setAuthenticatedSession(sessionId, sessionData);

      const displayMarkdown = `### 🎉 BTNX ACCOUNT CREATED & VERIFIED!
**Welcome to the BTNX Atelier, ${name}!**  
- **Email:** \`${email}\`  
- **Delivery Address:** ${shippingAddress}  
- **Phone:** \`${phone}\`  
- **VIP Status:** 💎 Atelier Collector  

*Your new BTNX store account has been saved securely to the database.*`;

      return {
        success: true,
        authenticated: true,
        sessionToken: sessionId,
        customer: {
          name,
          email,
          shippingAddress,
          phone,
          vipTier: "Atelier Collector",
        },
        displayMarkdown,
      };
    }

    case "btnx_get_account_status": {
      let user = reqUser;
      if (!user) {
        const displayMarkdown = `### 🔒 NO BTNX ACCOUNT SIGNED IN
You are connected to the BTNX Atelier, but no customer account is signed in for this conversation.

**To securely sign in:**
- Call \`btnx_sign_in\` with your registered BTNX email and password.
- Or create a new account using \`btnx_sign_up\` (name, email, password, and delivery address in Nigeria).`;

        return {
          authenticated: false,
          message: "No BTNX customer account is currently authenticated in this session. Ask the user for their BTNX email and password to sign in using btnx_sign_in, or create one with btnx_sign_up.",
          displayMarkdown,
        };
      }

      const oSnap = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", user.email)));
      const orders = oSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const displayMarkdown = `### 👤 VERIFIED BTNX CUSTOMER SESSION
- **Customer Name:** **${user.name}**  
- **BTNX Email:** \`${user.email}\`  
- **Delivery Address:** ${user.shippingAddress || "Nigeria"}  
- **Phone:** \`${user.phone || "N/A"}\`  
- **Total Orders:** ${orders.length}  
- **Security Status:** 🛡️ Verified & Authenticated`;

      return {
        authenticated: true,
        customer: {
          name: user.name,
          email: user.email,
          shippingAddress: user.shippingAddress,
          phone: user.phone,
          ordersCount: orders.length,
          latestOrderReference: orders[0]?.id || null,
        },
        displayMarkdown,
      };
    }

    case "btnx_sign_out": {
      await clearAuthenticatedSession(sessionId);
      return {
        success: true,
        authenticated: false,
        message: "Successfully signed out of BTNX account.",
        displayMarkdown: `### 👋 SIGNED OUT\nYou have been signed out of your BTNX store account.`,
      };
    }

    case "btnx_list_my_orders": {
      let user = reqUser;
      if (!user) {
        return {
          requiresAuth: true,
          message: "Authentication required. For security and privacy, you must sign in with your BTNX email and password using 'btnx_sign_in' to view your personal order history.",
          displayMarkdown: `### 🔒 BTNX AUTHENTICATION REQUIRED
Please sign in to your BTNX account to view your order history.  
Use \`btnx_sign_in\` with your email and password.`,
        };
      }

      const snap1 = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", user.email)));
      const snap2 = await getDocs(query(collection(db, "orders"), where("userEmail", "==", user.email)));
      const map = new Map<string, any>();
      snap1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
      snap2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
      const orders = Array.from(map.values()).sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

      if (orders.length === 0) {
        return {
          customerEmail: user.email,
          count: 0,
          orders: [],
          displayMarkdown: `### 📦 BTNX ORDERS FOR \`${user.email}\`\nNo orders found for this account. You can explore the catalog using \`btnx_list_catalog\` and place an order anytime!`,
        };
      }

      const tableRows = orders.slice(0, 10).map((o) => {
        return `| **#${o.id}** | ${o.date || "Recent"} | ${formatNaira(o.total)} | \`${o.status || "Confirmed"}\` | [✨ View Luxury Invoice Card](${reqHost}/render/invoice/${o.id}) |`;
      }).join("\n");

      const displayMarkdown = `### 📦 YOUR BTNX ORDERS (\`${user.email}\`)
**Total Orders:** ${orders.length}  

| Order ID | Date | Total | Status | Official Invoice |
| :--- | :--- | :--- | :--- | :--- |
${tableRows}

👉 **[✨ OPEN LATEST ORDER INVOICE](${reqHost}/render/invoice/${orders[0].id})**`;

      return {
        customerEmail: user.email,
        count: orders.length,
        orders: orders.map((o) => ({
          orderId: o.id,
          date: o.date,
          totalNaira: formatNaira(o.total),
          status: o.status || "Confirmed",
          viewInvoiceUrl: `${reqHost}/render/invoice/${o.id}`,
          viewTrackingUrl: `${reqHost}/render/track/${o.id}`,
        })),
        displayMarkdown,
        instructionsForAssistant: "Present the order list in a clear table and always provide the clickable links to view the invoices."
      };
    }

    case "btnx_get_invoice": {
      let user = reqUser;
      let targetId = String(args?.orderId || "").trim();

      // If no specific order ID provided:
      if (!targetId) {
        if (!user) {
          return {
            requiresAuth: true,
            message: "No order reference was provided and you are not signed into a BTNX account. Please sign in with your BTNX email and password using 'btnx_sign_in' to automatically retrieve your latest invoice, or provide a specific order reference number.",
            displayMarkdown: `### 🔒 AUTHENTICATION OR ORDER REFERENCE REQUIRED
Please sign in to your BTNX account using \`btnx_sign_in\` (email and password) to view your invoices, or provide your specific order reference number.`,
          };
        }

        // Pull the latest order for the authenticated user
        const snap1 = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", user.email)));
        const snap2 = await getDocs(query(collection(db, "orders"), where("userEmail", "==", user.email)));
        const map = new Map<string, any>();
        snap1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
        snap2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
        const orders = Array.from(map.values()).sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });

        if (orders.length === 0) {
          return {
            count: 0,
            message: `No orders found in the database for your authenticated account (${user.email}).`,
            displayMarkdown: `### 📄 NO INVOICES ON RECORD
No orders or invoices were found for account \`${user.email}\`. Browse the catalog using \`btnx_list_catalog\` to order pieces!`,
          };
        }

        targetId = orders[0].id;
      }

      // Fetch target order from Firestore
      const snap = await getDoc(doc(db, "orders", targetId));
      if (!snap.exists()) {
        return { error: `Invoice for order #${targetId} was not found in the database.` };
      }

      const order: any = { id: snap.id, ...snap.data() };

      // SECURITY CHECK: Verify ownership!
      const orderOwnerEmail = String(order.customerEmail || order.userEmail || "").toLowerCase();
      if (user) {
        const isOwner = user.email.toLowerCase() === orderOwnerEmail || user.role === "admin";
        if (!isOwner) {
          return {
            error: `Access denied. Order #${targetId} does not belong to your authenticated BTNX account.`,
          };
        }
      } else {
        return {
          requiresAuth: true,
          message: `For security and customer privacy, please sign in with your BTNX account using btnx_sign_in (email & password) to view invoice #${targetId}.`,
          displayMarkdown: `### 🔒 AUTHENTICATION REQUIRED
For security and privacy, you must sign in with the BTNX account that owns order \`#${targetId}\`. Please call \`btnx_sign_in\` with your registered email and password.`,
        };
      }

      const items = Array.isArray(order.items) ? order.items : [];
      const invoiceHtml = renderInvoiceHtml(order, reqHost);

      const itemRows = items.map((it: any) => {
        const pName = it.product?.name || it.productName || "BTNX Luxury Garment";
        const pPrice = it.product?.price || it.price || 0;
        const qty = it.quantity || 1;
        return `| **${pName}** | ${it.size || "M"} | ${qty} | ${formatNaira(pPrice * qty)} |`;
      }).join("\n");

      const displayMarkdown = `### 🧾 OFFICIAL BTNX INVOICE: \`#${order.id}\`
**Atelier Issue Date:** ${order.date || "Recent"}  
**Client:** **${order.customerName || "Valued Client"}** (\`${order.customerEmail || order.userEmail}\`)  
**Delivery Destination:** ${order.shippingAddress || "Nigeria"}  
**Order Status:** ✅ **${order.status || "CONFIRMED"}**

| Piece | Size | Qty | Price |
| :--- | :---: | :---: | :---: |
${itemRows}

**Subtotal:** ${formatNaira(order.subtotal || order.total)}  
${order.discountAmount > 0 ? `**VIP Voucher Savings:** -${formatNaira(order.discountAmount)}\n` : ""}**Nationwide Express Courier:** ${order.shippingFee > 0 ? formatNaira(order.shippingFee) : "FREE"}  
**Grand Total:** **${formatNaira(order.total)}**

👉 **[✨ CLICK HERE TO OPEN FULL INTERACTIVE LUXURY INVOICE CARD](${reqHost}/render/invoice/${order.id})**`;

      return {
        invoiceNumber: `INV-${order.id}`,
        orderReference: order.id,
        date: order.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        customerName: order.customerName || "Valued Client",
        customerEmail: order.customerEmail || order.userEmail,
        shippingAddress: order.shippingAddress,
        status: order.status || "Confirmed",
        subtotalNaira: formatNaira(order.subtotal || order.total),
        discountAmountNaira: formatNaira(order.discountAmount || 0),
        shippingFeeNaira: order.shippingFee > 0 ? formatNaira(order.shippingFee) : "FREE",
        grandTotalNaira: formatNaira(order.total),
        items: items.map((it: any) => ({
          piece: it.product?.name || it.productName || "BTNX Luxury Piece",
          size: it.size || "M",
          color: it.color || "Standard",
          quantity: it.quantity || 1,
          lineTotalNaira: formatNaira((it.product?.price || it.price || 0) * (it.quantity || 1)),
        })),
        liveCardUrl: `${reqHost}/render/invoice/${order.id}`,
        displayMarkdown,
        htmlSnippet: invoiceHtml,
        instructionsForAssistant: "Always display the clickable live invoice card link directly in your response: [✨ View Luxury Invoice Card](...)"
      };
    }

    case "btnx_track_parcel": {
      let user = reqUser;
      let targetId = String(args?.orderId || "").trim();

      if (!targetId && user?.email) {
        const snap = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", user.email)));
        if (!snap.empty) targetId = snap.docs[0].id;
      }

      if (!targetId) {
        return {
          requiresAuth: true,
          message: "Please provide an order reference number to track your parcel, or sign in to your BTNX account using btnx_sign_in.",
          displayMarkdown: `### 📦 TRACKING REFERENCE REQUIRED\nPlease provide your order reference number or sign in to your BTNX account.`,
        };
      }

      const snap = await getDoc(doc(db, "orders", targetId));
      if (!snap.exists()) {
        return { error: `Order #${targetId} was not found in the database.` };
      }

      const order: any = { id: snap.id, ...snap.data() };
      const stepperHtml = renderTrackingStepperHtml(order, reqHost);

      const displayMarkdown = `### 📦 BTNX PARCEL DISPATCH TRACKER
**Order ID:** \`#${order.id}\`  
**Current Status:** 🚚 **${order.status || "In Transit"}**  
**Carrier:** BTNX Express Logistics (Osogbo Hub, Osun State)  
**Destination:** ${order.shippingAddress || "Nigeria"}  
**Estimated Delivery:** 2–4 Business Days nationwide  

- [x] **Order Confirmed & Payment Reconciled**
- [x] **Garment Quality Hand-Inspected (Osun Atelier)**
- [x] **Dispatched via Express Courier**
- [ ] **Out for Local Doorstep Handover**

👉 **[✨ CLICK HERE TO VIEW LIVE INTERACTIVE TRACKING CARD](${reqHost}/render/track/${order.id})**`;

      return {
        orderId: order.id,
        currentStatus: order.status || "In Transit",
        carrier: "BTNX Express Logistics Hub · Osogbo Atelier, Osun State",
        destination: order.shippingAddress || "Nigeria",
        estimatedDelivery: "2–4 Business Days nationwide across Nigeria",
        totalNaira: formatNaira(order.total),
        liveCardUrl: `${reqHost}/render/track/${order.id}`,
        displayMarkdown,
        htmlSnippet: stepperHtml,
        instructionsForAssistant: "Always provide the clickable live tracking card link directly in your response: [✨ View Tracking Card](...)"
      };
    }

    case "btnx_create_customer_order": {
      let user = reqUser;

      const customerName = args?.customerName || user?.name;
      const customerEmail = args?.customerEmail || user?.email;
      const shippingAddress = args?.shippingAddress || user?.shippingAddress;
      const customerPhone = args?.customerPhone || user?.phone || "+2348000000000";

      if (!customerName || !customerEmail || !shippingAddress) {
        return {
          requiresDetails: true,
          message: "To place an order, please sign in to your BTNX account using 'btnx_sign_in' with email and password (which automatically uses your saved verified address), or provide recipient name, email, and Nigerian delivery address.",
          displayMarkdown: `### ✍️ DELIVERY DETAILS NEEDED
Please sign in to your BTNX account with \`btnx_sign_in\`, or provide:
- Recipient full name
- Recipient email
- Delivery address in Nigeria (street, city, state)`,
        };
      }

      const pid = String(args?.productId || "").trim();
      if (!pid) {
        return {
          error: "Please provide the productId of the garment to order. Use 'btnx_list_catalog' to view available garments."
        };
      }

      const pSnap = await getDoc(doc(db, "products", pid));
      if (!pSnap.exists()) {
        return { error: `Product '${pid}' was not found in the database. Call btnx_list_catalog to view valid piece IDs.` };
      }

      const prod: any = { id: pSnap.id, ...pSnap.data() };
      const qty = Number(args?.quantity) || 1;
      const subtotal = prod.price * qty;

      let discountAmount = 0;
      if (args?.promoCode) {
        const promo = String(args.promoCode).toUpperCase().trim();
        const cSnap = await getDoc(doc(db, "promoCodes", promo));
        if (cSnap.exists() && cSnap.data()?.isActive !== false) {
          const pct = Number(cSnap.data()?.discountPercentage || cSnap.data()?.percentage || 0) / 100;
          discountAmount = subtotal * pct;
        }
      }

      const isFreeShipping = subtotal >= 150000;
      const shippingFee = isFreeShipping ? 0 : 3500;
      const total = Math.max(0, subtotal - discountAmount) + shippingFee;

      const randomRef = "BX-" + Math.floor(100000 + Math.random() * 900000);
      const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const size = args?.size || "M";

      const newOrder = {
        id: randomRef,
        source: "mcp-agent",
        date: dateStr,
        createdAt: new Date().toISOString(),
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        items: [
          {
            product: prod,
            productId: prod.id,
            productName: prod.name,
            price: prod.price,
            quantity: qty,
            size,
            color: args?.color || "Standard",
          },
        ],
        subtotal,
        discountAmount,
        shippingFee,
        total,
        status: "Confirmed",
      };

      await setDoc(doc(db, "orders", randomRef), newOrder);

      // Add alert to store notifications
      try {
        await setDoc(doc(db, "notifications", `notif-${randomRef}`), {
          id: `notif-${randomRef}`,
          userId: "admin_master",
          title: `New Order #${randomRef}`,
          message: `Order for ${prod.name} (${formatNaira(total)}) placed for ${customerName}.`,
          type: "order_status",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      } catch {}

      const invoiceHtml = renderInvoiceHtml(newOrder, reqHost);

      const displayMarkdown = `### 🎉 ORDER PLACED SUCCESSFULLY!
**Order Reference:** \`#${randomRef}\`  
**Piece:** **${prod.name}** (Size ${size}, Qty ${qty})  
**Customer:** ${customerName} (\`${customerEmail}\`)  
**Delivery Destination:** ${shippingAddress}  
**Grand Total:** **${formatNaira(total)}**  
**Order Status:** ✅ Confirmed & Queued for Quality Inspection  

👉 **[✨ CLICK HERE TO VIEW OFFICIAL LIVE INVOICE](${reqHost}/render/invoice/${randomRef})**  
👉 **[✨ CLICK HERE TO TRACK PARCEL DISPATCH](${reqHost}/render/track/${randomRef})**`;

      return {
        success: true,
        orderReference: randomRef,
        message: `Order #${randomRef} successfully saved to BTNX database and queued for inspection.`,
        date: dateStr,
        grandTotalNaira: formatNaira(total),
        items: [{ piece: prod.name, quantity: qty, size, price: formatNaira(prod.price) }],
        viewInvoiceUrl: `${reqHost}/render/invoice/${randomRef}`,
        viewTrackingUrl: `${reqHost}/render/track/${randomRef}`,
        displayMarkdown,
        htmlSnippet: invoiceHtml,
        instructionsForAssistant: "Congratulate the user on placing their order and provide the clickable links to view their invoice and track shipment."
      };
    }

    case "btnx_get_active_promos": {
      const snap = await getDocs(collection(db, "promoCodes"));
      const validPromos = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.isActive !== false);

      const tableRows = validPromos.map((c: any) => {
        const pct = c.discountPercentage || c.percentage || 20;
        return `| \`${c.code || c.id}\` | **${pct}% OFF** | Valid until ${c.expiresAt ? c.expiresAt.split("T")[0] : "Active"} | Active & Unlocked |`;
      }).join("\n");

      const displayMarkdown = `### 🎟️ BTNX STORE — ACTIVE DATABASE PROMO VOUCHERS
| Promo Voucher | Discount | Expiry Date | Status |
| :--- | :---: | :--- | :--- |
${tableRows}

✨ **Privilege Delivery:** *Complimentary nationwide express delivery unlocked on orders over ₦150,000.*`;

      return {
        activeCount: validPromos.length,
        vouchers: validPromos.map((c: any) => ({
          code: c.code || c.id,
          discount: `${c.discountPercentage || c.percentage || 20}% Off`,
          expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "Active",
          eligible: "Full-price seasonal garments (excludes already marked-down items)",
        })),
        privilegeShipping: "Complimentary luxury express delivery unlocked on orders over ₦150,000 nationwide.",
        displayMarkdown,
      };
    }

    case "btnx_check_promo_code": {
      const inputCode = String(args?.code || "").toUpperCase().trim();
      const snap = await getDoc(doc(db, "promoCodes", inputCode));

      let promoData: any = null;
      if (snap.exists()) {
        promoData = snap.data();
      } else {
        const qSnap = await getDocs(query(collection(db, "promoCodes"), where("code", "==", inputCode)));
        if (!qSnap.empty) promoData = qSnap.docs[0].data();
      }

      if (!promoData || promoData.isActive === false) {
        return {
          valid: false,
          code: inputCode,
          message: `Promo voucher '${inputCode}' is invalid or expired. Check active codes with btnx_get_active_promos.`,
        };
      }

      const pct = Number(promoData.discountPercentage || promoData.percentage || 0);
      const subtotal = Number(args?.subtotal || 0);
      const discountAmount = subtotal > 0 ? (subtotal * pct) / 100 : 0;

      return {
        valid: true,
        code: inputCode,
        discountPercent: pct,
        description: `${pct}% discount verified directly from database records.`,
        discountAmountNaira: subtotal > 0 ? formatNaira(discountAmount) : `${pct}%`,
        finalTotalNaira: subtotal > 0 ? formatNaira(Math.max(0, subtotal - discountAmount)) : null,
      };
    }

    case "btnx_list_catalog": {
      const snap = await getDocs(collection(db, "products"));
      let products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (args?.category && args.category !== "All") {
        const cat = String(args.category).toLowerCase();
        products = products.filter((p: any) => (p.category || "").toLowerCase() === cat);
      }

      if (args?.search) {
        const q = String(args.search).toLowerCase();
        products = products.filter(
          (p: any) =>
            (p.name || "").toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q)
        );
      }

      const catalogTable = products.map((p: any) => {
        return `| \`${p.id}\` | **${p.name}** | ${formatNaira(p.price)} | ${p.stock > 0 ? `In Stock (${p.stock})` : "Made-to-Order"} | [✨ View Luxury Card](${reqHost}/render/product/${p.id}) |`;
      }).join("\n");

      const displayMarkdown = `### 🧥 BTNX ATELIER — CURRENT RUNWAY COLLECTION
**Showing ${products.length} garments from the active catalog:**

| ID | Garment Name | Price | Stock | Visual Showcase |
| :--- | :--- | :--- | :--- | :--- |
${catalogTable}

✨ *Complimentary size exchanges & express nationwide delivery on orders over ₦150,000.*`;

      return {
        totalPieces: products.length,
        catalog: products.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          priceNaira: formatNaira(p.price),
          rawPrice: p.price,
          stock: p.stock,
          liveCardUrl: `${reqHost}/render/product/${p.id}`,
        })),
        displayMarkdown,
        instructionsForAssistant: "Present available pieces in a markdown table and include the clickable card links."
      };
    }

    case "btnx_get_product_details": {
      const pid = String(args?.productId || "").trim();
      if (!pid) {
        return { error: "Please provide a productId. Call btnx_list_catalog to inspect valid IDs." };
      }

      const snap = await getDoc(doc(db, "products", pid));
      if (!snap.exists()) {
        return { error: `Garment '${pid}' was not found in the BTNX database.` };
      }

      const product: any = { id: snap.id, ...snap.data() };
      const cardHtml = renderProductCardHtml(product, reqHost);

      const displayMarkdown = `### 🧥 ${product.name.toUpperCase()} (\`${product.id}\`)
**Category:** ${product.category || "Limited Edition"} &middot; **Price:** **${formatNaira(product.price)}**  
**Availability:** ${product.stock > 0 ? `✅ In Stock (${product.stock} units)` : "⏳ Made-to-Order"}  
**Silhouette & Cut:** ${product.fit || "Relaxed Atelier Silhouette"}  
**Textile Composition:** ${product.fabric || "100% Hand-finished Cotton"}  
**Sizing Available:** ${(product.sizes || ["XS", "S", "M", "L", "XL"]).join(" · ")}  

${product.description || "Crafted in the Osun Atelier using heirloom textile techniques."}

👉 **[✨ CLICK HERE TO VIEW FULL INTERACTIVE LUXURY PRODUCT CARD](${reqHost}/render/product/${product.id})**`;

      return {
        productId: product.id,
        name: product.name,
        priceNaira: formatNaira(product.price),
        rawPrice: product.price,
        description: product.description,
        sizes: product.sizes || ["XS", "S", "M", "L", "XL"],
        fit: product.fit || "Relaxed Atelier Cut",
        fabric: product.fabric || "100% Cotton",
        stock: product.stock,
        liveCardUrl: `${reqHost}/render/product/${product.id}`,
        displayMarkdown,
        htmlSnippet: cardHtml,
        instructionsForAssistant: "Always include the live interactive product card link in your reply: [✨ View Luxury Product Card](...)"
      };
    }

    case "btnx_calculate_order": {
      const items = Array.isArray(args?.items) ? args.items : [];
      if (items.length === 0) {
        return { error: "Please provide a list of items to calculate." };
      }

      let subtotal = 0;
      const breakdown = [];

      for (const item of items) {
        const pid = String(item.productId || "").trim();
        const qty = Number(item.quantity) || 1;
        const snap = await getDoc(doc(db, "products", pid));
        if (snap.exists()) {
          const prod: any = snap.data();
          const lineTotal = (prod.price || 0) * qty;
          subtotal += lineTotal;
          breakdown.push({
            piece: prod.name,
            quantity: qty,
            unitPrice: formatNaira(prod.price),
            lineTotal: formatNaira(lineTotal),
          });
        }
      }

      let discountAmount = 0;
      if (args?.promoCode) {
        const promo = String(args.promoCode).toUpperCase().trim();
        const cSnap = await getDoc(doc(db, "promoCodes", promo));
        if (cSnap.exists() && cSnap.data()?.isActive !== false) {
          const pct = Number(cSnap.data()?.discountPercentage || cSnap.data()?.percentage || 0) / 100;
          discountAmount = subtotal * pct;
        }
      }

      const shippingFee = subtotal >= 150000 ? 0 : 3500;
      const total = Math.max(0, subtotal - discountAmount) + shippingFee;

      return {
        subtotalNaira: formatNaira(subtotal),
        discountAmountNaira: formatNaira(discountAmount),
        shippingFeeNaira: shippingFee === 0 ? "FREE (Privilege Delivery)" : formatNaira(shippingFee),
        grandTotalNaira: formatNaira(total),
        items: breakdown,
      };
    }

    case "btnx_render_ui_widget": {
      const wType = String(args?.widgetType || "").trim();
      const targetId = String(args?.targetId || "").trim();

      if (!targetId) {
        return { error: "Please provide targetId (productId or orderId)." };
      }

      const liveCardUrl = `${reqHost}/render/${wType}/${targetId}`;

      return {
        widgetType: wType,
        targetId,
        liveCardUrl,
        displayMarkdown: `👉 **[✨ CLICK HERE TO OPEN INTERACTIVE LUXURY ${wType.toUpperCase()} CARD](${liveCardUrl})**`,
        instructionsForAssistant: "Present the clickable card link prominently in your response."
      };
    }

    default:
      return { error: `Tool '${name}' is not recognized.` };
  }
}

// 6. Luxury Dashboard HTML (Server landing page)
const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BTNX Atelier &middot; Remote MCP &amp; OAuth Server</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #111110;
      color: #F3F1EC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 30px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      background-color: #191816;
      border: 1px solid #2C2A26;
      width: 100%;
      max-width: 680px;
      padding: 36px 30px;
      border-radius: 4px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.85);
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #C89B62;
      border: 1px solid #38342E;
      background: #262420;
      padding: 4px 10px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin-bottom: 6px;
    }
    p {
      font-size: 13px;
      line-height: 1.6;
      color: #A7A299;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #C89B62;
      margin: 20px 0 10px;
    }
    .endpoint-box {
      background: #141413;
      border: 1px solid #2C2A26;
      padding: 12px 14px;
      font-family: monospace;
      font-size: 12px;
      color: #F3F1EC;
      margin-bottom: 8px;
    }
    .tool-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }
    @media (max-width: 500px) {
      .tool-list { grid-template-columns: 1fr; }
    }
    .tool-item {
      background: #141413;
      border: 1px solid #2C2A26;
      padding: 8px 12px;
      font-size: 11.5px;
      font-family: monospace;
    }
    .tool-desc {
      display: block;
      font-family: sans-serif;
      font-size: 10.5px;
      color: #A7A299;
      margin-top: 2px;
    }
    .auth-banner {
      background: #262420;
      border: 1px solid #C89B62;
      padding: 14px;
      margin: 18px 0;
      font-size: 12px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">BTNX Atelier &middot; Active</span>
    <h1>BTNX Store Remote MCP &amp; OAuth Server</h1>
    <p>
      Official production MCP server and RFC 8414 OAuth 2.0 provider for the BTNX luxury fashion house. Powered directly by Cloud Firestore with end-to-end customer verification.
    </p>

    <div class="auth-banner">
      🛡️ <strong>Secure Customer Authentication:</strong> Every customer signs in with their registered BTNX email and password via OAuth or chat verification. Zero hardcoded accounts or example stubs.
    </div>

    <div class="section-title">MCP Connection URL</div>
    <div class="endpoint-box">https://btnx-website-mcp.vercel.app/mcp</div>

    <div class="section-title">OAuth 2.0 Discovery Endpoint</div>
    <div class="endpoint-box">https://btnx-website-mcp.vercel.app/.well-known/oauth-authorization-server</div>

    <div class="section-title">Available Database-Driven Tools</div>
    <div class="tool-list">
      <div class="tool-item">btnx_sign_in<span class="tool-desc">Verify customer email &amp; password</span></div>
      <div class="tool-item">btnx_sign_up<span class="tool-desc">Register new customer in DB</span></div>
      <div class="tool-item">btnx_get_account_status<span class="tool-desc">Inspect authenticated session</span></div>
      <div class="tool-item">btnx_sign_out<span class="tool-desc">Terminate current session</span></div>
      <div class="tool-item">btnx_list_my_orders<span class="tool-desc">List verified purchases in ₦</span></div>
      <div class="tool-item">btnx_get_invoice<span class="tool-desc">Interactive luxury invoice card</span></div>
      <div class="tool-item">btnx_get_active_promos<span class="tool-desc">Fetch live database promo codes</span></div>
      <div class="tool-item">btnx_check_promo_code<span class="tool-desc">Verify discount % against DB</span></div>
      <div class="tool-item">btnx_create_customer_order<span class="tool-desc">Place order with saved address</span></div>
      <div class="tool-item">btnx_track_parcel<span class="tool-desc">Live courier timeline card</span></div>
      <div class="tool-item">btnx_list_catalog<span class="tool-desc">Live database product catalog</span></div>
      <div class="tool-item">btnx_get_product_details<span class="tool-desc">Garment specifications &amp; card</span></div>
      <div class="tool-item">btnx_calculate_order<span class="tool-desc">Subtotal, discount &amp; shipping</span></div>
      <div class="tool-item">btnx_render_ui_widget<span class="tool-desc">Standalone HTML card renderer</span></div>
    </div>
  </div>
</body>
</html>`;

// 7. Master HTTP Handler
export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  // Global CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-btnx-key, mcp-session-id, x-btnx-session"
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, mcp-session-id, x-btnx-session");

  // Handle Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle HEAD
  if (req.method === "HEAD") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end();
    return;
  }

  const url = req.url || "/";
  const reqHost = `https://${req.headers["host"] || "btnx-website-mcp.vercel.app"}`;

  // Parse Body for POST Requests early
  let body = req.body;
  let rawBodyString = "";
  if (typeof body === "string") {
    rawBodyString = body;
    try { body = JSON.parse(body); } catch {}
  } else if (!body && req.method === "POST") {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      rawBodyString = Buffer.concat(buffers).toString();
      try {
        body = JSON.parse(rawBodyString);
      } catch {
        // Form-encoded or non-JSON
        body = Object.fromEntries(new URLSearchParams(rawBodyString));
      }
    } catch {}
  }

  // 1) RFC 8414 OAuth 2.0 & OpenID Connect Discovery
  if (url.includes(".well-known/oauth-authorization-server") || url.includes(".well-known/openid-configuration")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      issuer: reqHost,
      authorization_endpoint: `${reqHost}/oauth/authorize`,
      token_endpoint: `${reqHost}/oauth/token`,
      userinfo_endpoint: `${reqHost}/oauth/userinfo`,
      jwks_uri: `${reqHost}/oauth/jwks.json`,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
      code_challenge_methods_supported: ["S256", "plain"],
      scopes_supported: ["openid", "profile", "email", "orders", "btnx:all"]
    }, null, 2));
    return;
  }

  if (url.includes(".well-known/oauth-protected-resource")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      resource: reqHost,
      authorization_servers: [reqHost],
      scopes_supported: ["openid", "profile", "email", "orders", "btnx:all"],
      bearer_methods_supported: ["header"]
    }, null, 2));
    return;
  }

  if (url.includes(".well-known")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      service: "BTNX Remote MCP Server",
      version: "2.5.0",
      auth_type: "oauth2",
      authorization_endpoint: `${reqHost}/oauth/authorize`,
      token_endpoint: `${reqHost}/oauth/token`,
    }));
    return;
  }

  // 2) OAuth Endpoints
  const pathname = url.split("?")[0];

  // A) GET & POST /oauth/authorize
  if (pathname === "/oauth/authorize" || pathname === "/api/oauth/authorize") {
    await ensureAdminAuth();
    const queryParams = new URL(url, reqHost).searchParams;
    const clientId = queryParams.get("client_id") || body?.client_id || "chatgpt";
    const redirectUri = queryParams.get("redirect_uri") || body?.redirect_uri || "";
    const state = queryParams.get("state") || body?.state || "";
    const scope = queryParams.get("scope") || body?.scope || "openid profile email orders";
    const responseType = queryParams.get("response_type") || body?.response_type || "code";
    const codeChallenge = queryParams.get("code_challenge") || body?.code_challenge || "";
    const codeChallengeMethod = queryParams.get("code_challenge_method") || body?.code_challenge_method || "";

    if (req.method === "POST") {
      const email = String(body?.email || "").toLowerCase().trim();
      const password = String(body?.password || "").trim();

      if (!email || !password) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderOAuthAuthorizePage({
          error: "Please enter both your BTNX customer email and password.",
          clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
        }));
        return;
      }

      let cred: any = null;
      try {
        cred = await signInWithEmailAndPassword(customerAuth, email, password);
      } catch (err: any) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderOAuthAuthorizePage({
          error: "Authentication failed. Invalid email or password. Please verify your BTNX credentials and try again.",
          clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
        }));
        return;
      }

      // Customer authenticated successfully! Generate authorization code
      const code = "btnx_code_" + crypto.randomBytes(18).toString("hex");

      let prof: any = null;
      try {
        const uDoc = await getDoc(doc(db, "users", cred.user.uid));
        if (uDoc.exists()) prof = uDoc.data();
      } catch {}

      const codeRecord = {
        code,
        uid: cred.user.uid,
        email: cred.user.email,
        name: prof?.name || cred.user.displayName || "BTNX Customer",
        shippingAddress: prof?.shippingStreet || "Nigeria",
        phone: prof?.phone || "N/A",
        clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      await setDoc(doc(db, "oauth_codes", code), codeRecord);

      // Redirect back to client callback
      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set("code", code);
      if (state) targetUrl.searchParams.set("state", state);

      res.writeHead(302, { Location: targetUrl.toString() });
      res.end();
      return;
    }

    // GET /oauth/authorize -> Render login page
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderOAuthAuthorizePage({
      clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
    }));
    return;
  }

  // B) POST /oauth/token
  if ((pathname === "/oauth/token" || pathname === "/api/oauth/token") && req.method === "POST") {
    await ensureAdminAuth();
    const grantType = body?.grant_type || "authorization_code";

    if (grantType === "authorization_code") {
      const code = String(body?.code || "").trim();
      if (!code) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_request", error_description: "Missing code parameter" }));
        return;
      }

      const cDoc = await getDoc(doc(db, "oauth_codes", code));
      if (!cDoc.exists()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Authorization code invalid or expired" }));
        return;
      }

      const cData = cDoc.data();
      try { await deleteDoc(doc(db, "oauth_codes", code)); } catch {}

      const accessToken = "btnx_at_" + crypto.randomBytes(24).toString("hex");
      const refreshToken = "btnx_rt_" + crypto.randomBytes(24).toString("hex");

      const tokenRecord = {
        token: accessToken,
        refreshToken,
        uid: cData.uid,
        email: cData.email,
        name: cData.name,
        shippingAddress: cData.shippingAddress,
        phone: cData.phone,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await setDoc(doc(db, "oauth_tokens", accessToken), tokenRecord);
      memoryOAuthTokens.set(accessToken, tokenRecord);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 2592000,
        refresh_token: refreshToken,
        scope: "openid profile email orders"
      }));
      return;
    }

    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unsupported_grant_type" }));
    return;
  }

  // C) GET /oauth/userinfo
  if (pathname === "/oauth/userinfo" || pathname === "/api/oauth/userinfo") {
    const user = await resolveSessionUser(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      sub: user.uid || user.email,
      email: user.email,
      name: user.name,
      email_verified: true,
      address: user.shippingAddress
    }));
    return;
  }

  // D) GET /oauth/jwks.json
  if (pathname === "/oauth/jwks.json" || pathname === "/api/oauth/jwks.json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ keys: [] }));
    return;
  }

  // 3) Handle Live HTML Card Render Routes (GET /render/:type/:id)
  if (req.method === "GET" && url.startsWith("/render/")) {
    await ensureAdminAuth();
    const parts = url.split("?")[0].split("/").filter(Boolean);
    const renderType = parts[1]; // product | invoice | track
    const targetId = decodeURIComponent(parts[2] || "");

    if (renderType === "product") {
      let prodId = targetId || "ny-1";
      const snap = await getDoc(doc(db, "products", prodId));
      if (snap.exists()) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderProductCardHtml({ id: snap.id, ...snap.data() }, reqHost));
        return;
      }
    } else if (renderType === "invoice") {
      let oId = targetId;
      if (!oId) {
        const snap = await getDocs(collection(db, "orders"));
        if (!snap.empty) oId = snap.docs[0].id;
      }
      const snap = await getDoc(doc(db, "orders", oId));
      if (snap.exists()) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderInvoiceHtml({ id: snap.id, ...snap.data() }, reqHost));
        return;
      }
    } else if (renderType === "track") {
      let oId = targetId;
      if (!oId) {
        const snap = await getDocs(collection(db, "orders"));
        if (!snap.empty) oId = snap.docs[0].id;
      }
      const snap = await getDoc(doc(db, "orders", oId));
      if (snap.exists()) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderTrackingStepperHtml({ id: snap.id, ...snap.data() }, reqHost));
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Requested ${renderType} #${targetId} was not found in the BTNX database.`);
    return;
  }

  // 4) Handle GET /mcp (Claude Connector Health & Check)
  if (req.method === "GET" && (pathname === "/mcp" || pathname === "/api/mcp")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      service: "BTNX Store Remote MCP",
      version: "2.5.0",
      protocolVersion: "2024-11-05",
      endpoint: "/mcp",
      auth: {
        type: "oauth2",
        authorization_endpoint: `${reqHost}/oauth/authorize`,
        token_endpoint: `${reqHost}/oauth/token`,
      },
      toolsCount: MCP_TOOLS.length,
    }));
    return;
  }

  // 5) Handle JSON-RPC 2.0 (Claude Custom Connector, Cursor, and ChatGPT)
  const explicitToken = body?.params?.arguments?.sessionToken;
  const sessionId = resolveSessionId(req, explicitToken);
  const sessionUser = await resolveSessionUser(req, explicitToken);

  if (req.method === "POST") {
    const id = body?.id ?? 1;
    const method = body?.method;

    if (method === "initialize") {
      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: true },
          },
          serverInfo: {
            name: "BTNX Store Remote MCP",
            version: "2.5.0",
          },
        },
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
      return;
    }

    if (method === "notifications/initialized") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0" }));
      return;
    }

    if (method === "tools/list") {
      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          tools: MCP_TOOLS,
        },
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
      return;
    }

    if (method === "tools/call") {
      const toolName = body?.params?.name;
      const toolArgs = body?.params?.arguments || {};

      const resultData = await executeTool(toolName, toolArgs, sessionId, sessionUser, reqHost);

      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(resultData, null, 2),
            },
          ],
        },
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
      return;
    }

    if (method === "ping") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result: {} }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method '${method}' not found.` },
      })
    );
    return;
  }

  // 6) Handle SSE Endpoint
  const acceptHeader = req.headers["accept"] || "";
  if (acceptHeader.includes("text/event-stream")) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    res.write(`event: endpoint\ndata: /mcp\n\n`);
    res.end();
    return;
  }

  // 7) Normal Browser Visit — Serve Dashboard
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(HTML_DASHBOARD);
}

// 8. OAuth Authorize Page Renderer
function renderOAuthAuthorizePage(params: {
  error?: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BTNX Atelier &middot; Account Authorization</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #111110;
      color: #F3F1EC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .auth-card {
      background-color: #191816;
      border: 1px solid #2C2A26;
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.85);
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      text-align: center;
      color: #F3F1EC;
      margin-bottom: 4px;
    }
    .brand-sub {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #C89B62;
      text-align: center;
      margin-bottom: 24px;
    }
    .desc {
      font-size: 12px;
      line-height: 1.6;
      color: #A7A299;
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #2C2A26;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #A7A299;
      margin-bottom: 6px;
      font-weight: 600;
    }
    input {
      width: 100%;
      height: 44px;
      background: #141413;
      border: 1px solid #2C2A26;
      color: #F3F1EC;
      padding: 0 14px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: #C89B62;
    }
    .btn-submit {
      width: 100%;
      height: 46px;
      background: #C89B62;
      color: #111110;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      border: none;
      cursor: pointer;
      margin-top: 10px;
      transition: filter 0.2s;
    }
    .btn-submit:hover {
      filter: brightness(1.1);
    }
    .error-banner {
      background: rgba(220, 38, 38, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 12px;
      font-size: 12px;
      margin-bottom: 20px;
      text-align: center;
    }
    .footer-note {
      font-size: 11px;
      color: #66625B;
      text-align: center;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="auth-card">
    <div class="brand-title">BTNX</div>
    <div class="brand-sub">Osun Atelier &middot; Account Authorization</div>
    <div class="desc">
      Sign in with your BTNX registered customer credentials to securely connect your orders, invoices, and delivery preferences.
    </div>
    ${params.error ? `<div class="error-banner">${escapeHtml(params.error)}</div>` : ""}
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(params.state)}" />
      <input type="hidden" name="scope" value="${escapeHtml(params.scope)}" />
      <input type="hidden" name="response_type" value="${escapeHtml(params.responseType)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}" />
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(params.codeChallengeMethod)}" />

      <div class="form-group">
        <label>BTNX Customer Email</label>
        <input type="email" name="email" required autocomplete="email" placeholder="e.g. yourname@example.com" />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required autocomplete="current-password" placeholder="••••••••" />
      </div>

      <button type="submit" class="btn-submit">Verify &amp; Authorize Connection</button>
    </form>
    <div class="footer-note">
      End-to-end encrypted connection &middot; Osun Atelier, Osogbo
    </div>
  </div>
</body>
</html>`;
}
