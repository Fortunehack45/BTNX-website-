import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Monitor, Sun, Moon, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BrandLogo from "./BrandLogo";
import { useTheme, ThemePreference } from "../context/ThemeContext";
import { modalBackdropVariants, modalPanelVariants } from "../utils/motion";

interface FooterProps {
  onAddToast?: (message: string, type: "success" | "error" | "info") => void;
  onNavigateHome?: (sectionId?: string) => void;
  onOpenSupport?: () => void;
}

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const CUSTOMER_CARE_POLICIES: Record<
  string,
  { eyebrow: string; title: string; paragraphs: string[] }
> = {
  "Shipping & Returns": {
    eyebrow: "Delivery & Exchanges",
    title: "Shipping & Returns",
    paragraphs: [
      "Orders placed at BTNX Store are dispatched from Osun within 24 hours and delivered nationwide across Nigeria within 2 to 4 business days.",
      "Every order includes complimentary nationwide delivery and arrives neatly packed. Orders over ₦200,000 include our signature cotton garment gift box.",
      "We offer free size exchanges and returns within 14 days of delivery on unworn items with original tags attached. Reach out to hello@btnx.store with your order reference to start an exchange.",
    ],
  },
  "Care & Garment Guide": {
    eyebrow: "Garment Longevity",
    title: "Care & Garment Guide",
    paragraphs: [
      "Heavyweight cotton fleece and jersey pieces should be washed cold (30°C) inside out with mild detergent and laid flat or hung in the shade to dry.",
      "Brushed wool coats, overshirts, and structured knitwear should be spot-cleaned or professionally dry-cleaned to preserve their drape and collar structure.",
      "For vegan-leather outerwear, wipe clean with a damp soft cloth and store on wide-shoulder hangers away from direct heat.",
    ],
  },
  "Privacy Policy": {
    eyebrow: "Data Protection",
    title: "Privacy Policy",
    paragraphs: [
      "BTNX Store collects only the personal details required to fulfill your orders, save your wishlist, and deliver your packages accurately across Nigeria.",
      "Your shipping address, contact information, and order history are stored securely and are never sold or shared with third-party marketers.",
      "You can update your profile details or unsubscribe from release alerts at any time from your account settings or by contacting hello@btnx.store.",
    ],
  },
  "Terms of Sale": {
    eyebrow: "Store Terms",
    title: "Terms of Sale",
    paragraphs: [
      "All prices on BTNX Store are listed in Nigerian Naira (₦). Promotional voucher codes (such as BTNX50) apply to eligible items in your shopping bag and are limited to one code per order.",
      "Limited-run drops are allocated on a first-come basis. Once your order is confirmed, an official invoice and tracking reference are generated immediately in your account.",
      "For questions regarding bulk orders, sizing, or store pickup in Osun, email hello@btnx.store.",
    ],
  },
};

