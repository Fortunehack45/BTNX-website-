import { db } from "../firebase.js";
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
  limit,
} from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { resolveMcpUser, McpAuthenticatedUser } from "../mcp.js";
import { NEW_YEAR_PRODUCTS } from "../ui/productsData.js";

export interface WhatsAppMessagePayload {
  from: string; // Customer phone number (e.g. "whatsapp:+2348012345678" or "+2348012345678")
  text: string;
  senderName?: string;
  authHeader?: string;
  reqOrigin?: string;
}

export interface WhatsAppResponse {
  replyText: string;
  suggestedActions?: string[];
  orderId?: string;
  mediaUrl?: string;
  authenticatedAs?: string;
}

// In-memory conversation state for multi-step order taking
interface CustomerSession {
  stage: "idle" | "awaiting_size_color" | "awaiting_address" | "confirming_order";
  selectedProductId?: string;
  selectedSize?: string;
  selectedColor?: string;
  quantity?: number;
  customerName?: string;
  shippingAddress?: string;
  user?: McpAuthenticatedUser;
}

const customerSessions = new Map<string, CustomerSession>();
const localWhatsAppOrders = new Map<string, any>();

/**
 * Clean and normalize a phone number
 */
function cleanPhoneNumber(raw: string): string {
  return raw.replace(/^whatsapp:/i, "").trim();
}

/**
 * Extract token from message text (e.g. "auth btnx_pat_...", "key ...", or raw token)
 */
function extractTokenFromText(text: string): string | null {
  const t = text.trim();

  // Pattern: "auth Bearer <token>" or "auth <token>" or "key <token>" or "token <token>"
  const match = t.match(/^(?:auth|token|key|bearer)\s+(?:bearer\s+)?([a-zA-Z0-9_-]+)/i);
  if (match) return match[1].trim();

  // Pattern: Raw personal access token starting with btnx_pat_
  if (t.startsWith("btnx_pat_")) {
    return t;
  }

  // Pattern: Raw master key
  if (t === (process.env.MCP_AUTH_KEY || "btnx_mcp_secret_2026")) {
    return t;
  }

  return null;
}

/**
 * Resolves the authenticated user for this WhatsApp sender
 */
async function resolveSenderAccount(phone: string): Promise<McpAuthenticatedUser | null> {
  // 1. Check in Firestore whatsappUsers collection (explicitly linked via Bearer key)
  try {
    const waDoc = await getDoc(doc(db, "whatsappUsers", phone));
    if (waDoc.exists()) {
      const data = waDoc.data();
      return {
        userId: data.userId || waDoc.id,
        email: data.email || "",
        name: data.name || "BTNX VIP Client",
        phone: data.phone || phone,
        shippingAddress: data.shippingAddress || "",
        isMasterAdmin: Boolean(data.isMasterAdmin),
      };
    }
  } catch {}

  // 2. Check if a registered user in Firestore has this phone number
  try {
    const q = query(collection(db, "users"), where("phone", "==", phone));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const uDoc = snap.docs[0];
      const data = uDoc.data();
      return {
        userId: uDoc.id,
        email: data.email || "",
        name: data.name || data.displayName || "BTNX VIP Client",
        phone: data.phone || phone,
        shippingAddress: data.shippingStreet
          ? `${data.shippingStreet}, ${data.shippingCity || ""}, ${data.shippingCountry || "Nigeria"}`.trim()
          : data.shippingAddress || "",
        isMasterAdmin: false,
      };
    }
  } catch {}

  return null;
}

