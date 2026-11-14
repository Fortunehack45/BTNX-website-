import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Headphones,
  ShoppingBag,
  Package,
  Tag,
  Megaphone,
  Users,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Check,
  Copy,
  Search,
  Send,
  Image as ImageIcon,
  UserCheck,
  Bot,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Shield,
  Lock,
  Mail,
  Sun,
  Moon,
  Monitor,
  X,
  Download,
  Eye,
  Sparkles,
  ZoomIn,
  Truck,
  Sliders,
} from "lucide-react";
import { Product, Order, StoreShippingSettings } from "../types";
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
} from "../lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
} from "firebase/firestore";
import BrandLogo from "../components/BrandLogo";
import GalleryImage from "../components/GalleryImage";
import { useTheme, ThemePreference } from "../context/ThemeContext";
import { NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "../utils/currency";
import { downloadOrderInvoice } from "../utils/invoice";
import {
  SupportTicket,
  SupportMessage,
  SupportAttachmentOrder,
  SupportAttachmentProduct,
  subscribeToSupportTickets,
  persistTicket,
  removeTicket,
  orderToSupportAttachment,
  productToSupportAttachment,
  compressImageFile,
} from "../utils/supportStore";

type AdminTab =
  | "overview"
  | "support"
  | "orders"
  | "products"
  | "hero"
  | "shipping"
  | "promos"
  | "campaigns"
  | "clients";

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "In Transit",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const PRODUCT_CATEGORIES = [
  "Outerwear",
  "Knitwear",
  "Fleece",
  "Tops",
  "Bottoms",
  "Tailoring",
  "Accessories",
];

const SIZES_LIST = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS_LIST = [
  "Black",
  "Off-White",
  "Dusty Plum",
  "Deep Navy",
  "Olive",
  "Charcoal",
  "Sand",
  "Espresso",
];

const CANNED_AGENT_REPLIES = [
  {
    label: "Dispatched from Osun Hub",
    text: "Your order has been inspected, packed, and handed over to our express courier at our Osogbo, Osun hub. You will receive a call from the dispatch rider 30 minutes prior to delivery.",
  },
  {
    label: "Address Update Confirmed",
    text: "I have updated the destination shipping address on your active dispatch manifest. Your parcel will be routed to your updated address without delay.",
  },
  {
    label: "Size Exchange Approved",
    text: "Your 14-day complimentary size exchange has been approved. Our courier will deliver your replacement size and collect the original unworn piece simultaneously.",
  },
  {
    label: "Payment & Voucher Verified",
    text: "I have verified your payment reference and applied your promotional discount on our billing terminal. Your official receipt is ready in your account.",
  },
];

interface PromoRecord {
  id: string;
  code: string;
  discountPercentage: number;
  expiresAt: string;
  createdAt: string;
  isActive?: boolean;
}

const DEFAULT_PROMOS: PromoRecord[] = [
  {
    id: "default-btnx50",
    code: "BTNX50",
    discountPercentage: 50,
    expiresAt: "2027-12-31T23:59:59.000Z",
    createdAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: "default-klamby50",
    code: "KLAMBY50",
    discountPercentage: 50,
    expiresAt: "2027-12-31T23:59:59.000Z",
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

export default function AdminPortal() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Auth & Quick Studio Unlock State
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [studioUnlocked, setStudioUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem("btnx_admin_unlocked") === "true";
    } catch {
      return false;
    }
  });
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Store Data States
  const [cloudProducts, setCloudProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [promos, setPromos] = useState<PromoRecord[]>(DEFAULT_PROMOS);
  const [announcements, setAnnouncements] = useState<string[]>([
    "OSUN STORE · NATIONWIDE EXPRESS DELIVERY ACROSS NIGERIA",
    "USE CODE BTNX50 AT CHECKOUT FOR 50% OFF SEASONAL RELEASES",
    "COMPLIMENTARY 14-DAY SIZE EXCHANGES ON ALL UNWORN PIECES",
  ]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [newslettersList, setNewslettersList] = useState<any[]>([]);

  // Support Desk States
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [ticketFilter, setTicketFilter] = useState<"all" | "human" | "bot" | "resolved">("all");
  const [agentName, setAgentName] = useState("Adaobi N. · Osun Client Care");
  const [agentReplyText, setAgentReplyText] = useState("");
  const [agentStagedOrder, setAgentStagedOrder] = useState<SupportAttachmentOrder | undefined>();
  const [agentStagedProduct, setAgentStagedProduct] = useState<SupportAttachmentProduct | undefined>();
  const [agentStagedImages, setAgentStagedImages] = useState<string[]>([]);
  const [agentAttachmentDrawer, setAgentAttachmentDrawer] = useState<
    "none" | "order" | "product" | "image"
  >("none");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const agentFileInputRef = useRef<HTMLInputElement>(null);

  // Orders Filter & Modal
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);

  // Products Filter & Modal
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("All");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    category: PRODUCT_CATEGORIES[0],
    price: "",
    originalPrice: "",
    image: NEW_YEAR_PRODUCTS[0]?.image || "",
    badge: "",
    description: "",
    sizes: ["S", "M", "L", "XL"] as string[],
    colors: ["Black", "Off-White"] as string[],
    stock: "45",
    // Dynamic Attributes
    fabricAndCare: "",
    fitDetails: "",
    deliveryTimeline: "2–4 Business Days",
    packagingType: "Cotton Garment Box",
    returnPolicy: "14-Day Free Exchanges",
    shippingFee: "",
    isFreeShipping: false,
    // Hero Showcase Pinning
    isPinnedHero: false,
    heroOrder: "1",
    heroHeadline: "",
    heroSubheadline: "",
    heroLookNumber: "Look 01",
    heroImage: "",
  });
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  // Global Shipping & Logistics State
  const [shippingSettings, setShippingSettings] = useState<StoreShippingSettings>({
    defaultShippingFee: 3500,
    freeShippingThreshold: 150000,
    isFreeShippingGlobal: false,
    defaultDeliveryTimeline: "2–4 Business Days",
    defaultPackagingType: "Cotton Garment Box",
    defaultReturnPolicy: "14-Day Free Exchanges",
  });
  const [isSavingShipping, setIsSavingShipping] = useState(false);

  // Promo Form State
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoPct, setNewPromoPct] = useState("25");
  const [newPromoExpiry, setNewPromoExpiry] = useState("2027-12-31");
  const [bulkPrefix, setBulkPrefix] = useState("BTNX");
  const [bulkPct, setBulkPct] = useState("20");
  const [bulkQty, setBulkQty] = useState("5");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Campaigns State
  const [newBannerText, setNewBannerText] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"promo" | "new_arrival" | "system">("promo");

  // Clients Search
  const [clientSearch, setClientSearch] = useState("");
  const [clientSubTab, setClientSubTab] = useState<"users" | "newsletters">("users");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Shipping Settings listener
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, "settings", "shipping"), (snapshot) => {
        if (snapshot.exists()) {
          setShippingSettings(snapshot.data() as StoreShippingSettings);
        }
      });
      return () => unsub();
    } catch {
      // ignore
    }
  }, []);

  const handleSaveShippingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingShipping(true);
    try {
      const payload: StoreShippingSettings = {
        ...shippingSettings,
        defaultShippingFee: Number(shippingSettings.defaultShippingFee) || 0,
        freeShippingThreshold: Number(shippingSettings.freeShippingThreshold) || 0,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "settings", "shipping"), payload);
      showToast("Store shipping & logistics policies updated.");
    } catch {
      showToast("Failed to save shipping settings to database.");
    } finally {
      setIsSavingShipping(false);
    }
  };

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        const isBootstrap =
          u.email?.toLowerCase() === "fortunedomination@gmail.com" ||
          u.email?.toLowerCase() === "btnx@btnx.com";
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          const role = snap.exists() ? snap.data()?.role : null;
          setCurrentUserRole(role);
          if (role === "support") {
            setIsFirebaseAdmin(false);
          } else {
            setIsFirebaseAdmin(role === "admin" || Boolean(isBootstrap));
          }
        } catch {
          setIsFirebaseAdmin(Boolean(isBootstrap));
        }
      } else {
        setIsFirebaseAdmin(false);
        setCurrentUserRole(null);
      }
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  // Support Tickets real-time listener
  useEffect(() => {
    const unsub = subscribeToSupportTickets((list) => {
      setTickets(list);
      setSelectedTicketId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id || "";
      });
    });
    return unsub;
  }, []);

  // Firestore / Local Data Listeners
  useEffect(() => {
    // Load local cached promos first
    try {
      const cachedPromos = localStorage.getItem("klamby_promo_codes");
      if (cachedPromos) {
        const parsed = JSON.parse(cachedPromos);
        if (Array.isArray(parsed) && parsed.length > 0) setPromos(parsed);
      }
    } catch {
      // ignore
    }

    // Load local orders fallback
    try {
      const localOrds =
        localStorage.getItem("btnx_orders") || localStorage.getItem("klamby_orders");
      if (localOrds) {
        const parsed = JSON.parse(localOrds);
        if (Array.isArray(parsed) && parsed.length > 0) setOrders(parsed);
      }
    } catch {
      // ignore
    }

    const unsubs: Array<() => void> = [];

    try {
      unsubs.push(
        onSnapshot(
          query(collection(db, "products")),
          (snap) => {
            const list = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as Product[];
            setCloudProducts(list);
          },
          () => {}
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, "orders")),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              })) as Order[];
              list.sort((a: any, b: any) => {
                const tA = a.createdAt?.toMillis
                  ? a.createdAt.toMillis()
                  : a.date
                  ? new Date(a.date).getTime()
                  : 0;
                const tB = b.createdAt?.toMillis
                  ? b.createdAt.toMillis()
                  : b.date
                  ? new Date(b.date).getTime()
                  : 0;
                return tB - tA;
              });
              setOrders(list);
            }
          },
          () => {}
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, "users")),
          (snap) => {
            setUsersList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          },
          () => {}
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, "promoCodes")),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              })) as PromoRecord[];
              setPromos(list);
              localStorage.setItem("klamby_promo_codes", JSON.stringify(list));
            }
          },
          () => {}
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, "notifications")),
          (snap) => {
            setNotificationsList(
              snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            );
          },
          () => {}
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, "newsletters")),
          (snap) => {
            setNewslettersList(
              snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            );
          },
          () => {}
        )
      );

      getDoc(doc(db, "siteContent", "hero"))
        .then((snap) => {
          if (snap.exists() && Array.isArray(snap.data().announcements)) {
            setAnnouncements(snap.data().announcements);
          }
        })
        .catch(() => {});
    } catch {
      // ignore if offline
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [isFirebaseAdmin, firebaseUser]);

  // Combined Catalog: Cloud products + Storefront products
  const allProducts: Product[] = React.useMemo(() => {
    const map = new Map<string, Product>();
    NEW_YEAR_PRODUCTS.forEach((p) => map.set(p.id, { ...p, stock: p.stock ?? 45 }));
    cloudProducts.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [cloudProducts]);

  // Combined Orders (with demo fallback if empty so Admin Orders table is immediately rich)
  const allOrders: Order[] = React.useMemo(() => {
    if (orders.length > 0) return orders;
    return [
      {
        id: "BX-849201",
        userId: "tunde.adeleke@example.com",
        status: "In Transit",
        date: "12 Nov 2026",
        total: 232500,
        items: [
          {
            product: NEW_YEAR_PRODUCTS[0],
            quantity: 1,
            size: "L",
            color: "Dusty Plum",
          },
          {
            product: NEW_YEAR_PRODUCTS[2],
            quantity: 1,
            size: "L",
            color: "Deep Navy",
          },
        ],
      },
      {
        id: "BX-730419",
        userId: "amaka.obi@example.com",
        status: "Processing",
        date: "13 Nov 2026",
        total: 185000,
        items: [
          {
            product: NEW_YEAR_PRODUCTS[1],
            quantity: 1,
            size: "M",
            color: "Black",
          },
        ],
      },
      {
        id: "BX-619042",
        userId: "ibrahim.musa@example.com",
        status: "Delivered",
        date: "08 Nov 2026",
        total: 147000,
        items: [
          {
            product: NEW_YEAR_PRODUCTS[3] || NEW_YEAR_PRODUCTS[0],
            quantity: 1,
            size: "XL",
            color: "Sand",
          },
        ],
      },
    ];
  }, [orders]);

  // KPI Metrics
  const totalRevenue = allOrders.reduce((acc, o) => {
    const st = (o.status || "").toLowerCase();
    if (st === "cancelled") return acc;
    return acc + (o.total || 0);
  }, 0);

  const pendingDispatchCount = allOrders.filter((o) =>
    ["pending", "confirmed", "processing"].includes((o.status || "").toLowerCase())
  ).length;

  const lowStockCount = allProducts.filter((p) => (p.stock ?? 45) <= 10).length;
  const humanQueueCount = tickets.filter(
    (t) => t.mode === "human" && t.status !== "resolved"
  ).length;

  const selectedTicket =
    tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === "human") return t.mode === "human" && t.status !== "resolved";
    if (ticketFilter === "bot") return t.mode === "bot" && t.status !== "resolved";
    if (ticketFilter === "resolved") return t.status === "resolved";
    return true;
  });

  // Handlers
  const handleUnlockStudio = () => {
    try {
      localStorage.setItem("btnx_admin_unlocked", "true");
    } catch {
      // ignore
    }
    setStudioUnlocked(true);
    showToast("Unlocked BTNX Admin Studio.");
  };

  const handleAdminEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      loginEmail.trim().toLowerCase() === "btnx" ||
      loginEmail.trim().toLowerCase() === "admin" ||
      loginPassword === "btnx" ||
      loginPassword === "admin123"
    ) {
      handleUnlockStudio();
      return;
    }
    setIsSubmittingAuth(true);
    setLoginError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const role = snap.exists() ? snap.data()?.role : null;
      if (role === "support") {
        setLoginError("Access Denied: Support Staff accounts cannot access the Admin Panel. Please use the Support Team Desk at /support-staff.");
        await signOut(auth);
        return;
      }
      handleUnlockStudio();
    } catch (err: any) {
      setLoginError(
        err.message || "Invalid credentials. Use 'btnx' or click Unlock Studio below."
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setIsSubmittingAuth(true);
    setLoginError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const snap = await getDoc(doc(db, "users", result.user.uid));
      const role = snap.exists() ? snap.data()?.role : null;
      if (role === "support") {
        setLoginError("Access Denied: Support Staff accounts cannot access the Admin Panel. Please use the Support Team Desk at /support-staff.");
        await signOut(auth);
        return;
      }
      handleUnlockStudio();
    } catch (err: any) {
      setLoginError(err.message || "Google sign-in was cancelled.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, newStatus: string) => {
    setOrders((prev) => {
      const base = prev.length > 0 ? prev : allOrders;
      const updated = base.map((o) =>
        o.id === orderId ? { ...o, status: newStatus as any } : o
      );
      try {
        localStorage.setItem("btnx_orders", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (inspectedOrder?.id === orderId) {
      setInspectedOrder((prev) =>
        prev ? { ...prev, status: newStatus as any } : null
      );
    }

    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      const targetOrder = allOrders.find((o) => o.id === orderId);
      if (targetOrder?.userId) {
        await addDoc(collection(db, "notifications"), {
          userId: targetOrder.userId,
          title: `Order #${orderId} · ${newStatus}`,
          message: `Your BTNX order #${orderId} status has been updated to "${newStatus}" by our Osun dispatch desk.`,
          type: "order_status",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Updated in local state seamlessly
    }

    showToast(`Order #${orderId} updated to ${newStatus}.`);
  };

  // Support Desk Actions
  const handleAdminTakeOverTicket = async (ticket: SupportTicket) => {
    const nowIso = new Date().toISOString();
    const sysMsg: SupportMessage = {
      id: `msg-${Date.now()}-takeover`,
      sender: "system",
      senderName: "System",
      text: `${agentName} joined the conversation as Human Customer Care Specialist.`,
      createdAt: nowIso,
    };

    const updated: SupportTicket = {
      ...ticket,
      mode: "human",
      status: "human_active",
      assignedAgent: agentName,
      unreadByAdmin: false,
      unreadByCustomer: true,
      updatedAt: nowIso,
      messages: [...ticket.messages, sysMsg],
    };

    await persistTicket(updated);
    showToast(`Connected to Ticket #${ticket.id} as Human Specialist.`);
  };

  const handleAdminSendReply = async (overrideText?: string) => {
    if (!selectedTicket) return;
    const text = (overrideText !== undefined ? overrideText : agentReplyText).trim();
    const hasAttachments =
      Boolean(agentStagedOrder) ||
      Boolean(agentStagedProduct) ||
      agentStagedImages.length > 0;

    if (!text && !hasAttachments) return;

    const nowIso = new Date().toISOString();
    const msg: SupportMessage = {
      id: `msg-${Date.now()}-admin`,
      sender: "agent",
      senderName: agentName.split("·")[0].trim() || "Adaobi N.",
      senderRole: "Human Customer Care · Osun Hub",
      text:
        text ||
        (agentStagedOrder
          ? `Shared live dispatch status for Order #${agentStagedOrder.id}.`
          : agentStagedProduct
          ? `Shared garment specifications for "${agentStagedProduct.name}".`
          : `Attached ${agentStagedImages.length} dispatch photo(s).`),
      createdAt: nowIso,
      images: agentStagedImages.length > 0 ? [...agentStagedImages] : undefined,
      attachedOrder: agentStagedOrder,
      attachedProduct: agentStagedProduct,
    };

    if (overrideText === undefined) setAgentReplyText("");
    setAgentStagedOrder(undefined);
    setAgentStagedProduct(undefined);
    setAgentStagedImages([]);
    setAgentAttachmentDrawer("none");

    const updated: SupportTicket = {
      ...selectedTicket,
      mode: "human",
      status: "human_active",
      assignedAgent: agentName,
      unreadByAdmin: false,
      unreadByCustomer: true,
      updatedAt: nowIso,
      messages: [...selectedTicket.messages, msg],
    };

    await persistTicket(updated);
    showToast(`Sent reply to ${selectedTicket.userName}.`);
  };

  const handleApproveCustomerAction = async (
    ticket: SupportTicket,
    messageId: string
  ) => {
    const nowIso = new Date().toISOString();
    const updatedMessages = ticket.messages.map((m) => {
      if (m.id === messageId && m.attachedAction) {
        return {
          ...m,
          attachedAction: {
            ...m.attachedAction,
            status: "approved" as const,
          },
        };
      }
      return m;
    });

    const targetMsg = ticket.messages.find((m) => m.id === messageId);
    const actionTitle = targetMsg?.attachedAction?.title || "Service Request";

    updatedMessages.push({
      id: `msg-${Date.now()}-approved`,
      sender: "agent",
      senderName: agentName.split("·")[0].trim(),
      senderRole: "Human Customer Care · Osun Hub",
      text: `I have reviewed and approved your "${actionTitle}". Our Osogbo dispatch & billing records have been updated accordingly.`,
      createdAt: nowIso,
    });

    const updated: SupportTicket = {
      ...ticket,
      mode: "human",
      status: "human_active",
      updatedAt: nowIso,
      messages: updatedMessages,
    };

    await persistTicket(updated);
    showToast(`Approved "${actionTitle}".`);
  };

  const handleAgentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const results: string[] = [];
      for (let i = 0; i < Math.min(files.length, 4); i++) {
        const compressed = await compressImageFile(files[i]);
        results.push(compressed);
      }
      setAgentStagedImages((prev) => [...prev, ...results].slice(0, 4));
      setAgentAttachmentDrawer("none");
      showToast(`Attached ${results.length} photo(s) to reply.`);
    } catch {
      showToast("Failed to process image file.");
    }
  };

  // Product Management Handlers
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      category: PRODUCT_CATEGORIES[0],
      price: "135000",
      originalPrice: "",
      image: NEW_YEAR_PRODUCTS[0]?.image || "",
      badge: "NEW",
      description:
        "Crafted from heavyweight organic cotton with relaxed everyday tailoring.",
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Off-White"],
      stock: "45",
      fabricAndCare: "Brushed wool-blend check overshirt with a cropped boxy fit, horn buttons, and dual chest pockets. Built to layer easily over tees or knits.",
      fitDetails: "Relaxed, structured fit with reinforced seams. Machine wash cold inside out or dry clean.",
      deliveryTimeline: "2–4 Business Days",
      packagingType: "Cotton Garment Box",
      returnPolicy: "14-Day Free Exchanges",
      shippingFee: "",
      isFreeShipping: false,
      isPinnedHero: false,
      heroOrder: "1",
      heroHeadline: "",
      heroSubheadline: "",
      heroLookNumber: "Look 01",
      heroImage: "",
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      category: prod.category || PRODUCT_CATEGORIES[0],
      price: String(prod.price || 120000),
      originalPrice: prod.originalPrice ? String(prod.originalPrice) : "",
      image: prod.image,
      badge: prod.badge || "",
      description: prod.description || "",
      sizes: prod.sizes || ["S", "M", "L"],
      colors: prod.colors || ["Black"],
      stock: String(prod.stock ?? 45),
      fabricAndCare: prod.fabricAndCare || "",
      fitDetails: prod.fitDetails || "",
      deliveryTimeline: prod.deliveryTimeline || "2–4 Business Days",
      packagingType: prod.packagingType || "Cotton Garment Box",
      returnPolicy: prod.returnPolicy || "14-Day Free Exchanges",
      shippingFee: prod.shippingFee != null ? String(prod.shippingFee) : "",
      isFreeShipping: Boolean(prod.isFreeShipping),
      isPinnedHero: Boolean(prod.isPinnedHero),
      heroOrder: String(prod.heroOrder ?? 1),
      heroHeadline: prod.heroHeadline || "",
      heroSubheadline: prod.heroSubheadline || "",
      heroLookNumber: prod.heroLookNumber || "Look 01",
      heroImage: prod.heroImage || "",
    });
    setIsProductModalOpen(true);
  };

  const handleProductImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setProductForm((prev) => ({ ...prev, image: dataUrl }));
      showToast("Product photo uploaded.");
    } catch {
      showToast("Could not read image file.");
    }
  };

  const handleHeroImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setProductForm((prev) => ({ ...prev, heroImage: dataUrl }));
      showToast("Hero banner image uploaded.");
    } catch {
      showToast("Could not read hero image file.");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;
    const priceNum = Number(productForm.price) || 120000;
    const origNum = productForm.originalPrice
      ? Number(productForm.originalPrice)
      : undefined;
    const prodId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;

    const newProd: Product = {
      id: prodId,
      name: productForm.name.trim(),
      category: productForm.category,
      price: priceNum,
      originalPrice: origNum,
      image: productForm.image.trim() || NEW_YEAR_PRODUCTS[0].image,
      badge: productForm.badge.trim() || undefined,
      description: productForm.description.trim(),
      sizes: productForm.sizes,
      colors: productForm.colors,
      stock: Number(productForm.stock) || 0,
      fabricAndCare: productForm.fabricAndCare.trim() || undefined,
      fitDetails: productForm.fitDetails.trim() || undefined,
      deliveryTimeline: productForm.deliveryTimeline.trim() || "2–4 Business Days",
      packagingType: productForm.packagingType.trim() || "Cotton Garment Box",
      returnPolicy: productForm.returnPolicy.trim() || "14-Day Free Exchanges",
      shippingFee: productForm.shippingFee ? Number(productForm.shippingFee) : undefined,
      isFreeShipping: productForm.isFreeShipping,
      isPinnedHero: productForm.isPinnedHero,
      heroOrder: Number(productForm.heroOrder) || 1,
      heroHeadline: productForm.heroHeadline.trim() || undefined,
      heroSubheadline: productForm.heroSubheadline.trim() || undefined,
      heroLookNumber: productForm.heroLookNumber.trim() || "Look 01",
      heroImage: productForm.heroImage.trim() || undefined,
    };

    setCloudProducts((prev) => {
      const exists = prev.some((p) => p.id === prodId);
      const next = exists
        ? prev.map((p) => (p.id === prodId ? newProd : p))
        : [newProd, ...prev];
      try {
        localStorage.setItem("btnx_cloud_products", JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await setDoc(doc(db, "products", prodId), {
        id: prodId,
        name: newProd.name,
        category: newProd.category,
        price: newProd.price,
        originalPrice: newProd.originalPrice || null,
        image: newProd.image,
        badge: newProd.badge || null,
        description: newProd.description,
        sizes: newProd.sizes || [],
        colors: newProd.colors || [],
        stock: newProd.stock ?? 45,
        fabricAndCare: newProd.fabricAndCare || null,
        fitDetails: newProd.fitDetails || null,
        deliveryTimeline: newProd.deliveryTimeline,
        packagingType: newProd.packagingType,
        returnPolicy: newProd.returnPolicy,
        shippingFee: newProd.shippingFee ?? null,
        isFreeShipping: newProd.isFreeShipping ?? false,
        isPinnedHero: newProd.isPinnedHero ?? false,
        heroOrder: newProd.heroOrder ?? 1,
        heroHeadline: newProd.heroHeadline || null,
        heroSubheadline: newProd.heroSubheadline || null,
        heroLookNumber: newProd.heroLookNumber || null,
        heroImage: newProd.heroImage || null,
      });
    } catch {
      // Saved in local state seamlessly
    }

    setIsProductModalOpen(false);
    showToast(
      editingProduct
        ? `Updated "${newProd.name}".`
        : `Added "${newProd.name}" to catalog.`
    );
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    setCloudProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteDoc(doc(db, "products", id));
    } catch {
      // ignore
    }
    showToast(`Removed "${name}" from cloud catalog.`);
  };

  const handleSeedCatalogToCloud = async () => {
    try {
      await Promise.all(
        NEW_YEAR_PRODUCTS.map((p) =>
          setDoc(doc(db, "products", p.id), {
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            originalPrice: p.originalPrice || null,
            image: p.image,
            badge: p.badge || null,
            description: p.description || "",
            sizes: p.sizes || ["S", "M", "L", "XL"],
            colors: p.colors || ["Black"],
            stock: p.stock ?? 45,
          })
        )
      );
      showToast("Synced all storefront garments to Firestore catalog.");
    } catch {
      setCloudProducts(NEW_YEAR_PRODUCTS);
      showToast("Synced storefront garments to active catalog.");
    }
  };

  // Promo Handlers
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newPromoCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanCode) return;
    const pct = Math.min(100, Math.max(1, Number(newPromoPct) || 20));
    const promoId = `promo_${Date.now()}`;
    const record: PromoRecord = {
      id: promoId,
      code: cleanCode,
      discountPercentage: pct,
      expiresAt: new Date(`${newPromoExpiry}T23:59:59`).toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const next = [record, ...promos.filter((p) => p.code !== cleanCode)];
    setPromos(next);
    localStorage.setItem("klamby_promo_codes", JSON.stringify(next));
    setNewPromoCode("");

    try {
      await setDoc(doc(db, "promoCodes", promoId), record);
    } catch {
      // saved in localStorage
    }
    showToast(`Created voucher code ${cleanCode} (${pct}% off).`);
  };

  const handleBulkGeneratePromos = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.min(50, Math.max(1, Number(bulkQty) || 5));
    const pct = Math.min(100, Math.max(1, Number(bulkPct) || 20));
    const prefix = bulkPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "BTNX";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    const batch: PromoRecord[] = [];
    for (let i = 0; i < qty; i++) {
      let suffix = "";
      for (let j = 0; j < 4; j++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      batch.push({
        id: `promo_bulk_${Date.now()}_${i}`,
        code: `${prefix}-${suffix}`,
        discountPercentage: pct,
        expiresAt: new Date("2027-12-31T23:59:59").toISOString(),
        createdAt: new Date().toISOString(),
        isActive: true,
      });
    }

    const next = [...batch, ...promos];
    setPromos(next);
    localStorage.setItem("klamby_promo_codes", JSON.stringify(next));
    showToast(`Generated ${qty} batch voucher codes (${pct}% off).`);
  };

  // Campaign Handlers
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerText.trim()) return;
    const next = [...announcements, newBannerText.trim().toUpperCase()];
    setAnnouncements(next);
    setNewBannerText("");
    try {
      await setDoc(doc(db, "siteContent", "hero"), { announcements: next }, { merge: true });
    } catch {
      // ignore
    }
    showToast("Added announcement slide to storefront header.");
  };

  const handleRemoveBanner = async (idx: number) => {
    const next = announcements.filter((_, i) => i !== idx);
    setAnnouncements(next);
    try {
      await setDoc(doc(db, "siteContent", "hero"), { announcements: next }, { merge: true });
    } catch {
      // ignore
    }
    showToast("Removed announcement slide.");
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    const newAlert = {
      id: `notif_${Date.now()}`,
      userId: "broadcast",
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
      type: broadcastType,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    setNotificationsList((prev) => [newAlert, ...prev]);
    setBroadcastTitle("");
    setBroadcastMessage("");
    try {
      await addDoc(collection(db, "notifications"), newAlert);
    } catch {
      // ignore
    }
    showToast("Broadcast notification dispatched to all client accounts.");
  };

  const hasAccess = (isFirebaseAdmin || studioUnlocked) && currentUserRole !== "support";

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-5 h-5 animate-spin text-[#966830] dark:text-[#C89B62] mb-3" />
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#66625B] dark:text-[#A7A299]">
          Loading BTNX Admin Studio...
        </p>
      </div>
    );
  }

  if (firebaseUser && currentUserRole === "support") {
    return (
      <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-7 sm:p-9 space-y-6 text-center shadow-[0_24px_60px_-15px_rgba(20,20,19,0.18)]">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF9F7] dark:bg-[#201F1D] border border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-center text-[#966830]">
            <Shield className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-medium">Access Restricted</h1>
            <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
              Signed in as <strong>{firebaseUser.email}</strong> (Support Staff). Customer service specialists do not have access to the Admin Portal, inventory controls, or financial records.
            </p>
          </div>
          <div className="pt-2 space-y-3">
            <a
              href="/support-staff"
              className="w-full h-10 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Headphones className="w-4 h-4" />
              <span>Go to Support Team Desk</span>
            </a>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="w-full h-10 border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-7 sm:p-9 space-y-6 shadow-[0_24px_60px_-15px_rgba(20,20,19,0.18)]">
          <div className="space-y-2 text-center border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5">
            <div className="flex justify-center text-[#141413] dark:text-[#F3F1EC]">
              <BrandLogo className="h-8 w-auto" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62]">
              Osun Atelier · Management Portal
            </p>
            <h1 className="font-display text-3xl font-medium">
              Admin Studio Access
            </h1>
          </div>

          {loginError && (
            <div className="p-3.5 border border-[#966830] bg-[#FAF9F7] dark:bg-[#141413] text-xs text-[#141413] dark:text-[#F3F1EC]">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminEmailLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                Admin Email or Studio ID
              </label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="e.g. btnx or admin@btnx.store"
                className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                Passcode
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full h-10 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
            >
              Sign In to Admin Studio
            </button>
          </form>

          <div className="space-y-2.5 pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
            <button
              type="button"
              onClick={handleUnlockStudio}
              className="w-full h-10 border border-[#966830] dark:border-[#C89B62] text-[#966830] dark:text-[#C89B62] hover:bg-[#966830] hover:text-white dark:hover:bg-[#C89B62] dark:hover:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] transition-colors cursor-pointer"
            >
              Quick Unlock Studio (Store Owner Mode)
            </button>

            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              className="w-full h-10 border border-[#E6E2DA] dark:border-[#2C2A26] text-xs text-[#141413] dark:text-[#F3F1EC] hover:border-[#141413] dark:hover:border-[#F3F1EC] cursor-pointer"
            >
              Continue with Google
            </button>
          </div>

          <div className="text-center pt-2">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to BTNX Storefront</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    {
      id: "support",
      label: "Customer Service",
      icon: Headphones,
      badge: humanQueueCount > 0 ? humanQueueCount : undefined,
    },
    {
      id: "orders",
      label: "Orders & Dispatch",
      icon: ShoppingBag,
      badge: pendingDispatchCount > 0 ? pendingDispatchCount : undefined,
    },
    { id: "products", label: "Catalog & Stock", icon: Package },
    { id: "hero", label: "Hero Showcase", icon: Sparkles },
    { id: "shipping", label: "Shipping & Logistics", icon: Truck },
    { id: "promos", label: "Promos & Vouchers", icon: Tag },
    { id: "campaigns", label: "Campaigns & Bar", icon: Megaphone },
    { id: "clients", label: "Clients & Leads", icon: Users },
  ];

  const filteredOrdersList = allOrders.filter((o) => {
    const matchesStatus =
      orderStatusFilter === "All" ||
      (o.status || "").toLowerCase() === orderStatusFilter.toLowerCase();
    const cleanQ = orderSearch.trim().toLowerCase();
    const matchesQuery =
      !cleanQ ||
      o.id.toLowerCase().includes(cleanQ) ||
      (o.userId || "").toLowerCase().includes(cleanQ);
    return matchesStatus && matchesQuery;
  });

  const filteredProductsList = allProducts.filter((p) => {
    const matchesCat =
      productCategoryFilter === "All" ||
      p.category.toLowerCase() === productCategoryFilter.toLowerCase();
    const cleanQ = productSearch.trim().toLowerCase();
    const matchesQuery =
      !cleanQ ||
      p.name.toLowerCase().includes(cleanQ) ||
      p.category.toLowerCase().includes(cleanQ);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] font-sans flex flex-col lg:flex-row transition-colors duration-200">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-[95] px-4 py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border border-[#E6E2DA]/20 shadow-lg flex items-center gap-2.5 text-xs font-medium">
          <Check className="w-4 h-4 text-[#C89B62] dark:text-[#966830]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Left Sidebar (Desktop 260px) */}
      <aside className="w-full lg:w-64 xl:w-72 bg-white dark:bg-[#191816] border-b lg:border-b-0 lg:border-r border-[#E6E2DA] dark:border-[#2C2A26] shrink-0 flex flex-col justify-between lg:min-h-screen lg:sticky lg:top-0">
        <div>
          {/* Brand Header */}
          <div className="h-16 lg:h-[68px] px-5 border-b border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="text-[#141413] dark:text-[#F3F1EC] hover:opacity-80 transition-opacity"
                title="BTNX Storefront"
              >
                <BrandLogo className="h-6 w-auto" />
              </a>
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] border-l border-[#E6E2DA] dark:border-[#2C2A26] pl-3">
                Admin Studio
              </span>
            </div>

            <a
              href="/"
              className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] inline-flex items-center gap-1"
              title="Back to Storefront"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline lg:hidden xl:inline">Store</span>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="p-2.5 lg:p-4 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-xs font-medium uppercase tracking-[0.13em] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413]"
                      : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E]"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`font-mono text-[10px] tabular-nums ${
                        isSelected
                          ? "text-[#C89B62] dark:text-[#966830]"
                          : "text-[#966830] dark:text-[#C89B62]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Controls: Theme Switcher & Store Links */}
        <div className="hidden lg:flex flex-col gap-4 p-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
              Appearance
            </span>
            <div className="inline-flex items-center p-0.5 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816]">
              {(
                [
                  { value: "system", icon: Monitor },
                  { value: "light", icon: Sun },
                  { value: "dark", icon: Moon },
                ] as { value: ThemePreference; icon: any }[]
              ).map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`w-7 h-7 flex items-center justify-center cursor-pointer ${
                      active
                        ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413]"
                        : "text-[#66625B] dark:text-[#A7A299]"
                    }`}
                    title={`${opt.value} mode`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
            <a
              href="/support"
              className="text-[11px] font-mono text-[#966830] dark:text-[#C89B62] hover:underline"
            >
              Client Support Page →
            </a>
            {firebaseUser && (
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="text-[11px] text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] inline-flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1440px] w-full mx-auto space-y-8">
        {/* MODULE 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                  Osun Store · Operations &amp; Analytics
                </span>
                <h1 className="font-display text-3xl sm:text-4xl font-medium">
                  Atelier Executive Overview
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("products");
                    openAddProductModal();
                  }}
                  className="h-9 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Garment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("support")}
                  className="h-9 px-4 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Headphones className="w-3.5 h-3.5 text-[#966830]" />
                  <span>Live Support ({tickets.length})</span>
                </button>
              </div>
            </div>

            {/* 4-Column KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="p-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                  Total Store Revenue
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                  {formatNaira(totalRevenue)}
                </p>
                <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                  Across {allOrders.length} recorded orders
                </p>
              </div>

              <div className="p-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                  Dispatch Queue
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                  {allOrders.length} Orders
                </p>
                <p className="text-xs text-[#966830] dark:text-[#C89B62]">
                  {pendingDispatchCount} awaiting Osun hub dispatch
                </p>
              </div>

              <div className="p-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                  Catalog Inventory
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                  {allProducts.length} Pieces
                </p>
                <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                  {lowStockCount} low-stock items (&le;10 units)
                </p>
              </div>

              <div className="p-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                  Client Care Desk
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-semibold tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                  {tickets.length} Threads
                </p>
                <p className="text-xs text-[#966830] dark:text-[#C89B62]">
                  {humanQueueCount} active Human Care conversations
                </p>
              </div>
            </div>

            {/* Recent Orders & Active Support Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26]">
                <div className="px-5 py-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between">
                  <h2 className="font-display text-xl font-medium">
                    Recent Store Orders
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] hover:underline cursor-pointer"
                  >
                    Manage All Orders →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-[#FAF9F7] dark:bg-[#141413] border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                      <tr>
                        <th className="px-5 py-3.5">Order ID</th>
                        <th className="px-5 py-3.5">Client</th>
                        <th className="px-5 py-3.5">Total (₦)</th>
                        <th className="px-5 py-3.5">Dispatch Status</th>
                        <th className="px-5 py-3.5 text-right">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                      {allOrders.slice(0, 6).map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#FAF9F7]/60 dark:hover:bg-[#22211E]/50">
                          <td className="px-5 py-3.5 font-mono font-semibold">
                            #{ord.id}
                          </td>
                          <td className="px-5 py-3.5 text-[#66625B] dark:text-[#A7A299] max-w-[180px] truncate">
                            {ord.userId || "Walk-in / Guest"}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-medium tabular-nums">
                            {formatNaira(ord.total)}
                          </td>
                          <td className="px-5 py-3.5">
                            <select
                              value={ord.status || "Confirmed"}
                              onChange={(e) =>
                                handleOrderStatusUpdate(ord.id, e.target.value)
                              }
                              className="h-8 px-2.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-[11px] outline-none"
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectedOrder(ord)}
                              className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] flex flex-col justify-between">
                <div>
                  <div className="px-5 py-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between">
                    <h2 className="font-display text-xl font-medium">
                      Live Customer Care Queue
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("support")}
                      className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] hover:underline cursor-pointer"
                    >
                      Open Desk →
                    </button>
                  </div>

                  <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                    {tickets.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setActiveTab("support");
                        }}
                        className="w-full p-4 text-left hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#66625B] dark:text-[#A7A299]">
                          <span className="font-semibold text-[#141413] dark:text-[#F3F1EC]">
                            #{t.id} · {t.userName}
                          </span>
                          <span
                            className={
                              t.mode === "human"
                                ? "text-[#966830] dark:text-[#C89B62]"
                                : ""
                            }
                          >
                            {t.mode === "human" ? "Human Care" : "Bot Mode"}
                          </span>
                        </div>
                        <p className="text-xs font-medium truncate">{t.subject}</p>
                        <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] truncate">
                          {t.messages[t.messages.length - 1]?.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("support")}
                    className="w-full h-9 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                  >
                    Launch Support Console
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: CUSTOMER SERVICE DESK (LIVE HUMAN AGENT CONSOLE) */}
        {activeTab === "support" && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                  Human Customer Care &amp; Bot Escalation Desk
                </span>
                <h1 className="font-display text-3xl sm:text-4xl font-medium">
                  Client Care Conversations
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#66625B] dark:text-[#A7A299]">
                  Replying as:
                </span>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Thread Inbox (4 cols) */}
              <div className="lg:col-span-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-hidden">
                <div className="grid grid-cols-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413]">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "human", label: "Human" },
                      { id: "bot", label: "Bot" },
                      { id: "resolved", label: "Resolved" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTicketFilter(f.id)}
                      className={`py-3 text-[10px] font-medium uppercase tracking-[0.12em] border-b-2 cursor-pointer ${
                        ticketFilter === f.id
                          ? "border-[#141413] dark:border-[#F3F1EC] text-[#141413] dark:text-[#F3F1EC] bg-white dark:bg-[#191816]"
                          : "border-transparent text-[#66625B] dark:text-[#A7A299]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] max-h-[580px] overflow-y-auto">
                  {filteredTickets.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#66625B] dark:text-[#A7A299]">
                      No support threads in this filter.
                    </div>
                  ) : (
                    filteredTickets.map((t) => {
                      const active = selectedTicket?.id === t.id;
                      const lastMsg = t.messages[t.messages.length - 1];
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`p-4 cursor-pointer transition-colors space-y-1.5 ${
                            active
                              ? "bg-[#FAF9F7] dark:bg-[#22211E]"
                              : "bg-white dark:bg-[#191816] hover:bg-[#FAF9F7]/60 dark:hover:bg-[#22211E]/50"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#66625B] dark:text-[#A7A299]">
                            <span className="font-semibold text-[#141413] dark:text-[#F3F1EC]">
                              #{t.id}
                            </span>
                            <span
                              className={
                                t.mode === "human"
                                  ? "text-[#966830] dark:text-[#C89B62] font-semibold"
                                  : ""
                              }
                            >
                              {t.status === "resolved"
                                ? "Resolved"
                                : t.mode === "human"
                                ? "Human Specialist"
                                : "Automated Bot"}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-[#141413] dark:text-[#F3F1EC] truncate">
                            {t.userName} ({t.userEmail})
                          </p>
                          <p className="text-xs text-[#141413] dark:text-[#F3F1EC] truncate">
                            {t.subject}
                          </p>
                          {lastMsg && (
                            <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] line-clamp-1">
                              {lastMsg.text}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Live Chat Console (8 cols) */}
              <div className="lg:col-span-8 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] flex flex-col min-h-[600px]">
                {selectedTicket ? (
                  <>
                    {/* Ticket Header */}
                    <div className="px-5 py-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#66625B] dark:text-[#A7A299]">
                          <span className="font-semibold text-[#141413] dark:text-[#F3F1EC]">
                            Ticket #{selectedTicket.id}
                          </span>
                          <span>·</span>
                          <span>{selectedTicket.userName}</span>
                          <span>·</span>
                          <span>{selectedTicket.userEmail}</span>
                        </div>
                        <h2 className="font-display text-xl sm:text-2xl font-medium">
                          {selectedTicket.subject}
                        </h2>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {selectedTicket.mode === "bot" && (
                          <button
                            type="button"
                            onClick={() => handleAdminTakeOverTicket(selectedTicket)}
                            className="h-9 px-4 bg-[#966830] dark:bg-[#C89B62] text-white dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Join as Human Specialist</span>
                          </button>
                        )}

                        {selectedTicket.status !== "resolved" && (
                          <button
                            type="button"
                            onClick={async () => {
                              const nowIso = new Date().toISOString();
                              await persistTicket({
                                ...selectedTicket,
                                status: "resolved",
                                updatedAt: nowIso,
                                messages: [
                                  ...selectedTicket.messages,
                                  {
                                    id: `msg-${Date.now()}-res`,
                                    sender: "system",
                                    senderName: "System",
                                    text: `Ticket resolved by ${agentName}.`,
                                    createdAt: nowIso,
                                  },
                                ],
                              });
                              showToast(`Resolved Ticket #${selectedTicket.id}.`);
                            }}
                            className="h-9 px-3.5 border border-[#141413] dark:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            await removeTicket(selectedTicket.id);
                            showToast(`Deleted Ticket #${selectedTicket.id}.`);
                          }}
                          className="h-9 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                          title="Delete Thread"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Message Stream */}
                    <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[440px]">
                      {selectedTicket.messages.map((msg) => {
                        if (msg.sender === "system") {
                          return (
                            <div
                              key={msg.id}
                              className="py-2 px-4 border-y border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] text-center text-[11px] font-mono text-[#966830] dark:text-[#C89B62]"
                            >
                              {msg.text}
                            </div>
                          );
                        }

                        const isAgentOrBot =
                          msg.sender === "agent" || msg.sender === "bot";

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              isAgentOrBot ? "items-end" : "items-start"
                            } space-y-1.5`}
                          >
                            <div className="flex items-center gap-2 text-[10px] font-mono text-[#66625B] dark:text-[#A7A299]">
                              <span className="font-semibold text-[#141413] dark:text-[#F3F1EC] uppercase">
                                {msg.senderName}
                              </span>
                              <span>·</span>
                              <span>
                                {msg.sender === "customer"
                                  ? "Client"
                                  : msg.sender === "bot"
                                  ? "Automated Bot"
                                  : "Human Specialist"}
                              </span>
                              <span>·</span>
                              <span className="tabular-nums">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <div
                              className={`max-w-xl w-full sm:w-auto p-4 border space-y-3 ${
                                msg.sender === "agent"
                                  ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413] dark:border-[#F3F1EC]"
                                  : msg.sender === "bot"
                                  ? "bg-[#FAF9F7] dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] border-[#E6E2DA] dark:border-[#2C2A26]"
                                  : "bg-white dark:bg-[#141413] text-[#141413] dark:text-[#F3F1EC] border-[#966830]/60 dark:border-[#C89B62]/60"
                              }`}
                            >
                              {msg.attachedOrder && (
                                <div className="p-3 border border-current/20 bg-[#FAF9F7]/10 flex items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[10px] font-mono uppercase text-[#966830] dark:text-[#C89B62] block">
                                      Order #{msg.attachedOrder.id}
                                    </span>
                                    <p className="text-xs font-medium">
                                      {msg.attachedOrder.firstItemName} ·{" "}
                                      {formatNaira(msg.attachedOrder.total)}
                                    </p>
                                    <p className="font-mono text-[11px] opacity-80">
                                      Status: {msg.attachedOrder.status}
                                    </p>
                                  </div>
                                  <select
                                    value={msg.attachedOrder.status}
                                    onChange={(e) =>
                                      handleOrderStatusUpdate(
                                        msg.attachedOrder!.id,
                                        e.target.value
                                      )
                                    }
                                    className="h-8 px-2 bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono"
                                  >
                                    {ORDER_STATUSES.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {msg.attachedProduct && (
                                <div className="p-3 border border-current/20 flex items-center gap-3">
                                  <div className="w-10 h-12 bg-[#F4F1EC] overflow-hidden shrink-0">
                                    <GalleryImage
                                      src={msg.attachedProduct.image}
                                      alt={msg.attachedProduct.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium">
                                      {msg.attachedProduct.name}
                                    </p>
                                    <p className="font-mono text-[11px] opacity-80">
                                      {msg.attachedProduct.category} ·{" "}
                                      {formatNaira(msg.attachedProduct.price)}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {msg.attachedAction && (
                                <div className="p-3 border border-current/25 space-y-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] font-mono uppercase text-[#966830] dark:text-[#C89B62] font-semibold">
                                      {msg.attachedAction.title}
                                    </span>
                                    {msg.attachedAction.status !== "approved" ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleApproveCustomerAction(
                                            selectedTicket,
                                            msg.id
                                          )
                                        }
                                        className="px-2.5 py-1 bg-[#966830] text-white text-[10px] font-mono uppercase cursor-pointer"
                                      >
                                        Approve Request
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-mono uppercase text-[#966830]">
                                        ✓ Approved
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs space-y-1">
                                    {Object.entries(
                                      msg.attachedAction.details
                                    ).map(([k, v]) => (
                                      <p key={k}>
                                        <span className="opacity-70 capitalize">
                                          {k}:{" "}
                                        </span>
                                        <span className="font-mono">{v}</span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {msg.images && msg.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 max-w-sm">
                                  {msg.images.map((imgUrl, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setLightboxImage(imgUrl)}
                                      className="aspect-[4/3] overflow-hidden border border-current/20 cursor-pointer"
                                    >
                                      <img
                                        src={imgUrl}
                                        alt="Support attachment"
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}

                              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Canned Specialist Quick Replies */}
                    <div className="px-4 py-2.5 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex items-center gap-2 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#66625B] shrink-0">
                        Quick Replies:
                      </span>
                      {CANNED_AGENT_REPLIES.map((cr) => (
                        <button
                          key={cr.label}
                          type="button"
                          onClick={() => handleAdminSendReply(cr.text)}
                          className="px-2.5 py-1 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {cr.label}
                        </button>
                      ))}
                    </div>

                    {/* Admin Attachment Drawers */}
                    {agentAttachmentDrawer === "order" && (
                      <div className="p-3.5 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex flex-wrap gap-2">
                        {allOrders.slice(0, 6).map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              setAgentStagedOrder(orderToSupportAttachment(o));
                              setAgentAttachmentDrawer("none");
                            }}
                            className="px-3 py-1.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono cursor-pointer"
                          >
                            #{o.id} ({o.status} · {formatNaira(o.total)})
                          </button>
                        ))}
                      </div>
                    )}

                    {agentAttachmentDrawer === "product" && (
                      <div className="p-3.5 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex flex-wrap gap-2">
                        {allProducts.slice(0, 6).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setAgentStagedProduct(productToSupportAttachment(p));
                              setAgentAttachmentDrawer("none");
                            }}
                            className="px-3 py-1.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs cursor-pointer"
                          >
                            {p.name} ({formatNaira(p.price)})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Staged Admin Attachments */}
                    {(agentStagedOrder ||
                      agentStagedProduct ||
                      agentStagedImages.length > 0) && (
                      <div className="px-4 py-2 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono text-[10px] uppercase text-[#966830]">
                          Attached:
                        </span>
                        {agentStagedOrder && (
                          <span className="px-2 py-0.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono">
                            Order #{agentStagedOrder.id}
                          </span>
                        )}
                        {agentStagedProduct && (
                          <span className="px-2 py-0.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26]">
                            {agentStagedProduct.name}
                          </span>
                        )}
                        {agentStagedImages.length > 0 && (
                          <span className="px-2 py-0.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26]">
                            {agentStagedImages.length} Photo(s)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAgentStagedOrder(undefined);
                            setAgentStagedProduct(undefined);
                            setAgentStagedImages([]);
                          }}
                          className="text-[11px] underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    {/* Admin Reply Composer */}
                    <div className="p-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] space-y-2.5">
                      <input
                        ref={agentFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAgentImageUpload}
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setAgentAttachmentDrawer(
                              agentAttachmentDrawer === "order" ? "none" : "order"
                            )
                          }
                          className="h-8 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Send Order Card</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAgentAttachmentDrawer(
                              agentAttachmentDrawer === "product"
                                ? "none"
                                : "product"
                            )
                          }
                          className="h-8 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Send Garment</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => agentFileInputRef.current?.click()}
                          className="h-8 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Attach Image(s)</span>
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAdminSendReply();
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={agentReplyText}
                          onChange={(e) => setAgentReplyText(e.target.value)}
                          placeholder={`Reply to ${selectedTicket.userName} as Human Customer Care...`}
                          className="flex-1 h-10 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs sm:text-sm outline-none"
                        />
                        <button
                          type="submit"
                          className="h-10 px-5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Reply</span>
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center my-auto text-xs text-[#66625B]">
                    Select a conversation on the left to inspect and reply.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 3: ORDERS & DISPATCH */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                  Osogbo Hub &amp; Nationwide Logistics
                </span>
                <h1 className="font-display text-3xl sm:text-4xl font-medium">
                  Orders &amp; Dispatch Manifest
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#66625B] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order ID or Client..."
                    className="h-9 pl-8 pr-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono outline-none"
                >
                  <option value="All">All Statuses</option>
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#FAF9F7] dark:bg-[#141413] border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                  <tr>
                    <th className="px-5 py-3.5">Order ID</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-5 py-3.5">Pieces</th>
                    <th className="px-5 py-3.5">Amount (₦)</th>
                    <th className="px-5 py-3.5">Dispatch Stage</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                  {filteredOrdersList.map((ord) => {
                    const count =
                      ord.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 1;
                    return (
                      <tr
                        key={ord.id}
                        className="hover:bg-[#FAF9F7]/60 dark:hover:bg-[#22211E]/50"
                      >
                        <td className="px-5 py-4 font-mono font-semibold">
                          #{ord.id}
                        </td>
                        <td className="px-5 py-4 font-mono text-[#66625B] dark:text-[#A7A299]">
                          {ord.date || "Recent"}
                        </td>
                        <td className="px-5 py-4 max-w-[200px] truncate">
                          {ord.userId || "Guest Checkout"}
                        </td>
                        <td className="px-5 py-4 font-mono">
                          {count} {count === 1 ? "piece" : "pieces"}
                        </td>
                        <td className="px-5 py-4 font-mono font-semibold tabular-nums">
                          {formatNaira(ord.total)}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={ord.status || "Confirmed"}
                            onChange={(e) =>
                              handleOrderStatusUpdate(ord.id, e.target.value)
                            }
                            className="h-8 px-2.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-[11px] outline-none"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setInspectedOrder(ord)}
                            className="px-3 py-1.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase hover:border-[#141413] dark:hover:border-[#F3F1EC] cursor-pointer"
                          >
                            Invoice
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              downloadOrderInvoice(ord, {
                                email: ord.userId || "client@btnx.store",
                              });
                              showToast(`Downloaded Invoice-${ord.id}.html`);
                            }}
                            className="px-2.5 py-1.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase hover:border-[#141413] cursor-pointer"
                            title="Download HTML Invoice"
                          >
                            <Download className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 4: CATALOG & INVENTORY */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                  Garment Archive &amp; Stock Control
                </span>
                <h1 className="font-display text-3xl sm:text-4xl font-medium">
                  Catalog &amp; Inventory ({allProducts.length})
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSeedCatalogToCloud}
                  className="h-9 px-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-[11px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Default Catalog</span>
                </button>
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="h-9 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Piece</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {["All", ...PRODUCT_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setProductCategoryFilter(cat)}
                    className={`h-8 px-3 text-[11px] font-medium uppercase tracking-[0.12em] border cursor-pointer ${
                      productCategoryFilter === cat
                        ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413] dark:border-[#F3F1EC]"
                        : "bg-white dark:bg-[#191816] text-[#66625B] dark:text-[#A7A299] border-[#E6E2DA] dark:border-[#2C2A26]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#66625B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filter catalog..."
                  className="w-full h-8 pl-8 pr-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none"
                />
              </div>
            </div>

            {/* Catalog Table */}
            <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#FAF9F7] dark:bg-[#141413] border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                  <tr>
                    <th className="px-5 py-3.5">Garment Piece</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Price (₦)</th>
                    <th className="px-5 py-3.5">Stock</th>
                    <th className="px-5 py-3.5">Sizes</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                  {filteredProductsList.map((prod) => (
                    <tr
                      key={prod.id}
                      className="hover:bg-[#FAF9F7]/60 dark:hover:bg-[#22211E]/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-14 bg-[#F4F1EC] dark:bg-[#2A2824] overflow-hidden shrink-0">
                            <GalleryImage
                              src={prod.image}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-[#141413] dark:text-[#F3F1EC]">
                              {prod.name}
                            </p>
                            <p className="font-mono text-[10px] text-[#66625B] dark:text-[#A7A299]">
                              ID: {prod.id}
                              {prod.badge ? ` · ${prod.badge}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 uppercase tracking-[0.1em] text-[11px] text-[#66625B] dark:text-[#A7A299]">
                        {prod.category}
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums">
                        <span className="font-semibold">
                          {formatNaira(prod.price)}
                        </span>
                        {prod.originalPrice && (
                          <span className="block text-[10px] text-[#66625B] line-through">
                            {formatNaira(prod.originalPrice)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums">
                        <span
                          className={
                            (prod.stock ?? 45) <= 10
                              ? "text-[#966830] dark:text-[#C89B62] font-semibold"
                              : ""
                          }
                        >
                          {prod.stock ?? 45} units
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[#66625B] dark:text-[#A7A299]">
                        {(prod.sizes || ["S", "M", "L", "XL"]).join(" · ")}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditProductModal(prod)}
                          className="px-3 py-1.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase hover:border-[#141413] dark:hover:border-[#F3F1EC] cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:text-[#141413] cursor-pointer"
                          title="Delete Piece"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 5: PROMOS & VOUCHERS */}
        {activeTab === "promos" && (
          <div className="space-y-8">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                Seasonal Discounts &amp; Invitation Codes
              </span>
              <h1 className="font-display text-3xl sm:text-4xl font-medium">
                Promos &amp; Voucher Generator
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Create Single + Bulk Forms (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <form
                  onSubmit={handleCreatePromo}
                  className="p-6 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-4"
                >
                  <h2 className="font-display text-xl font-medium">
                    Create Individual Voucher
                  </h2>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.12em] text-[#66625B] mb-1">
                      Voucher Code
                    </label>
                    <input
                      type="text"
                      required
                      value={newPromoCode}
                      onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                      placeholder="e.g. OSUN30"
                      className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono uppercase outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-[0.12em] text-[#66625B] mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={newPromoPct}
                        onChange={(e) => setNewPromoPct(e.target.value)}
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-[0.12em] text-[#66625B] mb-1">
                        Expires On
                      </label>
                      <input
                        type="date"
                        value={newPromoExpiry}
                        onChange={(e) => setNewPromoExpiry(e.target.value)}
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full h-10 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                  >
                    Publish Voucher Code
                  </button>
                </form>

                <form
                  onSubmit={handleBulkGeneratePromos}
                  className="p-6 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-4"
                >
                  <h2 className="font-display text-xl font-medium">
                    Bulk Invitation Code Generator
                  </h2>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={bulkPrefix}
                        onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                        className="w-full h-9 px-2.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                        Discount %
                      </label>
                      <input
                        type="number"
                        value={bulkPct}
                        onChange={(e) => setBulkPct(e.target.value)}
                        className="w-full h-9 px-2.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                        Batch Size
                      </label>
                      <select
                        value={bulkQty}
                        onChange={(e) => setBulkQty(e.target.value)}
                        className="w-full h-9 px-2 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono outline-none"
                      >
                        <option value="5">5 Codes</option>
                        <option value="10">10 Codes</option>
                        <option value="25">25 Codes</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full h-10 border border-[#141413] dark:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                  >
                    Generate Batch Codes
                  </button>
                </form>
              </div>

              {/* Active Promos List (7 cols) */}
              <div className="lg:col-span-7 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#FAF9F7] dark:bg-[#141413] border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                    <tr>
                      <th className="px-5 py-3.5">Code</th>
                      <th className="px-5 py-3.5">Discount</th>
                      <th className="px-5 py-3.5">Expires</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                    {promos.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3.5 font-mono font-semibold">
                          <div className="flex items-center gap-2">
                            <span>{p.code}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(p.code);
                                setCopiedCode(p.code);
                                setTimeout(() => setCopiedCode(null), 1500);
                              }}
                              className="text-[#66625B] hover:text-[#141413] cursor-pointer"
                            >
                              {copiedCode === p.code ? (
                                <Check className="w-3.5 h-3.5 text-[#966830]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono">
                          {p.discountPercentage}% OFF
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[#66625B]">
                          {new Date(p.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = promos.map((item) =>
                                item.id === p.id
                                  ? {
                                      ...item,
                                      isActive: item.isActive === false ? true : false,
                                    }
                                  : item
                              );
                              setPromos(next);
                              localStorage.setItem(
                                "klamby_promo_codes",
                                JSON.stringify(next)
                              );
                            }}
                            className="font-mono text-[11px] uppercase underline cursor-pointer"
                          >
                            {p.isActive !== false ? "Active" : "Paused"}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const next = promos.filter((item) => item.id !== p.id);
                              setPromos(next);
                              localStorage.setItem(
                                "klamby_promo_codes",
                                JSON.stringify(next)
                              );
                            }}
                            className="text-[#66625B] hover:text-[#141413] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 6: CAMPAIGNS & STOREFRONT ANNOUNCEMENTS */}
        {activeTab === "campaigns" && (
          <div className="space-y-8">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                Storefront Top Bar &amp; Client Alerts
              </span>
              <h1 className="font-display text-3xl sm:text-4xl font-medium">
                Campaigns &amp; Broadcasts
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Announcement Bar Editor (6 cols) */}
              <div className="lg:col-span-6 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-5">
                <div>
                  <h2 className="font-display text-2xl font-medium">
                    Storefront Announcement Slides
                  </h2>
                  <p className="text-xs text-[#66625B] dark:text-[#A7A299] mt-1">
                    Rotates at the top of the BTNX header across all pages.
                  </p>
                </div>

                <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] border border-[#E6E2DA] dark:border-[#2C2A26]">
                  {announcements.map((slide, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <span className="truncate">
                        0{idx + 1}. {slide}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBanner(idx)}
                        className="text-[#66625B] hover:text-[#141413] shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddBanner} className="flex gap-2">
                  <input
                    type="text"
                    value={newBannerText}
                    onChange={(e) => setNewBannerText(e.target.value)}
                    placeholder="Add new announcement slide..."
                    className="flex-1 h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono uppercase outline-none"
                  />
                  <button
                    type="submit"
                    className="h-10 px-5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                  >
                    Add Slide
                  </button>
                </form>
              </div>

              {/* Storewide Notification Broadcast (6 cols) */}
              <form
                onSubmit={handleSendBroadcast}
                className="lg:col-span-6 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-4"
              >
                <div>
                  <h2 className="font-display text-2xl font-medium">
                    Dispatch Storewide Notification
                  </h2>
                  <p className="text-xs text-[#66625B] dark:text-[#A7A299] mt-1">
                    Sends an instant alert to all client notification bells.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                      Alert Title
                    </label>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. New Osun Studio Drop"
                      className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                      Category
                    </label>
                    <select
                      value={broadcastType}
                      onChange={(e) => setBroadcastType(e.target.value as any)}
                      className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none"
                    >
                      <option value="promo">Promotional Offer</option>
                      <option value="new_arrival">New Arrival Drop</option>
                      <option value="system">Store Announcement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Message
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Write the notification message..."
                    className="w-full p-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="h-10 px-6 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Broadcast</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODULE 7: CLIENTS & SUBSCRIBERS */}
        {activeTab === "clients" && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                  Accounts &amp; Dispatch Mailing List
                </span>
                <h1 className="font-display text-3xl sm:text-4xl font-medium">
                  Client Directory &amp; Subscribers
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClientSubTab("users")}
                  className={`h-9 px-4 text-[11px] font-medium uppercase tracking-[0.12em] border cursor-pointer ${
                    clientSubTab === "users"
                      ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413]"
                      : "bg-white dark:bg-[#191816] border-[#E6E2DA] dark:border-[#2C2A26]"
                  }`}
                >
                  Registered Clients ({usersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setClientSubTab("newsletters")}
                  className={`h-9 px-4 text-[11px] font-medium uppercase tracking-[0.12em] border cursor-pointer ${
                    clientSubTab === "newsletters"
                      ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413]"
                      : "bg-white dark:bg-[#191816] border-[#E6E2DA] dark:border-[#2C2A26]"
                  }`}
                >
                  Newsletter Subscribers ({newslettersList.length})
                </button>
              </div>
            </div>

            {clientSubTab === "users" ? (
              <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#FAF9F7] dark:bg-[#141413] border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B]">
                    <tr>
                      <th className="px-5 py-3.5">Client Name</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Shipping City</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5 text-right">Role Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                    {usersList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-[#66625B]"
                        >
                          Registered accounts will appear here when clients sign in.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id}>
                          <td className="px-5 py-3.5 font-medium">
                            {u.name || "BTNX Client"}
                          </td>
                          <td className="px-5 py-3.5 font-mono">{u.email}</td>
                          <td className="px-5 py-3.5 text-[#66625B]">
                            {u.shippingCity || "Osogbo / Nationwide"}
                          </td>
                          <td className="px-5 py-3.5 font-mono uppercase">
                            {u.role || "customer"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const nextRole =
                                  u.role === "admin" ? "customer" : "admin";
                                setUsersList((prev) =>
                                  prev.map((item) =>
                                    item.id === u.id
                                      ? { ...item, role: nextRole }
                                      : item
                                  )
                                );
                                try {
                                  await updateDoc(doc(db, "users", u.id), {
                                    role: nextRole,
                                  });
                                } catch {
                                  // ignore
                                }
                                showToast(
                                  `Updated ${u.email} role to ${nextRole}.`
                                );
                              }}
                              className="px-3 py-1 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase cursor-pointer"
                            >
                              {u.role === "admin"
                                ? "Set as Customer"
                                : "Promote to Admin"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#FAF9F7] dark:bg-[#141413] border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B]">
                    <tr>
                      <th className="px-5 py-3.5">Subscriber Email</th>
                      <th className="px-5 py-3.5">Subscribed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                    {newslettersList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-5 py-8 text-center text-[#66625B]"
                        >
                          No newsletter dispatches recorded yet.
                        </td>
                      </tr>
                    ) : (
                      newslettersList.map((n) => (
                        <tr key={n.id}>
                          <td className="px-5 py-3.5 font-mono">{n.email}</td>
                          <td className="px-5 py-3.5 font-mono text-[#66625B]">
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleDateString()
                              : "Recent"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODULE: HERO SHOWCASE (ADMIN-PINNED PRODUCTS) */}
        {activeTab === "hero" && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                  Storefront Banner · Dynamic Slider Engine
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                  Hero Carousel Showcase
                </h1>
                <p className="text-xs text-[#66625B] dark:text-[#A7A299] mt-1 max-w-2xl">
                  Only the pieces you pin below will be featured on the main homepage Hero carousel. Customers clicking a slide will immediately open the garment modal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("products");
                  openAddProductModal();
                }}
                className="h-9 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add &amp; Pin Piece</span>
              </button>
            </div>

            {/* Currently Pinned Hero Slides Table */}
            <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-hidden">
              <div className="p-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.12em] font-medium text-[#141413] dark:text-[#F3F1EC]">
                  Active Pinned Hero Slides ({allProducts.filter((p) => p.isPinnedHero).length})
                </span>
                <span className="text-[10px] font-mono text-[#966830] dark:text-[#C89B62]">
                  Ordered by Slide Priority
                </span>
              </div>

              {allProducts.filter((p) => p.isPinnedHero).length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-[#966830] mx-auto opacity-70" />
                  <p className="text-sm font-medium text-[#141413] dark:text-[#F3F1EC]">
                    No pieces are currently pinned to the hero slider.
                  </p>
                  <p className="text-xs text-[#66625B] dark:text-[#A7A299] max-w-md mx-auto">
                    The storefront is currently showing default lookbook slides. Pin products from the table below to feature your custom drops on the home banner.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-[#FAF9F7] dark:bg-[#141413] border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B]">
                      <tr>
                        <th className="px-5 py-3.5">Priority</th>
                        <th className="px-5 py-3.5">Look #</th>
                        <th className="px-5 py-3.5">Piece</th>
                        <th className="px-5 py-3.5">Hero Headline &amp; Subtitle</th>
                        <th className="px-5 py-3.5">Price</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                      {allProducts
                        .filter((p) => p.isPinnedHero)
                        .sort((a, b) => (a.heroOrder ?? 1) - (b.heroOrder ?? 1))
                        .map((prod) => (
                          <tr key={prod.id} className="hover:bg-[#FAF9F7] dark:hover:bg-[#201F1D] transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#966830] dark:text-[#C89B62]">
                              #{prod.heroOrder ?? 1}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs">
                              {prod.heroLookNumber || "Look 01"}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.heroImage || prod.image}
                                  alt={prod.name}
                                  className="w-10 h-12 object-cover border border-[#E6E2DA] dark:border-[#2C2A26] shrink-0"
                                />
                                <div>
                                  <span className="font-medium text-[#141413] dark:text-[#F3F1EC] block">
                                    {prod.name}
                                  </span>
                                  <span className="text-[10px] text-[#66625B] uppercase font-mono">
                                    {prod.category}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="block font-medium text-[#141413] dark:text-[#F3F1EC]">
                                {prod.heroHeadline || prod.name}
                              </span>
                              <span className="block text-[11px] text-[#66625B]">
                                {prod.heroSubheadline || `${prod.category} · Featured Look`}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs">
                              {formatNaira(prod.price)}
                            </td>
                            <td className="px-5 py-3.5 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => openEditProductModal(prod)}
                                className="px-3 py-1.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase hover:border-[#141413] dark:hover:border-[#F3F1EC] cursor-pointer"
                              >
                                Edit Slide
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const updated = { ...prod, isPinnedHero: false };
                                  setCloudProducts((prev) =>
                                    prev.map((p) => (p.id === prod.id ? updated : p))
                                  );
                                  try {
                                    await updateDoc(doc(db, "products", prod.id), {
                                      isPinnedHero: false,
                                    });
                                  } catch {}
                                  showToast(`Unpinned "${prod.name}" from Hero.`);
                                }}
                                className="px-3 py-1.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase text-[#A83232] hover:bg-[#FDF2F2] dark:hover:bg-[#2A1414] cursor-pointer"
                              >
                                Unpin
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Pin Other Products from Catalog */}
            <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-medium">
                    Quick-Pin Other Products to Hero Slider
                  </h3>
                  <p className="text-xs text-[#66625B]">
                    Click "Pin to Hero" on any piece below to instantly add it to your home carousel.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allProducts
                  .filter((p) => !p.isPinnedHero)
                  .slice(0, 6)
                  .map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 border border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-9 h-11 object-cover shrink-0 border border-[#E6E2DA] dark:border-[#2C2A26]"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate text-[#141413] dark:text-[#F3F1EC]">
                            {prod.name}
                          </p>
                          <p className="font-mono text-[10px] text-[#966830]">
                            {formatNaira(prod.price)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const currentPinnedCount = allProducts.filter((p) => p.isPinnedHero).length;
                          const updated: Product = {
                            ...prod,
                            isPinnedHero: true,
                            heroOrder: currentPinnedCount + 1,
                            heroLookNumber: `Look 0${currentPinnedCount + 1}`,
                          };
                          setCloudProducts((prev) =>
                            prev.map((p) => (p.id === prod.id ? updated : p))
                          );
                          try {
                            await updateDoc(doc(db, "products", prod.id), {
                              isPinnedHero: true,
                              heroOrder: currentPinnedCount + 1,
                              heroLookNumber: `Look 0${currentPinnedCount + 1}`,
                            });
                          } catch {}
                          showToast(`Pinned "${prod.name}" to Hero Carousel.`);
                        }}
                        className="h-8 px-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] font-mono uppercase tracking-wider shrink-0 cursor-pointer"
                      >
                        Pin to Hero
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* MODULE: GLOBAL SHIPPING & LOGISTICS ENGINE */}
        {activeTab === "shipping" && (
          <div className="space-y-6">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] block mb-1">
                Storefront Logistics · Real-Time Calculation Engine
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                Shipping, Packaging &amp; Return Policies
              </h1>
              <p className="text-xs text-[#66625B] dark:text-[#A7A299] mt-1 max-w-2xl">
                Set baseline nationwide shipping fees, free shipping cart limits, delivery duration, and packaging descriptions. Changes sync across all checkout carts and product drawers instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Column */}
              <div className="lg:col-span-8 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-6">
                <form onSubmit={handleSaveShippingSettings} className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1.5">
                        Standard Nationwide Delivery Fee (₦)
                      </label>
                      <input
                        type="number"
                        required
                        value={shippingSettings.defaultShippingFee}
                        onChange={(e) =>
                          setShippingSettings((prev) => ({
                            ...prev,
                            defaultShippingFee: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full h-10 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-sm outline-none"
                      />
                      <span className="block text-[10px] text-[#8C877D] mt-1">
                        Applied to carts below the free shipping threshold.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1.5">
                        Free Shipping Cart Minimum (₦)
                      </label>
                      <input
                        type="number"
                        required
                        value={shippingSettings.freeShippingThreshold}
                        onChange={(e) =>
                          setShippingSettings((prev) => ({
                            ...prev,
                            freeShippingThreshold: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full h-10 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-sm outline-none"
                      />
                      <span className="block text-[10px] text-[#8C877D] mt-1">
                        Orders at or above this amount automatically unlock complimentary delivery.
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
                        Global Site-Wide Free Shipping
                      </span>
                      <span className="block text-[11px] text-[#66625B] mt-0.5">
                        When enabled, all orders receive free delivery regardless of cart subtotal.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shippingSettings.isFreeShippingGlobal}
                        onChange={(e) =>
                          setShippingSettings((prev) => ({
                            ...prev,
                            isFreeShippingGlobal: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 accent-[#966830]"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1.5">
                        Estimated Delivery Duration
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingSettings.defaultDeliveryTimeline}
                        onChange={(e) =>
                          setShippingSettings((prev) => ({
                            ...prev,
                            defaultDeliveryTimeline: e.target.value,
                          }))
                        }
                        placeholder="e.g. 2–4 Business Days"
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1.5">
                        Luxury Packaging Type
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingSettings.defaultPackagingType}
                        onChange={(e) =>
                          setShippingSettings((prev) => ({
                            ...prev,
                            defaultPackagingType: e.target.value,
                          }))
                        }
                        placeholder="e.g. Cotton Garment Box"
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1.5">
                        Return &amp; Exchange Window
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingSettings.defaultReturnPolicy}
                        onChange={(e) =>
                          setShippingSettings((prev) => ({
                            ...prev,
                            defaultReturnPolicy: e.target.value,
                          }))
                        }
                        placeholder="e.g. 14-Day Free Exchanges"
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingShipping}
                      className="h-10 px-6 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] cursor-pointer"
                    >
                      {isSavingShipping ? "Updating Database..." : "Save Shipping Policies"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Preview Card */}
              <div className="lg:col-span-4 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] p-5 space-y-4">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] block">
                  Storefront Client Preview
                </span>

                <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-4 rounded-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#966830]" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Delivery &amp; Packaging Specs
                    </span>
                  </div>

                  <div className="space-y-2 text-xs divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                    <div className="pt-2 flex justify-between">
                      <span className="text-[#66625B]">Standard Rate:</span>
                      <span className="font-mono font-medium">
                        {formatNaira(shippingSettings.defaultShippingFee)}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-[#66625B]">Free Delivery Over:</span>
                      <span className="font-mono font-medium text-[#1D7A46] dark:text-[#67E28E]">
                        {shippingSettings.isFreeShippingGlobal
                          ? "Site-Wide Free"
                          : formatNaira(shippingSettings.freeShippingThreshold)}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-[#66625B]">Timeline:</span>
                      <span>{shippingSettings.defaultDeliveryTimeline}</span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-[#66625B]">Box Type:</span>
                      <span>{shippingSettings.defaultPackagingType}</span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-[#66625B]">Exchanges:</span>
                      <span>{shippingSettings.defaultReturnPolicy}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#66625B] leading-relaxed">
                  These settings govern calculations in the customer Bag, invoice generation, checkout authorization, and product detail accordions.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div
          onClick={() => setIsProductModalOpen(false)}
          className="fixed inset-0 z-[80] bg-black/75 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
              <h2 className="font-display text-2xl font-medium">
                {editingProduct ? "Edit Garment Piece" : "Add New Garment Piece"}
              </h2>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-[#66625B] hover:text-[#141413] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Garment Name
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Category
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, category: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Price (₦ Naira)
                  </label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, price: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Compare Price (₦ Optional)
                  </label>
                  <input
                    type="number"
                    value={productForm.originalPrice}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        originalPrice: e.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Editorial Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={productForm.badge}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, badge: e.target.value }))
                    }
                    placeholder="e.g. NEW or -20%"
                    className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Stock Units
                  </label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, stock: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                  Garment Image (URL or Device Upload)
                </label>
                <input
                  ref={productFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageFile}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={productForm.image}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, image: e.target.value }))
                    }
                    className="flex-1 h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => productFileInputRef.current?.click()}
                    className="h-10 px-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase cursor-pointer"
                  >
                    Upload Photo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                  Available Sizes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SIZES_LIST.map((sz) => {
                    const active = productForm.sizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() =>
                          setProductForm((prev) => ({
                            ...prev,
                            sizes: active
                              ? prev.sizes.filter((s) => s !== sz)
                              : [...prev.sizes, sz],
                          }))
                        }
                        className={`w-9 h-9 font-mono text-xs border cursor-pointer ${
                          active
                            ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413]"
                            : "border-[#E6E2DA] dark:border-[#2C2A26]"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                  Product Overview &amp; Description
                </label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="w-full p-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none resize-none"
                />
              </div>

              {/* FABRIC & CARE & FIT SPECIFICATIONS */}
              <div className="p-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-3">
                <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62]">
                  Fabric, Fit &amp; Garment Care (Customer Modal Specs)
                </span>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Fabric &amp; Care Details (Multiline)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Brushed wool-blend check overshirt with a cropped boxy fit, horn buttons, and dual chest pockets."
                    value={productForm.fabricAndCare}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        fabricAndCare: e.target.value,
                      }))
                    }
                    className="w-full p-2.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                    Fit &amp; Washing Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Relaxed, structured fit with reinforced seams. Machine wash cold inside out or dry clean."
                    value={productForm.fitDetails}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        fitDetails: e.target.value,
                      }))
                    }
                    className="w-full h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                  />
                </div>
              </div>

              {/* SHIPPING, PACKAGING & RETURNS */}
              <div className="p-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-3">
                <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62]">
                  Shipping, Packaging &amp; Return Terms
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                      Delivery Window
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2–4 Business Days"
                      value={productForm.deliveryTimeline}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          deliveryTimeline: e.target.value,
                        }))
                      }
                      className="w-full h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                      Packaging Spec
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cotton Garment Box"
                      value={productForm.packagingType}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          packagingType: e.target.value,
                        }))
                      }
                      className="w-full h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                      Return Policy
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 14-Day Free Exchanges"
                      value={productForm.returnPolicy}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          returnPolicy: e.target.value,
                        }))
                      }
                      className="w-full h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isFreeShipping}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          isFreeShipping: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-[#141413] dark:accent-[#F3F1EC]"
                    />
                    <span className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
                      Qualifies for Free Shipping
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-[#66625B]">
                      Custom Fee Override (₦):
                    </span>
                    <input
                      type="number"
                      placeholder="Default"
                      disabled={productForm.isFreeShipping}
                      value={productForm.shippingFee}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          shippingFee: e.target.value,
                        }))
                      }
                      className="w-24 h-8 px-2 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-xs outline-none disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>

              {/* HERO SHOWCASE PINNING SECTION */}
              <div className="p-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62]">
                    Storefront Hero Carousel Pinning
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.isPinnedHero}
                      onChange={(e) =>
                        setProductForm((p) => ({
                          ...p,
                          isPinnedHero: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-[#966830]"
                    />
                    <span className="text-xs font-medium text-[#966830] dark:text-[#C89B62]">
                      Pin to Hero Carousel
                    </span>
                  </label>
                </div>

                {productForm.isPinnedHero && (
                  <div className="space-y-2.5 pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                          Look Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Look 01"
                          value={productForm.heroLookNumber}
                          onChange={(e) =>
                            setProductForm((p) => ({
                              ...p,
                              heroLookNumber: e.target.value,
                            }))
                          }
                          className="w-full h-8 px-2.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                          Hero Headline (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Defaults to garment name"
                          value={productForm.heroHeadline}
                          onChange={(e) =>
                            setProductForm((p) => ({
                              ...p,
                              heroHeadline: e.target.value,
                            }))
                          }
                          className="w-full h-8 px-2.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                          Slide Priority Order
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={productForm.heroOrder}
                          onChange={(e) =>
                            setProductForm((p) => ({
                              ...p,
                              heroOrder: e.target.value,
                            }))
                          }
                          className="w-full h-8 px-2.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono outline-none text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1">
                        Hero Banner Image (URL or Upload)
                      </label>
                      <input
                        ref={heroFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleHeroImageFile}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Leave blank to use main product photo"
                          value={productForm.heroImage}
                          onChange={(e) =>
                            setProductForm((p) => ({
                              ...p,
                              heroImage: e.target.value,
                            }))
                          }
                          className="flex-1 h-8 px-2.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => heroFileInputRef.current?.click()}
                          className="h-8 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase cursor-pointer"
                        >
                          Upload Banner
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="h-10 px-4 border border-[#E6E2DA] dark:border-[#2C2A26] text-[11px] font-medium uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                >
                  Save Garment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER INVOICE INSPECTION MODAL */}
      {inspectedOrder && (
        <div
          onClick={() => setInspectedOrder(null)}
          className="fixed inset-0 z-[80] bg-black/75 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] max-w-lg w-full p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#966830] block">
                  Official Order Dossier
                </span>
                <h3 className="font-display text-2xl font-medium">
                  Order #{inspectedOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="p-1 text-[#66625B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                <span className="text-[#66625B]">Client Reference</span>
                <span className="font-mono">
                  {inspectedOrder.userId || "Guest Client"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                <span className="text-[#66625B]">Dispatch Stage</span>
                <span className="font-mono font-semibold text-[#966830]">
                  {inspectedOrder.status}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                {inspectedOrder.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 py-2 border-b border-[#E6E2DA] dark:border-[#2C2A26]"
                  >
                    <div>
                      <p className="font-medium">{item.product?.name}</p>
                      <p className="font-mono text-[10px] text-[#66625B]">
                        Qty {item.quantity} · Size {item.size} · {item.color}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums">
                      {formatNaira((item.product?.price || 0) * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-baseline pt-3 text-sm font-semibold">
                <span>Total Paid</span>
                <span className="font-mono text-base tabular-nums">
                  {formatNaira(inspectedOrder.total)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
              <button
                type="button"
                onClick={() =>
                  downloadOrderInvoice(inspectedOrder, {
                    email: inspectedOrder.userId || "client@btnx.store",
                  })
                }
                className="h-9 px-4 border border-[#E6E2DA] dark:border-[#2C2A26] text-[11px] font-medium uppercase inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download HTML Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="h-9 px-5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox for Support Images */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[95] bg-black/85 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-3 max-w-3xl w-full"
          >
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
              <span className="font-mono text-xs uppercase text-[#66625B]">
                Client Image Attachment
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Inspection"
              className="w-full max-h-[75vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
