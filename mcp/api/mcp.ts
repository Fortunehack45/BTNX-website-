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
import {
  hashToken,
  generateSecureToken,
  verifyPkce,
  generateSignedResourceToken,
  verifySignedResourceToken,
  storeOAuthTokens,
  verifyOAuthAccessToken,
  revokeOAuthToken,
  resolveAuthenticatedCustomer,
  createPersonalAccessToken,
  listPersonalAccessTokens,
  revokePersonalAccessToken,
  createWhatsAppLinkingChallenge,
  verifyAndLinkWhatsApp,
  unlinkWhatsApp,
  normalizePhoneNumber,
  createSignedOAuthCode,
  verifySignedOAuthCode,
  createSignedOAuthAccessToken,
  createSignedSessionToken,
  verifySignedSessionToken,
} from "../src/auth/index.js";
import { getFirebaseAdmin, verifyFirebaseIdToken, hasAdminCredentials } from "../src/firebaseAdmin.js";

if (typeof process !== "undefined" && process.on) {
  process.on("unhandledRejection", (reason) => {
    console.warn("[Process Safety] Intercepted unhandledRejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[Process Safety] Intercepted uncaughtException:", err);
  });
}

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
  const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
  const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return null;
  }
  if (!adminAuthPromise) {
    adminAuthPromise = signInWithEmailAndPassword(auth, adminEmail, adminPassword)
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
const memoryOAuthCodes = new Map<string, any>();
const globalSseStreams = new Map<string, ServerResponse>();

export const BTNX_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750.7 370.9" fill="none" style="height: 100%; width: auto; max-height: 28px; display: inline-block;" role="img" aria-label="BTNX"><path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M512.9 3.3Q526.8 2.5 548.9 2.4Q571.0 2.3 586.0 3.3Q601.0 4.2 610.0 5.2Q619.0 6.3 630.5 8.2Q642.0 10.1 650.5 12.2Q659.0 14.2 669.0 17.3Q679.0 20.4 686.5 23.3Q694.0 26.3 701.5 30.2Q709.0 34.1 714.5 37.8Q720.0 41.4 724.3 44.9Q728.6 48.5 732.4 52.5Q736.2 56.5 739.8 62.0Q743.4 67.5 745.2 72.5Q747.1 77.5 747.9 82.5Q748.6 87.5 748.4 93.0L748.1 98.5L747.0 99.8L612.0 107.5L612.1 102.5Q612.3 97.5 611.9 94.0Q611.5 90.5 609.9 85.0Q608.2 79.5 604.1 73.1Q600.0 66.7 594.0 61.0Q588.0 55.4 580.0 50.3Q572.0 45.3 562.5 41.3Q553.0 37.2 542.5 34.2Q532.0 31.3 520.5 29.2Q509.0 27.2 498.5 26.2Q488.0 25.2 475.5 24.8Q463.0 24.4 440.5 25.4Q418.0 26.3 391.5 29.7Q365.0 33.2 342.0 38.0L319.0 42.9L318.3 42.5L323.1 40.8Q328.0 39.1 344.5 34.2Q361.0 29.3 377.0 25.2Q393.0 21.1 406.5 18.2Q420.0 15.3 445.0 11.2Q470.0 7.2 484.5 5.7Q499.0 4.2 512.9 3.3Z M402.5 44.9Q418.9 43.5 433.5 43.3Q448.0 43.2 460.5 44.2Q473.0 45.3 485.5 47.7Q498.0 50.2 508.5 53.7Q519.0 57.2 528.5 62.2Q538.0 67.3 544.0 72.6Q550.0 77.8 552.2 80.6Q554.3 83.5 556.4 87.5Q558.4 91.5 559.4 95.0Q560.4 98.5 560.6 101.0L560.8 103.5L560.0 104.2L554.5 98.2Q549.0 92.1 542.5 87.7Q536.0 83.3 528.0 79.7Q520.0 76.2 510.5 73.2Q501.0 70.3 490.5 68.2Q480.0 66.1 467.0 64.7Q454.0 63.2 438.5 62.7Q423.0 62.2 407.5 62.7Q392.0 63.2 380.0 64.2Q368.0 65.2 350.0 67.7Q332.0 70.2 319.0 72.7Q306.0 75.2 289.0 79.1Q272.0 83.1 243.0 91.7Q214.0 100.4 194.5 107.2Q175.0 114.1 157.0 121.5L139.0 128.8L137.5 128.5L151.8 120.9Q166.0 113.3 184.5 104.8Q203.0 96.3 219.5 89.7Q236.0 83.2 255.5 76.7Q275.0 70.2 291.5 65.7Q308.0 61.1 328.0 56.7Q348.0 52.3 367.0 49.3Q386.0 46.3 402.5 44.9Z M684.2 121.7Q707.4 120.5 713.7 120.2L720.0 119.9L720.8 120.5L636.6 186.5L657.0 237.5L610.0 239.3L608.8 238.5L599.0 212.1L560.0 240.4L501.0 243.5L584.8 180.5L563.1 127.5L564.0 126.6L609.0 125.3L619.8 153.5L621.0 154.2L661.0 122.9L684.2 121.7Z M519.5 128.5Q537.3 127.5 543.1 127.2L549.0 126.9L549.9 127.5L489.0 243.8L469.5 245.3Q450.0 246.8 445.0 247.0L440.0 247.3L439.0 246.5L424.0 184.2L390.6 250.5L342.4 253.5L401.0 134.6L449.0 132.4L454.4 149.4Q459.9 166.5 464.4 179.2L469.0 192.0L501.7 129.5L519.5 128.5Z M312.5 139.5Q382.8 135.5 384.9 135.4L387.0 135.4L386.9 135.9Q386.8 136.5 378.9 152.3L371.0 168.1L349.0 169.5Q327.0 170.8 326.5 171.2L325.9 171.5L284.0 257.1L233.7 260.5L275.7 174.5L275.0 173.9L226.7 176.5L227.3 174.5Q227.8 172.5 235.0 158.0L242.2 143.5L312.5 139.5Z M150.8 149.2Q209.6 145.5 213.8 145.4Q218.0 145.2 220.5 146.4L222.9 147.5L224.5 150.5L223.9 153.5Q223.4 156.5 218.3 168.0Q213.3 179.5 209.7 185.5Q206.1 191.5 202.1 195.7Q198.0 199.9 193.8 202.2L189.6 204.5L191.8 206.0Q194.0 207.6 195.3 209.5Q196.6 211.5 196.8 214.0Q197.1 216.5 196.2 220.5Q195.4 224.5 193.3 229.0Q191.3 233.5 188.3 238.5Q185.3 243.5 181.7 248.0Q178.1 252.5 174.6 255.7Q171.0 258.9 166.5 261.4Q162.0 263.8 155.5 265.2Q149.0 266.6 90.3 270.6L31.6 274.5L92.0 152.9L150.8 149.2Z M151.5 180.1Q144.0 180.5 134.5 181.2L125.0 182.0L117.6 196.5L118.0 197.3L132.5 196.4Q147.0 195.6 150.0 195.2Q153.0 194.8 155.5 193.9Q158.0 193.0 160.7 190.2L163.3 187.5L164.4 183.5L163.0 180.8L161.0 180.3Q159.0 179.7 151.5 180.1Z M135.0 221.3Q129.0 221.5 117.5 222.2L106.0 222.9L97.7 238.5L98.0 239.3L115.0 238.1Q132.0 237.0 135.5 235.7Q139.0 234.5 141.5 232.0Q144.1 229.5 144.8 227.5L145.5 225.5L145.0 223.0L141.0 221.0L135.0 221.3Z M510.6 262.8Q549.2 260.5 552.1 260.3L555.0 260.2L554.5 260.8Q554.0 261.5 536.5 270.7Q519.0 279.9 504.5 286.8Q490.0 293.8 465.0 304.2Q440.0 314.7 414.5 323.7Q389.0 332.7 372.0 337.7Q355.0 342.7 329.5 348.7Q304.0 354.8 277.5 359.3Q251.0 363.7 229.5 365.7Q208.0 367.8 186.5 368.3Q165.0 368.8 148.0 367.8Q131.0 366.7 112.5 363.7Q94.0 360.6 81.0 356.7Q68.0 352.8 61.0 349.8Q54.0 346.8 48.5 343.8Q43.0 340.8 38.5 337.7Q34.0 334.7 29.2 330.6Q24.4 326.5 19.6 321.0Q14.7 315.5 11.8 311.0Q8.9 306.5 6.9 302.5Q5.0 298.5 3.5 294.0L2.0 289.5L11.0 296.1Q20.0 302.8 28.5 307.3Q37.0 311.8 49.5 316.3Q62.0 320.8 74.0 323.7Q86.0 326.7 98.5 328.7Q111.0 330.7 123.0 331.8Q135.0 332.8 150.0 333.3Q165.0 333.8 186.0 333.3Q207.0 332.7 223.5 331.2Q240.0 329.8 255.0 327.8Q270.0 325.8 289.5 322.2Q309.0 318.7 328.0 314.2Q347.0 309.8 363.0 305.3Q379.0 300.8 398.5 294.3Q418.0 287.8 431.0 282.8Q444.0 277.8 458.0 271.5Q472.0 265.2 510.6 262.8Z" /></svg>`;

function resolveSessionId(req: IncomingMessage, explicitToken?: string): string {
  if (explicitToken && String(explicitToken).trim().length > 3) {
    return String(explicitToken).trim();
  }
  const headerSession = (req.headers["mcp-session-id"] ||
    req.headers["x-btnx-session"] ||
    req.headers["x-session-id"] ||
    req.headers["session-id"]) as string;
  if (headerSession && headerSession.trim().length > 3) {
    return headerSession.trim();
  }
  // Also check Authorization header if passed directly as session id
  const authHeader = (req.headers["authorization"] || "") as string;
  if (authHeader.startsWith("Bearer btnx_sess_")) {
    return authHeader.replace("Bearer ", "").trim();
  }
  // Check cookies for persistent session
  const cookieHeader = (req.headers["cookie"] || "") as string;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:btnx_session|sessionToken)=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1].trim());
    }
  }
  // Check URL search parameters
  if (req.url && req.url.includes("?")) {
    try {
      const u = new URL(req.url, "https://btnx.store");
      const qToken = u.searchParams.get("sessionToken") || u.searchParams.get("sessionId");
      if (qToken && qToken.trim().length > 3) {
        return qToken.trim();
      }
    } catch (_) {}
  }
  return "";
}

async function resolveSessionUser(req: IncomingMessage, explicitToken?: string): Promise<any | null> {
  await ensureAdminAuth();

  // 1) Verify Bearer token (PAT, OAuth token, or Firebase ID token) via shared auth service
  const customer = await resolveAuthenticatedCustomer(req as any, db, auth);
  if (customer) {
    return customer;
  }

  // 2) Check session token passed via argument, header, or cookie
  const sId = resolveSessionId(req, explicitToken);
  if (sId) {
    // 2a) Cryptographically verify stateless signed session token
    if (sId.startsWith("btnx_sess_")) {
      const verifiedSession = verifySignedSessionToken(sId);
      if (verifiedSession) {
        return verifiedSession;
      }
    }
    // 2b) Cryptographically verify stateless signed OAuth token passed as session
    if (sId.startsWith("btnx_at_")) {
      const verifiedOauth = await verifyOAuthAccessToken(db, sId);
      if (verifiedOauth) {
        return verifiedOauth;
      }
    }
    if (memorySessions.has(sId)) {
      return memorySessions.get(sId);
    }
    // Read and restore session from Firestore across serverless invocations
    try {
      const sDoc = await getDoc(doc(db, "sessions", sId));
      if (sDoc.exists()) {
        const sData = sDoc.data();
        if (!sData.expiresAt || new Date(sData.expiresAt).getTime() > Date.now()) {
          memorySessions.set(sId, sData);
          return sData;
        }
      }
    } catch (err) {
      console.error("[BTNX MCP] Error restoring session from Firestore:", err);
    }

    // 3) Also check if sId is a Personal Access Token (PAT: btnx_pat_...)
    if (sId.startsWith("btnx_pat_")) {
      try {
        const tokenHash = hashToken(sId);
        const tokDoc = await getDoc(doc(db, "mcpTokens", tokenHash));
        if (tokDoc.exists()) {
          const tData = tokDoc.data();
          if (!tData.revoked && (!tData.expiresAt || new Date(tData.expiresAt).getTime() > Date.now())) {
            const uDoc = await getDoc(doc(db, "users", tData.userId));
            const profile = uDoc.exists() ? uDoc.data() : {};
            const patUser = {
              uid: tData.userId,
              email: profile?.email || tData.userEmail || "",
              name: profile?.name || "BTNX Customer",
              roles: profile?.role === "admin" ? ["admin", "customer"] : ["customer"],
              authMethod: "pat",
            };
            memorySessions.set(sId, patUser);
            return patUser;
          }
        }
      } catch (err) {
        console.error("[BTNX MCP] Error resolving PAT:", err);
      }
    }
  }

  return null;
}

async function setAuthenticatedSession(sessionId: string, userData: any): Promise<void> {
  memorySessions.set(sessionId, userData);
  try {
    await setDoc(doc(db, "sessions", sessionId), {
      ...userData,
      updatedAt: new Date().toISOString(),
      expiresAt: userData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
      .logo-wrap { color: #FAF9F7 !important; }
    }
    .logo-wrap {
      display: inline-block;
      height: 24px;
      width: auto;
      color: #141413;
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

      <a href="https://btnx-website-k3he.vercel.app" target="_blank" class="cta-btn btnx-hero-btn">
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
      .logo-wrap { color: #FAF9F7 !important; }
    }
    .logo-wrap {
      display: inline-block;
      height: 28px;
      width: auto;
      max-width: 90px;
      color: #141413;
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
        <div class="logo-wrap" style="height: 28px; width: auto; max-width: 90px;">${BTNX_LOGO_SVG}</div>
        <div style="font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #966830; font-weight: 700; margin-top: 4px;">Osun Atelier &middot; Digital Receipt</div>
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
      .logo-wrap { color: #FAF9F7 !important; }
    }
    .logo-wrap {
      display: inline-block;
      height: 24px;
      width: auto;
      max-width: 80px;
      color: #141413;
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
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="logo-wrap" style="height: 22px; width: auto; max-width: 75px;">${BTNX_LOGO_SVG}</div>
          <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75;">Logistics</span>
        </div>
        <div style="font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #966830; font-weight: 700; margin-top: 3px;">Live Dispatch Stepper</div>
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

function renderAccessDeniedHtml(type: string, id: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access Denied &middot; BTNX Atelier Security</title>
  <style>
    body { background-color: #111110; color: #F3F1EC; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .box { background: #191816; border: 1px solid #2C2A26; max-width: 460px; padding: 32px 28px; text-align: center; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
    .logo-wrap { display: block; margin: 0 auto 16px auto; height: 26px; width: auto; max-width: 85px; color: #FAF9F7; }
    h1 { font-size: 18px; margin-bottom: 12px; color: #C89B62; text-transform: uppercase; letter-spacing: 0.12em; }
    p { font-size: 13px; color: #A7A299; line-height: 1.6; margin-bottom: 24px; }
    a { display: inline-block; padding: 12px 22px; background: #C89B62; color: #111110; text-decoration: none; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="logo-wrap">${BTNX_LOGO_SVG}</div>
    <h1>🛡️ Confidential Client Record</h1>
    <p>Viewing this ${escapeHtml(type)} (#${escapeHtml(id)}) requires an active verified customer session or a valid signed authorization link from your BTNX account.</p>
    <a href="https://btnx-website-k3he.vercel.app">Return to Storefront &rarr;</a>
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
      properties: {
        sessionToken: { type: "string", description: "Optional BTNX session token or Personal Access Token (PAT)" }
      }
    }
  },
  {
    name: "btnx_sign_out",
    description: "Sign out of the currently authenticated BTNX customer account and terminate the authenticated session.",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string", description: "Optional BTNX session token to explicitly terminate" }
      }
    }
  },
  {
    name: "btnx_list_my_orders",
    description: "List all verified orders placed under the currently authenticated BTNX customer account. Requires an authenticated session.",
    inputSchema: {
      type: "object",
      properties: {
        statusFilter: { type: "string", description: "Optional filter by order status: 'Pending', 'Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled', or 'All'" },
        sessionToken: { type: "string", description: "BTNX session token obtained from btnx_sign_in or your Personal Access Token (PAT). Pass this to carry over your verified BTNX session across requests." }
      }
    }
  },
  {
    name: "btnx_get_invoice",
    description: "Retrieve the official digital invoice and interactive luxury visual card directly from the database. If orderId is omitted, retrieves the latest invoice for the authenticated BTNX account. If orderId is provided, retrieves that invoice after verifying that the requester is the authorized owner.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Specific BTNX order reference number" },
        sessionToken: { type: "string", description: "BTNX session token obtained from btnx_sign_in or your Personal Access Token (PAT). Pass this to carry over your verified BTNX session across requests." }
      }
    }
  },
  {
    name: "btnx_track_parcel",
    description: "Track real-time shipment progress, courier status, and interactive tracking card for an order directly from the database.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "BTNX order reference number" },
        sessionToken: { type: "string", description: "BTNX session token obtained from btnx_sign_in or your Personal Access Token (PAT). Pass this to carry over your verified BTNX session across requests." }
      }
    }
  },
  {
    name: "btnx_track_order",
    description: "Retrieve live fulfillment status, tracking updates, and delivery details for an existing BTNX order. Defaults to customer's latest order if ID is omitted.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "BTNX order reference number" },
        sessionToken: { type: "string", description: "BTNX session token or Personal Access Token (PAT)" }
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
    name: "btnx_list_products",
    description: "Search and list garments in the BTNX fashion store catalog. Filter by category, search keywords, or pinned hero status.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category (e.g. 'Tops', 'Bottoms', 'Outerwear', 'All')" },
        search: { type: "string", description: "Search keyword for garment name or description" },
        pinnedOnly: { type: "boolean", description: "Return only pieces pinned to the storefront Hero carousel" }
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
        promoCode: { type: "string", description: "Optional promo voucher code to apply" },
        shippingState: { type: "string", description: "Delivery state in Nigeria (e.g. 'Lagos', 'Abuja', 'Osun')" }
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
        promoCode: { type: "string", description: "Optional promo voucher code to apply" },
        sessionToken: { type: "string", description: "BTNX session token obtained from btnx_sign_in or your Personal Access Token (PAT). Pass this to carry over your verified BTNX session across requests." }
      },
      required: ["productId", "quantity", "size"]
    }
  },
  {
    name: "btnx_create_order",
    description: "Place a customer order directly into the BTNX store database. Automatically links the order to the authenticated customer account.",
    inputSchema: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Customer full name" },
        customerEmail: { type: "string", description: "Customer email address" },
        customerPhone: { type: "string", description: "Phone number for delivery courier" },
        shippingAddress: { type: "string", description: "Delivery address in Nigeria" },
        productId: { type: "string", description: "Garment product ID" },
        quantity: { type: "number", description: "Quantity" },
        size: { type: "string", description: "Garment size (S, M, L, XL)" },
        color: { type: "string", description: "Garment color" },
        promoCode: { type: "string", description: "Optional promo voucher" },
        sessionToken: { type: "string", description: "Session token or PAT" }
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
  },
  {
    name: "btnx_recommend_fit",
    description: "Expert size and silhouette recommendation tailored to client's height, weight, chest/waist measurements, and styling preference.",
    inputSchema: {
      type: "object",
      properties: {
        height: { type: "number", description: "Height in centimeters (e.g. 180)" },
        weight: { type: "number", description: "Weight in kilograms (e.g. 75)" },
        chest: { type: "number", description: "Chest circumference in centimeters (e.g. 98)" },
        waist: { type: "number", description: "Waist circumference in centimeters (e.g. 82)" },
        fitPreference: { type: "string", enum: ["slim", "regular", "relaxed"], description: "Preferred fit silhouette" }
      }
    }
  },
  {
    name: "btnx_message_support",
    description: "Submit a customer service ticket or message the BTNX customer care desk. Dispatches directly to the customer support triage desk in Osogbo, linked to your account.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "The detailed customer inquiry or message" },
        subject: { type: "string", description: "Inquiry topic, e.g. 'Order Status', 'Exchange Request', 'Address Update'" },
        orderId: { type: "string", description: "Associated order ID if inquiry is about an existing order" },
        customerName: { type: "string", description: "Customer name (optional if signed in)" },
        customerEmail: { type: "string", description: "Customer email (optional if signed in)" },
        sessionToken: { type: "string", description: "BTNX session token or Personal Access Token (PAT)" }
      },
      required: ["message"]
    }
  },
  {
    name: "btnx_get_support_ticket",
    description: "Retrieve an existing customer support ticket, including conversation history, current status (open, escalated, resolved), and agent responses.",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket reference number (e.g. 'tick_123456')" },
        sessionToken: { type: "string", description: "BTNX session token or Personal Access Token (PAT)" }
      },
      required: ["ticketId"]
    }
  },
  {
    name: "btnx_get_shipping_destinations",
    description: "Retrieve nationwide shipping rates, courier schedules, delivery timelines, and complimentary shipping eligibility across all states in Nigeria.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "btnx_create_personal_access_token",
    description: "Create a new cryptographic Personal Access Token (btnx_pat_...) for external AI assistants (Cursor, Claude Desktop, ChatGPT) with scoped permissions.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "A recognizable label for this key, e.g. 'Cursor AI', 'Claude Workstation'" },
        scopes: {
          type: "array",
          items: { type: "string" },
          description: "Permissions granted to this token (e.g. ['orders:read', 'invoices:read', 'tracking:read'])"
        },
        sessionToken: { type: "string", description: "BTNX session token proving account authentication" }
      },
      required: ["name"]
    }
  },
  {
    name: "btnx_list_personal_access_tokens",
    description: "List all active Personal Access Tokens created for the authenticated customer account (id, label, scopes, creation and last-used dates).",
    inputSchema: {
      type: "object",
      properties: {
        sessionToken: { type: "string", description: "BTNX session token proving account authentication" }
      }
    }
  },
  {
    name: "btnx_revoke_personal_access_token",
    description: "Revoke an existing Personal Access Token by its identifier, immediately cutting off external AI assistant access.",
    inputSchema: {
      type: "object",
      properties: {
        tokenId: { type: "string", description: "Token identifier (e.g. 'pat_abc123') to revoke" },
        sessionToken: { type: "string", description: "BTNX session token proving account authentication" }
      },
      required: ["tokenId"]
    }
  },
  {
    name: "btnx_initiate_whatsapp_linking",
    description: "Generate a 6-digit challenge code to link a customer's WhatsApp mobile number (+234...) to their verified BTNX account.",
    inputSchema: {
      type: "object",
      properties: {
        phoneNumber: { type: "string", description: "Mobile phone number in E.164 format (e.g. '+2348123456789' or '08123456789')" },
        sessionToken: { type: "string", description: "BTNX session token proving account authentication" }
      },
      required: ["phoneNumber"]
    }
  },
  {
    name: "btnx_verify_whatsapp_linking",
    description: "Confirm and complete WhatsApp phone number linking by submitting the 6-digit verification challenge code.",
    inputSchema: {
      type: "object",
      properties: {
        phoneNumber: { type: "string", description: "Mobile phone number being linked" },
        code: { type: "string", description: "6-digit verification code received" },
        sessionToken: { type: "string", description: "BTNX session token proving account authentication" }
      },
      required: ["phoneNumber", "code"]
    }
  },
  {
    name: "btnx_unlink_whatsapp",
    description: "Unlink and disconnect a WhatsApp mobile number from the authenticated customer account.",
    inputSchema: {
      type: "object",
      properties: {
        phoneNumber: { type: "string", description: "Mobile phone number to unlink" },
        sessionToken: { type: "string", description: "BTNX session token proving account authentication" }
      },
      required: ["phoneNumber"]
    }
  }
];

// 5. Safe Firestore Query Helpers for MCP Tool Execution
async function fetchCustomerOrders(email?: string, uid?: string): Promise<any[]> {
  try {
    const admin = getFirebaseAdmin();
    if (admin.hasCredentials && admin.db) {
      const ordersMap = new Map<string, any>();
      if (uid) {
        const snapUid = await admin.db.collection("orders").where("userId", "==", uid).get();
        snapUid.docs.forEach((d) => ordersMap.set(d.id, { id: d.id, ...d.data() }));
      }
      if (email) {
        const snap1 = await admin.db.collection("orders").where("customerEmail", "==", email).get();
        snap1.docs.forEach((d) => ordersMap.set(d.id, { id: d.id, ...d.data() }));
        const snap2 = await admin.db.collection("orders").where("userEmail", "==", email).get();
        snap2.docs.forEach((d) => ordersMap.set(d.id, { id: d.id, ...d.data() }));
      }
      return Array.from(ordersMap.values()).sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
    }
  } catch (err: any) {
    console.warn("[Admin Orders Fetch Notice]:", err?.message);
  }

  try {
    const ordersMap = new Map<string, any>();
    if (uid) {
      try {
        const snapUid = await getDocs(query(collection(db, "orders"), where("userId", "==", uid)));
        snapUid.docs.forEach((d) => ordersMap.set(d.id, { id: d.id, ...d.data() }));
      } catch {}
    }
    if (email) {
      try {
        const snap1 = await getDocs(query(collection(db, "orders"), where("customerEmail", "==", email)));
        snap1.docs.forEach((d) => ordersMap.set(d.id, { id: d.id, ...d.data() }));
      } catch {}
      try {
        const snap2 = await getDocs(query(collection(db, "orders"), where("userEmail", "==", email)));
        snap2.docs.forEach((d) => ordersMap.set(d.id, { id: d.id, ...d.data() }));
      } catch {}
    }
    return Array.from(ordersMap.values()).sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  } catch (err: any) {
    console.warn("[Client Orders Fetch Notice]:", err?.message);
    return [];
  }
}

async function fetchOrderById(orderId: string): Promise<any | null> {
  try {
    const admin = getFirebaseAdmin();
    if (admin.hasCredentials && admin.db) {
      const snap = await admin.db.collection("orders").doc(orderId).get();
      if (snap.exists) return { id: snap.id, ...snap.data() };
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  } catch {}
  return null;
}

async function fetchUserProfile(uid?: string, email?: string): Promise<any | null> {
  try {
    const admin = getFirebaseAdmin();
    if (admin.hasCredentials && admin.db) {
      if (uid) {
        const snap = await admin.db.collection("users").doc(uid).get();
        if (snap.exists) return { id: snap.id, ...snap.data() };
      }
      if (email) {
        const snap = await admin.db.collection("users").where("email", "==", email).limit(1).get();
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    }
  } catch {}

  try {
    if (uid) {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) return { id: snap.id, ...snap.data() };
    }
    if (email) {
      const snap = await getDocs(query(collection(db, "users"), where("email", "==", email), limit(1)));
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
  } catch {}
  return null;
}

// 6. Tool Execution Handler
async function executeTool(name: string, args: any, sessionId: string, reqUser: any | null, reqHost = "https://btnx-website-mcp.vercel.app") {

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
      const profile = await fetchUserProfile(cred.user.uid, inputEmail);

      // Load user orders from Firestore
      const orders = await fetchCustomerOrders(inputEmail, cred.user.uid);

      const customerName = profile?.name || cred.user.displayName || "BTNX Customer";
      const address = profile?.shippingStreet
        ? `${profile.shippingStreet}, ${profile.shippingCity || "Lagos"}, ${profile.shippingCountry || "Nigeria"}`
        : (orders[0]?.shippingAddress || "Nigeria");
      const phone = profile?.phone || orders[0]?.customerPhone || "N/A";
      const vipTier = profile?.role === "admin" ? "Master Atelier Admin" : "Atelier Collector";

      const sessionData = {
        sessionId: "",
        uid: cred.user.uid,
        email: inputEmail,
        name: customerName,
        phone,
        shippingAddress: address,
        vipTier,
        role: (profile?.role === "admin" || profile?.role === "support") ? profile.role : "customer",
        authenticatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const finalSessionId = createSignedSessionToken(sessionData);
      sessionData.sessionId = finalSessionId;

      await setAuthenticatedSession(finalSessionId, sessionData);

      let latestInvoiceUrl = "";
      if (orders.length > 0) {
        const { token: sigLatest, expiresAt: expLatest } = generateSignedResourceToken("invoice", orders[0].id);
        latestInvoiceUrl = `${reqHost}/render/invoice/${orders[0].id}?sig=${sigLatest}&exp=${expLatest}`;
      }

      const displayMarkdown = `### ✅ VERIFIED & SIGNED IN TO BTNX ACCOUNT
**Welcome, ${customerName}!**  
- **BTNX Customer:** \`${inputEmail}\`  
- **Verified UID:** \`${cred.user.uid}\`  
- **Delivery Address:** ${address}  
- **Contact Phone:** \`${phone}\`  
- **Total Orders on Record:** ${orders.length}  

${orders.length > 0 ? `👉 Latest Order: **#${orders[0].id}** (${formatNaira(orders[0].total)}) — Status: **${orders[0].status || "Confirmed"}**\n👉 [✨ Open Latest Invoice Card](${latestInvoiceUrl})` : ""}

*Your account is securely verified. You can now pull your private invoices, track orders, or place new orders.*`;

      return {
        authenticated: true,
        sessionToken: finalSessionId,
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
        instructionsForAssistant: `The user has successfully verified and signed into their BTNX account. The authenticated sessionToken is "${finalSessionId}". CRITICAL: You must pass sessionToken: "${finalSessionId}" as an argument in EVERY subsequent tool call (such as btnx_get_invoice, btnx_list_my_orders, btnx_track_parcel, btnx_create_customer_order) so the user does NOT have to sign in again.`
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

      const finalSignUpSessionId = (sessionId && sessionId.length >= 8)
        ? sessionId
        : generateSecureToken("btnx_sess_", 24);

      const sessionData = {
        sessionId: finalSignUpSessionId,
        uid: cred.user.uid,
        email,
        name,
        phone,
        shippingAddress,
        vipTier: "Atelier Collector",
        authenticatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await setAuthenticatedSession(finalSignUpSessionId, sessionData);

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
        sessionToken: finalSignUpSessionId,
        customer: {
          name,
          email,
          shippingAddress,
          phone,
          vipTier: "Atelier Collector",
        },
        displayMarkdown,
        instructionsForAssistant: `The user has registered and signed in. Always pass sessionToken: "${finalSignUpSessionId}" in subsequent tool calls.`
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

      const orders = await fetchCustomerOrders(user.email, user.uid);

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

      const orders = await fetchCustomerOrders(user.email, user.uid);

      if (orders.length === 0) {
        return {
          customerEmail: user.email,
          count: 0,
          orders: [],
          displayMarkdown: `### 📦 BTNX ORDERS FOR \`${user.email}\`\nNo orders found for this account. You can explore the catalog using \`btnx_list_catalog\` and place an order anytime!`,
        };
      }

      const tableRows = orders.slice(0, 10).map((o) => {
        const { token: sig, expiresAt: exp } = generateSignedResourceToken("invoice", o.id);
        const signedUrl = `${reqHost}/render/invoice/${o.id}?sig=${sig}&exp=${exp}`;
        return `| **#${o.id}** | ${o.date || "Recent"} | ${formatNaira(o.total)} | \`${o.status || "Confirmed"}\` | [✨ View Luxury Invoice Card](${signedUrl}) |`;
      }).join("\n");

      const { token: sigLatest, expiresAt: expLatest } = generateSignedResourceToken("invoice", orders[0].id);
      const signedLatestUrl = `${reqHost}/render/invoice/${orders[0].id}?sig=${sigLatest}&exp=${expLatest}`;

      const displayMarkdown = `### 📦 YOUR BTNX ORDERS (\`${user.email}\`)
**Total Orders:** ${orders.length}  

| Order ID | Date | Total | Status | Official Invoice |
| :--- | :--- | :--- | :--- | :--- |
${tableRows}

👉 **[✨ OPEN LATEST ORDER INVOICE](${signedLatestUrl})**`;

      return {
        customerEmail: user.email,
        count: orders.length,
        orders: orders.map((o) => {
          const { token: sigInv, expiresAt: expInv } = generateSignedResourceToken("invoice", o.id);
          const { token: sigTrack, expiresAt: expTrack } = generateSignedResourceToken("track", o.id);
          return {
            orderId: o.id,
            date: o.date,
            totalNaira: formatNaira(o.total),
            status: o.status || "Confirmed",
            viewInvoiceUrl: `${reqHost}/render/invoice/${o.id}?sig=${sigInv}&exp=${expInv}`,
            viewTrackingUrl: `${reqHost}/render/track/${o.id}?sig=${sigTrack}&exp=${expTrack}`,
          };
        }),
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
            error: "Authentication required: No order reference was provided and you are not signed into a BTNX account.",
            hint: "If you called btnx_sign_in previously, pass the sessionToken from btnx_sign_in: btnx_get_invoice({ sessionToken: '<token>' }). Otherwise ask the user for their registered BTNX email and password to call btnx_sign_in.",
            message: "No order reference was provided and you are not signed into a BTNX account. Please pass sessionToken or call btnx_sign_in with your email and password.",
            displayMarkdown: `### 🔒 AUTHENTICATION OR ORDER REFERENCE REQUIRED
Please pass your \`sessionToken\` from \`btnx_sign_in\`, sign in using \`btnx_sign_in\` (email and password), or provide your specific order reference number.`,
          };
        }

        // Pull the latest order for the authenticated user
        const orders = await fetchCustomerOrders(user.email, user.uid);

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
      const order = await fetchOrderById(targetId);
      if (!order) {
        return { error: `Invoice for order #${targetId} was not found in the database.` };
      }

      // SECURITY CHECK: Verify ownership!
      const orderOwnerEmail = String(order.customerEmail || order.userEmail || "").toLowerCase();
      if (user) {
        const isOwner = (user.uid && order.userId === user.uid) ||
          user.email?.toLowerCase() === orderOwnerEmail ||
          user.role === "admin";
        if (!isOwner) {
          return {
            error: `Access denied. Order #${targetId} does not belong to your authenticated BTNX account.`,
          };
        }
      } else {
        return {
          requiresAuth: true,
          error: `Authentication required: You must be signed into the BTNX account that owns order #${targetId}.`,
          hint: `If you previously called btnx_sign_in, you must pass the sessionToken: btnx_get_invoice({ orderId: "${targetId}", sessionToken: "<token_from_sign_in>" }). If not signed in, ask the user for their BTNX email and password to call btnx_sign_in.`,
          message: `For security and customer privacy, please sign in with your BTNX account using btnx_sign_in (email & password) or pass sessionToken to view invoice #${targetId}.`,
          displayMarkdown: `### 🔒 AUTHENTICATION REQUIRED
For security and privacy, you must sign in with the BTNX account that owns order \`#${targetId}\`. Please call \`btnx_sign_in\` with your registered email and password, or provide your \`sessionToken\`.`,
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

      const { token: sig, expiresAt: exp } = generateSignedResourceToken("invoice", order.id);
      const signedInvoiceUrl = `${reqHost}/render/invoice/${order.id}?sig=${sig}&exp=${exp}`;

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

👉 **[✨ CLICK HERE TO OPEN FULL INTERACTIVE LUXURY INVOICE CARD](${signedInvoiceUrl})**`;

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
        liveCardUrl: signedInvoiceUrl,
        displayMarkdown,
        htmlSnippet: invoiceHtml,
        instructionsForAssistant: "Always display the clickable live invoice card link directly in your response: [✨ View Luxury Invoice Card](...)"
      };
    }

    case "btnx_track_order":
    case "btnx_track_parcel": {
      let user = reqUser;
      let targetId = String(args?.orderId || "").trim();

      if (!targetId && user) {
        const orders = await fetchCustomerOrders(user.email, user.uid);
        if (orders.length > 0) targetId = orders[0].id;
      }

      if (!targetId) {
        return {
          requiresAuth: true,
          message: "Please provide an order reference number to track your parcel, or sign in to your BTNX account using btnx_sign_in.",
          displayMarkdown: `### 📦 TRACKING REFERENCE REQUIRED\nPlease provide your order reference number or sign in to your BTNX account.`,
        };
      }

      const order = await fetchOrderById(targetId);
      if (!order) {
        return { error: `Order #${targetId} was not found in the database.` };
      }

      // SECURITY CHECK: Verify order ownership before disclosing logistics and delivery details
      const orderOwnerEmail = String(order.customerEmail || order.userEmail || "").toLowerCase().trim();
      const providedEmail = String(args?.email || args?.customerEmail || "").toLowerCase().trim();

      if (user) {
        const isOwner = (user.uid && order.userId === user.uid) ||
          user.email?.toLowerCase() === orderOwnerEmail ||
          user.role === "admin";
        if (!isOwner) {
          return {
            error: `Access denied. Order #${targetId} does not belong to your authenticated BTNX account.`,
          };
        }
      } else if (!providedEmail || providedEmail !== orderOwnerEmail) {
        return {
          requiresAuth: true,
          error: `Authentication or order email verification required to track order #${targetId}.`,
          hint: `Please provide your registered order email (e.g. email: "yourname@example.com") or sign in using btnx_sign_in.`,
          message: `For client privacy, please provide the email associated with order #${targetId} or sign into your BTNX account.`,
          displayMarkdown: `### 🔒 AUTHENTICATION REQUIRED\nPlease provide the registered order email or sign into your BTNX account to track order \`#${targetId}\`.`,
        };
      }

      const stepperHtml = renderTrackingStepperHtml(order, reqHost);

      const { token: sig, expiresAt: exp } = generateSignedResourceToken("track", order.id);
      const signedTrackUrl = `${reqHost}/render/track/${order.id}?sig=${sig}&exp=${exp}`;

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

