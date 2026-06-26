import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Order, OrderItem } from "../types";
import { X, Calendar, DollarSign, Package, CheckCircle2, Truck, HelpCircle, ChevronDown, ChevronUp, Copy, ShoppingBag, ArrowRight } from "lucide-react";

interface OrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onReorderItem: (item: OrderItem) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function OrdersDrawer({
  isOpen,
  onClose,
  orders,
  onReorderItem,
  onAddToast,
}: OrdersDrawerProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleCopyTracking = (tracking: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tracking);
    setCopiedId(tracking);
    onAddToast("Tracking number copied to clipboard!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReorderAll = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    order.items.forEach((item) => {
      onReorderItem(item);
    });
    onAddToast(`Added all items from order ${order.id} back to your bag!`, "success");
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-100/80";
      case "In Transit":
        return "bg-sky-50 text-sky-700 border-sky-100/80";
      case "Processing":
        return "bg-amber-50 text-amber-700 border-amber-100/80";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "Delivered":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "In Transit":
        return <Truck className="w-3.5 h-3.5" />;
      case "Processing":
        return <Package className="w-3.5 h-3.5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden" id="orders-drawer-viewport">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950 backdrop-blur-xs cursor-pointer"
        />

        {/* Drawer content container */}
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
            className="w-screen max-w-lg bg-slate-50 shadow-2xl flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 rounded-full text-white">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
                    My Orders
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Order history and package delivery statuses
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all active:scale-95"
                aria-label="Close orders"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable List Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-200/50">
                    <Package className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">No Orders Placed Yet</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1 font-medium">
                    Once you make a purchase, your orders will appear here with dynamic tracking updates.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-5 py-2.5 bg-slate-950 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    Explore Products <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const dateFormatted = formatDate(order.date);
                  const totalItemsQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
                  const trackingNumber = `TRK-${order.id.replace("KB-", "")}-${order.id.charCodeAt(3) || "9"}${order.id.charCodeAt(4) || "5"}X`;
                  const computedSubtotal = order.items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
                  const computedDiscount = Math.max(0, computedSubtotal - order.total);

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden hover:border-slate-200/80 transition-all duration-300"
                    >
                      {/* Accordion Trigger Header */}
                      <div
                        onClick={() => toggleExpand(order.id)}
                        className="p-4 sm:p-5 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-900 tracking-wider">
                              {order.id}
                            </span>
                            <span
                              className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {getStatusIcon(order.status)}
                              {order.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 stroke-[1.75]" />
                            {dateFormatted}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                          <div className="text-xs text-slate-500 font-medium">
                            <span className="font-semibold text-slate-700">{totalItemsQty}</span>{" "}
                            {totalItemsQty === 1 ? "item" : "items"}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs text-slate-400 block leading-tight font-medium">
                                Total Amount
                              </span>
                              <span className="text-sm font-black text-slate-900">
                                ${order.total.toFixed(2)}
                              </span>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-full text-slate-400 group-hover:text-slate-700">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Accordion Expanded content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="border-t border-slate-100 bg-slate-50/30 overflow-hidden"
                          >
                            <div className="p-4 sm:p-5 space-y-4">
                              {/* Shipment/Tracking Timeline Panel */}
                              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
                                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5 text-slate-500" /> Delivery Details
                                </h5>

                                {/* Tracking Info */}
                                <div className="flex items-center justify-between mb-4 bg-slate-50 px-3 py-2 rounded-lg">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-medium">
                                      Carrier Tracking Number
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-800">
                                      {trackingNumber}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => handleCopyTracking(trackingNumber, e)}
                                    className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-700 rounded-md border border-transparent hover:border-slate-200 transition-all active:scale-90"
                                    title="Copy tracking"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Dynamic Visual Stepper */}
                                <div className="relative flex items-center justify-between pt-2 px-1">
                                  {/* Line in background */}
                                  <div className="absolute left-1 right-1 top-[13px] h-[3px] bg-slate-100 -z-0" />
                                  
                                  {/* Active line filler */}
                                  <div 
                                    className="absolute left-1 top-[13px] h-[3px] bg-slate-900 -z-0 transition-all duration-500" 
                                    style={{
                                      width: order.status === "Processing" 
                                        ? "15%" 
                                        : order.status === "In Transit" 
                                        ? "60%" 
                                        : "100%"
                                    }}
                                  />

                                  {/* Step 1 */}
                                  <div className="relative flex flex-col items-center z-10">
                                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center border-4 border-white shadow-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-800 mt-1 uppercase tracking-wider">
                                      Placed
                                    </span>
                                  </div>

                                  {/* Step 2 */}
                                  <div className="relative flex flex-col items-center z-10">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-xs transition-colors ${
                                      order.status !== "Processing" 
                                        ? "bg-slate-900 text-white" 
                                        : "bg-slate-200 text-slate-600 animate-pulse"
                                    }`}>
                                      <Package className="w-3 h-3" />
                                    </div>
                                    <span className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${
                                      order.status === "Processing" ? "text-amber-600" : "text-slate-800"
                                    }`}>
                                      Processed
                                    </span>
                                  </div>

                                  {/* Step 3 */}
                                  <div className="relative flex flex-col items-center z-10">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-xs transition-colors ${
                                      order.status === "Delivered" 
                                        ? "bg-slate-900 text-white" 
                                        : order.status === "In Transit"
                                        ? "bg-slate-900 text-white animate-pulse"
                                        : "bg-slate-100 text-slate-400"
                                    }`}>
                                      <Truck className="w-3 h-3" />
                                    </div>
                                    <span className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${
                                      order.status === "In Transit" ? "text-sky-600" : order.status === "Delivered" ? "text-slate-800" : "text-slate-400"
                                    }`}>
                                      Shipped
                                    </span>
                                  </div>

                                  {/* Step 4 */}
                                  <div className="relative flex flex-col items-center z-10">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-xs transition-colors ${
                                      order.status === "Delivered" 
                                        ? "bg-emerald-600 text-white" 
                                        : "bg-slate-100 text-slate-400"
                                    }`}>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                    <span className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${
                                      order.status === "Delivered" ? "text-emerald-600 font-black" : "text-slate-400"
                                    }`}>
                                      Delivered
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Items Panel */}
                              <div className="space-y-2.5">
                                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-slate-500" /> Items in order
                                </h5>

                                {order.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-2xs gap-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={item.product?.image}
                                        alt={item.product?.name}
                                        referrerPolicy="no-referrer"
                                        className="w-12 h-14 object-cover bg-slate-50 rounded-lg border border-slate-100 flex-shrink-0"
                                      />
                                      <div>
                                        <h6 className="text-xs font-bold text-slate-800 leading-tight">
                                          {item.product?.name}
                                        </h6>
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-medium mt-1">
                                          <span>Qty: <strong className="text-slate-700">{item.quantity}</strong></span>
                                          <span className="text-slate-200">•</span>
                                          <span>Size: <strong className="text-slate-700">{item.size}</strong></span>
                                          <span className="text-slate-200">•</span>
                                          <span>Color: <strong className="text-slate-700">{item.color}</strong></span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <span className="text-xs font-black text-slate-800">
                                        ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                                      </span>
                                      <button
                                        onClick={() => {
                                          onReorderItem(item);
                                          onAddToast(`Added "${item.product?.name}" back to your bag!`, "success");
                                        }}
                                        className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-800 bg-slate-55 border border-slate-200 rounded-full hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-150"
                                      >
                                        Buy Again
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Price Summary & Action Column */}
                              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs text-xs space-y-2">
                                <div className="flex justify-between text-slate-500 font-medium">
                                  <span>Subtotal</span>
                                  <span>${computedSubtotal.toFixed(2)}</span>
                                </div>
                                {computedDiscount > 0 && (
                                  <div className="flex justify-between text-rose-600 font-semibold">
                                    <span>Discount</span>
                                    <span>-${computedDiscount.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-slate-500 font-medium">
                                  <span>Shipping</span>
                                  <span className="text-emerald-600 uppercase font-bold text-[10px]">Free</span>
                                </div>
                                <div className="border-t border-slate-100 pt-2 flex justify-between text-slate-900 font-black text-sm">
                                  <span>Total Charged</span>
                                  <span>${order.total.toFixed(2)}</span>
                                </div>

                                <div className="pt-2">
                                  <button
                                    onClick={(e) => handleReorderAll(order, e)}
                                    className="w-full py-2 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
                                  >
                                    Reorder Entire List <ShoppingBag className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sticky Footnote Help */}
            <div className="p-4 bg-white border-t border-slate-100 text-center select-none">
              <p className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Need assistance with any order?{" "}
                <a href="#footer-section" onClick={onClose} className="text-slate-700 underline font-extrabold hover:text-slate-900">
                  Contact Support
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
