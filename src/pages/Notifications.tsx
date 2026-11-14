import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Bell,
  Truck,
  Percent,
  Tag,
  CheckCheck,
  ArrowLeft,
  ArrowRight,
  FileText,
  Download,
  Copy,
  Check,
  ShoppingBag,
  Lock,
  Clock,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { AppNotification, isNotificationUnread } from "../hooks/useNotifications";
import { Order } from "../types";
import { formatNaira } from "../utils/currency";
import GalleryImage from "../components/GalleryImage";
import { NotificationRowSkeleton, SkeletonBlock } from "../components/StoreSkeleton";

interface NotificationsProps {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading?: boolean;
  currentUser: any | null;
  orders: Order[];
  onMarkAsRead: (notif: AppNotification) => void;
  onMarkAllAsRead: () => void;
  onOpenAuth: () => void;
  onViewInvoice: (order: Order) => void;
  onDownloadInvoice: (order: Order) => void;
  onOpenOrders: () => void;
  onApplyPromoToBag: (code: string) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

type FilterKey = "all" | "unread" | "order_status" | "promo" | "new_arrival";

const FILTER_TABS: { key: FilterKey; label: string; mobileLabel: string }[] = [
  { key: "all", label: "All", mobileLabel: "All" },
  { key: "unread", label: "Unread", mobileLabel: "Unread" },
  { key: "order_status", label: "Orders", mobileLabel: "Orders" },
  { key: "promo", label: "Promos", mobileLabel: "Promos" },
  { key: "new_arrival", label: "Drops", mobileLabel: "New" },
];

export default function Notifications({
  notifications,
  unreadCount,
  isLoading = false,
  currentUser,
  orders,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenAuth,
  onViewInvoice,
  onDownloadInvoice,
  onOpenOrders,
  onApplyPromoToBag,
  onAddToast,
}: NotificationsProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get("id");

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(queryId);
  const [mobileDetailOpen, setMobileDetailOpen] = useState<boolean>(!!queryId);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (queryId) {
      setSelectedId(queryId);
      setMobileDetailOpen(true);
    }
  }, [queryId]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === "unread") return isNotificationUnread(n, currentUser?.uid);
      if (activeFilter === "order_status") return n.type === "order_status";
      if (activeFilter === "promo") return n.type === "promo";
      if (activeFilter === "new_arrival") return n.type === "new_arrival";
      return true;
    });
  }, [notifications, activeFilter, currentUser?.uid]);

  const selectedNotification = useMemo(() => {
    if (selectedId) {
      const exact = notifications.find((n) => n.id === selectedId);
      if (exact) return exact;
    }
    return filteredNotifications[0] || notifications[0] || null;
  }, [selectedId, notifications, filteredNotifications]);

  useEffect(() => {
    if (selectedNotification && currentUser && isNotificationUnread(selectedNotification, currentUser.uid)) {
      onMarkAsRead(selectedNotification);
    }
  }, [selectedNotification, currentUser, onMarkAsRead]);

  const handleSelectNotification = (notif: AppNotification) => {
    setSelectedId(notif.id);
    setMobileDetailOpen(true);
    setSearchParams({ id: notif.id }, { replace: true });
    if (isNotificationUnread(notif, currentUser?.uid)) {
      onMarkAsRead(notif);
    }
  };

  const getTypeMeta = (type: string) => {
    switch (type) {
      case "order_status":
        return {
          label: "Order Update",
          icon: <Truck className="w-4 h-4 text-[#141413] dark:text-[#F3F1EC]" />,
        };
      case "promo":
        return {
          label: "Promo Offer",
          icon: <Percent className="w-4 h-4 text-[#966830] dark:text-[#C89B62]" />,
        };
      case "new_arrival":
        return {
          label: "New Drop",
          icon: <Tag className="w-4 h-4 text-[#141413] dark:text-[#F3F1EC]" />,
        };
      default:
        return {
          label: "Store Notice",
          icon: <Bell className="w-4 h-4 text-[#66625B] dark:text-[#A7A299]" />,
        };
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      if (Number.isNaN(diffMs)) return "Recent";
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return "Recent";
    }
  };

  const formatFullDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return "Recent Dispatch";
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recent Dispatch";
    }
  };

  const extractOrderRef = (notif: AppNotification): string | null => {
    const combined = `${notif.title} ${notif.message}`;
    const match = combined.match(/#?((?:BX|KB)-\d{4,10})/i);
    return match ? match[1].toUpperCase() : null;
  };

  const extractPromoCode = (notif: AppNotification): string | null => {
    if (notif.type !== "promo") return null;
    const combined = `${notif.title} ${notif.message}`;
    const match = combined.match(/\b([A-Z]{3,10}\d{1,3})\b/);
    return match ? match[1] : "BTNX50";
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    onAddToast(`Code ${code} copied to clipboard.`, "success");
    setTimeout(() => setCopiedCode(null), 2200);
  };

  const renderDetailInspector = (notif: AppNotification) => {
    const meta = getTypeMeta(notif.type);
    const isUnread = isNotificationUnread(notif, currentUser?.uid);
    const orderRef = extractOrderRef(notif);
    const matchedOrder = orderRef
      ? orders.find((o) => o.id.toUpperCase() === orderRef)
      : undefined;
    const promoCode = extractPromoCode(notif);

    return (
      <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm overflow-hidden">
        {/* Inspector Header */}
        <div className="p-5 sm:p-7 border-b border-[#E6E2DA] dark:border-[#2C2A26] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 border border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E] rounded-sm flex items-center justify-center">
                {meta.icon}
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block">
                  {meta.label}
                </span>
                <span className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299]">
                  {formatRelativeTime(notif.createdAt)}
                </span>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] border ${
                isUnread
                  ? "border-[#966830]/40 dark:border-[#C89B62]/40 bg-[#FAF9F7] dark:bg-[#22211E] text-[#966830] dark:text-[#C89B62]"
                  : "border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#22211E] text-[#66625B] dark:text-[#A7A299]"
              }`}
            >
              {isUnread ? "Unread" : "Read"}
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#141413] dark:text-[#F3F1EC] leading-tight">
            {notif.title}
          </h2>
        </div>

        {/* Full Message & Metadata Grid */}
        <div className="p-5 sm:p-7 space-y-6">
          <div className="p-5 bg-[#FAF9F7] dark:bg-[#111110] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm">
            <p className="text-sm sm:text-[15px] text-[#141413] dark:text-[#F3F1EC] leading-relaxed">
              {notif.message}
            </p>
          </div>

          {/* Complete Technical Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7]/60 dark:bg-[#22211E]/60 space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">
                <Clock className="w-3 h-3" />
                Received
              </span>
              <p className="font-mono text-[#141413] dark:text-[#F3F1EC] text-[11px]">
                {formatFullDateTime(notif.createdAt)}
              </p>
            </div>

            <div className="p-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7]/60 dark:bg-[#22211E]/60 space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">
                <Radio className="w-3 h-3" />
                Channel
              </span>
              <p className="text-[#141413] dark:text-[#F3F1EC] font-medium">
                {notif.userId === "broadcast" ? "Store Announcement" : "Account Alert"}
              </p>
            </div>

            <div className="p-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm bg-[#FAF9F7]/60 dark:bg-[#22211E]/60 space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299]">
                <ShieldCheck className="w-3 h-3" />
                Notice ID
              </span>
              <p className="font-mono text-[#141413] dark:text-[#F3F1EC] text-[11px] truncate">
                {notif.id}
              </p>
            </div>
          </div>

          {/* Enriched Order Context Card */}
          {matchedOrder ? (
            <div className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-5 space-y-4 bg-[#FAF9F7] dark:bg-[#22211E]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3.5">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-medium block">
                    Linked Order Record
                  </span>
                  <p className="font-mono text-sm font-semibold text-[#141413] dark:text-[#F3F1EC] mt-0.5">
                    #{matchedOrder.id} · {matchedOrder.status}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold text-[#141413] dark:text-[#F3F1EC] tabular-nums">
                  {formatNaira(matchedOrder.total)}
                </span>
              </div>

              <div className="space-y-3">
                {matchedOrder.items.map((item, idx) => (
                  <div key={`${item.product?.id || idx}-${idx}`} className="flex items-center gap-3.5">
                    <div className="w-12 h-14 bg-[#F4F1EC] dark:bg-[#191816] rounded-sm overflow-hidden shrink-0">
                      <GalleryImage
                        src={item.product?.image || ""}
                        alt={item.product?.name || "Garment"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                        {item.product?.name}
                      </p>
                      <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] mt-0.5">
                        Size {item.size} · {item.color} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-[#141413] dark:text-[#F3F1EC] tabular-nums shrink-0">
                      {formatNaira((item.product?.price || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(`/track?order=${encodeURIComponent(matchedOrder.id)}`)}
                  className="min-h-[42px] px-4 py-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track Shipment</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewInvoice(matchedOrder)}
                  className="min-h-[42px] px-4 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadInvoice(matchedOrder)}
                  className="min-h-[42px] px-4 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="min-h-[42px] px-4 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-white dark:bg-[#191816] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Order History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : orderRef ? (
            <div className="border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-4 bg-[#FAF9F7] dark:bg-[#22211E] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] block">
                  Order Reference
                </span>
                <span className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
                  #{orderRef} · Tracking TRK-{orderRef.replace(/^(KB-|BX-)/, "")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/track?order=${encodeURIComponent(orderRef)}`)}
                  className="min-h-[38px] px-4 py-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track Shipment</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="min-h-[38px] px-4 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Orders</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          {/* Promo Action Context */}
          {promoCode && (
            <div className="border border-[#966830]/35 dark:border-[#C89B62]/35 rounded-sm p-5 bg-[#FAF9F7] dark:bg-[#22211E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-medium block">
                  Promo Code
                </span>
                <p className="font-mono text-base font-semibold text-[#141413] dark:text-[#F3F1EC] tracking-[0.14em] mt-1">
                  {promoCode}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopyCode(promoCode)}
                  className="min-h-[42px] px-4 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode === promoCode ? (
                    <Check className="w-3.5 h-3.5 text-[#966830] dark:text-[#C89B62]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCode === promoCode ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApplyPromoToBag(promoCode)}
                  className="min-h-[42px] px-4 py-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.12em] rounded-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Apply to Bag</span>
                </button>
              </div>
            </div>
          )}

          {/* New Arrival Action */}
          {notif.type === "new_arrival" && (
            <div className="pt-2">
              <Link
                to="/shop"
                className="min-h-[44px] px-5 py-2.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-sm inline-flex items-center gap-2 transition-colors"
              >
                <span>Explore Seasonal Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] pb-20 lg:pb-0">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
        <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 pt-8 pb-8 sm:pt-10 sm:pb-10 lg:pt-12 lg:pb-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block">
                Client Communications
              </span>
              <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.015em]">
                Notifications
              </h1>
              <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-lg leading-relaxed">
                Real-time order confirmations, courier dispatch milestones, and private seasonal invitations.
              </p>
            </div>

            {currentUser && (
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs text-[#66625B] dark:text-[#A7A299] tabular-nums">
                  <strong className="text-[#141413] dark:text-[#F3F1EC]">{unreadCount}</strong> Unread
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    className="min-h-[40px] px-4 py-2 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-[#FAF9F7] dark:bg-[#22211E] text-xs font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark All Read</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Inbox Workspace */}
      <section className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12">
        {!currentUser ? (
          <div className="py-20 px-6 text-center bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm max-w-xl mx-auto space-y-4">
            <Lock className="w-7 h-7 text-[#66625B] dark:text-[#A7A299] mx-auto stroke-[1.25]" />
            <h2 className="font-display text-3xl text-[#141413] dark:text-[#F3F1EC]">
              Client Access Required
            </h2>
            <p className="text-sm text-[#66625B] dark:text-[#A7A299] leading-relaxed">
              Sign in to view your order confirmations, shipping notices, and store offers.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[46px] px-7 py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        ) : isLoading && notifications.length === 0 ? (
          <div className="space-y-6" aria-busy="true" aria-label="Loading notifications">
            <SkeletonBlock className="h-[44px] w-full sm:w-96" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              <div className="lg:col-span-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
                {[0, 1, 2, 3].map((row) => (
                  <NotificationRowSkeleton key={row} />
                ))}
              </div>
              <div className="hidden lg:block lg:col-span-7 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm p-8 space-y-5">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-8 w-3/4" />
                <div className="space-y-2 pt-2">
                  <SkeletonBlock className="h-3.5 w-full" />
                  <SkeletonBlock className="h-3.5 w-11/12" />
                  <SkeletonBlock className="h-3.5 w-3/4" />
                </div>
              </div>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 px-6 text-center bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm space-y-4">
            <Bell className="w-8 h-8 text-[#66625B] dark:text-[#A7A299] mx-auto stroke-[1.25]" />
            <h2 className="font-display text-3xl text-[#141413] dark:text-[#F3F1EC]">
              All Caught Up
            </h2>
            <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-md mx-auto">
              Order updates, delivery tracking, and new drop alerts will show up here.
            </p>
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="min-h-[46px] px-7 py-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:bg-[#2B2A28] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.14em] rounded-sm transition-colors cursor-pointer"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Slim Category Filter Strip */}
            <div className="grid grid-cols-5 sm:inline-flex sm:items-center gap-1 p-1 bg-[#F4F1EC] dark:bg-[#22211E] border border-[#E6E2DA]/70 dark:border-[#2C2A26] rounded-sm w-full sm:w-auto">
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveFilter(tab.key);
                      setMobileDetailOpen(false);
                    }}
                    className={`min-h-[36px] px-1 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium rounded-sm whitespace-nowrap flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] shadow-xs"
                        : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                    }`}
                  >
                    <span className="sm:hidden">{tab.mobileLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              {/* Left Inbox List (hidden on mobile when inspecting a detail) */}
              <div
                className={`lg:col-span-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] overflow-hidden ${
                  mobileDetailOpen && selectedNotification ? "hidden lg:block" : "block"
                }`}
              >
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notif) => {
                    const isUnread = isNotificationUnread(notif, currentUser?.uid);
                    const isSelected = selectedNotification?.id === notif.id;
                    const meta = getTypeMeta(notif.type);

                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => handleSelectNotification(notif)}
                        className={`w-full text-left p-4 sm:p-5 flex items-start gap-3.5 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#FAF9F7] dark:bg-[#22211E] ring-1 ring-inset ring-[#966830]/40 dark:ring-[#C89B62]/40"
                            : isUnread
                            ? "bg-[#F4F1EC]/55 dark:bg-[#22211E]/55 hover:bg-[#FAF9F7] dark:hover:bg-[#22211E]"
                            : "hover:bg-[#FAF9F7] dark:hover:bg-[#22211E]"
                        }`}
                      >
                        <div className="w-8 h-8 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] rounded-sm flex items-center justify-center shrink-0 mt-0.5">
                          {meta.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span
                              className={`text-xs text-[#141413] dark:text-[#F3F1EC] truncate ${
                                isUnread ? "font-semibold" : "font-medium"
                              }`}
                            >
                              {notif.title}
                            </span>
                            <span className="font-mono text-[10px] text-[#66625B] dark:text-[#A7A299] tabular-nums shrink-0">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>
                        </div>

                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#966830] dark:bg-[#C89B62] shrink-0 mt-2"
                            aria-label="Unread"
                          />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-10 text-center space-y-2">
                    <p className="text-sm font-medium text-[#141413] dark:text-[#F3F1EC]">
                      No notifications in this view
                    </p>
                    <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                      Switch tabs above to view all client updates.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Detail Inspector */}
              <div
                className={`lg:col-span-7 lg:sticky lg:top-24 space-y-4 ${
                  mobileDetailOpen && selectedNotification ? "block" : "hidden lg:block"
                }`}
              >
                {mobileDetailOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDetailOpen(false);
                      setSearchParams({}, { replace: true });
                    }}
                    className="lg:hidden min-h-[42px] inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All Notifications</span>
                  </button>
                )}

                {selectedNotification ? (
                  renderDetailInspector(selectedNotification)
                ) : (
                  <div className="p-12 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm text-center">
                    <p className="text-sm text-[#66625B] dark:text-[#A7A299]">
                      Select any alert from the list to inspect full dispatch details.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
