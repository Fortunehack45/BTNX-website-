import { Link, useNavigate } from "react-router-dom";
import { Monitor, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";
import BrandLogo from "./BrandLogo";
import { useTheme, ThemePreference } from "../context/ThemeContext";

interface FooterProps {
  onAddToast?: (message: string, type: "success" | "error" | "info") => void;
  onNavigateHome?: (sectionId?: string) => void;
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

export default function Footer({ onAddToast, onNavigateHome }: FooterProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleInfoLink = (label: string) => {
    if (onAddToast) {
      onAddToast(`${label} — Contact concierge@btnx.studio for full atelier documentation.`, "info");
    }
  };

  const handleSectionLink = (sectionId?: string) => {
    navigate("/");
    if (onNavigateHome) {
      onNavigateHome(sectionId);
    } else if (sectionId) {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }, 90);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      className="bg-[#FAF9F7] dark:bg-[#111110] pb-20 lg:pb-0 transition-colors duration-200"
      id="footer-section"
    >
      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="py-14 sm:py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <button
              type="button"
              onClick={() => handleSectionLink()}
              className="inline-block text-[#141413] dark:text-[#F3F1EC] hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="BTNX Home"
            >
              <BrandLogo className="h-9 w-auto" />
            </button>
            <p className="text-xs text-[#66625B] dark:text-[#A7A299] max-w-xs leading-relaxed">
              Contemporary streetwear and structured outerwear studio. Crafted with architectural discipline and natural-fiber permanence.
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
                onClick={() => handleSectionLink("end-year-sale")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                Seasonal Archive
              </button>
              <button
                type="button"
                onClick={() => handleSectionLink("collection")}
                className="py-1.5 text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit cursor-pointer"
              >
                Collection
              </button>
              <Link
                to="/shop"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="py-1.5 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Shop Catalog
              </Link>
              <Link
                to="/promos"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="py-1.5 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Promo Codes
              </Link>
              <Link
                to="/notifications"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="py-1.5 hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors w-fit"
              >
                Notifications
              </Link>
            </nav>
          </div>

          <div className="md:col-span-4 space-y-3.5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299] font-medium">
              Client Services
            </p>
            <div className="flex flex-col gap-1 text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
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
          <p className="order-2 sm:order-1">© 2026 BTNX Studio. All Rights Reserved.</p>

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

          <span className="order-3 tracking-[0.14em] uppercase">Lagos · London · Tokyo</span>
        </div>
      </div>
    </footer>
  );
}
