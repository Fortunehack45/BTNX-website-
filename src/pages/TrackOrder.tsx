import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  Check,
  Copy,
  FileText,
  Download,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  X,
  Headphones,
} from "lucide-react";
import { Order, Product } from "../types";
import { formatNaira } from "../utils/currency";
import GalleryImage from "../components/GalleryImage";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface TrackOrderProps {
  orders: Order[];
  currentUser: any | null;
  clientAddress?: string;
  onViewInvoice: (order: Order) => void;
  onDownloadInvoice: (order: Order) => void;
  onAddToBag: (product: Product, size?: string, color?: string) => void;
  onOpenCart: () => void;
  onOpenProduct: (product: Product) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
  onOpenSupport?: (orderId?: string) => void;
}

interface TrackingStage {
  index: number;
  key: string;
  title: string;
  shortTitle: string;
  location: string;
  description: string;
  timestamp: string;
  state: "completed" | "current" | "upcoming";
}

function normalizeOrderQuery(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/^#/, "");
  if (cleaned.startsWith("TRK-")) {
    return cleaned.replace(/^TRK-/, "");
  }
  return cleaned;
}

export function getOrderActiveStageIndex(status: Order["status"]): number {
  const s = (status || "").toLowerCase();
  if (s === "cancelled") return -1;
  if (s === "pending") return 0;
  if (s === "confirmed" || s === "processing") return 1;
  if (s === "shipped" || s === "in transit") return 2;
  if (s === "delivered") return 3;
  return 1;
}