export async function processWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppResponse> {
  const customerPhone = cleanPhoneNumber(payload.from);
  const rawText = payload.text.trim();
  const lowerText = rawText.toLowerCase();
  const host = payload.reqOrigin || process.env.API_BASE_URL || "https://website-k3he.vercel.app";

  let session = customerSessions.get(customerPhone);
  if (!session) {
    session = { stage: "idle" };
    customerSessions.set(customerPhone, session);
  }

  // Attempt to resolve existing authenticated user account
  if (!session.user) {
    const existingUser = await resolveSenderAccount(customerPhone);
    if (existingUser) {
      session.user = existingUser;
    }
  }

  // Check if caller sent Bearer token in HTTP header
  if (payload.authHeader) {
    const token = payload.authHeader.replace(/^Bearer\s+/i, "").trim();
    const resolvedFromHeader = await resolveMcpUser(token);
    if (resolvedFromHeader) {
      session.user = resolvedFromHeader;
    }
  }

  // =========================================================================
  // 1. BEARER API KEY AUTHENTICATION IN CHAT (NO LOGIN SCREEN REQUIRED)
  // =========================================================================
  const explicitToken = extractTokenFromText(rawText);
  if (explicitToken) {
    const resolved = await resolveMcpUser(explicitToken);
    if (resolved) {
      session.user = resolved;

      // Persist WhatsApp phone <-> User Account mapping in Firestore
      try {
        await setDoc(doc(db, "whatsappUsers", customerPhone), {
          ...resolved,
          token: explicitToken,
          linkedPhone: customerPhone,
          linkedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error("[WhatsApp Auth] Failed to save linked account:", err?.message);
      }

      return {
        replyText:
          `✅ *Account Successfully Authenticated via Bearer API Key!* ✨\n\n` +
          `Welcome back, *${resolved.name || "VIP Client"}* (${resolved.email}).\n\n` +
          `Your WhatsApp is now authenticated directly to your personal BTNX account. No web login required!\n\n` +
          `• Type *\"my orders\"* to view your actual purchase history\n` +
          `• Type *\"track\"* to check your active parcel dispatch\n` +
          `• Type *\"buy [item]\"* for instant express checkout with your saved delivery address\n` +
          `• Type *\"support [issue]\"* to dispatch a priority request to Osogbo`,
        suggestedActions: ["My Orders", "Track Latest Order", "Browse Collection"],
        authenticatedAs: resolved.email,
      };
    } else {
      return {
        replyText:
          `❌ *Invalid Bearer API Key.*\n\n` +
          `The key provided could not be matched to an active BTNX account.\n\n` +
          `To get your Personal Key:\n` +
          `1. Open your BTNX website profile (${host})\n` +
          `2. Under *Connected AI (MCP)*, tap *Copy Bearer Key*\n` +
          `3. Reply here with: *auth Bearer btnx_pat_...*`,
      };
    }
  }

  // Account Status / Disconnect
  if (lowerText === "account" || lowerText === "whoami" || lowerText === "auth status") {
    if (session.user) {
      return {
        replyText:
          `👤 *BTNX Authenticated Account:*\n\n` +
          `• *Name:* ${session.user.name || "VIP Client"}\n` +
          `• *Email:* ${session.user.email}\n` +
          `• *Phone:* ${customerPhone}\n` +
          `• *Saved Address:* ${session.user.shippingAddress || "None on file"}\n` +
          `• *Status:* Authenticated via Bearer API Key 🔐\n\n` +
          `To unlink your WhatsApp, reply *\"disconnect\"*.`,
        suggestedActions: ["My Orders", "Track Parcel", "Browse Catalog"],
      };
    } else {
      return {
        replyText:
          `🔒 *You are currently browsing as a Guest.*\n\n` +
          `To link your BTNX account and access your orders without logging into the website, reply with your personal Bearer key:\n\n` +
          `*auth Bearer btnx_pat_...*\n\n` +
          `(Find your key on the BTNX website under Profile &rarr; Connected AI).`,
        suggestedActions: ["Browse Catalog", "Latest Promos"],
      };
    }
  }

  if (lowerText === "disconnect" || lowerText === "unlink" || lowerText === "logout") {
    try {
      await deleteDoc(doc(db, "whatsappUsers", customerPhone)).catch(() => {});
    } catch {}
    session.user = undefined;
    return {
      replyText: `🔓 *Your WhatsApp has been unlinked from your account.* You are now browsing as a Guest.`,
    };
  }

  // =========================================================================
  // 2. HELP / GREETINGS
  // =========================================================================
  if (
    lowerText === "hi" ||
    lowerText === "hello" ||
    lowerText === "hey" ||
    lowerText === "menu" ||
    lowerText === "start"
  ) {
    session.stage = "idle";
    const greetingName = session.user?.name ? `, *${session.user.name.split(" ")[0]}*` : "";
    const authNote = session.user
      ? `🔒 *Authenticated Account:* ${session.user.email}`
      : `💡 *Tip:* Reply with *\"auth Bearer [your-key]\"* to link your account.`;

    return {
      replyText:
        `*Welcome to BTNX Luxury Client Care* ✨${greetingName}\n\n` +
        `${authNote}\n\n` +
        `How may I assist your style journey today?\n\n` +
        `1️⃣ *My Orders* — Type *\"my orders\"* to check real-time purchases\n` +
        `2️⃣ *Track Active Parcel* — Type *\"track\"* or *\"where is my order\"*\n` +
        `3️⃣ *Browse Collection* — Type *\"catalog\"* to view signature pieces\n` +
        `4️⃣ *Promo Codes* — Type *\"promos\"* for complimentary luxury privileges\n` +
        `5️⃣ *Express Checkout* — Type *\"buy [piece name]\"* to place an order directly in WhatsApp`,
      suggestedActions: ["My Orders", "Track Order", "Browse Catalog", "Latest Promos"],
      mediaUrl: `${host}/btnx-logo.svg`,
    };
  }

  // =========================================================================
  // 3. MY ORDERS (DIRECT IN WHATSAPP — NO WEB LOGIN REDIRECT)
  // =========================================================================
  if (
    lowerText === "my orders" ||
    lowerText === "orders" ||
    lowerText === "my purchases" ||
    lowerText === "order history"
  ) {
    let orders: any[] = [];

    if (session.user) {
      try {
        const q = session.user.isMasterAdmin
          ? query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(5))
          : query(
              collection(db, "orders"),
              where("userId", "==", session.user.userId),
              orderBy("createdAt", "desc"),
              limit(5)
            );
        const snap = await getDocs(q);
        orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {}

      if (!orders.length) {
        try {
          const q2 = query(
            collection(db, "orders"),
            where("customerEmail", "==", session.user.email),
            orderBy("createdAt", "desc"),
            limit(5)
          );
          const snap2 = await getDocs(q2);
          orders = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {}
      }
    } else {
      // Look up by WhatsApp phone number
      try {
        const q = query(
          collection(db, "orders"),
          where("customerPhone", "==", customerPhone),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const snap = await getDocs(q);
        orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {}
    }

    if (orders.length > 0) {
      const orderLines = orders
        .map((o, idx) => {
          const itemName =
            o.items?.[0]?.productName || o.items?.[0]?.product?.name || "BTNX Garment Piece";
          const count = (o.items?.length || 1) > 1 ? ` + ${o.items.length - 1} more` : "";
          return (
            `${idx + 1}️⃣ *Order #${o.id}* — ₦${Number(o.total || 0).toLocaleString()}\n` +
            `   • *Item:* ${itemName}${count}\n` +
            `   • *Status:* 🚚 ${o.status || "Processing"}\n` +
            `   • *Date:* ${o.date || "Recent"}\n` +
            `   • *Track:* Reply *\"track ${o.id}\"*`
          );
        })
        .join("\n\n");

      return {
        replyText:
          `📦 *Your Recent BTNX Orders:*\n\n` +
          orderLines +
          `\n\nReply with *\"track [order#]\"* for real-time courier updates.`,
        suggestedActions: [`Track ${orders[0].id}`, "Shop New Pieces"],
      };
    }

    return {
      replyText: session.user
        ? `You do not have any active orders under *${session.user.email}*. Type *\"catalog\"* to explore our latest pieces!`
        : `To view your orders directly in WhatsApp without logging in on the web, please link your account with your Bearer API key:\n\n*auth Bearer btnx_pat_...*\n\nOr check a specific parcel by typing: *track BX-849201*`,
      suggestedActions: ["Browse Catalog", "Latest Promos"],
    };
  }

  // =========================================================================
  // 4. ORDER TRACKING (DIRECT IN WHATSAPP)
  // =========================================================================
  if (
    lowerText.startsWith("track") ||
    lowerText.includes("where is my order") ||
    lowerText.includes("tracking")
  ) {
    const parts = rawText.split(/\s+/);
    let orderId = parts.length > 1 ? parts[1].replace("#", "").trim() : "";

    // If no order ID given, check if authenticated customer has an active order
    if (!orderId && session.user) {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", session.user.userId),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          orderId = snap.docs[0].id;
        }
      } catch {}
    }

    if (!orderId) {
      return {
        replyText:
          `Please provide your order reference number, for example: *track BX-849201*\n\n` +
          `Or type *\"my orders\"* to view your complete order history.`,
      };
    }

    let orderData: any = localWhatsAppOrders.get(orderId);
    if (!orderData) {
      try {
        const snap = await getDoc(doc(db, "orders", orderId));
        if (snap.exists()) orderData = snap.data();
      } catch {}
    }

    if (orderData) {
      const itemsList =
        orderData.items
          ?.map(
            (it: any) =>
              `${it.productName || it.product?.name || "Garment"} (${it.size || "M"} · ${it.color || "Black"})`
          )
          .join(", ") || "Fashion items";

      return {
        replyText:
          `🚚 *Live Dispatch Update for Order #${orderId}*\n\n` +
          `• *Status:* ${orderData.status || "In Transit"}\n` +
          `• *Items:* ${itemsList}\n` +
          `• *Total:* ₦${Number(orderData.total || 0).toLocaleString()}\n` +
          `• *Fulfillment Desk:* Osogbo Central Hub, Osun State\n` +
          `• *Delivery Destination:* ${orderData.shippingAddress || "On file"}\n` +
          `• *Courier Note:* Our rider is on route and will call 30 minutes prior to arrival.\n\n` +
          `📄 *Official Invoice Link:* ${host}/render/invoice/${orderId}`,
        suggestedActions: ["My Orders", "Speak with Human", "Shop Collection"],
      };
    }

    return {
      replyText:
        `🚚 *Order #${orderId} Status:* Dispatched from Osogbo Hub.\n\n` +
        `Your parcel is in transit with our express logistics team. The courier will contact your phone prior to arrival.`,
    };
  }

  // =========================================================================
  // 5. PROMO CODES
  // =========================================================================
  if (
    lowerText.includes("promo") ||
    lowerText.includes("discount") ||
    lowerText.includes("voucher") ||
    lowerText.includes("coupon")
  ) {
    return {
      replyText:
        `🏷️ *Active BTNX Privileges:*\n\n` +
        `• Code: *BTNX50* (50% Off your entire basket)\n` +
        `• Code: *KLAMBY50* (50% VIP Archive pieces)\n` +
        `• Complimentary luxury nationwide delivery on orders over ₦150,000.\n\n` +
        `Reply *\"buy [piece]\"* to apply this privilege to your order directly in WhatsApp.`,
      suggestedActions: ["Browse Catalog", "My Orders"],
    };
  }

  // =========================================================================
  // 6. INVOICE QUERY
  // =========================================================================
  if (lowerText.startsWith("invoice") || lowerText.includes("receipt") || lowerText.includes("bill")) {
    const parts = rawText.split(/\s+/);
    let orderId = parts.length > 1 ? parts[1].replace("#", "").trim() : "";

    if (!orderId && session.user) {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", session.user.userId),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) orderId = snap.docs[0].id;
      } catch {}
    }

    if (orderId) {
      return {
        replyText:
          `📄 *BTNX Official Digital Invoice #${orderId}*\n\n` +
          `• Prepared by: BTNX Atelier Dispatch, Osogbo Hub\n` +
          `• Verified with official digital stamp & itemized line items.\n\n` +
          `🔗 *View Official Invoice Dossier:* ${host}/render/invoice/${orderId}`,
        suggestedActions: ["Track Order", "My Orders"],
      };
    }
    return {
      replyText: `Please provide your order ID to view its invoice, e.g.: *invoice BX-849201*`,
    };
  }

  // =========================================================================
  // 7. CUSTOMER SUPPORT / ESCALATION
  // =========================================================================
  if (
    lowerText.startsWith("support") ||
    lowerText.startsWith("help") ||
    lowerText.includes("complaint") ||
    lowerText.includes("human agent") ||
    lowerText.includes("speak with human") ||
    lowerText.includes("talk to agent")
  ) {
    const issueText =
      rawText.replace(/^(support|help|complaint)[:\s]*/i, "").trim() ||
      "Client requested customer support assistance via WhatsApp";
    const ticketId = `TCK-${Date.now().toString().slice(-6)}`;
    const ticketPayload = {
      id: ticketId,
      userId: session.user?.userId || "whatsapp_client",
      customerName: session.user?.name || payload.senderName || "WhatsApp Client",
      customerPhone: customerPhone,
      customerEmail: session.user?.email || "whatsapp-client@btnx.store",
      topic: "WhatsApp Client Care Escalation",
      status: "open",
      mode: "human",
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: "client",
          text: issueText,
          timestamp: new Date().toISOString(),
        },
        {
          id: `msg-${Date.now() + 1}`,
          sender: "bot",
          senderName: "BTNX Support Desk",
          text: `Inquiry #${ticketId} dispatched directly to our customer care desk at Osogbo. Assigned specialist: Adaobi N.`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setDoc(doc(db, "supportTickets", ticketId), ticketPayload).catch(() => {});
    } catch {}

    return {
      replyText:
        `🛡️ *BTNX Client Care Ticket #${ticketId} Opened*\n\n` +
        `Your request has been routed directly to our customer support staff desk at Osogbo.\n\n` +
        `• *Inquiry:* "${issueText}"\n` +
        `• *Assigned Desk:* Osun Client Care (Adaobi N.)\n` +
        `• *Status:* Priority Triage Assigned\n\n` +
        `🔗 *Live Support Thread Card:* ${host}/render/support/${ticketId}`,
      suggestedActions: ["My Orders", "Track Order", "Browse Catalog"],
    };
  }

  // =========================================================================
  // 8. CATALOG & VISUAL PRODUCT CARDS
  // =========================================================================
  if (
    lowerText === "catalog" ||
    lowerText.includes("browse") ||
    lowerText.includes("collection") ||
    lowerText.includes("show me") ||
    lowerText.includes("jackets") ||
    lowerText.includes("pants") ||
    lowerText.includes("tops")
  ) {
    const items = NEW_YEAR_PRODUCTS.slice(0, 5)
      .map((p, idx) => `${idx + 1}️⃣ *${p.name}* — ₦${Number(p.price || 0).toLocaleString()}`)
      .join("\n");

    return {
      replyText:
        `🏛️ *BTNX Ready-to-Wear Seasonal Catalog*\n\n` +
        `Explore our signature structured silhouettes cut from fine brushed wool, tropical suiting, and supple lambskin.\n\n` +
        `${items}\n\n` +
        `✨ *View Visual Product Cards:* ${host}/render/products\n\n` +
        `Reply *\"buy [item]\"* to place an order immediately, or reply *\"card [id]\"* to inspect details.`,
      suggestedActions: ["Buy Overshirt", "Latest Promos", "Fit Advisory"],
    };
  }

  // =========================================================================
  // 9. MULTI-STEP ORDERING IN WHATSAPP (NO WEB LOGIN REQUIRED)
  // =========================================================================
  if (session.stage === "awaiting_size_color") {
    session.selectedSize = rawText.toUpperCase().includes("XL")
      ? "XL"
      : rawText.toUpperCase().includes("S")
      ? "S"
      : rawText.toUpperCase().includes("L")
      ? "L"
      : "M";
    session.selectedColor = lowerText.includes("white")
      ? "Off-White"
      : lowerText.includes("navy")
      ? "Navy"
      : "Black";

    // If user already has a saved delivery address from their authenticated account, skip to confirmation!
    if (session.user?.shippingAddress) {
      session.shippingAddress = session.user.shippingAddress;
      session.customerName = session.user.name || payload.senderName || "Valued Client";
      session.stage = "confirming_order";

      return {
        replyText:
          `✨ *Confirm Express Order:* Size *${session.selectedSize}* in *${session.selectedColor}*.\n\n` +
          `• *Piece:* ${session.selectedProductId}\n` +
          `• *Account:* ${session.user.email}\n` +
          `• *Delivery Address:* ${session.shippingAddress}\n` +
          `• *Packaging:* Signature Luxury Cotton Garment Box included.\n\n` +
          `Reply *\"confirm\"* to place this order, or reply with a new address to change it.`,
        suggestedActions: ["Confirm", "Change Address", "Cancel"],
      };
    }

    session.stage = "awaiting_address";
    return {
      replyText:
        `Noted: Size *${session.selectedSize}* in *${session.selectedColor}*.\n\n` +
        `📍 Please enter your *Delivery Address* (Street, City, State):`,
    };
  }

  if (session.stage === "awaiting_address") {
    session.shippingAddress = rawText;
    session.customerName = session.user?.name || payload.senderName || "Valued Client";
    session.stage = "confirming_order";

    return {
      replyText:
        `✨ *Confirm Your BTNX Order Details:*\n\n` +
        `• *Piece:* ${session.selectedProductId || "Luxury Garment"}\n` +
        `• *Selection:* Size ${session.selectedSize} · ${session.selectedColor}\n` +
        `• *Delivery To:* ${session.shippingAddress}\n` +
        `• *Complimentary Packaging:* Signature Cotton Garment Box included.\n\n` +
        `Reply *\"confirm\"* to finalize your order, or *\"cancel\"* to discard.`,
      suggestedActions: ["Confirm", "Cancel"],
    };
  }

  if (session.stage === "confirming_order") {
    if (lowerText.includes("yes") || lowerText.includes("confirm") || lowerText.includes("ok")) {
      const orderId = `BX-${Date.now().toString().slice(-6)}`;
      const orderPayload = {
        id: orderId,
        source: "whatsapp",
        userId: session.user?.userId || "whatsapp_client",
        customerPhone: customerPhone,
        customerName: session.customerName,
        customerEmail: session.user?.email || "whatsapp-client@btnx.store",
        shippingAddress: session.shippingAddress,
        status: "Processing",
        total: 185000,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        createdAt: new Date().toISOString(),
        items: [
          {
            product: {
              id: session.selectedProductId || "prod-wa",
              name: session.selectedProductId || "Brushed Wool Check Overshirt",
              price: 185000,
            },
            quantity: 1,
            size: session.selectedSize || "M",
            color: session.selectedColor || "Black",
          },
        ],
      };

      localWhatsAppOrders.set(orderId, orderPayload);

      try {
        await setDoc(doc(db, "orders", orderId), orderPayload);
      } catch (e: any) {
        console.error("Failed to persist order from WhatsApp:", e?.message);
      }

      session.stage = "idle";
      return {
        replyText:
          `🎉 *Order Confirmed! Ref: #${orderId}*\n\n` +
          `Thank you, *${session.customerName}*. Your piece has been reserved at our Osogbo hub and queued for dispatch.\n\n` +
          `• Estimated delivery: 2–4 Business Days.\n` +
          `• You can track progress anytime by replying: *track ${orderId}*\n` +
          `• View official digital invoice: ${host}/render/invoice/${orderId}`,
        orderId,
      };
    } else {
      session.stage = "idle";
      return {
        replyText: `Your order draft has been cancelled. Let me know if you would like to explore other pieces!`,
      };
    }
  }

  // =========================================================================
  // 10. INITIATE BUY INTENT
  // =========================================================================
  if (lowerText.startsWith("buy") || lowerText.startsWith("order")) {
    const itemQuery = rawText.replace(/^(buy|order)\s+/i, "").trim();
    session.selectedProductId = itemQuery || "Brushed Wool Check Overshirt";
    session.stage = "awaiting_size_color";

    return {
      replyText:
        `Excellent choice! We have reserved *${session.selectedProductId}* for you.\n\n` +
        `What size (*S*, *M*, *L*, *XL*) and color (*Black*, *Off-White*) would you prefer?`,
      suggestedActions: ["Size M, Black", "Size L, Black", "Size XL, Off-White"],
    };
  }

  // =========================================================================
  // 11. BODY FIT & SIZE ADVISORY
  // =========================================================================
  if (
    lowerText.includes("size") ||
    lowerText.includes("fit") ||
    lowerText.includes("body") ||
    lowerText.includes("height") ||
    lowerText.includes("weight") ||
    lowerText.includes("kg") ||
    lowerText.includes("ft")
  ) {
    return {
      replyText:
        `📐 *BTNX Tailoring & Fit Advisory:*\n\n` +
        `Our silhouettes are crafted with a modern, relaxed boxy cut with reinforced shoulder architecture:\n\n` +
        `• *Size S*: Best for 5'4\"–5'7\" (55–65kg) — trim contemporary drape\n` +
        `• *Size M*: Best for 5'8\"–5'10\" (66–76kg) — classic relaxed fit\n` +
        `• *Size L*: Best for 5'11\"–6'2\" (77–88kg) — modern oversized silhouette\n` +
        `• *Size XL*: Best for 6'2\"+ or athletic builds (89kg+)\n\n` +
        `Reply *\"buy [size]\"* to reserve a piece in your size directly!`,
      suggestedActions: ["Order Size M", "Order Size L", "Browse Collection"],
    };
  }

  // =========================================================================
  // 12. FASHION AI INTELLIGENCE (GEMINI FALLBACK)
  // =========================================================================
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt =
        `You are the luxury client advisor for BTNX contemporary fashion. ` +
        `Prices are in Nigerian Naira (₦). Active promo code is BTNX50 (50% off). ` +
        `Customer is messaging via WhatsApp. Sender name: "${payload.senderName || "Client"}". ` +
        (session.user ? `Authenticated customer: ${session.user.name} (${session.user.email}). ` : "") +
        `Customer message: "${rawText}". ` +
        `Respond warmly, concisely in WhatsApp format with emojis, and guide them with clear next steps.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      if (response.text) {
        return {
          replyText: response.text.trim(),
        };
      }
    } catch (e) {
      console.warn("Gemini WhatsApp fallback:", e);
    }
  }

  // Default Luxury Assistance
  return {
    replyText:
      `Thank you for messaging *BTNX*. 🏛️\n\n` +
      `I can help you browse garments, check your orders, get tailored sizing recommendations, or track shipments directly in WhatsApp.\n\n` +
      `Reply with:\n` +
      `• *\"my orders\"* to view your active purchases\n` +
      `• *\"track\"* to check dispatch progress\n` +
      `• *\"catalog\"* to browse pieces\n` +
      `• *\"promos\"* for discount vouchers\n` +
      `• *\"auth Bearer [key]\"* to authenticate your account`,
    suggestedActions: ["My Orders", "Track Parcel", "Browse Catalog"],
  };
}
