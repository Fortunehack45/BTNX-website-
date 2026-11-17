import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import { db, auth } from "./firebase.js";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { processWhatsAppMessage } from "./services/whatsapp.js";
import { GoogleGenAI } from "@google/genai";
import {
  renderProductCardHtml,
  renderCatalogGridHtml,
  renderInvoiceHtml,
  renderTrackingStepperHtml,
  renderSupportTicketHtml,
  renderAccessDeniedHtml,
  renderNotFoundHtml,
} from "./ui/templates.js";
import { setupRemoteMcp } from "./mcp.js";
import {
  createPersonalAccessToken,
  listPersonalAccessTokens,
  revokePersonalAccessToken,
  verifySignedResourceToken,
  generateSignedResourceToken,
} from "./auth/tokens.js";
import {
  createWhatsAppLinkingChallenge,
  unlinkWhatsApp,
} from "./auth/accountLinking.js";
import { resolveAuthenticatedCustomer } from "./auth/identity.js";
import { authorizeAdmin } from "./auth/authorization.js";
import type { AuthenticatedCustomer } from "./auth/types.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../../public");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(
  express.json({
    limit: "10mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// Serve official BTNX Brand Vectors & Icons
app.get("/logo.svg", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "btnx-logo.svg")));
app.get("/btnx-logo.svg", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "btnx-logo.svg")));
app.get("/logo.png", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "favicon-512x512.png")));

// Mount Remote Model Context Protocol (MCP) Server for ChatGPT / Claude / Cursor (SSE Protocol)
setupRemoteMcp(app);

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "BTNX Store Luxury Engine & API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// 1. GET ALL PRODUCTS
app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const { category, search, pinned } = req.query;
    const snap = await getDocs(collection(db, "products"));
    let products = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    if (category && category !== "All") {
      products = products.filter(
        (p) => (p.category || "").toLowerCase() === String(category).toLowerCase()
      );
    }

    if (pinned === "true") {
      products = products.filter((p) => p.isPinnedHero);
      products.sort((a, b) => (a.heroOrder ?? 1) - (b.heroOrder ?? 1));
    }

    if (search) {
      const q = String(search).toLowerCase();
      products = products.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }

    res.json({ count: products.length, products });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch products", details: err.message });
  }
});

// 2. GET SINGLE PRODUCT
app.get("/api/products/:id", async (req: Request, res: Response) => {
  try {
    const snap = await getDoc(doc(db, "products", req.params.id));
    if (!snap.exists()) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ product: { id: snap.id, ...snap.data() } });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch product", details: err.message });
  }
});

// ==========================================
// AUTHORIZATION MIDDLEWARE
// ==========================================
export async function ensureAdminAuth(): Promise<void> {
  const admin = getFirebaseAdmin();
  if (admin.hasCredentials && admin.db) {
    return;
  }
}

async function requireCustomerAuth(req: Request, res: Response, next: () => void) {
  const customer = await resolveAuthenticatedCustomer(req as any, db);
  if (!customer) {
    return res.status(401).json({ error: "Authentication required. Please sign in with your BTNX account." });
  }
  (req as any).customer = customer;
  next();
}

async function requireAdminAuth(req: Request, res: Response, next: () => void) {
  const customer = await resolveAuthenticatedCustomer(req as any, db);
  const authRes = authorizeAdmin(customer);
  if (!authRes.authorized) {
    return res.status(403).json({ error: authRes.reason || "Administrative privilege required." });
  }
  (req as any).adminCustomer = customer;
  next();
}

// ADMIN: DELETE PRODUCT (Authority Deletion from Firestore)
app.delete("/api/admin/products/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteDoc(doc(db, "products", id));
    res.json({ success: true, message: `Product ${id} permanently removed.` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete product", details: err.message });
  }
});

// ADMIN: UPSERT PRODUCT (Authority Save to Firestore)
app.post("/api/admin/products", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const product = req.body;
    if (!product || !product.id) {
      return res.status(400).json({ error: "Product specification and ID are required" });
    }
    await setDoc(doc(db, "products", product.id), {
      ...product,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save product", details: err.message });
  }
});

// ADMIN: DELETE ORDER
app.delete("/api/admin/orders/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteDoc(doc(db, "orders", id));
    res.json({ success: true, message: `Order ${id} deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete order", details: err.message });
  }
});

// ADMIN: DELETE PROMO CODE
app.delete("/api/admin/promos/:code", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    await deleteDoc(doc(db, "promos", code));
    res.json({ success: true, message: `Promo code ${code} deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete promo", details: err.message });
  }
});

