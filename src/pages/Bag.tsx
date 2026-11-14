import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Check,
  ArrowRight,
  CreditCard,
  Tag,
  X,
  ArrowLeft,
  FileText,
  Download,
  Truck,
} from "lucide-react";
import { CartItem, Order, Product, StoreShippingSettings } from "../types";
import { formatNaira } from "../utils/currency";
import GalleryImage from "../components/GalleryImage";
import BrandLogo from "../components/BrandLogo";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface BagProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  onRemoveItem: (productId: string, size: string, color: string) => void;
  onClearCart: () => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onPlaceOrder?: (order: Order) => void;
  currentUser: any | null;
  onOpenAuth: () => void;
  onOpenProduct: (product: Product) => void;
  appliedDiscount: number;
  appliedCode: string;
  onApplyVoucher: (code: string) => Promise<boolean>;
  onRemoveVoucher: () => void;
  onOpenOrders?: () => void;
  onViewInvoice?: (order: Order) => void;
  onDownloadInvoice?: (order: Order) => void;
}

export default function Bag({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddToast,
  onPlaceOrder,
  currentUser,
  onOpenAuth,
  onOpenProduct,
  appliedDiscount,
  appliedCode,
  onApplyVoucher,
  onRemoveVoucher,
  onOpenOrders,
  onViewInvoice,
  onDownloadInvoice,
}: BagProps) {
  const navigate = useNavigate();
  const [voucherInput, setVoucherInput] = useState("");
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment" | "processing" | "success">(() => {
    try {
      const saved = sessionStorage.getItem("btnx_checkout_step");
      if (saved === "payment" && cart.length > 0) return "payment";
    } catch {
      // Ignore storage errors
    }
    return "cart";
  });
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [processingMsg, setProcessingMsg] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    try {
      if (checkoutStep === "cart" || checkoutStep === "payment") {
        sessionStorage.setItem("btnx_checkout_step", checkoutStep);
      } else {
        sessionStorage.removeItem("btnx_checkout_step");
      }
    } catch {
      // Ignore storage errors
    }
  }, [checkoutStep]);

  const [shippingSettings, setShippingSettings] = useState<StoreShippingSettings>({
    defaultShippingFee: 3500,
    freeShippingThreshold: 150000,
    isFreeShippingGlobal: false,
    defaultDeliveryTimeline: "2–4 Business Days",
    defaultPackagingType: "Cotton Garment Box",
    defaultReturnPolicy: "14-Day Free Exchanges",
  });

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, "settings", "shipping"), (snapshot) => {
        if (snapshot.exists()) {
          setShippingSettings(snapshot.data() as StoreShippingSettings);
        }
      });
      return () => unsub();
    } catch {
      // Use defaults
    }
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const archiveSavings = cart.reduce((sum, item) => {
    if (item.product.originalPrice && item.product.originalPrice > item.product.price) {
      return sum + (item.product.originalPrice - item.product.price) * item.quantity;
    }
    return sum;
  }, 0);
  const discountAmount = subtotal * appliedDiscount;

  // Dynamic Shipping Calculation Algorithm
  const isEligibleForFreeShipping =
    shippingSettings.isFreeShippingGlobal ||
    subtotal >= shippingSettings.freeShippingThreshold ||
    (cart.length > 0 && cart.every((item) => item.product.isFreeShipping || item.product.shippingFee === 0));

  const shippingFee = cart.length === 0
    ? 0
    : isEligibleForFreeShipping
    ? 0
    : Math.max(
        ...cart.map((item) => item.product.shippingFee ?? shippingSettings.defaultShippingFee),
        shippingSettings.defaultShippingFee
      );

  const finalTotal = Math.max(0, subtotal - discountAmount) + shippingFee;
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherInput.trim() || isApplyingVoucher) return;
    setIsApplyingVoucher(true);
    const ok = await onApplyVoucher(voucherInput);
    if (ok) {
      setVoucherInput("");
    }
    setIsApplyingVoucher(false);
  };

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
      "Checking payment details...",
      "Confirming stock availability...",
      "Finishing your order...",
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
        setLastPlacedOrder(newOrder);
        setCheckoutStep("success");
        onAddToast(`Order ${randomId} confirmed.`, "success");
      }
    }, 650);
  };

  const handleSuccessReset = (targetPath: string) => {
    setCheckoutStep("cart");
    setCardHolder("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    onRemoveVoucher();
    onClearCart();
    navigate(targetPath);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] pb-20 lg:pb-0">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block">
                Checkout
              </span>
              <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.015em]">
                {checkoutStep === "payment"
                  ? "Payment Details"
                  : checkoutStep === "success"
                  ? "Order Confirmed"
                  : "Shopping Bag"}
              </h1>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#66625B] dark:text-[#A7A299]">
              {checkoutStep === "payment" ? (
                <button
                  type="button"
                  onClick={() => setCheckoutStep("cart")}
                  className="min-h-[42px] px-4 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-white dark:bg-[#22211E] text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] rounded-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Bag</span>
                </button>
              ) : (
                <>
                  <span className="font-mono tabular-nums">
                    <strong className="text-[#141413] dark:text-[#F3F1EC]">{totalCount}</strong>{" "}
                    {totalCount === 1 ? "Item" : "Items"}
                  </span>
                  {checkoutStep === "cart" && (
                    <Link
                      to="/shop"
                      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors"
                    >
                      <span>Continue Shopping</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-14">
        {checkoutStep === "success" ? (
          <div className="max-w-lg mx-auto bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-8 sm:p-10 text-center space-y-6">
            <div className="w-12 h-12 border border-[#141413] dark:border-[#F3F1EC] rounded-sm flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 text-[#141413] dark:text-[#F3F1EC]" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block">
                Preparing Shipment
              </span>
              <h2 className="font-display text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                Order {lastPlacedOrder?.id} Confirmed
              </h2>
              <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
                Confirmation dispatched to{" "}
                <span className="font-mono text-[#141413] dark:text-[#F3F1EC]">
                  {currentUser?.email || "your registered email"}
                </span>
                .
              </p>
            </div>

            {lastPlacedOrder && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {onViewInvoice && (
                  <button
                    type="button"
                    onClick={() => onViewInvoice(lastPlacedOrder)}
                    className="min-h-[44px] px-4 py-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-[#FAF9F7] dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Invoice</span>
                  </button>
                )}
                {onDownloadInvoice && (
                  <button
                    type="button"
                    onClick={() => onDownloadInvoice(lastPlacedOrder)}
                    className="min-h-[44px] px-4 py-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-[#FAF9F7] dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              {lastPlacedOrder && (
                <button
                  type="button"
                  onClick={() => handleSuccessReset(`/track?order=${encodeURIComponent(lastPlacedOrder.id)}`)}
                  className="flex-1 min-h-[46px] px-5 py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track Shipment</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSuccessReset("/shop")}
                className="flex-1 min-h-[46px] px-5 py-3 border border-[#141413] dark:border-[#F3F1EC] text-[#141413] dark:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] text-xs font-medium uppercase tracking-[0.14em] rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Continue Shopping</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : checkoutStep === "processing" ? (
          <div className="max-w-md mx-auto bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-12 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-[#E6E2DA] dark:border-[#2C2A26] border-t-[#141413] dark:border-t-[#F3F1EC] rounded-full animate-spin mx-auto" />
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC]">
              Securing Order
            </h2>
            <p className="text-xs text-[#66625B] dark:text-[#A7A299]">{processingMsg}</p>
          </div>
        ) : cart.length === 0 ? (
          <div className="py-20 px-6 text-center bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm">
            <ShoppingBag className="w-8 h-8 text-[#66625B] dark:text-[#A7A299] mx-auto mb-3 stroke-[1.25]" />
            <h2 className="font-display text-3xl text-[#141413] dark:text-[#F3F1EC] mb-2">Your bag is empty</h2>
            <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-md mx-auto mb-6 leading-relaxed">
              Add a few items from the shop or check current promo codes before checking out.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="w-full sm:w-auto min-h-[46px] px-7 py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer"
              >
                Browse Catalog
              </button>
              <Link
                to="/promos"
                className="w-full sm:w-auto min-h-[46px] px-6 py-3 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-white dark:bg-[#22211E] text-[#141413] dark:text-[#F3F1EC] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors flex items-center justify-center"
              >
                View Promo Codes
              </Link>
            </div>
          </div>
        ) : checkoutStep === "payment" ? (
          <div className="max-w-lg mx-auto bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                Order Total
              </span>
              <span className="font-mono text-xl font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                {formatNaira(finalTotal)}
              </span>
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
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
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
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm font-mono text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
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
                      className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm font-mono text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
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
                      className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] rounded-sm text-sm font-mono text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] py-3.5 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer"
              >
                Authorize {formatNaira(finalTotal)}
              </button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Packaging Progress & Bag Items */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm">
                <div className="flex justify-between items-center gap-2 text-[11px] mb-2.5">
                  <span className="uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] truncate">
                    {isEligibleForFreeShipping
                      ? "Complimentary Shipping & Luxury Garment Box"
                      : "Free Shipping & Luxury Garment Box"}
                  </span>
                  <span className="font-mono text-[#141413] dark:text-[#F3F1EC] tabular-nums whitespace-nowrap shrink-0">
                    {isEligibleForFreeShipping
                      ? "Unlocked"
                      : `${formatNaira(Math.max(0, shippingSettings.freeShippingThreshold - subtotal))} away`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F4F1EC] dark:bg-[#22211E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#141413] dark:bg-[#C89B62] transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        (subtotal / (shippingSettings.freeShippingThreshold || 150000)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] overflow-hidden">
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                    className="p-4 sm:p-5 flex gap-4"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenProduct(item.product)}
                      className="w-20 h-26 sm:w-24 sm:h-32 bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm shrink-0 overflow-hidden cursor-pointer"
                    >
                      <GalleryImage
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenProduct(item.product)}
                            className="text-sm sm:text-base font-medium text-[#141413] dark:text-[#F3F1EC] truncate text-left hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors cursor-pointer"
                          >
                            {item.product.name}
                          </button>
                          <div className="flex items-baseline gap-2 shrink-0">
                            {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                              <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] line-through tabular-nums">
                                {formatNaira(item.product.originalPrice * item.quantity)}
                              </span>
                            )}
                            <span className="font-mono text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                              {formatNaira(item.product.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#66625B] dark:text-[#A7A299]">
                          Size {item.selectedSize || "M"} · {item.selectedColor || "Default"}
                        </p>
                        {item.product.description && (
                          <p className="text-xs text-[#66625B] dark:text-[#A7A299] line-clamp-1 pt-0.5">
                            {item.product.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <div className="flex items-center border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7] dark:bg-[#22211E] overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(
                                item.product.id,
                                item.selectedSize || "M",
                                item.selectedColor || "Default",
                                item.quantity - 1
                              )
                            }
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#E6E2DA]/60 dark:hover:bg-[#2E2C28] cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 font-mono text-xs font-medium tabular-nums text-[#141413] dark:text-[#F3F1EC]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(
                                item.product.id,
                                item.selectedSize || "M",
                                item.selectedColor || "Default",
                                item.quantity + 1
                              )
                            }
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#141413] dark:text-[#F3F1EC] hover:bg-[#E6E2DA]/60 dark:hover:bg-[#2E2C28] cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onRemoveItem(
                              item.product.id,
                              item.selectedSize || "M",
                              item.selectedColor || "Default"
                            )
                          }
                          className="min-h-[40px] px-3 flex items-center gap-1.5 text-xs text-[#66625B] dark:text-[#A7A299] hover:text-rose-700 dark:hover:text-rose-400 rounded-sm transition-colors cursor-pointer"
                          aria-label={`Remove ${item.product.name} from bag`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Voucher & Summary Card */}
            <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
                <h2 className="font-display text-2xl font-medium text-[#141413] dark:text-[#F3F1EC]">Order Summary</h2>
                <Link
                  to="/promos"
                  className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors"
                >
                  <Tag className="w-3 h-3" />
                  <span>Promo Codes</span>
                </Link>
              </div>

              <form
                onSubmit={handleVoucherSubmit}
                className="flex items-center border border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm overflow-hidden"
              >
                <input
                  type="text"
                  placeholder="Voucher code (e.g. BTNX50)"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  className="flex-1 min-h-[42px] px-3.5 py-2 text-xs font-mono uppercase text-[#141413] dark:text-[#F3F1EC] placeholder:normal-case placeholder:font-sans placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none bg-transparent min-w-0"
                />
                <button
                  type="submit"
                  disabled={isApplyingVoucher}
                  className="min-h-[42px] px-4 py-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[11px] font-medium uppercase tracking-[0.12em] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isApplyingVoucher ? "..." : "Apply"}
                </button>
              </form>

              {appliedDiscount > 0 && (
                <div className="px-3.5 py-2.5 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#966830]/40 dark:border-[#C89B62]/40 rounded-sm flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#966830] dark:text-[#C89B62] font-medium">
                    Code <strong className="font-mono">{appliedCode}</strong> active
                  </span>
                  <button
                    type="button"
                    onClick={onRemoveVoucher}
                    aria-label="Remove promo code"
                    className="p-1 text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] rounded-sm cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-2.5 text-xs text-[#66625B] dark:text-[#A7A299]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                    {formatNaira(subtotal)}
                  </span>
                </div>
                {archiveSavings > 0 && (
                  <div className="flex justify-between text-[#966830] dark:text-[#C89B62]">
                    <span>Sale Discount</span>
                    <span className="font-mono tabular-nums">
                      -{formatNaira(archiveSavings)}
                    </span>
                  </div>
                )}
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-[#966830] dark:text-[#C89B62]">
                    <span>Promo ({appliedCode})</span>
                    <span className="font-mono tabular-nums">
                      -{formatNaira(discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>Nationwide Delivery ({shippingSettings.defaultDeliveryTimeline})</span>
                  <span className="font-mono text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                    {shippingFee === 0 ? "Free" : formatNaira(shippingFee)}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex justify-between items-baseline text-[#141413] dark:text-[#F3F1EC]">
                  <span className="font-medium text-sm">Total</span>
                  <span className="font-mono text-xl font-medium tabular-nums">
                    {formatNaira(finalTotal)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="w-full min-h-[48px] py-3.5 bg-[#141413] dark:bg-[#F3F1EC] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[#FAF9F7] dark:text-[#141413] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Proceed to Checkout</span>
              </button>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
