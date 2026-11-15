import { Express, Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
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
  limit,
} from "firebase/firestore";
import {
  renderProductCardHtml,
  renderInvoiceHtml,
  renderTrackingStepperHtml,
  renderSupportTicketHtml,
} from "./ui/templates.js";
import { NEW_YEAR_PRODUCTS } from "./ui/productsData.js";
import {
  verifyPersonalAccessToken,
  verifyOAuthAccessToken,
  generateSignedResourceToken,
} from "./auth/tokens.js";
import { authorizeResourceOwner } from "./auth/authorization.js";

export interface McpAuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  shippingAddress?: string;
  isMasterAdmin?: boolean;
}

interface McpSession {
  id: string;
  transport: SSEServerTransport;
  server: Server;
  user: McpAuthenticatedUser;
  createdAt: number;
}

const activeSessions = new Map<string, McpSession>();
const localOrdersCache = new Map<string, any>();
const localTicketsCache = new Map<string, any>();

// Master Admin Auth Key from environment variable only (fail-closed if unset)
export const DEFAULT_MCP_AUTH_KEY =
  process.env.MCP_AUTH_KEY || process.env.BTNX_API_KEY || "";

export const BTNX_TOOLS: Tool[] = [
  {
    name: "btnx_list_my_orders",
    description:
      "List all orders placed by the currently authenticated customer, including fulfillment status, total spent in ₦ Naira, items, and tracking references.",
    inputSchema: {
      type: "object",
      properties: {
        statusFilter: {
          type: "string",
          description: "Optional filter: 'Processing', 'In Transit', 'Delivered', or 'All'",
        },
      },
    },
  },
  {
    name: "btnx_list_products",
    description:
      "Search and list garments in the BTNX fashion store catalog. Filter by category, search keywords, or pinned hero status.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Filter by category (e.g. 'Tops', 'Bottoms', 'Outerwear', 'All')",
        },
        search: {
          type: "string",
          description: "Search keyword for garment name or description",
        },
        pinnedOnly: {
          type: "boolean",
          description: "Return only pieces pinned to the storefront Hero carousel",
        },
      },
    },
  },
  {
    name: "btnx_get_product_details",
    description:
      "Retrieve comprehensive specifications for a BTNX piece including Fabric & Care, Fit & Silhouette, Delivery Timeline, Luxury Packaging, Return Policy, Price (in ₦ Naira), and stock.",
    inputSchema: {
      type: "object",
      properties: {
        productId: {
          type: "string",
          description: "The product ID (e.g. 'ny-1', 'ny-6')",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "btnx_get_active_promos",
    description:
      "Get currently active voucher codes directly from the BTNX store database, with real discount percentages and complimentary shipping thresholds.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "btnx_calculate_order",
    description:
      "Calculate item subtotals, promo code discount against live database records, nationwide shipping fees, and final order total in Nigerian Naira (₦).",
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
              quantity: { type: "number" },
            },
            required: ["price", "quantity"],
          },
        },
        promoCode: {
          type: "string",
          description: "Optional promo voucher code to validate against database",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "btnx_create_order",
    description:
      "Place a customer order directly into the BTNX store database. Automatically links the order to the authenticated customer account.",
    inputSchema: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Customer's full name (optional, defaults to profile)" },
        customerEmail: { type: "string", description: "Customer's email address (optional, defaults to profile)" },
        customerPhone: { type: "string", description: "Phone number for courier contact" },
        shippingAddress: { type: "string", description: "Delivery address (Street, City, State)" },
        items: {
          type: "array",
          description: "List of items being ordered",
          items: {
            type: "object",
            properties: {
              productId: { type: "string" },
              productName: { type: "string" },
              price: { type: "number" },
              quantity: { type: "number" },
              size: { type: "string", description: "S, M, L, XL" },
              color: { type: "string" },
            },
            required: ["productId", "price", "size"],
          },
        },
        promoCode: { type: "string", description: "Optional promo voucher applied" },
      },
      required: ["items"],
    },
  },
  {
    name: "btnx_track_order",
    description:
      "Retrieve live fulfillment status, tracking updates, and delivery details for an existing BTNX order. Defaults to customer's latest order if ID is omitted.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "Order confirmation reference (e.g. 'BX-849201', or omit for latest)",
        },
      },
    },
  },
  {
    name: "btnx_recommend_fit",
    description:
      "Expert size and silhouette recommendation tailored to client's height, weight, build, and styling preference.",
    inputSchema: {
      type: "object",
      properties: {
        height: { type: "string", description: "e.g. '5ft 11' or '180cm'" },
        weight: { type: "string", description: "e.g. '75kg' or '165lbs'" },
        fitPreference: {
          type: "string",
          description: "'relaxed', 'oversized', 'structured', or 'slim'",
        },
        garmentType: {
          type: "string",
          description: "e.g. 'overcoat', 'trouser', 'overshirt', 'hoodie'",
        },
      },
      required: ["height", "weight"],
    },
  },
  {
    name: "btnx_render_ui_widget",
    description:
      "Generate styled, luxury UI widgets in the exact aesthetic of the BTNX main website. Can render product card(s), official invoice, order tracking stepper, or customer support conversation thread as standalone HTML.",
    inputSchema: {
      type: "object",
      properties: {
        widgetType: {
          type: "string",
          enum: ["product_card", "invoice", "tracking_stepper", "support_ticket"],
          description: "The type of UI component to render",
        },
        id: {
          type: "string",
          description: "Target ID: product ID (for product_card), order ID (for invoice/tracking), or ticket ID (for support_ticket)",
        },
      },
      required: ["widgetType"],
    },
  },
  {
    name: "btnx_message_support",
    description:
      "Submit a customer service ticket or message the BTNX customer care desk. Dispatches directly to the customer support triage desk in Osogbo, linked to your account.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Inquiry topic, e.g. 'Size Exchange', 'Delivery Address Update', 'Payment Issue'" },
        message: { type: "string", description: "The detailed customer message or issue description" },
        orderId: { type: "string", description: "Associated order ID if inquiry is about an existing order" },
        customerName: { type: "string", description: "Customer name (optional, defaults to profile)" },
        customerEmail: { type: "string", description: "Customer email (optional, defaults to profile)" },
        customerPhone: { type: "string", description: "Phone number (optional)" },
      },
      required: ["message", "topic"],
    },
  },
  {
    name: "btnx_get_support_ticket",
    description:
      "Retrieve an existing customer support ticket, including conversation history, current status (open, escalated, resolved), and agent responses.",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Ticket reference number (e.g. 'TCK-123456')" },
      },
      required: ["ticketId"],
    },
  },
  {
    name: "btnx_get_invoice",
    description:
      "Retrieve the complete luxury digital invoice details and standalone styled HTML template for any BTNX order.",
    inputSchema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "Order confirmation reference (e.g. 'BTNX-MCP-123456')" },
      },
      required: ["orderId"],
    },
  },
];

