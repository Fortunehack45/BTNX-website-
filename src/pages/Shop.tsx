import React, { useState } from "react";
import { motion } from "motion/react";
import { Product } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "../utils/currency";
import { Search, ChevronLeft, ChevronRight, Star, ShoppingBag, ArrowRight, Layers, Shirt, Scissors, Glasses, Footprints, Flame, Tag, Sparkles, SlidersHorizontal, ArrowUpDown, X, Sparkle, RotateCcw } from "lucide-react";

interface ShopProps {
  onOpenProduct: (product: Product) => void;
  onAddToBag: (product: Product) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onOpenCart: () => void;
}

export default function Shop({ onOpenProduct, onAddToBag, onAddToast, onOpenCart }: ShopProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Product");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [sortBy, setSortBy] = useState<string>("featured");

  // Reset all filters helper
  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Product");
    setMinPrice(0);
    setMaxPrice(500);
    setSortBy("featured");
    onAddToast("All shop filters reset successfully", "info");
  };

  // Filter products based on search, category filter, and price ranges
  const filteredProducts = NEW_YEAR_PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // Price boundary check
    const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
    if (!matchesPrice) return false;

    if (categoryFilter === "All Product" || !categoryFilter) {
      return matchesSearch;
    }
    
    const nameAndDesc = (product.name + " " + (product.description || "")).toLowerCase();
    if (categoryFilter === "For Outerwear") {
      return matchesSearch && (nameAndDesc.includes("jacket") || nameAndDesc.includes("hoody") || nameAndDesc.includes("overshirt") || nameAndDesc.includes("coat"));
    }
    if (categoryFilter === "For Tops") {
      return matchesSearch && (nameAndDesc.includes("sweater") || nameAndDesc.includes("sweatshirt") || nameAndDesc.includes("crewneck") || nameAndDesc.includes("pullover") || nameAndDesc.includes("t-shirt") || nameAndDesc.includes("crop"));
    }
    if (categoryFilter === "For Bottoms") {
      return matchesSearch && (nameAndDesc.includes("jeans") || nameAndDesc.includes("pants") || nameAndDesc.includes("trousers") || nameAndDesc.includes("denim"));
    }
    if (categoryFilter === "For Accessories") {
      return matchesSearch && (nameAndDesc.includes("bag") || nameAndDesc.includes("glasses") || nameAndDesc.includes("scarf") || nameAndDesc.includes("belt") || nameAndDesc.includes("sunglasses"));
    }
    if (categoryFilter === "For Footwear") {
      return matchesSearch && (nameAndDesc.includes("sneakers") || nameAndDesc.includes("boots") || nameAndDesc.includes("shoes") || nameAndDesc.includes("footwear"));
    }
    
    // Fallback if filtering by product badge directly
    return matchesSearch && (product.badge === categoryFilter || product.category === categoryFilter);
  });

  // Sort filtered products based on selection
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") {
      return a.price - b.price;
    }
    if (sortBy === "price-desc") {
      return b.price - a.price;
    }
    if (sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    }
    return 0; // Default "featured"
  });

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-slate-900">
      
      {/* 1. Ultra-Luxurious, Full Image Hero Banner */}
      <div className="relative h-[380px] sm:h-[440px] md:h-[500px] bg-slate-950 text-white flex flex-col justify-center items-center px-4 sm:px-6 md:px-8 border-b border-white/5 overflow-hidden">
        {/* Full-bleed background fashion store/lookbook image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-multiply pointer-events-none" 
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80')` }} 
        />
        {/* Soft elegant ambient background lights & gradients to keep contrast high */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/30 to-slate-950/75 pointer-events-none" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
        
        {/* Giant Editorial "SHOP" Backdrop Text - Pure White, 0 transparent, with exactly 15% behind the search bar and next section */}
        <div className="absolute bottom-0 translate-y-[15%] left-1/2 -translate-x-1/2 select-none pointer-events-none z-0 whitespace-nowrap text-center w-full">
          <h1 
            className="text-[11rem] sm:text-[18rem] md:text-[25rem] lg:text-[32rem] font-extrabold text-white uppercase leading-none select-none"
            style={{ fontFamily: '"Anton SC", sans-serif', letterSpacing: '0.08em' }}
          >
            SHOP
          </h1>
        </div>
      </div>

      {/* 2. Floating Search Bar Strip - Styled precisely like the mockup */}
      <div className="relative z-20 -mt-10 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            onAddToast(`Search applied for: "${searchQuery}"`, "info");
          }}
          className="bg-white rounded-3xl md:rounded-full border border-slate-100 shadow-xl p-4 md:py-3.5 md:px-6 flex flex-col md:flex-row items-center gap-4 justify-between"
        >
          <div className="flex items-center gap-2 pl-2">
            <span className="font-extrabold text-slate-950 text-lg uppercase tracking-tight whitespace-nowrap">
              Klamby Collection
            </span>
          </div>
          
          <div className="relative w-full md:flex-1 md:max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search our luxury collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-full bg-slate-50 border-0 focus:outline-none text-slate-900 text-sm font-medium focus:ring-1 focus:ring-slate-200 transition-all"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full md:w-auto bg-slate-950 text-white font-extrabold text-sm px-8 py-4 rounded-full uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Grid Content Area */}
      <div className="relative z-10 bg-white max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-16">
        
        {/* Dynamic Filter Info Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Catalogue:</span>
            <span className="bg-slate-100 text-slate-900 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              {categoryFilter}
            </span>
            {searchQuery && (
              <span className="bg-amber-50 text-amber-800 text-xs px-3 py-1 rounded-full font-semibold border border-amber-100">
                Searching: &quot;{searchQuery}&quot;
              </span>
            )}
            {(minPrice > 0 || maxPrice < 500) && (
              <span className="bg-slate-50 text-slate-800 text-xs px-3 py-1 rounded-full font-mono">
                {formatNaira(minPrice)} - {formatNaira(maxPrice)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 font-mono">
              SHOWING <span className="text-slate-950 font-extrabold">{sortedProducts.length}</span> OF {NEW_YEAR_PRODUCTS.length} ITEMS
            </span>
            {(categoryFilter !== "All Product" || searchQuery || minPrice > 0 || maxPrice < 500 || sortBy !== "featured") && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-red-500 hover:text-red-700 transition-colors"
                title="Clear all active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          
          {/* 3. Nested Tree Sidebar Category layout & New Dynamic Filters */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-10">
            <div>
              <h3 className="font-extrabold text-sm text-slate-950 uppercase tracking-widest mb-6">Category</h3>
              
              <ul className="space-y-4">
                {/* Active All Product folder */}
                <li>
                  <div 
                    onClick={() => setCategoryFilter("All Product")}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer border transition-colors ${
                      categoryFilter === "All Product" ? "bg-slate-50 border-slate-100" : "bg-white border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-slate-950" />
                      <span className="font-extrabold text-slate-950 text-sm">All Product</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        {NEW_YEAR_PRODUCTS.length}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${categoryFilter === "All Product" ? "transform rotate-90" : ""}`} />
                    </div>
                  </div>
                  
                  {/* Nested Subcategories with custom connector style */}
                  <ul className="mt-3 pl-4 border-l-2 border-slate-100 ml-6 space-y-3 relative">
                    {[
                      { label: "For Outerwear", icon: Layers },
                      { label: "For Tops", icon: Shirt },
                      { label: "For Bottoms", icon: Scissors },
                      { label: "For Accessories", icon: Glasses },
                      { label: "For Footwear", icon: Footprints }
                    ].map((sub, idx) => {
                      const isActive = categoryFilter === sub.label;
                      const IconComponent = sub.icon;
                      return (
                        <li key={idx} className="flex items-center gap-2.5 relative group">
                          {/* Custom branch dot indicator */}
                          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? "bg-slate-950" : "bg-slate-200 group-hover:bg-slate-950"}`} />
                          <button
                            onClick={() => setCategoryFilter(sub.label)}
                            className={`text-left text-xs font-semibold tracking-wide transition-colors flex items-center gap-2 ${
                              isActive ? "text-slate-950 font-bold" : "text-slate-500 hover:text-slate-950"
                            }`}
                          >
                            <IconComponent className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : "text-slate-400 group-hover:text-slate-950"}`} />
                            <span>{sub.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              </ul>
            </div>
            
            {/* Dynamic Price Range Selector */}
            <div className="border-t border-slate-100 pt-8">
              <h3 className="font-extrabold text-sm text-slate-950 uppercase tracking-widest mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span>Price Range</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                  <span>{formatNaira(minPrice)}</span>
                  <span className="font-extrabold text-slate-950">{formatNaira(maxPrice)}</span>
                </div>
                
                <input 
                  type="range" 
                  min="0" 
                  max="500" 
                  step="10"
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-950" 
                />
                
                {/* Custom Luxury Price Preset Tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {[
                    { label: "All Prices", min: 0, max: 500 },
                    { label: "Under ₦225,000", min: 0, max: 150 },
                    { label: "₦225,000 - ₦450,000", min: 150, max: 300 },
                    { label: "Over ₦450,000", min: 300, max: 500 }
                  ].map((preset, idx) => {
                    const isPresetSelected = minPrice === preset.min && maxPrice === preset.max;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMinPrice(preset.min);
                          setMaxPrice(preset.max);
                        }}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all border ${
                          isPresetSelected 
                            ? "bg-slate-950 text-white border-slate-950" 
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-950"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dynamic Sort By Selector */}
            <div className="border-t border-slate-100 pt-8">
              <h3 className="font-extrabold text-sm text-slate-950 uppercase tracking-widest mb-6 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-slate-500" />
                <span>Sort By</span>
              </h3>
              
              <ul className="space-y-3">
                {[
                  { value: "featured", label: "Featured Collections" },
                  { value: "price-asc", label: "Price: Low to High" },
                  { value: "price-desc", label: "Price: High to Low" },
                  { value: "name-asc", label: "Alphabetical: A-Z" }
                ].map((option) => {
                  const isOptionActive = sortBy === option.value;
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => setSortBy(option.value)}
                        className={`w-full flex items-center justify-between text-left text-xs font-semibold py-2 px-3 rounded-xl transition-all ${
                          isOptionActive 
                            ? "bg-slate-950 text-white font-bold" 
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isOptionActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            
            {/* Elegant Dropdowns / Expandable Filters exactly from image */}
            <div className="border-t border-slate-100 pt-8 space-y-4">
              {[
                { label: "New Arrival", badge: "Trending", icon: Sparkles },
                { label: "Best Seller", badge: "Hot Choice", icon: Flame },
                { label: "On Discount", badge: "Classic", icon: Tag }
              ].map((item, idx) => {
                const isActive = categoryFilter === item.badge;
                const IconComponent = item.icon;
                return (
                  <button 
                    key={idx} 
                    onClick={() => setCategoryFilter(isActive ? "All Product" : item.badge)}
                    className={`w-full flex justify-between items-center text-xs font-extrabold uppercase tracking-widest transition-colors ${
                      isActive ? "text-slate-950 font-black" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <IconComponent className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-slate-400 group-hover:text-slate-900"}`} />
                      <span>{item.label}</span>
                    </span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isActive ? "transform rotate-90" : ""}`} />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* 4. Product Cards Grid matching visual mockup style */}
          <div className="flex-1 space-y-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  className="group cursor-pointer bg-white rounded-[2.5rem] p-6 hover:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.06)] border border-slate-100 hover:border-slate-200/80 transition-all duration-500 flex flex-col justify-between h-full relative overflow-hidden"
                  onClick={() => onOpenProduct(product)}
                >
                  {/* Image Block with Badge */}
                  <div className="relative overflow-hidden rounded-[1.8rem] mb-6">
                    <span className="absolute top-4 left-4 z-10 bg-slate-950/90 backdrop-blur-md text-amber-300 font-mono text-[8px] font-extrabold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full shadow-sm">
                      {product.badge || "COLLECTION"}
                    </span>
                    <div className="aspect-[4/5] bg-slate-50 overflow-hidden flex items-center justify-center relative">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out" 
                        referrerPolicy="no-referrer"
                      />
                      {/* Subtle hover dark overlay */}
                      <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/5 transition-colors duration-500" />
                    </div>
                  </div>

                  {/* Info Row: Title & Price side-by-side, then Stars rating underneath */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-baseline gap-2 mb-2">
                        <h4 className="font-serif text-slate-950 text-base sm:text-lg font-bold tracking-tight group-hover:text-amber-600 transition-colors duration-300 truncate">
                          {product.name}
                        </h4>
                        <span className="font-mono text-sm font-extrabold text-slate-950 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-lg whitespace-nowrap">
                          {formatNaira(product.price)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mb-6">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 font-mono ml-1">5.0</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          • (1.2k Sold)
                        </span>
                      </div>
                    </div>

                    {/* Custom dual button block exactly as illustrated */}
                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onAddToBag(product); 
                        }}
                        className="flex-1 bg-white hover:bg-slate-950 text-slate-900 hover:text-white border border-slate-200 hover:border-slate-950 py-3 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300"
                      >
                        Add to Bag
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onAddToBag(product); 
                          onOpenCart();
                        }}
                        className="flex-1 bg-slate-950 hover:bg-amber-500 text-white hover:text-white py-3 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 shadow-sm"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 5. Pagination - Centered block styled cleanly matching image */}
            <div className="flex items-center justify-center gap-3 pt-12 border-t border-slate-100">
              <button 
                disabled
                className="text-xs font-extrabold uppercase tracking-widest text-slate-300 cursor-not-allowed py-2 px-4"
              >
                ← Previous
              </button>
              
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, "...", 8, 9, 10].map((p, idx) => (
                  <button 
                    key={idx} 
                    disabled={p !== 1}
                    className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                      p === 1 
                        ? "bg-slate-950 text-white shadow-sm" 
                        : p === "..."
                        ? "text-slate-400 cursor-default"
                        : "text-slate-300 cursor-not-allowed"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              
              <button 
                disabled
                className="text-xs font-extrabold uppercase tracking-widest text-slate-300 cursor-not-allowed py-2 px-4"
              >
                Next →
              </button>
            </div>
          </div>

        </div>

        {/* 6. Recommendations Section exactly styled as seen on the layout */}
        <section className="py-24 border-t border-slate-100 mt-24">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-extrabold text-2xl text-slate-950 uppercase tracking-tight">
              Explore our recommendations
            </h2>
            <div className="flex gap-2">
              <button 
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-all"
                aria-label="Previous recommendation"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-all"
                aria-label="Next recommendation"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {NEW_YEAR_PRODUCTS.slice(0, 3).map((product) => (
              <div 
                key={product.id} 
                onClick={() => onOpenProduct(product)}
                className="group cursor-pointer bg-slate-50/70 rounded-[2rem] p-5 hover:bg-white hover:shadow-xl hover:border-slate-100 border border-transparent transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="relative">
                    <span className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[9px] font-extrabold text-slate-500 uppercase tracking-wider shadow-sm border border-slate-100">
                      {product.badge || "Other"}
                    </span>
                    <div className="aspect-square bg-white rounded-2xl overflow-hidden mb-5 flex items-center justify-center p-3">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h4 className="font-extrabold text-slate-950 text-base uppercase tracking-tight">
                      {product.name}
                    </h4>
                    <span className="font-black text-slate-950 text-base whitespace-nowrap">
                      {formatNaira(product.price)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-5">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-extrabold text-slate-900">5.0</span>
                    <span className="text-[10px] text-slate-400 font-medium">(1.2k Reviews)</span>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation();
                      onAddToBag(product); 
                    }}
                    className="flex-1 bg-white hover:bg-slate-100 text-slate-950 border border-slate-200 py-3 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all"
                  >
                    Add to Bag
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation();
                      onAddToBag(product); 
                      onOpenCart();
                    }}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 text-white py-3 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all shadow-sm"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Newsletter Box Strip - Custom black block exactly as designed in layout */}
        <section className="bg-zinc-950 text-white rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden mt-16 shadow-xl">
          {/* Faint pattern inside box */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-800/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="space-y-6 w-full lg:max-w-xl">
              <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-none uppercase">
                Ready to Get Our New Stuff?
              </h2>
              
              {/* White capsule search input exactly from image */}
              <div className="flex items-center bg-white p-2.5 rounded-full border-0 w-full max-w-md shadow-lg">
                <input
                  type="email"
                  placeholder="Your Email"
                  className="bg-transparent pl-4 pr-2 py-2 text-slate-900 focus:outline-none flex-1 text-sm font-semibold placeholder:text-slate-400 placeholder:font-bold"
                />
                <button 
                  onClick={() => onAddToast("Thank you for subscribing!", "success")}
                  className="bg-slate-950 text-white font-extrabold text-xs px-8 py-3.5 rounded-full uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Stylized context paragraph on the right side */}
            <div className="lg:max-w-md space-y-4 text-right lg:text-left self-end lg:self-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Klamby for Fashion and Apparel
              </p>
              <p className="text-slate-300 text-sm font-medium leading-relaxed italic">
                "We'll listen to your preferences, curate the best fits, and showcase a bespoke collection of contemporary apparel that is right for you."
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
