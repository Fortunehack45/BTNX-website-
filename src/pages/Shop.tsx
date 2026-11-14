import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product, CartItem } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "../utils/currency";
import { getSwatchHex } from "../utils/colors";
import { getDiscountPercent } from "../utils/invoice";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  RotateCcw,
  Eye,
  Heart,
  SlidersHorizontal,
  X,
  Minus,
  Plus,
} from "lucide-react";
import GalleryImage from "../components/GalleryImage";
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
}

const CATEGORIES = [
  "All Pieces",
  "Outerwear",
  "Tops & Knitwear",
  "Jersey & Fleece",
  "Unisex",
  "On Sale",
];

const PRICE_PRESETS = [
  { label: "All", min: 0, max: 150 },
  { label: "< ₦120k", min: 0, max: 80 },
  { label: "₦120k+", min: 80, max: 150 },
];

const ARCHIVE_EDITS = [
  "Limited Run",
  "New Season",
  "Core Essential",
  "Classic",
  "Signature",
  "Atelier Cut",
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
}: ShopProps) {
  const [searchQuery, setSearchQuery] = useState(globalSearchQuery);
  const [categoryFilter, setCategoryFilter] = useState("All Pieces");
  const [badgeFilter, setBadgeFilter] = useState("");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(150);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [recOffset, setRecOffset] = useState(0);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { recentSearches, saveSearchQuery, removeSearchQuery, clearSearchHistory } =
    useSearchHistory();

  useEffect(() => {
    setSearchQuery(globalSearchQuery);
  }, [globalSearchQuery]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Pieces");
    setBadgeFilter("");
    setMinPrice(0);
    setMaxPrice(150);
    setSortBy("featured");
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
    NEW_YEAR_PRODUCTS.filter((p) => matchesCategoryName(p, cat)).length;

  const filteredProducts = NEW_YEAR_PRODUCTS.filter((product) => {
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
    (offset) => NEW_YEAR_PRODUCTS[(recOffset + offset) % NEW_YEAR_PRODUCTS.length]
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
                className={`w-full min-h-[38px] flex items-center justify-between px-3 py-1.5 text-left text-xs rounded-sm transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] font-medium"
                    : "text-[#141413] dark:text-[#F3F1EC] hover:bg-[#F4F1EC] dark:hover:bg-[#22211E] border border-transparent"
                } ${isMobile && !isActive ? "border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E]" : ""}`}
              >
                <span className="truncate">{cat}</span>
                <span className="font-mono text-[10px] tabular-nums opacity-70 ml-2 shrink-0">
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

      {/* 3. Archive Edits */}
      <div className="pt-4 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299] mb-2.5">
          Archive Edits
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {ARCHIVE_EDITS.map((tag) => {
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
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-9 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-end">
            <div className="lg:col-span-7 space-y-2.5 sm:space-y-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block">
                BTNX Complete Archive
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.015em] text-balance">
                Seasonal Catalog
              </h1>
              <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-lg leading-relaxed">
                Explore silhouettes across heavyweight cottons, tailored outerwear, and signature knitwear. Every order ships with complimentary express dispatch.
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
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <span>
                Collection: <strong className="text-[#141413] dark:text-[#F3F1EC] font-medium">{categoryFilter}</strong>
              </span>
              {searchQuery.trim() && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Query: <strong className="text-[#141413] dark:text-[#F3F1EC] font-medium">&ldquo;{searchQuery.trim()}&rdquo;</strong>
                  </span>
                </>
              )}
              {badgeFilter && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Edit: <strong className="text-[#966830] dark:text-[#C89B62] font-medium">{badgeFilter}</strong>
                  </span>
                </>
              )}
              {(minPrice > 0 || maxPrice < 150) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                    {formatNaira(minPrice)} – {formatNaira(maxPrice)}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 sm:gap-5">
              <span className="font-mono tabular-nums">
                Showing <strong className="text-[#141413] dark:text-[#F3F1EC]">{sortedProducts.length}</strong> of {NEW_YEAR_PRODUCTS.length}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 min-h-[36px] text-[11px] font-medium uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
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
      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-12 lg:py-14">
        {/* Mobile Quick Category Strip & Compact Filter/Sort Toolbar */}
        <div className="lg:hidden space-y-2.5 mb-7">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-sm border whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? "bg-[#141413] dark:bg-[#F3F1EC] border-[#141413] dark:border-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413]"
                      : "bg-white dark:bg-[#191816] border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B] dark:text-[#A7A299]"
                  }`}
                >
                  {cat}
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
                {sortedProducts.length} {sortedProducts.length === 1 ? "Silhouette" : "Silhouettes"} Displayed
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
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-7 gap-y-8 sm:gap-y-10"
              >
                {sortedProducts.map((product) => {
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

                  return (
                    <motion.article
                      key={product.id}
                      variants={galleryCardVariants}
                      onClick={() => onOpenProduct(product)}
                      className="group cursor-pointer flex flex-col justify-between bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-4 hover:border-[#141413]/35 dark:hover:border-[#3A3731] transition-colors duration-300"
                    >
                      <div>
                        <div className="relative aspect-[3/4] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden rounded-sm mb-4">
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
                              alt={`${product.name} alternate view`}
                              className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-700 ease-out"
                            />
                          )}

                          {discountPct && (
                            <span className="m3-haze-photo absolute top-3 left-3 px-2.5 py-1 text-[#FAF9F7] font-mono text-[10px] font-medium uppercase tracking-[0.12em] rounded-sm">
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
                              aria-label={isSaved ? "Remove from saved" : "Save piece"}
                              className={`m3-haze-chip absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                                isSaved
                                  ? "text-[#966830] dark:text-[#C89B62] opacity-100"
                                  : "text-[#141413] dark:text-[#F3F1EC] opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenProduct(product);
                            }}
                            className="m3-haze-photo hidden lg:flex absolute bottom-3 right-3 px-3 py-1.5 rounded-sm text-[10px] font-medium uppercase tracking-[0.12em] text-[#FAF9F7] opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[#66625B] dark:text-[#A7A299]">
                            <span className="truncate">{product.category}</span>
                            {product.badge && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#966830] dark:text-[#C89B62] shrink-0">{product.badge}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-[15px] font-semibold text-[#141413] dark:text-[#F3F1EC] truncate">
                              {product.name}
                            </h3>
                            <div className="flex items-baseline gap-1.5 shrink-0">
                              {product.originalPrice && product.originalPrice > product.price && (
                                <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] line-through tabular-nums">
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

                          {product.colors && product.colors.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1">
                              {product.colors.map((c) => (
                                <span
                                  key={c}
                                  title={c}
                                  className="w-2.5 h-2.5 rounded-full border border-black/15 dark:border-white/25"
                                  style={{ backgroundColor: getSwatchHex(c) }}
                                />
                              ))}
                              <span className="text-[11px] text-[#66625B] dark:text-[#A7A299] ml-1 truncate">
                                {product.colors[0]}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                        {totalInBag > 0 && primaryItem ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="min-h-[44px] border border-[#141413] dark:border-[#F3F1EC]/75 bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm grid grid-cols-3 items-center overflow-hidden"
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
                              className="h-full flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#E6E2DA]/60 dark:hover:bg-[#2E2C28] transition-colors cursor-pointer"
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
                              className="h-full flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#E6E2DA]/60 dark:hover:bg-[#2E2C28] transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToBag(product, defaultSize, defaultColor);
                            }}
                            className="min-h-[44px] px-2.5 py-2.5 border border-[#141413] dark:border-[#F3F1EC]/75 text-[#141413] dark:text-[#F3F1EC] hover:bg-[#141413] dark:hover:bg-[#F3F1EC] hover:text-white dark:hover:text-[#141413] text-[11px] font-medium uppercase tracking-[0.1em] rounded-sm transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Add to Bag
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (totalInBag === 0) {
                              onAddToBag(product, defaultSize, defaultColor);
                            }
                            onOpenCart();
                          }}
                          className="min-h-[44px] px-2.5 py-2.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[11px] font-medium uppercase tracking-[0.1em] rounded-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            ) : (
              <div className="py-20 px-6 text-center bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-2xl">
                <p className="font-display text-3xl text-[#141413] dark:text-[#F3F1EC] mb-2">No matching pieces</p>
                <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-sm mx-auto mb-6">
                  Adjust your price range or category filter to view available studio garments.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="min-h-[46px] px-6 py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-full transition-colors cursor-pointer"
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
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
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
              className="m3-haze-surface relative z-10 rounded-t-2xl max-h-[82vh] flex flex-col border-t border-[#E6E2DA] dark:border-[#2C2A26] overflow-hidden"
            >
              <div className="pt-3 pb-3.5 px-5 border-b border-[#E6E2DA] dark:border-[#2C2A26] shrink-0">
                <div className="w-10 h-1 bg-[#E6E2DA] dark:bg-[#3A3731] rounded-full mx-auto mb-2.5" />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block">
                      Catalog Controls
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
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-16">
          <div className="flex items-end justify-between gap-4 pb-8 mb-8 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1.5">
                Atelier Selection
              </span>
              <h2 className="font-display text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                Recommended Silhouettes
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setRecOffset(
                    (prev) => (prev - 1 + NEW_YEAR_PRODUCTS.length) % NEW_YEAR_PRODUCTS.length
                  )
                }
                className="w-10 h-10 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#22211E] hover:border-[#141413] dark:hover:border-[#F3F1EC] rounded-sm flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] transition-colors cursor-pointer"
                aria-label="Previous recommendations"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRecOffset((prev) => (prev + 1) % NEW_YEAR_PRODUCTS.length)}
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
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {visibleRecommendations.map((product) => {
              const discountPct = getDiscountPercent(product.price, product.originalPrice);
              return (
                <motion.article
                  key={`rec-${product.id}`}
                  variants={galleryCardVariants}
                  onClick={() => onOpenProduct(product)}
                  className="group cursor-pointer flex flex-col gap-3"
                >
                  <div className="relative aspect-[3/4] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden rounded-sm">
                    <GalleryImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    {discountPct && (
                      <span className="m3-haze-photo absolute top-3 left-3 px-2.5 py-1 text-[#FAF9F7] font-mono text-[10px] font-medium uppercase tracking-[0.12em] rounded-sm">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[#66625B] dark:text-[#A7A299]">
                          {product.category}
                        </p>
                        <h3 className="text-sm font-semibold text-[#141413] dark:text-[#F3F1EC] mt-0.5 truncate">
                          {product.name}
                        </h3>
                      </div>
                      <div className="flex items-baseline gap-1.5 shrink-0">
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] line-through tabular-nums">
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
