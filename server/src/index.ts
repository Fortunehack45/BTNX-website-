import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
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
} from "./ui/templates.js";
import { NEW_YEAR_PRODUCTS } from "./ui/productsData.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../../public");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// Serve official BTNX Brand Vectors & Icons
app.get("/logo.svg", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "btnx-logo.svg")));
app.get("/btnx-logo.svg", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "btnx-logo.svg")));
app.get("/logo.png", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "favicon-512x512.png")));

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

app.post("/api/settings/shipping", async (req: Request, res: Response) => {
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

// 5. PROMOS & VALIDATION
app.get("/api/promos", async (_req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(db, "promoCodes"));
    const promos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ promos });
  } catch {
    res.json({
      promos: [
        { code: "BTNX50", discountPercentage: 50, expiresAt: "2027-12-31" },
        { code: "KLAMBY50", discountPercentage: 50, expiresAt: "2027-12-31" },
      ],
    });
  }
});

app.post("/api/promos/validate", async (req: Request, res: Response) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ valid: false, error: "Code is required" });

    if (code === "BTNX50" || code === "KLAMBY50") {
      return res.json({ valid: true, code, discountPercentage: 50 });
    }

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

    res.json({ valid: true, code, discountPercentage: promo.discountPercentage || 0 });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// 6. CREATE ORDER
app.post("/api/orders", async (req: Request, res: Response) => {
  try {
    const { items, customer, promoCode, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one item." });
    }

    let subtotal = 0;
    for (const it of items) {
      const price = Number(it.price || it.product?.price || 0);
      const qty = Number(it.quantity || 1);
      subtotal += price * qty;
    }

    // Check promo
    let discountPct = 0;
    if (promoCode && (promoCode.toUpperCase() === "BTNX50" || promoCode.toUpperCase() === "KLAMBY50")) {
      discountPct = 0.5;
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
    const orderRecord = {
      id: orderId,
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

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: orderRecord,
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
app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
  try {
    // Supports Twilio (From, Body) or Meta Cloud API format or generic JSON
    const from = req.body.From || req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || req.body.from || "guest";
    const text = req.body.Body || req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || req.body.text || "";
    const senderName = req.body.ProfileName || req.body.senderName || "Client";

    const result = await processWhatsAppMessage({ from, text, senderName });

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

// Direct test chat endpoint for web/cURL testing
app.post("/api/whatsapp/chat", async (req: Request, res: Response) => {
  try {
    const { from, customerId, text, message, senderName } = req.body;
    const result = await processWhatsAppMessage({
      from: from || customerId || "test-user-1",
      text: text || message || "hi",
      senderName: senderName || "Test Client",
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

// ==========================================
// RICH UI VISUAL RENDER ENDPOINTS (BTNX LUXURY THEME)
// ==========================================
app.get("/render/product/:id", async (req: Request, res: Response) => {
  const prodId = req.params.id;
  try {
    const snap = await getDoc(doc(db, "products", prodId));
    const prod = snap.exists() ? { id: snap.id, ...snap.data() } : NEW_YEAR_PRODUCTS.find((p) => p.id === prodId) || NEW_YEAR_PRODUCTS[0];
    res.setHeader("Content-Type", "text/html");
    res.send(renderProductCardHtml(prod));
  } catch {
    const prod = NEW_YEAR_PRODUCTS.find((p) => p.id === prodId) || NEW_YEAR_PRODUCTS[0];
    res.setHeader("Content-Type", "text/html");
    res.send(renderProductCardHtml(prod));
  }
});

app.get("/render/products", async (_req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(db, "products"));
    const list = snap.docs.length ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : NEW_YEAR_PRODUCTS;
    res.setHeader("Content-Type", "text/html");
    res.send(renderCatalogGridHtml(list));
  } catch {
    res.setHeader("Content-Type", "text/html");
    res.send(renderCatalogGridHtml(NEW_YEAR_PRODUCTS));
  }
});

app.get("/render/invoice/:orderId", async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (snap.exists()) {
      res.setHeader("Content-Type", "text/html");
      return res.send(renderInvoiceHtml({ id: snap.id, ...snap.data() }));
    }
  } catch {}
  res.setHeader("Content-Type", "text/html");
  res.send(
    renderInvoiceHtml({
      id: orderId,
      customerName: "Valued Client",
      total: 185000,
      subtotal: 185000,
      status: "Processing",
      items: [{ product: NEW_YEAR_PRODUCTS[0], quantity: 1, size: "M", color: "Noir Black" }],
    })
  );
});

app.get("/render/track/:orderId", async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (snap.exists()) {
      res.setHeader("Content-Type", "text/html");
      return res.send(renderTrackingStepperHtml({ id: snap.id, ...snap.data() }));
    }
  } catch {}
  res.setHeader("Content-Type", "text/html");
  res.send(
    renderTrackingStepperHtml({
      id: orderId,
      status: "In Transit",
      shippingAddress: "Lekki Phase 1, Lagos State, Nigeria",
    })
  );
});

app.get("/render/support/:ticketId", async (req: Request, res: Response) => {
  const ticketId = req.params.ticketId;
  try {
    const snap = await getDoc(doc(db, "supportTickets", ticketId));
    if (snap.exists()) {
      res.setHeader("Content-Type", "text/html");
      return res.send(renderSupportTicketHtml({ id: snap.id, ...snap.data() }));
    }
  } catch {}
  res.setHeader("Content-Type", "text/html");
  res.send(
    renderSupportTicketHtml({
      id: ticketId,
      topic: "Order & Dispatch Inquiry",
      mode: "human",
      messages: [
        {
          sender: "client",
          text: "Hello! Has my piece been shipped from Osogbo yet?",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          sender: "agent",
          senderName: "Adaobi N. (Care Desk)",
          text: "Yes! Your garment was inspected and transferred to our express dispatch carrier this morning. Tracking #BX-849201.",
          timestamp: new Date().toISOString(),
        },
      ],
    })
  );
});

app.listen(PORT, () => {
  console.log(`[BTNX API] Luxury Store Server running on http://localhost:${PORT}`);
  console.log(`[BTNX API] Endpoints ready: /api/products, /api/hero-slides, /api/orders, /api/whatsapp/webhook`);
});
