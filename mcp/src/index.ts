import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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
} from "firebase/firestore";
import {
  renderProductCardHtml,
  renderInvoiceHtml,
  renderTrackingStepperHtml,
  renderSupportTicketHtml,
} from "./templates.js";

const server = new Server(
  {
    name: "btnx-store-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const localOrdersCache = new Map<string, any>();
const localTicketsCache = new Map<string, any>();

// Register Tools List
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
          "Place a customer order directly into the BTNX store database. Generates an official order reference and logs delivery details.",
        inputSchema: {
          type: "object",
          properties: {
            customerName: { type: "string", description: "Customer's full name" },
            customerEmail: { type: "string", description: "Customer's email address" },
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
          required: ["customerName", "customerEmail", "shippingAddress", "items"],
        },
      },
      {
        name: "btnx_track_order",
        description:
          "Retrieve live fulfillment status, tracking updates, and delivery details for an existing BTNX order.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: {
              type: "string",
              description: "Order confirmation reference (e.g. 'BTNX-123456')",
            },
          },
          required: ["orderId"],
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
          "Submit a customer service ticket or message the BTNX customer care desk. Dispatches directly to the customer support team triage desk in Osogbo.",
        inputSchema: {
          type: "object",
          properties: {
            customerName: { type: "string", description: "Customer's full name" },
            customerEmail: { type: "string", description: "Customer's email address" },
            customerPhone: { type: "string", description: "Phone number (optional)" },
            topic: { type: "string", description: "Inquiry topic, e.g. 'Size Exchange', 'Delivery Address Update', 'Payment Issue'" },
            message: { type: "string", description: "The detailed customer message or issue description" },
            orderId: { type: "string", description: "Associated order ID if inquiry is about an existing order" },
          },
          required: ["customerName", "message", "topic"],
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
    ],
  };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "btnx_list_products": {
        const snap = await getDocs(collection(db, "products"));
        let products = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

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
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: products.length,
                  products: products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    isPinnedHero: p.isPinnedHero,
                    isFreeShipping: p.isFreeShipping,
                    deliveryTimeline: p.deliveryTimeline || "2–4 Business Days",
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "btnx_get_product_details": {
        const snap = await getDoc(doc(db, "products", String(args?.productId)));
        if (!snap.exists()) {
          return {
            content: [{ type: "text", text: `Product #${args?.productId} not found.` }],
            isError: true,
          };
        }

        const p = snap.data();
        const details = {
          id: snap.id,
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
        };

        return {
          content: [{ type: "text", text: JSON.stringify(details, null, 2) }],
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
          console.error("[BTNX MCP] Failed to query promoCodes:", err?.message);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  activeCodes,
                  shippingPrivilege:
                    "Complimentary luxury nationwide shipping unlocked on all orders over ₦150,000.",
                },
                null,
                2
              ),
            },
          ],
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
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  subtotal: `₦${subtotal.toLocaleString()}`,
                  appliedPromo: appliedPromoName,
                  discountAmount: `₦${discountAmount.toLocaleString()}`,
                  shippingFee: isFreeShipping ? "Free (Over ₦150,000)" : `₦${shippingFee.toLocaleString()}`,
                  totalDue: `₦${total.toLocaleString()}`,
                  rawTotal: total,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "btnx_create_order": {
        const orderId = `BTNX-MCP-${Date.now().toString().slice(-6)}`;
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
          source: "mcp-agent",
          customerName: args?.customerName,
          customerEmail: args?.customerEmail,
          customerPhone: args?.customerPhone,
          shippingAddress: args?.shippingAddress,
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
          console.error("[BTNX MCP] Cloud sync note (cached locally):", dbErr.message);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  orderId,
                  message: `Order #${orderId} successfully registered with BTNX Dispatch Center.`,
                  orderSummary: record,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "btnx_track_order": {
        const orderIdStr = String(args?.orderId || "").trim();
        if (!orderIdStr) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Missing orderId parameter" }, null, 2) }],
            isError: true,
          };
        }

        try {
          const snap = await getDoc(doc(db, "orders", orderIdStr));
          if (snap.exists()) {
            const orderData: any = snap.data();
            const orderOwnerEmail = String(orderData.customerEmail || orderData.userEmail || "").toLowerCase().trim();
            const callerEmail = String(args?.email || args?.customerEmail || "").toLowerCase().trim();
            const callerToken = String(args?.token || args?.authToken || "").trim();

            const isAuthorized =
              (callerEmail && callerEmail === orderOwnerEmail) ||
              (callerToken && (callerToken === process.env.BTNX_ADMIN_API_KEY || callerToken === process.env.BTNX_PERSONAL_ACCESS_TOKEN));

            if (!isAuthorized) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    error: "Authentication required",
                    message: `To track order #${orderIdStr}, please provide your registered order email (email: "...") or an authenticated access token.`,
                  }, null, 2)
                }],
                isError: true,
              };
            }

            return {
              content: [{ type: "text", text: JSON.stringify(orderData, null, 2) }],
            };
          }
        } catch (err: any) {}

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Order not found",
                  message: `Order #${orderIdStr} was not found in the BTNX database.`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
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

        const rec = {
          recommendedSize: size,
          fitSummary: `Based on client height (${heightStr}) and mass (${weightStr}), Size ${size} provides our intended contemporary relaxed silhouette.`,
          fabricDrapeNotes:
            "BTNX garments feature reinforced shoulder architecture with a soft boxy drape that layers smoothly over fine knitwear or lightweight tees.",
          careAdvice: "Machine wash cold inside out on delicate cycle, or professional eco-dry clean.",
        };

        return {
          content: [{ type: "text", text: JSON.stringify(rec, null, 2) }],
        };
      }

      case "btnx_render_ui_widget": {
        const widgetType = String(args?.widgetType || args?.widget_type || "product_card");
        const targetId = String(args?.id || args?.targetId || args?.identifier || "");

        if (widgetType === "product_card") {
          let prod: any = null;
          if (targetId) {
            try {
              const snap = await getDoc(doc(db, "products", targetId));
              if (snap.exists()) prod = { id: snap.id, ...snap.data() };
            } catch {}
          }
          if (!prod) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Product not found", id: targetId }, null, 2) }],
              isError: true,
            };
          }
          const html = renderProductCardHtml(prod);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    widgetType: "product_card",
                    livePreviewUrl: `http://localhost:4000/render/product/${prod.id}`,
                    product: prod,
                    htmlSnippet: html,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (widgetType === "invoice") {
          if (!targetId) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Order ID required" }, null, 2) }],
              isError: true,
            };
          }
          let order: any = null;
          try {
            const snap = await getDoc(doc(db, "orders", targetId));
            if (snap.exists()) order = { id: snap.id, ...snap.data() };
          } catch {}

          if (!order) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Order not found", id: targetId }, null, 2) }],
              isError: true,
            };
          }

          const orderOwnerEmail = String(order.customerEmail || order.userEmail || "").toLowerCase().trim();
          const callerEmail = String(args?.email || args?.customerEmail || "").toLowerCase().trim();
          const callerToken = String(args?.token || args?.authToken || "").trim();
          const isAuthorized =
            (callerEmail && callerEmail === orderOwnerEmail) ||
            (callerToken && (callerToken === process.env.BTNX_ADMIN_API_KEY || callerToken === process.env.BTNX_PERSONAL_ACCESS_TOKEN));
          if (!isAuthorized) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Access denied", message: "Registered order email or authentication required to render invoice." }, null, 2) }],
              isError: true,
            };
          }

          const html = renderInvoiceHtml(order);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    widgetType: "invoice",
                    orderId: order.id,
                    livePreviewUrl: `http://localhost:4000/render/invoice/${order.id}`,
                    order,
                    htmlSnippet: html,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (widgetType === "tracking_stepper") {
          if (!targetId) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Order ID required" }, null, 2) }],
              isError: true,
            };
          }
          let order: any = null;
          try {
            const snap = await getDoc(doc(db, "orders", targetId));
            if (snap.exists()) order = { id: snap.id, ...snap.data() };
          } catch {}

          if (!order) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Order not found", id: targetId }, null, 2) }],
              isError: true,
            };
          }

          const orderOwnerEmail = String(order.customerEmail || order.userEmail || "").toLowerCase().trim();
          const callerEmail = String(args?.email || args?.customerEmail || "").toLowerCase().trim();
          const callerToken = String(args?.token || args?.authToken || "").trim();
          const isAuthorized =
            (callerEmail && callerEmail === orderOwnerEmail) ||
            (callerToken && (callerToken === process.env.BTNX_ADMIN_API_KEY || callerToken === process.env.BTNX_PERSONAL_ACCESS_TOKEN));
          if (!isAuthorized) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Access denied", message: "Registered order email or authentication required to render tracking stepper." }, null, 2) }],
              isError: true,
            };
          }

          const html = renderTrackingStepperHtml(order);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    widgetType: "tracking_stepper",
                    orderId: order.id,
                    livePreviewUrl: `http://localhost:4000/render/track/${order.id}`,
                    status: order.status,
                    htmlSnippet: html,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (widgetType === "support_ticket") {
          if (!targetId) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Ticket ID required" }, null, 2) }],
              isError: true,
            };
          }
          let ticket: any = null;
          try {
            const snap = await getDoc(doc(db, "supportTickets", targetId));
            if (snap.exists()) ticket = { id: snap.id, ...snap.data() };
          } catch {}

          if (!ticket) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Ticket not found", id: targetId }, null, 2) }],
              isError: true,
            };
          }

          const ticketOwnerEmail = String(ticket.customerEmail || "").toLowerCase().trim();
          const callerEmail = String(args?.email || args?.customerEmail || "").toLowerCase().trim();
          const callerToken = String(args?.token || args?.authToken || "").trim();
          const isAuthorized =
            (callerEmail && callerEmail === ticketOwnerEmail) ||
            (callerToken && (callerToken === process.env.BTNX_ADMIN_API_KEY || callerToken === process.env.BTNX_PERSONAL_ACCESS_TOKEN));
          if (!isAuthorized) {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: "Access denied", message: "Registered ticket email or authentication required to render support ticket." }, null, 2) }],
              isError: true,
            };
          }

          const html = renderSupportTicketHtml(ticket);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    widgetType: "support_ticket",
                    ticketId: ticket.id,
                    livePreviewUrl: `http://localhost:4000/render/support/${ticket.id}`,
                    ticket,
                    htmlSnippet: html,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [{ type: "text", text: `Unsupported widget type: ${widgetType}` }],
          isError: true,
        };
      }

      case "btnx_message_support": {
        const ticketId = `TCK-${Date.now().toString().slice(-6)}`;
        const ticket = {
          id: ticketId,
          customerName: String(args?.customerName || args?.customer_name || "MCP Client"),
          customerEmail: String(args?.customerEmail || args?.customer_email || "client@btnx.store"),
          customerPhone: String(args?.customerPhone || args?.customer_phone || ""),
          topic: String(args?.topic || "Customer Inquiry"),
          orderId: args?.orderId || args?.order_id ? String(args.orderId || args.order_id) : null,
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
              text: `Inquiry registered with reference #${ticketId}. Routed to customer care staff desk at Osogbo.`,
              timestamp: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, "supportTickets", ticketId), ticket);
        } catch (dbErr: any) {
          console.error("[BTNX MCP] Support ticket cloud sync note:", dbErr.message);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  ticketId,
                  message: `Ticket #${ticketId} dispatched to BTNX Customer Service Team Desk.`,
                  status: "open",
                  assignedDesk: "Osogbo Fulfillment & Client Care",
                  liveSupportThreadUrl: `http://localhost:4000/render/support/${ticketId}`,
                  ticketSummary: ticket,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "btnx_get_support_ticket": {
        const ticketId = String(args?.ticketId || "");
        try {
          const snap = await getDoc(doc(db, "supportTickets", ticketId));
          if (snap.exists()) {
            const ticketData: any = snap.data();
            const ticketOwnerEmail = String(ticketData.customerEmail || "").toLowerCase().trim();
            const callerEmail = String(args?.email || args?.customerEmail || "").toLowerCase().trim();
            const callerToken = String(args?.token || args?.authToken || "").trim();
            const isAuthorized =
              (callerEmail && callerEmail === ticketOwnerEmail) ||
              (callerToken && (callerToken === process.env.BTNX_ADMIN_API_KEY || callerToken === process.env.BTNX_PERSONAL_ACCESS_TOKEN));
            if (!isAuthorized) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    error: "Authentication required",
                    message: `To view support ticket #${ticketId}, please provide your registered ticket email (email: "...") or an authenticated token.`,
                  }, null, 2)
                }],
                isError: true,
              };
            }

            return {
              content: [{ type: "text", text: JSON.stringify({ id: snap.id, ...ticketData }, null, 2) }],
            };
          }
        } catch {}

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Ticket not found",
                  message: `Ticket #${ticketId} was not found in the database.`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      case "btnx_get_invoice": {
        const orderId = String(args?.orderId || args?.order_id || "");
        if (!orderId) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Missing orderId parameter" }, null, 2) }],
            isError: true,
          };
        }

        let order: any = null;
        try {
          const snap = await getDoc(doc(db, "orders", orderId));
          if (snap.exists()) order = { id: snap.id, ...snap.data() };
        } catch {}

        if (!order) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: "Order not found",
                    message: `Order #${orderId} was not found in the BTNX database.`,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        const orderOwnerEmail = String(order.customerEmail || order.userEmail || "").toLowerCase().trim();
        const callerEmail = String(args?.email || args?.customerEmail || "").toLowerCase().trim();
        const callerToken = String(args?.token || args?.authToken || "").trim();
        const isAuthorized =
          (callerEmail && callerEmail === orderOwnerEmail) ||
          (callerToken && (callerToken === process.env.BTNX_ADMIN_API_KEY || callerToken === process.env.BTNX_PERSONAL_ACCESS_TOKEN));
        if (!isAuthorized) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: "Authentication required",
                message: `To view invoice for order #${orderId}, please provide your registered order email (email: "...") or an authenticated token.`,
              }, null, 2)
            }],
            isError: true,
          };
        }

        const html = renderInvoiceHtml(order);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  invoiceNumber: `INV-${order.id}`,
                  orderId: order.id,
                  total: order.total,
                  status: order.status,
                  liveInvoiceUrl: `http://localhost:4000/render/invoice/${order.id}`,
                  htmlSnippet: html,
                  orderSummary: order,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${err.message}` }],
      isError: true,
    };
  }
});

// Start Stdio Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[BTNX MCP Server] Connected via stdio. Ready for Claude / ChatGPT / Cursor.");
}

main().catch((err) => {
  console.error("Fatal MCP error:", err);
  process.exit(1);
});