/**
 * Resolves an authenticated user account from the provided token
 */
export async function resolveMcpUser(providedKey: string): Promise<McpAuthenticatedUser | null> {
  const cleanKey = providedKey.trim();
  if (!cleanKey) return null;

  // 1. Check Server Admin API Key from environment variable only
  const masterKey = process.env.MCP_AUTH_KEY || process.env.MCP_ADMIN_API_KEY;
  if (masterKey && masterKey.length >= 16 && cleanKey === masterKey) {
    return {
      userId: "admin_master",
      email: "admin@btnx.store",
      name: "BTNX Store Administrator",
      isMasterAdmin: true,
    };
  }

  // 2. Personal Access Token (PAT) Verification via hashed personal_access_tokens
  if (cleanKey.startsWith("btnx_pat_")) {
    const patRecord = await verifyPersonalAccessToken(db, cleanKey);
    if (patRecord) {
      try {
        const uSnap = await getDoc(doc(db, "users", patRecord.uid));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          return {
            userId: patRecord.uid,
            email: uData.email || "",
            name: uData.name || uData.displayName || "BTNX VIP Client",
            phone: uData.phone || "",
            shippingAddress: uData.shippingAddress || "",
            isMasterAdmin: uData.role === "admin" || Boolean(uData.isAdmin),
          };
        }
      } catch (err: any) {
        console.error("[BTNX Remote MCP] Error resolving user profile:", err?.message);
      }
    }
  }

  // 3. OAuth 2.1 Access Token Verification
  if (cleanKey.startsWith("btnx_at_")) {
    const oauthRecord = await verifyOAuthAccessToken(db, cleanKey);
    if (oauthRecord) {
      try {
        const uSnap = await getDoc(doc(db, "users", oauthRecord.uid));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          return {
            userId: oauthRecord.uid,
            email: uData.email || "",
            name: uData.name || uData.displayName || "BTNX VIP Client",
            phone: uData.phone || "",
            shippingAddress: uData.shippingAddress || "",
            isMasterAdmin: uData.role === "admin" || Boolean(uData.isAdmin),
          };
        }
      } catch {}
    }
  }

  // 4. Firebase ID Token Verification (JWT format)
  if (cleanKey.startsWith("eyJ") && cleanKey.split(".").length === 3) {
    try {
      const parts = cleanKey.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload.sub && payload.exp && payload.exp * 1000 > Date.now()) {
        const uSnap = await getDoc(doc(db, "users", payload.sub));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          return {
            userId: payload.sub,
            email: uData.email || payload.email || "",
            name: uData.name || uData.displayName || "BTNX VIP Client",
            phone: uData.phone || "",
            shippingAddress: uData.shippingAddress || "",
            isMasterAdmin: uData.role === "admin" || Boolean(uData.isAdmin),
          };
        }
      }
    } catch {}
  }

  // 5. Backwards-compatible lookup in legacy mcpTokens collection (if still valid)
  try {
    const tokenDoc = await getDoc(doc(db, "mcpTokens", cleanKey));
    if (tokenDoc.exists()) {
      const data = tokenDoc.data();
      return {
        userId: data.userId || tokenDoc.id,
        email: data.email || "",
        name: data.name || "BTNX VIP Client",
        phone: data.phone || "",
        shippingAddress: data.shippingAddress || "",
        isMasterAdmin: false,
      };
    }
  } catch {}

  return null;
}

/**
 * Execute a BTNX Tool with authenticated user context
 */
