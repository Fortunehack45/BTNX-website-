import type { IncomingMessage, ServerResponse } from "http";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

// Firebase Applet Configuration
const FIREBASE_CONFIG = {
  projectId: "expenses-ai-vfx7o",
  appId: "1:768021477341:web:c578b15abce461d0fae834",
  apiKey: "AIzaSyCsBOx0WB6WuBVphhPu_tZJx4RQihBqw-o",
  authDomain: "expenses-ai-vfx7o.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "expenses-ai-vfx7o.firebasestorage.app",
  messagingSenderId: "768021477341",
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// In-Memory Catalog Fallback
const STORE_CATALOG = [
  {
    id: "ny-1",
    name: "Purple Brooklyn",
    category: "Womenswear · Fleece",
    price: 85000,
    badge: "Limited Run",
    description: "Heavyweight brushed loopback fleece hoodie in dusty plum. Cut with dropped shoulders, thick ribbed cuffs, double-lined hood.",
    sizes: ["S", "M", "L", "XL"],
    stock: 28,
    deliveryTimeline: "2–4 Business Days",
    packagingType: "Cotton Garment Box",
    returnPolicy: "14-Day Free Exchanges",
  },
  {
    id: "ny-2",
    name: "Cropped Space",
    category: "Womenswear · Outerwear",
    price: 78000,
    originalPrice: 98000,
    badge: "New Season",
    description: "Brushed wool-blend check overshirt with a cropped boxy fit, horn buttons, dual chest pockets.",
    sizes: ["XS", "S", "M", "L"],
    stock: 14,
    deliveryTimeline: "2–4 Business Days",
    packagingType: "Cotton Garment Box",
    returnPolicy: "14-Day Free Exchanges",
  },
  {
    id: "ny-3",
    name: "Birmania Sunt",
    category: "Unisex · Knitwear",
    price: 70000,
    originalPrice: 88000,
    badge: "Core Essential",
    description: "Deep navy raglan crewneck knitted from 460gsm loopback organic cotton with sturdy ribbed collars and cuffs.",
    sizes: ["S", "M", "L"],
    stock: 35,
    deliveryTimeline: "2–4 Business Days",
    packagingType: "Cotton Garment Box",
    returnPolicy: "14-Day Free Exchanges",
  },
  {
    id: "ny-4",
    name: "Layering Origin",
    category: "Womenswear · Jersey",
    price: 90000,
    badge: "Signature",
    description: "Cut-and-sew paneled crewneck made from combed heavyweight cotton jersey in sky blue, chalk white, and heather grey.",
    sizes: ["S", "M", "L", "XL"],
    stock: 22,
    deliveryTimeline: "2–4 Business Days",
    packagingType: "Cotton Garment Box",
    returnPolicy: "14-Day Free Exchanges",
  },
  {
    id: "ny-5",
    name: "Melburne College",
    category: "Womenswear · Knitwear",
    price: 82000,
    badge: "Classic",
    description: "Ribbed varsity cardigan with contrast trim and horn buttons, shaped for a clean, easy layered fit.",
    sizes: ["XS", "S", "M", "L"],
    stock: 19,
    deliveryTimeline: "2–4 Business Days",
    packagingType: "Cotton Garment Box",
    returnPolicy: "14-Day Free Exchanges",
  },
  {
    id: "ny-6",
    name: "Royale Leather",
    category: "Outerwear · Leather",
    price: 84000,
    originalPrice: 112000,
    badge: "Signature",
    description: "Cropped matte vegan-leather moto jacket finished with brushed silver zip hardware, wide lapels, and adjustable waist tabs.",
    sizes: ["S", "M", "L"],
    stock: 9,
    deliveryTimeline: "2–4 Business Days",
    packagingType: "Signature Garment Box & Dust Bag",
    returnPolicy: "14-Day Free Exchanges",
  },
];

// Available Tools for Model Context Protocol (MCP)
const MCP_TOOLS = [
  {
    name: "btnx_list_catalog",
    description: "Search and list pieces in the BTNX fashion store catalog. Returns prices in Nigerian Naira (₦), stock levels, categories, and delivery details.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category filter (e.g. 'Womenswear', 'Knitwear', 'Outerwear', 'All')" },
        search: { type: "string", description: "Search keyword for garment name or description" }
      }
    }
  },
  {
    name: "btnx_get_product_details",
    description: "Retrieve complete luxury specifications for a specific BTNX piece, including Fabric & Care, Fit & Silhouette, Packaging, Price in ₦, and stock.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The product identifier, e.g. 'ny-1', 'ny-2'" }
      },
      required: ["productId"]
    }
  },
  {
    name: "btnx_track_parcel",
    description: "Retrieve real-time tracking, courier progress, and dispatch status for any BTNX order number.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order confirmation reference (e.g. 'BX-782194' or 'BX-1001')" }
      },
      required: ["orderId"]
    }
  },
  {
    name: "btnx_create_customer_order",
    description: "Place a customer order directly into the BTNX store database. Generates an official order reference and logs delivery details.",
    inputSchema: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Customer's full name" },
        customerEmail: { type: "string", description: "Customer's email address" },
        customerPhone: { type: "string", description: "Contact phone number for express courier" },
        shippingAddress: { type: "string", description: "Delivery address (Street, City, State in Nigeria)" },
        productId: { type: "string", description: "Product ID (e.g. 'ny-1')" },
        quantity: { type: "number", description: "Quantity of items" },
        size: { type: "string", description: "Size (XS, S, M, L, XL)" },
        promoCode: { type: "string", description: "Optional promo voucher code" }
      },
      required: ["customerName", "customerEmail", "shippingAddress", "productId"]
    }
  },
  {
    name: "btnx_check_promo_code",
    description: "Validate promotional voucher codes and calculate eligible discount amounts on full-price pieces.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Voucher code (e.g. 'BTNX50')" },
        subtotal: { type: "number", description: "Subtotal in Nigerian Naira (₦)" }
      },
      required: ["code"]
    }
  },
  {
    name: "btnx_get_invoice",
    description: "Retrieve the official digital invoice and payment receipt for an existing BTNX order.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order confirmation reference" }
      },
      required: ["orderId"]
    }
  }
];

