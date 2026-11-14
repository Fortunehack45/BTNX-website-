import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Heart, ShoppingBag, Trash2, ArrowRight, Minus, Plus } from "lucide-react";
import { Product, CartItem } from "../types";
import { formatNaira } from "../utils/currency";
import { getSwatchHex } from "../utils/colors";
import { getDiscountPercent } from "../utils/invoice";
import GalleryImage from "../components/GalleryImage";
import { galleryContainerVariants, galleryCardVariants } from "../utils/motion";

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
      <section className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-12 lg:py-16">
        {wishlist.length > 0 ? (
          <motion.div
            variants={galleryContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 sm:gap-8"
          >
            {wishlist.map((product) => {
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
                        className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                      {discountPct && (
                        <span className="m3-haze-photo absolute top-3 left-3 px-2.5 py-1 text-[#FAF9F7] font-mono text-[10px] font-medium uppercase tracking-[0.12em] rounded-sm">
                          -{discountPct}%
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWishlist(product);
                        }}
                        aria-label={`Remove ${product.name} from saved pieces`}
                        className="m3-haze-chip absolute top-3 right-3 w-10 h-10 rounded-full text-[#966830] dark:text-[#C89B62] shadow-sm flex items-center justify-center hover:text-rose-700 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
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
                        <h2 className="text-[15px] font-semibold text-[#141413] dark:text-[#F3F1EC] truncate">
                          {product.name}
                        </h2>
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
                          aria-label={`Decrease quantity of ${product.name}`}
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
                          aria-label={`Increase quantity of ${product.name}`}
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
