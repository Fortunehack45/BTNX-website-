import React, { useState } from "react";
import { Product, CartItem } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "../utils/currency";
import { getSwatchHex } from "../utils/colors";
import { getDiscountPercent } from "../utils/invoice";
import { Eye, ShoppingBag, Check, Copy, Heart, Minus, Plus, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import GalleryImage from "./GalleryImage";
import {
  galleryContainerVariants,
  galleryCardVariants,
  EDITORIAL_VIEWPORT,
} from "../utils/motion";

interface NewYearCollectionProps {
  cart: CartItem[];
  categoryFilter: string;
  onCategoryFilter?: (category: string) => void;
  onResetFilter: () => void;
  onOpenProduct: (product: Product) => void;
  onAddToBag: (product: Product, size?: string, color?: string) => void;
  onUpdateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  searchQuery?: string;
  wishlist?: Product[];
  onToggleWishlist?: (product: Product) => void;
}

const FILTER_TABS = [
  { key: "", label: "All Pieces" },
  { key: "Women", label: "Womenswear" },
  { key: "Men", label: "Menswear" },
  { key: "under-100", label: "Under ₦150,000" },
];

export default function NewYearCollection({
  cart,
  categoryFilter,
  onCategoryFilter,
  onResetFilter,
  onOpenProduct,
  onAddToBag,
  onUpdateQuantity,
  onAddToast,
  searchQuery = "",
  wishlist = [],
  onToggleWishlist,
}: NewYearCollectionProps) {
  const [isVoucherClaimed, setIsVoucherClaimed] = useState(false);

  const handleClaimVoucher = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText("BTNX50").catch(() => {});
    setIsVoucherClaimed(true);
    onAddToast("Private voucher code BTNX50 copied — 50% off in bag.", "success");
  };

  const isSearchActive = !!searchQuery.trim();

  const matchesCategory = (product: Product) => {
    if (!categoryFilter) return true;
    if (categoryFilter === "under-100") return product.price <= 100;
    if (categoryFilter === "Women") {
      return product.category.includes("Womenswear") || product.category.includes("Outerwear");
    }
    if (categoryFilter === "Men") {
      return (
        product.category.includes("Unisex") ||
        product.id === "ny-2" ||
        product.id === "ny-3" ||
        product.id === "ny-6"
      );
    }
    return true;
  };

  const displayedProducts = NEW_YEAR_PRODUCTS.filter((product) => {
    if (isSearchActive) {
      const q = searchQuery.toLowerCase().trim();
      const hit =
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.description || "").toLowerCase().includes(q) ||
        (product.badge || "").toLowerCase().includes(q) ||
        product.colors?.some((c) => c.toLowerCase().includes(q));
      if (!hit) return false;
    }
    return matchesCategory(product);
  });

  const renderProductCard = (product: Product) => {
    const isSaved = wishlist.some((p) => p.id === product.id);
    const secondaryImage =
      product.images && product.images.length > 1 && product.images[1] !== product.image
        ? product.images[1]
        : null;
    const defaultSize = product.sizes?.[0] || "M";
    const defaultColor = product.colors?.[0] || "Default";
    const matchingItems = cart.filter((item) => item.product.id === product.id);
    const totalInBag = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
    const primaryItem =
      matchingItems.find(
        (item) =>
          (item.selectedSize || "M") === defaultSize &&
          (item.selectedColor || "Default") === defaultColor
      ) || matchingItems[0];
    const discountPct = getDiscountPercent(product.price, product.originalPrice);

    const renderStepper = (compact = false) =>
      totalInBag > 0 && primaryItem ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`${
            compact ? "min-h-[38px] min-w-[104px]" : "flex-1 min-h-[40px]"
          } border border-[#141413] dark:border-[#F3F1EC]/75 bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm grid grid-cols-3 items-center overflow-hidden shadow-xs`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateQuantity(
                product.id,
                primaryItem.selectedSize || defaultSize,
                primaryItem.selectedColor || defaultColor,
                primaryItem.quantity - 1
              );
            }}
            aria-label={`Remove one ${product.name} from bag`}
            className="h-full flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#E6E2DA]/70 dark:hover:bg-[#2E2C28] transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs font-semibold text-[#141413] dark:text-[#F3F1EC] text-center tabular-nums select-none">
            {totalInBag}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToBag(
                product,
                primaryItem.selectedSize || defaultSize,
                primaryItem.selectedColor || defaultColor
              );
            }}
            aria-label={`Add one more ${product.name} to bag`}
            className="h-full flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#E6E2DA]/70 dark:hover:bg-[#2E2C28] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null;

    return (
      <motion.article
        key={product.id}
        id={`collection-card-${product.id}`}
        variants={galleryCardVariants}
        onClick={() => onOpenProduct(product)}
        className="group cursor-pointer flex flex-col"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm mb-4">
          <GalleryImage
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover object-center transition-all duration-700 ease-out ${
              secondaryImage ? "group-hover:opacity-0" : "group-hover:scale-[1.03]"
            }`}
          />

          {secondaryImage && (
            <GalleryImage
              src={secondaryImage}
              alt={`${product.name} editorial view`}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-700 ease-out"
            />
          )}

          {discountPct && (
            <span className="absolute top-3 left-3 px-2.5 py-1 m3-haze-photo text-[#FAF9F7] font-mono text-[10px] font-medium uppercase tracking-[0.12em] rounded-sm">
              -{discountPct}%
            </span>
          )}

          {onToggleWishlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(product);
              }}
              aria-label={isSaved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
              className={`absolute top-3 right-3 w-10 h-10 rounded-full m3-haze-chip flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm ${
                isSaved
                  ? "text-[#966830] dark:text-[#C89B62] opacity-100"
                  : "text-[#141413] dark:text-[#F3F1EC] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-white dark:hover:bg-[#191816]"
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            </button>
          )}

          <div className="hidden lg:flex absolute inset-x-3 bottom-3 p-1.5 m3-haze-surface border border-white/40 dark:border-white/12 rounded-sm opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenProduct(product);
              }}
              className="flex-1 py-2 text-[#141413] dark:text-[#F3F1EC] hover:bg-[#141413]/[0.06] dark:hover:bg-white/[0.08] text-[11px] font-medium uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 rounded-sm transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect</span>
            </button>
            {totalInBag > 0 ? (
              renderStepper(false)
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToBag(product, defaultSize, defaultColor);
                }}
                className="flex-1 py-2 bg-[#141413] text-[#FAF9F7] hover:bg-[#2B2A28] dark:bg-[#F3F1EC] dark:text-[#141413] dark:hover:bg-[#E2DFD7] text-[11px] font-medium uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 rounded-sm transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-[#66625B] dark:text-[#A7A299]">
            <span className="truncate">{product.category}</span>
            {product.badge && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#966830] dark:text-[#C89B62] shrink-0">{product.badge}</span>
              </>
            )}
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[16px] font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.01em] truncate">
              {product.name}
            </h3>
            <div className="flex items-baseline gap-1.5 shrink-0">
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] line-through tabular-nums">
                  {formatNaira(product.originalPrice)}
                </span>
              )}
              <span className="font-mono text-sm font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                {formatNaira(product.price)}
              </span>
            </div>
          </div>

          {product.description && (
            <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 min-h-[38px]">
            {product.colors && product.colors.length > 0 ? (
              <div className="flex items-center gap-1.5" aria-label="Available colorways">
                {product.colors.map((color) => (
                  <span
                    key={color}
                    title={color}
                    className="w-3 h-3 rounded-full border border-black/15 dark:border-white/25"
                    style={{ backgroundColor: getSwatchHex(color) }}
                  />
                ))}
              </div>
            ) : (
              <span />
            )}

            {totalInBag > 0 ? (
              renderStepper(true)
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToBag(product, defaultSize, defaultColor);
                }}
                className="lg:hidden min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 bg-[#141413] text-[#FAF9F7] dark:bg-[#F3F1EC] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.1em] rounded-sm cursor-pointer"
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <section id="collection" className="w-full bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26] transition-colors duration-200">
      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-22 space-y-10 sm:space-y-12">
        {/* Header + Interactive Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
          <div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block mb-2">
              The Collection
            </span>
            <h2
              id="collection-heading"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.01em] text-balance"
            >
              Seasonal Edition
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
            <div
              className="flex items-center gap-1 p-1 bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm overflow-x-auto no-scrollbar max-w-full border border-[#E6E2DA]/70 dark:border-[#2C2A26]"
              role="tablist"
              aria-label="Collection Category Filter"
            >
              {FILTER_TABS.map((tab) => {
                const active = categoryFilter === tab.key;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => {
                      if (tab.key === "") {
                        onResetFilter();
                      } else if (onCategoryFilter) {
                        onCategoryFilter(tab.key);
                      }
                    }}
                    className={`min-h-[38px] px-4 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all rounded-sm cursor-pointer ${
                      active
                        ? "bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] shadow-xs"
                        : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums whitespace-nowrap">
              {displayedProducts.length} {displayedProducts.length === 1 ? "Piece" : "Pieces"}
            </span>
          </div>
        </div>

        {isSearchActive && (
          <div className="px-5 py-3.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm flex items-center justify-between gap-4">
            <span className="text-xs text-[#66625B] dark:text-[#A7A299]">
              Showing <strong className="font-mono text-[#141413] dark:text-[#F3F1EC] tabular-nums">{displayedProducts.length}</strong> results for &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              onClick={onResetFilter}
              className="text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] underline cursor-pointer"
            >
              Reset Search
            </button>
          </div>
        )}

        {/* Symmetrical 3-Column Product Gallery */}
        {displayedProducts.length > 0 ? (
          <motion.div
            key={categoryFilter || "all"}
            id="collection-grid"
            variants={galleryContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={EDITORIAL_VIEWPORT}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12"
          >
            {displayedProducts.map(renderProductCard)}
          </motion.div>
        ) : (
          <div id="empty-collection-state" className="py-20 px-6 text-center bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm">
            <p className="font-display text-2xl text-[#141413] dark:text-[#F3F1EC] mb-2">No pieces match this selection</p>
            <p className="text-xs text-[#66625B] dark:text-[#A7A299] max-w-md mx-auto mb-6">
              Try clearing your search or switching back to All Pieces to explore the full seasonal release.
            </p>
            <button
              onClick={onResetFilter}
              className="px-6 py-3 bg-[#141413] text-white dark:bg-[#F3F1EC] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] rounded-sm cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Full-Width Architectural Privilege Strip */}
        <div
          id="voucher-promo-card"
          className="bg-[#141413] dark:bg-[#12110F] dark:border dark:border-[#C89B62]/30 text-[#FAF9F7] p-8 sm:p-10 lg:px-14 lg:py-12 rounded-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8"
        >
          <div className="space-y-2.5 max-w-xl">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#C69B62] font-medium block">
              Private Client Privilege · 50% Reduction
            </span>
            <h3 className="font-display text-3xl sm:text-4xl font-medium text-white text-balance">
              End of Year Archive Privilege
            </h3>
            <p className="text-sm text-[#E6E2DA]/80 leading-relaxed">
              Enter invitation code <span className="font-mono text-white tracking-wider">BTNX50</span> in your shopping bag to receive 50% off selected seasonal garments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClaimVoucher}
              className="min-h-[48px] px-7 py-4 bg-[#FAF9F7] text-[#141413] hover:bg-white text-xs font-medium uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-sm"
            >
              {isVoucherClaimed ? (
                <>
                  <Check className="w-4 h-4 text-[#966830]" />
                  <span>Copied: BTNX50</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code BTNX50</span>
                </>
              )}
            </button>

            <Link
              to="/promos"
              className="min-h-[48px] px-6 py-4 border border-white/25 bg-white/8 hover:bg-white/15 backdrop-blur-md text-[#FAF9F7] text-xs font-medium uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 rounded-sm"
            >
              <span>All Privileges</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
