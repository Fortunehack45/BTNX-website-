import { Home, Store, Tag, Heart, ShoppingBag } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface MobileBottomNavProps {
  cartCount: number;
  wishlistCount: number;
  isOverlayProfileOpen?: boolean;
  onNavigatePage: () => void;
  onResetHome: () => void;
}

export default function MobileBottomNav({
  cartCount,
  wishlistCount,
  isOverlayProfileOpen = false,
  onNavigatePage,
  onResetHome,
}: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isHomeActive = !isOverlayProfileOpen && location.pathname === "/";
  const isShopActive = !isOverlayProfileOpen && location.pathname === "/shop";
  const isPromosActive = !isOverlayProfileOpen && location.pathname === "/promos";
  const isSavedActive = !isOverlayProfileOpen && location.pathname === "/saved";
  const isBagActive = !isOverlayProfileOpen && location.pathname === "/bag";

  return (
    <nav
      aria-label="Mobile page navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-[48] m3-haze-bar border-t border-[#E6E2DA]/85 dark:border-[#2C2A26]/85 pb-[env(safe-area-inset-bottom)] transition-colors duration-200"
    >
      <div className="grid grid-cols-5 h-[60px]">
        <button
          type="button"
          onClick={() => {
            onResetHome();
            navigate("/");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors duration-150 cursor-pointer ${
            isHomeActive
              ? "text-[#141413] dark:text-white"
              : "text-[#7A756B] dark:text-[#78736F] hover:text-[#141413] dark:hover:text-[#D5D0C6]"
          }`}
        >
          <span className="relative inline-flex items-center justify-center w-6 h-6">
            <Home className={`w-[19px] h-[19px] ${isHomeActive ? "stroke-[2.1]" : "stroke-[1.5]"}`} />
          </span>
          <span className={`text-[10px] tracking-[0.02em] leading-none ${isHomeActive ? "font-semibold" : "font-medium"}`}>
            Home
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigatePage();
            navigate("/shop");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors duration-150 cursor-pointer ${
            isShopActive
              ? "text-[#141413] dark:text-white"
              : "text-[#7A756B] dark:text-[#78736F] hover:text-[#141413] dark:hover:text-[#D5D0C6]"
          }`}
        >
          <span className="relative inline-flex items-center justify-center w-6 h-6">
            <Store className={`w-[19px] h-[19px] ${isShopActive ? "stroke-[2.1]" : "stroke-[1.5]"}`} />
          </span>
          <span className={`text-[10px] tracking-[0.02em] leading-none ${isShopActive ? "font-semibold" : "font-medium"}`}>
            Shop
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigatePage();
            navigate("/promos");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors duration-150 cursor-pointer ${
            isPromosActive
              ? "text-[#141413] dark:text-white"
              : "text-[#7A756B] dark:text-[#78736F] hover:text-[#141413] dark:hover:text-[#D5D0C6]"
          }`}
        >
          <span className="relative inline-flex items-center justify-center w-6 h-6">
            <Tag className={`w-[19px] h-[19px] ${isPromosActive ? "stroke-[2.1]" : "stroke-[1.5]"}`} />
          </span>
          <span className={`text-[10px] tracking-[0.02em] leading-none ${isPromosActive ? "font-semibold" : "font-medium"}`}>
            Promos
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigatePage();
            navigate("/saved");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors duration-150 cursor-pointer ${
            isSavedActive
              ? "text-[#141413] dark:text-white"
              : "text-[#7A756B] dark:text-[#78736F] hover:text-[#141413] dark:hover:text-[#D5D0C6]"
          }`}
        >
          <span className="relative inline-flex items-center justify-center w-6 h-6">
            <Heart className={`w-[19px] h-[19px] ${isSavedActive ? "stroke-[2.1]" : "stroke-[1.5]"}`} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-[#966830] dark:bg-[#C89B62] text-white dark:text-[#141413] font-mono text-[9px] font-semibold flex items-center justify-center tabular-nums">
                {wishlistCount}
              </span>
            )}
          </span>
          <span className={`text-[10px] tracking-[0.02em] leading-none ${isSavedActive ? "font-semibold" : "font-medium"}`}>
            Saved
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigatePage();
            navigate("/bag");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors duration-150 cursor-pointer ${
            isBagActive
              ? "text-[#141413] dark:text-white"
              : "text-[#7A756B] dark:text-[#78736F] hover:text-[#141413] dark:hover:text-[#D5D0C6]"
          }`}
        >
          <span className="relative inline-flex items-center justify-center w-6 h-6">
            <ShoppingBag className={`w-[19px] h-[19px] ${isBagActive ? "stroke-[2.1]" : "stroke-[1.5]"}`} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-[#141413] dark:bg-white text-white dark:text-[#141413] font-mono text-[9px] font-semibold flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            )}
          </span>
          <span className={`text-[10px] tracking-[0.02em] leading-none ${isBagActive ? "font-semibold" : "font-medium"}`}>
            Bag
          </span>
        </button>
      </div>
    </nav>
  );
}
