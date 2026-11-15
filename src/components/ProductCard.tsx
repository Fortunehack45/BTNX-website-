import { motion } from "motion/react";
import { Eye, Heart, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { CartItem, Product } from "../types";
import { formatNaira } from "../utils/currency";
import { getSwatchHex } from "../utils/colors";
import { getDiscountPercent } from "../utils/invoice";
import { galleryCardVariants } from "../utils/motion";
import { LOCAL_PRODUCT_IMAGES } from "../data";
import GalleryImage from "./GalleryImage";

interface ProductCardProps {
  product: Product;
  cart: CartItem[];
  isSaved: boolean;
  onOpenProduct: (product: Product) => void;
  onAddToBag: (product: Product, size?: string, color?: string) => void;
  onUpdateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  onOpenCart?: () => void;
  onToggleWishlist?: (product: Product) => void;
  wishlistVariant?: "heart" | "trash";
  showInspectBadge?: boolean;
  cardId?: string;
}

export default function ProductCard({
  product,
  cart,
  isSaved,
  onOpenProduct,
  onAddToBag,
  onUpdateQuantity,
  onOpenCart,
  onToggleWishlist,
  wishlistVariant = "heart",
  showInspectBadge = true,
  cardId,
}: ProductCardProps) {
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
      id={cardId}
      variants={galleryCardVariants}
      onClick={() => onOpenProduct(product)}
      className="group cursor-pointer flex flex-col justify-between bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-2.5 sm:p-4 hover:border-[#141413]/35 dark:hover:border-[#3A3731] transition-colors duration-300"
    >
      <div>
        {/* Product Portrait Frame */}
        <div className="relative aspect-[3/4] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden rounded-sm mb-2.5 sm:mb-4">
          <GalleryImage
            src={product.image}
            fallbackSrc={LOCAL_PRODUCT_IMAGES[product.id]}
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
            <span className="m3-haze-photo absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[#FAF9F7] font-mono text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.12em] rounded-sm">
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
              aria-label={
                wishlistVariant === "trash"
                  ? `Remove ${product.name} from saved pieces`
                  : isSaved
                  ? `Remove ${product.name} from saved`
                  : `Save ${product.name}`
              }
              className={`m3-haze-chip absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                wishlistVariant === "trash"
                  ? "text-[#966830] dark:text-[#C89B62] hover:text-rose-700 dark:hover:text-rose-400 opacity-100"
                  : isSaved
                  ? "text-[#966830] dark:text-[#C89B62] opacity-100"
                  : "text-[#141413] dark:text-[#F3F1EC] opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              }`}
            >
              {wishlistVariant === "trash" ? (
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSaved ? "fill-current" : ""}`} />
              )}
            </button>
          )}

          {showInspectBadge && (
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
          )}
        </div>

        {/* Metadata & Editorial Copy */}
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[11px] uppercase tracking-[0.06em] sm:tracking-[0.1em] text-[#66625B] dark:text-[#A7A299] overflow-hidden">
            <span className="truncate">{product.category}</span>
            {product.badge && (
              <>
                <span aria-hidden="true" className="hidden sm:inline shrink-0">
                  ·
                </span>
                <span className="hidden sm:inline text-[#966830] dark:text-[#C89B62] shrink-0">
                  {product.badge}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
            <h3 className="text-[13px] sm:text-[15px] font-semibold text-[#141413] dark:text-[#F3F1EC] leading-snug truncate">
              {product.name}
            </h3>
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

          {product.colors && product.colors.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-1.5 pt-0.5 sm:pt-1">
              {product.colors.map((c) => (
                <span
                  key={c}
                  title={c}
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-black/15 dark:border-white/25 shrink-0"
                  style={{ backgroundColor: getSwatchHex(c) }}
                />
              ))}
              <span className="text-[10px] sm:text-[11px] text-[#66625B] dark:text-[#A7A299] ml-0.5 sm:ml-1 truncate">
                {product.colors[0]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Purchase Controls */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1.5 sm:gap-2 pt-2.5 sm:pt-4 mt-2.5 sm:mt-4 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
        {totalInBag > 0 && primaryItem ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="min-h-[36px] sm:min-h-[44px] border border-[#141413] dark:border-[#F3F1EC]/75 bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm grid grid-cols-3 items-center overflow-hidden"
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
              <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <span className="font-mono text-[11px] sm:text-xs font-semibold text-[#141413] dark:text-[#F3F1EC] text-center tabular-nums select-none">
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
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToBag(product, defaultSize, defaultColor);
            }}
            className="min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 py-2 border border-[#141413] dark:border-[#F3F1EC]/75 text-[#141413] dark:text-[#F3F1EC] hover:bg-[#141413] dark:hover:bg-[#F3F1EC] hover:text-white dark:hover:text-[#141413] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] rounded-sm transition-colors cursor-pointer whitespace-nowrap"
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
            if (onOpenCart) {
              onOpenCart();
            }
          }}
          className="min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 py-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.1em] rounded-sm transition-colors flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span>Buy Now</span>
        </button>
      </div>
    </motion.article>
  );
}
