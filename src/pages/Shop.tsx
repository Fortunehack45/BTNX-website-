import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Product, CartItem } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "../utils/currency";
import { getDiscountPercent } from "../utils/invoice";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import GalleryImage from "../components/GalleryImage";
import ProductCard from "../components/ProductCard";
import CustomSelect from "../components/CustomSelect";
import RecentSearchDropdown from "../components/RecentSearchDropdown";
import { useSearchHistory } from "../hooks/useSearchHistory";
import {
  galleryContainerVariants,
  galleryCardVariants,
  EDITORIAL_VIEWPORT,
} from "../utils/motion";

interface ShopProps {
  cart: CartItem[];
  onOpenProduct: (product: Product) => void;
  onAddToBag: (product: Product, size?: string, color?: string) => void;
  onUpdateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onOpenCart: () => void;
  wishlist?: Product[];
  onToggleWishlist?: (product: Product) => void;
  globalSearchQuery?: string;
  products?: Product[];
}

const CATEGORIES = [
  "All Pieces",
  "Outerwear",
  "Tops & Knitwear",
  "Jersey & Fleece",
  "Unisex",
  "On Sale",
];

const MOBILE_CATEGORY_SHORT: Record<string, string> = {
  "All Pieces": "All",
  Outerwear: "Outerwear",
  "Tops & Knitwear": "Knitwear",
  "Jersey & Fleece": "Fleece",
  Unisex: "Unisex",
  "On Sale": "On Sale",
};

const PRICE_PRESETS = [
  { label: "All", min: 0, max: 150 },
  { label: "< ₦120k", min: 0, max: 80 },
  { label: "₦120k+", min: 80, max: 150 },
];

const COLLECTION_TAGS = [
  "Limited Run",
  "New Season",
  "Core Essential",
  "Classic",
  "Signature",
  "Heavyweight",
];

