import { Order, Product } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "./currency";
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  deleteDoc,
} from "firebase/firestore";

export interface SupportAttachmentOrder {
  id: string;
  status: string;
  total: number;
  date: string;
  itemCount: number;
  firstItemName: string;
  firstItemImage?: string;
}

export interface SupportAttachmentProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface SupportAttachmentAction {
  actionType: "address_update" | "size_exchange" | "payment_verify";
  title: string;
  details: Record<string, string>;
  status?: "pending" | "approved" | "completed";
}

export interface SupportMessage {
  id: string;
  sender: "customer" | "bot" | "agent" | "system";
  senderName: string;
  senderRole?: string;
  text: string;
  createdAt: string;
  images?: string[];
  attachedOrder?: SupportAttachmentOrder;
  attachedProduct?: SupportAttachmentProduct;
  attachedAction?: SupportAttachmentAction;
  suggestHumanTransfer?: boolean;
  quickReplies?: string[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  topic: string;
  orderId?: string;
  status: "open" | "pending_human" | "human_active" | "resolved";
  mode: "bot" | "human";
  assignedAgent?: string;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  unreadByAdmin?: boolean;
  unreadByCustomer?: boolean;
}

export const SUPPORT_TOPICS = [
  "Order & Delivery Status",
  "Delivery Address Update",
  "Size Exchange or Return",
  "Garment Sizing & Fit Advice",
  "Promo Code or Payment Inquiry",
  "General Store Inquiry",
] as const;

const STORAGE_KEY = "btnx_support_tickets_v1";
const CHANNEL_NAME = "btnx_support_sync_channel";

const SEED_TICKETS: SupportTicket[] = [
  {
    id: "CS-849201",
    userId: "demo-client-1",
    userEmail: "tunde.adeleke@example.com",
    userName: "Tunde Adeleke",
    subject: "Delivery timeline for Order #BX-849201",
    topic: "Order & Delivery Status",
    orderId: "BX-849201",
    status: "human_active",
    mode: "human",
    assignedAgent: "Adaobi N. · Osun Client Care",
    createdAt: "2026-11-13T14:20:00.000Z",
    updatedAt: "2026-11-14T08:15:00.000Z",
    unreadByAdmin: true,
    unreadByCustomer: false,
    messages: [
      {
        id: "msg-seed-1",
        sender: "bot",
        senderName: "BTNX Support Assistant",
        senderRole: "Automated Assistant · Instant Reply",
        text: "Welcome to BTNX Client Care. I can help you track an order from our Osun hub, update a delivery address, start a size exchange, or connect you with a human specialist.",
        createdAt: "2026-11-13T14:20:00.000Z",
        quickReplies: [
          "Check my order status",
          "Update delivery address",
          "Speak with a human agent",
        ],
      },
      {
        id: "msg-seed-2",
        sender: "customer",
        senderName: "Tunde Adeleke",
        text: "Hello, I attached my order below. Can a human agent confirm if the courier will call before arriving in Lekki?",
        createdAt: "2026-11-14T08:12:00.000Z",
        attachedOrder: {
          id: "BX-849201",
          status: "In Transit",
          total: 232500,
          date: "12 Nov 2026",
          itemCount: 2,
          firstItemName: "Purple Brooklyn Fleece Hoodie",
          firstItemImage: NEW_YEAR_PRODUCTS[0]?.image,
        },
      },
      {
        id: "msg-seed-3",
        sender: "system",
        senderName: "System",
        text: "Conversation transferred to Human Customer Care · Adaobi N. (Senior Client Advisor, Osogbo Hub) joined the chat.",
        createdAt: "2026-11-14T08:13:00.000Z",
      },
      {
        id: "msg-seed-4",
        sender: "agent",
        senderName: "Adaobi N.",
        senderRole: "Human Customer Care · Osun Hub",
        text: "Good morning Tunde! I have checked dispatch manifest #TRK-849201 for your Purple Brooklyn Fleece Hoodie and Birmania Crewneck. Our rider is on the Lagos Island route today and will call your registered phone 30 minutes prior to arrival.",
        createdAt: "2026-11-14T08:15:00.000Z",
      },
    ],
  },
];

export function loadLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TICKETS));
      return SEED_TICKETS;
    }
    const parsed = JSON.parse(raw) as SupportTicket[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_TICKETS;
  } catch {
    return SEED_TICKETS;
  }
}

