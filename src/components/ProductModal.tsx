import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import { 
  ArrowLeft, 
  Clock, 
  Heart, 
  ChevronDown, 
  ChevronUp, 
  X, 
  ChevronRight,
  ShoppingBag,
  Shield,
  RotateCcw
} from "lucide-react";
import { NEW_YEAR_PRODUCTS } from "../data";
import LiveCartCounter from "./LiveCartCounter";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToBag: (product: Product, size: string, color: string) => void;
  onSelectProduct?: (product: Product) => void;
}

interface Review {
  name: string;
  rating: number;
  date: string;
  comment: string;
  avatar: string;
}

export default function ProductModal({ 
  product, 
  onClose, 
  onAddToBag,
  onSelectProduct 
}: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState("S");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDescOpen, setIsDescOpen] = useState(true);
  const [isShippingOpen, setIsShippingOpen] = useState(true);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(9025); // 2 hours, 30 mins, 25 secs
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Countdown timer for next-day delivery
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 9025));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format countdown time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Reset states when the product changes
  useEffect(() => {
    if (product) {
      setSelectedSize("S");
      setSelectedColor(product.colors?.[0] || "Default");
      setActiveImageIndex(0);
      setIsWishlisted(false);
      
      // Smoothly scroll to top of the modal page when switching products
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [product]);

  if (!product) return null;

  // Compute a stable pseudo-random remaining stock based on product ID
  const stockRemaining = (product.id.charCodeAt(product.id.length - 1) % 6) + 3;

  // Curated review list for the interactive slider
  const reviews: Review[] = [
    {
      name: "Alex Mathio",
      rating: 5,
      date: "13 Oct 2024",
      comment: "Nextgen's dedication to sustainability and ethical practices resonates strongly with today's consumers, positioning the brand as a responsible choice in the fashion world.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200"
    },
    {
      name: "Sarah Jenkins",
      rating: 5,
      date: "18 Nov 2024",
      comment: "The material feels incredibly premium and soft on the skin. It fits perfectly true to size, and the delivery was remarkably fast! Absolute staple in my wardrobe.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200"
    },
    {
      name: "David K.",
      rating: 4,
      date: "04 Dec 2024",
      comment: "Great silhouette and comfortable heavy-weight feel. The collar and cuffs hold up well after multiple washes. Definitely going to buy in other colors.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200"
    }
  ];

  // Image gallery builder for different products to have 3 stunning high-fashion previews
  const getProductGallery = (id: string, mainImage: string): string[] => {
    const mappings: Record<string, string[]> = {
      "ny-1": [
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800",
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800",
        "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=800"
      ],
      "ny-2": [
        "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?q=80&w=800",
        "https://images.unsplash.com/photo-1598554889165-8139a49f2883?q=80&w=800",
        "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800"
      ],
      "ny-3": [
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800",
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800",
        "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=800"
      ],
      "ny-4": [
        "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=800",
        "https://images.unsplash.com/photo-1551799517-eb8f03cb5e6a?q=80&w=800",
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800"
      ],
      "ny-5": [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800",
        "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=800",
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800"
      ],
      "ny-6": [
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800",
        "https://images.unsplash.com/photo-1521223890158-f9f7c3d5bab3?q=80&w=800",
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=800"
      ]
    };
    return mappings[id] || [mainImage, mainImage, mainImage];
  };

  const images = getProductGallery(product.id, product.image);

  // Curated recommendation cards that map exactly to the design layout
  const recommendations = [
    {
      product: NEW_YEAR_PRODUCTS[2] || product, // BIRMANIA SUNT
      name: "Polo with Contrast Trims",
      price: 212,
      originalPrice: 242,
      discount: "-20%",
      rating: "4.0/5",
      stars: 4,
      image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=500"
    },
    {
      product: NEW_YEAR_PRODUCTS[3] || product, // LAYERING ORIGIN
      name: "Gradient Graphic T-shirt",
      price: 145,
      originalPrice: null,
      discount: null,
      rating: "3.5/5",
      stars: 3,
      image: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=500"
    },
    {
      product: NEW_YEAR_PRODUCTS[4] || product, // MELBURNE COLLEGE
      name: "Polo with Tipping Details",
      price: 180,
      originalPrice: null,
      discount: null,
      rating: "4.5/5",
      stars: 5,
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=500"
    },
    {
      product: NEW_YEAR_PRODUCTS[5] || product, // ROYALE LEATHER
      name: "Striped Jacket",
      price: 120,
      originalPrice: 160,
      discount: "-30%",
      rating: "5.0/5",
      stars: 5,
      image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=500"
    }
  ];

  // Dynamic estimate delivery date formatting (e.g. 3-4 working days from current turn date Jun 25, 2026)
  // This will render "28 - 29 June 2026"
  const getDeliveryEstimation = () => {
    return "28 - 29 June 2026";
  };

  const handleNextReview = () => {
    setActiveReviewIndex((prev) => (prev + 1) % reviews.length);
  };

  const handleAddToCart = () => {
    onAddToBag(product, selectedSize, selectedColor);
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="w-full bg-white relative"
        ref={scrollContainerRef}
        id="product-details-page-viewport"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
          
          {/* Breadcrumbs Left Row */}
          <div className="mb-8 flex items-center justify-between">
            <button 
              onClick={onClose} 
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-semibold tracking-wide transition-colors uppercase select-none"
              id="back-to-home-btn"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Home</span>
              <span className="text-slate-300 font-light">/</span>
              <span className="text-slate-800 font-bold">Product details</span>
            </button>

            {/* Top Close icon for desktop view */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-950 rounded-full hover:bg-slate-50 transition-colors"
              aria-label="Close page"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Main Product Section Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
            
            {/* Image Columns (Left - 6 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Large Image Showcase Frame */}
              <div className="relative bg-[#f4f4f4] rounded-[24px] overflow-hidden aspect-[4/5] flex items-center justify-center select-none shadow-xs group">
                <img
                  src={images[activeImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover object-center transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  id="main-showcase-image"
                />

                {/* Header Slider Indicator Lines inside Showcase */}
                <div className="absolute top-4 inset-x-4 flex gap-2 z-10">
                  {images.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
                        idx === activeImageIndex ? "bg-white" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Three Thumbnails Row */}
              <div className="grid grid-cols-3 gap-4 select-none">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`aspect-[4/5] bg-[#f4f4f4] rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                      idx === activeImageIndex 
                        ? "border-slate-950 scale-[1.02] shadow-xs" 
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} detail view ${idx + 1}`}
                      className="w-full h-full object-cover object-center"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product details panel (Right - 5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                {/* Category Label Capsule */}
                <div className="mb-3">
                  <span className="inline-block bg-[#f4f5f6] text-slate-500 text-xs font-semibold tracking-wider px-4 py-1.5 rounded-full select-none">
                    {product.category || "Man Fashion"}
                  </span>
                </div>

                {/* Title */}
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight uppercase mb-2 select-none" id="details-product-title">
                  {product.name}
                </h1>

                {/* Price */}
                <div className="flex flex-col gap-1 mb-5">
                  <div className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-950 select-none">
                    ${product.price.toFixed(2)}
                  </div>
                  {product.cartCount && product.cartCount > 0 && (
                    <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full w-fit">
                      {product.cartCount} people have this in their cart
                    </span>
                  )}
                </div>

                {/* Next Day Delivery Countdown Pill */}
                <div className="flex items-center gap-2.5 bg-slate-50/80 border border-slate-100 px-4 py-3 rounded-full mb-6 select-none max-w-sm">
                  <Clock className="w-4 h-4 text-slate-900 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">
                    Order in <span className="font-mono text-slate-950 font-bold">{formatTime(timeLeft)}</span> to get next day delivery
                  </span>
                </div>

                {/* Stock Remaining Indicator */}
                <div className="mb-6 select-none max-w-sm bg-rose-50/40 border border-rose-100/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <span className="text-xs font-extrabold text-rose-600 uppercase tracking-wider">
                        Almost Gone
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Only <span className="text-rose-600 font-extrabold">{stockRemaining}</span> left in stock!
                    </span>
                  </div>
                  {/* Stock gauge bar indicator */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-700" 
                      style={{ width: `${(stockRemaining / 8) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Live Cart Counter Simulating Urgency */}
                <div className="mb-6 max-w-sm">
                  <LiveCartCounter productId={product.id} variant="detail" />
                </div>

                {/* Color Selection */}
                {product.colors && product.colors.length > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3 select-none">
                      <span className="text-xs font-bold text-slate-950 uppercase tracking-widest">
                        Select Color
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {product.colors.map((color) => {
                        const isSelected = selectedColor === color;
                        return (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`min-w-[54px] h-[54px] px-4 flex items-center justify-center text-xs font-bold rounded-full border transition-all ${
                              isSelected
                                ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                                : "bg-slate-50/50 border-slate-150 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3 select-none">
                    <span className="text-xs font-bold text-slate-950 uppercase tracking-widest">
                      Select Size
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {(product.sizes || ["S", "M", "L", "XL", "XXL"]).map((size) => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[54px] h-[54px] px-4 flex items-center justify-center text-xs font-bold rounded-full border transition-all ${
                            isSelected
                              ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                              : "bg-slate-50/50 border-slate-150 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CTA buttons row */}
                <div className="flex items-center gap-3 mb-8">
                  <button
                    onClick={handleAddToCart}
                    className="flex-grow h-[54px] bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs tracking-widest rounded-full uppercase shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 select-none"
                    id="add-to-cart-cta-btn"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className={`w-[54px] h-[54px] flex items-center justify-center rounded-full border transition-all ${
                      isWishlisted 
                        ? "bg-rose-50 border-rose-200 text-rose-500 scale-105" 
                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
                    }`}
                    aria-label="Add to wishlist"
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* 2. Styled Accordions Info Frame */}
                <div className="border-t border-slate-100 divide-y divide-slate-100 select-none">
                  
                  {/* Description & Fit Accordion */}
                  <div className="py-4">
                    <button
                      onClick={() => setIsDescOpen(!isDescOpen)}
                      className="w-full flex items-center justify-between py-1 text-sm font-bold text-slate-950 uppercase tracking-wider"
                    >
                      <span>Description & Fit</span>
                      {isDescOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isDescOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <p className="pt-3 text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                            {product.description || "Loose-fit sweatshirt hoodie in medium weight cotton-blend fabric with a generous, but not oversized silhouette. Jersey-lined, drawstring hood, dropped shoulders, long sleeves, and a kangaroo pocket. Wide ribbing at cuffs and hem. Soft, brushed inside."}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Shipping Accordion */}
                  <div className="py-4">
                    <button
                      onClick={() => setIsShippingOpen(!isShippingOpen)}
                      className="w-full flex items-center justify-between py-1 text-sm font-bold text-slate-950 uppercase tracking-wider"
                    >
                      <span>Shipping</span>
                      {isShippingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {isShippingOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                            
                            {/* Discount Cell */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">
                                <Shield className="w-3.5 h-3.5 text-slate-800" />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Discount</span>
                                <span className="text-xs font-bold text-slate-800">Disc 50%</span>
                              </div>
                            </div>

                            {/* Package Cell */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">
                                <Shield className="w-3.5 h-3.5 text-slate-800" />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Package</span>
                                <span className="text-xs font-bold text-slate-800">Regular Package</span>
                              </div>
                            </div>

                            {/* Delivery Time Cell */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">
                                <RotateCcw className="w-3.5 h-3.5 text-slate-800" />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Delivery Time</span>
                                <span className="text-xs font-bold text-slate-800">3-4 Working Days</span>
                              </div>
                            </div>

                            {/* Estimation Arrive Cell */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">
                                <Clock className="w-3.5 h-3.5 text-slate-800" />
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Estimation Arrive</span>
                                <span className="text-xs font-bold text-slate-800">{getDeliveryEstimation()}</span>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* 3. Rating & Reviews Block Frame */}
          <div className="border-t border-slate-100 pt-12 pb-16">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-950 uppercase tracking-wide mb-8 select-none">
              Rating & Reviews
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* Left summary side (5 columns) */}
              <div className="md:col-span-5 flex flex-col justify-center select-none">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display text-6xl sm:text-7xl font-extrabold text-slate-950 leading-none">
                    4,5
                  </span>
                  <span className="text-slate-400 text-lg font-bold">
                    /5
                  </span>
                </div>
                
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                  (50 New Reviews)
                </p>

                {/* Progress breakdown grid */}
                <div className="space-y-3 max-w-sm">
                  {/* 5 Stars row */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 w-12 text-right">5 Stars</span>
                    <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-950 w-full rounded-full" />
                    </div>
                  </div>

                  {/* 4 Stars row */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 w-12 text-right">4 Stars</span>
                    <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-950 w-[20%] rounded-full" />
                    </div>
                  </div>

                  {/* 3 Stars row */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 w-12 text-right">3 Stars</span>
                    <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-950 w-0 rounded-full" />
                    </div>
                  </div>

                  {/* 2 Stars row */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 w-12 text-right">2 Stars</span>
                    <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-950 w-0 rounded-full" />
                    </div>
                  </div>

                  {/* 1 Star row */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 w-12 text-right">1 Star</span>
                    <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-950 w-0 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right reviewer card side (7 columns) */}
              <div className="md:col-span-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeReviewIndex}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs relative flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      {/* Name, Stars, Date Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-sans font-bold text-slate-950 text-base mb-1 select-none">
                            {reviews[activeReviewIndex].name}
                          </h4>
                          <div className="text-xs font-bold text-slate-700">
                             Rating: {reviews[activeReviewIndex].rating}/5
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 select-none">
                          {reviews[activeReviewIndex].date}
                        </span>
                      </div>

                      {/* Comment */}
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium mb-6">
                        &quot;{reviews[activeReviewIndex].comment}&quot;
                      </p>
                    </div>

                    {/* Bottom row: Reviewer Avatar, Pagination and Controls */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                      {/* Reviewer avatar image */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 select-none border border-slate-100">
                        <img 
                          src={reviews[activeReviewIndex].avatar} 
                          alt={reviews[activeReviewIndex].name}
                          className="w-full h-full object-cover object-center"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Dots Pagination and Next Button */}
                      <div className="flex items-center gap-4">
                        {/* Slide indicators dots */}
                        <div className="flex gap-1.5 select-none">
                          {reviews.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveReviewIndex(idx)}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === activeReviewIndex ? "w-8 bg-slate-950" : "w-1.5 bg-slate-200"
                              }`}
                              aria-label={`Go to review ${idx + 1}`}
                            />
                          ))}
                        </div>

                        {/* Slide Next Arrow button */}
                        <button
                          onClick={handleNextReview}
                          className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-all active:scale-90 shadow-2xs"
                          aria-label="Next review"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </div>

          {/* 4. Recommendation Grid ("You might also like" section) */}
          <div className="border-t border-slate-100 pt-16">
            <div className="text-center mb-10 select-none">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-950 uppercase tracking-wider mb-2">
                You might also like
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {recommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  onClick={() => onSelectProduct && onSelectProduct(rec.product)}
                  className="group cursor-pointer"
                >
                  {/* Card Image Wrapper */}
                  <div className="relative bg-[#f4f4f4] rounded-2xl sm:rounded-[24px] overflow-hidden aspect-[4/5] mb-3 select-none">
                    <img
                      src={rec.image}
                      alt={rec.name}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Title */}
                  <h3 className="font-sans font-bold text-xs sm:text-sm text-slate-900 group-hover:text-slate-800 transition-colors uppercase tracking-tight truncate select-none mb-1">
                    {rec.name}
                  </h3>

                  {/* Rating Line */}
                  <div className="flex items-center gap-1 mb-1.5 select-none">
                    <div className="text-[10px] font-bold text-slate-500">
                      Rating: {rec.stars}/5
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {rec.rating}
                    </span>
                  </div>

                  {/* Price Line with original price and discount */}
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-950">
                      ${rec.price}
                    </span>
                    {rec.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        ${rec.originalPrice}
                      </span>
                    )}
                    {rec.discount && (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-sm">
                        {rec.discount}
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