export default function Shop({
  cart,
  onOpenProduct,
  onAddToBag,
  onUpdateQuantity,
  onAddToast,
  onOpenCart,
  wishlist = [],
  onToggleWishlist,
  globalSearchQuery = "",
  products,
}: ShopProps) {
  const storeProducts = Array.isArray(products) ? products : NEW_YEAR_PRODUCTS;
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(urlQuery || globalSearchQuery);
  const [categoryFilter, setCategoryFilter] = useState(() => {
    try {
      const saved = sessionStorage.getItem("btnx_shop_filters");
      return saved ? JSON.parse(saved).categoryFilter || "All Pieces" : "All Pieces";
    } catch {
      return "All Pieces";
    }
  });
  const [badgeFilter, setBadgeFilter] = useState(() => {
    try {
      const saved = sessionStorage.getItem("btnx_shop_filters");
      return saved ? JSON.parse(saved).badgeFilter || "" : "";
    } catch {
      return "";
    }
  });
  const [minPrice, setMinPrice] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem("btnx_shop_filters");
      return saved ? Number(JSON.parse(saved).minPrice ?? 0) : 0;
    } catch {
      return 0;
    }
  });
  const [maxPrice, setMaxPrice] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem("btnx_shop_filters");
      return saved ? Number(JSON.parse(saved).maxPrice ?? 150) : 150;
    } catch {
      return 150;
    }
  });
  const [sortBy, setSortBy] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem("btnx_shop_filters");
      return saved ? JSON.parse(saved).sortBy || "featured" : "featured";
    } catch {
      return "featured";
    }
  });
  const [recOffset, setRecOffset] = useState(0);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { recentSearches, saveSearchQuery, removeSearchQuery, clearSearchHistory } =
    useSearchHistory();

  useEffect(() => {
    setSearchQuery(urlQuery || globalSearchQuery);
  }, [urlQuery, globalSearchQuery]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "btnx_shop_filters",
        JSON.stringify({ categoryFilter, badgeFilter, minPrice, maxPrice, sortBy })
      );
    } catch {
      // Ignore storage errors
    }
  }, [categoryFilter, badgeFilter, minPrice, maxPrice, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Pieces");
    setBadgeFilter("");
    setMinPrice(0);
    setMaxPrice(150);
    setSortBy("featured");
    try {
      sessionStorage.removeItem("btnx_shop_filters");
    } catch {
      // Ignore storage errors
    }
    onAddToast("Catalog filters reset.", "info");
  };

  const hasActiveFilters =
    categoryFilter !== "All Pieces" ||
    badgeFilter !== "" ||
    searchQuery.trim() !== "" ||
    minPrice > 0 ||
    maxPrice < 150 ||
    sortBy !== "featured";

  const activeFilterCount =
    (categoryFilter !== "All Pieces" ? 1 : 0) +
    (badgeFilter !== "" ? 1 : 0) +
    (minPrice > 0 || maxPrice < 150 ? 1 : 0);

  const matchesCategoryName = (product: Product, cat: string) => {
    if (cat === "All Pieces") return true;
    if (cat === "On Sale") return Boolean(product.originalPrice && product.originalPrice > product.price);
    const combined = `${product.category} ${product.name} ${product.description}`.toLowerCase();
    if (cat === "Outerwear") {
      return (
        combined.includes("outerwear") ||
        combined.includes("jacket") ||
        combined.includes("overshirt") ||
        combined.includes("leather")
      );
    }
    if (cat === "Tops & Knitwear") {
      return (
        combined.includes("knitwear") ||
        combined.includes("cardigan") ||
        combined.includes("crewneck") ||
        combined.includes("pullover")
      );
    }
    if (cat === "Jersey & Fleece") {
      return combined.includes("fleece") || combined.includes("jersey") || combined.includes("hoodie");
    }
    if (cat === "Unisex") {
      return combined.includes("unisex") || product.id === "ny-3" || product.id === "ny-4";
    }
    return true;
  };

  const getCategoryCount = (cat: string) =>
    storeProducts.filter((p) => matchesCategoryName(p, cat)).length;

  const filteredProducts = storeProducts.filter((product) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      product.name.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q) ||
      (product.description || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (product.price < minPrice || product.price > maxPrice) return false;
    if (badgeFilter && product.badge !== badgeFilter) return false;

    return matchesCategoryName(product, categoryFilter);
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    return 0;
  });

  const visibleRecommendations = [0, 1, 2].map(
    (offset) => storeProducts[(recOffset + offset) % storeProducts.length]
  );

  const renderFilterSections = (isMobile = false) => (
    <div className="space-y-5">
      {/* 1. Category */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299]">
            Category
          </h2>
          {!isMobile && hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <div className={isMobile ? "grid grid-cols-2 gap-1.5" : "space-y-0.5"}>
          {CATEGORIES.map((cat) => {
            const isActive = categoryFilter === cat;
            const catCount = getCategoryCount(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`w-full min-h-[38px] flex items-center justify-between px-2.5 sm:px-3 py-1.5 text-left text-[11px] sm:text-xs rounded-sm transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] font-medium"
                    : "text-[#141413] dark:text-[#F3F1EC] hover:bg-[#F4F1EC] dark:hover:bg-[#22211E] border border-transparent"
                } ${isMobile && !isActive ? "border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E]" : ""}`}
              >
                <span className="truncate">{cat}</span>
                <span className="font-mono text-[10px] tabular-nums opacity-70 ml-1.5 shrink-0">
                  {catCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Price Ceiling */}
      <div className="pt-4 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299]">
            Price Ceiling
          </h2>
          <span className="font-mono text-[11px] font-medium tabular-nums text-[#141413] dark:text-[#F3F1EC]">
            Up to {formatNaira(maxPrice)}
          </span>
        </div>

        <div>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            aria-label="Maximum price ceiling"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="editorial-range"
          />
          <div className="flex justify-between font-mono text-[10px] tabular-nums text-[#66625B] dark:text-[#A7A299] -mt-1">
            <span>{formatNaira(minPrice)}</span>
            <span>{formatNaira(150)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-3">
          {PRICE_PRESETS.map((preset) => {
            const isSelected = minPrice === preset.min && maxPrice === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setMinPrice(preset.min);
                  setMaxPrice(preset.max);
                }}
                className={`min-h-[36px] px-2 py-1 text-[11px] font-medium border rounded-sm text-center transition-colors cursor-pointer truncate ${
                  isSelected
                    ? "border-[#141413] dark:border-[#F3F1EC] bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413]"
                    : "border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E] text-[#66625B] dark:text-[#A7A299] hover:border-[#141413] dark:hover:border-[#F3F1EC] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Collection Tags */}
      <div className="pt-4 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299] mb-2.5">
          Tags
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {COLLECTION_TAGS.map((tag) => {
            const active = badgeFilter === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setBadgeFilter(active ? "" : tag)}
                className={`min-h-[36px] px-2.5 py-1.5 text-[11px] border rounded-sm text-center transition-colors cursor-pointer truncate ${
                  active
                    ? "border-[#966830] dark:border-[#C89B62] bg-[#FAF9F7] dark:bg-[#22211E] text-[#966830] dark:text-[#C89B62] font-medium"
                    : "border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E] text-[#66625B] dark:text-[#A7A299] hover:border-[#141413] dark:hover:border-[#F3F1EC] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] pb-20 lg:pb-0">
      {/* Boutique Catalog Header */}
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-end">
            <div className="lg:col-span-7 space-y-2.5 sm:space-y-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block">
                Full Collection
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.015em] text-balance">
                Seasonal Catalog
              </h1>
              <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-lg leading-relaxed">
                Explore everything in stock at BTNX Store — from everyday streetwear and knitwear to statement outerwear, with fast nationwide delivery from Osun.
              </p>
            </div>

            <div className="lg:col-span-5 relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = searchQuery.trim();
                  if (trimmed) {
                    saveSearchQuery(trimmed);
                    setIsSearchFocused(false);
                    onAddToast(`Filtered catalog for "${trimmed}".`, "info");
                  }
                }}
                className="flex items-center border border-[#141413]/85 dark:border-[#F3F1EC]/65 bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm overflow-hidden"
              >
                <div className="relative flex-1 flex items-center min-w-0 pl-3.5">
                  <Search className="w-4 h-4 text-[#66625B] dark:text-[#A7A299] shrink-0" />
                  <input
                    type="text"
                    placeholder="Search garments or fabrics..."
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchFocused(true);
                    }}
                    className="w-full px-3 py-2.5 bg-transparent text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none min-h-[44px]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search query"
                      className="p-2 mr-1 text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] rounded-sm cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-5 sm:px-6 py-2.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] transition-colors shrink-0 cursor-pointer min-h-[44px]"
                >
                  Filter
                </button>
              </form>

              {isSearchFocused && (
                <RecentSearchDropdown
                  queries={recentSearches}
                  onSelectQuery={(term) => {
                    setSearchQuery(term);
                    saveSearchQuery(term);
                    setIsSearchFocused(false);
                  }}
                  onRemoveQuery={removeSearchQuery}
                  onClearAll={clearSearchHistory}
                />
              )}
            </div>
          </div>

          {/* Clean Active Status Bar */}
          <div className="mt-7 sm:mt-10 pt-4 sm:pt-5 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex flex-wrap items-center justify-between gap-3 text-xs text-[#66625B] dark:text-[#A7A299]">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="whitespace-nowrap">
                Collection: <strong className="text-[#141413] dark:text-[#F3F1EC] font-medium">{categoryFilter}</strong>
              </span>
              {searchQuery.trim() && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">
                    Query: <strong className="text-[#141413] dark:text-[#F3F1EC] font-medium">&ldquo;{searchQuery.trim()}&rdquo;</strong>
                  </span>
                </>
              )}
              {badgeFilter && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">
                    Edit: <strong className="text-[#966830] dark:text-[#C89B62] font-medium">{badgeFilter}</strong>
                  </span>
                </>
              )}
              {(minPrice > 0 || maxPrice < 150) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-[#141413] dark:text-[#F3F1EC] whitespace-nowrap">
                    {formatNaira(minPrice)} – {formatNaira(maxPrice)}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 sm:gap-5 shrink-0">
              <span className="font-mono tabular-nums whitespace-nowrap">
                Showing <strong className="text-[#141413] dark:text-[#F3F1EC]">{sortedProducts.length}</strong> of {storeProducts.length}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 min-h-[36px] text-[11px] font-medium uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Boutique Layout */}
      <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-12 lg:py-14">
        {/* Mobile Quick Category Strip & Compact Filter/Sort Toolbar */}
        <div className="lg:hidden space-y-2.5 mb-7">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`min-h-[36px] px-2 py-1.5 text-[11px] sm:text-xs font-medium rounded-sm border text-center whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? "bg-[#141413] dark:bg-[#F3F1EC] border-[#141413] dark:border-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413]"
                      : "bg-white dark:bg-[#191816] border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] dark:text-[#A7A299]"
                  }`}
                >
                  {MOBILE_CATEGORY_SHORT[cat] || cat}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="min-h-[44px] px-3.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
            </button>

            <CustomSelect
              prefix="Sort"
              ariaLabel="Sort products"
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "featured", label: "Featured" },
                { value: "price-asc", label: "Price: Low to High" },
                { value: "price-desc", label: "Price: High to Low" },
                { value: "name-asc", label: "Name: A–Z" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Desktop Slim Sticky Filter Rail */}
          <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-24 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-5">
            {renderFilterSections(false)}
          </aside>

          {/* Product Gallery + Desktop Sort Bar */}
          <div className="lg:col-span-9 space-y-6">
            <div className="hidden lg:flex items-center justify-between gap-4 pb-4 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
              <p className="text-xs text-[#66625B] dark:text-[#A7A299] font-mono tabular-nums">
                {sortedProducts.length} {sortedProducts.length === 1 ? "Piece" : "Pieces"} Shown
              </p>
              <div className="w-56">
                <CustomSelect
                  prefix="Sort"
                  ariaLabel="Sort catalog products"
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: "featured", label: "Featured" },
                    { value: "price-asc", label: "Price: Low to High" },
                    { value: "price-desc", label: "Price: High to Low" },
                    { value: "name-asc", label: "Name: A–Z" },
                  ]}
                />
              </div>
            </div>

            {sortedProducts.length > 0 ? (
              <motion.div
                key={`${categoryFilter}-${badgeFilter}-${sortBy}`}
                variants={galleryContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-7"
              >
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
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
              <div className="py-20 px-6 text-center bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm">
                <p className="font-display text-3xl text-[#141413] dark:text-[#F3F1EC] mb-2">No matching pieces</p>
                <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-sm mx-auto mb-6">
                  Adjust your price range or category filter to view available store items.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="min-h-[46px] px-6 py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-Up Bottom Sheet Filter Drawer */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFiltersOpen(false)}
              className="fixed inset-0 bg-[#141413]/45 dark:bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="m3-haze-surface relative z-10 rounded-t-2xl max-h-[85dvh] flex flex-col border-t border-[#E6E2DA] dark:border-[#2C2A26] overflow-hidden"
            >
              <div className="pt-3 pb-3.5 px-5 border-b border-[#E6E2DA] dark:border-[#2C2A26] shrink-0">
                <div className="w-10 h-1 bg-[#E6E2DA] dark:bg-[#3A3731] rounded-full mx-auto mb-2.5" />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block">
                      Refine
                    </span>
                    <h2 className="font-display text-2xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                      Filter Pieces
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileFiltersOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-sm text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-[#F4F1EC] dark:hover:bg-[#22211E] cursor-pointer transition-colors"
                    aria-label="Close filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {renderFilterSections(true)}
              </div>

              <div className="m3-haze-bar p-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex items-center gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="min-h-[46px] px-5 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] text-xs font-medium uppercase tracking-[0.12em] rounded-sm cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="flex-1 min-h-[46px] bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer"
                >
                  Show {sortedProducts.length} {sortedProducts.length === 1 ? "Piece" : "Pieces"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Curated Recommendations */}
      <section className="bg-white dark:bg-[#191816] border-t border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-16">
          <div className="flex items-end justify-between gap-4 pb-8 mb-8 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1.5">
                Picked For You
              </span>
              <h2 className="font-display text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                You Might Also Like
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setRecOffset(
                    (prev) => (prev - 1 + storeProducts.length) % storeProducts.length
                  )
                }
                className="w-10 h-10 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#22211E] hover:border-[#141413] dark:hover:border-[#F3F1EC] rounded-sm flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] transition-colors cursor-pointer"
                aria-label="Previous recommendations"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRecOffset((prev) => (prev + 1) % storeProducts.length)}
                className="w-10 h-10 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#22211E] hover:border-[#141413] dark:hover:border-[#F3F1EC] rounded-sm flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] transition-colors cursor-pointer"
                aria-label="Next recommendations"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <motion.div
            key={recOffset}
            variants={galleryContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={EDITORIAL_VIEWPORT}
            className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 lg:gap-8"
          >
            {visibleRecommendations.map((product) => {
              const discountPct = getDiscountPercent(product.price, product.originalPrice);
              return (
                <motion.article
                  key={`rec-${product.id}`}
                  variants={galleryCardVariants}
                  onClick={() => onOpenProduct(product)}
                  className="group cursor-pointer flex flex-col gap-2.5 sm:gap-3"
                >
                  <div className="relative aspect-[3/4] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden rounded-sm">
                    <GalleryImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    {discountPct && (
                      <span className="m3-haze-photo absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[#FAF9F7] font-mono text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.12em] rounded-sm">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.1em] text-[#66625B] dark:text-[#A7A299] truncate">
                          {product.category}
                        </p>
                        <h3 className="text-[13px] sm:text-sm font-semibold text-[#141413] dark:text-[#F3F1EC] mt-0.5 truncate">
                          {product.name}
                        </h3>
                      </div>
                      <div className="flex items-baseline gap-1.5 shrink-0">
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="font-mono text-[10px] sm:text-[11px] text-[#66625B] dark:text-[#A7A299] line-through tabular-nums">
                            {formatNaira(product.originalPrice)}
                          </span>
                        )}
                        <span className="font-mono text-[12px] sm:text-sm font-semibold sm:font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                          {formatNaira(product.price)}
                        </span>
                      </div>
                    </div>
                    {product.description && (
                      <p className="text-[11px] sm:text-xs text-[#66625B] dark:text-[#A7A299] leading-snug sm:leading-relaxed line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