export function saveLocalTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent("btnx-support-updated"));
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage({ type: "SYNC_TICKETS", timestamp: Date.now() });
      bc.close();
    }
  } catch {
    // ignore quota or private mode issues
  }
}

export async function persistTicket(ticket: SupportTicket, syncFirestore = true) {
  const existing = loadLocalTickets();
  const idx = existing.findIndex((t) => t.id === ticket.id);
  const next =
    idx > -1
      ? existing.map((t) => (t.id === ticket.id ? ticket : t))
      : [ticket, ...existing];
  saveLocalTickets(next);

  if (syncFirestore && auth.currentUser) {
    try {
      const cleanMessages = ticket.messages.slice(-100).map((m) => ({
        id: m.id,
        sender: m.sender,
        senderName: m.senderName,
        senderRole: m.senderRole || "",
        text: m.text,
        createdAt: m.createdAt,
        images: m.images || [],
        attachedOrder: m.attachedOrder || null,
        attachedProduct: m.attachedProduct || null,
        attachedAction: m.attachedAction || null,
        suggestHumanTransfer: Boolean(m.suggestHumanTransfer),
        quickReplies: m.quickReplies || [],
      }));

      await setDoc(doc(db, "supportTickets", ticket.id), {
        id: ticket.id,
        userId: auth.currentUser.uid,
        userEmail: (ticket.userEmail || auth.currentUser.email || "guest@btnx.store").slice(0, 250),
        userName: (ticket.userName || "BTNX Client").slice(0, 115),
        subject: (ticket.subject || "Client Care Inquiry").slice(0, 195),
        topic: (ticket.topic || "General Store Inquiry").slice(0, 115),
        orderId: (ticket.orderId || "").slice(0, 120),
        status: ticket.status,
        mode: ticket.mode,
        assignedAgent: (ticket.assignedAgent || "").slice(0, 115),
        messages: cleanMessages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      });
    } catch {
      // Fallback to localStorage seamlessly if guest or rule restricted
    }
  }
}

export async function removeTicket(ticketId: string) {
  const existing = loadLocalTickets();
  saveLocalTickets(existing.filter((t) => t.id !== ticketId));
  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, "supportTickets", ticketId));
    } catch {
      // ignore if local only
    }
  }
}

export function subscribeToSupportTickets(
  onUpdate: (tickets: SupportTicket[]) => void
): () => void {
  const emitSorted = (list: SupportTicket[]) => {
    const sorted = [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    onUpdate(sorted);
  };

  emitSorted(loadLocalTickets());

  const handleLocalUpdate = () => {
    emitSorted(loadLocalTickets());
  };

  window.addEventListener("btnx-support-updated", handleLocalUpdate);
  window.addEventListener("storage", handleLocalUpdate);

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = () => {
      emitSorted(loadLocalTickets());
    };
  }

  let unsubFirestore: (() => void) | null = null;
  const unsubAuth = onAuthStateChanged(auth, (user) => {
    if (unsubFirestore) {
      unsubFirestore();
      unsubFirestore = null;
    }
    if (!user) return;
    try {
      const q = query(collection(db, "supportTickets"));
      unsubFirestore = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) return;
          const remote = snap.docs.map((d) => d.data() as SupportTicket);
          const local = loadLocalTickets();
          const mergedMap = new Map<string, SupportTicket>();
          local.forEach((t) => mergedMap.set(t.id, t));
          remote.forEach((r) => {
            const existingLocal = mergedMap.get(r.id);
            if (
              !existingLocal ||
              new Date(r.updatedAt).getTime() >= new Date(existingLocal.updatedAt).getTime()
            ) {
              mergedMap.set(r.id, r);
            }
          });
          const merged = Array.from(mergedMap.values());
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          emitSorted(merged);
        },
        () => {
          // Guest user or offline: rely on local/BroadcastChannel seamlessly
        }
      );
    } catch {
      // ignore
    }
  });

  return () => {
    window.removeEventListener("btnx-support-updated", handleLocalUpdate);
    window.removeEventListener("storage", handleLocalUpdate);
    if (bc) bc.close();
    unsubAuth();
    if (unsubFirestore) unsubFirestore();
  };
}