// ADMIN: DELETE SUPPORT TICKET
app.delete("/api/admin/support/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteDoc(doc(db, "support_tickets", id));
    res.json({ success: true, message: `Support ticket ${id} deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete ticket", details: err.message });
  }
});

// 3. GET HERO SLIDES
app.get("/api/hero-slides", async (_req: Request, res: Response) => {
  try {
    const q = query(collection(db, "products"), where("isPinnedHero", "==", true));
    const snap = await getDocs(q);
    const pinned = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    pinned.sort((a, b) => (a.heroOrder ?? 1) - (b.heroOrder ?? 1));

    const slides = pinned.map((p, idx) => ({
      id: `hero-${p.id}`,
      productId: p.id,
      lookNumber: p.heroLookNumber || `Look 0${idx + 1}`,
      title: p.heroHeadline || p.name,
      subtitle: p.heroSubheadline || `${p.category} · Featured Look`,
      image: p.heroImage || p.image,
      price: p.price,
    }));

    res.json({ count: slides.length, slides });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch hero slides", details: err.message });
  }
});

// 4. GET / UPDATE SHIPPING SETTINGS
app.get("/api/settings/shipping", async (_req: Request, res: Response) => {
  try {
    const snap = await getDoc(doc(db, "settings", "shipping"));
    if (snap.exists()) {
      return res.json(snap.data());
    }
    // Return baseline defaults
    res.json({
      defaultShippingFee: 3500,
      freeShippingThreshold: 150000,
      isFreeShippingGlobal: false,
      defaultDeliveryTimeline: "2–4 Business Days",
      defaultPackagingType: "Cotton Garment Box",
      defaultReturnPolicy: "14-Day Free Exchanges",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get shipping settings", details: err.message });
  }
});

app.post("/api/settings/shipping", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const settings = {
      defaultShippingFee: Number(req.body.defaultShippingFee) || 0,
      freeShippingThreshold: Number(req.body.freeShippingThreshold) || 0,
      isFreeShippingGlobal: Boolean(req.body.isFreeShippingGlobal),
      defaultDeliveryTimeline: req.body.defaultDeliveryTimeline || "2–4 Business Days",
      defaultPackagingType: req.body.defaultPackagingType || "Cotton Garment Box",
      defaultReturnPolicy: req.body.defaultReturnPolicy || "14-Day Free Exchanges",
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "settings", "shipping"), settings);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update shipping settings", details: err.message });
  }
});

// 5. PROMOS & VALIDATION (FETCHED FROM FIRESTORE DATABASE)
app.get("/api/promos", async (_req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(db, "promoCodes"));
    const promos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p: any) => p.isActive !== false && (!p.expiresAt || new Date(p.expiresAt) > new Date()));
    res.json({ promos });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch promos", details: err?.message, promos: [] });
  }
});

app.post("/api/promos/validate", async (req: Request, res: Response) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ valid: false, error: "Code is required" });

    const q = query(collection(db, "promoCodes"), where("code", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) {
      return res.status(404).json({ valid: false, error: "Promo code not found" });
    }

    const promo = snap.docs[0].data();
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return res.status(400).json({ valid: false, error: "Promo code has expired" });
    }
    if (promo.isActive === false) {
      return res.status(400).json({ valid: false, error: "Promo code is inactive" });
    }

    const discountPercentage = Number(promo.discountPercentage || promo.percentage || 0);
    res.json({ valid: true, code, discountPercentage });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// 6. CREATE ORDER
app.post("/api/orders", async (req: Request, res: Response) => {
  try {
    const { items, customer, promoCode, notes, userId } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one item." });
    }

    let subtotal = 0;
    for (const it of items) {
      const price = Number(it.price || it.product?.price || 0);
      const qty = Number(it.quantity || 1);
      subtotal += price * qty;
    }

    // Dynamic promo validation from Firestore
    let discountPct = 0;
    if (promoCode) {
      const cleanCode = String(promoCode).trim().toUpperCase();
      const q = query(collection(db, "promoCodes"), where("code", "==", cleanCode));
      const pSnap = await getDocs(q);
      if (!pSnap.empty) {
        const pData = pSnap.docs[0].data();
        if (pData.isActive !== false && (!pData.expiresAt || new Date(pData.expiresAt) > new Date())) {
          discountPct = Number(pData.discountPercentage || pData.percentage || 0) / 100;
        }
      }
    }

    // Shipping calculation
    const shippingSnap = await getDoc(doc(db, "settings", "shipping"));
    const shipping = shippingSnap.exists()
      ? shippingSnap.data()
      : { defaultShippingFee: 3500, freeShippingThreshold: 150000, isFreeShippingGlobal: false };

    const discountAmount = subtotal * discountPct;
    const isFreeShipping = shipping.isFreeShippingGlobal || subtotal >= shipping.freeShippingThreshold;
    const shippingFee = isFreeShipping ? 0 : Number(shipping.defaultShippingFee || 3500);
    const total = Math.max(0, subtotal - discountAmount) + shippingFee;

    const orderId = `BTNX-${Date.now().toString().slice(-6)}`;
    const resolvedUserId = userId || customer?.userId || undefined;

    const orderRecord = {
      id: orderId,
      userId: resolvedUserId,
      customerEmail: customer?.email || "guest@btnx.store",
      customerName: customer?.name || "Guest Client",
      customerPhone: customer?.phone || "",
      shippingAddress: customer?.address || customer?.shippingAddress || "",
      items: items.map((it) => ({
        product: it.product || { id: it.productId, name: it.name, price: it.price },
        quantity: it.quantity || 1,
        size: it.size || "M",
        color: it.color || "Black",
      })),
      subtotal,
      discountAmount,
      shippingFee,
      total,
      status: "Processing",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      createdAt: new Date().toISOString(),
      customer: customer || { email: "guest@btnx.com", name: "Guest Client" },
      notes: notes || undefined,
    };

    await setDoc(doc(db, "orders", orderId), orderRecord);

    const signedInvoice = generateSignedResourceToken(orderId, "invoice", 7 * 24 * 3600);
    const signedTrack = generateSignedResourceToken(orderId, "track", 7 * 24 * 3600);

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: orderRecord,
      invoiceUrl: `/render/invoice/${orderId}?sig=${signedInvoice.sig}&exp=${signedInvoice.exp}`,
      trackingUrl: `/render/track/${orderId}?sig=${signedTrack.sig}&exp=${signedTrack.exp}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create order", details: err.message });
  }
});

