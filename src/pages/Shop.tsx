import React, { useState } from "react";
import { motion } from "motion/react";
import { Product } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { Search, ChevronLeft, ChevronRight, Star, ShoppingBag } from "lucide-react";
import Newsletter from "../components/Newsletter";

interface ShopProps {
  onOpenProduct: (product: Product) => void;
  onAddToBag: (product: Product) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function Shop({ onOpenProduct, onAddToBag, onAddToast }: ShopProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Product");

  const categories = ["All Product", "For Home", "For Music", "For Phone", "For Storage"];

  const filteredProducts = NEW_YEAR_PRODUCTS.filter((product) => {
    // Simple filter logic for this prototype
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Title Banner */}
      <div className="bg-slate-50 py-20 border-b border-slate-100 text-center">
        <h1 className="font-display text-8xl font-extrabold text-slate-900 tracking-tighter uppercase">Shop</h1>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-12">
        {/* Search Bar */}
        <div className="relative mb-12 max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 space-y-6">
            <h3 className="font-bold text-lg text-slate-900 uppercase tracking-wider">Category</h3>
            <ul className="space-y-3">
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => setCategoryFilter(cat)}
                    className={`w-full text-left font-medium text-sm transition-colors ${categoryFilter === cat ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Product Grid */}
          <div className="flex-1 space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.slice(0, 6).map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  className="group cursor-pointer bg-slate-50 rounded-2xl p-4"
                  onClick={() => onOpenProduct(product)}
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-white">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg uppercase tracking-tight">{product.name}</h4>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1 my-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold">5.0</span>
                    <span className="text-xs text-slate-400">(1.2k Reviews)</span>
                  </div>

                  <p className="text-slate-900 font-bold text-lg mb-4">${product.price}</p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddToBag(product); onAddToast("Added to bag", "success"); }}
                      className="flex-1 bg-white text-slate-900 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddToBag(product); onAddToast("Redirecting to checkout...", "info"); }}
                      className="flex-1 bg-slate-900 text-white py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                    >
                      Buy Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 pt-8">
              <button className="p-2 rounded-full border border-slate-200 hover:bg-slate-50"><ChevronLeft className="w-5 h-5"/></button>
              {[1, 2, 3, "...", 10].map((p, i) => (
                <button key={i} className={`w-10 h-10 rounded-full ${p === 1 ? "bg-slate-900 text-white" : "border border-slate-200 hover:bg-slate-50"}`}>{p}</button>
              ))}
              <button className="p-2 rounded-full border border-slate-200 hover:bg-slate-50"><ChevronRight className="w-5 h-5"/></button>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <section className="py-20 border-t mt-20 border-slate-100">
            <h2 className="font-bold text-2xl text-slate-900 mb-8 uppercase tracking-tighter">Explore our recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {NEW_YEAR_PRODUCTS.slice(0, 3).map(p => (
                    <div key={p.id} className="bg-slate-50 p-6 rounded-2xl flex gap-4 items-center">
                        <img src={p.image} alt={p.name} className="w-20 h-20 object-cover rounded-lg"/>
                        <div>
                            <h4 className="font-bold">{p.name}</h4>
                            <p className="text-sm text-slate-500">${p.price}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
        
        <Newsletter onAddToast={onAddToast} />
      </div>
    </div>
  );
}