export function orderToSupportAttachment(order: Order): SupportAttachmentOrder {
  const itemCount =
    order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
  const firstItem = order.items?.[0]?.product;
  return {
    id: order.id,
    status: order.status || "Confirmed",
    total: order.total || 0,
    date: order.date || "Recent",
    itemCount,
    firstItemName: firstItem?.name || "BTNX Garment Piece",
    firstItemImage: firstItem?.image,
  };
}

export function productToSupportAttachment(
  product: Product,
  selectedSize?: string,
  selectedColor?: string
): SupportAttachmentProduct {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    image: product.image,
    selectedSize: selectedSize || product.sizes?.[0],
    selectedColor: selectedColor || product.colors?.[0],
  };
}

export async function compressImageFile(
  file: File,
  maxDim = 860,
  quality = 0.76
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(e.target?.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = String(e.target?.result || "");
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function detectHumanEscalationIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const triggers = [
    "human",
    "real person",
    "agent",
    "representative",
    "customer care",
    "speak to someone",
    "talk to someone",
    "live support",
    "supervisor",
    "manager",
    "operator",
    "staff",
    "transfer me",
    "need more help",
  ];
  return triggers.some((kw) => lower.includes(kw));
}

export function generateBotReply(params: {
  userText: string;
  attachedOrder?: SupportAttachmentOrder;
  attachedProduct?: SupportAttachmentProduct;
  attachedAction?: SupportAttachmentAction;
  images?: string[];
  availableOrders?: Order[];
}): {
  replyText: string;
  shouldEscalateToHuman: boolean;
  suggestHumanTransfer: boolean;
  quickReplies: string[];
} {
  const {
    userText,
    attachedOrder,
    attachedProduct,
    attachedAction,
    images,
    availableOrders = [],
  } = params;
  const clean = userText.toLowerCase().trim();

  if (detectHumanEscalationIntent(clean)) {
    return {
      replyText:
        "I am connecting you right away with a Human Customer Care Specialist at our Osogbo, Osun desk. A live advisor is joining this conversation now to assist you personally.",
      shouldEscalateToHuman: true,
      suggestHumanTransfer: false,
      quickReplies: [
        "Share my order details",
        "Request phone callback",
      ],
    };
  }

  if (attachedAction) {
    if (attachedAction.actionType === "address_update") {
      return {
        replyText: `I have logged your Delivery Address Update request for ${
          attachedAction.details.orderId || "your shipment"
        } to "${attachedAction.details.newAddress || "your updated destination"}". As long as the parcel has not left our final regional relay, our Osun dispatch desk can apply this immediately. Would you like a Human Customer Care Specialist to confirm the manifest change now?`,
        shouldEscalateToHuman: false,
        suggestHumanTransfer: true,
        quickReplies: [
          "Speak with a human agent to confirm",
          "Track my order status",
        ],
      };
    }
    if (attachedAction.actionType === "size_exchange") {
      return {
        replyText: `Your Size Exchange request (${attachedAction.details.item || "Garment"} · Size ${
          attachedAction.details.fromSize || "Current"
        } → Size ${
          attachedAction.details.toSize || "Requested"
        }) has been registered under our 14-day complimentary exchange policy. I can transfer you to a Human Specialist to issue your prepaid dispatch return label immediately.`,
        shouldEscalateToHuman: false,
        suggestHumanTransfer: true,
        quickReplies: [
          "Speak with a human agent for return label",
          "View sizing & care guide",
        ],
      };
    }
    if (attachedAction.actionType === "payment_verify") {
      return {
        replyText: `Thank you for submitting payment reference "${
          attachedAction.details.reference || "N/A"
        }". I have queued this for verification. Would you like me to connect a Human Specialist from our billing desk to verify this live?`,
        shouldEscalateToHuman: false,
        suggestHumanTransfer: true,
        quickReplies: [
          "Connect me to a human billing specialist",
          "Check promo code rules",
        ],
      };
    }
  }

  if (attachedOrder) {
    const st = attachedOrder.status.toLowerCase();
    const stageDesc =
      st === "delivered"
        ? "marked as Delivered and signed for at the destination"
        : st === "shipped" || st === "in transit"
        ? "currently In Transit with BTNX Express Courier (estimated arrival within 1–2 business days)"
        : st === "processing"
        ? "currently Inspected & Packed at our Osogbo, Osun hub awaiting courier pickup"
        : "Confirmed at our Osun store and queued for quality inspection";

    return {
      replyText: `I inspected Order #${attachedOrder.id} (${attachedOrder.itemCount} ${
        attachedOrder.itemCount === 1 ? "piece" : "pieces"
      } · ${formatNaira(attachedOrder.total)}). Your shipment is ${stageDesc}. If you need a courier phone number, delivery address modification, or special dispatch instruction, I can connect you to a Human Customer Care Specialist right now.`,
      shouldEscalateToHuman: false,
      suggestHumanTransfer: true,
      quickReplies: [
        "Update delivery address for this order",
        "Request size exchange",
        "Speak with a human agent",
      ],
    };
  }

  if (attachedProduct) {
    return {
      replyText: `Regarding "${attachedProduct.name}" (${attachedProduct.category} · ${formatNaira(
        attachedProduct.price
      )}): this piece is crafted with our signature heavyweight structure and relaxed everyday proportion. Take your true size for a relaxed silhouette, or size down once for a closer tailored fit. Would you like a Human Client Advisor to check exact measurements or studio stock in Osun?`,
      shouldEscalateToHuman: false,
      suggestHumanTransfer: true,
      quickReplies: [
        "Ask a human stylist for exact measurements",
        "How long is delivery to my state?",
        "Can I use promo code BTNX50?",
      ],
    };
  }

  if (images && images.length > 0) {
    return {
      replyText: `Thank you for attaching ${images.length} ${
        images.length === 1 ? "photo" : "photos"
      }. I have attached the ${
        images.length === 1 ? "image" : "images"
      } to your support dossier so our team can inspect the garment details, sizing tag, or receipt visually. Would you like me to bring a Human Customer Care Specialist into the chat to review your photo(s) now?`,
      shouldEscalateToHuman: false,
      suggestHumanTransfer: true,
      quickReplies: [
        "Yes, connect a human agent to review photo",
        "Attach my order to this photo",
      ],
    };
  }

  // Check if user typed an Order ID in text (e.g., BX-849201)
  const orderMatch = userText.match(/(?:BX-|TRK-)?(\d{5,8})/i);
  if (orderMatch) {
    const code = `BX-${orderMatch[1]}`;
    const found = availableOrders.find(
      (o) => o.id.toUpperCase().includes(orderMatch[1])
    );
    if (found) {
      return {
        replyText: `I located Order #${found.id} (${formatNaira(
          found.total
        )}) in your account. Its current status is "${
          found.status
        }". You can also attach the order card using the "Attach Order" button below or ask to speak with a Human Customer Care Specialist for live courier coordination.`,
        shouldEscalateToHuman: false,
        suggestHumanTransfer: true,
        quickReplies: [
          "Speak with a human agent",
          "Update delivery address",
        ],
      };
    }
    return {
      replyText: `I searched for reference #${code}. Orders placed at BTNX Store are dispatched from Osogbo, Osun within 24 hours. Use the "Attach Order" tool below to share your order card, or click "Speak with Human Agent" so our dispatch desk can look up your parcel manually.`,
      shouldEscalateToHuman: false,
      suggestHumanTransfer: true,
      quickReplies: [
        "Speak with a human agent",
        "How long does nationwide delivery take?",
      ],
    };
  }

  if (clean.includes("track") || clean.includes("where is") || clean.includes("delivery") || clean.includes("ship")) {
    return {
      replyText:
        "All BTNX orders are inspected and dispatched from our Osogbo, Osun store within 24 hours. Deliveries within Osun & South-West states arrive in 1–2 business days, and nationwide express across Nigeria takes 2–4 business days. You can attach your Order directly in this chat using the 'Attach Order' button below, or switch to a Human Specialist for live courier tracking.",
      shouldEscalateToHuman: false,
      suggestHumanTransfer: true,
      quickReplies: [
        "Attach my order",
        "Update delivery address",
        "Speak with a human agent",
      ],
    };
  }

  if (clean.includes("return") || clean.includes("exchange") || clean.includes("refund") || clean.includes("size")) {
    return {
      replyText:
        "We offer complimentary size exchanges and returns within 14 days of delivery on unworn pieces with original tags intact. You can submit a Size Exchange Card right inside this chat using the 'Action Card' button below, attach photos of the item, or speak with a Human Customer Care Specialist.",
      shouldEscalateToHuman: false,
      suggestHumanTransfer: true,
      quickReplies: [
        "Start a size exchange",
        "Speak with a human agent",
      ],
    };
  }

  if (clean.includes("promo") || clean.includes("discount") || clean.includes("voucher") || clean.includes("code") || clean.includes("btnx50")) {
    return {
      replyText:
        "Active seasonal code BTNX50 grants 50% off eligible outerwear, knitwear, and heavyweight fleece at checkout. Limit one voucher per order. If a code didn't apply to your bag, let me know or connect with a Human Specialist to apply a manual adjustment.",
      shouldEscalateToHuman: false,
      suggestHumanTransfer: true,
      quickReplies: [
        "Speak with a human agent",
        "Attach a product to check eligibility",
      ],
    };
  }

  return {
    replyText:
      "Thank you for reaching out to BTNX Client Care. As your virtual support assistant, I can inspect orders, process address updates or size exchanges, review attached garment photos, or transfer you immediately to a Human Customer Care Specialist at our Osun desk.",
    shouldEscalateToHuman: false,
    suggestHumanTransfer: true,
    quickReplies: [
      "Speak with a human agent",
      "Check order delivery status",
      "Start a size exchange",
    ],
  };
}

export function generateSimulatedHumanAgentReply(params: {
  customerName: string;
  userText: string;
  attachedOrder?: SupportAttachmentOrder;
  attachedProduct?: SupportAttachmentProduct;
  attachedAction?: SupportAttachmentAction;
  images?: string[];
}): string {
  const firstName = (params.customerName || "there").split(" ")[0];
  if (params.attachedOrder) {
    return `Hi ${firstName}, Adaobi here from the Osogbo Client Care desk. I've pulled up Order #${
      params.attachedOrder.id
    } (${formatNaira(
      params.attachedOrder.total
    )}) on our live dispatch terminal. Everything is on schedule—please let me know if you'd like me to contact the dispatch rider directly or make any adjustments for you.`;
  }
  if (params.images && params.images.length > 0) {
    return `Hi ${firstName}, I have reviewed the ${
      params.images.length === 1 ? "photo" : `${params.images.length} photos`
    } you uploaded. Thank you for sending clear visuals—I have noted this on your file and can process your request right away. How would you prefer we proceed?`;
  }
  if (params.attachedAction) {
    return `Hi ${firstName}, I have personally reviewed and approved your ${params.attachedAction.title} request on our system. You will also receive an updated confirmation in your account notifications shortly.`;
  }
  if (params.attachedProduct) {
    return `Hi ${firstName}, I checked our studio rack in Osogbo for "${params.attachedProduct.name}". We have fresh stock inspected and ready for immediate dispatch today. Would you like me to reserve a specific size for you?`;
  }
  return `Hi ${firstName}, thank you for your message. I am reviewing this personally from our Osun Customer Care desk and have updated your support ticket. Please feel free to attach your order card or any photos if needed, and I will sort this out for you right away.`;
}