// 7. GET ORDER STATUS
app.get("/api/orders/:id", async (req: Request, res: Response) => {
  try {
    const snap = await getDoc(doc(db, "orders", req.params.id));
    if (!snap.exists()) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ order: snap.data() });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch order", details: err.message });
  }
});

// 8. AI BODY FIT & SIZING ADVISOR
app.post("/api/ai/advisor", async (req: Request, res: Response) => {
  try {
    const { height, weight, bodyType, stylePreference, productName } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      const ai = new GoogleGenAI({ apiKey });
      const prompt =
        `You are the master tailor and fit consultant for BTNX luxury fashion house. ` +
        `Customer profile: Height: ${height || "5'10\""}, Weight: ${weight || "75kg"}, Body Type: ${bodyType || "Athletic"}, Style Preference: ${stylePreference || "Relaxed drape"}. ` +
        `Target piece: ${productName || "BTNX Signature Overshirt/Overcoat"}. ` +
        `Provide a clear size recommendation (S, M, L, or XL), why it fits their proportions, and 2 styling tips in concise, luxurious tone.`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return res.json({
        recommendation: aiRes.text,
        recommendedSize: "M",
      });
    }

    // Deterministic fallback sizing algorithm
    const weightNum = parseFloat(String(weight || "72"));
    let rec = "M";
    if (weightNum < 65) rec = "S";
    else if (weightNum >= 65 && weightNum <= 78) rec = "M";
    else if (weightNum > 78 && weightNum <= 90) rec = "L";
    else rec = "XL";

    res.json({
      recommendedSize: rec,
      recommendation:
        `Based on your build (${weight || "75kg"}, ${height || "5'10\""}), we recommend Size ${rec} for a structured, contemporary silhouette with effortless drape. Layer comfortably over tees or lightweight knitwear.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Fit advisor unavailable", details: err.message });
  }
});

// 9. WHATSAPP WEBHOOK & CHAT ENDPOINT
// Meta WhatsApp Cloud API verification handshake
app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("[BTNX WhatsApp] WHATSAPP_VERIFY_TOKEN environment variable is not configured.");
    return res.status(403).send("Verification token not configured");
  }

  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
  try {
    // Cryptographic validation of webhook payload from Meta
    if (process.env.META_APP_SECRET) {
      const signature = (req.headers["x-hub-signature-256"] || "") as string;
      if (!signature) {
        return res.status(401).json({ error: "Missing x-hub-signature-256 header" });
      }
      const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
      const expectedSig = "sha256=" + crypto.createHmac("sha256", process.env.META_APP_SECRET).update(rawBody).digest("hex");
      if (
        signature.length !== expectedSig.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
      ) {
        return res.status(403).json({ error: "Invalid webhook HMAC signature" });
      }
    }

    // Supports Twilio (From, Body) or Meta Cloud API format or generic JSON
    const from = req.body.From || req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || req.body.from || "guest";
    const text = req.body.Body || req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || req.body.text || "";
    const senderName = req.body.ProfileName || req.body.senderName || "Client";

    const reqOrigin = `${req.protocol}://${req.get("host")}`;
    const result = await processWhatsAppMessage({
      from,
      text,
      senderName,
      authHeader: req.headers.authorization,
      reqOrigin,
    });

    // Respond in Twilio TwiML or standard JSON depending on caller
    if (req.body.From) {
      res.setHeader("Content-Type", "text/xml");
      const escapedText = result.replyText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const mediaTag = result.mediaUrl ? `<Media>${result.mediaUrl}</Media>` : "";
      return res.send(
        `<Response><Message><Body>${escapedText}</Body>${mediaTag}</Message></Response>`
      );
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "WhatsApp processing error", details: err.message });
  }
});

