import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Headphones,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  User,
  ShoppingBag,
  Package,
  Clock,
  RefreshCw,
  Tag,
  Paperclip,
  Check,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Shield,
  Bot,
  UserCheck,
  ArrowLeft,
  X,
  FileText,
} from "lucide-react";
import BrandLogo from "../../src/components/BrandLogo";
import { db, auth } from "../../src/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  SupportTicket,
  SupportMessage,
  SupportAttachmentOrder,
  SupportAttachmentProduct,
  compressImageFile,
} from "../../src/utils/supportStore";
import { formatNaira } from "../../src/utils/currency";
import { Order, Product } from "../../src/types";
import { NEW_YEAR_PRODUCTS } from "../../src/data";

const CANNED_REPLIES = [
  {
    label: "Shipping Delay Notice",
    text: "Hello! We are currently checking with our courier dispatch regarding your parcel. You will receive an updated tracking timeline shortly.",
  },
  {
    label: "Size Exchange Approved",
    text: "Your complimentary size exchange request has been approved. Our courier will deliver your replacement size and collect the original unworn piece simultaneously.",
  },
  {
    label: "Payment & Voucher Verified",
    text: "I have verified your payment reference and applied your promotional discount. Your official invoice has been updated in your account dossier.",
  },
  {
    label: "Address Update Confirmed",
    text: "Your delivery address has been successfully updated on our logistics dispatch board. The package will be routed to your new destination.",
  },
];