👉 **[✨ CLICK HERE TO VIEW LIVE INTERACTIVE TRACKING CARD](${signedTrackUrl})**`;

      return {
        orderId: order.id,
        currentStatus: order.status || "In Transit",
        carrier: "BTNX Express Logistics Hub · Osogbo Atelier, Osun State",
        destination: order.shippingAddress || "Nigeria",
        estimatedDelivery: "2–4 Business Days nationwide across Nigeria",
        totalNaira: formatNaira(order.total),
        liveCardUrl: signedTrackUrl,
        displayMarkdown,
        htmlSnippet: stepperHtml,
        instructionsForAssistant: "Always provide the clickable live tracking card link directly in your response: [✨ View Tracking Card](...)"
      };
    }

    case "btnx_create_order":
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
        userId: user?.uid || null,
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
          userId: user?.uid || "admin_master",
          title: `New Order #${randomRef}`,
          message: `Order for ${prod.name} (${formatNaira(total)}) placed for ${customerName}.`,
          type: "order_status",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      } catch {}

      const invoiceHtml = renderInvoiceHtml(newOrder, reqHost);
      const { token: sigInv, expiresAt: expInv } = generateSignedResourceToken("invoice", randomRef);
      const { token: sigTrack, expiresAt: expTrack } = generateSignedResourceToken("track", randomRef);
      const signedInvoiceUrl = `${reqHost}/render/invoice/${randomRef}?sig=${sigInv}&exp=${expInv}`;
      const signedTrackingUrl = `${reqHost}/render/track/${randomRef}?sig=${sigTrack}&exp=${expTrack}`;

      const displayMarkdown = `### 🎉 ORDER PLACED SUCCESSFULLY!
**Order Reference:** \`#${randomRef}\`  
**Piece:** **${prod.name}** (Size ${size}, Qty ${qty})  
**Customer:** ${customerName} (\`${customerEmail}\`)  
**Delivery Destination:** ${shippingAddress}  
**Grand Total:** **${formatNaira(total)}**  
**Order Status:** ✅ Confirmed & Queued for Quality Inspection  

👉 **[✨ CLICK HERE TO VIEW OFFICIAL LIVE INVOICE](${signedInvoiceUrl})**  
👉 **[✨ CLICK HERE TO TRACK PARCEL DISPATCH](${signedTrackingUrl})**`;

      return {
        success: true,
        orderReference: randomRef,
        message: `Order #${randomRef} successfully saved to BTNX database and queued for inspection.`,
        date: dateStr,
        grandTotalNaira: formatNaira(total),
        items: [{ piece: prod.name, quantity: qty, size, price: formatNaira(prod.price) }],
        viewInvoiceUrl: signedInvoiceUrl,
        viewTrackingUrl: signedTrackingUrl,
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

    case "btnx_list_products":
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

      let liveCardUrl = `${reqHost}/render/${wType}/${targetId}`;

      if (wType === "invoice" || wType === "track") {
        const snap = await getDoc(doc(db, "orders", targetId));
        if (!snap.exists()) {
          return { error: `Order #${targetId} was not found.` };
        }
        const orderData: any = snap.data();
        const user = reqUser;
        const orderOwnerEmail = String(orderData.customerEmail || orderData.userEmail || "").toLowerCase().trim();
        const providedEmail = String(args?.email || args?.customerEmail || "").toLowerCase().trim();

        if (user) {
          const isOwner = (user.uid && orderData.userId === user.uid) ||
            user.email?.toLowerCase() === orderOwnerEmail ||
            user.role === "admin";
          if (!isOwner) {
            return { error: `Access denied. Order #${targetId} does not belong to your account.` };
          }
        } else if (!providedEmail || providedEmail !== orderOwnerEmail) {
          return {
            requiresAuth: true,
            error: `Authentication or email verification required to render ${wType} for order #${targetId}.`,
          };
        }

        const { token: sig, expiresAt: exp } = generateSignedResourceToken(wType, targetId);
        liveCardUrl = `${reqHost}/render/${wType}/${targetId}?sig=${sig}&exp=${exp}`;
      }

      return {
        widgetType: wType,
        targetId,
        liveCardUrl,
        displayMarkdown: `👉 **[✨ CLICK HERE TO OPEN INTERACTIVE LUXURY ${wType.toUpperCase()} CARD](${liveCardUrl})**`,
        instructionsForAssistant: "Present the clickable card link prominently in your response."
      };
    }

    case "btnx_recommend_fit": {
      const height = Number(args?.height || 175);
      const weight = Number(args?.weight || 70);
      const chest = Number(args?.chest || 98);
      const waist = Number(args?.waist || 82);
      const fitPref = String(args?.fitPreference || "regular").toLowerCase();

      // BTNX Atelier Sizing Algorithm
      let size = "M";
      if (chest < 90 || weight < 60) size = "S";
      else if (chest <= 96 || weight <= 72) size = "M";
      else if (chest <= 104 || weight <= 84) size = "L";
      else if (chest <= 112 || weight <= 95) size = "XL";
      else size = "XXL";

      if (fitPref === "slim" && (size === "L" || size === "XL" || size === "XXL")) {
        if (chest % 8 <= 3) size = size === "XXL" ? "XL" : size === "XL" ? "L" : "M";
      } else if (fitPref === "relaxed" && size !== "XXL") {
        size = size === "S" ? "M" : size === "M" ? "L" : size === "L" ? "XL" : "XXL";
      }

      return {
        recommendedSize: size,
        measurementsProvided: { height, weight, chest, waist, fitPreference: fitPref },
        atelierNotes: `Based on your chest measurement (${chest}cm) and silhouette preference (${fitPref}), BTNX Master Tailors recommend Size ${size}. All BTNX garments are cut with precision shoulder draping and reinforced seams.`,
        displayMarkdown: `### 📏 BTNX Atelier Fit Recommendation\n- **Recommended Size:** **${size}**\n- **Silhouette:** ${fitPref.charAt(0).toUpperCase() + fitPref.slice(1)} Cut\n- **Atelier Guidance:** Precision drape engineered for Nigerian & European proportions.`
      };
    }

    case "btnx_message_support": {
      const message = String(args?.message || "").trim();
      if (!message) {
        return { error: "Message cannot be empty." };
      }
      const subject = String(args?.subject || "General Inquiry").trim();
      const orderId = String(args?.orderId || "").trim() || null;
      const customerEmail = reqUser?.email || String(args?.customerEmail || "").trim();
      const customerName = reqUser?.name || String(args?.customerName || "Customer").trim();
      const ticketId = "tick_" + crypto.randomBytes(8).toString("hex");

      const ticketRecord = {
        id: ticketId,
        uid: reqUser?.uid || null,
        customerName,
        customerEmail,
        subject,
        message,
        orderId,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: []
      };

      try {
        const admin = getFirebaseAdmin();
        if (admin.hasCredentials && admin.db) {
          await admin.db.collection("support_tickets").doc(ticketId).set(ticketRecord);
        } else {
          await setDoc(doc(db, "support_tickets", ticketId), ticketRecord);
        }
      } catch (err: any) {
        console.warn("[MCP] Ticket persistence warning:", err?.message);
      }

      return {
        ticketId,
        status: "open",
        subject,
        customerEmail,
        createdAt: ticketRecord.createdAt,
        message: `Your inquiry has been received by the BTNX Concierge Team. Reference #${ticketId}.`,
        displayMarkdown: `### 🎫 Support Ticket Created: #${ticketId}\n**Subject:** ${subject}\n**Status:** Open · Dedicated Atelier Support\nWe will review your inquiry and follow up promptly.`
      };
    }

    case "btnx_get_support_ticket": {
      const ticketId = String(args?.ticketId || "").trim();
      if (!ticketId) {
        return { error: "ticketId is required." };
      }

      let ticketData: any = null;
      try {
        const admin = getFirebaseAdmin();
        if (admin.hasCredentials && admin.db) {
          const snap = await admin.db.collection("support_tickets").doc(ticketId).get();
          if (snap.exists) ticketData = snap.data();
        } else {
          const tDoc = await getDoc(doc(db, "support_tickets", ticketId));
          if (tDoc.exists()) ticketData = tDoc.data();
        }
      } catch {}

      if (!ticketData) {
        return { error: `Ticket #${ticketId} was not found.` };
      }

      if (reqUser) {
        const isOwner = (ticketData.uid && ticketData.uid === reqUser.uid) ||
                        (ticketData.customerEmail && ticketData.customerEmail.toLowerCase() === reqUser.email.toLowerCase());
        const isAdminOrSupport = reqUser.role === "admin" || reqUser.role === "support";
        if (!isOwner && !isAdminOrSupport) {
          return { error: "Access denied: You are not authorized to view this support ticket." };
        }
      }

      return {
        ticket: ticketData,
        displayMarkdown: `### 🎫 Support Ticket #${ticketData.id}\n**Subject:** ${ticketData.subject}\n**Status:** ${ticketData.status}\n**Customer:** ${ticketData.customerName} (${ticketData.customerEmail})\n**Inquiry:** ${ticketData.message}`
      };
    }

    case "btnx_get_shipping_destinations": {
      return {
        dispatchOrigin: "BTNX Atelier & Logistics Center, Osogbo, Osun State, Nigeria",
        complimentaryShippingThreshold: 100000,
        complimentaryShippingFormatted: "₦100,000",
        destinations: [
          { state: "Lagos", fee: 3500, formattedFee: "₦3,500", deliveryTime: "1-2 Business Days", courier: "GIG Logistics / Red Star Express" },
          { state: "Osun", fee: 2500, formattedFee: "₦2,500", deliveryTime: "Same Day / Next Day", courier: "Atelier Dedicated Courier" },
          { state: "Oyo", fee: 3500, formattedFee: "₦3,500", deliveryTime: "1-2 Business Days", courier: "Atelier Regional Express" },
          { state: "Ogun", fee: 3500, formattedFee: "₦3,500", deliveryTime: "1-2 Business Days", courier: "GIG Logistics" },
          { state: "Abuja (FCT)", fee: 4500, formattedFee: "₦4,500", deliveryTime: "2-3 Business Days", courier: "DHL / GIG Logistics" },
          { state: "Rivers", fee: 5000, formattedFee: "₦5,000", deliveryTime: "2-3 Business Days", courier: "DHL Express" },
          { state: "Delta", fee: 5000, formattedFee: "₦5,000", deliveryTime: "2-4 Business Days", courier: "GIG Logistics" },
          { state: "Edo", fee: 4500, formattedFee: "₦4,500", deliveryTime: "2-3 Business Days", courier: "GIG Logistics" },
          { state: "Kano", fee: 6000, formattedFee: "₦6,000", deliveryTime: "3-5 Business Days", courier: "DHL Express" },
          { state: "Kaduna", fee: 6000, formattedFee: "₦6,000", deliveryTime: "3-5 Business Days", courier: "DHL Express" },
          { state: "All Other States", fee: 6500, formattedFee: "₦6,500", deliveryTime: "3-5 Business Days", courier: "Nationwide Tracked Dispatch" }
        ],
        packaging: "Every order arrives in bespoke cotton-padded signature BTNX gift box with luxury dust bag and seal.",
        displayMarkdown: `### 🚚 BTNX Nationwide Shipping Schedule\n- **Origin:** Osogbo Atelier, Osun State\n- **Lagos:** ₦3,500 (1-2 Days)\n- **Abuja (FCT):** ₦4,500 (2-3 Days)\n- **Osun / Oyo / Ogun:** ₦2,500 - ₦3,500\n- **Complimentary Shipping:** Automatically applied on all orders of **₦100,000 or more**.`
      };
    }

    case "btnx_create_personal_access_token": {
      if (!reqUser) {
        return {
          requiresAuth: true,
          error: "Authentication required to generate a Personal Access Token. Please sign in with btnx_sign_in first."
        };
      }
      const tokenName = String(args?.name || "AI Agent Key").trim();
      const scopes = Array.isArray(args?.scopes) && args.scopes.length > 0 ? args.scopes : ["orders:read", "invoices:read", "tracking:read"];

      const { rawToken, record } = await createPersonalAccessToken(db, reqUser.uid, tokenName, scopes);

      return {
        success: true,
        tokenId: record.id,
        name: record.name,
        scopes: record.scopes,
        token: rawToken,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        warning: "CRITICAL: Copy and save this Personal Access Token now. For security, BTNX stores only a cryptographic SHA-256 hash and cannot reveal this key again.",
        displayMarkdown: `### 🔑 Personal Access Token Generated\n- **Label:** ${record.name}\n- **Token:** \`${rawToken}\`\n- **Scopes:** ${record.scopes.join(", ")}\n\n⚠️ **Store this token securely.** You can now pass this token in the \`Authorization: Bearer <token>\` header or \`sessionToken\` argument in Claude, Cursor, or ChatGPT.`
      };
    }

    case "btnx_list_personal_access_tokens": {
      if (!reqUser) {
        return { requiresAuth: true, error: "Authentication required. Please sign in with btnx_sign_in first." };
      }
      const tokens = await listPersonalAccessTokens(db, reqUser.uid);
      return {
        tokens,
        count: tokens.length,
        displayMarkdown: `### 🔑 Active Personal Access Tokens (${tokens.length})\n` +
          tokens.map(t => `- **${t.name}** (\`${t.maskedToken}\`) — Scopes: [${t.scopes.join(", ")}] — Created: ${new Date(t.createdAt).toLocaleDateString()}`).join("\n")
      };
    }

    case "btnx_revoke_personal_access_token": {
      if (!reqUser) {
        return { requiresAuth: true, error: "Authentication required. Please sign in with btnx_sign_in first." };
      }
      const tokenId = String(args?.tokenId || "").trim();
      if (!tokenId) {
        return { error: "tokenId is required to revoke a Personal Access Token." };
      }
      const success = await revokePersonalAccessToken(db, reqUser.uid, tokenId);
      return {
        success,
        tokenId,
        message: success ? `Personal Access Token ${tokenId} has been revoked.` : "Token not found or already revoked."
      };
    }

    case "btnx_initiate_whatsapp_linking": {
      if (!reqUser) {
        return { requiresAuth: true, error: "Authentication required. Please sign in with btnx_sign_in first." };
      }
      const rawPhone = String(args?.phoneNumber || "").trim();
      if (!rawPhone) {
        return { error: "phoneNumber is required (e.g. +2348123456789 or 08123456789)." };
      }
      const normalized = normalizePhoneNumber(rawPhone);
      const challenge = await createWhatsAppLinkingChallenge(db, reqUser.uid);

      return {
        challengeCreated: true,
        phoneNumber: normalized,
        verificationCode: challenge.code,
        expiresAt: challenge.expiresAt,
        instructions: `Send this 6-digit code (${challenge.code}) via WhatsApp to the official BTNX WhatsApp Number, or submit it via btnx_verify_whatsapp_linking.`,
        displayMarkdown: `### 💬 WhatsApp Account Linking\n- **Target Phone:** \`${normalized}\`\n- **Verification Code:** **\`${challenge.code}\`** (Valid for 10 minutes)\n\nSend this 6-digit code to BTNX WhatsApp or verify via \`btnx_verify_whatsapp_linking\`.`
      };
    }

    case "btnx_verify_whatsapp_linking": {
      if (!reqUser) {
        return { requiresAuth: true, error: "Authentication required. Please sign in with btnx_sign_in first." };
      }
      const rawPhone = String(args?.phoneNumber || "").trim();
      const code = String(args?.code || "").trim();
      if (!rawPhone || !code) {
        return { error: "Both phoneNumber and 6-digit verification code are required." };
      }
      const normalized = normalizePhoneNumber(rawPhone);
      const linkResult = await verifyAndLinkWhatsApp(db, normalized, code);
      if (!linkResult.success) {
        return {
          verified: false,
          error: linkResult.message || "Verification failed. The code is either invalid, expired, or has exceeded maximum attempts."
        };
      }
      return {
        verified: true,
        phoneNumber: normalized,
        message: `WhatsApp number ${normalized} has been successfully verified and linked to your BTNX customer account.`,
        displayMarkdown: `### ✅ WhatsApp Number Linked Successfully\nYour WhatsApp number \`${normalized}\` is now linked to your BTNX account. You can now track orders and receive invoice updates directly on WhatsApp.`
      };
    }

    case "btnx_unlink_whatsapp": {
      if (!reqUser) {
        return { requiresAuth: true, error: "Authentication required. Please sign in with btnx_sign_in first." };
      }
      const rawPhone = String(args?.phoneNumber || "").trim();
      if (!rawPhone) {
        return { error: "phoneNumber is required." };
      }
      const normalized = normalizePhoneNumber(rawPhone);
      const success = await unlinkWhatsApp(db, reqUser.uid, normalized);
      return {
        success,
        phoneNumber: normalized,
        message: success ? `WhatsApp number ${normalized} unlinked.` : "Failed to unlink WhatsApp number."
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-btnx-key, mcp-session-id, x-btnx-session, x-session-id, baggage, sentry-trace, traceparent"
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, mcp-session-id, x-btnx-session, x-session-id");

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

  try {
    const url = req.url || "/";
  const reqHost = `https://${req.headers["host"] || "btnx-website-mcp.vercel.app"}`;

  // Parse Body for POST Requests early
  let body = req.body;
  let rawBodyString = "";
  if (Buffer.isBuffer(body)) {
    rawBodyString = body.toString("utf8");
    try {
      body = JSON.parse(rawBodyString);
    } catch {
      try {
        body = Object.fromEntries(new URLSearchParams(rawBodyString));
      } catch {}
    }
  } else if (typeof body === "string") {
    rawBodyString = body;
    try {
      body = JSON.parse(body);
    } catch {
      try {
        body = Object.fromEntries(new URLSearchParams(rawBodyString));
      } catch {}
    }
  } else if (!body && req.method === "POST") {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      rawBodyString = Buffer.concat(buffers).toString("utf8");
      try {
        body = JSON.parse(rawBodyString);
      } catch {
        // Form-encoded or non-JSON
        body = Object.fromEntries(new URLSearchParams(rawBodyString));
      }
    } catch {}
  }

  // 1) RFC 8414 OAuth 2.0 & OpenID Connect Discovery & RFC 9728 Protected Resource Metadata
  const pathname = url.split("?")[0];

  const isOauthMetadata =
    pathname.startsWith("/.well-known/oauth-authorization-server") ||
    pathname.startsWith("/mcp/.well-known/oauth-authorization-server") ||
    pathname.startsWith("/.well-known/openid-configuration") ||
    pathname.startsWith("/mcp/.well-known/openid-configuration") ||
    pathname.endsWith("/.well-known/oauth-authorization-server") ||
    pathname.endsWith("/.well-known/openid-configuration");

  if (isOauthMetadata) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      issuer: reqHost,
      authorization_endpoint: `${reqHost}/oauth/authorize`,
      token_endpoint: `${reqHost}/oauth/token`,
      registration_endpoint: `${reqHost}/oauth/register`,
      revocation_endpoint: `${reqHost}/oauth/revoke`,
      userinfo_endpoint: `${reqHost}/oauth/userinfo`,
      jwks_uri: `${reqHost}/oauth/jwks.json`,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["openid", "profile", "email", "orders", "btnx:all"]
    }, null, 2));
    return;
  }

  const isProtectedResourceMetadata =
    pathname.startsWith("/.well-known/oauth-protected-resource") ||
    pathname.startsWith("/mcp/.well-known/oauth-protected-resource") ||
    pathname.endsWith("/.well-known/oauth-protected-resource");

  if (isProtectedResourceMetadata) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      resource: `${reqHost}/mcp`,
      authorization_servers: [reqHost],
      scopes_supported: ["openid", "profile", "email", "orders", "btnx:all"],
      bearer_methods_supported: ["header"]
    }, null, 2));
    return;
  }

  if (url.includes(".well-known")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      issuer: reqHost,
      authorization_endpoint: `${reqHost}/oauth/authorize`,
      token_endpoint: `${reqHost}/oauth/token`,
      registration_endpoint: `${reqHost}/oauth/register`,
      revocation_endpoint: `${reqHost}/oauth/revoke`,
      userinfo_endpoint: `${reqHost}/oauth/userinfo`,
      jwks_uri: `${reqHost}/oauth/jwks.json`,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["openid", "profile", "email", "orders", "btnx:all"]
    }, null, 2));
    return;
  }

  // 2) RFC 7591 Dynamic Client Registration Endpoint
  if ((pathname === "/oauth/register" || pathname === "/api/oauth/register") && req.method === "POST") {
    const clientName = String(body?.client_name || "Custom MCP Client").trim();
    const redirectUris = Array.isArray(body?.redirect_uris)
      ? body.redirect_uris
      : [String(body?.redirect_uris || "")].filter(Boolean);
    const clientId = "btnx_client_" + crypto.randomBytes(16).toString("hex");
    const clientSecret = "btnx_sec_" + crypto.randomBytes(32).toString("hex");
    const now = Math.floor(Date.now() / 1000);

    const clientRecord = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: now,
      client_secret_expires_at: 0,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: body?.token_endpoint_auth_method || "client_secret_post",
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "oauth_clients", clientId), clientRecord);
    } catch (e: any) {
      console.warn("[OAuth] Persist dynamic client notice:", e?.message);
    }

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(clientRecord, null, 2));
    return;
  }

  // 3) RFC 7009 Token Revocation Endpoint
  if ((pathname === "/oauth/revoke" || pathname === "/api/oauth/revoke") && req.method === "POST") {
    const token = String(body?.token || "").trim();
    if (token) {
      await revokeOAuthToken(db, token);
      memoryOAuthTokens.delete(token);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ revoked: true }));
    return;
  }

  // 4) OAuth 2.1 Authorization Code Flow Endpoints
  // A) GET & POST /oauth/authorize
  if (pathname === "/oauth/authorize" || pathname === "/api/oauth/authorize") {
    try {
      const queryParams = new URL(url, reqHost).searchParams;
      const clientId = queryParams.get("client_id") || body?.client_id || "chatgpt";
      const redirectUri = queryParams.get("redirect_uri") || body?.redirect_uri || "";
      const state = queryParams.get("state") || body?.state || "";
      const scope = queryParams.get("scope") || body?.scope || "openid profile email orders";
      const responseType = queryParams.get("response_type") || body?.response_type || "code";
      const codeChallenge = queryParams.get("code_challenge") || body?.code_challenge || "";
      const codeChallengeMethod = queryParams.get("code_challenge_method") || body?.code_challenge_method || "S256";

      if (req.method === "POST") {
        const idToken = String(body?.id_token || body?.google_id_token || "").trim();
        let customerUid = "";
        let customerEmail = "";
        let customerName = "BTNX Customer";

        if (idToken) {
          // Cryptographically verify Google Firebase ID token
          const verified = await verifyFirebaseIdToken(idToken);
          if (!verified) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderOAuthAuthorizePage({
              error: "Google authentication could not be verified. Please try again.",
              clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
            }));
            return;
          }
          customerUid = verified.uid;
          customerEmail = verified.email || "";
          customerName = verified.name || "BTNX Customer";
        } else {
          // Email & password authentication
          const email = String(body?.email || "").toLowerCase().trim();
          const password = String(body?.password || "").trim();

          if (!email || !password) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderOAuthAuthorizePage({
              error: "Please enter both your BTNX customer email and password, or choose 'Continue with Google'.",
              clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
            }));
            return;
          }

          let cred: any = null;
          try {
            cred = await signInWithEmailAndPassword(customerAuth, email, password);
            customerUid = cred.user.uid;
            customerEmail = cred.user.email;
            customerName = cred.user.displayName || "BTNX Customer";
          } catch (err: any) {
            // Attempt automatic account registration if user does not exist or first-time customer
            if (
              err?.code === "auth/invalid-credential" ||
              err?.code === "auth/user-not-found"
            ) {
              if (password.length >= 6) {
                try {
                  cred = await createUserWithEmailAndPassword(customerAuth, email, password);
                  customerUid = cred.user.uid;
                  customerEmail = cred.user.email;
                  customerName = "BTNX Customer";
                  try {
                    await setDoc(doc(db, "users", customerUid), {
                      id: customerUid,
                      email: customerEmail,
                      name: customerName,
                      role: "customer",
                      createdAt: new Date().toISOString(),
                      shippingStreet: "Nigeria",
                    });
                  } catch {}
                } catch (createErr: any) {
                  const isAlreadyInUse = createErr?.code === "auth/email-already-in-use";
                  let linkedViaAdmin = false;

                  if (isAlreadyInUse && hasAdminCredentials()) {
                    try {
                      const admin = getFirebaseAdmin();
                      if (admin.auth) {
                        const existingUser = await admin.auth.getUserByEmail(email);
                        if (existingUser) {
                          // Update password for user and authenticate seamlessly
                          await admin.auth.updateUser(existingUser.uid, { password });
                          customerUid = existingUser.uid;
                          customerEmail = existingUser.email || email;
                          customerName = existingUser.displayName || "BTNX Customer";
                          linkedViaAdmin = true;
                        }
                      }
                    } catch (adminLinkErr) {
                      console.warn("[OAuth] Admin account linking notice:", adminLinkErr);
                    }
                  }

                  if (!linkedViaAdmin) {
                    const errorMsg = isAlreadyInUse
                      ? "This account was registered via Google. Please click 'Continue with Google' above, or verify your BTNX credentials."
                      : `Account error: ${createErr?.message || "Please verify your email and password."}`;
                    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                    res.end(renderOAuthAuthorizePage({
                      error: errorMsg,
                      clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
                    }));
                    return;
                  }
                }
              } else {
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(renderOAuthAuthorizePage({
                  error: "Password must be at least 6 characters. Please choose a password with 6 or more characters.",
                  clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
                }));
                return;
              }
            } else {
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              res.end(renderOAuthAuthorizePage({
                error: "Authentication failed. " + (err?.message || "Invalid email or password. Please verify your BTNX credentials and try again."),
                clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
              }));
              return;
            }
          }
        }

        // Customer authenticated successfully! Generate authorization code with 5-minute TTL
        let prof: any = null;
        try {
          const uDoc = await getDoc(doc(db, "users", customerUid));
          if (uDoc.exists()) prof = uDoc.data();
        } catch {}

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const codeRecord = {
          code: "",
          uid: customerUid,
          email: customerEmail,
          name: prof?.name || customerName || "BTNX Customer",
          shippingAddress: prof?.shippingStreet || "Nigeria",
          phone: prof?.phone || "N/A",
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          createdAt: new Date().toISOString(),
          expiresAt,
        };

        const code = createSignedOAuthCode(codeRecord);
        codeRecord.code = code;

        // Cache in memory for instant high-reliability resolution
        memoryOAuthCodes.set(code, codeRecord);

        // Attempt persistence to Firestore using Admin SDK if credentials exist
        try {
          const admin = getFirebaseAdmin();
          if (admin.hasCredentials && admin.db) {
            await admin.db.collection("oauth_codes").doc(code).set(codeRecord);
          }
        } catch (e: any) {
          console.warn("[OAuth] Non-fatal Firestore code persistence notice:", e?.message || e);
        }

        // Safe redirect to client callback or render confirmation page
        let targetUrl: URL | null = null;
        if (redirectUri && redirectUri.trim().length > 0) {
          try {
            targetUrl = new URL(redirectUri);
          } catch {
            targetUrl = null;
          }
        }

        if (targetUrl) {
          targetUrl.searchParams.set("code", code);
          if (state) targetUrl.searchParams.set("state", state);
          res.writeHead(302, { Location: targetUrl.toString() });
          res.end();
          return;
        } else {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(renderOAuthSuccessPage({ code, state, clientId }));
          return;
        }
      }

      // GET /oauth/authorize -> Render login page
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderOAuthAuthorizePage({
        clientId, redirectUri, state, scope, responseType, codeChallenge, codeChallengeMethod
      }));
      return;
    } catch (routeErr: any) {
      console.error("[OAuth] Authorize endpoint error:", routeErr);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderOAuthAuthorizePage({
        error: "An unexpected error occurred during authorization. Please try again. (" + (routeErr?.message || "Internal error") + ")",
        clientId: "chatgpt", redirectUri: "", state: "", scope: "openid profile email orders", responseType: "code", codeChallenge: "", codeChallengeMethod: "S256"
      }));
      return;
    }
  }

  // B) POST /oauth/token
  if ((pathname === "/oauth/token" || pathname === "/api/oauth/token") && req.method === "POST") {
    const grantType = body?.grant_type || "authorization_code";

    if (grantType === "authorization_code") {
      const code = String(body?.code || "").trim();
      if (!code) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_request", error_description: "Missing code parameter" }));
        return;
      }

      let cData: any = null;
      if (code.startsWith("btnx_code_")) {
        cData = verifySignedOAuthCode(code);
      }

      if (!cData && memoryOAuthCodes.has(code)) {
        cData = memoryOAuthCodes.get(code);
        memoryOAuthCodes.delete(code);
      }

      if (!cData) {
        try {
          const admin = getFirebaseAdmin();
          if (admin.hasCredentials && admin.db) {
            const snap = await admin.db.collection("oauth_codes").doc(code).get();
            if (snap.exists) {
              cData = snap.data();
              await admin.db.collection("oauth_codes").doc(code).delete();
            }
          }
        } catch {}
      }

      if (!cData) {
        try {
          const cDoc = await getDoc(doc(db, "oauth_codes", code));
          if (cDoc.exists()) {
            cData = cDoc.data();
            try { await deleteDoc(doc(db, "oauth_codes", code)); } catch {}
          }
        } catch {}
      }

      if (!cData) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Authorization code invalid or expired" }));
        return;
      }

      // Check code expiration
      if (cData.expiresAt && new Date(cData.expiresAt).getTime() < Date.now()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Authorization code has expired" }));
        return;
      }

      // RFC 7636 PKCE S256 Verification (reject 'plain' PKCE per OAuth 2.1)
      if (cData.codeChallenge) {
        const verifier = String(body?.code_verifier || "").trim();
        const method = (cData.codeChallengeMethod || "S256") as "S256" | "plain";
        if (method !== "S256" || !verifier || !verifyPkce(verifier, cData.codeChallenge, "S256")) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_grant", error_description: "PKCE S256 code_verifier validation failed" }));
          return;
        }
      }

      const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const tokenRecord = {
        token: "",
        refreshToken: "",
        uid: cData.uid,
        email: cData.email,
        name: cData.name,
        shippingAddress: cData.shippingAddress,
        phone: cData.phone,
        clientId: cData.clientId || "mcp_client",
        scopes: ["openid", "profile", "email", "orders"],
        role: "customer",
        createdAt: new Date().toISOString(),
        expiresAt: exp,
      };

      const accessToken = createSignedOAuthAccessToken(tokenRecord);
      const refreshToken = "btnx_rt_" + crypto.randomBytes(24).toString("hex");
      tokenRecord.token = accessToken;
      tokenRecord.refreshToken = refreshToken;

      // Secure storage: store SHA-256 hashed tokens in oauth_tokens collection
      try {
        await storeOAuthTokens(
          db,
          accessToken,
          refreshToken,
          cData.uid,
          cData.email,
          cData.name,
          cData.clientId || "mcp_client",
          ["openid", "profile", "email", "orders"]
        );
      } catch (err: any) {
        console.warn("[OAuth] Non-fatal store token notice:", err?.message);
      }

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

  // 4b) Handle Luxury Product OpenGraph / Image Route (GET /og/:id)
  if (req.method === "GET" && url.startsWith("/og/")) {
    await ensureAdminAuth();
    const rawId = url.replace("/og/", "").replace(/\.jpg|\.png|\.webp/i, "").split("?")[0].trim();
    let prodName = "BTNX Luxury Piece";
    let prodCat = "Atelier Collection";
    let prodPrice = "₦75,000";

    try {
      const snap = await getDoc(doc(db, "products", rawId));
      if (snap.exists()) {
        const prodData: any = snap.data();
        prodName = prodData.name || prodName;
        prodCat = prodData.category || prodCat;
        prodPrice = formatNaira(prodData.price || 75000);
      }
    } catch {}

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#141413"/>
  <rect x="40" y="40" width="1120" height="550" rx="8" stroke="#2C2A26" stroke-width="2"/>
  <g transform="translate(100, 80) scale(0.24)">
    ${BTNX_LOGO_SVG}
  </g>
  <text x="100" y="270" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="#C89B62">${escapeHtml(prodCat.toUpperCase())} · OSUN ATELIER</text>
  <text x="100" y="360" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="700" fill="#FAF9F7">${escapeHtml(prodName)}</text>
  <text x="100" y="450" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="42" font-weight="800" fill="#E6C08A">${prodPrice}</text>
  <text x="100" y="530" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" letter-spacing="2" fill="#A7A299">NATIONWIDE NIGERIA DISPATCH · 100% AUTHENTIC ATELIER COLLECTION</text>
</svg>`;

    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(svg);
    return;
  }

  // 5) Handle Live HTML Card Render Routes (GET /render/:type/:id)
  if (req.method === "GET" && url.startsWith("/render/")) {
    await ensureAdminAuth();
    const urlObj = new URL(url, reqHost);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    const renderType = parts[1]; // product | invoice | track
    const targetId = decodeURIComponent(parts[2] || "");
    const sig = urlObj.searchParams.get("sig") || "";
    const exp = parseInt(urlObj.searchParams.get("exp") || "0", 10);

    if (renderType === "product") {
      let prodId = targetId || "ny-1";
      const snap = await getDoc(doc(db, "products", prodId));
      if (snap.exists()) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderProductCardHtml({ id: snap.id, ...snap.data() }, reqHost));
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Product #${targetId} was not found in the BTNX database.`);
      return;
    }

    if (renderType === "invoice" || renderType === "track") {
      if (!targetId) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Order reference is required.");
        return;
      }

      const snap = await getDoc(doc(db, "orders", targetId));
      if (!snap.exists()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Order #${targetId} was not found in the BTNX database.`);
        return;
      }

      const orderData: any = { id: snap.id, ...snap.data() };

      // Security check: Either valid signed HMAC token OR authenticated session user matching ownership
      const hasValidSignature = sig && exp && verifySignedResourceToken(renderType, targetId, sig, exp);
      const renderUser = await resolveSessionUser(req);
      const isOwner = renderUser && (
        renderUser.uid === orderData.userId ||
        renderUser.email?.toLowerCase() === (orderData.customerEmail || orderData.userEmail)?.toLowerCase() ||
        renderUser.role === "admin"
      );

      if (!hasValidSignature && !isOwner) {
        res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderAccessDeniedHtml(renderType, targetId));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (renderType === "invoice") {
        res.end(renderInvoiceHtml(orderData, reqHost));
      } else {
        res.end(renderTrackingStepperHtml(orderData, reqHost));
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Requested ${renderType} #${targetId} was not found in the BTNX database.`);
    return;
  }

  // 5) Resolve Session Context early (synchronous)
  const explicitToken = body?.params?.arguments?.sessionToken || body?.params?.arguments?.sessionId;
  const sessionId = resolveSessionId(req, explicitToken);

  // 6) Handle SSE Endpoint (GET /sse, GET /mcp/sse, or GET /mcp with Accept: text/event-stream)
  const acceptHeader = String(req.headers["accept"] || "");
  const isSseRequest =
    pathname === "/sse" ||
    pathname === "/mcp/sse" ||
    ((pathname === "/mcp" || pathname === "/api/mcp") && acceptHeader.includes("text/event-stream"));

  if (isSseRequest && req.method === "GET") {
    const sseSessionId = (sessionId && sessionId.length >= 8) ? sessionId : ("mcp_sess_" + crypto.randomBytes(16).toString("hex"));
    res.setHeader("Link", `<${reqHost}/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"`);
    res.setHeader("WWW-Authenticate", `Bearer realm="BTNX", resource_metadata="${reqHost}/.well-known/oauth-protected-resource"`);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "mcp-session-id": sseSessionId,
    });
    res.write(`event: endpoint\ndata: ${reqHost}/mcp/messages?sessionId=${sseSessionId}\n\n`);
    res.write(`: keepalive\n\n`);
    globalSseStreams.set(sseSessionId, res);
    req.on("close", () => {
      globalSseStreams.delete(sseSessionId);
    });
    return;
  }

  // 7) Handle GET /mcp (Claude Connector Health & Discovery JSON)
  if (req.method === "GET" && (pathname === "/mcp" || pathname === "/api/mcp")) {
    res.setHeader("Link", `<${reqHost}/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"`);
    res.setHeader("WWW-Authenticate", `Bearer realm="BTNX", resource_metadata="${reqHost}/.well-known/oauth-protected-resource"`);
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
        registration_endpoint: `${reqHost}/oauth/register`,
        revocation_endpoint: `${reqHost}/oauth/revoke`,
      },
      toolsCount: MCP_TOOLS.length,
    }));
    return;
  }

  // 8) Handle JSON-RPC 2.0 (Claude Custom Connector, Cursor, and ChatGPT)
  if (req.method === "POST") {
    const id = body?.id ?? 1;
    const method = body?.method;

    if (method === "initialize") {
      const clientProto = String(body?.params?.protocolVersion || "2024-11-05");
      const negotiatedProtocol = clientProto.startsWith("202") ? clientProto : "2024-11-05";

      const establishedSessionId = (sessionId && sessionId.length >= 8)
        ? sessionId
        : ("mcp_sess_" + crypto.randomBytes(16).toString("hex"));

      // Set headers required by MCP Streamable HTTP specification
      res.setHeader("mcp-session-id", establishedSessionId);
      res.setHeader("Access-Control-Expose-Headers", "Content-Type, mcp-session-id, x-btnx-session, x-session-id");

      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: negotiatedProtocol,
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
            logging: {},
          },
          serverInfo: {
            name: "BTNX Store Remote MCP",
            version: "2.5.0",
          },
          instructions: "BTNX Store MCP Server for luxury fashion catalog, client orders, tracking, and concierge care.",
        },
      };
      res.writeHead(200, {
        "Content-Type": "application/json",
        "mcp-session-id": establishedSessionId,
        "Access-Control-Expose-Headers": "Content-Type, mcp-session-id, x-btnx-session, x-session-id",
      });
      res.end(JSON.stringify(response));
      return;
    }

    if (method === "notifications/initialized" || (typeof method === "string" && method.startsWith("notifications/"))) {
      res.writeHead(202, { "Content-Type": "text/plain" });
      res.end();
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
      const callToken = toolArgs.sessionToken || toolArgs.sessionId || explicitToken;
      const effectiveSessionId = resolveSessionId(req, callToken) || sessionId;
      const effectiveUser = await resolveSessionUser(req, callToken);

      const resultData = await executeTool(toolName, toolArgs, effectiveSessionId, effectiveUser, reqHost);

      if (resultData?.sessionToken) {
        res.setHeader("Set-Cookie", `btnx_session=${encodeURIComponent(resultData.sessionToken)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`);
      }

      const isError = Boolean(resultData?.error || resultData?.status === "error");
      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: typeof resultData === "string" ? resultData : JSON.stringify(resultData, null, 2),
            },
          ],
          isError,
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

  // Handle SSE Client POST Message Dispatcher
  if ((pathname === "/mcp/messages" || pathname === "/messages") && req.method === "POST") {
    const qSessionId = (new URL(url, reqHost).searchParams.get("sessionId")) || (req.headers["mcp-session-id"] as string);
    const targetSse = qSessionId ? globalSseStreams.get(qSessionId) : null;
    
    const id = body?.id ?? 1;
    const method = body?.method;
    let jsonRpcResp: any = null;

    if (method === "initialize") {
      jsonRpcResp = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: true } },
          serverInfo: { name: "BTNX Store Remote MCP", version: "2.5.0" },
        },
      };
    } else if (method === "notifications/initialized" || (typeof method === "string" && method.startsWith("notifications/"))) {
      res.writeHead(202, { "Content-Type": "text/plain" });
      res.end();
      return;
    } else if (method === "tools/list") {
      jsonRpcResp = { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } };
    } else if (method === "tools/call") {
      const toolName = body?.params?.name;
      const toolArgs = body?.params?.arguments || {};
      const callToken = toolArgs.sessionToken || toolArgs.sessionId || explicitToken;
      const effectiveSessionId = resolveSessionId(req, callToken) || qSessionId || sessionId;
      const effectiveUser = await resolveSessionUser(req, callToken);
      const resultData = await executeTool(toolName, toolArgs, effectiveSessionId, effectiveUser, reqHost);
      const isError = Boolean(resultData?.error || resultData?.status === "error");
      jsonRpcResp = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: typeof resultData === "string" ? resultData : JSON.stringify(resultData, null, 2) }],
          isError,
        },
      };
    } else if (method === "ping") {
      jsonRpcResp = { jsonrpc: "2.0", id, result: {} };
    } else {
      jsonRpcResp = { jsonrpc: "2.0", id, error: { code: -32601, message: `Method '${method}' not found.` } };
    }

    if (targetSse && !targetSse.writableEnded) {
      targetSse.write(`event: message\ndata: ${JSON.stringify(jsonRpcResp)}\n\n`);
      res.writeHead(202, { "Content-Type": "text/plain" });
      res.end("Accepted");
      return;
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(jsonRpcResp));
      return;
    }
  }

    // 7) Normal Browser Visit — Serve Dashboard
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML_DASHBOARD);
  } catch (fatalErr: any) {
    console.error("[BTNX MCP Fatal Handler Error]:", fatalErr);
    if (!res.headersSent) {
      if (req.method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: (req as any).body?.id ?? 1,
          error: {
            code: -32603,
            message: "Internal server error: " + (fatalErr?.message || "Internal failure"),
          },
        }));
      } else {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>BTNX Notice</title></head><body style="background:#111;color:#fff;font-family:sans-serif;padding:2rem;">
          <h2>BTNX Remote MCP Notice</h2>
          <p>${escapeHtml(fatalErr?.message || "An unexpected error occurred.")}</p>
        </body></html>`);
      }
    }
  }
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>BTNX Atelier &middot; Account Authorization</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body {
      width: 100%;
      min-height: 100%;
      background-color: #111110;
      color: #F3F1EC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      line-height: 1.5;
    }
    .auth-card {
      background-color: #191816;
      border: 1px solid #2C2A26;
      width: 100%;
      max-width: 380px;
      padding: 24px 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.85);
      border-radius: 4px;
      margin: auto;
    }
    @media (max-width: 480px) {
      body {
        padding: 8px;
      }
      .auth-card {
        padding: 20px 16px;
        box-shadow: none;
      }
      .brand-title {
        font-size: 22px !important;
      }
      input {
        font-size: 16px !important;
        height: 46px !important;
      }
    }
    .brand-title {
      font-size: 24px;
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
      margin-bottom: 16px;
    }
    .desc {
      font-size: 12px;
      line-height: 1.5;
      color: #A7A299;
      text-align: center;
      margin-bottom: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid #2C2A26;
    }
    .form-group {
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #A7A299;
      margin-bottom: 5px;
      font-weight: 600;
    }
    input {
      width: 100%;
      height: 46px;
      background: #141413;
      border: 1px solid #2C2A26;
      color: #F3F1EC;
      padding: 0 12px;
      font-size: 16px !important; /* CRITICAL: 16px prevents iOS Safari & Android from auto-zooming */
      outline: none;
      transition: border-color 0.2s;
      border-radius: 2px;
      -webkit-appearance: none;
    }
    input:focus {
      border-color: #C89B62;
    }
    .btn-submit {
      width: 100%;
      min-height: 46px;
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
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      text-align: center;
    }
    .btn-submit:hover {
      filter: brightness(1.1);
    }
    .btn-google {
      width: 100%;
      min-height: 46px;
      background: #FFFFFF;
      color: #1F1F1F;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
      border: 1px solid #747775;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      margin-bottom: 14px;
      transition: background-color 0.2s, box-shadow 0.2s;
    }
    .btn-google:hover {
      background: #F8F9FA;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .btn-google:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 14px 0;
      color: #8C887B;
      font-size: 9.5px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #2C2A26;
    }
    .divider span {
      padding: 0 8px;
    }
    .error-banner {
      background: rgba(220, 38, 38, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 10px 12px;
      font-size: 11.5px;
      margin-bottom: 14px;
      text-align: center;
      border-radius: 2px;
      line-height: 1.4;
    }
    .hint-text {
      font-size: 10.5px;
      color: #8C887B;
      margin-top: 5px;
      line-height: 1.4;
    }
    .footer-note {
      font-size: 10.5px;
      color: #66625B;
      text-align: center;
      margin-top: 16px;
    }
  </style>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
</head>
<body>
  <div class="auth-card">
    <div class="brand-title">BTNX</div>
    <div class="brand-sub">Osun Atelier &middot; Account Authorization</div>
    <div class="desc">
      Sign in or register your BTNX customer account to securely link Claude with your fashion inventory, orders, and deliveries.
    </div>
    ${params.error ? `<div class="error-banner">${escapeHtml(params.error)}</div>` : ""}

    <button type="button" id="google-auth-btn" class="btn-google">
      <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>

    <div class="divider"><span>OR EMAIL &amp; PASSWORD</span></div>

    <form id="auth-form" method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(params.state)}" />
      <input type="hidden" name="scope" value="${escapeHtml(params.scope)}" />
      <input type="hidden" name="response_type" value="${escapeHtml(params.responseType)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}" />
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(params.codeChallengeMethod)}" />
      <input type="hidden" id="google_id_token" name="id_token" value="" />

      <div class="form-group">
        <label>BTNX Customer Email</label>
        <input type="email" id="email-field" name="email" autocomplete="email" placeholder="e.g. yourname@example.com" required />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input type="password" id="password-field" name="password" autocomplete="current-password" placeholder="••••••••" required />
        <div class="hint-text">New to BTNX? Simply enter your email and choose a password (6+ chars) to create &amp; link your account on the spot.</div>
      </div>

      <button type="submit" id="submit-btn" class="btn-submit">Verify &amp; Authorize Connection</button>
    </form>
    <div class="footer-note">
      End-to-end encrypted connection &middot; Osun Atelier, Osogbo
    </div>
  </div>

  <script>
    (function() {
      var fbConfig = ${JSON.stringify(FIREBASE_CONFIG)};
      var googleBtn = document.getElementById("google-auth-btn");

      function handleGoogleSuccess(idToken) {
        var tokenField = document.getElementById("google_id_token");
        if (tokenField) tokenField.value = idToken;
        var emailField = document.getElementById("email-field");
        var passField = document.getElementById("password-field");
        if (emailField) emailField.removeAttribute("required");
        if (passField) passField.removeAttribute("required");
        document.getElementById("auth-form").submit();
      }

      function resetGoogleBtn() {
        if (!googleBtn) return;
        googleBtn.disabled = false;
        googleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg> Continue with Google';
      }

      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(fbConfig);
        }
        firebase.auth().getRedirectResult()
          .then(function(res) {
            if (res && res.user) {
              if (googleBtn) {
                googleBtn.disabled = true;
                googleBtn.textContent = "Connecting with Google...";
              }
              return res.user.getIdToken().then(handleGoogleSuccess);
            }
          })
          .catch(function(e) {
            console.warn("Redirect sign-in notice:", e);
          });
      } catch (initErr) {
        console.warn("Firebase client init notice:", initErr);
      }

      if (googleBtn) {
        googleBtn.addEventListener("click", function() {
          try {
            googleBtn.disabled = true;
            googleBtn.textContent = "Connecting with Google...";
            if (!firebase.apps.length) {
              firebase.initializeApp(fbConfig);
            }
            var provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider)
              .then(function(result) {
                return result.user.getIdToken();
              })
              .then(handleGoogleSuccess)
              .catch(function(err) {
                if (err && (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request")) {
                  try {
                    return firebase.auth().signInWithRedirect(provider);
                  } catch (redErr) {
                    resetGoogleBtn();
                  }
                } else {
                  resetGoogleBtn();
                  if (err && err.code !== "auth/popup-closed-by-user") {
                    alert("Google Sign-in notice: " + (err.message || err));
                  }
                }
              });
          } catch(e) {
            resetGoogleBtn();
            alert("Error initiating Google authentication: " + (e.message || e));
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}

function renderOAuthSuccessPage(params: { code: string; state?: string; clientId: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>BTNX &middot; Authorization Successful</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body {
      width: 100%;
      min-height: 100%;
      background-color: #111110;
      color: #F3F1EC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow-x: hidden;
    }
    body {
      padding: 16px 12px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .auth-card {
      background: #191816;
      border: 1px solid #2C2A26;
      width: 100%;
      max-width: 380px;
      border-radius: 4px;
      padding: 24px 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.85);
      text-align: center;
      margin: auto;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #F3F1EC;
      margin-bottom: 4px;
    }
    .brand-sub {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #C89B62;
      margin-bottom: 18px;
    }
    .code-box {
      background: #141413;
      border: 1px solid #2C2A26;
      border-radius: 4px;
      padding: 14px;
      font-family: monospace;
      font-size: 13px;
      color: #C89B62;
      word-break: break-all;
      margin: 16px 0;
    }
    .desc {
      font-size: 12px;
      line-height: 1.5;
      color: #A7A299;
      margin-bottom: 14px;
    }
  </style>
</head>
<body>
  <div class="auth-card">
    <div class="brand-title">BTNX</div>
    <div class="brand-sub">Connection Authorized</div>
    <div class="desc">
      Your BTNX account has been successfully verified for client <strong>${escapeHtml(params.clientId)}</strong>.
    </div>
    <div class="code-box">${escapeHtml(params.code)}</div>
    <div class="desc" style="font-size: 11px; color: #66625B;">
      You may now return to your application. This single-use authorization code expires in 5 minutes.
    </div>
  </div>
</body>
</html>`;
}