function buildTrackingStages(order: Order, destinationLabel: string): TrackingStage[] {
  const activeIdx = getOrderActiveStageIndex(order.status);
  const baseDate = (() => {
    if (order.createdAt?.toDate) return order.createdAt.toDate() as Date;
    const parsed = new Date(order.createdAt || order.date);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  const formatStepDate = (offsetHours: number) => {
    const d = new Date(baseDate.getTime() + offsetHours * 3600 * 1000);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const rawStages = [
    {
      key: "confirmed",
      title: "Order Confirmed",
      shortTitle: "Confirmed",
      location: "BTNX Store · Osun",
      description: "Order verified and queued for fulfillment.",
      timestamp: `${formatStepDate(0)}, 09:15`,
    },
    {
      key: "packed",
      title: "Inspected & Packed",
      shortTitle: "Packed",
      location: "Osogbo Dispatch Hub",
      description: "Garments checked, steamed, and sealed for courier pickup.",
      timestamp: `${formatStepDate(6)}, 15:20`,
    },
    {
      key: "transit",
      title: "In Transit Nationwide",
      shortTitle: "In Transit",
      location: "Express Inter-State Linehaul",
      description: "Dispatched from Osun via priority nationwide courier.",
      timestamp: `${formatStepDate(22)}, 08:40`,
    },
    {
      key: "delivered",
      title: "Delivered",
      shortTitle: "Delivered",
      location: destinationLabel,
      description: "Signed and received at delivery destination.",
      timestamp: `${formatStepDate(48)}, 13:10`,
    },
  ];

  return rawStages.map((stage, index) => {
    let state: "completed" | "current" | "upcoming" = "upcoming";
    if (activeIdx === 3) {
      state = "completed";
    } else if (index < activeIdx) {
      state = "completed";
    } else if (index === activeIdx) {
      state = "current";
    }
    return {
      index,
      ...stage,
      state,
    };
  });
}

function getEstimatedDeliveryWindow(order: Order): string {
  const s = (order.status || "").toLowerCase();
  if (s === "delivered") return "Completed";
  if (s === "cancelled") return "Cancelled";

  const baseDate = (() => {
    if (order.createdAt?.toDate) return order.createdAt.toDate() as Date;
    const parsed = new Date(order.createdAt || order.date);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  const minDate = new Date(baseDate.getTime() + 2 * 24 * 3600 * 1000);
  const maxDate = new Date(baseDate.getTime() + 4 * 24 * 3600 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  return `${fmt(minDate)} – ${fmt(maxDate)}`;
}

type StatusTab = "all" | "active" | "delivered";

export default function TrackOrder({
  orders,
  currentUser,
  clientAddress,
  onViewInvoice,
  onDownloadInvoice,
  onAddToBag,
  onOpenCart,
  onOpenProduct,
  onAddToast,
  onOpenSupport,
}: TrackOrderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrderParam = searchParams.get("order") || "";

  const [searchInput, setSearchInput] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [remoteOrder, setRemoteOrder] = useState<Order | null>(null);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  const trackableOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const allKnownOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderParam.trim()) return null;
    const norm = normalizeOrderQuery(selectedOrderParam);
    const localMatch = allKnownOrders.find((o) => {
      const idUpper = o.id.toUpperCase();
      const stripped = idUpper.replace(/^(BX-|KB-)/, "");
      return (
        idUpper === norm ||
        stripped === norm ||
        `TRK-${stripped}` === selectedOrderParam.trim().toUpperCase()
      );
    });
    if (localMatch) return localMatch;
    if (remoteOrder) {
      const idUpper = remoteOrder.id.toUpperCase();
      const stripped = idUpper.replace(/^(BX-|KB-)/, "");
      if (idUpper === norm || stripped === norm) return remoteOrder;
    }
    return null;
  }, [selectedOrderParam, allKnownOrders, remoteOrder]);

  useEffect(() => {
    const norm = normalizeOrderQuery(selectedOrderParam);
    if (!norm || selectedOrder || !currentUser) return;

    let cancelled = false;
    const fetchOrderFromFirestore = async () => {
      setIsSearchingRemote(true);
      try {
        const candidates =
          norm.startsWith("BX-") || norm.startsWith("KB-")
            ? [norm]
            : [`BX-${norm}`, `KB-${norm}`, norm];
        for (const candidateId of candidates) {
          const snap = await getDoc(doc(db, "orders", candidateId));
          if (snap.exists() && !cancelled) {
            setRemoteOrder({ id: snap.id, ...(snap.data() as any) } as Order);
            break;
          }
        }
      } catch {
        // Ignore lookup misses
      } finally {
        if (!cancelled) setIsSearchingRemote(false);
      }
    };

    fetchOrderFromFirestore();
    return () => {
      cancelled = true;
    };
  }, [selectedOrderParam, selectedOrder, currentUser]);

  const filteredOrders = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return trackableOrders.filter((order) => {
      const s = (order.status || "").toLowerCase();
      if (statusTab === "active" && (s === "delivered" || s === "cancelled")) return false;
      if (statusTab === "delivered" && s !== "delivered") return false;

      if (!q) return true;
      const trackingCode = `trk-${order.id.replace(/^(kb-|bx-)/i, "").toLowerCase()}`;
      const matchesId = order.id.toLowerCase().includes(q) || trackingCode.includes(q);
      const matchesStatus = s.includes(q);
      const matchesItem = order.items.some((item) =>
        item.product?.name?.toLowerCase().includes(q)
      );
      return matchesId || matchesStatus || matchesItem;
    });
  }, [trackableOrders, searchInput, statusTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const norm = normalizeOrderQuery(trimmed);
    const exactMatch = allKnownOrders.find((o) => {
      const idUpper = o.id.toUpperCase();
      const stripped = idUpper.replace(/^(BX-|KB-)/, "");
      return (
        idUpper === norm ||
        stripped === norm ||
        `TRK-${stripped}` === trimmed.toUpperCase()
      );
    });

    if (exactMatch) {
      setSearchParams({ order: exactMatch.id });
    } else if (filteredOrders.length === 1) {
      setSearchParams({ order: filteredOrders[0].id });
    } else if (
      trimmed.toUpperCase().startsWith("BX-") ||
      trimmed.toUpperCase().startsWith("KB-") ||
      trimmed.toUpperCase().startsWith("TRK-")
    ) {
      setSearchParams({ order: trimmed.toUpperCase() });
    }
  };

  const handleOpenOrderTracking = (orderId: string) => {
    setSearchParams({ order: orderId });
  };

  const handleBackToList = () => {
    setSearchParams({});
  };

  const handleCopyTracking = (trackingNum: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(trackingNum).catch(() => {});
    setCopiedTracking(trackingNum);
    onAddToast(`Copied ${trackingNum}`, "success");
    setTimeout(() => setCopiedTracking(null), 1800);
  };

  const handleReorder = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    order.items.forEach((item) => {
      if (item.product) {
        onAddToBag(item.product, item.size, item.color);
      }
    });
    onAddToast(`Added Order ${order.id} items to bag.`, "success");
    onOpenCart();
  };

  const destinationLabel = clientAddress?.trim()
    ? clientAddress
    : "Nationwide Delivery · Nigeria";

  const stages = useMemo(
    () => (selectedOrder ? buildTrackingStages(selectedOrder, destinationLabel) : []),
    [selectedOrder, destinationLabel]
  );

  const activeStageIdx = selectedOrder ? getOrderActiveStageIndex(selectedOrder.status) : 0;
  const isCancelled =
    selectedOrder && (selectedOrder.status || "").toLowerCase() === "cancelled";
  const selectedTrackingNumber = selectedOrder
    ? `TRK-${selectedOrder.id.replace(/^(KB-|BX-)/i, "")}`
    : "";

  const progressPercentage = isCancelled
    ? 0
    : activeStageIdx === 3
    ? 100
    : activeStageIdx === 2
    ? 75
    : activeStageIdx === 1
    ? 50
    : 25;

  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] pb-20 lg:pb-16">
      {/* Slim Editorial Header & Search Bar */}
      <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 pt-8 pb-8 sm:pt-10 sm:pb-10 lg:pt-12 lg:pb-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium">
                Osun Dispatch · Nationwide Courier
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.015em] text-[#141413] dark:text-[#F3F1EC]">
                {selectedOrder ? `Shipment #${selectedOrder.id}` : "Order Tracking"}
              </h1>
            </div>

            <div className="w-full lg:w-auto lg:min-w-[420px]">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center border-b border-[#141413] dark:border-[#F3F1EC] pb-1.5 gap-2"
                id="order-tracking-lookup-form"
              >
                <Search className="w-3.5 h-3.5 text-[#66625B] dark:text-[#A7A299] shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (selectedOrderParam) {
                      setSearchParams({}, { replace: true });
                    }
                  }}
                  placeholder="Search by Order ID, tracking code, or item..."
                  aria-label="Search orders by ID, tracking code, or item"
                  className="w-full bg-transparent text-xs sm:text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none py-1"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="p-1 text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:opacity-85 text-[11px] font-medium uppercase tracking-[0.14em] transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Track
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <section className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 pt-6 sm:pt-10 space-y-8">
        {selectedOrderParam ? (
          /* ================= SINGLE ORDER LIVE TRACKING VIEW ================= */
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Trackable Orders ({trackableOrders.length})</span>
              </button>

              <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299]">
                Osun Store &rarr; Nationwide Express
              </span>
            </div>

            {isSearchingRemote ? (
              <div className="py-20 text-center space-y-3 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816]">
                <div className="w-6 h-6 border border-[#E6E2DA] dark:border-[#2C2A26] border-t-[#141413] dark:border-t-[#F3F1EC] rounded-full animate-spin mx-auto" />
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
                  Searching shipment records...
                </p>
              </div>
            ) : selectedOrder ? (
              <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26]">
                {/* Row 1: Compact 4-Column Telemetry Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-[#E6E2DA] dark:divide-[#2C2A26] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                  <div className="p-4 sm:p-6 space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                      Order Reference
                    </span>
                    <p className="font-mono text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                      #{selectedOrder.id}
                      <span className="mx-1.5 text-[#66625B] dark:text-[#A7A299] font-normal">·</span>
                      <span className="font-sans text-xs text-[#66625B] dark:text-[#A7A299] font-normal">
                        {selectedOrder.date}
                      </span>
                    </p>
                  </div>

                  <div className="p-4 sm:p-6 space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                      Tracking Code
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                        {selectedTrackingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyTracking(selectedTrackingNumber, e)}
                        className="text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
                        title="Copy tracking code"
                      >
                        {copiedTracking === selectedTrackingNumber ? (
                          <Check className="w-3.5 h-3.5 text-[#966830] dark:text-[#C89B62]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                      Shipment Status
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-[#966830] dark:text-[#C89B62]">
                      {isCancelled
                        ? "Cancelled"
                        : activeStageIdx === 3
                        ? "Delivered"
                        : activeStageIdx === 2
                        ? "In Transit Nationwide"
                        : "Preparing at Osun Store"}
                    </p>
                  </div>

                  <div className="p-4 sm:p-6 space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                      Estimated Delivery
                    </span>
                    <p className="font-mono text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                      {getEstimatedDeliveryWindow(selectedOrder)}
                    </p>
                  </div>
                </div>

                {/* Row 2: Connected Architectural 4-Stage Progress Tracker */}
                {!isCancelled && (
                  <div className="px-4 sm:px-8 py-6 sm:py-7 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] space-y-5">
                    <div className="flex items-center justify-between gap-4 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] font-medium">
                          Dispatch Progress
                        </span>
                        <span aria-hidden="true" className="text-[#66625B] dark:text-[#A7A299]">
                          ·
                        </span>
                        <span className="font-medium text-[#141413] dark:text-[#F3F1EC]">
                          Step 0{Math.min(activeStageIdx + 1, 4)} of 04 ({stages[Math.min(activeStageIdx, 3)]?.title})
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-medium text-[#966830] dark:text-[#C89B62] tabular-nums shrink-0">
                        {progressPercentage}% Complete
                      </span>
                    </div>

                    {/* Continuous Progress Track */}
                    <div className="w-full h-[2px] bg-[#E6E2DA] dark:bg-[#2C2A26] overflow-hidden">
                      <div
                        className="h-full bg-[#141413] dark:bg-[#F3F1EC] transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>

                    {/* 4 Stage Columns */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4 pt-1">
                      {stages.map((stage, idx) => {
                        const isDone = stage.state === "completed";
                        const isCurrent = stage.state === "current";
                        const isReached = isDone || isCurrent;
                        return (
                          <div
                            key={stage.key}
                            className={`space-y-1 ${
                              isReached ? "opacity-100" : "opacity-50"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono text-[10px] tabular-nums ${
                                  isCurrent
                                    ? "text-[#966830] dark:text-[#C89B62] font-semibold"
                                    : isDone
                                    ? "text-[#141413] dark:text-[#F3F1EC] font-medium"
                                    : "text-[#66625B] dark:text-[#A7A299]"
                                }`}
                              >
                                0{idx + 1}
                              </span>
                              <span aria-hidden="true" className="text-[#66625B] dark:text-[#A7A299] text-[10px]">
                                ·
                              </span>
                              <span
                                className={`text-xs font-medium truncate ${
                                  isReached
                                    ? "text-[#141413] dark:text-[#F3F1EC]"
                                    : "text-[#66625B] dark:text-[#A7A299]"
                                }`}
                              >
                                {stage.title}
                              </span>
                            </div>

                            <p className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] tabular-nums">
                              {stage.state === "upcoming" ? "Pending" : stage.timestamp}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Row 3: Two-Column Split — Left: Activity Log & Route | Right: Items & Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E6E2DA] dark:divide-[#2C2A26]">
                  {/* Left Column: Chronological Log + Route Details */}
                  <div className="lg:col-span-7 p-4 sm:p-8 flex flex-col justify-between gap-8">
                    <div className="space-y-5">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299] font-medium">
                          Tracking History
                        </h2>
                        <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299]">
                          WAT (UTC+1)
                        </span>
                      </div>

                      <div className="relative pl-4 border-l border-[#E6E2DA] dark:border-[#2C2A26] space-y-6">
                        {stages.map((stage) => {
                          const isDone = stage.state === "completed";
                          const isCurrent = stage.state === "current";
                          return (
                            <div
                              key={stage.key}
                              className={`relative ${
                                stage.state === "upcoming" ? "opacity-45" : "opacity-100"
                              }`}
                            >
                              <span
                                className={`-left-[20.5px] top-1.5 w-2 h-2 rounded-full border ${
                                  isCurrent
                                    ? "bg-[#966830] dark:bg-[#C89B62] border-[#966830] dark:border-[#C89B62]"
                                    : isDone
                                    ? "bg-[#141413] dark:bg-[#F3F1EC] border-[#141413] dark:border-[#F3F1EC]"
                                    : "bg-[#FAF9F7] dark:bg-[#191816] border-[#66625B] dark:border-[#A7A299]"
                                } absolute`}
                              />

                              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5">
                                <h3 className="text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC]">
                                  {stage.title}
                                </h3>
                                <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] tabular-nums shrink-0">
                                  {stage.state === "upcoming" ? "Scheduled" : stage.timestamp}
                                </span>
                              </div>

                              <p className="text-xs text-[#66625B] dark:text-[#A7A299] mt-0.5">
                                {stage.description}
                              </p>
                              <p className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] mt-1">
                                {stage.location}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clean Unboxed Route Footer */}
                    <div className="pt-5 border-t border-[#E6E2DA] dark:border-[#2C2A26] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                          Dispatch Origin
                        </span>
                        <p className="font-medium text-[#141413] dark:text-[#F3F1EC] mt-1">
                          BTNX Store · Osun State
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                          Destination
                        </span>
                        <p className="font-medium text-[#141413] dark:text-[#F3F1EC] mt-1 truncate">
                          {destinationLabel}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                          Courier
                        </span>
                        <p className="font-medium text-[#141413] dark:text-[#F3F1EC] mt-1">
                          BTNX Nationwide Express
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Order Manifest & Actions */}
                  <div className="lg:col-span-5 p-4 sm:p-8 flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-[11px] uppercase tracking-[0.16em] text-[#66625B] dark:text-[#A7A299] font-medium">
                          Shipment Contents
                        </h2>
                        <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] tabular-nums">
                          {selectedOrder.items.reduce((s, i) => s + i.quantity, 0)}{" "}
                          {selectedOrder.items.reduce((s, i) => s + i.quantity, 0) === 1
                            ? "Piece"
                            : "Pieces"}
                        </span>
                      </div>

                      <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] border-t border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                        {selectedOrder.items.map((item, idx) => (
                          <div
                            key={`${item.product?.id || idx}-${idx}`}
                            onClick={() => item.product && onOpenProduct(item.product)}
                            className="py-3.5 flex items-center gap-3.5 group cursor-pointer"
                          >
                            <div className="w-11 h-14 bg-[#F4F1EC] dark:bg-[#22211E] shrink-0 overflow-hidden">
                              <GalleryImage
                                src={item.product?.image || ""}
                                alt={item.product?.name || "Garment"}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate group-hover:text-[#966830] dark:group-hover:text-[#C89B62] transition-colors">
                                {item.product?.name}
                              </p>
                              <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] mt-0.5">
                                Size {item.size} · {item.color} · Qty {item.quantity}
                              </p>
                            </div>
                            <div className="text-right font-mono text-xs tabular-nums text-[#141413] dark:text-[#F3F1EC] shrink-0">
                              {formatNaira((item.product?.price || 0) * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-[#66625B] dark:text-[#A7A299]">
                          <span>Nationwide Courier</span>
                          <span className="font-mono">Complimentary</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-[#141413] dark:text-[#F3F1EC] pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26]">
                          <span>Total Paid</span>
                          <span className="font-mono tabular-nums">
                            {formatNaira(selectedOrder.total)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(selectedOrder)}
                          className="h-9 px-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Invoice</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDownloadInvoice(selectedOrder)}
                          className="h-9 px-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>

                        {onOpenSupport && (
                          <button
                            type="button"
                            onClick={() => onOpenSupport(selectedOrder.id)}
                            className="h-9 px-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Headphones className="w-3 h-3" />
                            <span>Help</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleReorder(selectedOrder)}
                          className="h-9 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:opacity-85 text-[11px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 transition-opacity cursor-pointer whitespace-nowrap ml-auto"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reorder</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 px-6 text-center border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] space-y-4">
                <h2 className="font-display text-2xl sm:text-3xl text-[#141413] dark:text-[#F3F1EC]">
                  No shipment found for &ldquo;{selectedOrderParam}&rdquo;
                </h2>
                <p className="text-xs text-[#66625B] dark:text-[#A7A299] max-w-md mx-auto leading-relaxed">
                  Check the Order ID on your receipt or return to the full list of trackable orders.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="h-9 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                  >
                    View All Trackable Orders
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= DEFAULT: ALL ORDERS AVAILABLE FOR TRACKING LIST ================= */
          <div className="space-y-5">
            {/* Filter & Count Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
              <div className="flex items-center gap-6">
                {(
                  [
                    { key: "all", label: "All Shipments" },
                    { key: "active", label: "In Progress" },
                    { key: "delivered", label: "Delivered" },
                  ] as const
                ).map((tab) => {
                  const isActive = statusTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusTab(tab.key)}
                      className={`relative pb-1 text-xs font-medium uppercase tracking-[0.14em] transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "text-[#141413] dark:text-[#F3F1EC]"
                          : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#141413] dark:bg-[#F3F1EC] transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <p className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">
                Showing <strong className="text-[#141413] dark:text-[#F3F1EC]">{filteredOrders.length}</strong>{" "}
                {filteredOrders.length === 1 ? "Shipment" : "Shipments"}
                {orders.length === 0 && " · Sample Preview"}
              </p>
            </div>

            {/* Clean Architectural Ledger of Trackable Orders */}
            {filteredOrders.length > 0 ? (
              <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                {filteredOrders.map((order) => {
                  const trkCode = `TRK-${order.id.replace(/^(KB-|BX-)/i, "")}`;
                  const stageIdx = getOrderActiveStageIndex(order.status);
                  const stepLabels = ["Confirmed", "Packed", "In Transit", "Delivered"];
                  const rowPercent =
                    stageIdx === 3 ? 100 : stageIdx === 2 ? 75 : stageIdx === 1 ? 50 : 25;
                  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
                  const primaryItem = order.items[0]?.product?.name || "BTNX Garment";
                  const extraCount = Math.max(0, order.items.length - 1);

                  return (
                    <div
                      key={order.id}
                      onClick={() => handleOpenOrderTracking(order.id)}
                      className="p-4 sm:p-6 hover:bg-[#FAF9F7] dark:hover:bg-[#22211E]/70 transition-colors cursor-pointer group"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
                        {/* Column 1: Thumbnails + Order ID & Item Summary (4 cols) */}
                        <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                          <div className="flex -space-x-2 shrink-0">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div
                                key={`${item.product?.id || idx}-${idx}`}
                                className="w-11 h-14 bg-[#F4F1EC] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] overflow-hidden shrink-0"
                              >
                                <GalleryImage
                                  src={item.product?.image || ""}
                                  alt={item.product?.name || "Garment"}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-medium text-[#141413] dark:text-[#F3F1EC]">
                                #{order.id}
                              </span>
                              <span aria-hidden="true" className="text-[#66625B] dark:text-[#A7A299]">
                                ·
                              </span>
                              <span className="text-[#66625B] dark:text-[#A7A299]">{order.date}</span>
                            </div>

                            <p className="text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                              {primaryItem}
                              {extraCount > 0 && (
                                <span className="text-[#66625B] dark:text-[#A7A299] font-normal">
                                  {" "}
                                  +{extraCount} more
                                </span>
                              )}
                            </p>

                            <p className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] tabular-nums">
                              {trkCode} · {totalQty} {totalQty === 1 ? "pc" : "pcs"} ·{" "}
                              {formatNaira(order.total)}
                            </p>
                          </div>
                        </div>

                        {/* Column 2: Connected 4-Step Progress Bar (5 cols) */}
                        <div className="lg:col-span-5 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-[#966830] dark:text-[#C89B62]">
                              {order.status}
                            </span>
                            <span className="font-mono text-[#66625B] dark:text-[#A7A299] tabular-nums">
                              Est. {getEstimatedDeliveryWindow(order)}
                            </span>
                          </div>

                          <div className="w-full h-[2px] bg-[#E6E2DA] dark:bg-[#2C2A26] overflow-hidden">
                            <div
                              className="h-full bg-[#141413] dark:bg-[#F3F1EC]"
                              style={{ width: `${rowPercent}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {stepLabels.map((label, idx) => {
                              const reached = idx <= stageIdx;
                              return (
                                <p
                                  key={label}
                                  className={`text-[10px] truncate ${
                                    reached
                                      ? "text-[#141413] dark:text-[#F3F1EC] font-medium"
                                      : "text-[#66625B] dark:text-[#A7A299]"
                                  }`}
                                >
                                  0{idx + 1} · {label}
                                </p>
                              );
                            })}
                          </div>
                        </div>

                        {/* Column 3: Quick Actions (3 cols) */}
                        <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E6E2DA] dark:border-[#2C2A26]">
                          <button
                            type="button"
                            onClick={(e) => handleCopyTracking(trkCode, e)}
                            className="h-8 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[10px] font-mono uppercase tracking-[0.1em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {copiedTracking === trkCode ? (
                              <>
                                <Check className="w-3 h-3 text-[#966830] dark:text-[#C89B62]" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy ID</span>
                              </>
                            )}
                          </button>

                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] group-hover:text-[#966830] dark:group-hover:text-[#C89B62] transition-colors whitespace-nowrap">
                            <span>Track Shipment</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 px-6 text-center border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] space-y-3">
                <h2 className="font-display text-2xl text-[#141413] dark:text-[#F3F1EC]">
                  No matching orders found
                </h2>
                <p className="text-xs text-[#66625B] dark:text-[#A7A299] max-w-md mx-auto">
                  No shipments match your current filter. Clear your search or switch back to All Shipments.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setStatusTab("all");
                    }}
                    className="h-9 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                  >
                    Reset Filter
                  </button>
                  <Link
                    to="/shop"
                    className="h-9 px-4 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5"
                  >
                    <span>Browse Catalog</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dedicated Customer Service & Dispatch Assistance Strip */}
        <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block">
              Customer Service · Osun &amp; Nationwide Desk
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-medium text-[#141413] dark:text-[#F3F1EC]">
              Need assistance with a delivery or exchange?
            </h3>
            <p className="text-xs text-[#66625B] dark:text-[#A7A299] max-w-xl leading-relaxed">
              Our client care team can update delivery addresses prior to dispatch, arrange size exchanges, or verify courier scans across Nigeria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onOpenSupport && (
              <button
                type="button"
                onClick={() => onOpenSupport(selectedOrder?.id)}
                className="h-10 px-5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:opacity-85 text-xs font-medium uppercase tracking-[0.14em] inline-flex items-center gap-2 transition-opacity cursor-pointer whitespace-nowrap"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Contact Customer Service</span>
              </button>
            )}
            <a
              href="mailto:hello@btnx.store"
              className="h-10 px-4 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-xs font-mono text-[#141413] dark:text-[#F3F1EC] inline-flex items-center justify-center transition-colors whitespace-nowrap"
            >
              hello@btnx.store
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
