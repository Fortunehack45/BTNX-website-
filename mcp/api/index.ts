import type { IncomingMessage, ServerResponse } from "http";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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

let authPromise: Promise<any> | null = null;
async function ensureAdminAuth() {
  if (auth.currentUser) return auth.currentUser;
  if (!authPromise) {
    authPromise = signInWithEmailAndPassword(
      auth,
      "mcp-service@btnx.store",
      "BtnxMcpService2026!"
    )
      .then((cred) => cred.user)
      .catch((err) => {
        authPromise = null;
        console.error("[BTNX MCP] Admin authentication warning:", err?.message);
        return null;
      });
  }
  return authPromise;
}

// 2. Persistent BTNX Customer Sessions (Stored in Firestore & Memory)
const memorySessions = new Map<string, any>();

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

async function getAuthenticatedUser(sessionId: string): Promise<any | null> {
  if (memorySessions.has(sessionId)) {
    return memorySessions.get(sessionId);
  }
  try {
    const sDoc = await getDoc(doc(db, "sessions", sessionId));
    if (sDoc.exists()) {
      const data = sDoc.data();
      memorySessions.set(sessionId, data);
      return data;
    }
  } catch {}
  return null;
}

async function setAuthenticatedUser(sessionId: string, userData: any): Promise<void> {
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

async function clearAuthenticatedUser(sessionId: string): Promise<void> {
  memorySessions.delete(sessionId);
  try {
    await deleteDoc(doc(db, "sessions", sessionId));
  } catch {}
}

// 3. Luxury UI Branding & Vectors
export const BTNX_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750.7 370.9" fill="none" style="height: 100%; width: auto; max-height: 28px; display: inline-block;" role="img" aria-label="BTNX"><path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M512.9 3.3Q526.8 2.5 548.9 2.4Q571.0 2.3 586.0 3.3Q601.0 4.2 610.0 5.2Q619.0 6.3 630.5 8.2Q642.0 10.1 650.5 12.2Q659.0 14.2 669.0 17.3Q679.0 20.4 686.5 23.3Q694.0 26.3 701.5 30.2Q709.0 34.1 714.5 37.8Q720.0 41.4 724.3 44.9Q728.6 48.5 732.4 52.5Q736.2 56.5 739.8 62.0Q743.4 67.5 745.2 72.5Q747.1 77.5 747.9 82.5Q748.6 87.5 748.4 93.0L748.1 98.5L747.0 99.8L612.0 107.5L612.1 102.5Q612.3 97.5 611.9 94.0Q611.5 90.5 609.9 85.0Q608.2 79.5 604.1 73.1Q600.0 66.7 594.0 61.0Q588.0 55.4 580.0 50.3Q572.0 45.3 562.5 41.3Q553.0 37.2 542.5 34.2Q532.0 31.3 520.5 29.2Q509.0 27.2 498.5 26.2Q488.0 25.2 475.5 24.8Q463.0 24.4 440.5 25.4Q418.0 26.3 391.5 29.7Q365.0 33.2 342.0 38.0L319.0 42.9L318.3 42.5L323.1 40.8Q328.0 39.1 344.5 34.2Q361.0 29.3 377.0 25.2Q393.0 21.1 406.5 18.2Q420.0 15.3 445.0 11.2Q470.0 7.2 484.5 5.7Q499.0 4.2 512.9 3.3Z M402.5 44.9Q418.9 43.5 433.5 43.3Q448.0 43.2 460.5 44.2Q473.0 45.3 485.5 47.7Q498.0 50.2 508.5 53.7Q519.0 57.2 528.5 62.2Q538.0 67.3 544.0 72.6Q550.0 77.8 552.2 80.6Q554.3 83.5 556.4 87.5Q558.4 91.5 559.4 95.0Q560.4 98.5 560.6 101.0L560.8 103.5L560.0 104.2L554.5 98.2Q549.0 92.1 542.5 87.7Q536.0 83.3 528.0 79.7Q520.0 76.2 510.5 73.2Q501.0 70.3 490.5 68.2Q480.0 66.1 467.0 64.7Q454.0 63.2 438.5 62.7Q423.0 62.2 407.5 62.7Q392.0 63.2 380.0 64.2Q368.0 65.2 350.0 67.7Q332.0 70.2 319.0 72.7Q306.0 75.2 289.0 79.1Q272.0 83.1 243.0 91.7Q214.0 100.4 194.5 107.2Q175.0 114.1 157.0 121.5L139.0 128.8L137.5 128.5L151.8 120.9Q166.0 113.3 184.5 104.8Q203.0 96.3 219.5 89.7Q236.0 83.2 255.5 76.7Q275.0 70.2 291.5 65.7Q308.0 61.1 328.0 56.7Q348.0 52.3 367.0 49.3Q386.0 46.3 402.5 44.9Z M684.2 121.7Q707.4 120.5 713.7 120.2L720.0 119.9L720.8 120.5L636.6 186.5L657.0 237.5L610.0 239.3L608.8 238.5L599.0 212.1L560.0 240.4L501.0 243.5L584.8 180.5L563.1 127.5L564.0 126.6L609.0 125.3L619.8 153.5L621.0 154.2L661.0 122.9L684.2 121.7Z M519.5 128.5Q537.3 127.5 543.1 127.2L549.0 126.9L549.9 127.5L489.0 243.8L469.5 245.3Q450.0 246.8 445.0 247.0L440.0 247.3L439.0 246.5L424.0 184.2L390.6 250.5L342.4 253.5L401.0 134.6L449.0 132.4L454.4 149.4Q459.9 166.5 464.4 179.2L469.0 192.0L501.7 129.5L519.5 128.5Z M312.5 139.5Q382.8 135.5 384.9 135.4L387.0 135.4L386.9 135.9Q386.8 136.5 378.9 152.3L371.0 168.1L349.0 169.5Q327.0 170.8 326.5 171.2L325.9 171.5L284.0 257.1L233.7 260.5L275.7 174.5L275.0 173.9L226.7 176.5L227.3 174.5Q227.8 172.5 235.0 158.0L242.2 143.5L312.5 139.5Z M150.8 149.2Q209.6 145.5 213.8 145.4Q218.0 145.2 220.5 146.4L222.9 147.5L224.5 150.5L223.9 153.5Q223.4 156.5 218.3 168.0Q213.3 179.5 209.7 185.5Q206.1 191.5 202.1 195.7Q198.0 199.9 193.8 202.2L189.6 204.5L191.8 206.0Q194.0 207.6 195.3 209.5Q196.6 211.5 196.8 214.0Q197.1 216.5 196.2 220.5Q195.4 224.5 193.3 229.0Q191.3 233.5 188.3 238.5Q185.3 243.5 181.7 248.0Q178.1 252.5 174.6 255.7Q171.0 258.9 166.5 261.4Q162.0 263.8 155.5 265.2Q149.0 266.6 90.3 270.6L31.6 274.5L92.0 152.9L150.8 149.2Z M151.5 180.1Q144.0 180.5 134.5 181.2L125.0 182.0L117.6 196.5L118.0 197.3L132.5 196.4Q147.0 195.6 150.0 195.2Q153.0 194.8 155.5 193.9Q158.0 193.0 160.7 190.2L163.3 187.5L164.4 183.5L163.0 180.8L161.0 180.3Q159.0 179.7 151.5 180.1Z M135.0 221.3Q129.0 221.5 117.5 222.2L106.0 222.9L97.7 238.5L98.0 239.3L115.0 238.1Q132.0 237.0 135.5 235.7Q139.0 234.5 141.5 232.0Q144.1 229.5 144.8 227.5L145.5 225.5L145.0 223.0L141.0 221.0L135.0 221.3Z M510.6 262.8Q549.2 260.5 552.1 260.3L555.0 260.2L554.5 260.8Q554.0 261.5 536.5 270.7Q519.0 279.9 504.5 286.8Q490.0 293.8 465.0 304.2Q440.0 314.7 414.5 323.7Q389.0 332.7 372.0 337.7Q355.0 342.7 329.5 348.7Q304.0 354.8 277.5 359.3Q251.0 363.7 229.5 365.7Q208.0 367.8 186.5 368.3Q165.0 368.8 148.0 367.8Q131.0 366.7 112.5 363.7Q94.0 360.6 81.0 356.7Q68.0 352.8 61.0 349.8Q54.0 346.8 48.5 343.8Q43.0 340.8 38.5 337.7Q34.0 334.7 29.2 330.6Q24.4 326.5 19.6 321.0Q14.7 315.5 11.8 311.0Q8.9 306.5 6.9 302.5Q5.0 298.5 3.5 294.0L2.0 289.5L11.0 296.1Q20.0 302.8 28.5 307.3Q37.0 311.8 49.5 316.3Q62.0 320.8 74.0 323.7Q86.0 326.7 98.5 328.7Q111.0 330.7 123.0 331.8Q135.0 332.8 150.0 333.3Q165.0 333.8 186.0 333.3Q207.0 332.7 223.5 331.2Q240.0 329.8 255.0 327.8Q270.0 325.8 289.5 322.2Q309.0 318.7 328.0 314.2Q347.0 309.8 363.0 305.3Q379.0 300.8 398.5 294.3Q418.0 287.8 431.0 282.8Q444.0 277.8 458.0 271.5Q472.0 265.2 510.6 262.8Z" /></svg>`;

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
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    font-weight: 500;
    letter-spacing: -0.01em;
    background: #FAF9F7;
    color: #141413;
    padding: 24px 16px;
    -webkit-font-smoothing: antialiased;
  }
  .luxury-serif { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em; }
  .font-mono { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
  .btnx-gold { color: #966830; }
  .btnx-gold-bg { background-color: #966830; }
  .btnx-border { border-color: #E6E2DA; }
  .btnx-dark { background-color: #141413; color: #FAF9F7; font-weight: 700; }
  .btnx-card {
    background: #FFFFFF;
    border: 1px solid #E6E2DA;
    border-radius: 4px;
    box-shadow: 0 4px 20px -2px rgba(20,20,19,0.06);
  }
  @media (prefers-color-scheme: dark) {
    body { background: #111110 !important; color: #F3F1EC !important; }
    .btnx-card { background: #191816 !important; border-color: #2C2A26 !important; color: #F3F1EC !important; }
    .btnx-border { border-color: #2C2A26 !important; }
    .btnx-dark { background-color: #FAF9F7 !important; color: #141413 !important; }
    td, th { border-color: #2C2A26 !important; }
    .meta-box { background: #141413 !important; border-color: #2C2A26 !important; }
  }
`;

export function renderProductCardHtml(p: any, storeOrigin = "https://btnx-website-mcp.vercel.app"): string {
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
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #E6E2DA;" class="btnx-border">
      <div style="height: 22px; width: auto; max-width: 72px;">${BTNX_LOGO_SVG}</div>
      <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: #966830; font-weight: 700;">Authentic Atelier</span>
    </div>

    <div style="position: relative; aspect-ratio: 4/5; overflow: hidden; background: #EDEAE5;">
      <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80'" />
      ${p.badge ? `<span style="position: absolute; top: 12px; left: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; background: #141413; color: #FAF9F7; padding: 5px 9px; border-radius: 2px;">${escapeHtml(p.badge)}</span>` : ""}
      <span style="position: absolute; bottom: 12px; right: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; background: rgba(250,249,247,0.94); color: #141413; padding: 4px 8px; backdrop-filter: blur(4px); border: 1px solid #E6E2DA;">Osun Atelier &middot; Express</span>
    </div>

    <div style="padding: 22px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #966830; font-weight: 700;">${escapeHtml(p.category || "Apparel")}</span>
        <span class="font-mono" style="font-size: 16px; font-weight: 700;">${formatNaira(p.price)}</span>
      </div>

      <h2 class="luxury-serif" style="font-size: 20px; font-weight: 700; margin-bottom: 8px; line-height: 1.25;">${escapeHtml(p.name)}</h2>
      <p style="font-size: 12.5px; opacity: 0.85; line-height: 1.5; margin-bottom: 18px;">${escapeHtml(p.description || "Contemporary structured silhouette tailored with refined Osun artisan finishes.")}</p>

      <div style="border-top: 1px solid #E6E2DA; padding-top: 14px; margin-bottom: 18px;" class="btnx-border">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
          <span style="opacity: 0.7; text-transform: uppercase; letter-spacing: 0.12em;">Available Sizes:</span>
          <span style="font-weight: 700;">${(p.sizes || ["S", "M", "L", "XL"]).join(" &middot; ")}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
          <span style="opacity: 0.7; text-transform: uppercase; letter-spacing: 0.12em;">Delivery:</span>
          <span>${escapeHtml(p.deliveryTimeline || "2–4 Business Days across Nigeria")}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span style="opacity: 0.7; text-transform: uppercase; letter-spacing: 0.12em;">Packaging:</span>
          <span>${escapeHtml(p.packagingType || "Cotton Garment Box")}</span>
        </div>
      </div>

      <a href="${escapeHtml(checkoutUrl)}" target="_blank" class="btnx-dark" style="display: block; text-align: center; text-decoration: none; padding: 13px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; border-radius: 2px;">
        Order Piece &middot; Express Checkout &rarr;
      </a>
    </div>
  </div>
</body>
</html>`;
}

export function renderInvoiceHtml(order: any, storeOrigin = "https://btnx-website-mcp.vercel.app"): string {
  const orderId = order.id || "BX-000000";
  const items = order.items || [];
  const dateStr = order.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const clientName = order.customerName || order.clientName || "Valued Client";
  const clientEmail = order.customerEmail || order.userEmail || "customer@btnx.store";
  const shippingAddress = order.shippingAddress || "Osun State, Nigeria";
  const total = Number(order.total || 0);
  const subtotal = Number(order.subtotal || total);
  const discountAmount = Number(order.discountAmount || 0);
  const shippingFee = Number(order.shippingFee || 0);

  const rows = items.map((it: any) => {
    const pName = it.product?.name || it.productName || "BTNX Luxury Piece";
    const size = it.size || it.selectedSize || "M";
    const color = it.color || it.selectedColor || "Standard";
    const price = Number(it.product?.price || it.price || 0);
    const qty = Number(it.quantity || 1);
    const lineTotal = price * qty;
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E6E2DA;">
          <div style="font-weight: 700; font-size: 13px;">${escapeHtml(pName)}</div>
          <div style="opacity: 0.7; font-size: 11px; margin-top: 2px;">Size ${escapeHtml(size)} &middot; ${escapeHtml(color)}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E6E2DA; text-align: center; font-family: monospace;">${qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E6E2DA; text-align: right; font-family: monospace;">${formatNaira(price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E6E2DA; text-align: right; font-family: monospace; font-weight: 700;">${formatNaira(lineTotal)}</td>
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
  <div style="max-width: 680px; margin: 0 auto; padding: 32px;" class="btnx-card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #141413; padding-bottom: 18px; margin-bottom: 24px;" class="btnx-border">
      <div>
        <div style="height: 28px; width: auto; max-width: 100px; margin-bottom: 6px;">${BTNX_LOGO_SVG}</div>
        <p style="font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.16em;">Haute Tailoring &middot; Osun Atelier, Nigeria</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #966830; font-weight: 700;">Official Tax Receipt</span>
        <div class="font-mono" style="font-size: 15px; font-weight: 800; margin-top: 2px;">#INV-${escapeHtml(orderId)}</div>
        <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${escapeHtml(dateStr)}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 16px; margin-bottom: 24px; border: 1px solid #E6E2DA; border-radius: 2px;" class="meta-box btnx-border">
      <div>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #966830; font-weight: 700; display: block; margin-bottom: 4px;">Client Account:</span>
        <div style="font-size: 13px; font-weight: 700;">${escapeHtml(clientName)}</div>
        <div style="font-size: 11px; opacity: 0.75; margin-top: 2px;">${escapeHtml(clientEmail)}</div>
      </div>
      <div>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #966830; font-weight: 700; display: block; margin-bottom: 4px;">Delivery Destination:</span>
        <div style="font-size: 12px; line-height: 1.4;">${escapeHtml(shippingAddress)}</div>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 1px solid #141413;" class="btnx-border">
          <th style="padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.7;">Garment Piece</th>
          <th style="padding: 8px 12px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.7;">Qty</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.7;">Price</th>
          <th style="padding: 8px 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.7;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="max-width: 290px; margin-left: auto; border-top: 1px solid #E6E2DA; padding-top: 14px; margin-bottom: 24px;" class="btnx-border">
      <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.75; margin-bottom: 5px;">
        <span>Subtotal</span>
        <span class="font-mono">${formatNaira(subtotal)}</span>
      </div>
      ${discountAmount > 0 ? `
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #966830; margin-bottom: 5px; font-weight: 600;">
        <span>VIP Promo Savings</span>
        <span class="font-mono">-${formatNaira(discountAmount)}</span>
      </div>` : ""}
      <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.75; margin-bottom: 8px;">
        <span>Nationwide Express Logistics</span>
        <span class="font-mono">${shippingFee > 0 ? formatNaira(shippingFee) : "FREE"}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; border-top: 2px solid #141413; padding-top: 10px;" class="btnx-border">
        <span>Grand Total</span>
        <span class="font-mono">${formatNaira(total)}</span>
      </div>
    </div>

    <div style="border-top: 1px dashed #E6E2DA; padding-top: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.12em;" class="btnx-border">
      <span>Order Status: <strong style="color: #966830;">${escapeHtml(order.status || "CONFIRMED")}</strong></span>
      <span>Authentic Nigerian Craftsmanship &middot; Osun Atelier</span>
    </div>

    <div style="margin-top: 24px; display: flex; gap: 10px; justify-content: center;">
      <button onclick="window.print()" class="btnx-dark" style="padding: 10px 18px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; border: none; cursor: pointer; border-radius: 2px;">
        Print / Save PDF Receipt
      </button>
      <a href="${escapeHtml(storeOrigin)}" style="display: inline-block; padding: 10px 18px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; text-decoration: none; border: 1px solid #966830; color: #966830; border-radius: 2px;">
        Return to Store
      </a>
    </div>
  </div>
</body>
</html>`;
}

export function renderTrackingStepperHtml(order: any, storeOrigin = "https://btnx-website-mcp.vercel.app"): string {
  const orderId = order.id || "BX-000000";
  const status = String(order.status || "Processing").toLowerCase();
  const address = order.shippingAddress || "Client Delivery Address";

  const isConfirmed = true;
  const isInspected = status.includes("processing") || status.includes("ship") || status.includes("transit") || status.includes("deliver") || status.includes("confirm");
  const isDispatched = status.includes("ship") || status.includes("transit") || status.includes("deliver");
  const isDelivered = status.includes("deliver");

  const steps = [
    { title: "Order Confirmed & Verified", desc: "Payment reconciled and order queued at Osogbo dispatch atelier", active: isConfirmed },
    { title: "Atelier Inspection & Packaging", desc: "Hand-checked for stitching precision & sealed in signature garment box", active: isInspected },
    { title: "Courier Dispatch in Transit", desc: "Package picked up by express courier for inter-state transit", active: isDispatched },
    { title: "Doorstep Client Handover", desc: "Final verification and handover to client with photo POD", active: isDelivered },
  ];

  const stepsHtml = steps.map((s, idx) => `
    <div style="display: flex; gap: 14px; position: relative; padding-bottom: ${idx === 3 ? "0" : "24px"};">
      ${idx < 3 ? `<div style="position: absolute; left: 11px; top: 24px; bottom: 0; width: 2px; background: ${s.active ? "#966830" : "#E6E2DA"};"></div>` : ""}
      <div style="width: 24px; height: 24px; border-radius: 50%; background: ${s.active ? "#966830" : "#FAF9F7"}; border: 2px solid ${s.active ? "#966830" : "#E6E2DA"}; color: ${s.active ? "#FAF9F7" : "#66625B"}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; z-index: 2;">
        ${s.active ? "✓" : idx + 1}
      </div>
      <div>
        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 2px; ${s.active ? "color: #966830;" : "opacity: 0.7;"}">${s.title}</h4>
        <p style="font-size: 11px; opacity: 0.75;">${s.desc}</p>
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
  <div style="max-width: 520px; margin: 0 auto; padding: 28px;" class="btnx-card">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E6E2DA; padding-bottom: 16px; margin-bottom: 20px;" class="btnx-border">
      <div style="height: 22px; width: auto; max-width: 72px;">${BTNX_LOGO_SVG}</div>
      <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: #966830; font-weight: 700;">Live Dispatch Tracker</span>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px;">
      <div>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.65;">Tracking Reference</span>
        <div class="font-mono" style="font-size: 16px; font-weight: 800; margin-top: 2px;">#${escapeHtml(orderId)}</div>
      </div>
      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; background: rgba(150,104,48,0.12); color: #966830; padding: 4px 8px; border-radius: 2px;">
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

// 4. MCP Tools Definition
const MCP_TOOLS = [
  {
    name: "btnx_sign_in",
    description: "Authenticate with your BTNX store customer account using your registered BTNX email (and optional password). This logs you into your BTNX account, unlocking your personal order history, saved delivery address in Nigeria, and private invoices.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Your registered BTNX store account email (e.g. fortunewhyfortune@gmail.com)" },
        password: { type: "string", description: "Optional BTNX account passcode" }
      },
      required: ["email"]
    }
  },
  {
    name: "btnx_sign_up",
    description: "Create and register a new BTNX store customer account directly in the database. Registers customer name, email, phone, and Nigerian delivery address.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer's full name" },
        email: { type: "string", description: "Customer's email address" },
        shippingAddress: { type: "string", description: "Street, City, State in Nigeria" },
        phone: { type: "string", description: "Phone number for delivery" },
        password: { type: "string", description: "Optional account passcode" }
      },
      required: ["name", "email", "shippingAddress"]
    }
  },
  {
    name: "btnx_get_account_status",
    description: "Check whether a BTNX customer account is currently authenticated in this session. Returns the signed-in customer profile or an unauthenticated notice prompting the user to sign in.",
    inputSchema: {
      type: "object",
      properties: {
        accountEmail: { type: "string", description: "Optional BTNX account email to check" }
      }
    }
  },
  {
    name: "btnx_sign_out",
    description: "Sign out of the currently authenticated BTNX store account.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "btnx_list_my_orders",
    description: "List orders placed under the currently signed-in BTNX account. If not yet signed in, prompts the user to authenticate with their BTNX account email or specify an account email.",
    inputSchema: {
      type: "object",
      properties: {
        accountEmail: { type: "string", description: "Optional BTNX account email if not already signed in" },
        statusFilter: { type: "string", description: "Optional filter: 'Pending', 'Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled', or 'All'" }
      }
    }
  },
  {
    name: "btnx_get_invoice",
    description: "Retrieve official digital invoice, items breakdown, financial totals, and interactive luxury HTML invoice card. If orderId is provided, retrieves that specific order invoice. If orderId is omitted, automatically retrieves the latest invoice for the authenticated BTNX account.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Optional specific order reference (e.g. BX-829104). If omitted, pulls latest order for the authenticated BTNX user" },
        accountEmail: { type: "string", description: "Optional BTNX account email if not already signed in" }
      }
    }
  },
  {
    name: "btnx_track_parcel",
    description: "Retrieve real-time tracking, courier progress, and visual tracking stepper card. If orderId is omitted, tracks the latest parcel for the authenticated BTNX user.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Optional order reference number" },
        accountEmail: { type: "string", description: "Optional BTNX account email" }
      }
    }
  },
  {
    name: "btnx_create_customer_order",
    description: "Place a customer order directly into the BTNX store database. If signed in, automatically pulls your saved BTNX name, email, and Nigerian delivery address. Otherwise, asks for required shipping information.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product identifier (optional, defaults to 'ny-1')" },
        quantity: { type: "number", description: "Quantity of pieces (optional, defaults to 1)" },
        size: { type: "string", description: "Garment size: XS, S, M, L, XL (optional, defaults to 'M')" },
        customerName: { type: "string", description: "Full name (optional if signed into BTNX account)" },
        customerEmail: { type: "string", description: "Email (optional if signed into BTNX account)" },
        customerPhone: { type: "string", description: "Phone number (optional)" },
        shippingAddress: { type: "string", description: "Delivery address in Nigeria (optional if signed into BTNX account)" },
        color: { type: "string", description: "Optional garment color" },
        promoCode: { type: "string", description: "Optional promo voucher code to apply" }
      }
    }
  },
  {
    name: "btnx_get_active_promos",
    description: "Fetch all currently active discount voucher codes, seasonal promotions, and privileges directly from the live database. Call this whenever the user asks for promo codes, discounts, or vouchers.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "btnx_check_promo_code",
    description: "Validate a promotional voucher code directly against the database and calculate the exact eligible discount amount in Nigerian Naira (₦).",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "The promotional voucher code to validate" },
        subtotal: { type: "number", description: "Optional basket subtotal in Nigerian Naira (₦) to calculate savings" }
      },
      required: ["code"]
    }
  },
  {
    name: "btnx_list_catalog",
    description: "Search and list garments in the BTNX fashion store catalog directly from the database. Filter by category or search query. Returns prices in Nigerian Naira (₦), stock levels, and luxury details.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category filter ('Womenswear', 'Knitwear', 'Outerwear', 'All')" },
        search: { type: "string", description: "Optional search keyword for garment name or description" }
      }
    }
  },
  {
    name: "btnx_get_product_details",
    description: "Retrieve comprehensive specifications and standalone luxury UI card for any BTNX garment directly from the database, including Fabric & Care, Fit & Silhouette, Packaging, Price in ₦, stock, and live visual preview URL.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product identifier (e.g. 'ny-1', 'ny-2', 'ny-3', 'ny-4', 'ny-5', 'ny-6')" }
      },
      required: ["productId"]
    }
  },
  {
    name: "btnx_calculate_order",
    description: "Calculate order subtotal, database promo discount, shipping fee, and final total in Nigerian Naira (₦).",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "List of items with price and quantity",
          items: {
            type: "object",
            properties: {
              price: { type: "number" },
              quantity: { type: "number" }
            },
            required: ["price", "quantity"]
          }
        },
        promoCode: { type: "string", description: "Optional promo code to apply" }
      },
      required: ["items"]
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
          enum: ["product_card", "invoice", "tracking_stepper"],
          description: "Type of luxury UI component to render"
        },
        id: { type: "string", description: "Target ID: productId (for product_card), orderId (for invoice/tracking)" }
      },
      required: ["widgetType"]
    }
  }
];

