import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product, Review } from "../types";
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
  RotateCcw,
  Star,
  Trash2
} from "lucide-react";
import { NEW_YEAR_PRODUCTS } from "../data";
import LiveCartCounter from "./LiveCartCounter";
import { formatNaira } from "../utils/currency";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy } from "firebase/firestore";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToBag: (product: Product, size: string, color: string) => void;
  onSelectProduct?: (product: Product) => void;
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

  const { currentUser, userData } = useAuth();
  const [firestoreReviews, setFirestoreReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [ratingHover, setRatingHover] = useState<number | null>(null);

  useEffect(() => {
    if (!product) return;
    const q = query(
      collection(db, "reviews"),
      where("productId", "==", product.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory by createdAt desc
      fetched.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setFirestoreReviews(fetched);
    }, (err) => {
      console.error("Error loading reviews:", err);
    });
    return () => unsubscribe();
  }, [product?.id]);

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

  // Curated fallback review list for the interactive slider
  const baseReviews = [
    {
      id: "base-1",
      name: "Alex Mathio",
      rating: 5,
      date: "13 Oct 2024",
      comment: "Nextgen's dedication to sustainability and ethical practices resonates strongly with today's consumers, positioning the brand as a responsible choice in the fashion world.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200",
      isStatic: true,
      userId: "static-1",
      email: "alex@example.com"
    },
    {
      id: "base-2",
      name: "Sarah Jenkins",
      rating: 5,
      date: "18 Nov 2024",
      comment: "The material feels incredibly premium and soft on the skin. It fits perfectly true to size, and the delivery was remarkably fast! Absolute staple in my wardrobe.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200",
      isStatic: true,
      userId: "static-2",
      email: "sarah@example.com"
    },
    {
      id: "base-3",
      name: "David K.",
      rating: 4,
      date: "04 Dec 2024",
      comment: "Great silhouette and comfortable heavy-weight feel. The collar and cuffs hold up well after multiple washes. Definitely going to buy in other colors.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200",
      isStatic: true,
      userId: "static-3",
      email: "david@example.com"
    }
  ];

  // Convert firestoreReviews into compatible Review objects
  const formattedFirestoreReviews = firestoreReviews.map(r => ({
    id: r.id,
    name: r.userName,
    email: r.userEmail,
    rating: r.rating,
    date: new Date(r.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }),
    comment: r.comment,
    avatar: r.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.userName)}`,
    userId: r.userId,
    isStatic: false
  }));

  const reviews = [...formattedFirestoreReviews, ...baseReviews];

  const totalReviewsCount = reviews.length;
  const averageRating = totalReviewsCount > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1)
    : "5.0";

  const starCounts = [0, 0, 0, 0, 0]; // Index 0 is 1 star, 4 is 5 stars
  reviews.forEach(r => {
    const starIdx = Math.max(1, Math.min(5, Math.round(r.rating))) - 1;
    starCounts[starIdx]++;
  });

  const getStarPercentage = (stars: number) => {
    if (totalReviewsCount === 0) return 0;
    return (starCounts[stars - 1] / totalReviewsCount) * 100;
  };

  // Handlers for reviews
  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, "reviews", reviewId));
      setReviewSuccess("Review deleted successfully.");
      setActiveReviewIndex(0);
      setTimeout(() => setReviewSuccess(""), 3000);
    } catch (err) {
      console.error("Error deleting review:", err);
      setReviewError("Failed to delete review.");
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setReviewError("You must be logged in to leave a review.");
      return;
    }
    if (!newComment.trim()) {
      setReviewError("Please write a review comment.");
      return;
    }
    if (newRating < 1 || newRating > 5) {
      setReviewError("Please select a valid rating.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      const initialsAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData?.name || currentUser.displayName || "Client")}`;
      await addDoc(collection(db, "reviews"), {
        productId: product.id,
        userId: currentUser.uid,
        userName: userData?.name || currentUser.displayName || "Anonymous Client",
        userEmail: currentUser.email || userData?.email || "",
        rating: newRating,
        comment: newComment.trim(),
        createdAt: new Date().toISOString(),
        avatar: currentUser.photoURL || initialsAvatar
      });

      setNewComment("");
      setNewRating(5);
      setReviewSuccess("Thank you! Your review has been added.");
      setTimeout(() => setReviewSuccess(""), 4000);
    } catch (err) {
      console.error("Error adding review:", err);
      setReviewError("Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

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

              {/* Share Your Experience Rating & Review Form (Inside empty left column space to balance height) */}
              <div className="mt-8 select-none bg-slate-50/40 p-6 sm:p-8 rounded-[24px] border border-slate-100" id="reviews-form-container-left">
                <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-widest mb-4">
                  Share Your Experience
                </h3>

                {currentUser ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    {/* Interactive Stars Selection */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Your Rating
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = ratingHover !== null ? star <= ratingHover : star <= newRating;
                          return (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setNewRating(star)}
                              onMouseEnter={() => setRatingHover(star)}
                              onMouseLeave={() => setRatingHover(null)}
                              className="p-1 -ml-1 text-slate-200 hover:scale-110 transition-transform cursor-pointer"
                              aria-label={`Rate ${star} Stars`}
                            >
                              <Star 
                                className={`w-5 h-5 transition-colors ${
                                  isFilled ? "fill-amber-400 text-amber-400" : "text-slate-300"
                                }`} 
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comment input */}
                    <div>
                      <label htmlFor="review-comment-input-left" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Your Comment
                      </label>
                      <textarea
                        id="review-comment-input-left"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your honest thoughts about this piece..."
                        className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-hidden resize-none bg-white shadow-3xs"
                      />
                    </div>

                    {/* Error & Success States */}
                    {reviewError && (
                      <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">
                        {reviewError}
                      </p>
                    )}
                    {reviewSuccess && (
                      <p className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                        {reviewSuccess}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full h-11 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-[10px] tracking-widest rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-white border border-slate-150 rounded-2xl text-center shadow-3xs">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Sign In to Review
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal font-medium">
                      Only registered clients can leave a verified rating & review.
                    </p>
                  </div>
                )}
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
                    {formatNaira(product.price)}
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
              <div className="md:col-span-5 flex flex-col">
                <div className="select-none">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-display text-6xl sm:text-7xl font-extrabold text-slate-950 leading-none">
                      {averageRating}
                    </span>
                    <span className="text-slate-400 text-lg font-bold">
                      /5
                    </span>
                  </div>
                  
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    ({totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'})
                  </p>

                  {/* Progress breakdown grid */}
                  <div className="space-y-3 max-w-sm mb-6">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const pct = getStarPercentage(stars);
                      return (
                        <div key={stars} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-700 w-12 text-right">{stars} {stars === 1 ? 'Star' : 'Stars'}</span>
                          <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-slate-950 rounded-full transition-all duration-500" 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 w-8 text-left">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right reviewer card side (7 columns) */}
              <div className="md:col-span-7">
                {reviews.length > 0 ? (
                  (() => {
                    const safeReviewIndex = activeReviewIndex % reviews.length;
                    const currentReview = reviews[safeReviewIndex] || reviews[0];
                    return (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={safeReviewIndex}
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs relative flex flex-col justify-between min-h-[240px]"
                        >
                          <div>
                            {/* Name, Stars, Date Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-sans font-bold text-slate-950 text-base select-none">
                                    {currentReview.name}
                                  </h4>
                                  {/* Display Email if current user is admin */}
                                  {userData?.role === "admin" && currentReview.email && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">
                                      {currentReview.email}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Stars Display */}
                                <div className="flex items-center gap-0.5 mt-1 select-none">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3.5 h-3.5 ${
                                        s <= currentReview.rating 
                                          ? "fill-slate-900 text-slate-900" 
                                          : "text-slate-200"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 select-none">
                                  {currentReview.date}
                                </span>

                                {/* Delete Button for admin or owner */}
                                {(userData?.role === "admin" || (currentUser && currentUser.uid === currentReview.userId)) && !currentReview.isStatic && (
                                  <button
                                    onClick={() => handleDeleteReview(currentReview.id)}
                                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors ml-1"
                                    title="Delete Review"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Comment */}
                            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium mb-6">
                              &quot;{currentReview.comment}&quot;
                            </p>
                          </div>

                          {/* Bottom row: Reviewer Avatar, Pagination and Controls */}
                          <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                            {/* Reviewer avatar image */}
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 select-none border border-slate-100 shrink-0">
                              <img 
                                src={currentReview.avatar} 
                                alt={currentReview.name}
                                className="w-full h-full object-cover object-center"
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            {/* Dots Pagination and Next Button */}
                            <div className="flex items-center gap-4">
                              {/* Slide indicators dots */}
                              <div className="flex gap-1.5 select-none max-w-[120px] overflow-hidden">
                                {reviews.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setActiveReviewIndex(idx)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      idx === safeReviewIndex ? "w-8 bg-slate-950" : "w-1.5 bg-slate-200"
                                    }`}
                                    aria-label={`Go to review ${idx + 1}`}
                                  />
                                ))}
                              </div>

                              {/* Slide Next Arrow button */}
                              <button
                                onClick={() => setActiveReviewIndex((prev) => (prev + 1) % reviews.length)}
                                className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-all active:scale-90 shadow-2xs"
                                aria-label="Next review"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>

                          </div>
                        </motion.div>
                      </AnimatePresence>
                    );
                  })()
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-150">
                    <p className="text-sm font-semibold text-slate-500">
                      No reviews available for this product.
                    </p>
                  </div>
                )}
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
                      {formatNaira(rec.price)}
                    </span>
                    {rec.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatNaira(rec.originalPrice)}
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
