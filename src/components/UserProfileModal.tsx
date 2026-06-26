import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  ShoppingBag, 
  Package, 
  Calendar, 
  Tag, 
  ShieldCheck, 
  Truck, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  RefreshCw, 
  User, 
  Mail, 
  Award, 
  Clock,
  ArrowLeft,
  Save,
  MapPin,
  CreditCard,
  Download,
  Phone,
  Shield,
  Percent,
  CheckCircle2,
  Lock
} from "lucide-react";
import { Product, Order, OrderItem } from "../types";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onAddToBag: (product: Product, size?: string, color?: string) => void;
  onOpenCart: () => void;
  initialTab?: "profile" | "orders";
}

// Initial default mock orders to display if no orders exist yet
export const DEFAULT_MOCK_ORDERS: Order[] = [
  {
    id: "KB-827419",
    date: "June 24, 2026",
    total: 172,
    status: "In Transit",
    items: [
      {
        product: {
          id: "ny-4",
          name: "LAYERING ORIGIN",
          category: "Fashion Woman",
          price: 90,
          image: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=600",
          badge: "Unique",
          description: "A multi-tone colorblocked crewneck sweat featuring asymmetrical geometric layers in soft sky blue, chalk white, and light heather grey."
        },
        quantity: 1,
        size: "M",
        color: "Sky/Cream/Grey"
      },
      {
        product: {
          id: "ny-5",
          name: "MELBURNE COLLEGE",
          category: "Fashion Woman",
          price: 82,
          image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600",
          badge: "Classic",
          description: "Collegiate heritage-inspired activewear crop paired with cozy shoulder knit cardigans. A signature streetwear aesthetic for dynamic autumn-winter layered layouts."
        },
        quantity: 1,
        size: "S",
        color: "Ivory White"
      }
    ]
  },
  {
    id: "KB-584729",
    date: "June 18, 2026",
    total: 163,
    status: "Delivered",
    items: [
      {
        product: {
          id: "ny-1",
          name: "PURPLE BROKLYN",
          category: "Fashion Woman",
          price: 85,
          image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600",
          badge: "Hot Choice",
          description: "A comfortable, premium fleece hoody sweatshirt in deep pastel purple. Designed with oversized cuffs, a cozy fleece lining, and standard kangaroo pocket for ultimate street style."
        },
        quantity: 1,
        size: "M",
        color: "Purple"
      },
      {
        product: {
          id: "ny-2",
          name: "CROPPED SPACE",
          category: "Fashion Woman",
          price: 78,
          image: "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?q=80&w=600",
          badge: "Trending",
          description: "A lightweight, cropped check plaid overshirt featuring loose drop shoulders and twin front pockets. Styled effortlessly with beige linen trousers."
        },
        quantity: 1,
        size: "S",
        color: "Beige Plaid"
      }
    ]
  },
  {
    id: "KB-392817",
    date: "June 10, 2026",
    total: 168,
    status: "Delivered",
    items: [
      {
        product: {
          id: "ny-6",
          name: "ROYALE LEATHER",
          category: "Fashion Woman",
          price: 84,
          image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600",
          badge: "Premium",
          description: "A sleek, vegan-leather biker jacket styled with authentic silver hardware accents, diagonal zippers, and a flattering waist-cropped silhouette."
        },
        quantity: 2,
        size: "S",
        color: "Noir Black"
      }
    ]
  }
];

