import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  User,
  ArrowLeft,
  Save,
  Download,
  Lock,
  Heart,
  Trash2,
  ShoppingBag,
  FileText,
  Truck,
  Headphones,
  Bot,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Copy,
  Check,
  MessageSquare,
  Phone,
} from "lucide-react";
import { Product, Order } from "../types";
import { useAuth } from "../context/AuthContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, updateDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { formatNaira } from "../utils/currency";
import { downloadOrderInvoice } from "../utils/invoice";
import GalleryImage from "./GalleryImage";
import BrandLogo from "./BrandLogo";
import CustomSelect from "./CustomSelect";
import { LOCAL_PRODUCT_IMAGES } from "../data";
import {
  EDITORIAL_EASE,
  galleryContainerVariants,
  galleryCardVariants,
  modalItemVariants,
} from "../utils/motion";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  products?: Product[];
  wishlist?: Product[];
  onToggleWishlist?: (product: Product) => void;
  onOpenProduct?: (product: Product) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onAddToBag: (product: Product, size?: string, color?: string) => void;
  onOpenCart: () => void;
  onViewInvoice?: (order: Order) => void;
  onTrackOrder?: (order: Order) => void;
  onOpenSupport?: (orderId?: string) => void;
  initialTab?: "profile" | "orders" | "favorites";
  onTabChange?: (tab: "profile" | "orders" | "favorites") => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  orders,
  products = [],
  wishlist = [],
  onToggleWishlist,
  onOpenProduct,
  onAddToast,
  onAddToBag,
  onOpenCart,
  onViewInvoice,
  onTrackOrder,
  onOpenSupport,
  initialTab = "profile",
  onTabChange,
}: UserProfileModalProps) {
  const { userData, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "favorites">(initialTab);
  const [keyExpiration, setKeyExpiration] = useState<string>("never");

  const handleSelectTab = (tab: "profile" | "orders" | "favorites") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Processing" | "In Transit" | "Delivered">("All");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileBirthday, setProfileBirthday] = useState("");
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  interface McpTokenItem {
    id: string;
    name: string;
    createdAt: string;
    maskedToken: string;
  }

  const [mcpTokens, setMcpTokens] = useState<McpTokenItem[]>([]);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isGeneratingMcpKey, setIsGeneratingMcpKey] = useState(false);
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);

  const [whatsappChallengeCode, setWhatsappChallengeCode] = useState<string | null>(null);
  const [whatsappChallengeExpiresAt, setWhatsappChallengeExpiresAt] = useState<number | null>(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [isUnlinkingWhatsApp, setIsUnlinkingWhatsApp] = useState(false);

  const loadMcpTokens = async () => {
    if (!currentUser) return;
    // 1. Fetch via authenticated server endpoints (using Firebase Admin SDK)
    try {
      const idToken = await currentUser.getIdToken();
      const endpoints = [
        "/api/user/mcp-token/list",
        "https://btnx-website-mcp.vercel.app/api/user/mcp-token/list",
      ];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.tokens)) {
              setMcpTokens(data.tokens);
              return;
            }
          }
        } catch {}
      }
    } catch {}

    // 2. Direct Firestore query fallback
    try {
      const q = query(
        collection(db, "personal_access_tokens"),
        where("uid", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      const items: McpTokenItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (!data.revokedAt) {
          if (!data.expiresAt || new Date(data.expiresAt).getTime() > Date.now()) {
            items.push({
              id: d.id,
              name: data.name || "Personal AI Key",
              createdAt: data.createdAt || new Date().toISOString(),
              maskedToken: "btnx_pat_••••••••" + d.id.slice(-4),
            });
          }
        }
      });
      setMcpTokens(items);
    } catch (fsErr) {
      console.warn("[MCP Tokens] Fallback read notice:", fsErr);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadMcpTokens();
    }
  }, [currentUser]);

  useEffect(() => {
    if (userData) {
      setProfileName(userData.name || "");
      setProfilePhone(userData.phone || "");
      setProfileBirthday(userData.birthday || "");
      setShippingStreet(userData.shippingStreet || "");
      setShippingCity(userData.shippingCity || "");
      setShippingZip(userData.shippingZip || "");
      setShippingCountry(userData.shippingCountry || "");
    }
  }, [userData]);

  const handleGenerateMcpToken = async () => {
    if (!currentUser) return;
    setIsGeneratingMcpKey(true);
    try {
      const idToken = await currentUser.getIdToken(true);
      const endpoints = [
        "/api/user/mcp-token/create",
        "https://btnx-website-mcp.vercel.app/api/user/mcp-token/create",
      ];

      let tokenData: any = null;
      let lastError = "";

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              name: "Personal AI Assistant Token",
              expiresIn: keyExpiration,
            }),
          });
          if (res.ok) {
            try {
              const data = await res.json();
              if (data && data.token) {
                tokenData = data;
                break;
              } else if (data && data.error) {
                lastError = data.error;
              }
            } catch {}
          } else {
            try {
              const errJson = await res.json();
              if (errJson?.error) lastError = errJson.error;
            } catch {}
          }
        } catch (e: any) {
          lastError = e?.message || String(e);
        }
      }

      if (!tokenData || !tokenData.token) {
        // Fallback: Generate cryptographically secure PAT directly via Web Crypto and persist to Firestore
        try {
          const rawBytes = new Uint8Array(20);
          window.crypto.getRandomValues(rawBytes);
          const rawHex = Array.from(rawBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
          const rawToken = "btnx_pat_" + rawHex;

          const hashBuf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
          const tokenHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
          const tokenId = "pat_" + rawHex.slice(0, 12);

          let expiresAt: string | null = null;
          let days = 0;
          if (keyExpiration === "7d") days = 7;
          else if (keyExpiration === "30d") days = 30;
          else if (keyExpiration === "90d") days = 90;
          else if (keyExpiration === "1y") days = 365;

          if (days > 0) {
            expiresAt = new Date(Date.now() + days * 86400 * 1000).toISOString();
          }

          const record = {
            id: tokenId,
            uid: currentUser.uid,
            tokenHash,
            name: "Personal AI Key",
            scopes: ["orders:read", "invoices:read", "tracking:read"],
            createdAt: new Date().toISOString(),
            expiresAt,
            lastUsedAt: null,
            revokedAt: null,
          };

          await setDoc(doc(db, "personal_access_tokens", tokenId), record);

          tokenData = {
            token: rawToken,
            id: tokenId,
            name: "Personal AI Key",
            createdAt: record.createdAt,
            expiresAt,
            maskedToken: "btnx_pat_••••••••" + tokenId.slice(-4),
          };
        } catch (clientErr: any) {
          throw new Error(clientErr?.message || (lastError && !lastError.includes("<!DOCTYPE") ? lastError : "") || "Could not generate key from server.");
        }
      }

      setNewlyCreatedToken(tokenData.token);
      setMcpTokens((prev) => [
        {
          id: tokenData.id,
          name: tokenData.name || "Personal AI Key",
          createdAt: tokenData.createdAt || new Date().toISOString(),
          maskedToken: tokenData.maskedToken || ("btnx_pat_••••••••" + tokenData.id.slice(-4)),
        },
        ...prev.filter((t) => t.id !== tokenData.id),
      ]);

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          connectedMcp: true,
          lastMcpActiveAt: new Date().toISOString(),
        });
      } catch {}

      onAddToast("Personal AI Access Key generated! Copy it now.", "success");
    } catch (err: any) {
      console.error("[MCP Key Error]", err);
      onAddToast(`Failed to generate AI key: ${err?.message || "Please check connection"}`, "error");
    } finally {
      setIsGeneratingMcpKey(false);
    }
  };

  const handleRevokeMcpToken = async (tokenId: string) => {
    if (!currentUser) return;
    setRevokingTokenId(tokenId);
    try {
      const idToken = await currentUser.getIdToken();
      const endpoints = [
        "/api/user/mcp-token/revoke",
        "https://btnx-website-mcp.vercel.app/api/user/mcp-token/revoke",
      ];
      let revokedOnServer = false;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ tokenId }),
          });
          if (res.ok) {
            revokedOnServer = true;
            break;
          }
        } catch {}
      }

      if (!revokedOnServer) {
        try {
          await updateDoc(doc(db, "personal_access_tokens", tokenId), {
            revokedAt: new Date().toISOString(),
          });
        } catch {}
      }

      setMcpTokens((prev) => prev.filter((t) => t.id !== tokenId));
      if (newlyCreatedToken) setNewlyCreatedToken(null);
      await loadMcpTokens();
      onAddToast("AI Key revoked successfully.", "info");
    } catch (err: any) {
      onAddToast(`Failed to revoke key: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setRevokingTokenId(null);
    }
  };

  const handleGenerateWhatsAppChallenge = async () => {
    if (!currentUser) return;
    setIsGeneratingChallenge(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/user/whatsapp/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (data.success && data.code) {
        setWhatsappChallengeCode(data.code);
        setWhatsappChallengeExpiresAt(data.expiresAt);
        onAddToast("6-digit WhatsApp link code generated!", "success");
      } else {
        throw new Error(data.error || "Failed to generate challenge code");
      }
    } catch (err: any) {
      onAddToast(`Failed to generate code: ${err.message}`, "error");
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleUnlinkWhatsApp = async () => {
    if (!currentUser) return;
    setIsUnlinkingWhatsApp(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/user/whatsapp/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappChallengeCode(null);
        onAddToast("WhatsApp disconnected from your BTNX account.", "info");
      } else {
        throw new Error(data.error || "Unlink failed");
      }
    } catch (err: any) {
      onAddToast(`Failed to unlink WhatsApp: ${err.message}`, "error");
    } finally {
      setIsUnlinkingWhatsApp(false);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleReorder = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    order.items.forEach((item) => {
      onAddToBag(item.product, item.size, item.color);
    });
    onAddToast(`Added items from Order ${order.id} to bag.`, "success");
    onOpenCart();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onAddToast("Sign in to save account details.", "error");
      return;
    }

    const userPath = `users/${currentUser.uid}`;
    setIsSaving(true);
    const profilePayload = {
      id: currentUser.uid,
      uid: currentUser.uid,
      email: currentUser.email || "",
      name: profileName.trim().slice(0, 120),
      phone: profilePhone.trim().slice(0, 40),
      birthday: profileBirthday.trim().slice(0, 32),
      shippingStreet: shippingStreet.trim().slice(0, 250),
      shippingCity: shippingCity.trim().slice(0, 120),
      shippingZip: shippingZip.trim().slice(0, 32),
      shippingCountry: shippingCountry.trim().slice(0, 120),
      updatedAt: new Date().toISOString(),
    };

    let saved = false;
    try {
      await setDoc(doc(db, "users", currentUser.uid), profilePayload, { merge: true });
      saved = true;
    } catch (clientErr: any) {
      console.warn("[Profile Save Client Error, attempting server fallback]:", clientErr?.message);
    }

    if (!saved) {
      try {
        const idToken = await currentUser.getIdToken(true);
        const endpoints = [
          "/api/user/profile",
          "https://btnx-website-mcp.vercel.app/api/user/profile",
        ];
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify(profilePayload),
            });
            if (res.ok) {
              saved = true;
              break;
            }
          } catch {}
        }
      } catch (adminFallbackErr) {
        console.warn("[Profile Save Server Fallback Notice]:", adminFallbackErr);
      }
    }

    if (saved) {
      onAddToast("Profile and shipping details updated successfully.", "success");
    } else {
      console.error("[Profile Save Failed]", { userPath, profilePayload });
      onAddToast("Unable to save profile changes. Please try again or check your connection.", "error");
    }
    setIsSaving(false);
  };

  const handleDownloadInvoice = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadOrderInvoice(order, {
      name: profileName || userData?.name,
      email: currentUser?.email || "",
      phone: profilePhone || userData?.phone,
      shippingStreet: shippingStreet || userData?.shippingStreet,
      shippingCity: shippingCity || userData?.shippingCity,
      shippingZip: shippingZip || userData?.shippingZip,
      shippingCountry: shippingCountry || userData?.shippingCountry,
    });
    onAddToast(`Downloaded Invoice-${order.id}.html.`, "success");
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) => item.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const inTransitCount = orders.filter((o) => o.status === "In Transit").length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;

  const initials = profileName
    ? profileName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : currentUser?.email
    ? currentUser.email.slice(0, 2).toUpperCase()
    : "CL";

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
      className="fixed inset-x-0 top-0 bottom-[60px] lg:bottom-0 z-[45] bg-[#FAF9F7] dark:bg-[#111110] flex flex-col overflow-hidden text-[#141413] dark:text-[#F3F1EC]"
      id="user-profile-fullscreen-page"
    >
      {/* Top Portal Bar */}
      <header className="m3-haze-bar border-b border-[#E6E2DA] dark:border-[#2C2A26] shrink-0">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            id="profile-back-to-store"
            className="min-h-[44px] flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <BrandLogo className="h-5 w-auto text-[#141413] dark:text-[#F3F1EC]" />
            <span className="hidden sm:inline text-xs uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">Account</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline font-mono text-xs text-[#66625B] dark:text-[#A7A299]">
              {currentUser?.email || "Guest"}
            </span>
            <div className="w-8 h-8 bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413] font-mono text-xs rounded-full flex items-center justify-center">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1680px] w-full mx-auto">
        {/* Left Navigation Rail */}
        <aside className="w-full lg:w-72 bg-[#FAF9F7] dark:bg-[#111110] border-b lg:border-b-0 lg:border-r border-[#E6E2DA] dark:border-[#2C2A26] p-4 sm:p-8 flex flex-col justify-between shrink-0">
          <div className="space-y-4 sm:space-y-8">
            <div className="hidden lg:block border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] rounded-sm p-5 space-y-2">
              <div className="w-12 h-12 bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413] font-mono text-sm rounded-full flex items-center justify-center mb-3">
                {initials}
              </div>
              <h3 className="font-display text-xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                {profileName || "My Account"}
              </h3>
              <p className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] truncate">
                {currentUser?.email || "Guest"}
              </p>
            </div>

            <nav className="grid grid-cols-3 lg:flex lg:flex-col gap-1.5">
              <button
                onClick={() => handleSelectTab("profile")}
                className={`min-h-[42px] flex items-center justify-center lg:justify-start gap-1.5 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium uppercase tracking-[0.04em] sm:tracking-[0.12em] rounded-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-white dark:hover:bg-[#191816] border border-transparent hover:border-[#E6E2DA] dark:hover:border-[#2C2A26]"
                }`}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => handleSelectTab("orders")}
                id="orders-tab-trigger"
                className={`min-h-[42px] flex items-center justify-center lg:justify-start gap-1.5 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium uppercase tracking-[0.04em] sm:tracking-[0.12em] rounded-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "orders"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-white dark:hover:bg-[#191816] border border-transparent hover:border-[#E6E2DA] dark:hover:border-[#2C2A26]"
                }`}
              >
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Orders ({orders.length})</span>
              </button>

              <button
                onClick={() => handleSelectTab("favorites")}
                className={`min-h-[42px] flex items-center justify-center lg:justify-start gap-1.5 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium uppercase tracking-[0.04em] sm:tracking-[0.12em] rounded-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "favorites"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-white dark:hover:bg-[#191816] border border-transparent hover:border-[#E6E2DA] dark:hover:border-[#2C2A26]"
                }`}
              >
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Saved ({wishlist.length})</span>
              </button>
            </nav>

            {onOpenSupport && (
              <div className="pt-2 lg:pt-4 lg:border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                <button
                  type="button"
                  onClick={() => onOpenSupport()}
                  className="w-full min-h-[40px] flex items-center justify-center lg:justify-start gap-2.5 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-white dark:hover:bg-[#191816] border border-transparent hover:border-[#E6E2DA] dark:hover:border-[#2C2A26] rounded-sm transition-colors cursor-pointer"
                >
                  <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Customer Service</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#191816] p-5 sm:p-10 pb-14">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                className="space-y-8 max-w-3xl"
              >
                <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1">
                    Account
                  </span>
                  <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                    Profile &amp; Shipping
                  </h1>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-8">
                  <div className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 space-y-5 bg-[#FAF9F7]/60 dark:bg-[#111110]/70">
                    <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                      Personal Details
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Registered Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            disabled
                            value={currentUser?.email || ""}
                            className="w-full pl-3.5 pr-9 py-2.5 bg-[#F4F1EC] dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm text-sm font-mono text-[#66625B] dark:text-[#A7A299] cursor-not-allowed"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#66625B] dark:text-[#A7A299]" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={profileBirthday}
                          onChange={(e) => setProfileBirthday(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 space-y-5 bg-[#FAF9F7]/60 dark:bg-[#111110]/70">
                    <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                      Primary Shipping Destination
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Street Address
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingStreet}
                          onChange={(e) => setShippingStreet(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          City
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingZip}
                          onChange={(e) => setShippingZip(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Country
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-white dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] rounded-sm disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Account Settings</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Connected AI & ChatGPT Personal Access Key */}
                <div className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 space-y-4 bg-[#FAF9F7]/60 dark:bg-[#111110]/70">
                  <div className="flex flex-row items-center justify-between gap-2.5 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413] flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-semibold block truncate">
                          Connected AI &amp; ChatGPT (MCP)
                        </span>
                        <h3 className="font-display text-sm sm:text-base font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                          Personal Account Access Keys
                        </h3>
                      </div>
                    </div>
                    {mcpTokens.length > 0 || userData?.connectedMcp ? (
                      <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {mcpTokens.length > 0 ? `Key Active (${mcpTokens.length})` : "Connected"}
                      </span>
                    ) : (
                      <span className="shrink-0 whitespace-nowrap text-[10px] font-mono text-[#66625B] dark:text-[#A7A299] uppercase tracking-wider px-2.5 py-1 rounded-sm bg-[#EFECE6] dark:bg-[#22211E]">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                    Access Keys are <strong>optional</strong>. You can connect your BTNX account via Claude OAuth (Google / email) or generate a Personal AI Key. When using a Key, it authenticates directly to your account with your verified shipping address and orders without requiring email or password logins.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-xs space-y-1">
                      <span className="text-[9px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] block font-semibold">
                        1. Server Name
                      </span>
                      <p className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
                        BTNX Luxury Store
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("BTNX Luxury Store");
                          onAddToast("Copied server name!", "info");
                        }}
                        className="text-[10px] font-mono text-[#966830] dark:text-[#C89B62] hover:underline cursor-pointer"
                      >
                        Copy Name
                      </button>
                    </div>

                    <div className="p-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-xs space-y-1">
                      <span className="text-[9px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] block font-semibold">
                        2. Server URL (Remote MCP)
                      </span>
                      <p className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                        https://btnx-website-mcp.vercel.app/mcp
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://btnx-website-mcp.vercel.app/mcp");
                          onAddToast("Copied MCP URL!", "info");
                        }}
                        className="text-[10px] font-mono text-[#966830] dark:text-[#C89B62] hover:underline cursor-pointer"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>

                  {/* One-Time Display of Newly Generated Secret Token */}
                  {newlyCreatedToken && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-900 dark:text-amber-200 font-bold">
                          ⚠️ Copy Your New Secret Key Now
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          One-time display
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        This token will not be shown again. Paste it as your Bearer token in Claude, ChatGPT or Cursor.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={newlyCreatedToken}
                          className="flex-1 font-mono text-xs p-2 bg-white dark:bg-[#141413] border border-amber-300 dark:border-amber-700 rounded-xs text-[#141413] dark:text-[#FAF9F7]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(newlyCreatedToken);
                            setCopiedToken(true);
                            onAddToast("Secret token copied to clipboard!", "success");
                            setTimeout(() => setCopiedToken(false), 3000);
                          }}
                          className="px-3 py-2 bg-[#141413] dark:bg-[#FAF9F7] text-white dark:text-[#141413] text-[10px] font-mono font-semibold uppercase tracking-wider rounded-xs cursor-pointer flex items-center gap-1"
                        >
                          {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedToken ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Tokens List */}
                  {mcpTokens.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] block font-semibold">
                        Active Personal Access Tokens
                      </span>
                      <div className="space-y-2">
                        {mcpTokens.map((tok) => (
                          <div
                            key={tok.id}
                            className="p-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-xs flex items-center justify-between"
                          >
                            <div>
                              <p className="font-mono text-xs font-semibold text-[#141413] dark:text-[#FAF9F7]">
                                {tok.name || "Personal Token"}
                              </p>
                              <p className="font-mono text-[10px] text-[#66625B] dark:text-[#A7A299]">
                                {tok.maskedToken} &middot; Created {new Date(tok.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRevokeMcpToken(tok.id)}
                              disabled={revokingTokenId === tok.id}
                              className="text-[10px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline cursor-pointer disabled:opacity-50"
                            >
                              {revokingTokenId === tok.id ? "Revoking..." : "Revoke"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 max-w-xs">
                      <label className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] block mb-1">
                        Key Expiration
                      </label>
                      <CustomSelect
                        value={keyExpiration}
                        onChange={setKeyExpiration}
                        options={[
                          { value: "never", label: "Never Expires (Permanent)" },
                          { value: "30d", label: "30 Days (Default)" },
                          { value: "7d", label: "7 Days (Short-term)" },
                          { value: "90d", label: "90 Days" },
                          { value: "1y", label: "1 Year" },
                        ]}
                        ariaLabel="AI Key Expiration Period"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateMcpToken}
                      disabled={isGeneratingMcpKey}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] rounded-sm hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity h-[42px]"
                    >
                      {isGeneratingMcpKey ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Key className="w-3.5 h-3.5" />
                      )}
                      <span>Generate New AI Key</span>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Concierge & Account Linking */}
                <div className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 space-y-4 bg-[#FAF9F7]/60 dark:bg-[#111110]/70">
                  <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-semibold block">
                          WhatsApp Integration
                        </span>
                        <h3 className="font-display text-base font-medium text-[#141413] dark:text-[#F3F1EC]">
                          Account &amp; Phone Linking
                        </h3>
                      </div>
                    </div>
                    {userData?.whatsappPhone ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono rounded-full font-medium">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Phone Linked
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#66625B] dark:text-[#A7A299] uppercase tracking-wider">
                        Unlinked
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                    Link your WhatsApp phone number to your BTNX account to check order status, view signed luxury invoices, and track parcels directly from WhatsApp.
                  </p>

                  {userData?.whatsappPhone ? (
                    <div className="p-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono uppercase text-[#66625B] dark:text-[#A7A299] font-semibold">
                          Linked Phone Number
                        </span>
                        <p className="font-mono text-sm font-semibold text-[#141413] dark:text-[#FAF9F7]">
                          {userData.whatsappPhone}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleUnlinkWhatsApp}
                        disabled={isUnlinkingWhatsApp}
                        className="text-[10px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {isUnlinkingWhatsApp ? "Unlinking..." : "Unlink Phone"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {whatsappChallengeCode ? (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-sm space-y-3 text-center">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 dark:text-emerald-300 font-bold block">
                            Your 6-Digit Link Code
                          </span>
                          <div className="font-mono text-3xl font-extrabold tracking-[0.25em] text-[#966830] dark:text-[#C89B62]">
                            {whatsappChallengeCode}
                          </div>
                          <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed max-w-sm mx-auto">
                            Send message <strong className="font-mono bg-white dark:bg-[#141413] px-1.5 py-0.5 rounded border border-emerald-200">LINK {whatsappChallengeCode}</strong> to our WhatsApp assistant to instantly verify your account.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`LINK ${whatsappChallengeCode}`);
                                setCopiedChallenge(true);
                                onAddToast("Copied verification message!", "info");
                                setTimeout(() => setCopiedChallenge(false), 3000);
                              }}
                              className="px-4 py-2 bg-[#141413] dark:bg-[#FAF9F7] text-white dark:text-[#141413] text-[10px] font-mono font-semibold uppercase tracking-wider rounded-xs cursor-pointer flex items-center gap-1.5"
                            >
                              {copiedChallenge ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedChallenge ? "Copied" : `Copy "LINK ${whatsappChallengeCode}"`}</span>
                            </button>
                          </div>
                          <span className="text-[10px] font-mono text-[#8C877D] block">
                            Code expires in 10 minutes &middot; Single use
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateWhatsAppChallenge}
                          disabled={isGeneratingChallenge}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] rounded-sm hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
                        >
                          {isGeneratingChallenge ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Phone className="w-3.5 h-3.5" />
                          )}
                          <span>Generate WhatsApp Link Code</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "orders" && (
              <motion.div
                key="orders-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                className="space-y-8"
              >
                <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1">
                      Your Orders
                    </span>
                    <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                      Order History
                    </h1>
                  </div>
                  <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">
                    Total Orders: <strong className="text-[#141413] dark:text-[#F3F1EC]">{orders.length}</strong>
                  </span>
                </div>

                {/* 4-Column Tabular Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm divide-x divide-y md:divide-y-0 divide-[#E6E2DA] dark:divide-[#2C2A26] bg-[#FAF9F7] dark:bg-[#111110] overflow-hidden">
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">Total Spend</p>
                    <p className="font-mono text-lg font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums mt-2">
                      {formatNaira(totalSpent)}
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">Orders</p>
                    <p className="font-mono text-lg font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums mt-2">
                      {orders.length}
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">In Transit</p>
                    <p className="font-mono text-lg font-medium text-[#966830] dark:text-[#C89B62] tabular-nums mt-2">
                      {inTransitCount}
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">Delivered</p>
                    <p className="font-mono text-lg font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums mt-2">
                      {deliveredCount}
                    </p>
                  </div>
                </div>

                {/* Filter & Search Row */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1 border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7] dark:bg-[#22211E]">
                    <Search className="w-4 h-4 text-[#66625B] dark:text-[#A7A299] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by Order ID or garment name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] bg-transparent outline-none"
                    />
                  </div>

                  <div className="flex items-center border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7] dark:bg-[#22211E] p-1 gap-1">
                    {(["All", "Processing", "In Transit", "Delivered"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`flex-1 sm:flex-initial min-h-[36px] px-2 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium rounded-sm text-center whitespace-nowrap transition-colors cursor-pointer ${
                          statusFilter === status
                            ? "bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413]"
                            : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders Table / List */}
                <motion.div
                  key={statusFilter}
                  variants={galleryContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] overflow-hidden"
                >
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      const isExpanded = !!expandedOrders[order.id];
                      const trackingNumber = `TRK-${order.id.replace(/^(KB-|BX-)/, "")}`;
                      const computedSubtotal = order.items.reduce(
                        (sum, i) => sum + (i.product?.price || 0) * i.quantity,
                        0
                      );
                      const computedDiscount = Math.max(0, computedSubtotal - order.total);

                      return (
                        <motion.div key={order.id} variants={modalItemVariants} className="bg-white dark:bg-[#191816]">
                          <div
                            onClick={() => toggleOrderExpand(order.id)}
                            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors"
                          >
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">
                                  Reference
                                </p>
                                <p className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC] mt-1">
                                  {order.id}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">
                                  Date
                                </p>
                                <p className="text-xs text-[#141413] dark:text-[#F3F1EC] mt-1">{order.date}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">
                                  Total
                                </p>
                                <p className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums mt-1">
                                  {formatNaira(order.total)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">
                                  Status
                                </p>
                                <p className="text-xs font-medium text-[#966830] dark:text-[#C89B62] mt-1">
                                  {order.status}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 self-end md:self-auto">
                              {onTrackOrder && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTrackOrder(order);
                                  }}
                                  className="flex items-center gap-1.5 px-3.5 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-[#FAF9F7] dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Track</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => handleReorder(order, e)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-white dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reorder</span>
                              </button>
                              <div className="p-2 border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm text-[#66625B] dark:text-[#A7A299]">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#111110] p-5 sm:p-6 space-y-5">
                              {/* Connected Flat Shipment Progress Strip */}
                              {(() => {
                                const s = (order.status || "").toLowerCase();
                                const activeStep =
                                  s === "delivered"
                                    ? 3
                                    : s === "in transit" || s === "shipped"
                                    ? 2
                                    : s === "processing" || s === "confirmed"
                                    ? 1
                                    : 0;
                                const pct =
                                  activeStep === 3 ? 100 : activeStep === 2 ? 75 : activeStep === 1 ? 50 : 25;
                                const steps = ["Confirmed", "Packed in Osun", "In Transit", "Delivered"];
                                return (
                                  <div className="pb-5 border-b border-[#E6E2DA] dark:border-[#2C2A26] space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                      <span className="font-mono text-[#66625B] dark:text-[#A7A299]">
                                        Tracking:{" "}
                                        <strong className="text-[#141413] dark:text-[#F3F1EC]">{trackingNumber}</strong>
                                      </span>
                                      <div className="flex items-center gap-4">
                                        {onOpenSupport && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onOpenSupport(order.id);
                                            }}
                                            className="text-[11px] uppercase tracking-[0.12em] font-medium text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                                          >
                                            Need Help?
                                          </button>
                                        )}
                                        {onTrackOrder && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onTrackOrder(order);
                                            }}
                                            className="text-[11px] uppercase tracking-[0.12em] font-medium text-[#966830] dark:text-[#C89B62] hover:underline cursor-pointer"
                                          >
                                            Live Tracking &rarr;
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="w-full h-[2px] bg-[#E6E2DA] dark:bg-[#2C2A26] overflow-hidden">
                                      <div
                                        className="h-full bg-[#141413] dark:bg-[#F3F1EC]"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                      {steps.map((stepLabel, idx) => {
                                        const reached = idx <= activeStep;
                                        return (
                                          <p
                                            key={stepLabel}
                                            className={`text-[10px] sm:text-[11px] truncate ${
                                              reached
                                                ? "font-medium text-[#141413] dark:text-[#F3F1EC]"
                                                : "text-[#66625B] dark:text-[#A7A299]"
                                            }`}
                                          >
                                            0{idx + 1} · {stepLabel}
                                          </p>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}

                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-[11px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                                  Line Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
                                </span>
                                <div className="flex items-center gap-3">
                                  {onViewInvoice && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onViewInvoice(order);
                                      }}
                                      className="flex items-center gap-1.5 text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] underline cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>View Invoice</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDownloadInvoice(order, e)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] underline cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </button>
                                </div>
                              </div>

                              <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-white dark:bg-[#191816] overflow-hidden">
                                {order.items.map((item, idx) => {
                                  const liveProd = products.find(
                                    (p) => p.id === item.product?.id || p.name?.toLowerCase() === item.product?.name?.toLowerCase()
                                  );
                                  const localImg = LOCAL_PRODUCT_IMAGES[item.product?.id || (item as any).productId || ""] || (liveProd ? LOCAL_PRODUCT_IMAGES[liveProd.id] : undefined);
                                  const resolvedImg = liveProd?.image || localImg || (liveProd?.images && liveProd.images[0]) || item.product?.image || "";
                                  return (
                                    <div key={`${item.product?.id || idx}-${idx}`} className="p-4 flex items-center gap-4">
                                      <div className="w-14 h-16 bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm shrink-0 overflow-hidden">
                                        <GalleryImage
                                          src={resolvedImg}
                                          fallbackSrc={localImg || liveProd?.image}
                                          alt={item.product?.name || "BTNX Garment"}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                      <h5 className="text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                                        {item.product.name}
                                      </h5>
                                      <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] mt-1">
                                        Size {item.size} · {item.color}
                                      </p>
                                    </div>
                                    <div className="text-right font-mono text-xs tabular-nums">
                                      <p className="text-[#141413] dark:text-[#F3F1EC]">{formatNaira(item.product.price)}</p>
                                      <p className="text-[#66625B] dark:text-[#A7A299] mt-1">Qty {item.quantity}</p>
                                    </div>
                                  </div>
                                );
                              })}
                              </div>

                              <div className="flex flex-col sm:flex-row justify-between gap-4 text-xs pt-2">
                                <div className="font-mono text-[#66625B] dark:text-[#A7A299]">
                                  Origin: <strong className="text-[#141413] dark:text-[#F3F1EC]">Osun Store · Nationwide Courier</strong>
                                </div>
                                <div className="space-y-1 text-right font-mono tabular-nums">
                                  {computedDiscount > 0 && (
                                    <p className="text-[#966830] dark:text-[#C89B62]">
                                      Discount: -{formatNaira(computedDiscount)}
                                    </p>
                                  )}
                                  <p className="text-[#141413] dark:text-[#F3F1EC] font-medium">
                                    Grand Total: {formatNaira(order.total)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="py-16 px-6 text-center bg-white dark:bg-[#191816]">
                      <p className="font-display text-2xl text-[#141413] dark:text-[#F3F1EC] mb-1">No orders found</p>
                      <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                        Your past orders and tracking details will show up here.
                      </p>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {activeTab === "favorites" && (
              <motion.div
                key="favorites-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EDITORIAL_EASE }}
                className="space-y-8"
              >
                <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5 flex items-end justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1">
                      Wishlist
                    </span>
                    <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                      Saved Pieces
                    </h1>
                  </div>
                  <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">
                    {wishlist.length} Items
                  </span>
                </div>

                {wishlist.length > 0 ? (
                  <motion.div
                    variants={galleryContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
                  >
                    {wishlist.map((product) => (
                      <motion.div
                        key={product.id}
                        variants={galleryCardVariants}
                        className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-2.5 sm:p-4 flex flex-col justify-between gap-3 sm:gap-4 bg-white dark:bg-[#191816]"
                      >
                        <div
                          onClick={() => onOpenProduct && onOpenProduct(product)}
                          className="cursor-pointer space-y-2 sm:space-y-3"
                        >
                          <div className="aspect-[3/4] bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm overflow-hidden">
                            <GalleryImage
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-2">
                            <h3 className="text-[13px] sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                              {product.name}
                            </h3>
                            <span className="font-mono text-[12px] sm:text-xs tabular-nums text-[#141413] dark:text-[#F3F1EC] shrink-0">
                              {formatNaira(product.price)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 sm:gap-2">
                          <button
                            onClick={() => onAddToBag(product)}
                            className="flex-1 py-2 sm:py-2.5 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-white dark:text-[#141413] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.08em] sm:tracking-[0.12em] rounded-sm flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span>Add</span>
                          </button>
                          {onToggleWishlist && (
                            <button
                              onClick={() => onToggleWishlist(product)}
                              className="p-2 sm:p-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] rounded-sm text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
                              aria-label="Remove from saved pieces"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="py-20 px-6 text-center border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7] dark:bg-[#111110]">
                    <Heart className="w-7 h-7 text-[#66625B] dark:text-[#A7A299] mx-auto mb-3 stroke-[1.25]" />
                    <p className="font-display text-2xl text-[#141413] dark:text-[#F3F1EC] mb-1">
                      No saved pieces yet
                    </p>
                    <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                      Tap the heart on any item to save it here for later.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}
