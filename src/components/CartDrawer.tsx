import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem, Order, OrderItem } from "../types";
import { X, ShoppingBag, Trash2, Plus, Minus, Check, ArrowRight, CreditCard } from "lucide-react";

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
}: CartDrawerProps) {
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0); // e.g., 0.50 for 50%
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment" | "processing" | "success">("cart");
  const [orderId, setOrderId] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [processingMsg, setProcessingMsg] = useState("");

  const handleApplyVoucher = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === "KLAMBY50") {
      setAppliedDiscount(0.5);
      onAddToast("Voucher code 'KLAMBY50' applied! 50% discount active.", "success");
    } else {
      onAddToast("Invalid voucher code.", "error");
    }
    setVoucherInput("");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = subtotal * appliedDiscount;
  const finalTotal = subtotal - discountAmount;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!currentUser) {
      onAddToast("Please log in to place an order.", "info");
      onOpenAuth();
      return;
    }
    setCheckoutStep("payment");
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate simple inputs
    if (!cardHolder.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      onAddToast("Please fill in all security card fields.", "error");
      return;
    }

    setCheckoutStep("processing");
    
    const messages = [
      "Establishing 256-bit secure SSL tunnels...",
      "Authenticating payment gateway response tokens...",
      "Verifying seasonal inventory reservation states...",
      "Registering confirmation details and routing email..."
    ];
    
    let currentIdx = 0;
    setProcessingMsg(messages[0]);
    
    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < messages.length) {
        setProcessingMsg(messages[currentIdx]);
      } else {
        clearInterval(interval);
        const randomId = `KB-${Math.floor(100000 + Math.random() * 900000)}`;
        
        // Save the new order to state & localStorage
        const newOrder: Order = {
          id: randomId,
          date: new Date().toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          total: finalTotal,
          status: "Processing",
          items: cart.map(item => ({
            product: item.product,
            quantity: item.quantity,
            size: item.selectedSize || "M",
            color: item.selectedColor || "Default"
          }))
        };
        onPlaceOrder?.(newOrder);

        setOrderId(randomId);
        setCheckoutStep("success");
        onAddToast(`Order ${randomId} placed successfully!`, "success");
      }
    }, 800);
  };

  const handleSuccessClose = () => {
    setCheckoutStep("cart");
    setCardHolder("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    onClearCart();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        
        {/* Backdrop filter overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950 backdrop-blur-xs cursor-pointer"
        />

        {/* Drawer Frame */}
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
            className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 rounded-full text-slate-800">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-wide uppercase">Shopping Bag</h3>
                <span className="bg-slate-900 text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Switch for Success View vs. List View */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <AnimatePresence mode="wait">
                {checkoutStep === "success" ? (
                  <motion.div
                    key="success-step"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50"
                  >
                    <div className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center mb-6 shadow-xl relative">
                      <Check className="w-10 h-10 stroke-[2.5]" />
                      <div className="absolute -top-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    
                    <h4 className="font-display text-4xl font-extrabold text-slate-900 uppercase tracking-widest leading-none mb-3">
                      ORDER PLACED!
                    </h4>
                    
                    <p className="font-sans text-xs text-slate-400 uppercase font-semibold tracking-wider mb-6">
                      Reference: <span className="text-slate-700 font-extrabold">{orderId}</span>
                    </p>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full max-w-xs mb-8">
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Thank you for your purchase. We are preparing your bespoke Klamby collection items! A confirmation has been dispatched to <span className="font-bold text-slate-700">fortunedomination@gmail.com</span>.
                      </p>
                    </div>

                    <button
                      onClick={handleSuccessClose}
                      className="w-full max-w-xs py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-widest rounded-xl uppercase shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>Continue Shopping</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : checkoutStep === "processing" ? (
                  <motion.div
                    key="processing-step"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white"
                  >
                    <div className="relative mb-8">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-slate-400 animate-pulse" />
                      </div>
                    </div>
                    <h4 className="font-display text-xl font-bold text-slate-900 uppercase tracking-widest mb-3">
                      SECURE CHECKOUT
                    </h4>
                    <p className="font-sans text-[11px] text-slate-400 font-bold uppercase tracking-wider animate-pulse max-w-xs leading-relaxed">
                      {processingMsg}
                    </p>
                  </motion.div>
                ) : checkoutStep === "payment" ? (
                  <motion.div
                    key="payment-step"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="flex-1 flex flex-col overflow-y-auto px-6 py-6 no-scrollbar"
                  >
                    {/* Return to cart button */}
                    <button
                      onClick={() => setCheckoutStep("cart")}
                      className="text-left text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-1.5 transition-colors"
                    >
                      <span>← BACK TO SHOPPING BAG</span>
                    </button>

                    <h4 className="font-display text-2xl font-extrabold text-slate-900 uppercase tracking-wider mb-2">
                      PAYMENT DETAILS
                    </h4>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-6">
                      Bespoke Order Amount: <span className="text-slate-900 font-extrabold">${finalTotal.toFixed(2)}</span>
                    </p>

                    <form onSubmit={handleProcessPayment} className="space-y-4">
                      {/* Interactive Credit Card Mock */}
                      <div className="p-6 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-850 rounded-2xl text-white shadow-xl flex flex-col justify-between h-44 mb-6 relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">KLAMBY VVIP</span>
                            <p className="text-[11px] font-semibold text-slate-200 mt-0.5">Bespoke Atelier</p>
                          </div>
                          <div className="w-10 h-7 bg-white/10 rounded-md backdrop-blur-xs flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-slate-300" />
                          </div>
                        </div>

                        <div>
                          <p className="font-mono text-base tracking-[0.2em] text-slate-100">
                            {cardNumber ? cardNumber.replace(/(\d{4})/g, "$1 ").trim().slice(0, 19) : "•••• •••• •••• ••••"}
                          </p>
                        </div>

                        <div className="flex justify-between items-end">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Cardholder</span>
                            <p className="text-xs font-bold text-slate-100 uppercase truncate max-w-[150px] mt-0.5">{cardHolder || "JOHN DOE"}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Expires</span>
                            <p className="text-xs font-bold text-slate-100 mt-0.5">{cardExpiry || "MM/YY"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Input fields */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1.5">Cardholder Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. John Doe"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1.5">Card Number</label>
                          <input
                            type="text"
                            required
                            maxLength={16}
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1.5">Expiration</label>
                            <input
                              type="text"
                              required
                              maxLength={5}
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1.5">CVV</label>
                            <input
                              type="password"
                              required
                              maxLength={3}
                              placeholder="•••"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action trigger */}
                      <button
                        type="submit"
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-widest rounded-xl uppercase shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mt-6"
                      >
                        <Check className="w-4 h-4" />
                        <span>PLACE SECURE ORDER — ${finalTotal.toFixed(2)}</span>
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list-step"
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    {/* VIP Packaging Progress Meter */}
                    {cart.length > 0 && (
                      <div className="mx-6 mt-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl select-none">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-900 tracking-wider uppercase">
                            <span>Signature Gift Wrapping</span>
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-600 font-mono">
                            {subtotal >= 150 ? "UNLOCKED" : `$${(150 - subtotal).toFixed(2)} AWAY`}
                          </span>
                        </div>
                        
                        {/* Gauge bar */}
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-slate-950 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min((subtotal / 150) * 100, 100)}%` }}
                          />
                        </div>

                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          {subtotal >= 150 ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              ✨ Congrats! Your order qualifies for luxury Custom Silk Ribbon & VVIP Packaging.
                            </span>
                          ) : (
                            <span>
                              Spend <span className="font-bold text-slate-800">${(150 - subtotal).toFixed(2)}</span> more to unlock our bespoke velvet display packaging.
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
                      {cart.map((item, index) => (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                          className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:border-slate-100 transition-colors"
                        >
                          {/* Image preview */}
                          <div className="w-20 h-24 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover object-center"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Detail Info */}
                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="font-sans font-bold text-sm text-slate-900 uppercase tracking-wide truncate max-w-[160px]">
                                  {item.product.name}
                                </h4>
                                <span className="font-display text-base font-bold text-slate-900 ml-2">
                                  ${item.product.price * item.quantity}
                                </span>
                              </div>
                              
                              <p className="text-[11px] text-slate-400 font-semibold mt-0.5 uppercase">
                                Size: <span className="text-slate-600">{item.selectedSize || "M"}</span>
                                <span className="mx-1.5">•</span>
                                Color: <span className="text-slate-600 normal-case">{item.selectedColor || "Default"}</span>
                              </p>
                            </div>

                            {/* Quantity Adjusters */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                <button
                                  onClick={() => onUpdateQuantity(item.product.id, item.selectedSize || "M", item.selectedColor || "Default", item.quantity - 1)}
                                  className="p-1 px-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-2.5 text-xs font-extrabold text-slate-800">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => onUpdateQuantity(item.product.id, item.selectedSize || "M", item.selectedColor || "Default", item.quantity + 1)}
                                  className="p-1 px-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                onClick={() => onRemoveItem(item.product.id, item.selectedSize || "M", item.selectedColor || "Default")}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {cart.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-center select-none">
                          <div className="p-4 bg-slate-50 rounded-full text-slate-300 mb-4">
                            <ShoppingBag className="w-10 h-10" />
                          </div>
                          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">
                            Your bag is empty
                          </p>
                          <p className="text-slate-400 text-xs font-medium max-w-[200px] leading-relaxed">
                            Discover something beautiful in our curated collections.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Summary Footer Actions (Visible only when items exist) */}
                    {cart.length > 0 && (
                      <div className="border-t border-slate-100 px-6 py-5 bg-slate-50 space-y-4">
                        
                        {/* Promo / Coupon Field */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="PROMO CODE (e.g., KLAMBY50)"
                            value={voucherInput}
                            onChange={(e) => setVoucherInput(e.target.value)}
                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold tracking-wider uppercase placeholder-slate-400 outline-none focus:border-slate-400 transition-all"
                          />
                          <button
                            onClick={() => handleApplyVoucher(voucherInput)}
                            className="px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl uppercase transition-colors"
                          >
                            APPLY
                          </button>
                        </div>

                        {/* Calculations */}
                        <div className="space-y-2.5 text-sm font-semibold text-slate-500">
                          <div className="flex justify-between items-center">
                            <span>Subtotal</span>
                            <span className="text-slate-800">${subtotal.toFixed(2)}</span>
                          </div>
                          
                          {appliedDiscount > 0 && (
                            <div className="flex justify-between items-center text-emerald-600">
                              <span>Voucher (50% Off)</span>
                              <span>-${discountAmount.toFixed(2)}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span>Shipping</span>
                            <span className="text-emerald-600 uppercase text-xs font-extrabold tracking-wider">FREE</span>
                          </div>

                          <div className="border-t border-slate-200/60 my-2 pt-2.5 flex justify-between items-center text-slate-900">
                            <span className="text-base font-extrabold">Total Amount</span>
                            <span className="font-display text-2xl font-bold">${finalTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Checkout button */}
                        <button
                          onClick={handleCheckout}
                          className="w-full py-4 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs tracking-widest rounded-xl uppercase shadow-lg hover:scale-[1.01] transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>SECURE CHECKOUT</span>
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