export default function UserProfileModal({
  isOpen,
  onClose,
  orders,
  onAddToast,
  onAddToBag,
  onOpenCart,
  initialTab = "profile",
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "orders">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Processing" | "In Transit" | "Delivered">("All");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Editable Profile States
  const [profileName, setProfileName] = useState("Fortune Domination");
  const [profilePhone, setProfilePhone] = useState("+1 (555) 382-9174");
  const [profileBirthday, setProfileBirthday] = useState("1995-10-14");
  
  // Shipping Address States
  const [shippingStreet, setShippingStreet] = useState("1482 Broadway, Apt 4B");
  const [shippingCity, setShippingCity] = useState("New York");
  const [shippingZip, setShippingZip] = useState("10036");
  const [shippingCountry, setShippingCountry] = useState("United States");

  // Sync tab option if changed from the header triggers
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

  // Re-order past purchase items
  const handleReorder = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    order.items.forEach((item) => {
      onAddToBag(item.product, item.size, item.color);
    });
    onAddToast(`Added all items from Order ${order.id} back to your shopping bag!`, "success");
    onOpenCart();
  };

  // Simulated Save profile handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onAddToast("Account settings and shipping address updated successfully!", "success");
  };

  // Simulated receipt download
  const handleDownloadInvoice = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToast(`Generating invoice for Order ${orderId}...`, "info");
    setTimeout(() => {
      onAddToast(`Invoice-${orderId}.pdf downloaded successfully!`, "success");
    }, 1500);
  };

  // Status Badge visual styles
  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "Processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 select-none">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Processing
          </span>
        );
      case "In Transit":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 select-none">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            In Transit
          </span>
        );
      case "Delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 select-none">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200 select-none">
            Cancelled
          </span>
        );
    }
  };

  // Render tracking timeline stepper
  const renderTimeline = (status: Order["status"]) => {
    const steps = [
      { name: "Order Placed", reached: true, current: status === "Processing" },
      { name: "Processing", reached: status !== "Cancelled", current: status === "Processing" },
      { name: "Shipped", reached: status === "In Transit" || status === "Delivered", current: status === "In Transit" },
      { name: "Delivered", reached: status === "Delivered", current: status === "Delivered" },
    ];

    return (
      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {steps.map((step, idx) => (
            <React.Fragment key={step.name}>
              {/* Connector line */}
              {idx > 0 && (
                <div 
                  className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${
                    steps[idx].reached ? "bg-slate-900" : "bg-slate-200"
                  }`} 
                />
              )}
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    step.current 
                      ? "bg-slate-900 border-slate-900 text-white ring-4 ring-slate-100" 
                      : step.reached 
                      ? "bg-slate-900 border-slate-900 text-white" 
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  {idx + 1}
                </div>
                <span className={`text-[10px] font-extrabold mt-1.5 tracking-tight uppercase ${
                  step.current ? "text-slate-900" : step.reached ? "text-slate-700" : "text-slate-400"
                }`}>
                  {step.name}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // Search & Filter computation
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) => item.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Derived metrics
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const inTransitCount = orders.filter((o) => o.status === "In Transit").length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-[60] bg-slate-50 flex flex-col overflow-hidden"
      id="user-profile-fullscreen-page"
    >
      {/* 1. Portal Navigation Header */}
      <header className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Back button */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95 border border-slate-200/60"
            id="profile-back-to-store"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            Back to Store
          </button>

          {/* Title */}
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none">Klamby Portal</span>
            <span className="text-sm font-black text-slate-900 mt-1 uppercase tracking-wider">Customer Dashboard</span>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2.5">
            <span className="hidden md:inline-block text-xs font-bold text-slate-500">
              Logged in as <strong className="text-slate-800">fortunedomination@gmail.com</strong>
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
              FD
            </div>
          </div>

        </div>
      </header>

      {/* 2. Main Page Layout Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto">
        
        {/* Left Side: Sticky Navigation Sidebar */}
        <aside className="w-full lg:w-72 bg-white lg:bg-transparent border-b lg:border-b-0 lg:border-r border-slate-200 p-4 sm:p-6 lg:p-8 flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-6 sm:space-y-8">
            
            {/* Minimal Profile Card */}
            <div className="flex items-center lg:flex-col gap-4 lg:text-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="relative">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-950 text-white rounded-full flex items-center justify-center text-xl lg:text-2xl font-black shadow-inner">
                  FD
                </div>
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Active Account" />
              </div>

              <div className="flex-1 lg:flex-none">
                <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">{profileName}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Diamond Privilege Tier</p>
                <div className="inline-flex items-center gap-1 mt-2.5 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border border-amber-100">
                  <Award className="w-3 h-3" />
                  Elite Member
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Options */}
            <nav className="flex lg:flex-col gap-2 bg-slate-100/80 lg:bg-transparent p-1.5 lg:p-0 rounded-xl">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                  activeTab === "profile"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                My Profile
              </button>

              <button
                onClick={() => setActiveTab("orders")}
                className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                  activeTab === "orders"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
                id="orders-tab-trigger"
              >
                <Package className="w-4 h-4 shrink-0" />
                Order History
              </button>
            </nav>

          </div>

          {/* Secure verification notice */}
          <div className="hidden lg:flex items-center justify-center gap-1.5 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-8">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified Klamby Account
          </div>
        </aside>

        {/* Right Side: Active Workspace Section */}
        <main className="flex-1 overflow-y-auto bg-white p-4 sm:p-8 lg:p-10">
          <AnimatePresence mode="wait">
            
            {/* PROFILE & SETTINGS VIEW */}
            {activeTab === "profile" && (
              <motion.div
                key="profile-tab-content"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Intro Title */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">Account Details</h1>
                  <p className="text-sm text-slate-500 mt-1.5">Manage your personal information, address books, and loyalty benefits.</p>
                </div>

                {/* Profile Form Block */}
                <form onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
                  
                  {/* Grid fields */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/70 space-y-5">
                    <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" /> Personal Identity
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition-all focus:ring-1 focus:ring-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Email</label>
                        <div className="relative">
                          <input
                            type="email"
                            disabled
                            value="fortunedomination@gmail.com"
                            className="w-full pl-4 pr-10 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed select-none"
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition-all focus:ring-1 focus:ring-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Date of Birth</label>
                        <input
                          type="date"
                          value={profileBirthday}
                          onChange={(e) => setProfileBirthday(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-slate-800 transition-all focus:ring-1 focus:ring-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address Form */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/70 space-y-5">
                    <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-500" /> Primary Shipping Destination
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Street Address</label>
                        <input
                          type="text"
                          required
                          value={shippingStreet}
                          onChange={(e) => setShippingStreet(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition-all focus:ring-1 focus:ring-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">City</label>
                        <input
                          type="text"
                          required
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition-all focus:ring-1 focus:ring-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ZIP / Postal Code</label>
                        <input
                          type="text"
                          required
                          value={shippingZip}
                          onChange={(e) => setShippingZip(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition-all focus:ring-1 focus:ring-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Country</label>
                        <input
                          type="text"
                          required
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition-all focus:ring-1 focus:ring-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loyalty progress info */}
                  <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-widest">Klamby Rewards Portal</span>
                      </div>
                      <span className="text-xs text-amber-400 font-extrabold uppercase">1,250 / 1,500 XP</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-amber-400 h-2 rounded-full" style={{ width: "83.3%" }} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">You need 250 more points to secure **Elite Double Diamond** rank for 2027.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      <p className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        Free Global Express
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        Early Dropping Access
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        24/7 Concierge Service
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        Double Rewards Points
                      </p>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/70 space-y-4">
                    <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-500" /> Saved Payment Methods
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Black Card */}
                      <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between h-36 relative overflow-hidden select-none">
                        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 bg-white/5 rounded-full" />
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black tracking-widest italic text-slate-300">VISA DEBIT</span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full uppercase border border-emerald-900">Primary</span>
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold tracking-widest text-slate-300">•••• •••• •••• 4242</p>
                          <div className="flex justify-between items-end mt-4">
                            <div>
                              <p className="text-[8px] text-slate-500 uppercase tracking-wider">Card Holder</p>
                              <p className="text-[10px] font-black uppercase tracking-wider text-white mt-0.5">{profileName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] text-slate-500 uppercase tracking-wider">Expires</p>
                              <p className="text-[10px] font-black mt-0.5">09/29</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add payment method */}
                      <button
                        type="button"
                        onClick={() => onAddToast("Direct secure wallet configurations are synchronized with your device keychain.", "info")}
                        className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-slate-800 transition-all bg-white hover:bg-slate-50/50 h-36"
                      >
                        <CreditCard className="w-6 h-6 mb-2 stroke-[1.5]" />
                        <span className="text-xs font-black uppercase tracking-widest">Add New Card</span>
                        <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Apple Pay / Google Pay Enabled</span>
                      </button>
                    </div>
                  </div>

                  {/* Save button */}
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-950 text-white hover:bg-slate-850 text-xs font-black uppercase tracking-widest rounded-2xl transition-all active:scale-98 shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    Save Account Settings
                  </button>

                </form>
              </motion.div>
            )}

            {/* ORDER HISTORY VIEW */}
            {activeTab === "orders" && (
              <motion.div
                key="orders-tab-content"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 animate-fade-in"
              >
                {/* Intro Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">Purchase History</h1>
                    <p className="text-sm text-slate-500 mt-1.5">Track shipment statuses, review past purchases, and download invoice copies.</p>
                  </div>
                  <span className="self-start sm:self-center px-4 py-1.5 bg-slate-100 border border-slate-200/50 text-slate-800 text-xs font-black rounded-full select-none">
                    Total Orders Placed: {orders.length}
                  </span>
                </div>

                {/* KPI Summary Banner */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Investment</p>
                    <p className="text-lg sm:text-xl font-black text-slate-900 mt-2">${totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Shipments</p>
                    <p className="text-lg sm:text-xl font-black text-slate-900 mt-2">{orders.length}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Transit</p>
                    <p className="text-lg sm:text-xl font-black text-amber-600 mt-2">{inTransitCount}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivered</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 mt-2">{deliveredCount}</p>
                  </div>
                </div>

                {/* Filter and Search Row */}
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search past purchases by Order ID or item name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all focus:ring-1 focus:ring-slate-800"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Status Filters */}
                  <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl self-start md:self-auto overflow-x-auto select-none border border-slate-200/40">
                    {(["All", "Processing", "In Transit", "Delivered"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                          statusFilter === status
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders Content Block */}
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => {
                        const isExpanded = !!expandedOrders[order.id];
                        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                        const trackingNumber = `TRK-${order.id.replace("KB-", "")}-${order.id.charCodeAt(3) || "9"}${order.id.charCodeAt(4) || "5"}X`;
                        const computedSubtotal = order.items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
                        const computedDiscount = Math.max(0, computedSubtotal - order.total);

                        return (
                          <motion.div
                            key={order.id}
                            layout="position"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
                          >
                            {/* Header Overview - Clickable */}
                            <div
                              onClick={() => toggleOrderExpand(order.id)}
                              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/30 transition-colors"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                                  <p className="text-xs font-black text-slate-800 font-mono mt-0.5">{order.id}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Order Date</p>
                                  <p className="text-xs font-bold text-slate-700 mt-0.5">{order.date}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Investment</p>
                                  <p className="text-xs font-black text-slate-900 mt-0.5">${order.total.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Courier Status</p>
                                  <div className="mt-0.5">{getStatusBadge(order.status)}</div>
                                </div>
                              </div>

                              {/* Action Items */}
                              <div className="flex items-center gap-3 self-end md:self-auto">
                                <button
                                  onClick={(e) => handleReorder(order, e)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 text-white hover:bg-slate-850 text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 uppercase tracking-wider"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Re-order
                                </button>
                                <div className="p-2 bg-slate-50 border border-slate-200/60 text-slate-400 rounded-xl">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>
                            </div>

                            {/* Detailed Dropdown Panel */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="border-t border-slate-100 bg-slate-50/20 px-6 py-6 space-y-6"
                                >
                                  {/* Section Title */}
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                                      Line Items ({itemCount})
                                    </h4>
                                    
                                    <button
                                      onClick={(e) => handleDownloadInvoice(order.id, e)}
                                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-950 font-black uppercase tracking-wider hover:underline"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Download Invoice
                                    </button>
                                  </div>

                                  {/* List items */}
                                  <div className="space-y-3.5">
                                    {order.items.map((item, idx) => (
                                      <div
                                        key={`${item.product.id}-${idx}`}
                                        className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-xl p-3"
                                      >
                                        <img
                                          src={item.product.image}
                                          alt={item.product.name}
                                          className="w-14 h-14 object-cover rounded-lg bg-slate-100 shrink-0 select-none border border-slate-200/40"
                                          referrerPolicy="no-referrer"
                                        />

                                        <div className="flex-1 min-w-0">
                                          <h5 className="text-sm font-black text-slate-900 truncate tracking-wide">
                                            {item.product.name}
                                          </h5>
                                          <p className="text-xs text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                                            {item.product.category}
                                          </p>
                                          
                                          {/* Options indicators */}
                                          <div className="flex flex-wrap gap-2.5 mt-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/40">
                                              Size: <strong className="ml-1 text-slate-800">{item.size}</strong>
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/40">
                                              Color: <strong className="ml-1 text-slate-800">{item.color}</strong>
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-right shrink-0 select-none">
                                          <p className="text-sm font-extrabold text-slate-950">${item.product.price.toFixed(2)}</p>
                                          <p className="text-xs font-bold text-slate-400 mt-1">Qty: {item.quantity}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Invoice Receipt breakdown */}
                                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 text-xs space-y-2.5 max-w-md ml-auto">
                                    <div className="flex justify-between text-slate-500 font-medium">
                                      <span>Items Subtotal</span>
                                      <span>${computedSubtotal.toFixed(2)}</span>
                                    </div>
                                    {computedDiscount > 0 && (
                                      <div className="flex justify-between text-rose-600 font-semibold">
                                        <span>Membership Discount</span>
                                        <span>-${computedDiscount.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-slate-500 font-medium">
                                      <span>Complimentary Courier Shipping</span>
                                      <span className="text-emerald-600 uppercase font-bold text-[10px]">FREE</span>
                                    </div>
                                    <div className="h-[1px] bg-slate-100 my-1" />
                                    <div className="flex justify-between text-slate-900 font-black text-sm uppercase tracking-wide">
                                      <span>Grand Total</span>
                                      <span>${order.total.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  {/* Tracking timeline pipeline */}
                                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3 mb-4">
                                      <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tracking Number</p>
                                        <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">{trackingNumber}</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(trackingNumber);
                                          onAddToast("Tracking number copied to clipboard!", "success");
                                        }}
                                        className="self-start sm:self-auto text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
                                      >
                                        Copy Tracking
                                      </button>
                                    </div>

                                    {renderTimeline(order.status)}
                                  </div>

                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center select-none bg-white border border-slate-200 rounded-3xl p-8"
                      >
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">No matching orders found</h3>
                        <p className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
                          Try adjusting your filters or search terms, or place a new order using the checkout cart.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

      </div>
    </motion.div>
  );
}
