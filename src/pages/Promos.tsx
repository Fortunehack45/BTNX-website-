import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { Copy, Check, ArrowRight, ShoppingBag, Tag, Search } from "lucide-react";
import { motion } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { NEW_YEAR_PRODUCTS } from "../data";
import { Product } from "../types";
import { formatNaira } from "../utils/currency";
import { getDiscountPercent } from "../utils/invoice";
import GalleryImage from "../components/GalleryImage";
import {
  galleryContainerVariants,
  galleryCardVariants,
  EDITORIAL_VIEWPORT,
} from "../utils/motion";

interface PromoRecord {
  id: string;
  code: string;
  discountPercentage: number;
  expiresAt?: string;
  createdAt?: string;
  isActive?: boolean;
  title?: string;
  note?: string;
}

interface PromosProps {
  onApplyPromoToBag: (code: string) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onOpenProduct: (product: Product) => void;
}

const FLAGSHIP_PROMO: PromoRecord = {
  id: "flagship-btnx50",
  code: "BTNX50",
  discountPercentage: 50,
  expiresAt: "2026-12-31T23:59:59Z",
  isActive: true,
  title: "End of Year Archive Privilege",
  note: "Client invitation privilege applicable across seasonal outerwear, knitwear, and heavyweight fleece silhouettes.",
};