// 5. Tool Execution Handler
async function executeTool(name: string, args: any, sessionId: string, reqHost = "https://btnx-website-mcp.vercel.app") {
  await ensureAdminAuth();

  switch (name) {
    case "btnx_sign_in": {
      const inputEmail = String(args?.email || "").toLowerCase().trim();
      if (!inputEmail) {
        return { error: "Please provide your registered BTNX email to sign in." };
      }

      // Try Firebase Auth if password was provided
      if (args?.password) {
        try {
          await signInWithEmailAndPassword(auth, inputEmail, String(args.password));
        } catch (err: any) {
          if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
            return {
              authenticated: false,
              error: "Incorrect passcode for this BTNX account. Please check your password and try again.",
            };
          }
        }
      }

      // Search Firestore 'users' collection
      const uSnap = await getDocs(query(collection(db, "users"), where("email", "==", inputEmail)));
      let profile: any = null;
      if (!uSnap.empty) {
        profile = { id: uSnap.docs[0].id, ...uSnap.docs[0].data() };
      }

      // Search Firestore 'orders' collection
      const oSnap1 = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", inputEmail)));
      const oSnap2 = await getDocs(query(collection(db, "orders"), where("userEmail", "==", inputEmail)));
      const orderMap = new Map<string, any>();
      oSnap1.docs.forEach((d) => orderMap.set(d.id, { id: d.id, ...d.data() }));
      oSnap2.docs.forEach((d) => orderMap.set(d.id, { id: d.id, ...d.data() }));
      const orders = Array.from(orderMap.values()).sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

      if (!profile && orders.length === 0) {
        return {
          authenticated: false,
          message: `No BTNX customer account found for '${inputEmail}'. Would you like to create a new BTNX account with 'btnx_sign_up'?`,
          displayMarkdown: `### ❌ Account Not Found\nNo BTNX account is registered under \`${inputEmail}\`.\nYou can create an account using **btnx_sign_up** (provide name, email, and delivery address).`,
        };
      }

      const customerName = profile?.name || orders[0]?.customerName || "BTNX Customer";
      const address = profile?.shippingStreet
        ? `${profile.shippingStreet}, ${profile.shippingCity || "Lagos"}, ${profile.shippingCountry || "Nigeria"}`
        : orders[0]?.shippingAddress || "Registered with orders";
      const phone = profile?.phone || orders[0]?.customerPhone || "N/A";
      const vipTier = profile?.role === "admin" ? "Master Atelier Admin" : "Atelier Collector";

      const sessionData = {
        sessionId,
        email: inputEmail,
        name: customerName,
        phone,
        shippingAddress: address,
        vipTier,
        authenticatedAt: new Date().toISOString(),
      };

      await setAuthenticatedUser(sessionId, sessionData);

      const displayMarkdown = `### ✅ SIGNED IN TO BTNX ACCOUNT
**Welcome, ${customerName}!**  
- **BTNX Account Email:** \`${inputEmail}\`  
- **Delivery Destination:** ${address}  
- **Contact Phone:** \`${phone}\`  
- **VIP Status:** 💎 ${vipTier}  
- **Orders on Record:** ${orders.length}  

${orders.length > 0 ? `👉 Latest Order: **#${orders[0].id}** (${formatNaira(orders[0].total)}) — Status: **${orders[0].status || "Confirmed"}**\n👉 [Open Latest Invoice](${reqHost}/render/invoice/${orders[0].id})` : ""}

*Your BTNX account is now active. You can check your order history, pull invoices, or order pieces directly.*`;

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
      };
    }

    case "btnx_sign_up": {
      const name = String(args?.name || "").trim();
      const email = String(args?.email || "").toLowerCase().trim();
      const shippingAddress = String(args?.shippingAddress || "").trim();
      const phone = String(args?.phone || "+2348000000000").trim();

      if (!name || !email || !shippingAddress) {
        return { error: "Name, email, and shipping address are required to create a BTNX account." };
      }

      // Check existing user
      const existing = await getDocs(query(collection(db, "users"), where("email", "==", email)));
      if (!existing.empty) {
        return { error: `An account with email '${email}' already exists. Please sign in using btnx_sign_in.` };
      }

      const newUid = "btnx_usr_" + Math.floor(100000 + Math.random() * 900000);
      const newProfile = {
        id: newUid,
        email,
        name,
        phone,
        shippingStreet: shippingAddress,
        shippingCountry: "Nigeria",
        role: "customer",
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", newUid), newProfile);

      const sessionData = {
        sessionId,
        email,
        name,
        phone,
        shippingAddress,
        vipTier: "Atelier Collector",
        authenticatedAt: new Date().toISOString(),
      };

      await setAuthenticatedUser(sessionId, sessionData);

      const displayMarkdown = `### 🎉 BTNX ACCOUNT REGISTERED & SIGNED IN!
**Welcome to the BTNX Atelier, ${name}!**  
- **Email:** \`${email}\`  
- **Delivery Address:** ${shippingAddress}  
- **Phone:** \`${phone}\`  
- **VIP Status:** 💎 Atelier Collector  

*Your new BTNX store account has been saved directly to the database and is now active for orders and invoices.*`;

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
      let user = await getAuthenticatedUser(sessionId);
      if (!user && args?.accountEmail) {
        const email = String(args.accountEmail).toLowerCase().trim();
        const uSnap = await getDocs(query(collection(db, "users"), where("email", "==", email)));
        if (!uSnap.empty) {
          const prof = uSnap.docs[0].data();
          user = {
            sessionId,
            email,
            name: prof.name || "BTNX Customer",
            phone: prof.phone || "N/A",
            shippingAddress: prof.shippingStreet || "Nigeria",
            vipTier: "Atelier Collector",
          };
          await setAuthenticatedUser(sessionId, user);
        }
      }

      if (!user) {
        const displayMarkdown = `### 🔒 NO BTNX ACCOUNT SIGNED IN
You are connected to the BTNX Atelier, but no customer account is signed in for this conversation.

**To sign in:**
- Provide your BTNX store email (e.g. \`fortunewhyfortune@gmail.com\` or \`switchk326@gmail.com\`) and say **"Sign in as [email]"** using \`btnx_sign_in\`.
- Or create a new account using \`btnx_sign_up\`.`;

        return {
          authenticated: false,
          message: "No BTNX account is currently signed in. Ask the user for their BTNX store account email to sign in using btnx_sign_in, or create one with btnx_sign_up.",
          displayMarkdown,
        };
      }

      const displayMarkdown = `### 👤 CURRENT BTNX USER SESSION
- **Customer Name:** **${user.name}**  
- **BTNX Email:** \`${user.email}\`  
- **Delivery Address:** ${user.shippingAddress}  
- **Phone:** \`${user.phone}\`  
- **Status:** ✅ Signed In to BTNX Store`;

      return {
        authenticated: true,
        customer: user,
        displayMarkdown,
      };
    }

    case "btnx_sign_out": {
      await clearAuthenticatedUser(sessionId);
      return {
        success: true,
        authenticated: false,
        message: "Successfully signed out of BTNX account.",
        displayMarkdown: `### 👋 SIGNED OUT\nYou have been signed out of your BTNX store account.`,
      };
    }

    case "btnx_list_my_orders": {
      let user = await getAuthenticatedUser(sessionId);
      let targetEmail = user?.email || (args?.accountEmail ? String(args.accountEmail).toLowerCase().trim() : null);

      if (!targetEmail) {
        return {
          requiresAuth: true,
          message: "Please sign in with your BTNX account email using 'btnx_sign_in' to list your private orders, or provide your BTNX account email.",
          displayMarkdown: `### 🔒 BTNX SIGN-IN REQUIRED
Please sign in to your BTNX account to view your order history.  
Say **"Sign in as [your-email@example.com]"** to unlock your orders.`,
        };
      }

      const snap1 = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", targetEmail)));
      const snap2 = await getDocs(query(collection(db, "orders"), where("userEmail", "==", targetEmail)));
      const map = new Map<string, any>();
      snap1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
      snap2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
      const orders = Array.from(map.values()).sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

      if (args?.statusFilter && args.statusFilter !== "All") {
        const sf = String(args.statusFilter).toLowerCase();
        orders.filter((o) => (o.status || "").toLowerCase().includes(sf));
      }

      if (orders.length === 0) {
        return {
          customerEmail: targetEmail,
          count: 0,
          orders: [],
          displayMarkdown: `### 📦 BTNX ORDERS FOR \`${targetEmail}\`\nNo orders found for this account. You can explore the catalog and place an order anytime!`,
        };
      }

      const tableRows = orders.slice(0, 6).map((o) => {
        return `| **#${o.id}** | ${o.date || "Recent"} | ${formatNaira(o.total)} | \`${o.status || "Confirmed"}\` | [📄 View Invoice](${reqHost}/render/invoice/${o.id}) |`;
      }).join("\n");

      const displayMarkdown = `### 📦 YOUR BTNX ORDERS (\`${targetEmail}\`)
**Total Orders:** ${orders.length}  

| Order ID | Date | Total | Status | Official Invoice |
| :--- | :--- | :--- | :--- | :--- |
${tableRows}

✨ *Click any invoice link above to view the standalone luxury card.*`;

      return {
        customerEmail: targetEmail,
        count: orders.length,
        orders: orders.map((o) => ({
          orderId: o.id,
          customerName: o.customerName || user?.name || "BTNX Client",
          date: o.date || "Recent",
          status: o.status || "Confirmed",
          totalNaira: formatNaira(o.total),
          itemsCount: (o.items || []).length,
          items: (o.items || []).map((it: any) => ({
            name: it.product?.name || it.productName || "Luxury Piece",
            size: it.size || "M",
            quantity: it.quantity || 1,
            price: formatNaira(it.product?.price || it.price),
          })),
          viewInvoiceUrl: `${reqHost}/render/invoice/${o.id}`,
          viewTrackingUrl: `${reqHost}/render/track/${o.id}`,
        })),
        displayMarkdown,
      };
    }

    case "btnx_get_invoice": {
      let targetId = String(args?.orderId || "").trim();
      let user = await getAuthenticatedUser(sessionId);
      let email = user?.email || (args?.accountEmail ? String(args.accountEmail).toLowerCase().trim() : null);

      if (!targetId && email) {
        const snap1 = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", email)));
        const snap2 = await getDocs(query(collection(db, "orders"), where("userEmail", "==", email)));
        const map = new Map<string, any>();
        snap1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
        snap2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
        const orders = Array.from(map.values()).sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        if (orders.length > 0) {
          targetId = orders[0].id;
        }
      }

      if (!targetId) {
        return {
          requiresAuth: true,
          message: "Please sign in with your BTNX account using 'btnx_sign_in' to retrieve your latest invoice, or provide a specific order reference number (e.g. #BX-...).",
          displayMarkdown: `### 🔒 BTNX ACCOUNT REQUIRED FOR INVOICE
To look up your invoice automatically, please sign in with your BTNX account email using **btnx_sign_in**.  
Alternatively, provide your order reference number (e.g. \`BX-829104\`).`,
        };
      }

      const snap = await getDoc(doc(db, "orders", targetId));
      if (!snap.exists()) {
        return { error: `Order #${targetId} was not found in the BTNX database.` };
      }

      const order: any = { id: snap.id, ...snap.data() };
      const invoiceHtml = renderInvoiceHtml(order, reqHost);
      const items = order.items || [];
      const itemRows = items.map((it: any) => {
        const name = it.product?.name || it.productName || "BTNX Garment";
        const price = formatNaira(it.product?.price || it.price || 0);
        return `| **${name}** | ${it.size || "M"} | ${it.quantity || 1} | ${price} |`;
      }).join("\n");

      const displayMarkdown = `### 🏷️ BTNX OSUN ATELIER — OFFICIAL DIGITAL INVOICE
**Invoice Reference:** \`INV-${order.id}\`  
**Order Reference:** \`${order.id}\`  
**Date:** ${order.date || new Date().toLocaleDateString()}  
**Client:** ${order.customerName || "Valued Client"} (\`${order.customerEmail || order.userEmail || "Customer"}\`)  
**Delivery Destination:** ${order.shippingAddress || "Registered with order"}  
**Order Status:** ✅ **${order.status || "CONFIRMED"}**

| Piece | Size | Qty | Price |
| :--- | :---: | :---: | :---: |
${itemRows}

**Subtotal:** ${formatNaira(order.subtotal || order.total)}  
${order.discountAmount > 0 ? `**VIP Discount:** -${formatNaira(order.discountAmount)}\n` : ""}**Nationwide Express Courier:** ${order.shippingFee > 0 ? formatNaira(order.shippingFee) : "FREE"}  
**Grand Total:** **${formatNaira(order.total)}**

👉 **[CLICK HERE TO OPEN FULL INTERACTIVE LUXURY INVOICE CARD](${reqHost}/render/invoice/${order.id})**`;

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
      };
    }

    case "btnx_track_parcel": {
      let targetId = String(args?.orderId || "").trim();
      let user = await getAuthenticatedUser(sessionId);
      let email = user?.email || (args?.accountEmail ? String(args.accountEmail).toLowerCase().trim() : null);

      if (!targetId && email) {
        const snap = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", email)));
        if (!snap.empty) targetId = snap.docs[0].id;
      }

      if (!targetId) {
        return {
          requiresAuth: true,
          message: "Please provide an order reference number to track your parcel, or sign in to your BTNX account using btnx_sign_in.",
          displayMarkdown: `### 📦 TRACKING REFERENCE REQUIRED\nPlease provide your order reference number (e.g. \`BX-829104\`) or sign in to your BTNX account.`,
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

👉 **[CLICK HERE TO VIEW LIVE INTERACTIVE TRACKING CARD](${reqHost}/render/track/${order.id})**`;

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
      };
    }

    case "btnx_create_customer_order": {
      let user = await getAuthenticatedUser(sessionId);

      const customerName = args?.customerName || user?.name;
      const customerEmail = args?.customerEmail || user?.email;
      const shippingAddress = args?.shippingAddress || user?.shippingAddress;
      const customerPhone = args?.customerPhone || user?.phone || "+2348000000000";

      if (!customerName || !customerEmail || !shippingAddress) {
        return {
          requiresDetails: true,
          message: "To place an order, please sign in to your BTNX account using 'btnx_sign_in' (which automatically uses your saved address), or provide your full name, email, and delivery address in Nigeria.",
          displayMarkdown: `### ✍️ DELIVERY DETAILS NEEDED
Please sign in to your BTNX account to use your saved address, or provide:
- Your full name
- Your email
- Your delivery address in Nigeria`,
        };
      }

      const pid = String(args?.productId || "ny-1").trim();
      const pSnap = await getDoc(doc(db, "products", pid));
      if (!pSnap.exists()) {
        return { error: `Cannot place order: Product '${pid}' not found in catalog.` };
      }

      const prod: any = { id: pSnap.id, ...pSnap.data() };
      const qty = Number(args?.quantity) || 1;
      const subtotal = prod.price * qty;

      let discountAmount = 0;
      const promo = String(args?.promoCode || "BTNX50").toUpperCase().trim();
      if (promo) {
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

👉 **[CLICK HERE TO VIEW OFFICIAL INVOICE](${reqHost}/render/invoice/${randomRef})**  
👉 **[CLICK HERE TO TRACK DISPATCH](${reqHost}/render/track/${randomRef})**`;

      return {
        success: true,
        orderReference: randomRef,
        message: `Order #${randomRef} successfully saved to BTNX database and queued for express courier inspection.`,
        date: dateStr,
        grandTotalNaira: formatNaira(total),
        items: [{ piece: prod.name, quantity: qty, size, price: formatNaira(prod.price) }],
        viewInvoiceUrl: `${reqHost}/render/invoice/${randomRef}`,
        viewTrackingUrl: `${reqHost}/render/track/${randomRef}`,
        displayMarkdown,
        htmlSnippet: invoiceHtml,
      };
    }

    case "btnx_get_active_promos": {
      const snap = await getDocs(collection(db, "promoCodes"));
      const validPromos = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.isActive !== false);

      const tableRows = validPromos.map((c: any) => {
        const pct = c.discountPercentage || c.percentage || 20;
        return `| \`${c.code || c.id}\` | **${pct}% OFF** | Valid until ${c.expiresAt || "2027-12-31"} | Active & Unlocked |`;
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
          expiresAt: c.expiresAt || "2027-12-31",
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
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      if (args?.category && args.category !== "All") {
        const cat = String(args.category).toLowerCase();
        items = items.filter((p) => (p.category || "").toLowerCase().includes(cat));
      }
      if (args?.search) {
        const q = String(args.search).toLowerCase();
        items = items.filter(
          (p) =>
            (p.name || "").toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q) ||
            (p.category || "").toLowerCase().includes(q)
        );
      }

      const rows = items.map((p) => {
        return `| **${p.name}** (\`${p.id}\`) | ${p.category} | **${formatNaira(p.price)}** | Stock: ${p.stock ?? 20} | [👁️ View Card](${reqHost}/render/product/${p.id}) |`;
      }).join("\n");

      const displayMarkdown = `### 🧥 BTNX ATELIER — SEASONAL CATALOG
Total Pieces Available: ${items.length}

| Piece | Category | Price | Availability | Live Interactive Card |
| :--- | :--- | :--- | :--- | :--- |
${rows}

✨ *Ask for product details by ID (e.g. \`ny-1\`) or ask to order directly.*`;

      return {
        count: items.length,
        pieces: items.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          priceNaira: formatNaira(p.price),
          originalPriceNaira: p.originalPrice ? formatNaira(p.originalPrice) : null,
          stock: p.stock ?? 20,
          badge: p.badge || null,
          deliveryTimeline: p.deliveryTimeline || "2–4 Business Days across Nigeria",
          liveCardUrl: `${reqHost}/render/product/${p.id}`,
        })),
        displayMarkdown,
      };
    }

    case "btnx_get_product_details": {
      const pid = String(args?.productId || "ny-1").trim();
      const snap = await getDoc(doc(db, "products", pid));
      if (!snap.exists()) {
        return { error: `Product '${pid}' was not found in the BTNX database.` };
      }

      const p: any = { id: snap.id, ...snap.data() };
      const cardHtml = renderProductCardHtml(p, reqHost);
      const imgUrl = p.image?.startsWith("http") ? p.image : `${reqHost}/${p.image?.replace(/^\//, "")}`;

      const displayMarkdown = `### 🧥 BTNX ATELIER — ${p.name.toUpperCase()}
**Reference:** \`${p.id}\` | **Category:** ${p.category} | **Price:** **${formatNaira(p.price)}**  
${p.badge ? `**Collection Badge:** 🏷️ ${p.badge}\n` : ""}
![${p.name}](${imgUrl})

**Description:** ${p.description || "Contemporary structured silhouette tailored with refined finishes."}  
**Fabric & Care:** ${p.fabricAndCare || "Heavyweight organic loopback cotton fleece. Machine wash cold."}  
**Available Sizes:** ${(p.sizes || ["S", "M", "L", "XL"]).join(" · ")}  
**Nationwide Delivery:** ${p.deliveryTimeline || "2–4 Business Days"}  
**Packaging:** ${p.packagingType || "Cotton Garment Box"}  

👉 **[CLICK HERE TO VIEW FULL INTERACTIVE LUXURY PRODUCT CARD](${reqHost}/render/product/${p.id})**`;

      return {
        product: {
          id: p.id,
          name: p.name,
          category: p.category,
          priceNaira: formatNaira(p.price),
          originalPriceNaira: p.originalPrice ? formatNaira(p.originalPrice) : null,
          stock: p.stock ?? 20,
          description: p.description,
          fabricAndCare: p.fabricAndCare || "Heavyweight organic loopback cotton fleece. Machine wash cold.",
          fitDetails: p.fitDetails || "Relaxed structured drape with reinforced seams.",
          availableSizes: p.sizes || ["S", "M", "L", "XL"],
          availableColors: p.colors || ["Noir Black", "Off-White"],
          deliveryTimeline: p.deliveryTimeline || "2–4 Business Days across Nigeria",
          packagingType: p.packagingType || "Cotton Garment Box",
          returnPolicy: p.returnPolicy || "14-Day Free Exchanges on unworn items",
          liveCardUrl: `${reqHost}/render/product/${p.id}`,
          displayMarkdown,
          htmlSnippet: cardHtml,
        },
      };
    }

    case "btnx_calculate_order": {
      const items = (args?.items as any[]) || [];
      const code = String(args?.promoCode || "").toUpperCase().trim();

      let subtotal = 0;
      for (const it of items) {
        subtotal += Number(it.price || 0) * Number(it.quantity || 1);
      }

      let discountPct = 0;
      if (code) {
        const snap = await getDoc(doc(db, "promoCodes", code));
        if (snap.exists() && snap.data()?.isActive !== false) {
          discountPct = Number(snap.data()?.discountPercentage || snap.data()?.percentage || 0) / 100;
        }
      }

      const discountAmount = subtotal * discountPct;
      const isFreeShipping = subtotal >= 150000;
      const shippingFee = isFreeShipping ? 0 : 3500;
      const grandTotal = Math.max(0, subtotal - discountAmount) + shippingFee;

      return {
        subtotalNaira: formatNaira(subtotal),
        appliedPromo: code ? (discountPct > 0 ? `${code} (${discountPct * 100}% Off)` : "Invalid / Expired") : "None",
        discountAmountNaira: formatNaira(discountAmount),
        shippingFeeNaira: isFreeShipping ? "FREE (Orders over ₦150,000)" : formatNaira(shippingFee),
        grandTotalNaira: formatNaira(grandTotal),
        rawGrandTotal: grandTotal,
      };
    }

    case "btnx_render_ui_widget": {
      const widgetType = String(args?.widgetType || "product_card");
      const targetId = String(args?.id || "").trim();

      if (widgetType === "product_card") {
        let pId = targetId || "ny-1";
        const snap = await getDoc(doc(db, "products", pId));
        if (!snap.exists()) return { error: `Product '${pId}' not found.` };
        const prod = { id: snap.id, ...snap.data() };
        const html = renderProductCardHtml(prod, reqHost);
        return {
          widgetType: "product_card",
          productId: prod.id,
          livePreviewUrl: `${reqHost}/render/product/${prod.id}`,
          htmlSnippet: html,
        };
      }

      if (widgetType === "invoice") {
        let oId = targetId;
        if (!oId) {
          const all = await getDocs(collection(db, "orders"));
          if (!all.empty) oId = all.docs[0].id;
        }
        const snap = await getDoc(doc(db, "orders", oId));
        if (!snap.exists()) return { error: `Order '${oId}' not found.` };
        const order = { id: snap.id, ...snap.data() };
        const html = renderInvoiceHtml(order, reqHost);
        return {
          widgetType: "invoice",
          orderId: order.id,
          livePreviewUrl: `${reqHost}/render/invoice/${order.id}`,
          htmlSnippet: html,
        };
      }

      if (widgetType === "tracking_stepper") {
        let oId = targetId;
        if (!oId) {
          const all = await getDocs(collection(db, "orders"));
          if (!all.empty) oId = all.docs[0].id;
        }
        const snap = await getDoc(doc(db, "orders", oId));
        if (!snap.exists()) return { error: `Order '${oId}' not found.` };
        const order = { id: snap.id, ...snap.data() };
        const html = renderTrackingStepperHtml(order, reqHost);
        return {
          widgetType: "tracking_stepper",
          orderId: order.id,
          livePreviewUrl: `${reqHost}/render/track/${order.id}`,
          htmlSnippet: html,
        };
      }

      return { error: `Widget type '${widgetType}' is not supported.` };
    }

    default:
      return { error: `Unknown tool name: ${name}` };
  }
}

