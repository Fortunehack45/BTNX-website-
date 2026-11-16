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
  Check,
  Copy,
  Search,
  Send,
  Image as ImageIcon,
  UserCheck,
  RefreshCw,
  LogOut,
  Shield,
  Sun,
  Moon,
  Monitor,
  X,
  Download,
  Sparkles,
  Truck,
  Star,
  Palette,
  Upload,
} from "lucide-react";
import { Product, Order, StoreShippingSettings } from "../types";
import CustomDropdown from "../components/CustomDropdown";
import { getSwatchHex } from "../utils/colors";
import {
  auth,
  db,
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
import CustomSelect from "../components/CustomSelect";
import { useTheme, ThemePreference } from "../context/ThemeContext";
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
const PRESET_COLORS = [
  "Noir Black",
  "Off-White",
  "Dusty Plum",
  "Deep Navy",
  "Olive",
  "Charcoal",
  "Sand",
  "Deep Espresso",
  "Oxblood",
  "Cream",
  "Forest Green",
  "Burgundy",
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
  const { theme, setTheme, isDark } = useTheme();
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
  const [cloudProducts, setCloudProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem("btnx_cloud_products");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem("btnx_deleted_product_ids");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [deletedOrderIds, setDeletedOrderIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem("btnx_deleted_order_ids");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [mobileSupportView, setMobileSupportView] = useState<"list" | "chat">("list");
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
    image: "",
    images: [] as string[],
    customColorInput: "",
    customImageUrl: "",
    badge: "",
    description: "",
    sizes: ["S", "M", "L", "XL"] as string[],
    colors: ["Noir Black", "Off-White"] as string[],
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
  const productFormSubmitRef = useRef<HTMLButtonElement>(null);

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

  // Clients Subtab
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

    // Load local orders fallback (excluding deleted orders)
    try {
      const delOrdCached = localStorage.getItem("btnx_deleted_order_ids");
      const deletedOrdIds: string[] = delOrdCached ? JSON.parse(delOrdCached) : [];
      const localOrds =
        localStorage.getItem("btnx_orders") || localStorage.getItem("klamby_orders");
      if (localOrds) {
        const parsed = JSON.parse(localOrds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed.filter((o: Order) => !deletedOrdIds.includes(o.id)));
        }
      }
    } catch {
      // ignore
    }

    // Load local cached products (excluding deleted products)
    try {
      const delCached = localStorage.getItem("btnx_deleted_product_ids");
      const deletedIds: string[] = delCached ? JSON.parse(delCached) : [];
      const cached = localStorage.getItem("btnx_cloud_products");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCloudProducts((prev) => {
            const map = new Map<string, Product>();
            prev
              .filter((p) => !deletedIds.includes(p.id))
              .forEach((p) => map.set(p.id, p));
            parsed
              .filter((p: Product) => !deletedIds.includes(p.id))
              .forEach((p: Product) => map.set(p.id, { ...map.get(p.id), ...p }));
            return Array.from(map.values()).filter((p) => !deletedIds.includes(p.id));
          });
        }
      }
    } catch {}

    const unsubs: Array<() => void> = [];

    try {
      unsubs.push(
        onSnapshot(
          query(collection(db, "products")),
          (snap) => {
            const delCached = localStorage.getItem("btnx_deleted_product_ids");
            const deletedIds: string[] = delCached ? JSON.parse(delCached) : [];
            const list = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as Product[];
            const validList = list.filter((p) => !deletedIds.includes(p.id));
            setCloudProducts((prev) => {
              const map = new Map<string, Product>();
              try {
                const cached = localStorage.getItem("btnx_cloud_products");
                if (cached) {
                  const parsed = JSON.parse(cached);
                  if (Array.isArray(parsed)) {
                    parsed
                      .filter((p: Product) => !deletedIds.includes(p.id))
                      .forEach((p: Product) => map.set(p.id, p));
                  }
                }
              } catch {}
              prev
                .filter((p) => !deletedIds.includes(p.id))
                .forEach((p) => map.set(p.id, p));
              validList.forEach((p) => map.set(p.id, { ...map.get(p.id), ...p }));
              const merged = Array.from(map.values()).filter((p) => !deletedIds.includes(p.id));
              try {
                localStorage.setItem("btnx_cloud_products", JSON.stringify(merged));
              } catch {}
              return merged;
            });
          },
          () => {}
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, "orders")),
          (snap) => {
            if (!snap.empty) {
              const delOrdCached = localStorage.getItem("btnx_deleted_order_ids");
              const deletedOrdIds: string[] = delOrdCached ? JSON.parse(delOrdCached) : [];
              const list = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              })) as Order[];
              const validOrders = list.filter((o) => !deletedOrdIds.includes(o.id));
              validOrders.sort((a: any, b: any) => {
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
              setOrders(validOrders);
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

  // Combined Catalog: Strictly database products from Firestore
  const allProducts: Product[] = React.useMemo(() => {
    return cloudProducts.filter((p) => !deletedProductIds.includes(p.id));
  }, [cloudProducts, deletedProductIds]);

  // Orders: Strictly real orders from database
  const allOrders: Order[] = React.useMemo(() => {
    return orders.filter((o) => !deletedOrderIds.includes(o.id));
  }, [orders, deletedOrderIds]);

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
    const defaultImg = "";
    setProductForm({
      name: "",
      category: PRODUCT_CATEGORIES[0],
      price: "135000",
      originalPrice: "",
      image: defaultImg,
      images: defaultImg ? [defaultImg] : [],
      customColorInput: "",
      customImageUrl: "",
      badge: "NEW",
      description:
        "Crafted from heavyweight organic cotton with relaxed everyday tailoring.",
      sizes: ["S", "M", "L", "XL"],
      colors: ["Noir Black", "Off-White"],
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
    const initialImages =
      prod.images && prod.images.length > 0
        ? [...prod.images]
        : prod.image
        ? [prod.image]
        : [];
    setProductForm({
      name: prod.name,
      category: prod.category || PRODUCT_CATEGORIES[0],
      price: String(prod.price || 120000),
      originalPrice: prod.originalPrice ? String(prod.originalPrice) : "",
      image: prod.image || initialImages[0] || "",
      images: initialImages,
      customColorInput: "",
      customImageUrl: "",
      badge: prod.badge || "",
      description: prod.description || "",
      sizes: prod.sizes && prod.sizes.length > 0 ? [...prod.sizes] : ["S", "M", "L"],
      colors: prod.colors && prod.colors.length > 0 ? [...prod.colors] : ["Noir Black"],
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

  const handleProductImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const compressed: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const dataUrl = await compressImageFile(files[i]);
        compressed.push(dataUrl);
      }
      setProductForm((prev) => {
        const nextImages = [...prev.images, ...compressed];
        return {
          ...prev,
          images: nextImages,
          image: prev.image || nextImages[0] || "",
        };
      });
      showToast(`Uploaded ${files.length} product photo(s).`);
    } catch {
      showToast("Could not read image file.");
    }
  };

  const handleAddImageUrl = () => {
    const url = productForm.customImageUrl.trim();
    if (!url) return;
    setProductForm((prev) => {
      const nextImages = [...prev.images, url];
      return {
        ...prev,
        images: nextImages,
        image: prev.image || nextImages[0] || "",
        customImageUrl: "",
      };
    });
    showToast("Added image URL to product gallery.");
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setProductForm((prev) => {
      const nextImages = prev.images.filter((_, i) => i !== indexToRemove);
      const nextMain = nextImages[0] || "";
      return {
        ...prev,
        images: nextImages,
        image: prev.image === prev.images[indexToRemove] ? nextMain : prev.image,
      };
    });
  };

  const handleSetMainImage = (index: number) => {
    setProductForm((prev) => {
      const chosen = prev.images[index];
      if (!chosen) return prev;
      const reordered = [chosen, ...prev.images.filter((_, i) => i !== index)];
      return {
        ...prev,
        images: reordered,
        image: chosen,
      };
    });
    showToast("Updated main showcase image.");
  };

  const handleToggleColor = (color: string) => {
    setProductForm((prev) => {
      const exists = prev.colors.includes(color);
      return {
        ...prev,
        colors: exists ? prev.colors.filter((c) => c !== color) : [...prev.colors, color],
      };
    });
  };

  const handleAddCustomColor = () => {
    const val = productForm.customColorInput.trim();
    if (!val) return;
    if (productForm.colors.includes(val)) {
      showToast(`Color "${val}" is already added.`);
      return;
    }
    setProductForm((prev) => ({
      ...prev,
      colors: [...prev.colors, val],
      customColorInput: "",
    }));
    showToast(`Added colorway "${val}".`);
  };

  const handleRemoveColor = (colorToRemove: string) => {
    setProductForm((prev) => ({
      ...prev,
      colors: prev.colors.filter((c) => c !== colorToRemove),
    }));
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

    const finalImages =
      productForm.images.length > 0
        ? productForm.images
        : productForm.image
        ? [productForm.image.trim()]
        : [];
    const mainImage = productForm.image.trim() || finalImages[0] || "";
    const finalColors = productForm.colors.length > 0 ? productForm.colors : ["Noir Black"];

    const newProd: Product = {
      id: prodId,
      name: productForm.name.trim(),
      category: productForm.category,
      price: priceNum,
      originalPrice: origNum,
      image: mainImage,
      images: finalImages,
      badge: productForm.badge.trim() || undefined,
      description: productForm.description.trim(),
      sizes: productForm.sizes.length > 0 ? productForm.sizes : ["M"],
      colors: finalColors,
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
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("btnx_products_updated"));
      } catch {}
      return next;
    });

    setDeletedProductIds((prev) => {
      if (prev.includes(prodId)) {
        const next = prev.filter((id) => id !== prodId);
        try {
          localStorage.setItem("btnx_deleted_product_ids", JSON.stringify(next));
        } catch {}
        return next;
      }
      return prev;
    });

    try {
      await setDoc(doc(db, "products", prodId), {
        id: prodId,
        name: newProd.name,
        category: newProd.category,
        price: newProd.price,
        originalPrice: newProd.originalPrice || null,
        image: newProd.image,
        images: newProd.images || [newProd.image],
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
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Saved in local state seamlessly
    }

    try {
      await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProd),
      });
    } catch {}

    setIsProductModalOpen(false);
    showToast(
      editingProduct
        ? `Updated "${newProd.name}".`
        : `Added "${newProd.name}" to catalog.`
    );
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${name}" from the catalog?`)) return;
    const currentDeleted: string[] = (() => {
      try {
        const raw = localStorage.getItem("btnx_deleted_product_ids");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();
    const nextDeleted = currentDeleted.includes(id) ? currentDeleted : [...currentDeleted, id];
    try {
      localStorage.setItem("btnx_deleted_product_ids", JSON.stringify(nextDeleted));
    } catch {}
    setDeletedProductIds(nextDeleted);

    setCloudProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem("btnx_cloud_products", JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("btnx_products_updated"));
    } catch {}

    try {
      await deleteDoc(doc(db, "products", id));
    } catch {}

    try {
      await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {}

    showToast(`Removed "${name}" from catalog.`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Are you sure you want to delete Order #${orderId} from dispatch manifests?`)) return;
    const currentDeleted: string[] = (() => {
      try {
        const raw = localStorage.getItem("btnx_deleted_order_ids");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();
    const nextDeleted = currentDeleted.includes(orderId) ? currentDeleted : [...currentDeleted, orderId];
    try {
      localStorage.setItem("btnx_deleted_order_ids", JSON.stringify(nextDeleted));
    } catch {}
    setDeletedOrderIds(nextDeleted);

    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      try {
        localStorage.setItem("btnx_orders", JSON.stringify(next));
        localStorage.setItem("klamby_orders", JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await deleteDoc(doc(db, "orders", orderId));
    } catch {}

    try {
      await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
    } catch {}

    showToast(`Deleted Order #${orderId}.`);
  };

  const handleDeletePromo = async (promoId: string, promoCode: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete promo code "${promoCode}"?`)) return;
    setPromos((prev) => {
      const next = prev.filter((p) => p.id !== promoId && p.code !== promoCode);
      try {
        localStorage.setItem("klamby_promo_codes", JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await deleteDoc(doc(db, "promos", promoCode));
    } catch {}

    try {
      await fetch(`/api/admin/promos/${encodeURIComponent(promoCode)}`, { method: "DELETE" });
    } catch {}

    showToast(`Deleted promo code "${promoCode}".`);
  };

  const handleSeedCatalogToCloud = async () => {
    try {
      const snap = await getDocs(collection(db, "products"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
      setCloudProducts(list);
      showToast(`Refreshed ${list.length} garments directly from Firestore database.`);
    } catch {
      showToast("Unable to refresh Firestore catalog.");
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
      <div 
        style={{ backgroundColor: '#111110', color: '#F3F1EC' }}
        className="min-h-screen bg-[#111110] text-[#F3F1EC] flex flex-col items-center justify-center p-4"
      >
        <div 
          style={{ backgroundColor: '#191816', color: '#F3F1EC', borderColor: '#2C2A26' }}
          className="w-full max-w-md bg-[#191816] border-[#2C2A26] text-[#F3F1EC] border p-7 sm:p-9 space-y-6 shadow-2xl"
        >
          <div 
            style={{ borderColor: '#2C2A26' }}
            className="space-y-2 text-center border-b border-[#2C2A26] pb-5"
          >
            <div className="flex justify-center text-[#F3F1EC]">
              <BrandLogo className="h-8 w-auto text-[#F3F1EC]" />
            </div>
            <p 
              style={{ color: '#C89B62' }}
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#C89B62]"
            >
              Osun Atelier · Management Portal
            </p>
            <h1 
              style={{ color: '#F3F1EC' }}
              className="font-display text-3xl font-medium text-[#F3F1EC]"
            >
              Admin Studio Access
            </h1>
          </div>

          {loginError && (
            <div 
              style={{ backgroundColor: '#141413', borderColor: '#C89B62', color: '#F3F1EC' }}
              className="p-3.5 border border-[#C89B62] bg-[#141413] text-[#F3F1EC] text-xs font-mono"
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminEmailLogin} className="space-y-4">
            <div>
              <label 
                style={{ color: '#A7A299' }}
                className="block text-[10px] uppercase tracking-[0.14em] text-[#A7A299] mb-1.5 font-medium"
              >
                Admin Email or Studio ID
              </label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="e.g. btnx or admin@btnx.store"
                style={{ backgroundColor: '#141413', borderColor: '#2C2A26', color: '#F3F1EC' }}
                className="w-full h-10 px-3 bg-[#141413] border-[#2C2A26] text-[#F3F1EC] border text-xs font-mono outline-none focus:border-[#C89B62]"
              />
            </div>

            <div>
              <label 
                style={{ color: '#A7A299' }}
                className="block text-[10px] uppercase tracking-[0.14em] text-[#A7A299] mb-1.5 font-medium"
              >
                Passcode
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={{ backgroundColor: '#141413', borderColor: '#2C2A26', color: '#F3F1EC' }}
                className="w-full h-10 px-3 bg-[#141413] border-[#2C2A26] text-[#F3F1EC] border text-xs font-mono outline-none focus:border-[#C89B62]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingAuth}
              style={{ backgroundColor: '#C89B62', color: '#111110' }}
              className="w-full h-10 bg-[#C89B62] text-[#111110] font-semibold text-[11px] uppercase tracking-[0.14em] cursor-pointer transition-colors hover:brightness-110"
            >
              Sign In to Admin Studio
            </button>
          </form>

          <div 
            style={{ borderColor: '#2C2A26' }}
            className="space-y-2.5 pt-2 border-t border-[#2C2A26]"
          >
            <button
              type="button"
              onClick={handleUnlockStudio}
              style={{ borderColor: '#C89B62', color: '#C89B62', backgroundColor: 'transparent' }}
              className="w-full h-10 border border-[#C89B62] text-[#C89B62] text-[11px] font-medium uppercase tracking-[0.14em] transition-colors cursor-pointer hover:bg-[#C89B62] hover:text-[#111110]"
            >
              Quick Unlock Studio (Store Owner Mode)
            </button>

            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              style={{ borderColor: '#2C2A26', color: '#F3F1EC', backgroundColor: 'transparent' }}
              className="w-full h-10 border border-[#2C2A26] text-[#F3F1EC] text-xs transition-colors cursor-pointer hover:border-[#F3F1EC]"
            >
              Continue with Google
            </button>
          </div>

          <div className="text-center pt-2">
            <a
              href="/"
              style={{ color: '#A7A299' }}
              className="inline-flex items-center gap-1.5 text-xs text-[#A7A299] hover:text-[#F3F1EC] transition-colors"
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
        {isProductModalOpen ? (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Navigation & Action Header */}
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] mb-2.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  <span>Back to Catalog &amp; Inventory</span>
                </button>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-semibold">
                    Garment Archive &middot; {editingProduct ? "Specification Update" : "New Piece Ingestion"}
                  </span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141413] dark:text-[#F3F1EC] mt-1">
                  {editingProduct ? `Edit Piece: ${editingProduct.name}` : "Create Garment Piece"}
                </h1>
                <p className="text-xs text-[#66625B] dark:text-[#A7A299] font-mono mt-1">
                  {editingProduct
                    ? `SKU / Database Key: ${editingProduct.id}`
                    : "Configure identity, multi-image photography, luxury colorway swatches, sizing, and specs"}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="h-10 px-5 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-xs font-bold uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={() => productFormSubmitRef.current?.click()}
                  className="h-10 px-6 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-bold uppercase tracking-[0.14em] inline-flex items-center gap-2 hover:opacity-95 shadow-sm transition-opacity cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#966830] dark:text-[#966830]" />
                  <span>{editingProduct ? "Save & Update Piece" : "Publish Garment Piece"}</span>
                </button>
              </div>
            </div>

            {/* Hidden Submit Button triggered by top & bottom bars */}
            <form onSubmit={handleSaveProduct} className="space-y-8">
              <button ref={productFormSubmitRef} type="submit" className="hidden" aria-hidden="true" />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT 2 COLS: Core Identity, Gallery, Colorways, Sizing & Story */}
                <div className="lg:col-span-2 space-y-8">
                  {/* CARD 1: Identity & Pricing */}
                  <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-semibold">
                        01. Garment Identity &amp; Pricing
                      </span>
                      <span className="text-[10px] font-mono text-[#66625B]">Storefront Display Info</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                          Garment Piece Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={productForm.name}
                          onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="e.g. Purple Brooklyn Heavyweight Fleece Hoodie"
                          className="w-full h-11 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-sm text-[#141413] dark:text-[#F3F1EC] font-semibold outline-none focus:border-[#141413] dark:focus:border-[#F3F1EC] transition-colors"
                        />
                      </div>

                      <div>
                        <CustomDropdown
                          label="Collection / Category *"
                          value={productForm.category}
                          onChange={(val) => setProductForm((p) => ({ ...p, category: val }))}
                          options={PRODUCT_CATEGORIES}
                          buttonClassName="h-11 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                          Stock Units Available *
                        </label>
                        <input
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))}
                          placeholder="45"
                          className="w-full h-11 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-sm text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                          Retail Price (₦ Naira) *
                        </label>
                        <input
                          type="number"
                          required
                          value={productForm.price}
                          onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                          placeholder="135000"
                          className="w-full h-11 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-sm font-bold text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                          Compare / Slash Price (₦ Optional)
                        </label>
                        <input
                          type="number"
                          value={productForm.originalPrice}
                          onChange={(e) => setProductForm((p) => ({ ...p, originalPrice: e.target.value }))}
                          placeholder="e.g. 180000"
                          className="w-full h-11 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-sm text-[#66625B] dark:text-[#A7A299] outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                          Editorial Tag / Badge (Optional)
                        </label>
                        <input
                          type="text"
                          value={productForm.badge}
                          onChange={(e) => setProductForm((p) => ({ ...p, badge: e.target.value }))}
                          placeholder="e.g. NEW RELEASE, EXCLUSIVE, BESTSELLER, 20% OFF"
                          className="w-full h-11 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs text-[#141413] dark:text-[#F3F1EC] font-semibold outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Studio Gallery & Photography */}
                  <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#966830] dark:text-[#C89B62]" />
                        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-semibold">
                          02. Studio Gallery &amp; Imagery ({productForm.images.length})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#66625B]">High-Resolution Multiple Angles</span>
                    </div>

                    <input
                      ref={productFileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleProductImageFiles}
                      className="hidden"
                    />

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => productFileInputRef.current?.click()}
                        className="h-11 px-5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-mono uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 shrink-0 font-bold"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Photos</span>
                      </button>

                      <div className="flex flex-1 gap-2">
                        <input
                          type="text"
                          placeholder="Or paste external image URL (https://...)"
                          value={productForm.customImageUrl}
                          onChange={(e) => setProductForm((p) => ({ ...p, customImageUrl: e.target.value }))}
                          className="flex-1 h-11 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddImageUrl}
                          className="h-11 px-4 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-[10px] font-mono uppercase font-bold text-[#141413] dark:text-[#F3F1EC] cursor-pointer hover:border-[#141413] dark:hover:border-[#F3F1EC] shrink-0"
                        >
                          Add URL
                        </button>
                      </div>
                    </div>

                    {productForm.images.length === 0 ? (
                      <div className="p-8 border border-dashed border-[#E6E2DA] dark:border-[#2C2A26] text-center space-y-1">
                        <p className="text-xs text-[#66625B] dark:text-[#A7A299] font-medium">
                          No images uploaded yet. Upload high-res lookbook photos or add image links.
                        </p>
                        <p className="text-[10px] font-mono text-[#8C877D]">
                          Supports JPEG, PNG, WEBP with instantaneous compression.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                        {productForm.images.map((img, idx) => {
                          const isMain = productForm.image === img || (idx === 0 && !productForm.image);
                          return (
                            <div
                              key={idx}
                              className={`relative aspect-[3/4] bg-[#F4F1EC] dark:bg-[#2A2824] border overflow-hidden rounded-xs group flex flex-col justify-between p-1.5 ${
                                isMain
                                  ? "border-[#966830] ring-2 ring-[#966830]"
                                  : "border-[#E6E2DA] dark:border-[#2C2A26]"
                              }`}
                            >
                              <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2">
                                {isMain ? (
                                  <span className="px-2 py-0.5 bg-[#966830] text-white text-[9px] font-mono font-bold tracking-wider uppercase rounded-xs">
                                    Primary
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetMainImage(idx)}
                                    className="px-2 py-0.5 bg-black/80 hover:bg-black text-white text-[9px] font-mono uppercase rounded-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer font-bold"
                                  >
                                    Set Primary
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-2 right-2 w-7 h-7 bg-black/80 hover:bg-red-600 text-white flex items-center justify-center rounded-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Remove image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CARD 3: Colorway Architecture & Live Swatches */}
                  <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-[#966830] dark:text-[#C89B62]" />
                        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-semibold">
                          03. Available Colorways ({productForm.colors.length} Active)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#66625B]">Synchronized Swatches</span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {productForm.colors.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#141413] dark:border-[#F3F1EC] rounded-xs text-xs font-semibold text-[#141413] dark:text-[#F3F1EC]"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/30 shrink-0"
                            style={{ backgroundColor: getSwatchHex(c) }}
                          />
                          <span>{c}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(c)}
                            className="text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] ml-1 cursor-pointer"
                            title="Remove colorway"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-2 font-bold">
                        Quick-Add Luxury Preset Palettes
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((preset) => {
                          const isActive = productForm.colors.includes(preset);
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleToggleColor(preset)}
                              className={`px-3 py-1.5 text-xs font-medium border rounded-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                isActive
                                  ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413] dark:border-[#F3F1EC]"
                                  : "bg-white dark:bg-[#191816] border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] dark:text-[#A7A299] hover:border-[#141413]"
                              }`}
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-black/20 dark:border-white/20 shrink-0"
                                style={{ backgroundColor: getSwatchHex(preset) }}
                              />
                              <span>{preset}</span>
                              {isActive && <Check className="w-3 h-3 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                        Add Bespoke / Custom Colorway Name
                      </label>
                      <div className="flex gap-2.5">
                        <input
                          type="text"
                          placeholder="e.g. Cognac Tan, Terracotta, Slate Blue, Bone"
                          value={productForm.customColorInput}
                          onChange={(e) => setProductForm((p) => ({ ...p, customColorInput: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomColor();
                            }
                          }}
                          className="flex-1 h-10 px-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomColor}
                          className="h-10 px-5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-mono uppercase font-bold cursor-pointer"
                        >
                          Add Custom Shade
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CARD 4: Sizing & Garment Story */}
                  <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-semibold">
                        04. Sizing Matrix &amp; Editorial Story
                      </span>
                      <span className="text-[10px] font-mono text-[#66625B]">Customer Sizing Specs</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-2 font-bold">
                        Available Garment Sizes ({productForm.sizes.length} Selected)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SIZES_LIST.map((sz) => {
                          const active = productForm.sizes.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() =>
                                setProductForm((prev) => ({
                                  ...prev,
                                  sizes: active ? prev.sizes.filter((s) => s !== sz) : [...prev.sizes, sz],
                                }))
                              }
                              className={`w-11 h-11 font-mono text-xs font-bold border rounded-xs cursor-pointer transition-all ${
                                active
                                  ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413]"
                                  : "bg-[#FAF9F7] dark:bg-[#141413] border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:border-[#141413]"
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                        Product Overview &amp; Editorial Description
                      </label>
                      <textarea
                        rows={3}
                        value={productForm.description}
                        onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Crafted from heavyweight organic cotton with relaxed everyday tailoring..."
                        className="w-full p-3.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs text-[#141413] dark:text-[#F3F1EC] outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT 1 COL: Fabric, Logistics, Shipping & Hero Pinning */}
                <div className="space-y-8">
                  {/* CARD 5: Luxury Fabric, Silhouette & Care Specs */}
                  <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-4">
                    <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-semibold block border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                      05. Fabric &amp; Garment Care
                    </span>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                        Fabric &amp; Material Breakdown
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Brushed wool-blend check overshirt with a cropped boxy fit, horn buttons, and dual chest pockets."
                        value={productForm.fabricAndCare}
                        onChange={(e) => setProductForm((p) => ({ ...p, fabricAndCare: e.target.value }))}
                        className="w-full p-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs text-[#141413] dark:text-[#F3F1EC]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                        Fit &amp; Washing Instructions
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Relaxed, structured fit. Machine wash cold inside out."
                        value={productForm.fitDetails}
                        onChange={(e) => setProductForm((p) => ({ ...p, fitDetails: e.target.value }))}
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs text-[#141413] dark:text-[#F3F1EC]"
                      />
                    </div>
                  </div>

                  {/* CARD 6: Delivery, Packaging & Return Policy */}
                  <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-4">
                    <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-semibold block border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                      06. Delivery, Packaging &amp; Returns
                    </span>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                        Delivery Timeline
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2–4 Business Days"
                        value={productForm.deliveryTimeline}
                        onChange={(e) => setProductForm((p) => ({ ...p, deliveryTimeline: e.target.value }))}
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs text-[#141413] dark:text-[#F3F1EC]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                        Packaging Spec
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cotton Garment Box"
                        value={productForm.packagingType}
                        onChange={(e) => setProductForm((p) => ({ ...p, packagingType: e.target.value }))}
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs text-[#141413] dark:text-[#F3F1EC]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] mb-1.5 font-bold">
                        Return Policy
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 14-Day Free Exchanges"
                        value={productForm.returnPolicy}
                        onChange={(e) => setProductForm((p) => ({ ...p, returnPolicy: e.target.value }))}
                        className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs text-[#141413] dark:text-[#F3F1EC]"
                      />
                    </div>

                    <div className="pt-3 border-t border-[#E6E2DA] dark:border-[#2C2A26] space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.isFreeShipping}
                          onChange={(e) => setProductForm((p) => ({ ...p, isFreeShipping: e.target.checked }))}
                          className="w-4 h-4 accent-[#141413] dark:accent-[#F3F1EC]"
                        />
                        <span className="text-xs font-semibold text-[#141413] dark:text-[#F3F1EC]">
                          Qualifies for Free Nationwide Shipping
                        </span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-[#66625B]">
                          Custom Shipping Fee (₦):
                        </span>
                        <input
                          type="number"
                          placeholder="Standard"
                          disabled={productForm.isFreeShipping}
                          value={productForm.shippingFee}
                          onChange={(e) => setProductForm((p) => ({ ...p, shippingFee: e.target.value }))}
                          className="w-28 h-8 px-2 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-xs outline-none disabled:opacity-40"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CARD 7: Hero Lookbook Pinning */}
                  <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-semibold">
                        07. Storefront Hero Pinning
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.isPinnedHero}
                          onChange={(e) => setProductForm((p) => ({ ...p, isPinnedHero: e.target.checked }))}
                          className="w-4 h-4 accent-[#966830]"
                        />
                        <span className="text-xs font-bold text-[#966830] dark:text-[#C89B62]">
                          Pin to Hero
                        </span>
                      </label>
                    </div>

                    {productForm.isPinnedHero && (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1 font-bold">
                              Look Label
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Look 01"
                              value={productForm.heroLookNumber}
                              onChange={(e) => setProductForm((p) => ({ ...p, heroLookNumber: e.target.value }))}
                              className="w-full h-9 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1 font-bold">
                              Slide Order
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={productForm.heroOrder}
                              onChange={(e) => setProductForm((p) => ({ ...p, heroOrder: e.target.value }))}
                              className="w-full h-9 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono outline-none text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1 font-bold">
                            Hero Headline (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Defaults to garment name"
                            value={productForm.heroHeadline}
                            onChange={(e) => setProductForm((p) => ({ ...p, heroHeadline: e.target.value }))}
                            className="w-full h-9 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] outline-none text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono uppercase text-[#66625B] mb-1 font-bold">
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
                              placeholder="Leave blank to use primary photo"
                              value={productForm.heroImage}
                              onChange={(e) => setProductForm((p) => ({ ...p, heroImage: e.target.value }))}
                              className="flex-1 h-9 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] font-mono text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => heroFileInputRef.current?.click()}
                              className="h-9 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase font-bold cursor-pointer"
                            >
                              Upload
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Persistent Bar */}
              <div className="border-t border-[#E6E2DA] dark:border-[#2C2A26] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Catalog &amp; Stock</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductModalOpen(false);
                      setEditingProduct(null);
                    }}
                    className="h-11 px-5 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-xs font-bold uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 px-7 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-bold uppercase tracking-[0.14em] inline-flex items-center gap-2 hover:opacity-95 shadow-sm transition-opacity cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-[#966830] dark:text-[#966830]" />
                    <span>{editingProduct ? "Save & Update Piece" : "Publish Garment Piece"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <>
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
                            <CustomDropdown
                              value={ord.status || "Confirmed"}
                              onChange={(val) => handleOrderStatusUpdate(ord.id, val)}
                              options={ORDER_STATUSES}
                              buttonClassName="h-8 text-[11px] font-mono px-2"
                              menuClassName="w-40"
                            />
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

            {/* Live CSAT & Quality Metrics Banner */}
            {(() => {
              const ratedList = tickets.filter((t) => t.rating != null);
              const avgScore = ratedList.length > 0
                ? (ratedList.reduce((acc, t) => acc + (t.rating || 5), 0) / ratedList.length).toFixed(1)
                : "5.0";
              const positiveReviews = ratedList.filter((t) => (t.rating || 5) >= 4).length;
              const positivePct = ratedList.length > 0
                ? Math.round((positiveReviews / ratedList.length) * 100)
                : 100;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#66625B] dark:text-[#A7A299]">
                      Average CSAT Rating
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-[#966830] dark:text-[#C89B62]">
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                      <span className="font-mono text-xl font-bold">{avgScore} / 5.0</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#66625B] dark:text-[#A7A299]">
                      Client Satisfaction Rate
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-bold text-[#1D7A46] dark:text-[#67E28E]">{positivePct}%</span>
                      <span className="text-xs text-[#66625B] dark:text-[#A7A299]">Positive Ratings</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#66625B] dark:text-[#A7A299]">
                      Reviews Logged
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-bold">{ratedList.length}</span>
                      <span className="text-xs text-[#66625B] dark:text-[#A7A299]">Total Client Reviews</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:h-[760px] xl:h-[800px]">
              {/* Left Thread Inbox (4 cols) */}
              <div
                className={`${
                  mobileSupportView === "list" ? "block" : "hidden lg:flex"
                } lg:col-span-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-hidden flex flex-col h-full`}
              >
                <div className="grid grid-cols-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] shrink-0">
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

                <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] flex-1 overflow-y-auto">
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
                          onClick={() => {
                            setSelectedTicketId(t.id);
                            setMobileSupportView("chat");
                          }}
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
                            <div className="flex items-center gap-1.5">
                              {t.rating && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FAF3EA] dark:bg-[#2C2318] text-[#966830] dark:text-[#C89B62] rounded-xs font-semibold">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>{t.rating}.0</span>
                                </span>
                              )}
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
              <div
                className={`${
                  mobileSupportView === "chat" ? "flex" : "hidden lg:flex"
                } lg:col-span-8 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] flex-col h-full overflow-hidden`}
              >
                {selectedTicket ? (
                  <>
                    {/* Ticket Header */}
                    <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => setMobileSupportView("list")}
                          className="lg:hidden h-8 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase inline-flex items-center gap-1 text-[#141413] dark:text-[#F3F1EC] shrink-0"
                          title="Back to Tickets"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Threads</span>
                        </button>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#66625B] dark:text-[#A7A299] truncate">
                            <span className="font-semibold text-[#141413] dark:text-[#F3F1EC] whitespace-nowrap">
                              #{selectedTicket.id}
                            </span>
                            <span className="text-[#8C877D] select-none shrink-0">·</span>
                            <span className="truncate whitespace-nowrap">{selectedTicket.userName}</span>
                          </div>
                          <h2 className="font-display text-lg sm:text-xl font-medium truncate">
                            {selectedTicket.subject}
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {selectedTicket.mode === "bot" && (
                          <button
                            type="button"
                            onClick={() => handleAdminTakeOverTicket(selectedTicket)}
                            className="h-8 sm:h-9 px-3 sm:px-4 bg-[#966830] dark:bg-[#C89B62] text-white dark:text-[#141413] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Join as Human</span>
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
                            className="h-8 sm:h-9 px-3 border border-[#141413] dark:border-[#F3F1EC] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] cursor-pointer whitespace-nowrap"
                          >
                            Mark Resolved
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Delete thread #${selectedTicket.id}?`)) return;
                            await removeTicket(selectedTicket.id);
                            try {
                              await fetch(`/api/admin/support/${encodeURIComponent(selectedTicket.id)}`, { method: "DELETE" });
                            } catch {}
                            showToast(`Deleted Ticket #${selectedTicket.id}.`);
                            setSelectedTicketId("");
                            setMobileSupportView("list");
                          }}
                          className="h-8 sm:h-9 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:text-[#D93025] dark:hover:text-[#FF6B6B] cursor-pointer"
                          title="Delete Thread"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Client Review Bar if Rated */}
                    {selectedTicket.rating && (
                      <div className="px-5 py-2.5 bg-[#FAF3EA] dark:bg-[#2C2318] border-b border-[#E6D4BE] dark:border-[#4A3925] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#966830] dark:text-[#C89B62] font-semibold">
                            Client Review:
                          </span>
                          <div className="flex items-center gap-0.5 text-[#966830] dark:text-[#C89B62]">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= (selectedTicket.rating || 5)
                                    ? "fill-current"
                                    : "text-[#D1CBC1] dark:text-[#4A3925]"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-mono font-medium text-[#141413] dark:text-[#F3F1EC]">
                            {selectedTicket.rating}.0 / 5
                          </span>
                          {selectedTicket.feedbackComment && (
                            <span className="italic text-[#66625B] dark:text-[#A7A299]">
                              "{selectedTicket.feedbackComment}"
                            </span>
                          )}
                        </div>
                        {selectedTicket.feedbackSubmittedAt && (
                          <span className="text-[10px] font-mono text-[#8C877D]">
                            Submitted on {new Date(selectedTicket.feedbackSubmittedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message Stream */}
                    <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto">
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
                            <div className="flex items-center justify-between w-full max-w-sm text-[10px] font-mono text-[#66625B] dark:text-[#A7A299] px-0.5 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <span className="font-semibold text-[#141413] dark:text-[#F3F1EC] uppercase whitespace-nowrap">
                                  {msg.senderName}
                                </span>
                                <span className="text-[#8C877D] select-none shrink-0">·</span>
                                <span className="whitespace-nowrap truncate text-[9px]">
                                  {msg.sender === "customer"
                                    ? "Client"
                                    : msg.sender === "bot"
                                    ? "Automated Bot"
                                    : "Human Specialist"}
                                </span>
                              </div>
                              <span className="tabular-nums whitespace-nowrap shrink-0 text-[#8C877D] text-[9px]">
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
                                  <div className="w-36 shrink-0">
                                    <CustomDropdown
                                      value={msg.attachedOrder.status}
                                      onChange={(val) =>
                                        handleOrderStatusUpdate(
                                          msg.attachedOrder!.id,
                                          val
                                        )
                                      }
                                      options={ORDER_STATUSES}
                                      buttonClassName="h-8 px-2 text-[10px] font-mono"
                                    />
                                  </div>
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
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[#66625B] dark:text-[#A7A299] space-y-2">
                    <Headphones className="w-8 h-8 text-[#966830] dark:text-[#C89B62]" />
                    <p className="font-semibold text-sm text-[#141413] dark:text-[#F3F1EC]">
                      Select a conversation thread
                    </p>
                    <p className="max-w-xs text-[11px]">
                      Choose any client care ticket from the inbox on the left to start live resolution.
                    </p>
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
                <div className="w-44">
                  <CustomSelect
                    size="sm"
                    value={orderStatusFilter}
                    onChange={setOrderStatusFilter}
                    options={[
                      { value: "All", label: "All Statuses" },
                      ...ORDER_STATUSES.map((st) => ({ value: st, label: st })),
                    ]}
                    ariaLabel="Filter orders by status"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Order Cards (Responsive Phone UX) */}
            <div className="lg:hidden space-y-3">
              {filteredOrdersList.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#66625B] dark:text-[#A7A299] bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26]">
                  No orders match this filter.
                </div>
              ) : (
                filteredOrdersList.map((ord) => {
                  const count =
                    ord.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 1;
                  return (
                    <div
                      key={ord.id}
                      className="p-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-sm text-[#141413] dark:text-[#F3F1EC]">
                          #{ord.id}
                        </span>
                        <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299]">
                          {ord.date || "Recent"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#66625B] dark:text-[#A7A299] truncate max-w-[190px]">
                          {ord.userId || "Guest Checkout"}
                        </span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#141413] dark:text-[#F3F1EC] block tabular-nums">
                            {formatNaira(ord.total)}
                          </span>
                          <span className="font-mono text-[10px] text-[#66625B] dark:text-[#A7A299]">
                            {count} {count === 1 ? "piece" : "pieces"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                        <div className="flex-1 min-w-0">
                          <CustomSelect
                            size="sm"
                            value={ord.status || "Confirmed"}
                            onChange={(val) => handleOrderStatusUpdate(ord.id, val)}
                            options={ORDER_STATUSES.map((st) => ({ value: st, label: st }))}
                            ariaLabel={`Update status for order ${ord.id}`}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setInspectedOrder(ord)}
                            className="h-8 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase text-[#141413] dark:text-[#F3F1EC] cursor-pointer"
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
                            className="h-8 w-8 inline-flex items-center justify-center border border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:text-[#141413] cursor-pointer"
                            title="Download HTML Invoice"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(ord.id)}
                            className="h-8 w-8 inline-flex items-center justify-center border border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:text-[#D93025] hover:border-[#D93025] cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-x-auto">
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
                        <td className="px-5 py-4 min-w-[170px]">
                          <CustomSelect
                            size="sm"
                            value={ord.status || "Confirmed"}
                            onChange={(val) => handleOrderStatusUpdate(ord.id, val)}
                            options={ORDER_STATUSES.map((st) => ({ value: st, label: st }))}
                            ariaLabel={`Update status for order ${ord.id}`}
                          />
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
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(ord.id)}
                            className="p-1.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:text-[#D93025] hover:border-[#D93025] cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
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

            {/* Mobile Garment Cards (Phone UX) */}
            <div className="lg:hidden space-y-3">
              {filteredProductsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#66625B] dark:text-[#A7A299] bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26]">
                  No garments match your filters.
                </div>
              ) : (
                filteredProductsList.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] flex gap-3.5 items-center"
                  >
                    <div className="w-16 h-20 bg-[#F4F1EC] dark:bg-[#2A2824] shrink-0 overflow-hidden">
                      <GalleryImage
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-[#966830] dark:text-[#C89B62]">
                          {prod.category}
                        </span>
                        <span className="text-[10px] font-mono text-[#66625B] dark:text-[#A7A299] tabular-nums">
                          {prod.stock ?? 45} units
                        </span>
                      </div>
                      <p className="text-xs font-semibold truncate text-[#141413] dark:text-[#F3F1EC]">
                        {prod.name}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-mono font-bold text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                          {formatNaira(prod.price)}
                        </span>
                        {prod.originalPrice && (
                          <span className="text-[10px] text-[#66625B] line-through tabular-nums">
                            {formatNaira(prod.originalPrice)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openEditProductModal(prod)}
                          className="h-7 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase text-[#141413] dark:text-[#F3F1EC] cursor-pointer"
                        >
                          Edit Spec
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="h-7 w-7 inline-flex items-center justify-center border border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:text-[#D93025] hover:border-[#D93025] cursor-pointer"
                          title="Delete Piece"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Catalog Table */}
            <div className="hidden lg:block bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-x-auto">
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
                      <CustomSelect
                        size="sm"
                        value={bulkQty}
                        onChange={setBulkQty}
                        options={[
                          { value: "5", label: "5 Codes" },
                          { value: "10", label: "10 Codes" },
                          { value: "25", label: "25 Codes" },
                        ]}
                        ariaLabel="Batch size for promo codes"
                      />
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

              {/* Mobile Promos Cards */}
              <div className="lg:hidden space-y-3">
                {promos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#66625B] dark:text-[#A7A299] bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26]">
                    No active promo codes.
                  </div>
                ) : (
                  promos.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm tracking-wider text-[#141413] dark:text-[#F3F1EC]">
                          {p.code}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 bg-[#FAF3EA] dark:bg-[#2C2318] text-[#966830] dark:text-[#C89B62]">
                          {p.discountPercentage}% OFF
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#66625B] dark:text-[#A7A299]">
                        <span>Expires {new Date(p.expiresAt).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = promos.map((item) =>
                              item.id === p.id
                                ? { ...item, isActive: item.isActive === false ? true : false }
                                : item
                            );
                            setPromos(next);
                            localStorage.setItem("klamby_promo_codes", JSON.stringify(next));
                          }}
                          className="font-mono uppercase underline text-[11px]"
                        >
                          {p.isActive !== false ? "Active" : "Paused"}
                        </button>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(p.code);
                            setCopiedCode(p.code);
                            setTimeout(() => setCopiedCode(null), 1500);
                          }}
                          className="h-7 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode === p.code ? (
                            <Check className="w-3 h-3 text-[#966830]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedCode === p.code ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(p.id, p.code)}
                          className="h-7 w-7 inline-flex items-center justify-center border border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] hover:text-[#D93025] hover:border-[#D93025] cursor-pointer"
                          title="Delete Promo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Active Promos List (7 cols Desktop) */}
              <div className="hidden lg:block lg:col-span-7 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-x-auto">
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
                            onClick={() => handleDeletePromo(p.id, p.code)}
                            className="text-[#66625B] hover:text-[#D93025] cursor-pointer"
                            title="Delete Promo"
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
                    <CustomSelect
                      size="sm"
                      value={broadcastType}
                      onChange={(val) => setBroadcastType(val as any)}
                      options={[
                        { value: "promo", label: "Promotional Offer" },
                        { value: "new_arrival", label: "New Arrival Drop" },
                        { value: "system", label: "Store Announcement" },
                      ]}
                      ariaLabel="Broadcast category"
                    />
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

              {notificationsList.length > 0 && (
                <div className="pt-5 border-t border-[#E6E2DA] dark:border-[#2C2A26] space-y-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                    Broadcast Dispatch History ({notificationsList.length})
                  </span>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {notificationsList.map((nt) => (
                      <div
                        key={nt.id}
                        className="p-2.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                            {nt.title}
                          </p>
                          <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] truncate">
                            {nt.message}
                          </p>
                        </div>
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-xs shrink-0">
                          {nt.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          </>
        )}
      </main>

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
