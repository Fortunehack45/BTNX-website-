import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product, CartItem } from "../types";
import {
  ArrowLeft,
  Heart,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Shield,
  Truck,
  Star,
  Trash2,
  Ruler,
  Maximize2,
  X,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";
import { NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "../utils/currency";
import { getSwatchHex } from "../utils/colors";
import { getDiscountPercent } from "../utils/invoice";
import { useAuth } from "../context/AuthContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import GalleryImage from "./GalleryImage";
import {
  EDITORIAL_EASE,
  EDITORIAL_VIEWPORT,
  galleryContainerVariants,
  galleryCardVariants,
  modalBackdropVariants,
  modalPanelVariants,
  modalItemVariants,
} from "../utils/motion";

interface ProductModalProps {
  product: Product | null;
  cart?: CartItem[];
  onClose: () => void;
  onAddToBag: (product: Product, size: string, color: string) => void;
  onUpdateQuantity?: (productId: string, size: string, color: string, quantity: number) => void;
  onOpenCart?: () => void;
  onSelectProduct?: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
  onOpenAuth?: () => void;
}

const SIZE_CHART = [
  { size: "XS", chest: "102", shoulder: "46", sleeve: "61", length: "64" },
  { size: "S", chest: "108", shoulder: "48", sleeve: "62.5", length: "66" },
  { size: "M", chest: "114", shoulder: "50", sleeve: "64", length: "68.5" },
  { size: "L", chest: "120", shoulder: "52", sleeve: "65.5", length: "71" },
  { size: "XL", chest: "126", shoulder: "54", sleeve: "67", length: "73.5" },
];

export default function ProductModal({
  product,
  cart = [],
  onClose,
  onAddToBag,
  onUpdateQuantity,
  onOpenCart,
  onSelectProduct,
  isWishlisted = false,
  onToggleWishlist,
  onOpenAuth,
}: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState("S");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDescOpen, setIsDescOpen] = useState(true);
  const [isShippingOpen, setIsShippingOpen] = useState(true);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { currentUser, userData } = useAuth();
  const [firestoreReviews, setFirestoreReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [ratingHover, setRatingHover] = useState<number | null>(null);

  const parseTimestampMs = (val: any): number => {
    if (!val) return 0;
    if (typeof val?.toMillis === "function") return val.toMillis();
    if (typeof val?.toDate === "function") return val.toDate().getTime();
    const parsed = new Date(val).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    if (!product) return;
    const q = query(collection(db, "reviews"), where("productId", "==", product.id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        fetched.sort((a: any, b: any) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
        setFirestoreReviews(fetched);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "reviews");
      }
    );
    return () => unsubscribe();
  }, [product?.id]);

  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes?.[0] || "M");
      setSelectedColor(product.colors?.[0] || "Default");
      setActiveImageIndex(0);
      setIsZoomOpen(false);
      setShowAllReviews(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [product]);

  if (!product) return null;

  const stockRemaining = (product.id.charCodeAt(product.id.length - 1) % 6) + 3;

  const baseReviews = [
    {
      id: "base-1",
      name: "Amara Okafor",
      rating: 5,
      date: "13 Oct 2026",
      comment:
        "Substantial fabric weight and clean seam finishing. The drape holds its architectural shape even after travel.",
      isStatic: true,
      userId: "static-1",
      email: "",
    },
    {
      id: "base-2",
      name: "Daniel Adeyemi",
      rating: 5,
      date: "29 Oct 2026",
      comment:
        "True to tailored sizing with refined cuff proportions. Arrived neatly boxed within 48 hours.",
      isStatic: true,
      userId: "static-2",
      email: "",
    },
    {
      id: "base-3",
      name: "Claire Vance",
      rating: 4,
      date: "04 Nov 2026",
      comment:
        "Muted tone pairs effortlessly with wool trousers. Heavy organic cotton feels durable and breathable.",
      isStatic: true,
      userId: "static-3",
      email: "",
    },
  ];

  const formattedFirestoreReviews = firestoreReviews.map((r) => {
    const ms = parseTimestampMs(r.createdAt);
    const dateLabel = ms
      ? new Date(ms).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Recent";

    return {
      id: r.id,
      name: r.userName || "Atelier Client",
      email: r.userEmail || "",
      rating: Number(r.rating) || 5,
      date: dateLabel,
      comment: r.comment,
      userId: r.userId,
      isStatic: false,
    };
  });

  const reviews = [...formattedFirestoreReviews, ...baseReviews];
  const totalReviewsCount = reviews.length;
  const averageRating =
    totalReviewsCount > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1)
      : "5.0";

  const starCounts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    const idx = Math.max(1, Math.min(5, Math.round(r.rating))) - 1;
    starCounts[idx]++;
  });

  const getStarPercentage = (stars: number) =>
    totalReviewsCount === 0 ? 0 : (starCounts[stars - 1] / totalReviewsCount) * 100;

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, "reviews", reviewId));
      setReviewSuccess("Review removed.");
      setTimeout(() => setReviewSuccess(""), 3000);
    } catch (err) {
      setReviewError("Failed to remove review.");
      handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setReviewError("Please sign in to share your experience.");
      return;
    }
    if (!newComment.trim()) {
      setReviewError("Please share a few words about fit, fabric, or finish.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      await addDoc(collection(db, "reviews"), {
        productId: product.id,
        userId: currentUser.uid,
        userName: (userData?.name || currentUser.displayName || "Atelier Client").slice(0, 120),
        rating: newRating,
        comment: newComment.trim().slice(0, 2000),
        createdAt: new Date().toISOString(),
      });

      setNewComment("");
      setNewRating(5);
      setReviewSuccess("Thank you — your experience has been published.");
      setTimeout(() => setReviewSuccess(""), 4000);
    } catch (err) {
      setReviewError("Unable to publish review right now. Please try again.");
      handleFirestoreError(err, OperationType.CREATE, "reviews");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image, product.image, product.image];

  const complementaryPieces = NEW_YEAR_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 4);

  const variantItem = cart.find(
    (item) =>
      item.product.id === product.id &&
      (item.selectedSize || "M") === selectedSize &&
      (item.selectedColor || "Default") === selectedColor
  );
  const variantQty = variantItem?.quantity || 0;

  const handleAddToCart = () => {
    onAddToBag(product, selectedSize, selectedColor);
  };

  const handleBuyNow = () => {
    if (variantQty === 0) {
      onAddToBag(product, selectedSize, selectedColor);
    }
    if (onOpenCart) {
      onOpenCart();
    } else {
      onClose();
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      id="product-details-page-viewport"
      className="w-full bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] pb-20 lg:pb-0"
    >
      {/* Breadcrumb Bar */}
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-2.5 sm:py-4 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            id="back-to-home-btn"
            className="min-h-[44px] flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
            <span className="text-[#E6E2DA] dark:text-[#2C2A26]">/</span>
            <span className="text-[#141413] dark:text-[#F3F1EC] truncate max-w-[180px] sm:max-w-xs">{product.name}</span>
          </button>

          <span className="text-[11px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hidden sm:inline">
            {product.category}
          </span>
        </div>
      </div>

      {/* Main Contiguous Purchase Module */}
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-6 sm:py-10 lg:py-14">
          <motion.div
            variants={galleryContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start"
          >
            {/* Left: Sticky Studio Gallery */}
            <motion.div variants={modalItemVariants} className="lg:col-span-7 space-y-3 sm:space-y-4">
              <div
                onClick={() => setIsZoomOpen(true)}
                className="relative group aspect-[4/5] sm:aspect-[3/4] w-full bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm overflow-hidden cursor-zoom-in"
              >
                <AnimatePresence initial={false}>
                  <motion.div
                    key={`${images[activeImageIndex]}-${activeImageIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <GalleryImage
                      src={images[activeImageIndex]}
                      alt={product.name}
                      id="main-showcase-image"
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 m3-haze-photo rounded-sm flex items-center gap-1.5 text-[11px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                  <span>Inspect Detail</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`aspect-[3/4] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden rounded-sm border transition-all cursor-pointer ${
                      idx === activeImageIndex
                        ? "border-[#141413] dark:border-[#F3F1EC] ring-1 ring-[#141413] dark:ring-[#F3F1EC]"
                        : "border-[#E6E2DA] dark:border-[#2C2A26] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <GalleryImage
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      className="w-full h-full object-cover object-center"
                    />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Right: Sticky Purchase Panel */}
            <motion.div variants={galleryContainerVariants} className="lg:col-span-5 lg:sticky lg:top-24 space-y-7">
              <motion.div variants={modalItemVariants} className="space-y-3 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-[10px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                    <span className="truncate">{product.category}</span>
                    {product.badge && (
                      <>
                        <span aria-hidden="true" className="shrink-0">·</span>
                        <span className="text-[#966830] dark:text-[#C89B62] font-medium whitespace-nowrap shrink-0">{product.badge}</span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("garment-experience")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="flex items-center gap-1.5 text-xs text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Star className="w-3.5 h-3.5 fill-[#966830] dark:fill-[#C89B62] text-[#966830] dark:text-[#C89B62] shrink-0" />
                    <span className="font-mono font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                      {averageRating}
                    </span>
                    <span className="underline">({totalReviewsCount})</span>
                  </button>
                </div>

                <h1
                  id="details-product-title"
                  className="font-display text-3xl sm:text-4xl lg:text-[42px] font-medium text-[#141413] dark:text-[#F3F1EC] leading-[1.08] text-balance"
                >
                  {product.name}
                </h1>

                <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="font-mono text-2xl font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums whitespace-nowrap">
                      {formatNaira(product.price)}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <>
                        <span className="font-mono text-sm text-[#66625B] dark:text-[#A7A299] line-through tabular-nums whitespace-nowrap">
                          {formatNaira(product.originalPrice)}
                        </span>
                        <span className="px-2 py-0.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#966830]/40 dark:border-[#C89B62]/40 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#966830] dark:text-[#C89B62] rounded-sm whitespace-nowrap shrink-0">
                          Save {getDiscountPercent(product.price, product.originalPrice)}%
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">
                    Small-batch run · {stockRemaining} available
                  </span>
                </div>

                {product.description && (
                  <p
                    id="details-product-description"
                    className="text-sm text-[#66625B] dark:text-[#A7A299] leading-relaxed pt-2"
                  >
                    {product.description}
                  </p>
                )}
              </motion.div>

              {/* Colorway Selector with Real Swatches */}
              {product.colors && product.colors.length > 0 && (
                <motion.div variants={modalItemVariants} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                      Colorway
                    </span>
                    <span className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((color) => {
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`min-h-[44px] px-4 py-2 text-xs font-medium border rounded-sm flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#141413] dark:border-[#F3F1EC] bg-[#FAF9F7] dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] ring-1 ring-[#141413] dark:ring-[#F3F1EC]"
                              : "bg-white dark:bg-[#22211E] border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] dark:text-[#A7A299] hover:border-[#141413] dark:hover:border-[#F3F1EC] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/25 shrink-0"
                            style={{ backgroundColor: getSwatchHex(color) }}
                          />
                          <span>{color}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Size Selector + Size Guide Trigger */}
              <motion.div variants={modalItemVariants} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                    Size
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-medium text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] underline cursor-pointer"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Size Guide</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(product.sizes || ["S", "M", "L", "XL"]).map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-h-[44px] py-3 text-xs font-mono uppercase border rounded-sm transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#141413] dark:bg-[#F3F1EC] border-[#141413] dark:border-[#F3F1EC] text-white dark:text-[#141413]"
                            : "bg-white dark:bg-[#22211E] border-[#E6E2DA] dark:border-[#2C2A26] text-[#141413] dark:text-[#F3F1EC] hover:border-[#141413] dark:hover:border-[#F3F1EC]"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Primary Purchase Controls */}
              <motion.div variants={modalItemVariants} className="space-y-2.5 pt-1">
                <div className="flex items-stretch gap-3">
                  {variantQty > 0 && onUpdateQuantity ? (
                    <div className="flex-1 min-h-[50px] border border-[#141413] dark:border-[#F3F1EC]/75 bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm flex items-center justify-between overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(product.id, selectedSize, selectedColor, variantQty - 1)
                        }
                        aria-label="Decrease quantity in bag"
                        className="w-14 h-full flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#E6E2DA]/70 dark:hover:bg-[#2E2C28] transition-colors cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenCart && onOpenCart()}
                        className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums cursor-pointer hover:underline"
                      >
                        {variantQty} in Bag
                      </button>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        aria-label="Increase quantity in bag"
                        className="w-14 h-full flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#E6E2DA]/70 dark:hover:bg-[#2E2C28] transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      id="add-to-cart-cta-btn"
                      className="flex-1 py-4 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.15em] rounded-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Bag</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleWishlist && onToggleWishlist(product)}
                    className={`w-14 border rounded-sm flex items-center justify-center transition-colors cursor-pointer ${
                      isWishlisted
                        ? "border-[#966830] dark:border-[#C89B62] bg-[#FAF9F7] dark:bg-[#22211E] text-[#966830] dark:text-[#C89B62]"
                        : "border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] hover:border-[#141413] dark:hover:border-[#F3F1EC]"
                    }`}
                    aria-label={isWishlisted ? "Remove from saved pieces" : "Save piece"}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full py-3.5 border border-[#141413] dark:border-[#F3F1EC] bg-white dark:bg-[#22211E] hover:bg-[#FAF9F7] dark:hover:bg-[#2A2824] text-[#141413] dark:text-[#F3F1EC] text-xs font-medium uppercase tracking-[0.15em] rounded-sm transition-colors cursor-pointer"
                >
                  {variantQty > 0 ? "Proceed to Bag & Checkout" : "Express Checkout"}
                </button>
              </motion.div>

              {/* Accordions */}
              <motion.div
                variants={modalItemVariants}
                className="border-t border-[#E6E2DA] dark:border-[#2C2A26] divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]"
              >
                <div className="py-4">
                  <button
                    type="button"
                    onClick={() => setIsDescOpen(!isDescOpen)}
                    className="w-full flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] cursor-pointer"
                  >
                    <span>Fabrication &amp; Atelier Notes</span>
                    {isDescOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {isDescOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-2 text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                          <p>{product.description}</p>
                          <p>
                            Cut to an architectural studio block with reinforced seam binding. Cold wash gentle inside out or dry clean to maintain handfeel.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="py-4">
                  <button
                    type="button"
                    onClick={() => setIsShippingOpen(!isShippingOpen)}
                    className="w-full flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] cursor-pointer"
                  >
                    <span>Dispatch, Packaging &amp; Returns</span>
                    {isShippingOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {isShippingOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div className="flex items-start gap-2.5">
                            <Truck className="w-4 h-4 text-[#966830] dark:text-[#C89B62] shrink-0 mt-0.5" />
                            <div>
                              <span className="block text-[10px] uppercase tracking-[0.1em] text-[#66625B] dark:text-[#A7A299]">
                                Transit Window
                              </span>
                              <span className="font-medium text-[#141413] dark:text-[#F3F1EC]">2–4 Business Days</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Shield className="w-4 h-4 text-[#966830] dark:text-[#C89B62] shrink-0 mt-0.5" />
                            <div>
                              <span className="block text-[10px] uppercase tracking-[0.1em] text-[#66625B] dark:text-[#A7A299]">
                                Presentation
                              </span>
                              <span className="font-medium text-[#141413] dark:text-[#F3F1EC]">Archival Cotton Box</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <RotateCcw className="w-4 h-4 text-[#966830] dark:text-[#C89B62] shrink-0 mt-0.5" />
                            <div>
                              <span className="block text-[10px] uppercase tracking-[0.1em] text-[#66625B] dark:text-[#A7A299]">
                                Exchanges
                              </span>
                              <span className="font-medium text-[#141413] dark:text-[#F3F1EC]">14-Day Complimentary</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Share Your Experience & Client Reviews Section */}
      <section id="garment-experience" className="bg-[#FAF9F7] dark:bg-[#111110] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 mb-10 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block mb-2">
                Client Impressions
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                Share Your Experience
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#66625B] dark:text-[#A7A299]">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[#966830] dark:fill-[#C89B62] text-[#966830] dark:text-[#C89B62]" />
                <span className="font-mono text-sm font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                  {averageRating}
                </span>
              </div>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{totalReviewsCount} Verified Notes</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Left: Rating Breakdown & Interactive Composer */}
            <div className="lg:col-span-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 sm:p-8 space-y-8">
              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const pct = getStarPercentage(stars);
                  return (
                    <div key={stars} className="flex items-center gap-3 font-mono text-xs">
                      <span className="w-12 text-[#66625B] dark:text-[#A7A299] tabular-nums">{stars} Star</span>
                      <div className="flex-1 h-1.5 bg-[#F4F1EC] dark:bg-[#22211E] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#141413] dark:bg-[#C89B62] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-[#66625B] dark:text-[#A7A299] tabular-nums">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-[#E6E2DA] dark:border-[#2C2A26]" id="reviews-form-container-left">
                <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] mb-4">
                  Write a Client Note
                </h3>

                {currentUser ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled =
                          ratingHover !== null ? star <= ratingHover : star <= newRating;
                        return (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setNewRating(star)}
                            onMouseEnter={() => setRatingHover(star)}
                            onMouseLeave={() => setRatingHover(null)}
                            className="w-10 h-11 flex items-center justify-center cursor-pointer"
                            aria-label={`Rate ${star} Stars`}
                          >
                            <Star
                              className={`w-5 h-5 transition-colors ${
                                isFilled
                                  ? "fill-[#966830] dark:fill-[#C89B62] text-[#966830] dark:text-[#C89B62]"
                                  : "text-[#E6E2DA] dark:text-[#3A3731]"
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="ml-2 font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">
                        {newRating}.0 / 5.0
                      </span>
                    </div>

                    <textarea
                      id="review-comment-input-left"
                      rows={4}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your impression of fit, drape, fabric weight, and craftsmanship..."
                      className="w-full p-3.5 text-sm border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm outline-none resize-none bg-[#FAF9F7] dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299]"
                    />

                    {reviewError && <p className="text-xs text-rose-700 dark:text-rose-400">{reviewError}</p>}
                    {reviewSuccess && <p className="text-xs text-[#966830] dark:text-[#C89B62] font-medium">{reviewSuccess}</p>}

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full py-3.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] rounded-sm hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isSubmittingReview ? "Publishing..." : "Publish Experience"}
                    </button>
                  </form>
                ) : (
                  <div className="bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-5 space-y-4">
                    <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                      Sign in with your BTNX account to share verified feedback on garment fit, silhouette, and fabric quality.
                    </p>
                    {onOpenAuth && (
                      <button
                        type="button"
                        onClick={onOpenAuth}
                        className="w-full py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] rounded-sm hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] transition-colors cursor-pointer"
                      >
                        Sign In to Share Experience
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Readable Client Review Feed */}
            <div className="lg:col-span-7 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
              {visibleReviews.map((rev) => {
                const initials = rev.name
                  .split(" ")
                  .filter(Boolean)
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <article key={rev.id} className="p-5 sm:p-8 space-y-3.5 sm:space-y-4">
                    <div className="flex items-start gap-3 sm:gap-3.5">
                      <div className="w-10 h-10 bg-[#F4F1EC] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm flex items-center justify-center font-mono text-xs text-[#141413] dark:text-[#F3F1EC] shrink-0">
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <h4 className="text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                            {rev.name}
                          </h4>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] whitespace-nowrap tabular-nums">
                              {rev.date}
                            </span>
                            {(userData?.role === "admin" ||
                              (currentUser && currentUser.uid === rev.userId)) &&
                              !rev.isStatic && (
                                <button
                                  onClick={() => handleDeleteReview(rev.id)}
                                  className="p-1 text-[#66625B] dark:text-[#A7A299] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                                  title="Delete Review"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-nowrap">
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= rev.rating
                                    ? "fill-[#141413] dark:fill-[#F3F1EC] text-[#141413] dark:text-[#F3F1EC]"
                                    : "text-[#E6E2DA] dark:text-[#3A3731]"
                                }`}
                              />
                            ))}
                          </div>
                          <span aria-hidden="true" className="text-[10px] text-[#66625B]/50 dark:text-[#A7A299]/50 shrink-0">
                            ·
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.1em] text-[#966830] dark:text-[#C89B62] font-medium whitespace-nowrap">
                            Verified Client
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="font-display text-lg sm:text-[22px] text-[#141413] dark:text-[#F3F1EC] leading-relaxed">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </article>
                );
              })}

              {reviews.length > 4 && (
                <div className="p-5 bg-[#FAF9F7] dark:bg-[#22211E] text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="text-xs font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] underline cursor-pointer"
                  >
                    {showAllReviews
                      ? "Show Fewer Entries"
                      : `View All ${reviews.length} Client Notes`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Complementary Silhouettes */}
      <section className="bg-white dark:bg-[#191816]">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-16">
          <div className="pb-8 mb-8 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1.5">
              Continue Exploring
            </span>
            <h2 className="font-display text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
              Complementary Pieces
            </h2>
          </div>

          <motion.div
            key={product.id}
            variants={galleryContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={EDITORIAL_VIEWPORT}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8"
          >
            {complementaryPieces.map((item) => (
              <motion.article
                key={item.id}
                variants={galleryCardVariants}
                onClick={() => onSelectProduct && onSelectProduct(item)}
                className="group cursor-pointer flex flex-col justify-between gap-2.5 sm:gap-3"
              >
                <div className="aspect-[3/4] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden rounded-sm">
                  <GalleryImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.08em] sm:tracking-[0.1em] text-[#66625B] dark:text-[#A7A299] truncate">
                      {item.category}
                    </p>
                    <h3 className="text-[13px] sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate mt-0.5">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1.5 shrink-0">
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="font-mono text-[10px] text-[#66625B] dark:text-[#A7A299] line-through tabular-nums">
                        {formatNaira(item.originalPrice)}
                      </span>
                    )}
                    <span className="font-mono text-[12px] sm:text-xs font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                      {formatNaira(item.price)}
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Size Guide Modal */}
      <AnimatePresence>
        {isSizeGuideOpen && (
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsSizeGuideOpen(false)}
            className="fixed inset-0 z-[60] bg-[#141413]/45 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              variants={modalPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="m3-haze-surface border border-[#E6E2DA]/90 dark:border-[#2C2A26]/90 rounded-md max-w-lg w-full p-6 sm:p-8 space-y-5"
            >
              <motion.div
                variants={modalItemVariants}
                className="flex items-start justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4"
              >
                <div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1">
                    Atelier Measurements
                  </span>
                  <h3 className="font-display text-2xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                    Garment Size Guide (cm)
                  </h3>
                </div>
                <button
                  onClick={() => setIsSizeGuideOpen(false)}
                  className="p-2 rounded-sm text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-[#141413]/5 dark:hover:bg-white/8 cursor-pointer"
                  aria-label="Close size guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>

              <motion.div variants={modalItemVariants} className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] dark:text-[#A7A299] uppercase tracking-[0.1em]">
                      <th className="py-2.5 pr-4 font-medium">Size</th>
                      <th className="py-2.5 px-3 font-medium">Chest</th>
                      <th className="py-2.5 px-3 font-medium">Shoulder</th>
                      <th className="py-2.5 px-3 font-medium">Sleeve</th>
                      <th className="py-2.5 pl-3 font-medium">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] font-mono tabular-nums">
                    {SIZE_CHART.map((row) => (
                      <tr key={row.size} className="hover:bg-[#FAF9F7]/70 dark:hover:bg-[#22211E]/70">
                        <td className="py-3 pr-4 font-medium text-[#141413] dark:text-[#F3F1EC]">{row.size}</td>
                        <td className="py-3 px-3 text-[#66625B] dark:text-[#A7A299]">{row.chest}</td>
                        <td className="py-3 px-3 text-[#66625B] dark:text-[#A7A299]">{row.shoulder}</td>
                        <td className="py-3 px-3 text-[#66625B] dark:text-[#A7A299]">{row.sleeve}</td>
                        <td className="py-3 pl-3 text-[#66625B] dark:text-[#A7A299]">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>

              <motion.p variants={modalItemVariants} className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                Relaxed architectural block. Select your usual size for intended studio drape, or size down one step for a closer tailored line.
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Studio Zoom Lightbox */}
      <AnimatePresence>
        {isZoomOpen && (
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setIsZoomOpen(false)}
            className="fixed inset-0 z-[60] bg-[#141413]/85 dark:bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
          >
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-6 right-6 p-2.5 m3-haze-photo text-white rounded-sm cursor-pointer"
              aria-label="Close zoom preview"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: EDITORIAL_EASE }}
              className="max-h-[88vh] max-w-2xl w-full aspect-[3/4] overflow-hidden rounded-sm"
            >
              <GalleryImage
                src={images[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