// Direct test chat endpoint for local development testing only
app.post("/api/whatsapp/chat", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Chat simulation endpoint is disabled in production." });
  }

  try {
    const { from, customerId, text, message, senderName } = req.body;
    const reqOrigin = `${req.protocol}://${req.get("host")}`;
    const result = await processWhatsAppMessage({
      from: from || customerId || "test-user-1",
      text: text || message || "hi",
      senderName: senderName || "Test Client",
      authHeader: req.headers.authorization,
      reqOrigin,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Chat failed", details: err.message });
  }
});

// ==========================================
// CUSTOMER SUPPORT TICKET API
// ==========================================
app.post("/api/support/ticket", async (req: Request, res: Response) => {
  try {
    const { customerName, customerEmail, customerPhone, topic, message, orderId } = req.body;
    const ticketId = `TCK-${Date.now().toString().slice(-6)}`;
    const ticket = {
      id: ticketId,
      customerName: customerName || "Shopper",
      customerEmail: customerEmail || "client@btnx.store",
      customerPhone: customerPhone || "",
      topic: topic || "Client Care Assistance",
      orderId: orderId || undefined,
      status: "open",
      mode: "bot",
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: "client",
          text: message || "Hello BTNX Care Desk, I need assistance.",
          timestamp: new Date().toISOString(),
        },
        {
          id: `msg-${Date.now() + 1}`,
          sender: "bot",
          senderName: "BTNX Support Bot",
          text: `Thank you for reaching out, ${customerName || "valued client"}. Your ticket #${ticketId} has been opened at our Osun desk. An agent is reviewing your inquiry.`,
          timestamp: new Date(Date.now() + 500).toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "supportTickets", ticketId), ticket);
    } catch (e: any) {
      console.warn("[BTNX Support] Cloud save notice:", e.message);
    }

    res.json({
      success: true,
      ticketId,
      message: `Support ticket #${ticketId} registered with BTNX Client Care.`,
      ticket,
      uiUrl: `http://localhost:${PORT}/render/support/${ticketId}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create support ticket", details: err.message });
  }
});

app.get("/api/support/ticket/:id", async (req: Request, res: Response) => {
  const ticketId = req.params.id;
  try {
    const snap = await getDoc(doc(db, "supportTickets", ticketId));
    if (snap.exists()) {
      return res.json({ id: snap.id, ...snap.data() });
    }
  } catch {}
  res.json({
    id: ticketId,
    status: "open",
    mode: "bot",
    topic: "Client Care Assistance",
    messages: [
      { sender: "client", text: "Inquiry registered with BTNX Client Care." },
      { sender: "bot", text: "Our Osun support team has your request in queue." },
    ],
  });
});

// Helper function to extract request host origin
function getHostOrigin(req: Request): string {
  const forwardedHost = req.get("x-forwarded-host");
  const host = forwardedHost || req.get("host") || "";
  const proto = req.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 10. PRODUCT SOCIAL SHARING & OPENGRAPH PREVIEWS
// Serves dynamic preview metadata so WhatsApp, Twitter, iMessage display the real product picture
async function handleProductShare(req: Request, res: Response) {
  const prodId = req.params.id || (req.query.product as string);
  const hostOrigin = getHostOrigin(req);

  let prod: any = null;
  const variations = Array.from(new Set([
    prodId,
    prodId.toLowerCase(),
    prodId.startsWith("ny-") ? prodId : `ny-${prodId}`,
    prodId.replace(/^ny-/i, ""),
  ])).filter(Boolean);

  try {
    const admin = getFirebaseAdmin();
    if (admin.hasCredentials && admin.db) {
      for (const vid of variations) {
        const snap = await admin.db.collection("products").doc(vid).get();
        if (snap.exists) {
          prod = { id: snap.id, ...snap.data() };
          break;
        }
      }
      if (!prod) {
        for (const vid of variations) {
          const qSnap = await admin.db.collection("products").where("id", "==", vid).limit(1).get();
          if (!qSnap.empty) {
            prod = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
            break;
          }
        }
      }
    }
  } catch {}

  if (!prod) {
    try {
      for (const vid of variations) {
        const snap = await getDoc(doc(db, "products", vid));
        if (snap.exists()) {
          prod = { id: snap.id, ...snap.data() };
          break;
        }
      }
    } catch {}
  }

  if (!prod) {
    res.status(404).send("Product not found in BTNX database");
    return;
  }

  // Determine absolute image URL for WhatsApp / Social Meta tags
  // WhatsApp strictly requires images to be under 300KB and directly accessible over HTTP(S)
  const rawImage = prod.image || (Array.isArray(prod.images) && prod.images[0]) || "";
  let absoluteImageUrl = `${hostOrigin}/og/${encodeURIComponent(prod.id)}.jpg`;
  if (rawImage && !rawImage.startsWith("/og/")) {
    if (rawImage.startsWith("data:")) {
      absoluteImageUrl = `${hostOrigin}/api/product-image/${encodeURIComponent(prod.id)}`;
    } else if (rawImage.startsWith("http")) {
      absoluteImageUrl = rawImage;
    } else {
      absoluteImageUrl = `${hostOrigin}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;
    }
  }

  const pageUrl = `${hostOrigin}/?product=${encodeURIComponent(prod.id)}`;
  const title = `${prod.name} — BTNX Store`;
  const formattedPrice = "₦" + Number(prod.price || 0).toLocaleString("en-NG");
  const description = `${formattedPrice} · ${prod.category || "Luxury Apparel"}. ${prod.description || "Crafted by BTNX Atelier with express delivery across Nigeria."}`;

  const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- OpenGraph Metadata for WhatsApp, iMessage, Facebook, Telegram -->
  <meta property="og:site_name" content="BTNX Store" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(absoluteImageUrl)}" />
  <meta property="og:image:url" content="${escapeHtml(absoluteImageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(absoluteImageUrl)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="800" />
  <meta property="og:image:height" content="800" />
  <meta property="og:image:alt" content="${escapeHtml(prod.name)}" />
  <link rel="image_src" href="${escapeHtml(absoluteImageUrl)}" />

  <!-- Twitter Card Metadata -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(absoluteImageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(prod.name)}" />

  <!-- Instant Browser Redirect for Real Users (Skip bots like WhatsApp / Facebook / Twitter) -->
  <script>
    var isBot = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Pinterest|Googlebot/i.test(navigator.userAgent);
    if (!isBot && !window.location.search.includes('noredirect=1')) {
      window.location.replace('${pageUrl}');
    }
  </script>
