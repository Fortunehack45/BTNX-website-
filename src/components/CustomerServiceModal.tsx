import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Check,
  Copy,
  Send,
  ChevronDown,
  ChevronUp,
  Headphones,
  Clock,
} from "lucide-react";
import { modalBackdropVariants, modalPanelVariants } from "../utils/motion";

interface CustomerServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  userEmail?: string;
  userName?: string;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

const SUPPORT_TOPICS = [
  "Order & Delivery Status",
  "Delivery Address Update",
  "Size Exchange or Return",
  "Garment Sizing & Fit Advice",
  "Promo Code or Payment Inquiry",
] as const;

const FAQ_ITEMS = [
  {
    q: "How long does nationwide delivery take from Osun?",
    a: "Orders placed at BTNX Store are inspected, packed, and dispatched from our Osogbo hub within 24 hours. Deliveries within Osun and South-West states arrive in 1 to 2 business days, while nationwide express deliveries across Nigeria arrive within 2 to 4 business days.",
  },
  {
    q: "Can I update my shipping address after placing an order?",
    a: "Yes. As long as your shipment is still in the 'Order Confirmed' or 'Inspected & Packed' stage at our Osun store, our dispatch team can update your destination address immediately. Submit an Address Update request here with your Order ID.",
  },
  {
    q: "How do size exchanges and returns work?",
    a: "We offer free size exchanges and returns within 14 days of delivery on unworn pieces with original tags intact. Select 'Size Exchange or Return' and include your Order ID to receive a prepaid return label.",
  },
  {
    q: "What if my promo code or payment didn't go through?",
    a: "Promotional codes such as BTNX50 apply to eligible seasonal items and are limited to one code per order. If you experienced a payment interruption, reach out with your email and our support desk will verify your transaction.",
  },
];