export default function Promos({
  onApplyPromoToBag,
  onAddToast,
  onOpenProduct,
}: PromosProps) {
  const navigate = useNavigate();
  const [firestorePromos, setFirestorePromos] = useState<PromoRecord[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState<{
    status: "valid" | "expired" | "inactive" | "not_found";
    message: string;
    code?: string;
  } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const unsub = onSnapshot(
      collection(db, "promoCodes"),
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PromoRecord, "id">),
        }));
        setFirestorePromos(rows);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "promoCodes");
      }
    );
    return () => unsub();
  }, []);

  const allPromos: PromoRecord[] = (() => {
    const normalizedFirestore = firestorePromos.map((p) => ({
      ...p,
      code: (p.code || "").toUpperCase(),
    }));
    const hasFlagship = normalizedFirestore.some((p) => p.code === "BTNX50");
    return hasFlagship ? normalizedFirestore : [FLAGSHIP_PROMO, ...normalizedFirestore];
  })();

  const activePromos = allPromos.filter((p) => {
    if (p.isActive === false) return false;
    if (p.expiresAt && new Date(p.expiresAt) < new Date()) return false;
    return true;
  });

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    onAddToast(`Voucher code ${code} copied to clipboard.`, "success");
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleVerifyLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupCode.trim().toUpperCase();
    if (!clean) return;

    if (clean === "BTNX50" || clean === "KLAMBY50") {
      setLookupResult({
        status: "valid",
        code: clean,
        message: `${clean} is active — unlocks 50% off your shopping bag total.`,
      });
      return;
    }

    const match = allPromos.find((p) => p.code.toUpperCase() === clean);
    if (!match) {
      setLookupResult({
        status: "not_found",
        message: `No active privilege matches "${clean}". Check spelling or use BTNX50.`,
      });
      return;
    }
    if (match.isActive === false) {
      setLookupResult({
        status: "inactive",
        message: `Voucher "${clean}" is currently paused by atelier concierge.`,
      });
      return;
    }
    if (match.expiresAt && new Date(match.expiresAt) < new Date()) {
      setLookupResult({
        status: "expired",
        message: `Voucher "${clean}" expired on ${new Date(match.expiresAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}.`,
      });
      return;
    }
    setLookupResult({
      status: "valid",
      code: match.code,
      message: `${match.code} is active — unlocks ${match.discountPercentage || 0}% off your shopping bag.`,
    });
  };

  const formatExpiry = (iso?: string) => {
    if (!iso) return "Seasonal Release";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return "Seasonal Release";
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const featuredPieces = NEW_YEAR_PRODUCTS.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] pb-20 lg:pb-0">
      {/* Editorial Header */}
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7 space-y-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block">
                Private Privileges · Client Vouchers
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.015em] text-balance">
                Promo Codes &amp; Archive Access
              </h1>
              <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-xl leading-relaxed">
                Redeem seasonal studio codes directly in your shopping bag for immediate reductions across selected garments. Only one privilege code may be active per order.
              </p>
            </div>

            <div className="lg:col-span-5">
              <form
                onSubmit={handleVerifyLookup}
                className="flex items-center border border-[#141413]/85 dark:border-[#F3F1EC]/65 bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm overflow-hidden"
              >
                <div className="relative flex-1 flex items-center min-w-0 pl-3.5">
                  <Search className="w-4 h-4 text-[#66625B] dark:text-[#A7A299] shrink-0" />
                  <input
                    type="text"
                    placeholder="Verify invitation code (e.g. BTNX50)"
                    value={lookupCode}
                    onChange={(e) => {
                      setLookupCode(e.target.value);
                      if (lookupResult) setLookupResult(null);
                    }}
                    className="w-full px-3 py-2.5 bg-transparent text-xs font-mono uppercase text-[#141413] dark:text-[#F3F1EC] placeholder:normal-case placeholder:font-sans placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none min-h-[44px]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 sm:px-6 py-2.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] transition-colors shrink-0 cursor-pointer min-h-[44px]"
                >
                  Check
                </button>
              </form>
              {lookupResult && (
                <div className="mt-3 p-3.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm flex items-center justify-between gap-3">
                  <p
                    className={`text-xs leading-relaxed ${
                      lookupResult.status === "valid"
                        ? "text-[#141413] dark:text-[#F3F1EC] font-medium"
                        : "text-[#66625B] dark:text-[#A7A299]"
                    }`}
                  >
                    {lookupResult.message}
                  </p>
                  {lookupResult.status === "valid" && lookupResult.code && (
                    <button
                      type="button"
                      onClick={() => onApplyPromoToBag(lookupResult.code!)}
                      className="shrink-0 px-4 py-1.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Promo Ledger */}
      <section className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14 lg:py-16 space-y-12">
        <div className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
            <div>
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1">
                Active Releases
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                Available Voucher Codes
              </h2>
            </div>
            <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">
              {activePromos.length} Active
            </span>
          </div>

          <motion.div
            variants={galleryContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {activePromos.map((promo, index) => {
              const isFlagship = index === 0;
              const isCopied = copiedCode === promo.code;

              return (
                <motion.article
                  key={promo.id}
                  variants={galleryCardVariants}
                  className={`rounded-sm border p-6 sm:p-8 flex flex-col justify-between gap-6 transition-colors ${
                    isFlagship
                      ? "bg-[#141413] dark:bg-[#12110F] text-[#FAF9F7] dark:text-[#F3F1EC] border-[#141413] dark:border-[#C89B62]/35"
                      : "bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] border-[#E6E2DA] dark:border-[#2C2A26]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]">
                        <Tag
                          className={`w-3.5 h-3.5 ${
                            isFlagship ? "text-[#C69B62]" : "text-[#966830] dark:text-[#C89B62]"
                          }`}
                        />
                        <span className={isFlagship ? "text-[#C69B62]" : "text-[#966830] dark:text-[#C89B62]"}>
                          {promo.discountPercentage || 0}% Privilege · Valid Until {formatExpiry(promo.expiresAt)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3
                        className={`font-display text-2xl sm:text-3xl font-medium ${
                          isFlagship ? "text-white dark:text-[#F3F1EC]" : "text-[#141413] dark:text-[#F3F1EC]"
                        }`}
                      >
                        {promo.title || `Seasonal Client Code (${promo.discountPercentage}% Off)`}
                      </h3>
                      <p
                        className={`text-xs sm:text-sm leading-relaxed mt-2 ${
                          isFlagship ? "text-[#E6E2DA]/80" : "text-[#66625B] dark:text-[#A7A299]"
                        }`}
                      >
                        {promo.note ||
                          `Apply code ${promo.code} at checkout to receive a ${promo.discountPercentage}% reduction across eligible BTNX garments.`}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`pt-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isFlagship ? "border-white/15" : "border-[#E6E2DA] dark:border-[#2C2A26]"
                    }`}
                  >
                    <div
                      className={`px-4 py-2.5 rounded-sm border font-mono text-sm font-medium tracking-[0.16em] text-center sm:text-left ${
                        isFlagship
                          ? "border-white/25 bg-white/5 text-white"
                          : "border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC]"
                      }`}
                    >
                      {promo.code}
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(promo.code)}
                        className={`min-h-[44px] px-4 py-2.5 border rounded-sm text-[11px] font-medium uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          isFlagship
                            ? "border-white/30 text-white hover:bg-white/10"
                            : "border-[#E6E2DA] dark:border-[#2C2A26] text-[#141413] dark:text-[#F3F1EC] hover:border-[#141413] dark:hover:border-[#F3F1EC]"
                        }`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-[#C69B62]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? "Copied" : "Copy"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onApplyPromoToBag(promo.code)}
                        className={`min-h-[44px] px-5 py-2.5 rounded-sm text-[11px] font-medium uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          isFlagship
                            ? "bg-[#FAF9F7] dark:bg-[#F3F1EC] text-[#141413] hover:bg-white dark:hover:bg-[#E2DFD7]"
                            : "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7]"
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Apply to Bag</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>

        {/* Eligible Archive Highlights */}
        <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 sm:p-8 lg:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-6">
            <div>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block mb-1.5">
                Eligible Archive
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                Featured Silhouettes for Privilege Redemption
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors cursor-pointer whitespace-nowrap w-fit"
            >
              <span>Browse Full Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <motion.div
            variants={galleryContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={EDITORIAL_VIEWPORT}
            className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 lg:gap-8"
          >
            {featuredPieces.map((product) => {
              const discountPct = getDiscountPercent(product.price, product.originalPrice);
              return (
                <motion.article
                  key={product.id}
                  variants={galleryCardVariants}
                  onClick={() => onOpenProduct(product)}
                  className="group cursor-pointer flex flex-col gap-2.5 sm:gap-3"
                >
                  <div className="relative aspect-[3/4] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden rounded-sm">
                    <GalleryImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    {discountPct && (
                      <span className="m3-haze-photo absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[#FAF9F7] font-mono text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.1em] sm:tracking-[0.12em] rounded-sm">
                        -{discountPct}%
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-2">
                      <h3 className="text-[13px] sm:text-[15px] font-semibold text-[#141413] dark:text-[#F3F1EC] truncate">
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
                    <p className="text-[11px] sm:text-xs text-[#66625B] dark:text-[#A7A299] leading-snug sm:leading-relaxed line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
