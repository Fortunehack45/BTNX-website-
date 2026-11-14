import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem, Order } from "../types";
import { X, ShoppingBag, Trash2, Plus, Minus, Check, ArrowRight, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { formatNaira } from "../utils/currency";
import GalleryImage from "./GalleryImage";
import BrandLogo from "./BrandLogo";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  onRemoveItem: (productId: string, size: string, color: string) => void;
  onClearCart: () => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onPlaceOrder?: (order: Order) => void;
  currentUser: any | null;
  onOpenAuth: () => void;
  appliedDiscount: number;
  appliedCode: string;
  onApplyVoucher: (code: string) => Promise<boolean>;
  onRemoveVoucher: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddToast,
  onPlaceOrder,
  currentUser,
  onOpenAuth,
  appliedDiscount,
  appliedCode,
  onApplyVoucher,
  onRemoveVoucher,
}: CartDrawerProps) {
  const [voucherInput, setVoucherInput] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment" | "processing" | "success">("cart");
  const [orderId, setOrderId] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [processingMsg, setProcessingMsg] = useState("");

  const handleApplyClick = async () => {
    if (!voucherInput.trim()) return;
    const ok = await onApplyVoucher(voucherInput);
    if (ok) {
      setVoucherInput("");
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = subtotal * appliedDiscount;
  const finalTotal = subtotal - discountAmount;
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!currentUser) {
      onAddToast("Please sign in to place your order.", "info");
      onOpenAuth();
      return;
    }
    setCheckoutStep("payment");
  };

  const handleFormatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardHolder.trim() || cardNumber.length < 12 || cardExpiry.length < 4 || cardCvv.length < 3) {
      onAddToast("Please complete all payment details accurately.", "error");
      return;
    }

    setCheckoutStep("processing");
    const messages = [
      "Verifying encrypted payment session...",
      "Confirming atelier inventory allocation...",
      "Recording order & dispatch notice...",
    ];

    let idx = 0;
    setProcessingMsg(messages[0]);

    const interval = setInterval(() => {
      idx++;
      if (idx < messages.length) {
        setProcessingMsg(messages[idx]);
      } else {
        clearInterval(interval);
        const randomId = `BX-${Math.floor(100000 + Math.random() * 900000)}`;
        const newOrder: Order = {
          id: randomId,
          date: new Date().toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          createdAt: new Date().toISOString(),
          total: finalTotal,
          status: "Processing",
          items: cart.map((item) => ({
            product: item.product,
            quantity: item.quantity,
            size: item.selectedSize || "M",
            color: item.selectedColor || "Default",
          })),
        };
        onPlaceOrder?.(newOrder);
        setOrderId(randomId);
        setCheckoutStep("success");
        onAddToast(`Order ${randomId} confirmed.`, "success");
      }
    }, 650);
  };

  const handleSuccessClose = () => {
    setCheckoutStep("cart");
    setCardHolder("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    onRemoveVoucher();
    onClearCart();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={onClose}
          className="absolute inset-0 bg-[#141413]/45 dark:bg-black/65 backdrop-blur-sm cursor-pointer"
        />

        <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-6">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="w-screen sm:max-w-md bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] sm:border-l border-[#E6E2DA] dark:border-[#2C2A26] flex flex-col h-full shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-5 m3-haze-bar border-b border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-2xl font-medium text-[#141413] dark:text-[#F3F1EC]">Shopping Bag</h3>
                <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">({totalCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/bag"
                  onClick={onClose}
                  className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] underline"
                >
                  Full Page
                </Link>
                <button
                  onClick={onClose}
                  className="p-2 text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
                  aria-label="Close bag"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <AnimatePresence mode="wait">
                {checkoutStep === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#191816]"
                  >
                    <div className="w-12 h-12 border border-[#141413] dark:border-[#F3F1EC] rounded-sm flex items-center justify-center mb-6">
                      <Check className="w-5 h-5 text-[#141413] dark:text-[#F3F1EC]" />
                    </div>

                    <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium mb-2">
                      Order Confirmed
                    </span>
                    <h4 className="font-display text-3xl font-medium text-[#141413] dark:text-[#F3F1EC] mb-3">
                      Preparing Shipment
                    </h4>
                    <p className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] mb-6">
                      Reference: <strong className="text-[#141413] dark:text-[#F3F1EC]">{orderId}</strong>
                    </p>

                    <div className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7] dark:bg-[#22211E] p-5 w-full max-w-xs mb-8 text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                      Confirmation dispatched to{" "}
                      <span className="font-mono text-[#141413] dark:text-[#F3F1EC]">
                        {currentUser?.email || "your registered email"}
                      </span>
                      . Track fulfillment inside your Order History.
                    </div>

                    <button
                      onClick={handleSuccessClose}
                      className="w-full max-w-xs py-3.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue Browsing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ) : checkoutStep === "processing" ? (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#191816]"
                  >
                    <div className="w-10 h-10 border-2 border-[#E6E2DA] dark:border-[#2C2A26] border-t-[#141413] dark:border-t-[#F3F1EC] rounded-full animate-spin mb-6" />
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] mb-2">
                      Securing Order
                    </span>
                    <p className="text-xs text-[#66625B] dark:text-[#A7A299]">{processingMsg}</p>
                  </motion.div>
                ) : checkoutStep === "payment" ? (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#191816] space-y-6"
                  >
                    <button
                      onClick={() => setCheckoutStep("cart")}
                      className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                    >
                      ← Back to Bag
                    </button>

                    <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
                      <h4 className="font-display text-2xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                        Payment Details
                      </h4>
                      <p className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] mt-1 tabular-nums">
                        Total Due:{" "}
                        <strong className="text-[#141413] dark:text-[#F3F1EC]">{formatNaira(finalTotal)}</strong>
                      </p>
                    </div>

                    <form onSubmit={handleProcessPayment} className="space-y-4">
                      <div className="p-5 bg-[#141413] dark:bg-[#111110] dark:border dark:border-[#3A3731] text-[#FAF9F7] dark:text-[#F3F1EC] space-y-5 rounded-sm">
                        <div className="flex justify-between items-center">
                          <BrandLogo className="h-4 w-auto text-[#FAF9F7]" />
                          <CreditCard className="w-4 h-4 text-[#C69B62]" />
                        </div>
                        <p className="font-mono text-sm tracking-[0.18em] tabular-nums">
                          {cardNumber
                            ? cardNumber.replace(/(\d{4})/g, "$1 ").trim().slice(0, 19)
                            : "•••• •••• •••• ••••"}
                        </p>
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="truncate max-w-[160px] uppercase">
                            {cardHolder || "CARDHOLDER"}
                          </span>
                          <span>{cardExpiry || "MM/YY"}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                            Cardholder Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Full name"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                            Card Number
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={16}
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm font-mono text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                              Expiration
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={5}
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(handleFormatExpiry(e.target.value))}
                              className="w-full px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm font-mono text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                              CVV
                            </label>
                            <input
                              type="password"
                              required
                              maxLength={3}
                              placeholder="•••"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                              className="w-full px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm font-mono text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer mt-2"
                      >
                        Authorize {formatNaira(finalTotal)}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    {/* Archival Box Progress */}
                    {cart.length > 0 && (
                      <div className="px-6 py-4 bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                        <div className="flex justify-between items-center text-[11px] mb-2">
                          <span className="uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">
                            Complimentary Archival Packaging
                          </span>
                          <span className="font-mono text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                            {subtotal >= 150 ? "Unlocked" : `${formatNaira(150 - subtotal)} away`}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-[#F4F1EC] dark:bg-[#22211E] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#141413] dark:bg-[#C89B62] transition-all duration-300"
                            style={{ width: `${Math.min((subtotal / 150) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bag Items */}
                    <div className="flex-1 overflow-y-auto divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] bg-white dark:bg-[#191816]">
                      {cart.map((item) => (
                        <div
                          key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                          className="p-5 flex gap-4"
                        >
                          <div className="w-20 h-24 bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm shrink-0 overflow-hidden">
                            <GalleryImage
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-baseline justify-between gap-2">
                                <h4 className="text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                                  {item.product.name}
                                </h4>
                                <span className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums shrink-0">
                                  {formatNaira(item.product.price * item.quantity)}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] mt-1">
                                Size {item.selectedSize || "M"} · {item.selectedColor || "Default"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center border border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm">
                                <button
                                  onClick={() =>
                                    onUpdateQuantity(
                                      item.product.id,
                                      item.selectedSize || "M",
                                      item.selectedColor || "Default",
                                      item.quantity - 1
                                    )
                                  }
                                  className="min-w-[38px] min-h-[38px] flex items-center justify-center text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-2.5 font-mono text-xs tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    onUpdateQuantity(
                                      item.product.id,
                                      item.selectedSize || "M",
                                      item.selectedColor || "Default",
                                      item.quantity + 1
                                    )
                                  }
                                  className="min-w-[38px] min-h-[38px] flex items-center justify-center text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                onClick={() =>
                                  onRemoveItem(
                                    item.product.id,
                                    item.selectedSize || "M",
                                    item.selectedColor || "Default"
                                  )
                                }
                                className="min-w-[38px] min-h-[38px] flex items-center justify-center text-[#66625B] dark:text-[#A7A299] hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {cart.length === 0 && (
                        <div className="py-24 px-6 text-center">
                          <ShoppingBag className="w-8 h-8 text-[#66625B] dark:text-[#A7A299] mx-auto mb-3 stroke-[1.25]" />
                          <p className="font-display text-2xl text-[#141413] dark:text-[#F3F1EC] mb-1">
                            Your bag is empty
                          </p>
                          <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                            Select pieces from the seasonal archive to begin.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Totals */}
                    {cart.length > 0 && (
                      <div className="border-t border-[#E6E2DA] dark:border-[#2C2A26] p-6 bg-[#FAF9F7] dark:bg-[#111110] space-y-4">
                        <div className="flex border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#22211E] rounded-sm overflow-hidden">
                          <input
                            type="text"
                            placeholder="Voucher code (e.g. BTNX50)"
                            value={voucherInput}
                            onChange={(e) => setVoucherInput(e.target.value)}
                            className="flex-1 px-3.5 py-2.5 text-xs font-mono uppercase text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none bg-transparent"
                          />
                          <button
                            onClick={handleApplyClick}
                            className="px-4 py-2.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[11px] font-medium uppercase tracking-[0.12em] transition-colors cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>

                        <div className="space-y-2 text-xs text-[#66625B] dark:text-[#A7A299]">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="font-mono text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                              {formatNaira(subtotal)}
                            </span>
                          </div>
                          {appliedDiscount > 0 && (
                            <div className="flex justify-between text-[#966830] dark:text-[#C89B62]">
                              <span>Privilege ({appliedCode || "50%"})</span>
                              <span className="font-mono tabular-nums">
                                -{formatNaira(discountAmount)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Express Courier</span>
                            <span className="text-[#141413] dark:text-[#F3F1EC]">Complimentary</span>
                          </div>
                          <div className="pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex justify-between items-baseline text-[#141413] dark:text-[#F3F1EC]">
                            <span className="font-medium text-sm">Total</span>
                            <span className="font-mono text-lg font-medium tabular-nums">
                              {formatNaira(finalTotal)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleCheckout}
                          className="w-full py-4 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Proceed to Checkout</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