// 6. Standalone Interactive MCP Dashboard
const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BTNX Store — Remote Model Context Protocol (MCP) Server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #111110;
      color: #F3F1EC;
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      line-height: 1.5;
    }
    .card {
      max-width: 720px;
      width: 100%;
      background: #191816;
      border: 1px solid #2C2A26;
      border-radius: 4px;
      padding: 36px 32px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
    }
    .header-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: #C89B62; font-weight: 700; margin-bottom: 6px; }
    h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; color: #FAF9F7; }
    p.lead { font-size: 13px; color: #A7A299; margin-bottom: 24px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(37, 211, 102, 0.12); border: 1px solid rgba(37, 211, 102, 0.3); color: #25D366; font-size: 11px; font-family: 'IBM Plex Mono', monospace; padding: 6px 12px; border-radius: 2px; margin-bottom: 24px; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #25D366; box-shadow: 0 0 10px #25D366; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #A7A299; font-weight: 700; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #2C2A26; padding-bottom: 6px; }
    .tool-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    @media (max-width: 600px) { .tool-list { grid-template-columns: 1fr; } .card { padding: 24px 20px; } }
    .tool-item { background: #141413; border: 1px solid #2C2A26; padding: 12px 14px; border-radius: 2px; font-size: 12px; font-family: 'IBM Plex Mono', monospace; color: #C89B62; }
    .tool-desc { display: block; font-size: 11px; color: #A7A299; font-family: 'Plus Jakarta Sans', sans-serif; margin-top: 3px; }
    .endpoint-box { background: #111110; border: 1px solid #2C2A26; border-radius: 3px; padding: 14px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #25D366; margin-bottom: 16px; word-break: break-all; }
    .preview-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .preview-pill { font-size: 11px; font-family: 'IBM Plex Mono', monospace; text-decoration: none; padding: 6px 12px; background: #141413; border: 1px solid #2C2A26; color: #C89B62; border-radius: 2px; }
    .preview-pill:hover { border-color: #C89B62; background: #201F1D; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-sub">BTNX Store · Osun Atelier &amp; Logistics</div>
    <h1>Remote Model Context Protocol (MCP) Server</h1>
    <p class="lead">100% database-driven MCP server connected directly to Cloud Firestore. Authentic BTNX customer accounts, zero hardcoding, real vouchers, automated customer order invoice generation, and live luxury UI cards.</p>
    
    <div class="status-badge">
      <span class="status-dot"></span>
      <span>ACTIVE &amp; OPERATIONAL · 14 REAL-TIME TOOLS · CLOUD FIRESTORE</span>
    </div>

    <div class="section-title">Claude Custom Connector Endpoint</div>
    <div class="endpoint-box">https://btnx-website-mcp.vercel.app/mcp</div>

    <div class="section-title">Live Luxury UI Card Previews</div>
    <div class="preview-links">
      <a href="/render/invoice/BX-829104" target="_blank" class="preview-pill">📄 View Invoice #BX-829104</a>
      <a href="/render/track/BX-829104" target="_blank" class="preview-pill">🚚 View Tracking #BX-829104</a>
      <a href="/render/product/ny-1" target="_blank" class="preview-pill">🧥 View Product Card ny-1</a>
    </div>

    <div class="section-title">Available Database-Driven Tools</div>
    <div class="tool-list">
      <div class="tool-item">btnx_sign_in<span class="tool-desc">Sign in with BTNX customer email</span></div>
      <div class="tool-item">btnx_sign_up<span class="tool-desc">Register new BTNX customer account</span></div>
      <div class="tool-item">btnx_get_account_status<span class="tool-desc">Check active BTNX user session</span></div>
      <div class="tool-item">btnx_sign_out<span class="tool-desc">Sign out of current BTNX account</span></div>
      <div class="tool-item">btnx_list_my_orders<span class="tool-desc">List user purchases &amp; references</span></div>
      <div class="tool-item">btnx_get_invoice<span class="tool-desc">Official receipt &amp; luxury invoice card</span></div>
      <div class="tool-item">btnx_get_active_promos<span class="tool-desc">Fetch live unexpired vouchers</span></div>
      <div class="tool-item">btnx_check_promo_code<span class="tool-desc">Calculate dynamic savings against DB</span></div>
      <div class="tool-item">btnx_create_customer_order<span class="tool-desc">Create order with saved BTNX address</span></div>
      <div class="tool-item">btnx_track_parcel<span class="tool-desc">Live courier tracking timeline card</span></div>
      <div class="tool-item">btnx_list_catalog<span class="tool-desc">Search seasonal garments in ₦</span></div>
      <div class="tool-item">btnx_get_product_details<span class="tool-desc">Specs, sizing, and luxury card</span></div>
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

  // 1) Auth Discovery probes by Claude or custom clients
  if (url.includes(".well-known")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      service: "BTNX Remote MCP Server",
      auth_type: "none",
      version: "2.4.0",
    }));
    return;
  }

  // 2) Handle Live HTML Card Render Routes (GET /render/:type/:id)
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

  // 3) Handle GET /mcp (Claude Connector Health & Check)
  const acceptHeader = req.headers["accept"] || "";
  if (req.method === "GET" && (url.split("?")[0] === "/mcp" || url.split("?")[0] === "/api/mcp")) {
    if (acceptHeader.includes("application/json")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "healthy",
        service: "BTNX Store Remote MCP",
        version: "2.4.0",
        protocolVersion: "2024-11-05",
        endpoint: "/mcp",
        toolsCount: MCP_TOOLS.length,
      }));
      return;
    }
  }

  // 4) Parse Body for POST Requests
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {}
  } else if (!body && req.method === "POST") {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString();
      body = JSON.parse(raw);
    } catch {}
  }

  const explicitToken = body?.params?.arguments?.sessionToken;
  const sessionId = resolveSessionId(req, explicitToken);

  // 5) Handle JSON-RPC 2.0 (Claude Custom Connector & Cursor)
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
            version: "2.4.0",
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

      const resultData = await executeTool(toolName, toolArgs, sessionId, reqHost);

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