</head>
<body style="margin: 0; background-color: #FAF9F7; color: #141413; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px;">
  <div style="max-width: 440px; width: 100%; background: #ffffff; border: 1px solid #E6E2DA; padding: 28px; text-align: center; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
    <img src="${escapeHtml(absoluteImageUrl)}" alt="${escapeHtml(prod.name)}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; margin-bottom: 20px; border-radius: 2px;" />
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #966830; font-weight: 600; margin-bottom: 6px;">${escapeHtml(prod.category)}</div>
    <h1 style="font-size: 22px; margin: 0 0 8px 0; font-weight: 600; line-height: 1.2;">${escapeHtml(prod.name)}</h1>
    <p style="font-size: 18px; font-weight: 700; color: #141413; margin: 0 0 20px 0; font-family: monospace;">${escapeHtml(formattedPrice)}</p>
    <a href="${pageUrl}" style="display: block; width: 100%; padding: 14px; background: #141413; color: #FAF9F7; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600; border-radius: 2px;">
      View Piece on BTNX Store &rarr;
    </a>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.send(html);
}

// Binary image streamer for uploaded base64 data images
app.get("/api/product-image/:id", async (req: Request, res: Response) => {
  const prodId = req.params.id;
  try {
    let prod: any = null;
    const snap = await getDoc(doc(db, "products", prodId));
    if (snap.exists()) {
      prod = { id: snap.id, ...snap.data() };
    }

    if (!prod || !prod.image) {
      return res.redirect("/btnx-og-preview.jpg");
    }

    if (prod.image.startsWith("data:")) {
      const match = prod.image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        return res.send(buffer);
      }
    }

    if (prod.image.startsWith("http")) {
      return res.redirect(prod.image);
    }

    return res.redirect(prod.image);
  } catch (err: any) {
    res.redirect("/btnx-og-preview.jpg");
  }
});