export default function SupportStaffPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetTicketId = searchParams.get("ticket") || searchParams.get("order");

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "human" | "open" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [agentName, setAgentName] = useState(() => {
    try {
      return localStorage.getItem("btnx_agent_name") || "Adaobi N. (Care Desk)";
    } catch {
      return "Adaobi N. (Care Desk)";
    }
  });
  const [isSending, setIsSending] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Attachment Drawers
  const [drawerType, setDrawerType] = useState<"none" | "order" | "product" | "photo">("none");
  const [orderInputId, setOrderInputId] = useState("");
  const [availableProducts, setAvailableProducts] = useState<Product[]>(NEW_YEAR_PRODUCTS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Real-time Firestore tickets subscription
  useEffect(() => {
    try {
      const q = query(collection(db, "supportTickets"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched = snapshot.docs.map((d) => d.data() as SupportTicket);
            fetched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setTickets(fetched);
          } else {
            // Check localStorage fallback
            try {
              const local = localStorage.getItem("btnx_support_tickets_v1");
              if (local) setTickets(JSON.parse(local));
            } catch {}
          }
        },
        () => {
          // Offline/fallback
          try {
            const local = localStorage.getItem("btnx_support_tickets_v1");
            if (local) setTickets(JSON.parse(local));
          } catch {}
        }
      );
      return () => unsubscribe();
    } catch {
      // ignore
    }
  }, []);

  // Fetch products for recommendations
  useEffect(() => {
    try {
      const q = query(collection(db, "products"));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setAvailableProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
        }
      });
      return () => unsub();
    } catch {}
  }, []);

  // Set selected ticket on load or when query param changes
  useEffect(() => {
    if (tickets.length > 0) {
      if (targetTicketId) {
        const found = tickets.find((t) => t.id === targetTicketId || t.orderId === targetTicketId);
        if (found) {
          setSelectedTicketId(found.id);
          return;
        }
      }
      if (!selectedTicketId) {
        setSelectedTicketId(tickets[0].id);
      }
    }
  }, [tickets, targetTicketId]);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicketId, tickets]);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  // Filtered ticket queue
  const filteredTickets = tickets.filter((t) => {
    if (filterMode === "human") {
      if (t.status === "resolved" || (t.mode !== "human" && t.status !== "pending_human")) return false;
    } else if (filterMode === "open") {
      if (t.status === "resolved") return false;
    } else if (filterMode === "resolved") {
      if (t.status !== "resolved") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (t.userName || "").toLowerCase().includes(q);
      const matchEmail = (t.userEmail || "").toLowerCase().includes(q);
      const matchId = (t.id || "").toLowerCase().includes(q);
      const matchOrder = (t.orderId || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchId || matchOrder;
    }

    return true;
  });

  const humanPendingCount = tickets.filter(
    (t) => t.status !== "resolved" && (t.mode === "human" || t.status === "pending_human")
  ).length;

  const handleSendAgentReply = async (
    customText?: string,
    attachment?: {
      order?: SupportAttachmentOrder;
      product?: SupportAttachmentProduct;
      images?: string[];
    }
  ) => {
    if (!selectedTicket) return;
    const textToSend = customText || replyText.trim();
    if (!textToSend && !attachment) return;

    setIsSending(true);
    const newMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      sender: "agent",
      senderName: agentName,
      senderRole: "Client Care Specialist",
      text: textToSend,
      createdAt: new Date().toISOString(),
      attachedOrder: attachment?.order,
      attachedProduct: attachment?.product,
      images: attachment?.images,
    };

    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      mode: "human",
      status: "human_active",
      assignedAgent: agentName,
      messages: [...selectedTicket.messages, newMsg],
      updatedAt: new Date().toISOString(),
      unreadByCustomer: true,
      unreadByAdmin: false,
    };

    // Update local state immediately
    setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
    setReplyText("");
    setDrawerType("none");

    // Sync to Firestore
    try {
      await setDoc(doc(db, "supportTickets", updatedTicket.id), updatedTicket);
      showToast("Reply delivered to client.");
    } catch {
      showToast("Saved locally.");
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async (newStatus: "open" | "human_active" | "resolved") => {
    if (!selectedTicket) return;
    const updated: SupportTicket = {
      ...selectedTicket,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    try {
      await updateDoc(doc(db, "supportTickets", updated.id), {
        status: newStatus,
        updatedAt: updated.updatedAt,
      });
      showToast(`Ticket #${updated.id} marked as ${newStatus}.`);
    } catch {}
  };

  const handleToggleMode = async (newMode: "human" | "bot") => {
    if (!selectedTicket) return;
    const updated: SupportTicket = {
      ...selectedTicket,
      mode: newMode,
      status: newMode === "human" ? "human_active" : "open",
      assignedAgent: newMode === "human" ? agentName : undefined,
      updatedAt: new Date().toISOString(),
    };
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    try {
      await updateDoc(doc(db, "supportTickets", updated.id), {
        mode: newMode,
        status: updated.status,
        assignedAgent: updated.assignedAgent || null,
        updatedAt: updated.updatedAt,
      });
      showToast(`Conversation switched to ${newMode === "human" ? "Human Agent" : "Automated Bot"} mode.`);
    } catch {}
  };

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      await handleSendAgentReply("Attached documentation image for reference:", { images: [dataUrl] });
    } catch {
      showToast("Failed to attach image.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] font-sans antialiased flex flex-col">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] px-4 py-2 text-xs font-mono rounded shadow-lg animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Top Staff Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26] px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <a href="/" className="hover:opacity-75 transition-opacity" title="Storefront">
            <BrandLogo className="h-6 w-auto" />
          </a>
          <span className="h-4 w-[1px] bg-[#E6E2DA] dark:bg-[#2C2A26]" />
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]">
            <Headphones className="w-4 h-4 text-[#966830] dark:text-[#C89B62]" />
            <span className="font-semibold">Support Team Desk</span>
            <span className="px-2 py-0.5 text-[9px] font-mono tracking-wider bg-[#F4EFE6] dark:bg-[#2A241A] text-[#966830] dark:text-[#C89B62] rounded-xs font-normal">
              Staff Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-[#66625B] dark:text-[#A7A299] text-[11px] hidden sm:inline">
              Support Agent:
            </span>
            <input
              type="text"
              value={agentName}
              onChange={(e) => {
                setAgentName(e.target.value);
                try {
                  localStorage.setItem("btnx_agent_name", e.target.value);
                } catch {}
              }}
              title="Edit your agent display name"
              className="h-8 px-2.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
            />
          </div>

          <a
            href="/admin"
            className="h-8 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <span>Admin Studio</span>
          </a>

          <a
            href="/"
            className="h-8 px-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 transition-opacity whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Storefront</span>
          </a>
        </div>
      </header>

      {/* Main Workspace: 3-Column Support Console */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMN 1: TICKET QUEUE (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] flex flex-col h-[calc(100vh-100px)] overflow-hidden">
          {/* Queue Filter Bar */}
          <div className="p-3 border-b border-[#E6E2DA] dark:border-[#2C2A26] space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#66625B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by client, email, or order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`py-1.5 text-center border cursor-pointer ${
                  filterMode === "all"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413]"
                    : "border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B]"
                }`}
              >
                All ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("human")}
                className={`py-1.5 text-center border cursor-pointer relative ${
                  filterMode === "human"
                    ? "bg-[#966830] text-white border-[#966830]"
                    : "border-[#E6E2DA] dark:border-[#2C2A26] text-[#966830]"
                }`}
              >
                Human ({humanPendingCount})
                {humanPendingCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#E5484D] absolute -top-1 -right-1" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("open")}
                className={`py-1.5 text-center border cursor-pointer ${
                  filterMode === "open"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413]"
                    : "border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B]"
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("resolved")}
                className={`py-1.5 text-center border cursor-pointer ${
                  filterMode === "resolved"
                    ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413]"
                    : "border-[#E6E2DA] dark:border-[#2C2A26] text-[#66625B]"
                }`}
              >
                Done
              </button>
            </div>
          </div>

          {/* Ticket Cards Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#66625B] space-y-2">
                <MessageSquare className="w-6 h-6 mx-auto opacity-50" />
                <p>No customer tickets in this view.</p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const lastMsg = t.messages[t.messages.length - 1];
                const needsHuman = t.mode === "human" || t.status === "pending_human";

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setSearchParams({ ticket: t.id });
                    }}
                    className={`p-3.5 cursor-pointer transition-colors space-y-1.5 ${
                      isSelected
                        ? "bg-[#FAF9F7] dark:bg-[#201F1D] border-l-2 border-l-[#966830]"
                        : "hover:bg-[#FAF9F7]/70 dark:hover:bg-[#201F1D]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-semibold text-[#141413] dark:text-[#F3F1EC]">
                        #{t.id}
                      </span>
                      {needsHuman && t.status !== "resolved" ? (
                        <span className="px-1.5 py-0.5 bg-[#FDF2F2] dark:bg-[#2A1414] text-[#E5484D] font-medium uppercase tracking-wider rounded-xs flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Needs Human
                        </span>
                      ) : t.status === "resolved" ? (
                        <span className="px-1.5 py-0.5 bg-[#EBF5EE] dark:bg-[#132A1C] text-[#1D7A46] font-medium uppercase tracking-wider rounded-xs">
                          Resolved
                        </span>
                      ) : (
                        <span className="text-[#66625B] uppercase">{t.mode}</span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                      {t.userName || "Customer"} · <span className="font-normal text-[#66625B]">{t.userEmail}</span>
                    </p>

                    <p className="text-[11px] text-[#66625B] truncate">
                      {t.subject || t.topic}
                    </p>

                    {lastMsg && (
                      <p className="text-[11px] text-[#8C877D] truncate italic">
                        "{lastMsg.text}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: LIVE CHAT & CONCIERGE THREAD (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] flex flex-col h-[calc(100vh-100px)] overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Conversation Header */}
              <div className="p-3.5 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold truncate text-[#141413] dark:text-[#F3F1EC]">
                      {selectedTicket.userName}
                    </h2>
                    <span className="text-[10px] font-mono text-[#66625B]">
                      (Ticket #{selectedTicket.id})
                    </span>
                  </div>
                  <p className="text-[11px] text-[#966830] dark:text-[#C89B62] truncate">
                    Topic: {selectedTicket.topic}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedTicket.mode === "bot" ? (
                    <button
                      type="button"
                      onClick={() => handleToggleMode("human")}
                      className="h-7 px-2.5 bg-[#966830] text-white text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Take Over</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleMode("bot")}
                      className="h-7 px-2 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Bot className="w-3 h-3" />
                      <span>Pass to Bot</span>
                    </button>
                  )}

                  {selectedTicket.status === "resolved" ? (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus("open")}
                      className="h-7 px-2 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Reopen
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus("resolved")}
                      className="h-7 px-2 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FAF9F7]/40 dark:bg-[#141413]/40">
                {selectedTicket.messages.map((m) => {
                  const isAgent = m.sender === "agent";
                  const isCustomer = m.sender === "customer";
                  const isBot = m.sender === "bot";

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-[#66625B]">
                        <span>{isAgent ? `Staff · ${m.senderName}` : isCustomer ? m.senderName : "BTNX Support Assistant"}</span>
                        <span>·</span>
                        <span>
                          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>

                      <div
                        className={`p-3 max-w-[85%] text-xs leading-relaxed rounded-xs ${
                          isAgent
                            ? "bg-[#141413] text-[#FAF9F7] dark:bg-[#F3F1EC] dark:text-[#141413]"
                            : isCustomer
                            ? "bg-white dark:bg-[#1E1D1A] border border-[#E6E2DA] dark:border-[#2C2A26] text-[#141413] dark:text-[#F3F1EC]"
                            : "bg-[#F4EFE6] dark:bg-[#252019] border border-[#E6D9C5] dark:border-[#382E22] text-[#141413] dark:text-[#F3F1EC]"
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>

                        {/* Attached Order Box */}
                        {m.attachedOrder && (
                          <div className="mt-2.5 p-2 bg-white/10 dark:bg-black/10 border border-current/20 text-[11px] space-y-1">
                            <span className="font-mono font-semibold block">
                              Order #{m.attachedOrder.id} · {m.attachedOrder.status}
                            </span>
                            <span className="block text-[10px] opacity-80">
                              Total: {formatNaira(m.attachedOrder.total)} · {m.attachedOrder.firstItemName}
                            </span>
                          </div>
                        )}

                        {/* Attached Product Card */}
                        {m.attachedProduct && (
                          <div className="mt-2.5 p-2 bg-white/10 dark:bg-black/10 border border-current/20 text-[11px] flex gap-2 items-center">
                            <img
                              src={m.attachedProduct.image}
                              alt={m.attachedProduct.name}
                              className="w-8 h-10 object-cover shrink-0"
                            />
                            <div>
                              <span className="font-medium block">{m.attachedProduct.name}</span>
                              <span className="font-mono text-[10px] block opacity-80">
                                {formatNaira(m.attachedProduct.price)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Attached Images */}
                        {m.images?.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt="Attachment"
                            className="mt-2 max-h-48 rounded-xs object-cover border border-current/20"
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Canned Quick Replies Strip */}
              <div className="px-3 py-2 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex gap-1.5 overflow-x-auto no-scrollbar">
                {CANNED_REPLIES.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(c.text)}
                    className="h-6 px-2.5 text-[10px] font-mono uppercase bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] whitespace-nowrap cursor-pointer"
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Reply Composer Box */}
              <div className="p-3 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAttachImage}
                  className="hidden"
                />

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder={`Reply to ${selectedTicket.userName} as support specialist...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAgentReply();
                      }
                    }}
                    className="flex-1 p-2.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none resize-none"
                  />
                  <button
                    type="button"
                    disabled={isSending || !replyText.trim()}
                    onClick={() => handleSendAgentReply()}
                    className="w-12 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#66625B]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="hover:text-[#141413] dark:hover:text-[#F3F1EC] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerType(drawerType === "product" ? "none" : "product")}
                      className="hover:text-[#141413] dark:hover:text-[#F3F1EC] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Piece</span>
                    </button>
                  </div>
                  <span className="text-[10px] font-mono">Press Enter to send</span>
                </div>

                {/* Product Attachment Drawer */}
                {drawerType === "product" && (
                  <div className="p-2 border border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] max-h-36 overflow-y-auto space-y-1">
                    <p className="text-[10px] font-mono uppercase text-[#966830] mb-1">
                      Click to recommend piece in chat:
                    </p>
                    {availableProducts.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        onClick={() =>
                          handleSendAgentReply(`I recommend our ${p.name} (${formatNaira(p.price)}):`, {
                            product: {
                              id: p.id,
                              name: p.name,
                              category: p.category,
                              price: p.price,
                              image: p.image,
                            },
                          })
                        }
                        className="flex items-center justify-between p-1.5 hover:bg-white dark:hover:bg-[#201F1D] cursor-pointer text-xs"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="font-mono text-[10px] text-[#966830]">{formatNaira(p.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[#66625B] space-y-2">
              <Headphones className="w-8 h-8 opacity-40" />
              <p>Select a customer ticket to begin live support.</p>
            </div>
          )}
        </div>

        {/* COLUMN 3: CUSTOMER DOSSIER & CONTEXT (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          {selectedTicket ? (
            <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-4 space-y-4 text-xs">
              <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#966830] block">
                  Customer Profile Dossier
                </span>
                <h3 className="font-display text-lg font-medium mt-0.5">
                  {selectedTicket.userName}
                </h3>
                <p className="font-mono text-[11px] text-[#66625B]">
                  {selectedTicket.userEmail}
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#66625B] block">
                    Ticket Reference
                  </span>
                  <span className="font-mono font-medium">#{selectedTicket.id}</span>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-[#66625B] block">
                    Current Mode
                  </span>
                  <span className="font-medium capitalize">
                    {selectedTicket.mode === "human" ? "Human Agent Handling" : "Automated AI Bot"}
                  </span>
                </div>

                {selectedTicket.orderId && (
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#66625B] block">
                      Associated Order
                    </span>
                    <a
                      href={`/admin`}
                      className="font-mono text-[#966830] hover:underline inline-flex items-center gap-1"
                    >
                      <span>#{selectedTicket.orderId}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-mono uppercase text-[#66625B] block">
                    Opened On
                  </span>
                  <span className="text-[#66625B]">
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-[11px] space-y-1">
                <span className="font-medium block text-[#141413] dark:text-[#F3F1EC]">
                  Support SLA Protocol:
                </span>
                <p className="text-[#66625B]">
                  All human requests should be acknowledged within 15 minutes. Exchanges and address changes update logistics immediately.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-6 text-center text-xs text-[#66625B]">
              No ticket selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
