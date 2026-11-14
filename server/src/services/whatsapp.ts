import { db } from "../firebase.js";
import { collection, getDocs, doc, getDoc, setDoc, query, where } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

export interface WhatsAppMessagePayload {
  from: string; // Customer phone number (e.g. "whatsapp:+2348012345678" or "+2348012345678")
  text: string;
  senderName?: string;
}

export interface WhatsAppResponse {
  replyText: string;
  suggestedActions?: string[];
  orderId?: string;
  mediaUrl?: string;
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
}

const customerSessions = new Map<string, CustomerSession>();
const localWhatsAppOrders = new Map<string, any>();

export async function processWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppResponse> {
  const customerId = payload.from.trim();
  const rawText = payload.text.trim();
  const lowerText = rawText.toLowerCase();

  let session = customerSessions.get(customerId);
  if (!session) {
    session = { stage: "idle" };
    customerSessions.set(customerId, session);
  }

  // 1. HELP / MENU / GREETINGS
  if (lowerText === "hi" || lowerText === "hello" || lowerText === "hey" || lowerText === "menu" || lowerText === "start") {
    session.stage = "idle";
    return {
      replyText:
        `*Welcome to BTNX Luxury Store Client Care* ✨\n\n` +
        `How may I assist your style journey today?\n\n` +
        `1️⃣ *Browse Collection* — Type *\"catalog\"* or ask for pieces (e.g., *\"show me jackets\"*)\n` +
        `2️⃣ *Latest Promo Codes* — Type *\"promos\"*\n` +
        `3️⃣ *Fit & Size Advice* — Ask *\"what size fits 5'11 75kg?\"*\n` +
        `4️⃣ *Track Your Order* — Type *\"track [order-id]\"*\n` +
        `5️⃣ *Place An Order* — Type *\"buy [piece name]\"* to start express WhatsApp checkout`,
      suggestedActions: ["Browse Catalog", "Latest Promos", "Fit Consultation", "Track Order"],
      mediaUrl: "http://localhost:4000/logo.png",
    };
  }

  // 2. PROMO CODES QUERY
  if (lowerText.includes("promo") || lowerText.includes("discount") || lowerText.includes("voucher") || lowerText.includes("coupon")) {
    return {
      replyText:
        `🏷️ *Active BTNX Privileges:*\n\n` +
        `• Code: *BTNX50* (50% Off your entire basket)\n` +
        `• Complimentary nationwide delivery unlocked on orders above ₦150,000.\n\n` +
        `Reply with *\"buy [piece]\"* to apply this privilege to your order.`,
      suggestedActions: ["Shop Jackets", "Shop Tops", "View Promos"],
    };
  }

  // 2B. INVOICE QUERY
  if (lowerText.startsWith("invoice") || lowerText.includes("receipt") || lowerText.includes("bill")) {
    const parts = rawText.split(/\s+/);
    const orderId = parts.length > 1 ? parts[1].replace("#", "").trim() : "";
    if (orderId) {
      return {
        replyText:
          `📄 *BTNX Official Invoice Dossier #${orderId}*\n\n` +
          `• Prepared by: BTNX Atelier Dispatch, Osogbo\n` +
          `• Verified with official digital stamp & itemized line items.\n\n` +
          `🔗 *View Official Digital Invoice:* http://localhost:4000/render/invoice/${orderId}`,
        suggestedActions: ["Track Order", "Speak with Human", "Shop Collection"],
      };
    }
    return {
      replyText: `Please provide your order ID to view its invoice, e.g.: *invoice WA-849201*`,
    };
  }

  // 2C. CUSTOMER SUPPORT MESSAGING & TICKET CREATION
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
      customerName: payload.senderName || "WhatsApp Client",
      customerPhone: customerId,
      customerEmail: "whatsapp-client@btnx.store",
      topic: "WhatsApp Support & Human Escalation",
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
          text: `Inquiry #${ticketId} transferred to our human support team at the Osun desk. An agent will respond shortly.`,
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
        `• *Desk SLA:* Human agent acknowledgment within 15 minutes.\n\n` +
        `🔗 *Live Support Thread Card:* http://localhost:4000/render/support/${ticketId}`,
      suggestedActions: ["Track Order", "Latest Promos", "Browse Catalog"],
    };
  }

  // 2D. CATALOG & VISUAL PRODUCT CARD QUERIES
  if (
    lowerText === "catalog" ||
    lowerText.includes("browse") ||
    lowerText.includes("collection") ||
    lowerText.includes("show me") ||
    lowerText.includes("jackets") ||
    lowerText.includes("pants") ||
    lowerText.includes("tops")
  ) {
    return {
      replyText:
        `🏛️ *BTNX Ready-to-Wear Seasonal Catalog*\n\n` +
        `Explore our signature structured silhouettes cut from fine brushed wool, tropical suiting, and supple lambskin.\n\n` +
        `1️⃣ *Brushed Wool Check Overshirt* — ₦185,000\n` +
        `2️⃣ *Tailored Wide-Leg Trouser* — ₦145,000\n` +
        `3️⃣ *Heavyweight Boxy Crewneck* — ₦95,000\n` +
        `4️⃣ *Leather Minimalist Blouson* — ₦320,000\n` +
        `5️⃣ *Mohair Blend Cardigan* — ₦165,000\n\n` +
        `✨ *View Visual Product Cards:* http://localhost:4000/render/products\n\n` +
        `Reply *\"buy [item]\"* to place an order, or reply *\"card [id]\"* to view a specific piece.`,
      suggestedActions: ["Buy Overshirt", "Buy Leather Blouson", "View Promos"],
    };
  }

  if (lowerText.startsWith("card") || lowerText.startsWith("product")) {
    const parts = rawText.split(/\s+/);
    const prodId = parts.length > 1 ? parts[1].trim() : "1";
    return {
      replyText:
        `✨ *BTNX Garment Dossier Card:*\n\n` +
        `Inspect full fabric details, silhouette tailoring, and size specifications:\n` +
        `🔗 *Interactive Product Card:* http://localhost:4000/render/product/${prodId}`,
    };
  }

  // 3. ORDER TRACKING
  if (lowerText.startsWith("track") || lowerText.includes("where is my order")) {
    const parts = rawText.split(/\s+/);
    const orderId = parts.length > 1 ? parts[1].replace("#", "").trim() : "";

    if (!orderId) {
      return {
        replyText: `Please provide your order reference number, for example: *track 1740001234*`,
      };
    }

    const cachedOrder = localWhatsAppOrders.get(orderId);
    if (cachedOrder) {
      return {
        replyText:
          `📦 *BTNX Order Dossier #${orderId}*\n\n` +
          `• *Status:* ${cachedOrder.status || "Processing"}\n` +
          `• *Total:* ₦${Number(cachedOrder.total || 0).toLocaleString()}\n` +
          `• *Date:* ${cachedOrder.date || "Recent"}\n` +
          `• *Items:* ${cachedOrder.items?.map((it: any) => `${it.product?.name || "Garment"} (${it.size} · ${it.color})`).join(", ") || "Fashion items"}\n\n` +
          `🔗 *Live Visual Stepper:* http://localhost:4000/render/track/${orderId}\n` +
          `📄 *Official Invoice:* http://localhost:4000/render/invoice/${orderId}`,
      };
    }

    try {
      const orderRef = doc(db, "orders", orderId);
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        const orderData = snap.data();
        return {
          replyText:
            `📦 *BTNX Order Dossier #${orderId}*\n\n` +
            `• *Status:* ${orderData.status || "Processing"}\n` +
            `• *Total:* ₦${Number(orderData.total || 0).toLocaleString()}\n` +
            `• *Date:* ${orderData.date || "Recent"}\n` +
            `• *Items:* ${orderData.items?.map((it: any) => `${it.product?.name || "Garment"} (${it.size} · ${it.color})`).join(", ") || "Fashion items"}\n\n` +
            `🔗 *Live Visual Stepper:* http://localhost:4000/render/track/${orderId}\n` +
            `📄 *Official Invoice:* http://localhost:4000/render/invoice/${orderId}`,
        };
      } else {
        return {
          replyText: `We could not locate order #${orderId}. Please verify the reference number or reply *\"support\"* to speak with a human client care specialist.`,
        };
      }
    } catch {
      return {
        replyText: `Order #${orderId} is currently being processed by our fulfillment center. Thank you for your patience.`,
      };
    }
  }

  // 4. MULTI-STEP ORDERING CONVERSATION
  if (session.stage === "awaiting_size_color") {
    // Expecting size & color: e.g. "L, Black" or "M"
    session.selectedSize = rawText.toUpperCase().includes("XL") ? "XL" : rawText.toUpperCase().includes("S") ? "S" : rawText.toUpperCase().includes("L") ? "L" : "M";
    session.selectedColor = lowerText.includes("white") ? "Off-White" : lowerText.includes("navy") ? "Navy" : "Black";
    session.stage = "awaiting_address";
    return {
      replyText:
        `Noted: Size *${session.selectedSize}* in *${session.selectedColor}*.\n\n` +
        `📍 Please enter your *Full Name & Delivery Address* (including city/state):`,
    };
  }

  if (session.stage === "awaiting_address") {
    session.shippingAddress = rawText;
    session.customerName = payload.senderName || "Valued Client";
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
      const orderId = `WA-${Date.now().toString().slice(-6)}`;
      const orderPayload = {
        id: orderId,
        source: "whatsapp",
        customerPhone: customerId,
        customerName: session.customerName,
        shippingAddress: session.shippingAddress,
        status: "Processing",
        total: 125000,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        createdAt: new Date().toISOString(),
        items: [
          {
            product: { id: session.selectedProductId || "prod-wa", name: session.selectedProductId || "BTNX Luxury Piece", price: 125000 },
            quantity: 1,
            size: session.selectedSize || "M",
            color: session.selectedColor || "Black",
          },
        ],
      };

      localWhatsAppOrders.set(orderId, orderPayload);

      try {
        await setDoc(doc(db, "orders", orderId), orderPayload);
      } catch (e) {
        console.error("Failed to persist order from WhatsApp: ", e);
      }

      session.stage = "idle";
      return {
        replyText:
          `🎉 *Order Confirmed! Ref: #${orderId}*\n\n` +
          `Thank you, ${session.customerName}. Your garment has been reserved and queued for dispatch.\n\n` +
          `• Estimated delivery: 2–4 Business Days.\n` +
          `• You can track progress anytime by typing: *track ${orderId}*`,
        orderId,
      };
    } else {
      session.stage = "idle";
      return {
        replyText: `Your order draft has been cancelled. Let me know if you would like to explore other pieces!`,
      };
    }
  }

  // 5. INITIATE BUY INTENT
  if (lowerText.startsWith("buy") || lowerText.startsWith("order")) {
    const itemQuery = rawText.replace(/^(buy|order)\s+/i, "").trim();
    session.selectedProductId = itemQuery || "BTNX Signature Coat";
    session.stage = "awaiting_size_color";
    return {
      replyText:
        `Excellent choice! We have reserved *${session.selectedProductId}*.\n\n` +
        `What size (*S*, *M*, *L*, *XL*) and color (*Black*, *Off-White*) would you prefer?`,
      suggestedActions: ["Size M, Black", "Size L, Black", "Size XL, Off-White"],
    };
  }

  // 6. BODY FIT & SIZE ADVISORY
  if (lowerText.includes("size") || lowerText.includes("fit") || lowerText.includes("body") || lowerText.includes("height") || lowerText.includes("weight") || lowerText.includes("kg") || lowerText.includes("ft")) {
    return {
      replyText:
        `📐 *BTNX Tailoring & Fit Advisory:*\n\n` +
        `Our silhouettes are crafted with a modern, relaxed boxy cut with reinforced shoulder architecture:\n\n` +
        `• *Size S*: Best for 5'4\"–5'7\" (55–65kg) — trim drape\n` +
        `• *Size M*: Best for 5'8\"–5'10\" (66–76kg) — classic relaxed fit\n` +
        `• *Size L*: Best for 5'11\"–6'2\" (77–88kg) — modern oversized silhouette\n` +
        `• *Size XL*: Best for 6'2\"+ or athletic builds (89kg+)\n\n` +
        `Would you like to reserve a specific size? Reply with *\"buy [size]\"* to proceed!`,
      suggestedActions: ["Order Size M", "Order Size L", "View Size Chart"],
    };
  }

  // 7. CATALOG QUERY (AI OR SMART FALLBACK)
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt =
        `You are the customer care assistant for BTNX, a high-end Nigerian contemporary fashion store. ` +
        `Prices are in Nigerian Naira (₦). Active promo code is BTNX50 (50% off). ` +
        `Free shipping applies on orders over ₦150,000. ` +
        `Customer message: "${rawText}". ` +
        `Respond warmly, concisely in WhatsApp format with appropriate emojis, and suggest next actions.`;
      
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
      console.warn("Gemini WhatsApp fallback: ", e);
    }
  }

  // Default Customer Care Response
  return {
    replyText:
      `Thank you for messaging *BTNX*. 🏛️\n\n` +
      `I can help you browse our seasonal drops, recommend the ideal size for your build, check promo codes, or track your dispatch.\n\n` +
      `Reply with:\n` +
      `• *\"catalog\"* to view available garments\n` +
      `• *\"promos\"* for current discount vouchers\n` +
      `• *\"track [order#]\"* to check shipment status\n` +
      `• *\"buy [item]\"* to place an order immediately`,
    suggestedActions: ["Catalog", "Promos", "Size Guide"],
  };
}
