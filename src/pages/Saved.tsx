import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Heart, ArrowRight } from "lucide-react";
import { Product, CartItem } from "../types";
import ProductCard from "../components/ProductCard";
import { galleryContainerVariants } from "../utils/motion";

interface SavedProps {
  wishlist: Product[];
  cart: CartItem[];
  onToggleWishlist: (product: Product) => void;
  onOpenProduct: (product: Product) => void;
  onAddToBag: (product: Product, size?: string, color?: string) => void;
  onUpdateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  onOpenCart: () => void;
}

export default function Saved({
  wishlist,
  cart,
  onToggleWishlist,
  onOpenProduct,
  onAddToBag,
  onUpdateQuantity,
  onOpenCart,
}: SavedProps) {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] pb-20 lg:pb-0">
      {/* Editorial Header */}
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-9 sm:py-12 lg:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-2.5">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block">
                Personal Archive · Shortlist
              </span>
              <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.015em] text-balance">
                Saved Pieces
              </h1>
              <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-lg leading-relaxed">
                Your curated selection of BTNX garments. Move saved silhouettes straight to your shopping bag or inspect full tailoring notes.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">
                <strong className="text-[#141413] dark:text-[#F3F1EC]">{wishlist.length}</strong>{" "}
                {wishlist.length === 1 ? "Piece" : "Pieces"} Saved
              </span>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="min-h-[42px] px-5 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-white dark:bg-[#22211E] text-xs font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Browse Shop</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Items Content */}
      <section className="max-w-[1360px] mx-auto px-3.5 sm:px-8 lg:px-12 py-6 sm:py-12 lg:py-16">
        {wishlist.length > 0 ? (
          <motion.div
            variants={galleryContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-7 lg:gap-8"
          >
            {wishlist.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cart={cart}
                isSaved={true}
                onOpenProduct={onOpenProduct}
                onAddToBag={onAddToBag}
                onUpdateQuantity={onUpdateQuantity}
                onOpenCart={onOpenCart}
                onToggleWishlist={onToggleWishlist}
                wishlistVariant="trash"
                showInspectBadge={false}
              />
            ))}
          </motion.div>
        ) : (
          <div className="py-20 px-6 text-center bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm">
            <Heart className="w-8 h-8 text-[#66625B] dark:text-[#A7A299] mx-auto mb-3 stroke-[1.25]" />
            <h2 className="font-display text-3xl text-[#141413] dark:text-[#F3F1EC] mb-2">No saved pieces yet</h2>
            <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-md mx-auto mb-6 leading-relaxed">
              Tap the heart icon on any piece in the seasonal catalog to shortlist garments for later.
            </p>
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="min-h-[46px] px-7 py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer"
            >
              Explore Seasonal Catalog
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
