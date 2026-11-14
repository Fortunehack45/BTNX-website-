import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ShoppingBag,
  User,
  X,
  Heart,
  Settings,
  LogOut,
  Package,
  Bell,
  Percent,
  Truck,
  Tag,
  Lock,
  ArrowRight,
  Headphones,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { CartItem, Product } from "../types";
import { NAVIGATION_ITEMS, NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "../utils/currency";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { AppNotification, isNotificationUnread } from "../hooks/useNotifications";
import GalleryImage from "./GalleryImage";
import BrandLogo from "./BrandLogo";
import RecentSearchDropdown from "./RecentSearchDropdown";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { NotificationRowSkeleton } from "./StoreSkeleton";

interface HeaderProps {
  cart: CartItem[];
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCategoryFilter: (category: string) => void;
  onOpenProfile: (tab?: "profile" | "orders" | "favorites") => void;
  onOpenAuth: () => void;
  onOpenProduct?: (product: Product | null) => void;
  notifications: AppNotification[];
  unreadCount: number;
  isNotificationsLoading?: boolean;
  onMarkAsRead: (notif: AppNotification) => void;
  onMarkAllAsRead: () => void;
  onOpenSupport?: () => void;
}

export default function Header({
  cart,
  onOpenCart,
  searchQuery,
  onSearchChange,
  onCategoryFilter,
  onOpenProfile,
  onOpenAuth,
  onOpenProduct,
  notifications,
  unreadCount,
  isNotificationsLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenSupport,
}: HeaderProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [currentAnnouncementIdx, setCurrentAnnouncementIdx] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("Home");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollLockUntilRef = useRef<number>(0);
  const { recentSearches, saveSearchQuery, removeSearchQuery, clearSearchHistory } =
    useSearchHistory();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const formatRelativeTime = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      if (isNaN(diffMs)) return "Recent";
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      return `${diffDays}d`;
    } catch {
      return "Recent";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order_status":
        return <Truck className="w-3.5 h-3.5 text-[#141413] dark:text-[#F3F1EC]" />;
      case "promo":
        return <Percent className="w-3.5 h-3.5 text-[#966830] dark:text-[#C89B62]" />;
      case "new_arrival":
        return <Tag className="w-3.5 h-3.5 text-[#141413] dark:text-[#F3F1EC]" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-[#66625B] dark:text-[#A7A299]" />;
    }
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const docRef = doc(db, "siteContent", "hero");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAnnouncements(docSnap.data().announcements || []);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "siteContent/hero");
      }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements]);

  const isShopPage = location.pathname === "/shop";
  const isPromosPage = location.pathname === "/promos";
  const isSavedPage = location.pathname === "/saved";
  const isBagPage = location.pathname === "/bag";
  const isNotificationsPage = location.pathname === "/notifications";
  const isTrackPage = location.pathname === "/track";
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    if (isShopPage) {
      setActiveSection("Shop");
    } else if (isPromosPage) {
      setActiveSection("Promos");
    } else if (isHomePage) {
      const navState = location.state as { scrollToSection?: string; activeLabel?: string } | null;
      if (navState?.activeLabel) {
        scrollLockUntilRef.current = Date.now() + 900;
        setActiveSection(navState.activeLabel);
      } else {
        setActiveSection((prev) => (prev === "Shop" || prev === "Promos" ? "Home" : prev));
      }
    }
  }, [isShopPage, isPromosPage, isHomePage, location.state]);

  useEffect(() => {
    if (!isHomePage) return;
    const handleScroll = () => {
      if (Date.now() < scrollLockUntilRef.current) return;
      const scrollY = window.scrollY;
      const collectionEl = document.getElementById("collection");
      const newArrivalsEl = document.getElementById("new-arrivals");

      if (collectionEl && scrollY >= collectionEl.offsetTop - 220) {
        setActiveSection("Collection");
      } else if (newArrivalsEl && scrollY >= newArrivalsEl.offsetTop - 220) {
        setActiveSection("New");
      } else {
        setActiveSection("Home");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const activeItem = isShopPage
    ? "Shop"
    : isPromosPage
    ? "Promos"
    : isSavedPage || isBagPage || isNotificationsPage || isTrackPage
    ? ""
    : activeSection;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const scrollToHomeSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const headerHeight = window.innerWidth >= 1024 ? 68 : 56;
    const targetTop = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerHeight);
    window.scrollTo({ top: targetTop, behavior: "smooth" });
  };

  const handleNavClick = (label: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsSearchOpen(false);
    scrollLockUntilRef.current = Date.now() + 900;
    setActiveSection(label);

    const isViewingProduct = location.search.includes("product=") || location.search.includes("account=");

    if (label === "Home") {
      onCategoryFilter("");
      if (!isHomePage || isViewingProduct) {
        navigate("/");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (label === "New") {
      if (!isHomePage || isViewingProduct) {
        navigate("/", { state: { scrollToSection: "new-arrivals", activeLabel: "New" } });
      } else {
        scrollToHomeSection("new-arrivals");
      }
    } else if (label === "Sale") {
      if (!isHomePage || isViewingProduct) {
        navigate("/", { state: { scrollToSection: "end-year-sale", activeLabel: "Sale" } });
      } else {
        scrollToHomeSection("end-year-sale");
      }
    } else if (label === "Collection") {
      if (!isHomePage || isViewingProduct) {
        navigate("/", { state: { scrollToSection: "collection", activeLabel: "Collection" } });
      } else {
        scrollToHomeSection("collection");
      }
    } else if (label === "Shop") {
      navigate("/shop");
    } else if (label === "Promos") {
      navigate("/promos");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      saveSearchQuery(trimmed);
      setIsSearchFocused(false);
      setIsSearchOpen(false);
      if (isShopPage && !location.search.includes("product=")) {
        window.scrollTo(0, 0);
      } else {
        navigate("/shop");
      }
    }
  };

  const handleInspectNotification = (notif: AppNotification) => {
    onMarkAsRead(notif);
    setIsNotificationsOpen(false);
    navigate(`/notifications?id=${encodeURIComponent(notif.id)}`);
  };

  const handleOpenAllNotifications = () => {
    setIsNotificationsOpen(false);
    navigate("/notifications");
  };

  const cleanQuery = searchQuery.trim().toLowerCase();
  const suggestedProducts = cleanQuery
    ? NEW_YEAR_PRODUCTS.filter(
        (product) =>
          product.name.toLowerCase().includes(cleanQuery) ||
          product.category.toLowerCase().includes(cleanQuery) ||
          (product.description && product.description.toLowerCase().includes(cleanQuery))
      ).slice(0, 4)
    : NEW_YEAR_PRODUCTS.slice(0, 4);

  return (
    <>
      {announcements.length > 0 && (
        <div className="w-full h-8 bg-[#141413] dark:bg-[#191816] text-[#FAF9F7] dark:text-[#F3F1EC] border-b border-transparent dark:border-[#2C2A26] px-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentAnnouncementIdx}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] tracking-[0.14em] uppercase truncate"
            >
              {announcements[currentAnnouncementIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      <div
        className="sticky top-0 z-40 w-full m3-haze-bar overflow-x-clip transition-colors duration-200"
        id="global-nav-container"
      >
        <header className="w-full border-b border-[#E6E2DA]/80 dark:border-[#2C2A26]/85">
          <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 h-14 lg:h-[68px] flex items-center justify-between gap-3 lg:gap-6 min-w-0">
            {/* Zone 1: Vector Brand Logo */}
            <button
              type="button"
              onClick={(e) => handleNavClick("Home", e)}
              className="flex items-center text-[#141413] dark:text-[#F3F1EC] whitespace-nowrap shrink-0 hover:opacity-75 transition-opacity py-1 cursor-pointer select-none outline-none"
              id="header-logo"
              aria-label="BTNX Home"
            >
              <BrandLogo className="h-6 sm:h-7 lg:h-8 w-auto" />
            </button>

            {/* Zone 2: Single-Line Navigation Links (Desktop lg: 1024px+) */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-9 min-w-0">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = activeItem === item.label;
                const displayLabel = item.label;
                const linkClasses = `relative py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer select-none outline-none ${
                  isActive
                    ? "text-[#141413] dark:text-[#F3F1EC]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                }`;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={(e) => handleNavClick(item.label, e)}
                    className={linkClasses}
                    id={`nav-item-${item.label.toLowerCase()}`}
                  >
                    {displayLabel}
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#141413] dark:bg-[#F3F1EC] transition-opacity duration-150 ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Restrained Action Controls + Primary Bag Page Trigger */}
            <div className="flex items-center gap-0.5 sm:gap-1.5 lg:gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  setIsNotificationsOpen(false);
                  setIsProfileDropdownOpen(false);
                }}
                className="min-h-[42px] min-w-[40px] sm:min-w-[42px] rounded-full flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#141413]/5 dark:hover:bg-white/8 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Toggle Search"
                id="header-search-toggle"
              >
                {isSearchOpen ? (
                  <X className="w-[18px] h-[18px] stroke-[1.5]" />
                ) : (
                  <Search className="w-[18px] h-[18px] stroke-[1.5]" />
                )}
              </button>

              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    setIsSearchOpen(false);
                    setIsProfileDropdownOpen(false);
                  }}
                  className={`relative min-h-[42px] min-w-[40px] sm:min-w-[42px] rounded-full flex items-center justify-center transition-colors whitespace-nowrap shrink-0 cursor-pointer gap-1 hover:bg-[#141413]/5 dark:hover:bg-white/8 ${
                    isNotificationsPage
                      ? "text-[#966830] dark:text-[#C89B62] bg-[#966830]/10 dark:bg-[#C89B62]/15"
                      : "text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62]"
                  }`}
                  aria-label="Notifications"
                >
                  <Bell className="w-[18px] h-[18px] stroke-[1.5]" />
                  {unreadCount > 0 && (
                    <span className="font-mono text-[10px] font-medium text-[#966830] dark:text-[#C89B62] tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="fixed inset-x-3 top-16 lg:absolute lg:inset-x-auto lg:top-auto lg:right-0 lg:mt-3 lg:w-96 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm shadow-[0_20px_50px_-12px_rgba(20,20,19,0.2)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] z-50 overflow-hidden"
                    >
                      <div className="px-5 py-3.5 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC]">
                          Notifications
                        </span>
                        {currentUser && unreadCount > 0 && (
                          <button
                            onClick={onMarkAllAsRead}
                            className="text-[11px] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto bg-white dark:bg-[#191816]">
                        {!currentUser ? (
                          <div className="p-8 text-center">
                            <Lock className="w-5 h-5 text-[#66625B] dark:text-[#A7A299] mx-auto mb-3 stroke-[1.5]" />
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] mb-1">
                              Sign In
                            </p>
                            <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed mb-4">
                              Sign in to see your order updates and promo offers.
                            </p>
                            <button
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                onOpenAuth();
                              }}
                              className="px-6 py-2.5 bg-[#141413] text-[#FAF9F7] dark:bg-[#F3F1EC] dark:text-[#141413] text-[11px] font-medium tracking-[0.12em] uppercase hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] rounded-sm transition-colors cursor-pointer"
                            >
                              Sign In
                            </button>
                          </div>
                        ) : isNotificationsLoading && notifications.length === 0 ? (
                          <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]" aria-busy="true">
                            {[0, 1, 2].map((row) => (
                              <NotificationRowSkeleton key={row} />
                            ))}
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] mb-1">
                              Nothing New Yet
                            </p>
                            <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                              Order updates and store announcements will appear here.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                            {notifications.slice(0, 6).map((notif) => {
                              const isUnread = isNotificationUnread(notif, currentUser?.uid);
                              return (
                                <div
                                  key={notif.id}
                                  onClick={() => handleInspectNotification(notif)}
                                  className={`p-4 flex gap-3 cursor-pointer transition-colors ${
                                    isUnread
                                      ? "bg-[#FAF9F7] dark:bg-[#22211E] hover:bg-[#F4F1EC] dark:hover:bg-[#292723]"
                                      : "bg-white dark:bg-[#191816] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E]"
                                  }`}
                                >
                                  <div className="w-8 h-8 border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm flex items-center justify-center shrink-0 bg-[#FAF9F7] dark:bg-[#22211E]">
                                    {getNotificationIcon(notif.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-2 mb-1">
                                      <h4
                                        className={`text-xs text-[#141413] dark:text-[#F3F1EC] truncate ${
                                          isUnread ? "font-semibold" : "font-medium"
                                        }`}
                                      >
                                        {notif.title}
                                      </h4>
                                      <span className="font-mono text-[10px] text-[#66625B] dark:text-[#A7A299] tabular-nums shrink-0">
                                        {formatRelativeTime(notif.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed break-words line-clamp-2">
                                      {notif.message}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="px-5 py-3.5 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413]">
                        <button
                          type="button"
                          onClick={handleOpenAllNotifications}
                          className="w-full flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors cursor-pointer"
                        >
                          <span>View All Notifications</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={profileRef}>
                {currentUser ? (
                  <>
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(!isProfileDropdownOpen);
                        setIsNotificationsOpen(false);
                        setIsSearchOpen(false);
                      }}
                      className="min-h-[42px] min-w-[40px] sm:min-w-[42px] rounded-full text-[#141413] dark:text-[#F3F1EC] hover:bg-[#141413]/5 dark:hover:bg-white/8 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                      id="profile-trigger"
                      aria-label="Account Menu"
                    >
                      <User className="w-[18px] h-[18px] stroke-[1.5]" />
                    </button>

                    <AnimatePresence>
                      {isProfileDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-3 sm:w-64 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm shadow-[0_20px_50px_-12px_rgba(20,20,19,0.22)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.88)] z-50 overflow-hidden"
                        >
                          <div className="px-4 py-3.5 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413]">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                              Signed In As
                            </p>
                            <p className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC] truncate mt-0.5">
                              {currentUser.email}
                            </p>
                          </div>
                          <div className="p-1.5 space-y-0.5 bg-white dark:bg-[#191816]">
                            <button
                              onClick={() => {
                                onOpenProfile("orders");
                                setIsProfileDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer"
                            >
                              <Package className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                              <span>Orders</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileDropdownOpen(false);
                                navigate("/track");
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer"
                            >
                              <Truck className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                              <span>Track Order</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileDropdownOpen(false);
                                navigate("/notifications");
                              }}
                              className="flex w-full items-center justify-between gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2.5">
                                <Bell className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                                <span>Notifications</span>
                              </span>
                              {unreadCount > 0 && (
                                <span className="font-mono text-[10px] text-[#966830] dark:text-[#C89B62] tabular-nums">
                                  {unreadCount}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileDropdownOpen(false);
                                navigate("/saved");
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer"
                            >
                              <Heart className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                              <span>Saved Pieces</span>
                            </button>
                            <button
                              onClick={() => {
                                onOpenProfile("profile");
                                setIsProfileDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer"
                            >
                              <Settings className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                              <span>Profile &amp; Shipping</span>
                            </button>
                            <a
                              href="/support/"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer"
                            >
                              <Headphones className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                              <span>Customer Service</span>
                            </a>
                            <div className="h-[1px] bg-[#E6E2DA] dark:bg-[#2C2A26] my-1 mx-2" />
                            <button
                              onClick={() => {
                                logout();
                                setIsProfileDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onOpenAuth}
                      className="lg:hidden min-h-[42px] min-w-[40px] rounded-full flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#141413]/5 dark:hover:bg-white/8 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors cursor-pointer"
                      aria-label="Sign In"
                    >
                      <User className="w-[18px] h-[18px] stroke-[1.5]" />
                    </button>
                    <button
                      onClick={onOpenAuth}
                      className="hidden lg:inline-flex items-center px-3 py-2 rounded-sm text-[12px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-[#141413]/5 dark:hover:bg-white/8 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>

              {/* Desktop Bag Page Button (lg+) */}
              <button
                onClick={onOpenCart}
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[#141413] text-[#FAF9F7] hover:bg-[#2B2A28] dark:bg-[#F3F1EC] dark:text-[#141413] dark:hover:bg-[#E2DFD7] transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-sm"
                id="cart-trigger"
                aria-label="Open Shopping Bag Page"
              >
                <ShoppingBag className="w-3.5 h-3.5 stroke-[1.75]" />
                <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Bag</span>
                <span className="font-mono text-[11px] tabular-nums text-[#E6E2DA] dark:text-[#66625B]">
                  ({totalItems})
                </span>
              </button>
            </div>
          </div>

          {/* Search Drawer — Solid Surface */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] shadow-[0_20px_50px_-12px_rgba(20,20,19,0.18)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] overflow-visible"
              >
                <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-7">
                  <div className="relative">
                    <form
                      onSubmit={handleSearchSubmit}
                      className="flex items-center gap-3 sm:gap-4 border-b border-[#141413] dark:border-[#F3F1EC]/65 pb-3"
                    >
                      <Search className="w-4 h-4 text-[#66625B] dark:text-[#A7A299] shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search hoodies, tees, jackets, or knitwear..."
                        value={searchQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        onChange={(e) => {
                          onSearchChange(e.target.value);
                          setIsSearchFocused(true);
                        }}
                        className="w-full bg-transparent text-sm sm:text-base text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B]/70 dark:placeholder-[#A7A299]/70 outline-none"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            onSearchChange("");
                            setIsSearchFocused(true);
                            searchInputRef.current?.focus();
                          }}
                          className="text-xs uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-4 sm:px-5 py-2 bg-[#141413] text-[#FAF9F7] hover:bg-[#2B2A28] dark:bg-[#F3F1EC] dark:text-[#141413] dark:hover:bg-[#E2DFD7] text-[11px] font-medium uppercase tracking-[0.14em] whitespace-nowrap shrink-0 cursor-pointer rounded-sm transition-colors"
                      >
                        Search
                      </button>
                    </form>

                    {isSearchFocused && (
                      <RecentSearchDropdown
                        queries={recentSearches}
                        onSelectQuery={(term) => {
                          onSearchChange(term);
                          saveSearchQuery(term);
                          setIsSearchFocused(false);
                        }}
                        onRemoveQuery={removeSearchQuery}
                        onClearAll={clearSearchHistory}
                      />
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] font-medium">
                        {cleanQuery ? `Results (${suggestedProducts.length})` : "Featured Pieces"}
                      </span>
                      <button
                        onClick={() => {
                          if (cleanQuery) saveSearchQuery(searchQuery);
                          setIsSearchOpen(false);
                          navigate("/shop");
                        }}
                        className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Shop All</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {suggestedProducts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {suggestedProducts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              if (cleanQuery) saveSearchQuery(searchQuery);
                              if (onOpenProduct) onOpenProduct(p);
                              setIsSearchOpen(false);
                            }}
                            className="flex items-center gap-3.5 p-2.5 border border-[#E6E2DA]/80 dark:border-[#2C2A26]/90 hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-[#FAF9F7]/75 dark:bg-[#22211E]/75 text-left transition-colors cursor-pointer group rounded-sm"
                          >
                            <div className="w-14 h-[72px] shrink-0 bg-[#F4F1EC] dark:bg-[#2A2824] rounded-sm overflow-hidden">
                              <GalleryImage
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-[#66625B] dark:text-[#A7A299] uppercase tracking-[0.1em] truncate">
                                {p.category}
                              </p>
                              <p className="text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate mt-0.5">
                                {p.name}
                              </p>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                                  {formatNaira(p.price)}
                                </span>
                                {p.originalPrice && p.originalPrice > p.price && (
                                  <span className="font-mono text-[10px] text-[#66625B] dark:text-[#A7A299] line-through tabular-nums">
                                    {formatNaira(p.originalPrice)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#66625B] dark:text-[#A7A299] py-4">
                        No pieces match &ldquo;{searchQuery}&rdquo;. Try &ldquo;leather&rdquo;, &ldquo;cropped&rdquo;, or &ldquo;knitwear&rdquo;.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      </div>
    </>
  );
}
