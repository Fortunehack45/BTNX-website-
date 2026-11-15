import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import { db } from "./firebase.js";
import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { processWhatsAppMessage } from "./services/whatsapp.js";
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
const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 4002;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// Serve official BTNX Brand Vectors & Icons
app.get("/logo.svg", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "btnx-logo.svg")));
app.get("/btnx-logo.svg", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "btnx-logo.svg")));
app.get("/logo.png", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "favicon-512x512.png")));

// Standalone Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "BTNX WhatsApp Bot & Cloud API Webhook (Standalone)",
    webhookEndpoint: "/api/whatsapp/webhook",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Meta WhatsApp Cloud API verification handshake
app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken || !token || !challenge) {
    return res.status(403).send("Forbidden: WHATSAPP_VERIFY_TOKEN not configured or invalid challenge.");
  }

  const tokenBuf = Buffer.from(String(token));
  const expectedBuf = Buffer.from(verifyToken);
  if (mode === "subscribe" && tokenBuf.length === expectedBuf.length && crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
    console.log("[BTNX WhatsApp] Webhook verified successfully with Meta Cloud API.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Meta WhatsApp Cloud API incoming message handler
app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
  try {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("[WhatsApp] Webhook rejected: META_APP_SECRET is not configured. Fail-closed.");
      return res.status(500).json({ error: "Server security configuration incomplete: META_APP_SECRET required." });
    }

    const sigHeader = (req.headers["x-hub-signature-256"] || "") as string;
    if (!sigHeader.startsWith("sha256=")) {
      console.warn("[WhatsApp] Webhook rejected: missing or malformed x-hub-signature-256 header.");
      return res.status(401).json({ error: "Missing or malformed signature header." });
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSig = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const providedSig = sigHeader.slice(7);

    const sigBuf = Buffer.from(providedSig, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.warn("[WhatsApp] Webhook rejected: invalid HMAC signature.");
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    const body = req.body;
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.status(200).send("EVENT_RECEIVED");
    }

    const messageId = message.id;
    if (messageId) {
      try {
        const eventDoc = await getDoc(doc(db, "processed_webhook_events", messageId));
        if (eventDoc.exists()) {
          console.log(`[WhatsApp Webhook] Event ${messageId} already processed (idempotent ignore).`);
          return res.status(200).send("EVENT_RECEIVED");
        }
        await setDoc(doc(db, "processed_webhook_events", messageId), {
          eventId: messageId,
          processedAt: new Date().toISOString(),
          status: "success",
        });
      } catch (e: any) {
        console.warn("[WhatsApp Webhook] Idempotency record warning:", e?.message);
      }
    }

    const hostHeader = req.get("host") || "";
    const proto = req.get("x-forwarded-proto") || (hostHeader.includes("localhost") ? "http" : "https");
    const reqOrigin = `${proto}://${hostHeader}`;

    await processWhatsAppMessage({
      from: message.from,
      text: message.text?.body || "",
      senderName: value?.contacts?.[0]?.profile?.name,
      reqOrigin,
      authHeader: req.headers.authorization,
    });

    res.status(200).send("EVENT_RECEIVED");
  } catch (err: any) {
    console.error("[BTNX WhatsApp Webhook Error]", err);
    res.status(500).json({ error: "WhatsApp processing error", details: err.message });
  }
});

// Local / Postman / Dashboard Sandbox Chat Tester
app.post("/api/whatsapp/chat", async (req: Request, res: Response) => {
  try {
    const { message, phone = "2348012345678", name = "Valued Customer" } = req.body;
    const hostHeader = req.get("host") || "";
    const proto = req.get("x-forwarded-proto") || (hostHeader.includes("localhost") ? "http" : "https");
    const reqOrigin = `${proto}://${hostHeader}`;

    const result = await processWhatsAppMessage({
      from: phone,
      text: message || "Hello",
      senderName: name,
      reqOrigin,
      authHeader: req.headers.authorization,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Sandbox error", details: err.message });
  }
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

app.get("/", (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BTNX WhatsApp Cloud Bot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c0c0b; color: #f4efe6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #161615; border: 1px solid rgba(212,175,55,0.25); border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    h1 { color: #d4af37; font-size: 24px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
    p { color: #9c988f; font-size: 14px; line-height: 1.6; }
    .status { display: inline-flex; align-items: center; gap: 8px; background: rgba(34,197,94,0.1); color: #4ade80; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(34,197,94,0.3); margin-top: 16px; }
    .dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; }
  </style>
</head>
<body>
  <div class="card">
    <h1>BTNX WhatsApp Bot</h1>
    <p>Meta WhatsApp Cloud API Webhook and Luxury Concierge Service are active and listening for events.</p>
    <div class="status"><span class="dot"></span> Webhook Active: /api/whatsapp/webhook</div>
  </div>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`[BTNX WhatsApp] Standalone WhatsApp Bot running on port ${PORT}`);
  console.log(`[BTNX WhatsApp] Webhook URL: http://localhost:${PORT}/api/whatsapp/webhook`);
});