export default function Footer({ onNavigateHome, onOpenSupport }: FooterProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [activePolicyKey, setActivePolicyKey] = useState<string | null>(null);

  const handleInfoLink = (label: string) => {
    setActivePolicyKey(label);
  };

  const handleSectionLink = (sectionId?: string) => {
    const activeLabel =
      sectionId === "new-arrivals"
        ? "New"
        : sectionId === "collection"
        ? "Collection"
        : sectionId === "end-year-sale"
        ? "Sale"
        : "Home";

    if (sectionId) {
      navigate("/", { state: { scrollToSection: sectionId, activeLabel } });
      if (onNavigateHome) {
        onNavigateHome(sectionId);
      }
    } else {
      navigate("/");
      if (onNavigateHome) {
        onNavigateHome();
      } else {
        window.scrollTo(0, 0);
      }
    }
  };

  const activePolicy = activePolicyKey ? CUSTOMER_CARE_POLICIES[activePolicyKey] : null;

  return (
    <footer
      className="bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-0 transition-colors duration-200"
      id="footer-section"
    >
      <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6">
        <div className="py-14 sm:py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-10">
          <div className="sm:col-span-2 md:col-span-5 space-y-4">
            <button
              type="button"
              onClick={() => handleSectionLink()}
              className="inline-block text-[#141413] dark:text-[#F3F1EC] hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="BTNX Home"
            >
              <BrandLogo className="h-9 w-auto" />
            </button>
            <p className="text-xs text-[#66625B] dark:text-[#A7A299] max-w-xs leading-relaxed">
              Your go-to clothing store in Osun for quality fashion, clean everyday fits, and standout pieces delivered nationwide.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3.5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299] font-medium">
              Navigation
            </p>
            <nav className="flex flex-col gap-1 text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
              <button
                type="button"
                onClick={() => handleSectionLink("new-arrivals")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                New Arrivals
              </button>
              <button
                type="button"
                onClick={() => handleSectionLink("collection")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                Collection
              </button>
              <button
                type="button"
                onClick={() => handleSectionLink("end-year-sale")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                End of Season
              </button>
              <Link
                to="/shop"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                }}
                className="py-1.5 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Shop Catalog
              </Link>
              <Link
                to="/promos"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                }}
                className="py-1.5 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Promo Codes
              </Link>
              <Link
                to="/track"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                }}
                className="py-1.5 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Track Order
              </Link>
              <Link
                to="/notifications"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                }}
                className="py-1.5 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Notifications
              </Link>
            </nav>
          </div>

          <div className="md:col-span-4 space-y-3.5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299] font-medium">
              Customer Care
            </p>
            <div className="flex flex-col gap-1 text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
              <Link
                to="/support"
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Customer Service &amp; Live Chat
              </Link>
              <Link
                to="/track"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                }}
                className="py-1.5 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Order Tracking &amp; Dispatch
              </Link>
              <button
                type="button"
                onClick={() => handleInfoLink("Shipping & Returns")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                Shipping &amp; Returns
              </button>
              <button
                type="button"
                onClick={() => handleInfoLink("Care & Garment Guide")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                Care &amp; Garment Guide
              </button>
              <button
                type="button"
                onClick={() => handleInfoLink("Privacy Policy")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => handleInfoLink("Terms of Sale")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                Terms of Sale
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Utility Bar with Material 3 + Haze 3-Way Theme Switcher */}
        <div className="py-6 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#66625B] dark:text-[#A7A299]">
          <p className="order-2 sm:order-1">© 2026 BTNX Store. All Rights Reserved.</p>

          <div
            role="radiogroup"
            aria-label="Color appearance mode"
            className="order-1 sm:order-2 inline-flex items-center p-1 rounded-sm m3-haze-chip border border-[#E6E2DA] dark:border-[#2C2A26] shadow-xs"
          >
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${option.label} appearance`}
                  title={`${option.label} theme`}
                  onClick={() => setTheme(option.value)}
                  className={`relative w-9 h-8 rounded-sm flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "text-[#141413] dark:text-[#F3F1EC]"
                      : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="footer-theme-active-pill"
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 rounded-sm bg-white dark:bg-[#2A2824] border border-[#E6E2DA]/90 dark:border-[#3A3731] shadow-xs"
                    />
                  )}
                  <Icon className="relative z-10 w-3.5 h-3.5 stroke-[1.75]" />
                </button>
              );
            })}
          </div>

          <span className="order-3 tracking-[0.14em] uppercase whitespace-nowrap">Osun · Nationwide</span>
        </div>
      </div>

      {/* Customer Care Policy Modal */}
      <AnimatePresence>
        {activePolicy && (
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setActivePolicyKey(null)}
            className="fixed inset-0 z-[70] bg-[#141413]/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              variants={modalPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm max-w-lg w-full p-6 sm:p-8 space-y-5 text-[#141413] dark:text-[#F3F1EC] shadow-[0_24px_64px_-12px_rgba(20,20,19,0.3)] dark:shadow-[0_28px_70px_-12px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1">
                    {activePolicy.eyebrow}
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-medium">
                    {activePolicy.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePolicyKey(null)}
                  className="p-2 rounded-sm text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                  aria-label="Close policy window"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                {activePolicy.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between gap-4 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299]">
                  Support: hello@btnx.store
                </span>
                <button
                  type="button"
                  onClick={() => setActivePolicyKey(null)}
                  className="min-h-[40px] px-5 py-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] rounded-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