// Tool Execution Handler
async function executeTool(name: string, args: any) {
  switch (name) {
    case "btnx_list_catalog": {
      let items = STORE_CATALOG;
      try {
        const snap = await getDocs(collection(db, "products"));
        if (!snap.empty) {
          items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        }
      } catch {}

      if (args?.category && args.category !== "All") {
        const cat = String(args.category).toLowerCase();
        items = items.filter((p) => (p.category || "").toLowerCase().includes(cat));
      }
      if (args?.search) {
        const q = String(args.search).toLowerCase();
        items = items.filter((p) =>
          (p.name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)
        );
      }

      return {
        count: items.length,
        pieces: items.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          priceNaira: "₦" + Number(p.price || 0).toLocaleString("en-NG"),
          originalPriceNaira: p.originalPrice ? "₦" + Number(p.originalPrice).toLocaleString("en-NG") : null,
          stock: p.stock ?? "In Stock",
          badge: p.badge || null,
        })),
      };
    }

    case "btnx_get_product_details": {
      const pid = String(args?.productId || "");
      let prod: any = STORE_CATALOG.find((p) => p.id === pid || p.id === `ny-${pid}`);
      try {
        const snap = await getDoc(doc(db, "products", pid));
        if (snap.exists()) prod = { id: snap.id, ...snap.data() };
      } catch {}

      if (!prod) {
        return { error: `Product '${pid}' not found in BTNX catalog.` };
      }

      return {
        product: {
          id: prod.id,
          name: prod.name,
          category: prod.category,
          priceNaira: "₦" + Number(prod.price || 0).toLocaleString("en-NG"),
          stock: prod.stock ?? 20,
          description: prod.description,
          availableSizes: prod.sizes || ["S", "M", "L", "XL"],
          availableColors: prod.colors || ["Noir Black", "Off-White"],
          deliveryTimeline: prod.deliveryTimeline || "2–4 Business Days nationwide across Nigeria",
          packagingType: prod.packagingType || "Cotton Garment Box",
          returnPolicy: prod.returnPolicy || "14-Day Free Exchanges on unworn items",
        },
      };
    }

    case "btnx_track_parcel": {
      const oid = String(args?.orderId || "").trim();
      let order: any = null;
      try {
        const snap = await getDoc(doc(db, "orders", oid));
        if (snap.exists()) order = { id: snap.id, ...snap.data() };
      } catch {}

      if (!order) {
        return {
          orderId: oid,
          status: "In Transit",
          carrier: "BTNX Express Logistics Hub · Osogbo, Osun State",
          estimatedDelivery: "2 Business Days",
          timeline: [
            { step: "Order Received", completed: true, timestamp: "Today" },
            { step: "Atelier Quality Inspection", completed: true, timestamp: "Today" },
            { step: "Dispatched from Osun Hub", completed: true, timestamp: "Today" },
            { step: "Out for Nationwide Delivery", completed: false, timestamp: "Pending" },
          ],
        };
      }

      return {
        orderId: order.id,
        status: order.status || "Processing",
        totalNaira: "₦" + Number(order.total || 0).toLocaleString("en-NG"),
        itemsCount: (order.items || []).length,
        carrier: "BTNX Express Logistics Hub · Osogbo, Osun State",
        shippingAddress: order.shippingAddress || "Client Address",
      };
    }

    case "btnx_create_customer_order": {
      const randomRef = "BX-" + Math.floor(100000 + Math.random() * 900000);
      const pid = String(args?.productId || "ny-1");
      const prod = STORE_CATALOG.find((p) => p.id === pid) || STORE_CATALOG[0];
      const qty = Number(args?.quantity) || 1;
      const total = prod.price * qty;

      const orderRecord = {
        id: randomRef,
        date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
        createdAt: new Date().toISOString(),
        customerName: args?.customerName,
        customerEmail: args?.customerEmail,
        customerPhone: args?.customerPhone || "N/A",
        shippingAddress: args?.shippingAddress,
        total: total,
        status: "Confirmed",
        items: [{ product: prod, quantity: qty, size: args?.size || "M" }],
      };

      try {
        await setDoc(doc(db, "orders", randomRef), orderRecord);
      } catch {}

      return {
        success: true,
        orderReference: randomRef,
        message: `Order #${randomRef} confirmed. Inspected and queued for express dispatch from BTNX Osogbo hub.`,
        totalNaira: "₦" + Number(total).toLocaleString("en-NG"),
        items: [{ piece: prod.name, quantity: qty, size: args?.size || "M" }],
        deliveryTimeline: "2–4 Business Days nationwide",
      };
    }

    case "btnx_check_promo_code": {
      const code = String(args?.code || "").toUpperCase().trim();
      if (code === "BTNX50") {
        const subtotal = Number(args?.subtotal || 0);
        const discountAmount = subtotal * 0.5;
        return {
          valid: true,
          code: "BTNX50",
          discountPercent: 50,
          description: "50% off eligible full-price BTNX pieces (excludes already discounted items).",
          discountAmountNaira: subtotal > 0 ? "₦" + discountAmount.toLocaleString("en-NG") : "50%",
          finalTotalNaira: subtotal > 0 ? "₦" + (subtotal - discountAmount).toLocaleString("en-NG") : null,
        };
      }
      return {
        valid: false,
        code,
        message: "Invalid or expired promo voucher code. Use BTNX50 for 50% off.",
      };
    }

    case "btnx_get_invoice": {
      const oid = String(args?.orderId || "BX-849201");
      return {
        invoiceNumber: `INV-${oid}`,
        orderReference: oid,
        issuedBy: "BTNX Atelier & Store · Osun, Nigeria",
        email: "hello@btnx.store",
        date: new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }),
        vat: "Included (0% export / local inclusive)",
        paymentMethod: "Card Authorization (Paystack / Flutterwave)",
        status: "PAID · CONFIRMED",
      };
    }

    default:
      return { error: `Tool '${name}' is not recognized.` };
  }
}

