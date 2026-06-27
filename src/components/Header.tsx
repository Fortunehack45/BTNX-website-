import React, { useState, useEffect, useRef } from "react";
import { Search, ShoppingBag, User, Menu, X, Heart, Settings, LogOut, Package, ArrowRight, Shield, Bell, Percent, Truck, Sparkles, Check, Lock } from "lucide-react";
import { NavItem, CartItem, Product } from "../types";
import { NAVIGATION_ITEMS, NEW_YEAR_PRODUCTS } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, orderBy } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  cart: CartItem[];
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  categoryFilter: string;
  onCategoryFilter: (category: string) => void;
  onOpenProfile: (tab?: "profile" | "orders") => void;
  onOpenAuth: () => void;
  onOpenProduct?: (product: Product | null) => void;
}

export default function Header({
  cart,
  onOpenCart,
  searchQuery,
  onSearchChange,
  onAddToast,
  categoryFilter,
  onCategoryFilter,
  onOpenProfile,
  onOpenAuth,
  onOpenProduct,
}: HeaderProps) {
  const { currentUser, logout, userData } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [currentAnnouncementIdx, setCurrentAnnouncementIdx] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "in", [currentUser.uid, "broadcast"])
      );
      const unsub = onSnapshot(q, (snap) => {
        const allNotifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        // Sort in memory to avoid needing a composite index
        allNotifs.sort((a, b) => {
          let aTime = 0;
          let bTime = 0;
          if (a.createdAt?.toMillis) aTime = a.createdAt.toMillis();
          else if (typeof a.createdAt === 'string') aTime = new Date(a.createdAt).getTime();

          if (b.createdAt?.toMillis) bTime = b.createdAt.toMillis();
          else if (typeof b.createdAt === 'string') bTime = new Date(b.createdAt).getTime();

          return bTime - aTime;
        });
        setNotifications(allNotifs);
      }, (err) => {
        console.error("Failed to fetch notifications:", err);
      });
      return () => unsub();
    } catch (err) {
      console.error("Notification listener error:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n: any) => {
    if (!currentUser) return false;
    if (n.userId === 'broadcast') {
      return !n.readBy || !n.readBy.includes(currentUser.uid);
    }
    return !n.isRead;
  }).length;

  const handleMarkAsRead = async (notif: any) => {
    if (!currentUser) return;
    try {
      if (notif.userId === 'broadcast') {
        const currentReadBy = notif.readBy || [];
        if (!currentReadBy.includes(currentUser.uid)) {
          await updateDoc(doc(db, "notifications", notif.id), {
            readBy: [...currentReadBy, currentUser.uid]
          });
        }
      } else {
        await updateDoc(doc(db, "notifications", notif.id), {
          isRead: true
        });
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const unreadNotifs = notifications.filter((n: any) => {
        if (n.userId === 'broadcast') {
          return !n.readBy || !n.readBy.includes(currentUser.uid);
        }
        return !n.isRead;
      });

      for (const notif of unreadNotifs) {
        await handleMarkAsRead(notif);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      if (isNaN(diffMs)) return "Recent";
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays}d ago`;
    } catch (e) {
      return "Recent";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_status':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'promo':
        return <Percent className="w-4 h-4 text-amber-600" />;
      case 'new_arrival':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_status':
        return 'bg-blue-50 border-blue-100';
      case 'promo':
        return 'bg-amber-50 border-amber-100';
      case 'new_arrival':
        return 'bg-emerald-50 border-emerald-100';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const docRef = doc(db, "siteContent", "hero");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAnnouncements(docSnap.data().announcements || []);
      }
    };
    fetchAnnouncements();
  }, []);

  // Rotate announcements every 5 seconds
  useEffect(() => {
    if (announcements.length === 0) return;
    const timer = setInterval(() => {
      setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements]);

  // Handle clicking outside the search container to close the suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeItem = categoryFilter 
    ? (categoryFilter === "under-100" ? "Home" : categoryFilter) 
    : "Home";

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavClick = (label: string, e: React.MouseEvent) => {
    setIsMobileMenuOpen(false);
    
    if (onOpenProduct) {
      onOpenProduct(null);
    }
    
    if (label === "Home") {
      e.preventDefault();
      onCategoryFilter("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (label === "New") {
      e.preventDefault();
      const element = document.getElementById("new-arrivals");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else if (label === "Sale") {
      e.preventDefault();
      const element = document.getElementById("end-year-sale");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else if (label === "Collection") {
      e.preventDefault();
      const element = document.getElementById("collection");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else if (label === "Shop") {
      e.preventDefault();
      const element = document.getElementById("collection");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const element = document.getElementById("collection");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      setIsSearchFocused(false);
    }
  };

  // Get matching products based on typed query
  const cleanQuery = searchQuery.trim().toLowerCase();
  const suggestedProducts = cleanQuery
    ? NEW_YEAR_PRODUCTS.filter((product) => {
        return (
          product.name.toLowerCase().includes(cleanQuery) ||
          product.category.toLowerCase().includes(cleanQuery) ||
          (product.description && product.description.toLowerCase().includes(cleanQuery))
        );
      }).slice(0, 4)
    : [];

  return (
    <div className="sticky top-0 z-40 w-full flex flex-col" id="global-nav-container">
      
      {/* 1. Elegant Rotating Announcement Bar */}
      <div className="w-full bg-slate-950 text-white py-2 px-4 text-center select-none border-b border-slate-900 overflow-hidden flex items-center justify-center relative min-h-[36px]">
        {announcements.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAnnouncementIdx}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex items-center justify-center gap-2 text-[10px] tracking-[0.18em] font-bold uppercase text-slate-100 font-mono"
            >
              <span className="text-[10px] tracking-[0.18em] font-bold uppercase text-slate-100 font-mono">
                {announcements[currentAnnouncementIdx]}
              </span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* 2. Primary Navigation Bar */}
      <header className="w-full bg-white/80 backdrop-blur-2xl border-b border-slate-100/50 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <a 
                href="#" 
                onClick={(e) => handleNavClick("Home", e)}
                className="font-logo-anton text-[2.5rem] tracking-wider text-slate-950 select-none hover:opacity-80 transition-opacity drop-shadow-sm"
                id="header-logo"
              >
                BTNX
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-12 items-center justify-center flex-1 ml-12">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = activeItem === item.label;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleNavClick(item.label, e)}
                    className={`relative text-[13px] font-bold tracking-[0.1em] uppercase transition-colors duration-300 py-2 ${
                      isActive 
                        ? "text-slate-900" 
                        : "text-slate-400 hover:text-slate-900"
                    }`}
                    id={`nav-item-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                    {isActive && (
                      <motion.div 
                        layoutId="navIndicator"
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-950 rounded-full shadow-sm"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </a>
                );
              })}
            </nav>

            {/* Search, Cart, Profile Section */}
            <div className="hidden md:flex items-center space-x-6">
              
              {/* Search Pill with Smart Suggest Dropdown */}
              <div ref={searchContainerRef} className="relative w-56 lg:w-64" id="search-container">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search premium pieces..."
                    value={searchQuery}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      setIsSearchFocused(true);
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm font-medium text-slate-800 placeholder-slate-400 rounded-full outline-none border border-transparent focus:border-slate-200 transition-all duration-200"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </form>

                {/* Autocomplete Suggestion Dropdown Panel */}
                <AnimatePresence>
                  {isSearchFocused && suggestedProducts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 overflow-hidden w-[280px] lg:w-[320px]"
                    >
                      <div className="px-4 pb-2 mb-2 border-b border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          QUICK RECOMMENDATIONS
                        </span>
                        <span className="text-[9px] font-extrabold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded uppercase font-mono">
                          {suggestedProducts.length} FOUND
                        </span>
                      </div>

                      <div className="space-y-1 max-h-[280px] overflow-y-auto no-scrollbar px-1">
                        {suggestedProducts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              if (onOpenProduct) {
                                onOpenProduct(p);
                              }
                              setIsSearchFocused(false);
                            }}
                            className="flex w-full items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all text-left group"
                          >
                            <div className="w-10 h-12 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100/50">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <span className="block text-xs font-bold text-slate-900 uppercase tracking-tight truncate">
                                {p.name}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                                {p.category}
                              </span>
                            </div>
                            <div className="text-right font-display text-xs font-extrabold text-slate-900 pr-1">
                              ${p.price.toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 border-t border-slate-50 pt-2 px-4 flex items-center justify-between text-[10px] text-slate-400 font-bold select-none">
                        <span>PRESS ENTER TO VIEW ALL</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notification Bell */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 rounded-full hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all duration-200"
                  aria-label="Notifications"
                >
                  <Bell className="w-[21px] h-[21px] stroke-[1.75]" />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white animate-pulse"
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 py-1"
                    >
                      <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 tracking-wider uppercase font-mono">Notifications</span>
                        {currentUser && unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-900 tracking-widest uppercase font-mono transition-colors border-0 bg-transparent cursor-pointer"
                          >
                            Mark All As Read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {!currentUser ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center">
                            <Lock className="w-10 h-10 text-slate-300 mb-3 stroke-[1.5]" />
                            <p className="text-xs font-semibold text-slate-800 tracking-wide uppercase mb-1">MEMBERS ATELIER ONLY</p>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-4">
                              Sign in to receive tracking updates for your orders and exclusive boutique offers.
                            </p>
                            <button
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                onOpenAuth();
                              }}
                              className="px-5 py-2 bg-slate-950 text-white text-[10px] font-bold tracking-widest uppercase rounded-full hover:bg-slate-800 transition-colors cursor-pointer border-0"
                            >
                              Sign In
                            </button>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center">
                            <Bell className="w-10 h-10 text-slate-200 mb-3 stroke-[1.5]" />
                            <p className="text-xs font-semibold text-slate-800 tracking-wide uppercase mb-1">ALL CAUGHT UP</p>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                              You will receive alerts about orders, promotional sales, and brand new launches here.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {notifications.map((notif) => {
                              const isUnread = notif.userId === 'broadcast'
                                ? !notif.readBy || !notif.readBy.includes(currentUser.uid)
                                : !notif.isRead;
                              return (
                                <div
                                  key={notif.id}
                                  onClick={() => handleMarkAsRead(notif)}
                                  className={`p-4 flex gap-3 cursor-pointer transition-all hover:bg-slate-50/50 ${
                                    isUnread ? 'bg-slate-50/30' : ''
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${getNotificationColor(notif.type)}`}>
                                    {getNotificationIcon(notif.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                      <h4 className={`text-[12px] font-bold tracking-tight text-slate-900 truncate ${isUnread ? 'font-extrabold' : ''}`}>
                                        {notif.title}
                                      </h4>
                                      <span className="text-[9px] font-bold font-mono text-slate-400 whitespace-nowrap">
                                        {formatRelativeTime(notif.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed break-words font-medium">
                                      {notif.message}
                                    </p>
                                  </div>
                                  {isUnread && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 shrink-0 mt-2" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Shopping Bag */}
              <button
                onClick={onOpenCart}
                className="relative p-2 rounded-full hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all duration-200 group"
                id="cart-trigger"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-[21px] h-[21px] stroke-[1.75]" />
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {currentUser ? (
                /* Profile Dropdown */
                <div className="relative">
                  <button
                    onClick={handleProfileClick}
                    className="p-2 rounded-full hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all duration-200"
                    id="profile-trigger"
                    aria-label="User Account"
                  >
                    <User className="w-[21px] h-[21px] stroke-[1.75]" />
                  </button>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsProfileDropdownOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2.5 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-slate-100">
                            <p className="text-xs text-slate-400">Signed in as</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.email}</p>
                          </div>
                          <div className="p-1">
                            {userData?.role === "admin" && (
                              <a
                                href="/admin/"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-[11px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors font-extrabold uppercase tracking-widest border border-transparent hover:border-emerald-100 mb-1 select-none"
                              >
                                <Shield className="w-4 h-4 text-emerald-600 shrink-0" /> Admin Panel
                              </a>
                            )}
                            <button
                              onClick={() => {
                                onOpenProfile("orders");
                                setIsProfileDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors font-semibold"
                            >
                              <Package className="w-4 h-4 text-slate-500" /> My Orders
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                              <Heart className="w-4 h-4 text-slate-500" /> My Favorites
                            </button>
                            <button
                              onClick={() => {
                                onOpenProfile("profile");
                                setIsProfileDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                              <Settings className="w-4 h-4 text-slate-500" /> Settings
                            </button>
                            <div className="h-[1px] bg-slate-100 my-1 mx-1" />
                            <button
                              onClick={() => {
                                logout();
                                setIsProfileDropdownOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50/50 rounded-lg transition-colors"
                            >
                              <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={onOpenAuth} className="text-sm font-bold text-slate-600 hover:text-slate-900 uppercase tracking-widest px-3 py-2">Login</button>
                  <button onClick={onOpenAuth} className="text-sm font-bold bg-slate-900 text-white px-5 py-2.5 rounded-full uppercase tracking-widest hover:bg-slate-800">Sign Up</button>
                </div>
              )}
            </div>

            {/* Mobile menu and cart controls */}
            <div className="flex md:hidden items-center space-x-3">
              {/* Mobile Notification Bell */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 rounded-full hover:bg-slate-50 text-slate-700"
                  aria-label="Notifications"
                >
                  <Bell className="w-[22px] h-[22px] stroke-[1.75]" />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full animate-pulse"
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-[290px] bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 py-1"
                    >
                      <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 tracking-wider uppercase font-mono">Notifications</span>
                        {currentUser && unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[9px] font-bold text-slate-500 hover:text-slate-900 tracking-widest uppercase font-mono transition-colors border-0 bg-transparent cursor-pointer"
                          >
                            Mark All
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto">
                        {!currentUser ? (
                          <div className="p-6 text-center flex flex-col items-center justify-center">
                            <Lock className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                            <p className="text-[10px] font-bold text-slate-800 tracking-wide uppercase mb-1">MEMBERS ONLY</p>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-3">
                              Sign in to view your notifications.
                            </p>
                            <button
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                onOpenAuth();
                              }}
                              className="px-4 py-1.5 bg-slate-950 text-white text-[9px] font-bold tracking-widest uppercase rounded-full hover:bg-slate-800 transition-colors border-0 cursor-pointer"
                            >
                              Sign In
                            </button>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-6 text-center flex flex-col items-center justify-center">
                            <Bell className="w-8 h-8 text-slate-200 mb-2 stroke-[1.5]" />
                            <p className="text-[10px] font-bold text-slate-800 tracking-wide uppercase mb-1">ALL CAUGHT UP</p>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                              You have no new alerts.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {notifications.map((notif) => {
                              const isUnread = notif.userId === 'broadcast'
                                ? !notif.readBy || !notif.readBy.includes(currentUser.uid)
                                : !notif.isRead;
                              return (
                                <div
                                  key={notif.id}
                                  onClick={() => handleMarkAsRead(notif)}
                                  className={`p-3.5 flex gap-2.5 cursor-pointer transition-all hover:bg-slate-50/50 ${
                                    isUnread ? 'bg-slate-50/30' : ''
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 ${getNotificationColor(notif.type)}`}>
                                    {getNotificationIcon(notif.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                      <h4 className={`text-[11px] font-bold tracking-tight text-slate-900 truncate ${isUnread ? 'font-extrabold' : ''}`}>
                                        {notif.title}
                                      </h4>
                                      <span className="text-[8px] font-bold font-mono text-slate-400">
                                        {formatRelativeTime(notif.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-normal break-words font-medium">
                                      {notif.message}
                                    </p>
                                  </div>
                                  {isUnread && (
                                    <span className="w-1 h-1 rounded-full bg-slate-950 shrink-0 mt-1.5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={onOpenCart}
                className="relative p-2 rounded-full hover:bg-slate-50 text-slate-700"
                id="mobile-cart-trigger"
              >
                <ShoppingBag className="w-6 h-6 stroke-[1.75]" />
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 bg-slate-900 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {totalItems}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-full hover:bg-slate-50 text-slate-700"
                id="mobile-menu-trigger"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-100 bg-white shadow-inner overflow-hidden"
              id="mobile-drawer"
            >
              <div className="px-4 pt-4 pb-6 space-y-4">
                
                {/* Search in mobile */}
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 text-sm font-medium text-slate-800 placeholder-slate-400 rounded-full outline-none"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </form>

                {/* Links */}
                <div className="flex flex-col space-y-2">
                  {NAVIGATION_ITEMS.map((item) => {
                    const isActive = activeItem === item.label;
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        onClick={(e) => handleNavClick(item.label, e)}
                        className={`px-4 py-3 text-sm font-bold tracking-wide uppercase rounded-xl transition-all ${
                          isActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {item.label}
                      </a>
                    );
                  })}
                </div>

                {/* User email info */}
                <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                  {currentUser ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Account</p>
                          <p className="text-xs font-bold text-slate-700 font-mono">{currentUser.email}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onOpenProfile("profile");
                          }}
                          className="text-xs text-slate-900 underline font-extrabold uppercase tracking-wider"
                        >
                          Manage
                        </button>
                      </div>
                      
                      {userData?.role === "admin" && (
                        <a
                          href="/admin/"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <Shield className="w-4 h-4 text-emerald-300" /> Admin Dashboard
                        </a>
                      )}

                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenProfile("orders");
                        }}
                        className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Package className="w-4 h-4" /> My Past Purchases
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Not Logged In</p>
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        Sign In / Create Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
