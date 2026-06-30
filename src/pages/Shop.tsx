import React, { useState } from "react";
import { motion } from "motion/react";
import { Product } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { Search, ChevronLeft, ChevronRight, Star, ShoppingBag, ArrowRight } from "lucide-react";

interface ShopProps {
  onOpenProduct: (product: Product) => void;
  onAddToBag: (product: Product) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onOpenCart: () => void;
}

export default function Shop({ onOpenProduct, onAddToBag, onAddToast, onOpenCart }: ShopProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Product");

  // Filter products based on search and category filter
  const filteredProducts = NEW_YEAR_PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    
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

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-slate-900">
      
      {/* 1. Giant Editorial Hero Title Banner with Overlay "Shop" text */}
      <div className="relative h-[480px] overflow-hidden flex items-center justify-center bg-slate-100">
        {/* Unsplash image of high-end luxury fashion store layout */}
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-multiply opacity-30" 
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80')` }} 
        />
        {/* Soft elegant gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-500/10 to-white" />
        
        {/* Huge serif display label */}
        <h1 className="relative font-display text-[10rem] md:text-[16rem] font-black text-slate-950/20 tracking-tighter uppercase select-none pointer-events-none transform -translate-y-8">
          Shop
        </h1>
      </div>

      {/* 2. Floating Search Bar Strip - Styled precisely like the mockup */}
      <div className="relative z-10 -mt-24 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            onAddToast(`Search applied for: "${searchQuery}"`, "info");
          }}
          className="bg-white rounded-3xl md:rounded-full border border-slate-100 shadow-xl p-4 md:py-3 md:px-6 flex flex-col md:flex-row items-center gap-4 justify-between"
        >
          <div className="flex items-center gap-2 pl-2">
            <span className="font-extrabold text-slate-950 text-lg uppercase tracking-tight whitespace-nowrap">
              Give All You Need
            </span>
          </div>
          
          <div className="relative w-full md:flex-1 md:max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search on Stuffus"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-full bg-slate-50 border-0 focus:outline-none text-slate-900 text-sm font-medium"
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
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-16">
        <div className="flex flex-col md:flex-row gap-12">
          
          {/* 3. Nested Tree Sidebar Category layout */}
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
                      { label: "For Outerwear", icon: "🧥" },
                      { label: "For Tops", icon: "👕" },
                      { label: "For Bottoms", icon: "👖" },
                      { label: "For Accessories", icon: "🕶️" },
                      { label: "For Footwear", icon: "👟" }
                    ].map((sub, idx) => {
                      const isActive = categoryFilter === sub.label;
                      return (
                        <li key={idx} className="flex items-center gap-2.5 relative group">
                          {/* Custom branch dot indicator */}
                          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? "bg-slate-950" : "bg-slate-200 group-hover:bg-slate-950"}`} />
                          <button
                            onClick={() => setCategoryFilter(sub.label)}
                            className={`text-left text-xs font-semibold tracking-wide transition-colors ${
                              isActive ? "text-slate-950 font-bold" : "text-slate-500 hover:text-slate-950"
                            }`}
                          >
                            {sub.icon} <span className="ml-1">{sub.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              </ul>
            </div>
            
            {/* Elegant Dropdowns / Expandable Filters exactly from image */}
            <div className="border-t border-slate-100 pt-8 space-y-4">
              {[
                { label: "New Arrival", badge: "Trending", icon: "✨" },
                { label: "Best Seller", badge: "Hot Choice", icon: "🔥" },
                { label: "On Discount", badge: "Classic", icon: "🏷️" }
              ].map((item, idx) => {
                const isActive = categoryFilter === item.badge;
                return (
                  <button 
                    key={idx} 
                    onClick={() => setCategoryFilter(isActive ? "All Product" : item.badge)}
                    className={`w-full flex justify-between items-center text-xs font-extrabold uppercase tracking-widest transition-colors ${
                      isActive ? "text-slate-950 font-black" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{item.icon}</span>
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
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  className="group cursor-pointer bg-slate-50/70 rounded-[2rem] p-5 hover:bg-white hover:shadow-xl hover:border-slate-100 border border-transparent transition-all duration-300 flex flex-col justify-between h-full relative"
                  onClick={() => onOpenProduct(product)}
                >
                  {/* Image Block with Badge */}
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

                  {/* Info Row: Title & Price side-by-side, then Stars rating underneath */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <h4 className="font-extrabold text-slate-950 text-base uppercase tracking-tight group-hover:text-slate-800 transition-colors">
                          {product.name}
                        </h4>
                        <span className="font-black text-slate-950 text-base whitespace-nowrap">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mb-5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-extrabold text-slate-900">5.0</span>
                        <span className="text-[10px] text-slate-400 font-medium">(1.2k Reviews)</span>
                      </div>
                    </div>

                    {/* Custom dual button block exactly as illustrated */}
                    <div className="flex gap-2.5">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onAddToBag(product); 
                        }}
                        className="flex-1 bg-white hover:bg-slate-100 text-slate-950 border border-slate-200 py-3 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all"
                      >
                        Add to Chart
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
                </motion.div>
              ))}
            </div>

            {/* 5. Pagination - Centered block styled cleanly matching image */}
            <div className="flex items-center justify-center gap-3 pt-12 border-t border-slate-100">
              <button 
                onClick={() => onAddToast("This is a demo store, only the first page is active.", "info")}
                className="text-xs font-extrabold uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors py-2 px-4"
              >
                ← Previous
              </button>
              
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, "...", 8, 9, 10].map((p, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      if (typeof p === "number") {
                        onAddToast("This is a demo store, showing page 1.", "info");
                      }
                    }}
                    className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                      p === 1 
                        ? "bg-slate-950 text-white shadow-sm" 
                        : p === "..."
                        ? "text-slate-400 cursor-default"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => onAddToast("This is a demo store, only the first page is active.", "info")}
                className="text-xs font-extrabold uppercase tracking-widest text-slate-950 hover:text-slate-700 transition-colors py-2 px-4"
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
                onClick={() => onAddToast("Exploring more options...", "info")}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onAddToast("Exploring more options...", "info")}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-all"
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
                      ${product.price.toFixed(2)}
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
                    Add to Chart
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