export default function CustomerServiceModal({
  isOpen,
  onClose,
  initialOrderId = "",
  userEmail = "",
  userName = "",
  onAddToast,
}: CustomerServiceModalProps) {
  const [activeView, setActiveView] = useState<"contact" | "faq">("contact");
  const [topic, setTopic] = useState<string>(SUPPORT_TOPICS[0]);
  const [orderRef, setOrderRef] = useState(initialOrderId);
  const [email, setEmail] = useState(userEmail);
  const [name, setName] = useState(userName);
  const [message, setMessage] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    if (isOpen) {
      setOrderRef(initialOrderId || "");
      if (userEmail) setEmail(userEmail);
      if (userName) setName(userName);
      setTicketId(null);
    }
  }, [isOpen, initialOrderId, userEmail, userName]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(label);
    onAddToast(`${label} copied to clipboard.`, "success");
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      onAddToast("Please provide your email and message.", "error");
      return;
    }
    const generatedTicket = `CS-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(generatedTicket);
    setMessage("");
    onAddToast(`Support request ${generatedTicket} received.`, "success");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={modalBackdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 z-[75] bg-[#141413]/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      >
        <motion.div
          variants={modalPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] rounded-sm max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[#141413] dark:text-[#F3F1EC] shadow-[0_24px_64px_-12px_rgba(20,20,19,0.3)] dark:shadow-[0_28px_70px_-12px_rgba(0,0,0,0.9)]"
          id="customer-service-modal"
        >
          {/* Header */}
          <div className="px-5 sm:px-7 py-5 border-b border-[#E6E2DA] dark:border-[#2C2A26] flex items-start justify-between gap-4 shrink-0 bg-white dark:bg-[#191816]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium">
                <Headphones className="w-3.5 h-3.5" />
                <span>BTNX Client Care · Osun &amp; Nationwide</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                Customer Service &amp; Support
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-sm text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E] transition-colors cursor-pointer"
              aria-label="Close customer service window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="px-5 sm:px-7 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveView("contact")}
                className={`relative py-3 text-xs font-medium uppercase tracking-[0.14em] transition-colors cursor-pointer whitespace-nowrap ${
                  activeView === "contact"
                    ? "text-[#141413] dark:text-[#F3F1EC]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                }`}
              >
                Contact Support
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#141413] dark:bg-[#F3F1EC] transition-opacity ${
                    activeView === "contact" ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setActiveView("faq")}
                className={`relative py-3 text-xs font-medium uppercase tracking-[0.14em] transition-colors cursor-pointer whitespace-nowrap ${
                  activeView === "faq"
                    ? "text-[#141413] dark:text-[#F3F1EC]"
                    : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                }`}
              >
                Delivery &amp; Order FAQs
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#141413] dark:bg-[#F3F1EC] transition-opacity ${
                    activeView === "faq" ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-[#66625B] dark:text-[#A7A299]">
              <Clock className="w-3 h-3" />
              <span>Response &lt; 2 hrs</span>
            </span>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-[#191816]">
            {activeView === "contact" ? (
              <>
                {ticketId ? (
                  <div className="p-6 border border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] space-y-4 text-center">
                    <div className="w-10 h-10 border border-[#141413] dark:border-[#F3F1EC] flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-[#141413] dark:text-[#F3F1EC]" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium block">
                        Support Ticket Logged
                      </span>
                      <h3 className="font-display text-2xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                        Reference #{ticketId}
                      </h3>
                      <p className="text-xs text-[#66625B] dark:text-[#A7A299] max-w-md mx-auto leading-relaxed">
                        Our Osun client care team has received your inquiry
                        {orderRef ? ` regarding Order #${orderRef}` : ""} and will reply to{" "}
                        <span className="font-mono text-[#141413] dark:text-[#F3F1EC]">{email}</span>{" "}
                        shortly.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setTicketId(null)}
                        className="h-9 px-4 border border-[#E6E2DA] dark:border-[#2C2A26] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                      >
                        Send Another Message
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="h-9 px-5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Inquiry Topic
                        </label>
                        <select
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] text-xs sm:text-sm text-[#141413] dark:text-[#F3F1EC] outline-none"
                        >
                          {SUPPORT_TOPICS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Order ID / Tracking Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={orderRef}
                          onChange={(e) => setOrderRef(e.target.value)}
                          placeholder="e.g. BX-849201 or TRK-849201"
                          className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] text-xs sm:text-sm font-mono text-[#141413] dark:text-[#F3F1EC] placeholder:font-sans placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full name"
                          className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] text-xs sm:text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                          Reply Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] text-xs sm:text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                        How can we help?
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Share details about your shipment, delivery address update, or exchange request..."
                        className="w-full p-3 bg-[#FAF9F7] dark:bg-[#22211E] border border-[#E6E2DA] dark:border-[#2C2A26] focus:border-[#141413] dark:focus:border-[#F3F1EC] text-xs sm:text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="submit"
                        className="h-10 px-6 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:opacity-85 text-xs font-medium uppercase tracking-[0.14em] inline-flex items-center gap-2 transition-opacity cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Direct Channels Strip */}
                <div className="pt-5 border-t border-[#E6E2DA] dark:border-[#2C2A26] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      <span>Email Desk</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href="mailto:hello@btnx.store"
                        className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC] hover:underline"
                      >
                        hello@btnx.store
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy("hello@btnx.store", "Support email")}
                        className="text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                        title="Copy email"
                      >
                        {copiedField === "Support email" ? (
                          <Check className="w-3 h-3 text-[#966830] dark:text-[#C89B62]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      <span>Dispatch Line</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
                        +234 810 492 0194
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy("+2348104920194", "Dispatch phone")}
                        className="text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                        title="Copy phone number"
                      >
                        {copiedField === "Dispatch phone" ? (
                          <Check className="w-3 h-3 text-[#966830] dark:text-[#C89B62]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      <span>Store &amp; Hub</span>
                    </span>
                    <p className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
                      Osogbo, Osun · Mon–Sat
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] border-t border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                {FAQ_ITEMS.map((item, idx) => {
                  const isExpanded = openFaqIdx === idx;
                  return (
                    <div key={item.q} className="py-4">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIdx(isExpanded ? null : idx)}
                        className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                      >
                        <span className="text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC]">
                          {item.q}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#66625B] dark:text-[#A7A299] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#66625B] dark:text-[#A7A299] shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed mt-2.5 pr-6">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
