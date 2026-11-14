import React, { useState } from "react";
import { Product, CartItem } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { Check, Copy, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import {
  galleryContainerVariants,
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
  onOpenCart?: () => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  searchQuery?: string;
  wishlist?: Product[];
  onToggleWishlist?: (product: Product) => void;
  products?: Product[];
}

const FILTER_TABS = [
  { key: "", label: "All Pieces", mobileLabel: "All" },
  { key: "Women", label: "Womenswear", mobileLabel: "Women" },
  { key: "Men", label: "Menswear", mobileLabel: "Men" },
  { key: "under-100", label: "Under ₦125,000", mobileLabel: "< ₦125k" },
];

export default function NewYearCollection({
  cart,
  categoryFilter,
  onCategoryFilter,
  onResetFilter,
  onOpenProduct,
  onAddToBag,
  onUpdateQuantity,
  onOpenCart,
  onAddToast,
  searchQuery = "",
  wishlist = [],
  onToggleWishlist,
  products,
}: NewYearCollectionProps) {
  const storeProducts = products && products.length > 0 ? products : NEW_YEAR_PRODUCTS;
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
    if (categoryFilter === "under-100") return product.price <= 82;
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

  const displayedProducts = storeProducts.filter((product) => {
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

  return (
    <section id="collection" className="w-full bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26] transition-colors duration-200">
      <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-14 sm:py-22 space-y-8 sm:space-y-12">
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 sm:gap-4 w-full lg:w-auto">
            <div
              className="grid grid-cols-4 sm:inline-flex sm:items-center gap-1 p-1 bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm w-full sm:w-auto border border-[#E6E2DA]/70 dark:border-[#2C2A26]"
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
                    className={`min-h-[38px] px-1.5 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium text-center whitespace-nowrap flex items-center justify-center transition-all rounded-sm cursor-pointer ${
                      active
                        ? "bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] shadow-xs"
                        : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                    }`}
                  >
                    <span className="sm:hidden">{tab.mobileLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
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
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8"
          >
            {displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                cardId={`collection-card-${product.id}`}
                product={product}
                cart={cart}
                isSaved={wishlist.some((p) => p.id === product.id)}
                onOpenProduct={onOpenProduct}
                onAddToBag={onAddToBag}
                onUpdateQuantity={onUpdateQuantity}
                onOpenCart={onOpenCart}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
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

        {/* End of Season Promo Strip */}
        <div
          id="voucher-promo-card"
          className="bg-[#141413] dark:bg-[#12110F] dark:border dark:border-[#C89B62]/30 text-[#FAF9F7] p-8 sm:p-10 lg:px-14 lg:py-12 rounded-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8"
        >
          <div className="space-y-2.5 max-w-xl">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#C69B62] font-medium block">
              Seasonal Offer · 50% Off
            </span>
            <h3 className="font-display text-3xl sm:text-4xl font-medium text-white text-balance">
              End of Season Sale
            </h3>
            <p className="text-sm text-[#E6E2DA]/80 leading-relaxed">
              Use code <span className="font-mono text-white tracking-wider">BTNX50</span> in your shopping bag for 50% off eligible seasonal pieces.
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
              <span>All Offers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