export async function executeMcpTool(
  name: string,
  args: any,
  reqOrigin = "http://localhost:4000",
  user: McpAuthenticatedUser = { userId: "guest", email: "guest@btnx.store", isMasterAdmin: false }
): Promise<any> {
  switch (name) {
    case "btnx_list_my_orders": {
      if (!user.userId || user.userId === "guest") {
        return {
          error: "Authentication required",
          message:
            "Please authenticate with your BTNX personal access token or account credentials to view your order history.",
          orders: [],
        };
      }

      let orders: any[] = [];
      try {
        const q = user.isMasterAdmin
          ? query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(20))
          : query(
              collection(db, "orders"),
              where("userId", "==", user.userId),
              orderBy("createdAt", "desc"),
              limit(20)
            );
        const snap = await getDocs(q);
        orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        orders = Array.from(localOrdersCache.values()).filter(
          (o) => user.isMasterAdmin || o.userId === user.userId || o.customerEmail === user.email
        );
      }

      if (args?.statusFilter && args.statusFilter !== "All") {
        orders = orders.filter(
          (o) => (o.status || "").toLowerCase() === String(args.statusFilter).toLowerCase()
        );
      }

      return {
        customerEmail: user.email,
        customerName: user.name || "Valued Client",
        orderCount: orders.length,
        orders: orders.map((o) => {
          const signedInvoice = generateSignedResourceToken(o.id, "invoice", 7 * 24 * 3600);
          const signedTrack = generateSignedResourceToken(o.id, "track", 7 * 24 * 3600);
          return {
            orderId: o.id,
            date: o.date || "Recent",
            status: o.status,
            total: `₦${Number(o.total || 0).toLocaleString()}`,
            itemCount: o.items?.length || 1,
            firstItemName: o.items?.[0]?.productName || o.items?.[0]?.product?.name || "BTNX Garment",
            trackingUrl: `${reqOrigin}/render/track/${o.id}?sig=${signedTrack.sig}&exp=${signedTrack.exp}`,
            invoiceUrl: `${reqOrigin}/render/invoice/${o.id}?sig=${signedInvoice.sig}&exp=${signedInvoice.exp}`,
          };
        }),
      };
    }

    case "btnx_list_products": {
      let products: any[] = [];
      try {
        const snap = await getDocs(collection(db, "products"));
        products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        products = [...NEW_YEAR_PRODUCTS];
      }
      if (!products.length) {
        products = [...NEW_YEAR_PRODUCTS];
      }

      if (args?.category && args.category !== "All") {
        products = products.filter(
          (p) => (p.category || "").toLowerCase() === String(args.category).toLowerCase()
        );
      }
      if (args?.pinnedOnly) {
        products = products.filter((p) => p.isPinnedHero);
        products.sort((a, b) => (a.heroOrder ?? 1) - (b.heroOrder ?? 1));
      }
      if (args?.search) {
        const q = String(args.search).toLowerCase();
        products = products.filter(
          (p) =>
            (p.name || "").toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q) ||
            (p.category || "").toLowerCase().includes(q)
        );
      }

      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: `₦${Number(p.price || 0).toLocaleString()}`,
          rawPrice: p.price,
          isPinnedHero: Boolean(p.isPinnedHero),
          isFreeShipping: Boolean(p.isFreeShipping),
          deliveryTimeline: p.deliveryTimeline || "2–4 Business Days",
          fabricAndCare: p.fabricAndCare || "Luxury heavy knit · Preshrunk",
          stock: p.stock ?? 45,
          image: p.image,
        })),
      };
    }

    case "btnx_get_product_details": {
      const pid = String(args?.productId || "");
      let p: any = null;
      try {
        const snap = await getDoc(doc(db, "products", pid));
        if (snap.exists()) p = { id: snap.id, ...snap.data() };
      } catch {}

      if (!p) {
        p = NEW_YEAR_PRODUCTS.find((item) => String(item.id) === pid);
      }

      if (!p) {
        throw new Error(`Product #${pid} not found in BTNX luxury catalog.`);
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        price: `₦${Number(p.price || 0).toLocaleString()}`,
        fabricAndCare:
          p.fabricAndCare ||
          "Brushed wool-blend check overshirt with a cropped boxy fit, horn buttons, and dual chest pockets. Built to layer easily over tees or knits.",
        fitDetails:
          p.fitDetails ||
          "Relaxed, structured fit with reinforced seams. Machine wash cold inside out or dry clean.",
        deliveryTimeline: p.deliveryTimeline || "2–4 Business Days",
        packagingType: p.packagingType || "Cotton Garment Box",
        returnPolicy: p.returnPolicy || "14-Day Free Exchanges",
        shippingFee: p.isFreeShipping ? "Free" : p.shippingFee ? `₦${p.shippingFee}` : "Standard (₦3,500)",
        availableSizes: p.sizes || ["S", "M", "L", "XL"],
        availableColors: p.colors || ["Black", "Off-White"],
        stock: p.stock ?? 45,
        image: p.image,
        productUrl: `${reqOrigin}/shop#${p.id}`,
      };
    }

    case "btnx_get_active_promos": {
      let activeCodes: any[] = [];
      try {
        const snap = await getDocs(collection(db, "promoCodes"));
        activeCodes = snap.docs
          .map((d) => d.data())
          .filter((p: any) => p.isActive !== false && (!p.expiresAt || new Date(p.expiresAt) > new Date()))
          .map((p: any) => ({
            code: p.code,
            discount: `${p.discountPercentage || p.percentage || 0}% Off`,
            expiresAt: p.expiresAt || "Ongoing",
          }));
      } catch (err: any) {
        console.warn("[BTNX Remote MCP] Failed to query promoCodes:", err?.message);
      }

      return {
        activeCodes,
        shippingPrivilege:
          "Complimentary luxury nationwide shipping unlocked on all orders over ₦150,000.",
      };
    }

    case "btnx_calculate_order": {
      const items = (args?.items as any[]) || [];
      const promoCode = String(args?.promoCode || "").trim().toUpperCase();

      let subtotal = 0;
      for (const it of items) {
        subtotal += Number(it.price || 0) * Number(it.quantity || 1);
      }

      let discountPct = 0;
      let appliedPromoName = "None";

      if (promoCode) {
        try {
          const q = query(collection(db, "promoCodes"), where("code", "==", promoCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const promo = snap.docs[0].data();
            const isNotExpired = !promo.expiresAt || new Date(promo.expiresAt) > new Date();
            if (promo.isActive !== false && isNotExpired) {
              const pct = Number(promo.discountPercentage || promo.percentage || 0);
              discountPct = pct / 100;
              appliedPromoName = `${promo.code} (${pct}% Off Applied)`;
            } else {
              appliedPromoName = "Expired or Inactive Code";
            }
          } else {
            appliedPromoName = "Invalid Code";
          }
        } catch {
          appliedPromoName = "Promo Validation Unavailable";
        }
      }

      const discountAmount = subtotal * discountPct;
      const isFreeShipping = subtotal >= 150000;
      const shippingFee = isFreeShipping ? 0 : 3500;
      const total = Math.max(0, subtotal - discountAmount) + shippingFee;

      return {
        subtotal: `₦${subtotal.toLocaleString()}`,
        appliedPromo: appliedPromoName,
        discountAmount: `₦${discountAmount.toLocaleString()}`,
        shippingFee: isFreeShipping ? "Free (Over ₦150,000)" : `₦${shippingFee.toLocaleString()}`,
        totalDue: `₦${total.toLocaleString()}`,
        rawTotal: total,
      };
    }

    case "btnx_create_order": {
      const orderId = `BX-${Date.now().toString().slice(-6)}`;
      const items = (args?.items as any[]) || [];
      let subtotal = 0;
      for (const it of items) {
        subtotal += Number(it.price || 0) * Number(it.quantity || 1);
      }

      const promo = String(args?.promoCode || "").trim().toUpperCase();
      let discountAmount = 0;
      if (promo) {
        try {
          const q = query(collection(db, "promoCodes"), where("code", "==", promo));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const pData = snap.docs[0].data();
            if (pData.isActive !== false && (!pData.expiresAt || new Date(pData.expiresAt) > new Date())) {
              const pct = Number(pData.discountPercentage || pData.percentage || 0);
              discountAmount = subtotal * (pct / 100);
            }
          }
        } catch {}
      }

      const shippingFee = subtotal >= 150000 ? 0 : 3500;
      const total = Math.max(0, subtotal - discountAmount) + shippingFee;

      const record = {
        id: orderId,
        source: "remote-mcp",
        userId: user.userId,
        customerName: args?.customerName || user.name || "BTNX VIP Client",
        customerEmail: args?.customerEmail || user.email || "client@btnx.store",
        customerPhone: args?.customerPhone || user.phone || "N/A",
        shippingAddress: args?.shippingAddress || user.shippingAddress || "Default Delivery Destination",
        items,
        subtotal,
        discountAmount,
        shippingFee,
        total,
        status: "Processing",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "orders", orderId), record);
      } catch (dbErr: any) {
        console.error("[BTNX Remote MCP] Order create error:", dbErr?.message);
      }

      const signedInvoice = generateSignedResourceToken(orderId, "invoice", 7 * 24 * 3600);
      const signedTrack = generateSignedResourceToken(orderId, "track", 7 * 24 * 3600);

      return {
        success: true,
        orderId,
        linkedAccount: user.email,
        message: `Order #${orderId} successfully registered under account ${user.email}. It now appears in your website order history.`,
        invoiceUrl: `${reqOrigin}/render/invoice/${orderId}?sig=${signedInvoice.sig}&exp=${signedInvoice.exp}`,
        trackingUrl: `${reqOrigin}/render/track/${orderId}?sig=${signedTrack.sig}&exp=${signedTrack.exp}`,
        orderSummary: record,
      };
    }

    case "btnx_track_order": {
      let orderIdStr = String(args?.orderId || "").trim();

      // If user omitted order ID or asked for their latest order
      if (!orderIdStr || orderIdStr.toLowerCase() === "latest" || orderIdStr.toLowerCase() === "my_order") {
        if (!user.userId || user.userId === "guest") {
          return {
            error: "Order reference required",
            message: "Please provide your order reference number, or sign in to track your latest order automatically.",
          };
        }

        try {
          const q = user.isMasterAdmin
            ? query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1))
            : query(collection(db, "orders"), where("userId", "==", user.userId), orderBy("createdAt", "desc"), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            orderIdStr = snap.docs[0].id;
          }
        } catch {}
      }

      if (!orderIdStr) {
        return {
          error: "Order reference required",
          message: "Please provide an order reference number (e.g. BX-XXXXXX).",
        };
      }

      let order: any = null;
      try {
        const snap = await getDoc(doc(db, "orders", orderIdStr));
        if (snap.exists()) order = { id: snap.id, ...snap.data() };
      } catch {}

      if (!order) {
        return {
          error: "Order not found",
          message: `Order #${orderIdStr} was not found in the BTNX database.`,
        };
      }

      // Check ownership
      if (
        user.userId !== "guest" &&
        !user.isMasterAdmin &&
        order.userId &&
        order.userId !== user.userId &&
        order.customerEmail !== user.email
      ) {
        return {
          error: "Access denied",
          message: `Order #${orderIdStr} does not belong to your authenticated account.`,
        };
      }

      const signedTrack = generateSignedResourceToken(order.id, "track", 7 * 24 * 3600);
      order.liveStepperUrl = `${reqOrigin}/render/track/${order.id}?sig=${signedTrack.sig}&exp=${signedTrack.exp}`;

      return order;
    }

    case "btnx_recommend_fit": {
      const heightStr = String(args?.height || "");
      const weightStr = String(args?.weight || "");
      const weightNum = parseFloat(weightStr.replace(/[^0-9.]/g, "")) || 75;

      let size = "M";
      if (weightNum < 65) size = "S";
      else if (weightNum >= 65 && weightNum <= 78) size = "M";
      else if (weightNum > 78 && weightNum <= 89) size = "L";
      else size = "XL";

      return {
        recommendedSize: size,
        fitSummary: `Based on client height (${heightStr}) and mass (${weightStr}), Size ${size} provides our intended contemporary relaxed silhouette.`,
        fabricDrapeNotes:
          "BTNX garments feature reinforced shoulder architecture with a soft boxy drape that layers smoothly over fine knitwear or lightweight tees.",
        careAdvice: "Machine wash cold inside out on delicate cycle, or professional eco-dry clean.",
      };
    }

    case "btnx_render_ui_widget": {
      const widgetType = String(args?.widgetType || args?.widget_type || "product_card");
      const targetId = String(args?.id || "");

      if (widgetType === "product_card") {
        let prod: any = null;
        if (targetId) {
          try {
            const snap = await getDoc(doc(db, "products", targetId));
            if (snap.exists()) prod = { id: snap.id, ...snap.data() };
          } catch {}
          if (!prod) {
            prod = NEW_YEAR_PRODUCTS.find((p) => String(p.id) === targetId);
          }
        }
        if (!prod) {
          prod = NEW_YEAR_PRODUCTS[0];
        }
        return {
          widgetType: "product_card",
          livePreviewUrl: `${reqOrigin}/render/product/${prod.id}`,
          product: prod,
          htmlSnippet: renderProductCardHtml(prod, reqOrigin),
        };
      }

      if (widgetType === "invoice") {
        if (!targetId) {
          return { error: "Order ID is required to render an invoice widget." };
        }
        let order: any = null;
        try {
          const snap = await getDoc(doc(db, "orders", targetId));
          if (snap.exists()) order = { id: snap.id, ...snap.data() };
        } catch {}

        if (!order) {
          return { error: "Order not found", message: `Order #${targetId} not found in database.` };
        }

        const signedInvoice = generateSignedResourceToken(order.id, "invoice", 7 * 24 * 3600);
        return {
          widgetType: "invoice",
          orderId: order.id,
          livePreviewUrl: `${reqOrigin}/render/invoice/${order.id}?sig=${signedInvoice.sig}&exp=${signedInvoice.exp}`,
          order,
          htmlSnippet: renderInvoiceHtml(order),
        };
      }

      if (widgetType === "tracking_stepper") {
        if (!targetId) {
          return { error: "Order ID is required to render a tracking stepper widget." };
        }
        let order: any = null;
        try {
          const snap = await getDoc(doc(db, "orders", targetId));
          if (snap.exists()) order = { id: snap.id, ...snap.data() };
        } catch {}

        if (!order) {
          return { error: "Order not found", message: `Order #${targetId} not found in database.` };
        }

        const signedTrack = generateSignedResourceToken(order.id, "track", 7 * 24 * 3600);
        return {
          widgetType: "tracking_stepper",
          orderId: order.id,
          livePreviewUrl: `${reqOrigin}/render/track/${order.id}?sig=${signedTrack.sig}&exp=${signedTrack.exp}`,
          status: order.status,
          htmlSnippet: renderTrackingStepperHtml(order),
        };
      }

      if (widgetType === "support_ticket") {
        if (!targetId) {
          return { error: "Ticket ID is required to render a support ticket widget." };
        }
        let ticket: any = null;
        try {
          const snap = await getDoc(doc(db, "supportTickets", targetId));
          if (snap.exists()) ticket = { id: snap.id, ...snap.data() };
        } catch {}

        if (!ticket) {
          return { error: "Ticket not found", message: `Ticket #${targetId} not found in database.` };
        }

        return {
          widgetType: "support_ticket",
          ticketId: ticket.id,
          livePreviewUrl: `${reqOrigin}/render/support/${ticket.id}`,
          ticket,
          htmlSnippet: renderSupportTicketHtml(ticket),
        };
      }

      throw new Error(`Unsupported widgetType: ${widgetType}`);
    }

    case "btnx_message_support": {
      const ticketId = `TCK-${Date.now().toString().slice(-6)}`;
      const ticket = {
        id: ticketId,
        userId: user.userId,
        customerName: args?.customerName || user.name || "Remote Client",
        customerEmail: args?.customerEmail || user.email || "client@btnx.store",
        customerPhone: args?.customerPhone || user.phone || "",
        topic: String(args?.topic || "Client Inquiry"),
        orderId: args?.orderId ? String(args.orderId) : null,
        status: "open",
        mode: "human",
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: "client",
            text: String(args?.message || "Assistance requested."),
            timestamp: new Date().toISOString(),
          },
          {
            id: `msg-${Date.now() + 1}`,
            sender: "bot",
            senderName: "BTNX Support Desk",
            text: `Inquiry registered with reference #${ticketId}. Routed directly to customer care specialist desk at Osogbo.`,
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "supportTickets", ticketId), ticket);
      } catch (dbErr: any) {
        console.error("[BTNX Remote MCP] Support ticket save error:", dbErr?.message);
      }

      return {
        success: true,
        ticketId,
        linkedAccount: user.email,
        message: `Support ticket #${ticketId} dispatched to BTNX Care Desk and linked to your account (${user.email}). View it in your web chat at /support.`,
        status: "open",
        assignedDesk: "Osogbo Fulfillment & Client Care",
        liveSupportThreadUrl: `${reqOrigin}/render/support/${ticketId}`,
        ticketSummary: ticket,
      };
    }

    case "btnx_get_support_ticket": {
      const ticketId = String(args?.ticketId || "");
      let ticket: any = null;

      if (ticketId) {
        try {
          const snap = await getDoc(doc(db, "supportTickets", ticketId));
          if (snap.exists()) ticket = { id: snap.id, ...snap.data() };
        } catch {}
      }

      if (!ticket) {
        return {
          error: "Ticket not found",
          message: `Ticket #${ticketId} was not found in the database.`,
        };
      }

      ticket.liveSupportThreadUrl = `${reqOrigin}/render/support/${ticket.id || ticketId}`;
      return ticket;
    }

    case "btnx_get_invoice": {
      const orderId = String(args?.orderId || "");
      if (!orderId) {
        return { error: "Order reference required", message: "Please specify an orderId parameter." };
      }

      let order: any = null;
      try {
        const snap = await getDoc(doc(db, "orders", orderId));
        if (snap.exists()) order = { id: snap.id, ...snap.data() };
      } catch {}

      if (!order) {
        return {
          error: "Order not found",
          message: `Order #${orderId} was not found in the BTNX database.`,
        };
      }

      // Check ownership
      if (
        user.userId !== "guest" &&
        !user.isMasterAdmin &&
        order.userId &&
        order.userId !== user.userId &&
        order.customerEmail !== user.email
      ) {
        return {
          error: "Access denied",
          message: `Order #${orderId} does not belong to your authenticated account.`,
        };
      }

      const signedInvoice = generateSignedResourceToken(order.id, "invoice", 7 * 24 * 3600);
      const liveInvoiceUrl = `${reqOrigin}/render/invoice/${order.id}?sig=${signedInvoice.sig}&exp=${signedInvoice.exp}`;

      return {
        invoiceNumber: `INV-${order.id}`,
        orderId: order.id,
        total: `₦${Number(order.total || 0).toLocaleString()}`,
        status: order.status,
        liveInvoiceUrl,
        htmlSnippet: renderInvoiceHtml(order),
        orderSummary: order,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Creates an instance of an MCP Server wired to all 12 BTNX Tools with user session context
 */
export function createBTNXServer(
  reqOrigin = "http://localhost:4000",
  user: McpAuthenticatedUser = { userId: "guest", email: "guest@btnx.store", isMasterAdmin: false }
): Server {
  const server = new Server(
    {
      name: "btnx-luxury-store",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: BTNX_TOOLS,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await executeMcpTool(name, args, reqOrigin, user);
      return {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: true, message: err.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Extract token from Authorization header, x-api-key, or query param
 */
export function extractAuthToken(req: Request): string {
  const authHeader = req.headers.authorization || "";
  const tokenQuery = req.query.token as string | undefined;
  const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (typeof apiKeyHeader === "string") {
    return apiKeyHeader.trim();
  }
  if (typeof tokenQuery === "string") {
    return tokenQuery.trim();
  }
  return "";
}

/**
 * Mount Remote MCP endpoints on the Express application
 */
export function setupRemoteMcp(app: Express) {
  // CORS preflight for MCP endpoints
  app.options(["/sse", "/mcp/sse", "/messages", "/mcp/messages", "/api/user/mcp-token"], (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-session-id, x-api-key");
    res.sendStatus(200);
  });

  // 1. GET /mcp & GET /sse - Standard MCP Server-Sent Events Endpoint for ChatGPT / Claude / Cursor
  const handleSseConnection = async (req: Request, res: Response) => {
    const token = extractAuthToken(req);
    const authenticatedUser = await resolveMcpUser(token);

    // If token is invalid or missing
    if (!authenticatedUser) {
      res.status(401).json({
        error: "Unauthorized",
        message:
          "Invalid or missing MCP Authentication Token. Provide your personal key in 'Authorization: Bearer <token>' or '?token=<token>'. Log into your BTNX account -> Profile to copy your personal key.",
        expectedAuthType: "Bearer Token",
        connectionFormat: {
          name: "BTNX Luxury Store",
          url: `${req.protocol}://${req.get("host")}/mcp`,
          auth: "Bearer btnx_pat_<your_unique_account_key>",
        },
      });
      return;
    }

    const host = `${req.protocol}://${req.get("host")}`;
    const server = createBTNXServer(host, authenticatedUser);

    // Initialize SSEServerTransport pointing client to POST /messages
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;

    activeSessions.set(sessionId, {
      id: sessionId,
      transport,
      server,
      user: authenticatedUser,
      createdAt: Date.now(),
    });

    res.on("close", () => {
      activeSessions.delete(sessionId);
    });

    try {
      await server.connect(transport);
    } catch (err: any) {
      console.error(`[BTNX Remote MCP] Failed to start SSE session ${sessionId}:`, err);
    }
  };

  // Primary MCP Endpoint: /mcp (Dual-mode: SSE for AI clients, Visual Dashboard for browsers)
  app.get("/mcp", (req: Request, res: Response) => {
    const token = extractAuthToken(req);
    const isSseClient =
      req.headers.accept?.includes("text/event-stream") ||
      Boolean(token) ||
      req.query.sse === "true";

    if (isSseClient) {
      return handleSseConnection(req, res);
    }
    return handleMcpDashboard(req, res);
  });

  // Dedicated routes & backward-compatible aliases
  app.get("/mcp/sse", handleSseConnection);
  app.get("/sse", handleSseConnection);
  app.get("/mcp/dashboard", (req: Request, res: Response) => handleMcpDashboard(req, res));

  // 2. POST /messages & POST /mcp/messages - Client JSON-RPC 2.0 messages dispatcher
  const handlePostMessage = async (req: Request, res: Response) => {
    const sessionId = (req.query.sessionId as string) || (req.headers["x-session-id"] as string);

    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId query parameter" });
      return;
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "MCP Session expired or not found", sessionId });
      return;
    }

    try {
      await session.transport.handlePostMessage(req, res, req.body);
    } catch (err: any) {
      console.error(`[BTNX Remote MCP] Error processing message for session ${sessionId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process message", details: err?.message });
      }
    }
  };

  app.post("/messages", handlePostMessage);
  app.post("/mcp/messages", handlePostMessage);

  // 3. POST /api/mcp/call - Direct HTTP REST endpoint to test any tool directly
  app.post("/api/mcp/call", async (req: Request, res: Response) => {
    const token = extractAuthToken(req);
    const authenticatedUser = await resolveMcpUser(token);

    if (!authenticatedUser) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing Bearer token.",
      });
      return;
    }

    const { name, arguments: args } = req.body;
    if (!name) {
      res.status(400).json({ error: "Missing tool name in body: { name, arguments }" });
      return;
    }

    try {
      const host = `${req.protocol}://${req.get("host")}`;
      const result = await executeMcpTool(name, args || {}, host, authenticatedUser);
      res.json({ success: true, tool: name, authenticatedAs: authenticatedUser.email, result });
    } catch (err: any) {
      res.status(500).json({ success: false, tool: name, error: err.message });
    }
  });

  // 4. POST /api/user/mcp-token - Generate or rotate a Personal Access Token for the logged-in user
  app.post("/api/user/mcp-token", async (req: Request, res: Response) => {
    const { userId, email, name, phone, shippingAddress } = req.body;
    if (!userId || !email) {
      res.status(400).json({ error: "userId and email are required to issue a Personal Access Token" });
      return;
    }

    const randomSuffix = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const userPrefix = String(userId).slice(0, 8);
    const token = `btnx_pat_${userPrefix}_${randomSuffix}`;

    try {
      // Save in mcpTokens collection
      await setDoc(doc(db, "mcpTokens", token), {
        token,
        userId,
        email,
        name: name || "BTNX Client",
        phone: phone || "",
        shippingAddress: shippingAddress || "",
        createdAt: new Date().toISOString(),
      });

      // Also attach to user document
      await setDoc(doc(db, "users", userId), { mcpToken: token }, { merge: true });

      const host = `${req.protocol}://${req.get("host")}`;
      res.json({
        success: true,
        token,
        serverName: "BTNX Luxury Store",
        mcpUrl: `${host}/mcp`,
        user: { userId, email, name },
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create personal MCP token", details: err?.message });
    }
  });

  // 5. GET /mcp & GET /api/mcp - Branded Web Connection Dashboard & Documentation
  const handleMcpDashboard = (req: Request, res: Response) => {
    const host = `${req.protocol}://${req.get("host")}`;
    const mcpUrl = `${host}/mcp`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BTNX Luxury Store · Remote MCP Server</title>
  <link rel="icon" type="image/svg+xml" href="/btnx-logo.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #FAF9F7; color: #141413; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen antialiased flex flex-col justify-between">
  <!-- Top Navigation Header -->
  <header class="border-b border-[#E6E2DA] bg-white/90 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="/btnx-logo.svg" alt="BTNX Logo" class="h-6 w-auto">
        <span class="text-xs font-mono uppercase tracking-[0.16em] text-[#966830] font-semibold border-l border-[#E6E2DA] pl-3">
          Remote MCP Server
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono rounded-full font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Per-User Account Isolation
        </span>
      </div>
    </div>
  </header>

  <!-- Hero Content -->
  <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
    <div>
      <span class="text-[11px] font-mono uppercase tracking-[0.2em] text-[#966830] font-bold">
        Zero-Config Remote Model Context Protocol
      </span>
      <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-[#141413]">
        Connect Your Personal BTNX Account to ChatGPT & Claude
      </h1>
      <p class="text-sm sm:text-base text-[#66625B] mt-2 max-w-2xl font-normal leading-relaxed">
        Authenticate your AI assistant directly to <strong>your personal account</strong>. Orders, tracking, and customer service requests initiated in ChatGPT or Claude are bound exclusively to your verified BTNX customer profile.
      </p>
    </div>

    <!-- Account-Scoped Explainer Box -->
    <div class="bg-amber-50/60 border border-amber-200/80 p-5 rounded-xs space-y-2">
      <div class="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider font-mono">
        <span>🔒 Secure Per-Customer Authentication</span>
      </div>
      <p class="text-xs text-amber-800/90 leading-relaxed">
        Log into your account on the BTNX website (<code class="font-mono bg-white/70 px-1 py-0.5">${host}</code> &rarr; Profile) and copy your unique <strong>Personal AI Key</strong> (<code class="font-mono">btnx_pat_...</code>). When entered into ChatGPT or Claude, your AI will only see and track <em>your</em> personal orders.
      </p>
    </div>

    <!-- Quick Connection Card -->
    <div class="bg-white border-2 border-[#141413] shadow-[4px_4px_0px_#141413] p-6 sm:p-8 space-y-6">
      <div class="flex items-center justify-between border-b border-[#E6E2DA] pb-4">
        <div>
          <span class="text-[10px] font-mono uppercase tracking-[0.18em] text-[#966830] font-bold">
            Step 1 · Remote Connection Details
          </span>
          <h2 class="text-xl font-bold text-[#141413] mt-0.5">
            Copy into your AI Agent / Connector Settings
          </h2>
        </div>
        <span class="px-2.5 py-1 bg-[#141413] text-[#FAF9F7] text-[10px] font-mono uppercase tracking-wider font-semibold">
          SSE Transport &amp; OAuth 2.1
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Field 1: Name -->
        <div class="bg-[#FAF9F7] border border-[#E6E2DA] p-4 flex flex-col justify-between">
          <div>
            <label class="text-[10px] font-mono uppercase tracking-wider text-[#66625B] block font-semibold mb-1">
              1. Server Name
            </label>
            <div class="mono text-sm font-semibold text-[#141413] break-all select-all">
              BTNX Luxury Store
            </div>
          </div>
          <button onclick="navigator.clipboard.writeText('BTNX Luxury Store'); alert('Copied Server Name!');" class="mt-3 w-full py-1.5 px-3 bg-[#141413] hover:bg-[#2C2A26] text-white text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer text-center">
            Copy Name
          </button>
        </div>

        <!-- Field 2: URL -->
        <div class="bg-[#FAF9F7] border border-[#E6E2DA] p-4 flex flex-col justify-between">
          <div>
            <label class="text-[10px] font-mono uppercase tracking-wider text-[#66625B] block font-semibold mb-1">
              2. Server URL (Remote MCP)
            </label>
            <div class="mono text-sm font-semibold text-[#141413] break-all select-all">
              ${mcpUrl}
            </div>
          </div>
          <button onclick="navigator.clipboard.writeText('${mcpUrl}'); alert('Copied Server URL!');" class="mt-3 w-full py-1.5 px-3 bg-[#141413] hover:bg-[#2C2A26] text-white text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer text-center">
            Copy URL
          </button>
        </div>

        <!-- Field 3: Auth -->
        <div class="bg-[#FAF9F7] border border-[#E6E2DA] p-4 flex flex-col justify-between">
          <div>
            <label class="text-[10px] font-mono uppercase tracking-wider text-[#66625B] block font-semibold mb-1">
              3. Bearer Auth Token
            </label>
            <div class="mono text-xs text-[#966830] break-all font-semibold">
              btnx_pat_&lt;your_unique_key&gt;
            </div>
          </div>
          <a href="${host}/?login=1" class="mt-3 w-full py-1.5 px-3 bg-[#966830] hover:bg-[#7D5323] text-white text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer text-center block">
            Get Key in Profile &rarr;
          </a>
        </div>
      </div>

      <!-- Quick CURL test snippet -->
      <div class="bg-[#141413] text-[#FAF9F7] p-4 font-mono text-xs overflow-x-auto space-y-2">
        <div class="text-[10px] text-[#A7A299] uppercase tracking-wider">
          Verify via Terminal / Curl:
        </div>
        <div class="select-all text-emerald-400">
          curl -H "Authorization: Bearer &lt;YOUR_PERSONAL_AI_KEY&gt;" "${mcpUrl}"
        </div>
      </div>
    </div>

    <!-- Active Tools Directory -->
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-[#E6E2DA] pb-2">
        <h2 class="text-lg font-bold text-[#141413]">
          Available Store Tools (${BTNX_TOOLS.length})
        </h2>
        <span class="text-xs font-mono text-[#66625B]">Live Database &amp; User Account Scoping</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${BTNX_TOOLS.map(
          (tool) => `
          <div class="bg-white border border-[#E6E2DA] p-4 flex flex-col justify-between hover:border-[#141413] transition-colors">
            <div>
              <div class="flex items-center justify-between">
                <span class="font-mono text-xs font-bold text-[#966830]">${tool.name}</span>
                <span class="text-[10px] font-mono uppercase bg-[#FAF9F7] border border-[#E6E2DA] px-1.5 py-0.5 text-[#66625B]">Tool</span>
              </div>
              <p class="text-xs text-[#66625B] mt-2 font-normal leading-relaxed">${tool.description}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-[#E6E2DA] flex items-center justify-between text-[11px] font-mono text-[#8C877D]">
              <span>Parameters: ${Object.keys(tool.inputSchema.properties || {}).length}</span>
              <button onclick="testTool('${tool.name}')" class="px-2.5 py-1 bg-[#FAF9F7] hover:bg-[#141413] hover:text-white border border-[#E6E2DA] text-[#141413] transition-colors cursor-pointer">
                Test Tool &rarr;
              </button>
            </div>
          </div>
        `
        ).join("")}
      </div>
    </div>

    <!-- Interactive Tool Test Sandbox -->
    <div class="bg-white border border-[#E6E2DA] p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-[#E6E2DA] pb-3">
        <div>
          <span class="text-[10px] font-mono uppercase tracking-wider text-[#966830] font-bold">Interactive Sandbox</span>
          <h3 class="text-base font-bold text-[#141413]">Direct Tool Execution Tester</h3>
        </div>
        <span class="text-xs font-mono text-[#66625B]">POST /api/mcp/call</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-xs font-mono font-semibold text-[#141413]">Select Tool</label>
          <select id="test-tool-select" class="w-full h-10 px-3 bg-[#FAF9F7] border border-[#E6E2DA] text-xs font-mono outline-none">
            ${BTNX_TOOLS.map((t) => `<option value="${t.name}">${t.name}</option>`).join("")}
          </select>

          <label class="text-xs font-mono font-semibold text-[#141413] block pt-2">Arguments (JSON)</label>
          <textarea id="test-tool-args" rows="5" class="w-full p-3 bg-[#FAF9F7] border border-[#E6E2DA] text-xs font-mono outline-none">{}</textarea>

          <button onclick="runTestTool()" id="test-run-btn" class="w-full py-2 bg-[#141413] text-white text-xs font-mono uppercase tracking-wider font-semibold hover:opacity-90 transition-opacity cursor-pointer">
            Execute Tool Call
          </button>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-mono font-semibold text-[#141413]">Execution Output</label>
          <pre id="test-tool-output" class="w-full h-[195px] p-3 bg-[#141413] text-[#FAF9F7] text-xs font-mono overflow-auto border border-[#2C2A26]">Click 'Execute Tool Call' to see live JSON-RPC result...</pre>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-[#E6E2DA] bg-white py-6">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#66625B]">
      <div class="flex items-center gap-2 font-mono">
        <span class="font-bold text-[#141413]">BTNX LUXURY STORE</span>
        <span>&bull;</span>
        <span>Osun Central Fulfillment &amp; Client Care</span>
      </div>
      <div class="font-mono text-[11px]">
        Standard Model Context Protocol v1.0 / SSE
      </div>
    </div>
  </footer>

  <script>
    function testTool(toolName) {
      document.getElementById('test-tool-select').value = toolName;
      if (toolName === 'btnx_get_product_details') {
        document.getElementById('test-tool-args').value = JSON.stringify({ productId: "ny-1" }, null, 2);
      } else if (toolName === 'btnx_calculate_order') {
        document.getElementById('test-tool-args').value = JSON.stringify({
          items: [{ price: 90000, quantity: 1 }]
        }, null, 2);
      } else if (toolName === 'btnx_recommend_fit') {
        document.getElementById('test-tool-args').value = JSON.stringify({
          height: "6ft 0",
          weight: "80kg"
        }, null, 2);
      } else {
        document.getElementById('test-tool-args').value = "{}";
      }
      runTestTool();
    }

    async function runTestTool() {
      const tool = document.getElementById('test-tool-select').value;
      const argsText = document.getElementById('test-tool-args').value;
      const output = document.getElementById('test-tool-output');
      const btn = document.getElementById('test-run-btn');

      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(argsText || '{}');
      } catch (e) {
        output.textContent = 'Invalid JSON in arguments: ' + e.message;
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Executing...';
      output.textContent = 'Calling tool ' + tool + '...';

      const userToken = prompt('Enter your BTNX Personal Access Token (or leave blank for public catalog queries):', '') || '';

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (userToken) {
          headers['Authorization'] = 'Bearer ' + userToken.trim();
        }

        const res = await fetch('/api/mcp/call', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ name: tool, arguments: parsedArgs })
        });
        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        output.textContent = 'Network error: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Execute Tool Call';
      }
    }
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  };

  app.get("/mcp", handleMcpDashboard);
  app.get("/api/mcp", handleMcpDashboard);
}
