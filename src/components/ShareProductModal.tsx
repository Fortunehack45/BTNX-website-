import React, { useState } from "react";
import { X, Copy, Check, Share2, MessageCircle, Twitter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import { formatNaira } from "../utils/currency";
import GalleryImage from "./GalleryImage";

interface ShareProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function ShareProductModal({
  product,
  isOpen,
  onClose,
  onAddToast,
}: ShareProductModalProps) {
  const [hasCopied, setHasCopied] = useState(false);

  if (!isOpen || !product) return null;

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."));

  // In production/deployment, use current public origin; fallback to env or current origin
  const origin =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PUBLIC_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "https://btnx.store");

  // Clean canonical product link for social sharing
  const shareUrl = `${origin}/product/${encodeURIComponent(product.id)}`;
  const shareText = `Check out the ${product.name} (${formatNaira(product.price)}) on BTNX Store:\n${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setHasCopied(true);
      onAddToast("Product link copied to clipboard!", "success");
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      onAddToast("Unable to copy link.", "error");
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onAddToast("Opening WhatsApp...", "info");
  };

  const handleTwitterShare = () => {
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `Check out ${product.name} on BTNX:`
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twUrl, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} — BTNX Store`,
          text: `Check out ${product.name} on BTNX:`,
          url: shareUrl,
        });
        onAddToast("Shared successfully!", "success");
        onClose();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#141413]/70 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm shadow-2xl p-5 sm:p-6 z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#966830] dark:text-[#C89B62]" />
              <h2 className="text-xs uppercase tracking-[0.16em] font-semibold text-[#141413] dark:text-[#F3F1EC]">
                Share This Piece
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Product Preview Card */}
          <div className="p-3 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm flex items-center gap-3.5 mb-5">
            <div className="w-16 h-20 aspect-[3/4] bg-[#EDEAE5] dark:bg-[#2A2824] rounded-sm overflow-hidden shrink-0">
              <GalleryImage
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-semibold block truncate">
                {product.category}
              </span>
              <h3 className="font-display text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                {product.name}
              </h3>
              <p className="font-mono text-xs font-semibold text-[#141413] dark:text-[#F3F1EC] mt-1 tabular-nums">
                {formatNaira(product.price)}
              </p>
              <p className="text-[10px] text-[#66625B] dark:text-[#A7A299] truncate mt-0.5">
                Preview image will display in WhatsApp &amp; socials
              </p>
            </div>
          </div>

          {isLocalhost && (
            <div className="mb-4 p-2.5 bg-[#966830]/10 border border-[#966830]/20 rounded-sm text-[11px] text-[#966830] dark:text-[#C89B62] leading-relaxed">
              <span className="font-semibold">Local dev notice:</span> WhatsApp crawlers run in the cloud and cannot reach <code className="font-mono text-[10px]">localhost</code>. Once deployed to your Vercel domain, WhatsApp automatically unfurls this card and product photo.
            </div>
          )}

          {/* Quick Share Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full h-11 px-4 bg-[#25D366] hover:bg-[#22bf5b] text-white font-medium text-xs uppercase tracking-[0.12em] rounded-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-sm"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Share to WhatsApp</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="h-10 px-3 bg-[#FAF9F7] dark:bg-[#22211E] hover:bg-[#EAE6DE] dark:hover:bg-[#2C2A26] border border-[#E6E2DA] dark:border-[#2C2A26] text-[#141413] dark:text-[#F3F1EC] text-xs font-medium uppercase tracking-[0.12em] rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {hasCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#25D366]" />
                    <span className="text-[#25D366]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTwitterShare}
                className="h-10 px-3 bg-[#FAF9F7] dark:bg-[#22211E] hover:bg-[#EAE6DE] dark:hover:bg-[#2C2A26] border border-[#E6E2DA] dark:border-[#2C2A26] text-[#141413] dark:text-[#F3F1EC] text-xs font-medium uppercase tracking-[0.12em] rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Twitter className="w-3.5 h-3.5" />
                <span>Share on X</span>
              </button>
            </div>

            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full h-10 border border-[#141413] dark:border-[#F3F1EC] bg-white dark:bg-[#191816] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] text-xs font-medium uppercase tracking-[0.12em] rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>More Options (Device Share)</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
