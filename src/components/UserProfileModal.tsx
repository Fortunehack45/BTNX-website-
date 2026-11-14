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
} from "lucide-react";
import { Product, Order } from "../types";
import { useAuth } from "../context/AuthContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { formatNaira } from "../utils/currency";
import { downloadOrderInvoice } from "../utils/invoice";
import GalleryImage from "./GalleryImage";
import BrandLogo from "./BrandLogo";
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
  wishlist?: Product[];
  onToggleWishlist?: (product: Product) => void;
  onOpenProduct?: (product: Product) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onAddToBag: (product: Product, size?: string, color?: string) => void;
  onOpenCart: () => void;
  onViewInvoice?: (order: Order) => void;
  initialTab?: "profile" | "orders" | "favorites";
}

export default function UserProfileModal({
  isOpen,
  onClose,
  orders,
  wishlist = [],
  onToggleWishlist,
  onOpenProduct,
  onAddToast,
  onAddToBag,
  onOpenCart,
  onViewInvoice,
  initialTab = "profile",
}: UserProfileModalProps) {
  const { userData, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "favorites">(initialTab);
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
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: profileName.trim().slice(0, 120),
        phone: profilePhone.trim().slice(0, 40),
        birthday: profileBirthday.trim().slice(0, 32),
        shippingStreet: shippingStreet.trim().slice(0, 250),
        shippingCity: shippingCity.trim().slice(0, 120),
        shippingZip: shippingZip.trim().slice(0, 32),
        shippingCountry: shippingCountry.trim().slice(0, 120),
      });
      onAddToast("Profile and shipping details updated.", "success");
    } catch (err: any) {
      onAddToast(`Unable to save changes: ${err.message || "Database error"}`, "error");
      handleFirestoreError(err, OperationType.UPDATE, userPath);
    } finally {
      setIsSaving(false);
    }
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
      className="fixed inset-x-0 top-0 bottom-14 lg:bottom-0 z-[45] bg-[#FAF9F7] dark:bg-[#111110] flex flex-col overflow-hidden text-[#141413] dark:text-[#F3F1EC]"
      id="user-profile-fullscreen-page"
    >
      {/* Top Portal Bar */}
      <header className="m3-haze-bar border-b border-[#E6E2DA] dark:border-[#2C2A26] shrink-0">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-3">
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
            <span className="hidden sm:inline text-xs uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">Client Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline font-mono text-xs text-[#66625B] dark:text-[#A7A299]">
              {currentUser?.email || "Guest Session"}
            </span>
            <div className="w-8 h-8 bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413] font-mono text-xs rounded-full flex items-center justify-center">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1360px] w-full mx-auto">
        {/* Left Navigation Rail */}
        <aside className="w-full lg:w-72 bg-[#FAF9F7] dark:bg-[#111110] border-b lg:border-b-0 lg:border-r border-[#E6E2DA] dark:border-[#2C2A26] p-4 sm:p-8 flex flex-col justify-between shrink-0">
          <div className="space-y-4 sm:space-y-8">
            <div className="hidden lg:block border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] rounded-sm p-5 space-y-2">
              <div className="w-12 h-12 bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413] font-mono text-sm rounded-full flex items-center justify-center mb-3">
                {initials}
              </div>
              <h3 className="font-display text-xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                {profileName || "Client Account"}
              </h3>
              <p className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] truncate">
                {currentUser?.email || "Guest"}
              </p>
            </div>

            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("profile")}
                className={`min-h-[44px] flex items-center gap-2.5 sm:gap-3 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] rounded-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-white dark:hover:bg-[#191816] border border-transparent hover:border-[#E6E2DA] dark:hover:border-[#2C2A26]"
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => setActiveTab("orders")}
                id="orders-tab-trigger"
                className={`min-h-[44px] flex items-center gap-2.5 sm:gap-3 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] rounded-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "orders"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-white dark:hover:bg-[#191816] border border-transparent hover:border-[#E6E2DA] dark:hover:border-[#2C2A26]"
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>Orders ({orders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("favorites")}
                className={`min-h-[44px] flex items-center gap-2.5 sm:gap-3 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] rounded-sm whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "favorites"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-white dark:text-[#141413]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-white dark:hover:bg-[#191816] border border-transparent hover:border-[#E6E2DA] dark:hover:border-[#2C2A26]"
                }`}
              >
                <Heart className="w-4 h-4 shrink-0" />
                <span>Saved ({wishlist.length})</span>
              </button>
            </nav>
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
                    Account Directory
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
                      Purchase Ledger
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

                  <div className="flex border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7] dark:bg-[#22211E] p-1 gap-1 overflow-x-auto no-scrollbar">
                    {(["All", "Processing", "In Transit", "Delivered"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`min-h-[38px] px-4 py-1.5 text-xs font-medium rounded-sm whitespace-nowrap transition-colors cursor-pointer ${
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

                            <div className="flex items-center gap-3 self-end md:self-auto">
                              <button
                                onClick={(e) => handleReorder(order, e)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-white dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm transition-colors cursor-pointer"
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
                            <div className="border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#111110] p-6 space-y-6">
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
                                {order.items.map((item, idx) => (
                                  <div key={`${item.product.id}-${idx}`} className="p-4 flex items-center gap-4">
                                    <div className="w-14 h-16 bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm shrink-0 overflow-hidden">
                                      <GalleryImage
                                        src={item.product.image}
                                        alt={item.product.name}
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
                                ))}
                              </div>

                              <div className="flex flex-col sm:flex-row justify-between gap-4 text-xs pt-2">
                                <div className="font-mono text-[#66625B] dark:text-[#A7A299]">
                                  Tracking: <strong className="text-[#141413] dark:text-[#F3F1EC]">{trackingNumber}</strong>
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
                        Placed orders and shipment statuses will appear in this ledger.
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
                      Personal Archive
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
                      Save garments from any collection card or product view to curate your edit.
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
