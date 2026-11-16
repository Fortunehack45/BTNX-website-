import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as crypto from "crypto";
import { db } from "../server/src/firebase.js";
import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { processWhatsAppMessage } from "../server/src/services/whatsapp.js";
import { verifySignedResourceToken } from "../server/src/auth/tokens.js";
import {
  renderProductCardHtml,
  renderCatalogGridHtml,
  renderInvoiceHtml,
  renderTrackingStepperHtml,
  renderSupportTicketHtml,
} from "../server/src/ui/templates.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({
  limit: "10mb",
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "BTNX WhatsApp Bot & Webhook (Vercel Serverless)",
    webhookEndpoint: "/api/whatsapp/webhook",
    version: "2.5.0",
    timestamp: new Date().toISOString(),
  });
});

// Meta WhatsApp Cloud API verification handshake (fails closed if WHATSAPP_VERIFY_TOKEN is missing)
app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (verifyToken && mode === "subscribe" && token === verifyToken) {
    console.log("[BTNX WhatsApp] Webhook verified successfully with Meta Cloud API.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Meta WhatsApp Cloud API incoming message handler with HMAC-SHA256 signature verification
app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
  try {
    const metaAppSecret = process.env.META_APP_SECRET;
    if (!metaAppSecret) {
      console.error("[BTNX WhatsApp] META_APP_SECRET is not configured. Webhook rejected (fail-closed).");
      return res.status(500).json({ error: "Server misconfiguration: META_APP_SECRET missing" });
    }

    const signature = req.headers["x-hub-signature-256"] as string;
    if (!signature) {
      return res.status(401).json({ error: "Missing x-hub-signature-256 header" });
    }
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSig = "sha256=" + crypto.createHmac("sha256", metaAppSecret).update(rawBody).digest("hex");
    try {
      const match = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
      if (!match) return res.status(401).json({ error: "Invalid webhook signature" });
    } catch {
      return res.status(401).json({ error: "Invalid webhook signature format" });
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

// Sandbox Chat Tester — strictly disabled in production
app.post("/api/whatsapp/chat", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Sandbox chat endpoint is disabled in production." });
  }

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

// Rich Luxury HTML Renders for WhatsApp Invoices and Tracking (HMAC Token Protected)
app.get("/render/invoice/:orderId", async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const sig = String(req.query.sig || "");
  const exp = parseInt(String(req.query.exp || "0"), 10);

  if (!sig || !exp || !verifySignedResourceToken("invoice", orderId, sig, exp)) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(403).send("Access Denied: Valid signed security link required to view this invoice.");
  }

  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (snap.exists()) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(renderInvoiceHtml({ id: snap.id, ...snap.data() }));
    }
  } catch {}

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(404).send(`Order #${orderId} was not found in the BTNX database.`);
});

app.get("/render/track/:orderId", async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const sig = String(req.query.sig || "");
  const exp = parseInt(String(req.query.exp || "0"), 10);

  if (!sig || !exp || !verifySignedResourceToken("track", orderId, sig, exp)) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(403).send("Access Denied: Valid signed security link required to track this shipment.");
  }

  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    if (snap.exists()) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(renderTrackingStepperHtml({ id: snap.id, ...snap.data() }));
    }
  } catch {}

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(404).send(`Order #${orderId} was not found in the BTNX database.`);
});

app.get("/", (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BTNX WhatsApp Cloud Bot (Vercel)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c0c0b; color: #f4efe6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #161615; border: 1px solid rgba(212,175,55,0.25); border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; }
    h1 { color: #d4af37; font-size: 22px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
    p { color: #9c988f; font-size: 14px; line-height: 1.6; }
    .status { display: inline-flex; align-items: center; gap: 8px; background: rgba(34,197,94,0.1); color: #4ade80; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(34,197,94,0.3); margin-top: 16px; }
    .dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; }
  </style>
</head>
<body>
  <div class="card">
    <h1>BTNX WhatsApp Bot</h1>
    <p>Meta WhatsApp Cloud API Webhook is active and running on Vercel Serverless.</p>
    <div class="status"><span class="dot"></span> Webhook Active: /api/whatsapp/webhook</div>
  </div>
</body>
</html>`);
});

export const config = {
  maxDuration: 60,
};

export default app;