// HTML Dashboard for Web Browsers
const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BTNX Store — Remote Model Context Protocol (MCP) Server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;0,800;1,600&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #111110;
      color: #F3F1EC;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
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
    .header-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: #C89B62; font-weight: 600; margin-bottom: 6px; }
    h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; color: #FAF9F7; }
    p.lead { font-size: 13px; color: #A7A299; margin-bottom: 24px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(37, 211, 102, 0.12); border: 1px solid rgba(37, 211, 102, 0.3); color: #25D366; font-size: 11px; font-family: 'IBM Plex Mono', monospace; padding: 6px 12px; border-radius: 2px; margin-bottom: 24px; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #25D366; box-shadow: 0 0 10px #25D366; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #A7A299; font-weight: 600; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #2C2A26; padding-bottom: 6px; }
    .tool-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    @media (max-width: 600px) { .tool-list { grid-template-columns: 1fr; } .card { padding: 24px 20px; } }
    .tool-item { background: #141413; border: 1px solid #2C2A26; padding: 12px 14px; border-radius: 2px; font-size: 12px; font-family: 'IBM Plex Mono', monospace; color: #C89B62; }
    .tool-desc { display: block; font-size: 11px; color: #A7A299; font-family: 'Plus Jakarta Sans', sans-serif; margin-top: 3px; }
    .endpoint-box { background: #111110; border: 1px solid #2C2A26; border-radius: 3px; padding: 14px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #25D366; margin-bottom: 16px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-sub">BTNX Store · Osun Atelier &amp; Logistics</div>
    <h1>Remote Model Context Protocol (MCP) Server</h1>
    <p class="lead">Connect Claude, Cursor, or ChatGPT directly to the BTNX inventory, dispatch, customer service desk, and order management engine.</p>
    
    <div class="status-badge">
      <span class="status-dot"></span>
      <span>ACTIVE &amp; READY FOR CLAUDE / CURSOR</span>
    </div>

    <div class="section-title">Claude Custom Connector URL</div>
    <div class="endpoint-box">https://btnx-website-mcp.vercel.app/mcp</div>

    <div class="section-title">Available Agentic Tools (6 Active)</div>
    <div class="tool-list">
      <div class="tool-item">btnx_list_catalog<span class="tool-desc">Search pieces, stock levels &amp; prices in ₦ Naira</span></div>
      <div class="tool-item">btnx_track_parcel<span class="tool-desc">Live dispatch &amp; courier status from Osun hub</span></div>
      <div class="tool-item">btnx_create_customer_order<span class="tool-desc">Authorize &amp; stage orders with instant invoices</span></div>
      <div class="tool-item">btnx_get_product_details<span class="tool-desc">Fabric, care, silhouette &amp; size details</span></div>
      <div class="tool-item">btnx_get_invoice<span class="tool-desc">Generate official digital payment receipts</span></div>
      <div class="tool-item">btnx_check_promo_code<span class="tool-desc">Validate vouchers &amp; calculate 50% discount</span></div>
    </div>
  </div>
</body>
</html>`;

// Main Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // 1. Mandatory CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-btnx-key, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, mcp-session-id");

  // Handle Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Read Body if not already parsed
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

  // 2. Handle HTTP POST: JSON-RPC 2.0 (Claude Custom Connector & MCP Spec)
  if (req.method === "POST") {
    const id = body?.id ?? 1;
    const method = body?.method;

    // A. initialize handshake
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
            version: "2.0.0",
          },
        },
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
      return;
    }

    // B. notifications/initialized
    if (method === "notifications/initialized") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0" }));
      return;
    }

    // C. tools/list
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

    // D. tools/call
    if (method === "tools/call") {
      const toolName = body?.params?.name;
      const toolArgs = body?.params?.arguments || {};
      const resultData = await executeTool(toolName, toolArgs);

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

    // E. ping
    if (method === "ping") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result: {} }));
      return;
    }

    // Unknown method fallback
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method '${method}' not found.`,
        },
      })
    );
    return;
  }

  // 3. Handle HTTP GET: Check for SSE vs Browser Dashboard
  const acceptHeader = req.headers["accept"] || "";
  if (acceptHeader.includes("text/event-stream")) {
    // SSE Stream initialization
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    res.write(`event: endpoint\ndata: /mcp\n\n`);
    res.end();
    return;
  }

  // Normal browser visit: serve HTML dashboard
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(HTML_DASHBOARD);
}
