import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { Eye, ShoppingBag, Gift, Check, Filter, X } from "lucide-react";
import LiveCartCounter from "./LiveCartCounter";

interface NewYearCollectionProps {
  categoryFilter: string;
  onResetFilter: () => void;
  onOpenProduct: (product: Product) => void;
  onAddToBag: (product: Product) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  searchQuery?: string;
}

export default function NewYearCollection({
  categoryFilter,
  onResetFilter,
  onOpenProduct,
  onAddToBag,
  onAddToast,
  searchQuery = "",
}: NewYearCollectionProps) {
  const [isVoucherClaimed, setIsVoucherClaimed] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");

  const handleClaimVoucher = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVoucherClaimed) {
      // Copy code
      navigator.clipboard.writeText("BTNX50");
      onAddToast("Voucher code 'BTNX50' copied to clipboard!", "success");
      return;
    }
    
    setIsVoucherClaimed(true);
    setVoucherCode("BTNX50");
    onAddToast("50% OFF VOUCHER CLAIMED! Use code BTNX50", "success");
  };

  const isSearchActive = !!searchQuery.trim();

  // Unified search + filter list
  const filteredSearchProducts = NEW_YEAR_PRODUCTS.filter((product) => {
    if (isSearchActive) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = product.name.toLowerCase().includes(q);
      const descMatch = product.description?.toLowerCase().includes(q);
      const catMatch = product.category.toLowerCase().includes(q);
      const badgeMatch = product.badge?.toLowerCase().includes(q);
      const colorMatch = product.colors?.some((c) => c.toLowerCase().includes(q));
      if (!nameMatch && !descMatch && !catMatch && !badgeMatch && !colorMatch) return false;
    }

    if (!categoryFilter || categoryFilter === "under-100") return true;
    if (categoryFilter === "Women" && product.category.includes("Woman")) return true;
    if (categoryFilter === "Men") {
      // Birmania or Royale Leather or cropped space as unisex
      return product.category.includes("Man") || product.id === "ny-3" || product.id === "ny-2" || product.id === "ny-6";
    }
    if (categoryFilter === "Kids") {
      // Map Kids filter to soft pastel hoodie or colors like layorigin
      return product.id === "ny-4" || product.id === "ny-1";
    }
    return true;
  });

  // Divide the products according to the layout requirements for curated layout:
  const purpleBrooklyn = NEW_YEAR_PRODUCTS[0];
  const croppedSpace = NEW_YEAR_PRODUCTS[1];
  const bottomRowProducts = NEW_YEAR_PRODUCTS.slice(2);

  const filteredBottomRow = bottomRowProducts.filter((p) => {
    if (!categoryFilter || categoryFilter === "under-100") return true;
    if (categoryFilter === "Women" && p.category.includes("Woman")) return true;
    if (categoryFilter === "Men") {
      return p.category.includes("Man") || p.id === "ny-3" || p.id === "ny-6";
    }
    if (categoryFilter === "Kids") {
      return p.id === "ny-4";
    }
    return true;
  });

  return (
    <section id="collection" className="bg-slate-50 py-20 border-t border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h2 
              className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-wider uppercase select-none"
              id="collection-heading"
            >
              NEW YEAR COLLECTION
            </h2>
            <p className="font-sans text-sm text-slate-500 mt-2 font-medium">
              Carefully curated seasonal garments selected for ultimate modern styling.
            </p>
          </div>

          {/* Active Filter Pill */}
          {categoryFilter && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider"
              id="active-filter-pill"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Viewing: {categoryFilter === "under-100" ? "Under $100" : categoryFilter}</span>
              <button 
                onClick={onResetFilter}
                className="ml-1.5 p-0.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                aria-label="Clear Filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </div>

        {isSearchActive ? (
          <div>
            {/* Search metadata */}
            <div className="mb-8 p-6 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <span className="text-sm text-slate-500 font-medium">
                Found <span className="text-slate-900 font-extrabold">{filteredSearchProducts.length}</span> matching items for "<span className="text-slate-900 font-bold">{searchQuery}</span>"
              </span>
              <button
                onClick={onResetFilter}
                className="text-xs text-slate-400 hover:text-slate-900 font-bold uppercase tracking-wider underline transition-colors"
              >
                Clear Filters & Search
              </button>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" id="search-results-grid">
              <AnimatePresence mode="popLayout">
                {filteredSearchProducts.map((product) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={product.id}
                    className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => onOpenProduct(product)}
                    id={`search-card-${product.id}`}
                  >
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4 bg-slate-50">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {product.badge && (
                        <span className="absolute top-3 left-3 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                          {product.badge}
                        </span>
                      )}
                      <LiveCartCounter productId={product.id} />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProduct(product);
                          }}
                          className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                          title="Quick View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToBag(product);
                          }}
                          className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                          title="Add to Bag"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <h4 className="font-sans font-extrabold text-slate-800 text-sm tracking-wide uppercase">
                          {product.name}
                        </h4>
                        <p className="font-sans text-[11px] text-slate-400 font-semibold mt-0.5">
                          {product.category}
                        </p>
                      </div>
                      <span className="font-display text-xl font-bold text-slate-900">
                        ${product.price}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredSearchProducts.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-100" id="empty-search-state">
                  <div className="max-w-md mx-auto px-4">
                    <p className="text-slate-800 font-extrabold text-lg uppercase tracking-wider mb-2">No results matched your search</p>
                    <p className="text-slate-400 font-medium text-xs leading-relaxed mb-6">
                      Try searching for broader keywords like <span className="font-bold text-slate-600">purple</span>, <span className="font-bold text-slate-600">leather</span>, or <span className="font-bold text-slate-600">cropped</span>, or choose one of our catalog categories in the navigation header.
                    </p>
                    <button 
                      onClick={() => {
                        onResetFilter();
                        // Clear search field by triggering window event or similar if needed, or simply clearing filter
                      }}
                      className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase rounded-full hover:bg-slate-800 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Curated Grid: Large left voucher promo banner, two smaller product cards on the right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12" id="collection-top-grid">
              
              {/* Large Promo Card (END YEAR BIG DEAL) */}
              <div 
                className="lg:col-span-2 relative h-[450px] sm:h-[500px] md:h-[520px] lg:h-auto rounded-3xl overflow-hidden shadow-md group cursor-pointer border border-slate-100"
                id="voucher-promo-card"
              >
                {/* Background image */}
                <img
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200"
                  alt="End Year Big Deal Promo"
                  className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-[1200ms]"
                  referrerPolicy="no-referrer"
                />
                {/* Soft dark mask */}
                <div className="absolute inset-0 bg-black/35 group-hover:bg-black/30 transition-colors duration-300" />

                {/* Inner Content */}
                <div className="absolute inset-0 flex flex-col items-start justify-end p-8 sm:p-12 text-left">
                  <span className="bg-rose-500 text-white text-[11px] font-bold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full mb-4 shadow-sm flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest">Limited Offer</span>
                  </span>
                  <h3 
                    className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-widest uppercase mb-3 leading-none drop-shadow-sm"
                  >
                    END YEAR BIG DEAL
                  </h3>
                  <p 
                    className="font-sans text-sm sm:text-base text-slate-100 font-light max-w-sm mb-8 leading-relaxed drop-shadow-xs"
                  >
                    With Special Offers Up to 50% off on selected items
                  </p>

                  <button
                    onClick={handleClaimVoucher}
                    className={`px-8 py-3.5 font-bold text-xs tracking-widest rounded-full uppercase shadow-lg transform transition-all duration-300 flex items-center gap-2 ${
                      isVoucherClaimed
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 active:scale-95"
                        : "bg-white hover:bg-slate-100 text-slate-900 hover:scale-105 active:scale-95"
                    }`}
                  >
                    {isVoucherClaimed ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>CODE: BTNX50 (COPY)</span>
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 text-slate-800" />
                        <span>CLAIM VOUCHER</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Purple Brooklyn and Cropped Space Stack */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-8" id="top-featured-products">
                
                {/* Small Card 1: Purple Brooklyn */}
                <div 
                  className="flex-1 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => onOpenProduct(purpleBrooklyn)}
                  id="featured-product-purple-brooklyn"
                >
                  <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-50">
                    <img
                      src={purpleBrooklyn.image}
                      alt={purpleBrooklyn.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Hot badge */}
                    <span className="absolute top-3 left-3 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                      {purpleBrooklyn.badge}
                    </span>

                    <LiveCartCounter productId={purpleBrooklyn.id} />

                    {/* Quick actions overlay */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProduct(purpleBrooklyn);
                        }}
                        className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                        title="Quick View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToBag(purpleBrooklyn);
                        }}
                        className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                        title="Add to Bag"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Price Footer */}
                  <div className="flex justify-between items-start pt-1">
                    <div>
                      <h4 className="font-sans font-extrabold text-slate-800 text-base tracking-wide uppercase">
                        {purpleBrooklyn.name}
                      </h4>
                      <p className="font-sans text-xs text-slate-400 font-semibold mt-0.5">
                        {purpleBrooklyn.category}
                      </p>
                    </div>
                    <span className="font-display text-2xl font-bold text-slate-900">
                      ${purpleBrooklyn.price}
                    </span>
                  </div>
                </div>

                {/* Small Card 2: Cropped Space */}
                <div 
                  className="flex-1 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => onOpenProduct(croppedSpace)}
                  id="featured-product-cropped-space"
                >
                  <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-50">
                    <img
                      src={croppedSpace.image}
                      alt={croppedSpace.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />

                    {/* Trending badge */}
                    <span className="absolute top-3 left-3 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                      {croppedSpace.badge}
                    </span>

                    <LiveCartCounter productId={croppedSpace.id} />

                    {/* Quick actions overlay */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProduct(croppedSpace);
                        }}
                        className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                        title="Quick View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToBag(croppedSpace);
                        }}
                        className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                        title="Add to Bag"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Price Footer */}
                  <div className="flex justify-between items-start pt-1">
                    <div>
                      <h4 className="font-sans font-extrabold text-slate-800 text-base tracking-wide uppercase">
                        {croppedSpace.name}
                      </h4>
                      <p className="font-sans text-xs text-slate-400 font-semibold mt-0.5">
                        {croppedSpace.category}
                      </p>
                    </div>
                    <span className="font-display text-2xl font-bold text-slate-900">
                      ${croppedSpace.price}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Grid: 4-Column Row of core products */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" id="collection-bottom-grid">
              <AnimatePresence mode="popLayout">
                {filteredBottomRow.map((product) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={product.id}
                    className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => onOpenProduct(product)}
                    id={`product-card-${product.id}`}
                  >
                    {/* Product Frame */}
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4 bg-slate-50">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />

                      <LiveCartCounter productId={product.id} />

                      {/* Actions cover */}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProduct(product);
                          }}
                          className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                          title="Quick View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToBag(product);
                          }}
                          className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                          title="Add to Bag"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Footer Label */}
                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <h4 className="font-sans font-extrabold text-slate-800 text-sm tracking-wide uppercase">
                          {product.name}
                        </h4>
                        <p className="font-sans text-[11px] text-slate-400 font-semibold mt-0.5">
                          {product.category}
                        </p>
                      </div>
                      <span className="font-display text-xl font-bold text-slate-900">
                        ${product.price}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredBottomRow.length === 0 && (
                <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-100" id="empty-collection-state">
                  <p className="text-slate-400 font-medium">No products found in this category.</p>
                  <button 
                    onClick={onResetFilter}
                    className="mt-4 px-6 py-2 bg-slate-900 text-white text-xs font-bold uppercase rounded-full hover:bg-slate-800 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </section>
  );
}