// Dynamic OpenGraph Image Handler
app.get(["/og/:id", "/og/:id.jpg"], async (req: Request, res: Response) => {
  const prodId = req.params.id.replace(/\.jpg|\.png|\.webp/i, "").trim();
  try {
    // 1. Check if a real binary JPG image file exists on disk
    const candidateFileNames = [`${prodId}.jpg`, `${prodId.replace("ny-", "")}.jpg`, "ny-1.jpg", "og-preview.jpg", "btnx-og-preview.jpg"];
    const candidateDirs = [
      path.resolve(process.cwd(), "public/og"),
      path.resolve(process.cwd(), "mcp/public/og"),
      path.resolve(process.cwd(), "og"),
      path.resolve(process.cwd(), "public")
    ];

    for (const cDir of candidateDirs) {
      for (const fName of candidateFileNames) {
        try {
          const fullP = path.join(cDir, fName);
          if (fs.existsSync(fullP) && !fs.statSync(fullP).isDirectory()) {
            res.setHeader("Content-Type", "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=604800");
            return res.sendFile(fullP);
          }
        } catch {}
      }
    }

    let prod: any = null;
    const snap = await getDoc(doc(db, "products", prodId));
    if (snap.exists()) {
      prod = { id: snap.id, ...snap.data() };
    }

    if (prod?.image) {
      if (prod.image.startsWith("http") && !prod.image.includes("/og/")) {
        return res.redirect(prod.image);
      }
      if (prod.image.startsWith("data:")) {
        const match = prod.image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          res.setHeader("Content-Type", match[1]);
          res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
          return res.send(Buffer.from(match[2], "base64"));
        }
      }
    }

    const prodName = prod?.name || "BTNX Luxury Piece";
    const prodCat = prod?.category || "Atelier Collection";
    const prodPrice = prod?.price ? ("₦" + Number(prod.price).toLocaleString("en-NG")) : "₦75,000";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#141413"/>
  <rect x="40" y="40" width="1120" height="550" rx="8" stroke="#2C2A26" stroke-width="2"/>
  <text x="100" y="270" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="#C89B62">${escapeHtml(prodCat.toUpperCase())} · OSUN ATELIER</text>
  <text x="100" y="360" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="700" fill="#FAF9F7">${escapeHtml(prodName)}</text>
  <text x="100" y="450" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="42" font-weight="800" fill="#E6C08A">${prodPrice}</text>
  <text x="100" y="530" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" letter-spacing="2" fill="#A7A299">NATIONWIDE NIGERIA DISPATCH · 100% AUTHENTIC ATELIER COLLECTION</text>
</svg>`;

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.send(svg);
  } catch (err: any) {
    return res.redirect("/btnx-og-preview.jpg");
  }
});

// Dynamic Social Share Routes
app.get("/product/:id", handleProductShare);
app.get("/p/:id", handleProductShare);
app.get("/share/product/:id", handleProductShare);

// Intercept root GET when ?product= is present
app.get("/", (req: Request, res: Response, next) => {
  if (req.query.product) {
    return handleProductShare(req, res);
  }
  next();
});

// ==========================================
// RICH UI VISUAL RENDER ENDPOINTS (BTNX LUXURY THEME)
// ==========================================
app.get("/render/product/:id", async (req: Request, res: Response) => {
  const prodId = req.params.id;
  try {
    const snap = await getDoc(doc(db, "products", prodId));
    if (!snap.exists()) {
      return res.status(404).send("Product not found in BTNX database.");
    }
    const prod = { id: snap.id, ...snap.data() };
    res.setHeader("Content-Type", "text/html");
    res.send(renderProductCardHtml(prod));
  } catch (err: any) {
    res.status(500).send("Database error retrieving product: " + (err?.message || err));
  }
});

app.get("/render/products", async (_req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(db, "products"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.setHeader("Content-Type", "text/html");
    res.send(renderCatalogGridHtml(list));
  } catch (err: any) {
    res.status(500).send("Database error retrieving catalog: " + (err?.message || err));
  }
});

app.get("/render/invoice/:orderId", async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  try {
    const sig = (req.query.sig || "") as string;
    const exp = (req.query.exp || "") as string;
    let isAuthorized = false;

    if (sig && exp) {
      const token = `${sig}.${exp}`;
      if (verifySignedResourceToken(token, "invoice", orderId)) {
        isAuthorized = true;
      }
    }

    const customer = await resolveAuthenticatedCustomer(req as any, db);

    const snap = await getDoc(doc(db, "orders", orderId));
    if (!snap.exists()) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(404).send(renderNotFoundHtml("Invoice", orderId));
    }

    const orderData: any = { id: snap.id, ...snap.data() };

    const isOwner = customer && (
      customer.role === "admin" ||
      customer.uid === orderData.userId ||
      customer.email?.toLowerCase() === (orderData.customerEmail || orderData.userEmail)?.toLowerCase()
    );

    if (!isAuthorized && !isOwner) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(403).send(
        renderAccessDeniedHtml("Access to this private invoice requires verified authorization or an active signed link from your BTNX account.")
      );
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(renderInvoiceHtml(orderData));
  } catch (err: any) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(renderNotFoundHtml("Invoice", orderId));
  }
});

app.get("/render/track/:orderId", async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  try {
    const sig = (req.query.sig || "") as string;
    const exp = (req.query.exp || "") as string;
    let isAuthorized = false;

    if (sig && exp) {
      const token = `${sig}.${exp}`;
      if (verifySignedResourceToken(token, "track", orderId)) {
        isAuthorized = true;
      }
    }

    const customer = await resolveAuthenticatedCustomer(req as any, db);

    const snap = await getDoc(doc(db, "orders", orderId));
    if (!snap.exists()) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(404).send(renderNotFoundHtml("Parcel Tracking", orderId));
    }

    const orderData: any = { id: snap.id, ...snap.data() };

    const isOwner = customer && (
      customer.role === "admin" ||
      customer.uid === orderData.userId ||
      customer.email?.toLowerCase() === (orderData.customerEmail || orderData.userEmail)?.toLowerCase()
    );

    if (!isAuthorized && !isOwner) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(403).send(
        renderAccessDeniedHtml("Access to this parcel tracking record requires verified authorization or an active signed link from your BTNX account.")
      );
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(renderTrackingStepperHtml(orderData));
  } catch (err: any) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(renderNotFoundHtml("Parcel Tracking", orderId));
  }
});

app.get("/render/support/:ticketId", async (req: Request, res: Response) => {
  const ticketId = req.params.ticketId;
  try {
    const snap = await getDoc(doc(db, "supportTickets", ticketId));
    if (snap.exists()) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(renderSupportTicketHtml({ id: snap.id, ...snap.data() }));
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(404).send(renderNotFoundHtml("Support Ticket", ticketId));
  } catch {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(renderNotFoundHtml("Support Ticket", ticketId));
  }
});

// ==========================================
// USER PROFILE MANAGEMENT
// ==========================================
app.post("/api/user/profile", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customer = (req as any).customer as AuthenticatedCustomer;
    const profileUpdate: any = {
      updatedAt: new Date().toISOString(),
    };
    if (typeof req.body?.name === "string") profileUpdate.name = req.body.name.trim();
    if (typeof req.body?.phone === "string") profileUpdate.phone = req.body.phone.trim();
    if (typeof req.body?.birthday === "string") profileUpdate.birthday = req.body.birthday.trim();
    if (typeof req.body?.shippingStreet === "string") profileUpdate.shippingStreet = req.body.shippingStreet.trim();
    if (typeof req.body?.shippingCity === "string") profileUpdate.shippingCity = req.body.shippingCity.trim();
    if (typeof req.body?.shippingZip === "string") profileUpdate.shippingZip = req.body.shippingZip.trim();
    if (typeof req.body?.shippingCountry === "string") profileUpdate.shippingCountry = req.body.shippingCountry.trim();

    const admin = getFirebaseAdmin();
    if (admin.hasCredentials && admin.db) {
      await admin.db.collection("users").doc(customer.uid).set(profileUpdate, { merge: true });
    } else {
      await setDoc(doc(db, "users", customer.uid), profileUpdate, { merge: true });
    }

    res.json({ success: true, profile: profileUpdate });
  } catch (err: any) {
    console.error("[Profile Save API Error]:", err);
    res.status(500).json({ error: "Failed to save profile", details: err?.message || String(err) });
  }
});

// ==========================================
// USER AUTHENTICATED MCP TOKEN & WHATSAPP MANAGEMENT
// ==========================================
app.post("/api/user/mcp-token/create", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    await ensureAdminAuth();
    const customer = (req as any).customer as AuthenticatedCustomer;
    const name = req.body.name || "Personal AI Key";
    const expiresIn = req.body.expiresIn ?? "30d";
    let ttlDays = 30;
    if (expiresIn === "never" || expiresIn === 0 || expiresIn === null) {
      ttlDays = 0;
    } else if (expiresIn === "7d") {
      ttlDays = 7;
    } else if (expiresIn === "30d") {
      ttlDays = 30;
    } else if (expiresIn === "90d") {
      ttlDays = 90;
    } else if (expiresIn === "1y" || expiresIn === "365d") {
      ttlDays = 365;
    } else if (typeof expiresIn === "number") {
      ttlDays = expiresIn;
    }

    const tokenResult = await createPersonalAccessToken(
      db,
      customer.uid,
      name,
      ["orders:read", "invoices:read", "tracking:read"],
      ttlDays
    );

    // Update customer doc to reflect connected MCP status
    try {
      await setDoc(doc(db, "users", customer.uid), {
        connectedMcp: true,
        lastMcpActiveAt: new Date().toISOString(),
      }, { merge: true });
    } catch {}

    res.json({
      success: true,
      token: tokenResult.rawToken,
      id: tokenResult.record.id,
      name: tokenResult.record.name,
      createdAt: tokenResult.record.createdAt,
      expiresAt: tokenResult.record.expiresAt,
      maskedToken: "btnx_pat_••••••••" + tokenResult.record.id.slice(-4),
    });
  } catch (err: any) {
    console.error("[MCP PAT Create Error]", err);
    res.status(500).json({ error: "Failed to generate MCP Personal Access Token", details: err?.message || String(err) });
  }
});

app.get("/api/user/mcp-token/list", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    await ensureAdminAuth();
    const customer = (req as any).customer as AuthenticatedCustomer;
    const tokens = await listPersonalAccessTokens(db, customer.uid);
    res.json({ success: true, tokens });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list MCP tokens", details: err?.message || String(err) });
  }
});

app.post("/api/user/mcp-token/revoke", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    await ensureAdminAuth();
    const customer = (req as any).customer as AuthenticatedCustomer;
    const { tokenId } = req.body;
    if (!tokenId) {
      return res.status(400).json({ error: "Token ID is required" });
    }
    await revokePersonalAccessToken(db, customer.uid, tokenId);
    res.json({ success: true, message: "Token successfully revoked." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to revoke MCP token", details: err?.message || String(err) });
  }
});

app.post("/api/user/whatsapp/challenge", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customer = (req as any).customer as AuthenticatedCustomer;
    const challenge = await createWhatsAppLinkingChallenge(db, customer.uid);
    res.json({
      success: true,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      instructions: `Send "LINK ${challenge.code}" to the official BTNX WhatsApp number within 10 minutes to verify your account.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create WhatsApp linking code", details: err.message });
  }
});

app.post("/api/user/whatsapp/unlink", requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customer = (req as any).customer as AuthenticatedCustomer;
    await unlinkWhatsApp(db, customer.uid);
    res.json({ success: true, message: "WhatsApp identity unlinked successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to unlink WhatsApp", details: err.message });
  }
});

if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[BTNX API] Luxury Store Server running on http://localhost:${PORT}`);
    console.log(`[BTNX API] Endpoints ready: /api/products, /api/hero-slides, /api/orders, /api/whatsapp/webhook`);
    console.log(`[BTNX Remote MCP] SSE Endpoint ready: http://localhost:${PORT}/sse (Dashboard: http://localhost:${PORT}/mcp)`);
  });
}

export default app;
