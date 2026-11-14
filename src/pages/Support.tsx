import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Headphones,
  Bot,
  UserCheck,
  Send,
  Package,
  ShoppingBag,
  Image as ImageIcon,
  FileText,
  Plus,
  X,
  Check,
  Copy,
  ArrowUpRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Search,
  ZoomIn,
  MessageSquare,
} from "lucide-react";
import { Order, Product, CartItem } from "../types";
import { NEW_YEAR_PRODUCTS } from "../data";
import { formatNaira } from "../utils/currency";
import GalleryImage from "../components/GalleryImage";
import {
  SupportTicket,
  SupportMessage,
  SupportAttachmentOrder,
  SupportAttachmentProduct,
  SupportAttachmentAction,
  SUPPORT_TOPICS,
  subscribeToSupportTickets,
  persistTicket,
  orderToSupportAttachment,
  productToSupportAttachment,
  compressImageFile,
  generateBotReply,
  generateSimulatedHumanAgentReply,
} from "../utils/supportStore";

interface SupportProps {
  orders: Order[];
  cart: CartItem[];
  wishlist: Product[];
  currentUser: any;
  userName?: string;
  userEmail?: string;
  onViewInvoice: (order: Order) => void;
  onOpenProduct: (product: Product) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

const DEMO_FALLBACK_ORDERS: Order[] = [
  {
    id: "BX-849201",
    status: "In Transit",
    date: "12 Nov 2026",
    total: 232500,
    items: [
      {
        product: NEW_YEAR_PRODUCTS[0],
        quantity: 1,
        size: "L",
        color: "Dusty Plum",
      },
      {
        product: NEW_YEAR_PRODUCTS[2],
        quantity: 1,
        size: "L",
        color: "Deep Navy",
      },
    ],
  },
  {
    id: "BX-730419",
    status: "Processing",
    date: "13 Nov 2026",
    total: 185000,
    items: [
      {
        product: NEW_YEAR_PRODUCTS[1],
        quantity: 1,
        size: "M",
        color: "Black",
      },
    ],
  },
];

const SAMPLE_ATTACHMENT_IMAGES = [
  {
    label: "Garment Fit & Tag",
    url: NEW_YEAR_PRODUCTS[0]?.image || "",
  },
  {
    label: "Outerwear Detail",
    url: NEW_YEAR_PRODUCTS[1]?.image || "",
  },
  {
    label: "Knitwear Texture",
    url: NEW_YEAR_PRODUCTS[2]?.image || "",
  },
];

const FAQ_LIST = [
  {
    q: "How does the Bot vs. Human Customer Care work?",
    a: "Every conversation starts with our instant BTNX Automated Concierge Bot, which can inspect orders, log address updates, and answer sizing or promo questions immediately. At any moment, tap 'Speak with Human' (or type 'human' in chat) to connect with a live Human Customer Care Specialist at our Osogbo, Osun desk.",
  },
  {
    q: "How long does nationwide delivery take from Osun?",
    a: "Orders placed at BTNX Store are inspected, packed, and dispatched from our Osogbo hub within 24 hours. Deliveries within Osun and South-West states arrive in 1 to 2 business days, while nationwide express deliveries across Nigeria arrive within 2 to 4 business days.",
  },
  {
    q: "Can I send an order, product, or image directly in chat?",
    a: "Yes. Inside any conversation, use the Order, Product, Photo, or Service buttons directly above the message box to share order cards, garments, multiple photos, or structured exchange/address forms.",
  },
  {
    q: "How do size exchanges and returns work?",
    a: "We offer complimentary size exchanges and returns within 14 days of delivery on unworn pieces with original tags intact. Use the Service button in chat to submit a Size Exchange card or ask a Human Specialist for a prepaid return label.",
  },
];

export default function Support({
  orders,
  cart,
  wishlist,
  currentUser,
  userName = "",
  userEmail = "",
  onOpenProduct,
  onAddToast,
}: SupportProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderParam = searchParams.get("order") || "";
  const activeChatParam = searchParams.get("chat") || "";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string>("");
  const [hubTab, setHubTab] = useState<"chats" | "orders" | "faq">("chats");

  // Composer state
  const [inputText, setInputText] = useState("");
  const [stagedOrder, setStagedOrder] = useState<SupportAttachmentOrder | undefined>(undefined);
  const [stagedProduct, setStagedProduct] = useState<SupportAttachmentProduct | undefined>(undefined);
  const [stagedAction, setStagedAction] = useState<SupportAttachmentAction | undefined>(undefined);
  const [stagedImages, setStagedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Attachment Picker Panels
  const [activePicker, setActivePicker] = useState<
    "none" | "order" | "product" | "image" | "action" | "new_ticket"
  >("none");
  const [customOrderIdInput, setCustomOrderIdInput] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Structured Service Action form state
  const [actionType, setActionType] = useState<"address_update" | "size_exchange" | "payment_verify">(
    "address_update"
  );
  const [actionOrderId, setActionOrderId] = useState(initialOrderParam || "BX-849201");
  const [actionField1, setActionField1] = useState("");
  const [actionField2, setActionField2] = useState("");
  const [actionNotes, setActionNotes] = useState("");

  // New Ticket Drawer state
  const [newTopic, setNewTopic] = useState<string>(SUPPORT_TOPICS[0]);
  const [newSubject, setNewSubject] = useState("");

  // Typing simulation indicator
  const [typingResponder, setTypingResponder] = useState<string | null>(null);

  // Lightbox image preview
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayOrders = orders.length > 0 ? orders : DEMO_FALLBACK_ORDERS;
  const clientDisplayName =
    userName || currentUser?.displayName || currentUser?.email?.split("@")[0] || "BTNX Client";
  const clientDisplayEmail = userEmail || currentUser?.email || "client@btnx.store";
  const clientUid = currentUser?.uid || "guest";

  useEffect(() => {
    const unsub = subscribeToSupportTickets((loaded) => {
      setTickets(loaded);
      setActiveTicketId((prev) => {
        if (activeChatParam && loaded.some((t) => t.id === activeChatParam)) {
          return activeChatParam;
        }
        if (prev && loaded.some((t) => t.id === prev)) return prev;
        return loaded[0]?.id || "";
      });
    });
    return unsub;
  }, [activeChatParam]);

  const openChatPage = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setActivePicker("none");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("chat", ticketId);
      return next;
    });
    window.scrollTo(0, 0);
  };

  const closeChatPageToHub = () => {
    setActivePicker("none");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("chat");
      next.delete("order");
      return next;
    });
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!initialOrderParam || tickets.length === 0) return;
    const cleanOrder = initialOrderParam.trim();
    const matchedOrder = displayOrders.find(
      (o) => o.id.toLowerCase() === cleanOrder.toLowerCase()
    );
    if (matchedOrder) {
      setStagedOrder(orderToSupportAttachment(matchedOrder));
    } else {
      setStagedOrder({
        id: cleanOrder.toUpperCase(),
        status: "Confirmed",
        total: 185000,
        date: "Recent",
        itemCount: 1,
        firstItemName: "BTNX Seasonal Piece",
        firstItemImage: NEW_YEAR_PRODUCTS[0]?.image,
      });
    }
    const existingForOrder =
      tickets.find((t) => t.orderId?.toLowerCase() === cleanOrder.toLowerCase()) || tickets[0];
    if (existingForOrder && !activeChatParam) {
      setActiveTicketId(existingForOrder.id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("chat", existingForOrder.id);
          return next;
        },
        { replace: true }
      );
    }
  }, [initialOrderParam, tickets.length]);

  const activeTicket =
    tickets.find((t) => t.id === (activeChatParam || activeTicketId)) ||
    tickets[0] ||
    null;

  const isChatPageOpen = Boolean(activeChatParam && activeTicket);

  useEffect(() => {
    if (isChatPageOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isChatPageOpen, activeTicket?.messages.length, typingResponder]);

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(label);
    onAddToast(`${label} copied to clipboard.`, "success");
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleCreateNewTicket = async (
    topicOverride?: string,
    subjectOverride?: string,
    attachedOrderInit?: SupportAttachmentOrder
  ) => {
    const chosenTopic = topicOverride || newTopic || SUPPORT_TOPICS[0];
    const chosenSubject =
      subjectOverride?.trim() ||
      newSubject.trim() ||
      (attachedOrderInit
        ? `${chosenTopic} · Order #${attachedOrderInit.id}`
        : chosenTopic);

    const newId = `CS-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();

    const welcomeMsg: SupportMessage = {
      id: `msg-${Date.now()}-welcome`,
      sender: "bot",
      senderName: "BTNX Concierge Bot",
      senderRole: "Automated Concierge",
      text: `Hello ${
        clientDisplayName.split(" ")[0]
      }. Welcome to BTNX Client Care regarding "${chosenSubject}". Attach an order, product, or photo below—or select Speak with Human anytime to reach our Osun desk.`,
      createdAt: nowIso,
      quickReplies: [
        "Check my order status",
        "Update delivery address",
        "Start a size exchange",
        "Speak with a human agent",
      ],
    };

    const newTicket: SupportTicket = {
      id: newId,
      userId: clientUid,
      userEmail: clientDisplayEmail,
      userName: clientDisplayName,
      subject: chosenSubject,
      topic: chosenTopic,
      orderId: attachedOrderInit?.id || stagedOrder?.id || undefined,
      status: "open",
      mode: "bot",
      messages: [welcomeMsg],
      createdAt: nowIso,
      updatedAt: nowIso,
      unreadByAdmin: false,
      unreadByCustomer: false,
    };

    if (attachedOrderInit) {
      setStagedOrder(attachedOrderInit);
    }

    await persistTicket(newTicket);
    setNewSubject("");
    setActivePicker("none");
    onAddToast(`Opened conversation #${newId}.`, "success");
    openChatPage(newTicket.id);
  };

  const handleEscalateToHuman = async (reasonText?: string) => {
    if (!activeTicket) return;
    if (activeTicket.mode === "human" && activeTicket.status === "human_active") {
      onAddToast("You are already connected with a Human Customer Care Specialist.", "info");
      return;
    }

    const nowIso = new Date().toISOString();
    const systemMsg: SupportMessage = {
      id: `msg-${Date.now()}-sys`,
      sender: "system",
      senderName: "System",
      text: "Connecting with Human Customer Care · Osogbo, Osun Desk",
      createdAt: nowIso,
    };

    const updatedTicket: SupportTicket = {
      ...activeTicket,
      mode: "human",
      status: "human_active",
      assignedAgent: "Adaobi N. · Osun Client Care",
      updatedAt: nowIso,
      unreadByAdmin: true,
      messages: [...activeTicket.messages, systemMsg],
    };

    await persistTicket(updatedTicket);
    onAddToast("Connected to Human Customer Care Specialist.", "success");

    setTypingResponder("Adaobi N.");
    setTimeout(async () => {
      const greetingIso = new Date().toISOString();
      const agentGreeting: SupportMessage = {
        id: `msg-${Date.now()}-agent`,
        sender: "agent",
        senderName: "Adaobi N.",
        senderRole: "Human Care · Osun",
        text: `Hello ${
          clientDisplayName.split(" ")[0]
        }, I am Adaobi from BTNX Client Care in Osogbo. I have taken over this conversation${
          activeTicket.orderId ? ` and pulled up Order #${activeTicket.orderId}` : ""
        }.${
          reasonText ? ` Regarding "${reasonText}" — ` : " "
        }Share any details, order cards, or photos you'd like me to inspect.`,
        createdAt: greetingIso,
        quickReplies: [
          "Check dispatch rider status",
          "Update my delivery address",
          "Inspect my uploaded photo",
        ],
      };

      const withGreeting: SupportTicket = {
        ...updatedTicket,
        updatedAt: greetingIso,
        messages: [...updatedTicket.messages, agentGreeting],
      };
      await persistTicket(withGreeting);
      setTypingResponder(null);
    }, 1050);
  };

  const handleSwitchBackToBot = async () => {
    if (!activeTicket) return;
    const nowIso = new Date().toISOString();
    const sysMsg: SupportMessage = {
      id: `msg-${Date.now()}-botmode`,
      sender: "system",
      senderName: "System",
      text: "Switched to BTNX Automated Concierge",
      createdAt: nowIso,
    };
    const updated: SupportTicket = {
      ...activeTicket,
      mode: "bot",
      status: "open",
      updatedAt: nowIso,
      messages: [...activeTicket.messages, sysMsg],
    };
    await persistTicket(updated);
    onAddToast("Switched to Automated Concierge.", "info");
  };

  const handleMarkResolved = async () => {
    if (!activeTicket) return;
    const nowIso = new Date().toISOString();
    const sysMsg: SupportMessage = {
      id: `msg-${Date.now()}-resolved`,
      sender: "system",
      senderName: "System",
      text: "Conversation marked as Resolved",
      createdAt: nowIso,
    };
    const updated: SupportTicket = {
      ...activeTicket,
      status: "resolved",
      updatedAt: nowIso,
      messages: [...activeTicket.messages, sysMsg],
    };
    await persistTicket(updated);
    onAddToast(`Thread #${activeTicket.id} resolved.`, "success");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < Math.min(files.length, 4); i++) {
        const dataUrl = await compressImageFile(files[i]);
        uploaded.push(dataUrl);
      }
      setStagedImages((prev) => [...prev, ...uploaded].slice(0, 4));
      setActivePicker("none");
      onAddToast(
        `Attached ${uploaded.length} ${uploaded.length === 1 ? "image" : "images"} ready to send.`,
        "success"
      );
    } catch {
      onAddToast("Could not process the selected image.", "error");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStageActionCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionType === "address_update") {
      if (!actionField1.trim()) {
        onAddToast("Please enter the updated street and city address.", "error");
        return;
      }
      setStagedAction({
        actionType: "address_update",
        title: "Delivery Address Update",
        details: {
          orderId: actionOrderId || "BX-849201",
          newAddress: actionField1.trim(),
          recipientPhone: actionField2.trim() || "+234 810 492 0194",
          notes: actionNotes.trim() || "Please update dispatch manifest.",
        },
        status: "pending",
      });
    } else if (actionType === "size_exchange") {
      setStagedAction({
        actionType: "size_exchange",
        title: "14-Day Size Exchange",
        details: {
          orderId: actionOrderId || "BX-849201",
          item: actionField1.trim() || NEW_YEAR_PRODUCTS[0].name,
          fromSize: "M",
          toSize: actionField2.trim() || "L",
          notes: actionNotes.trim() || "Unworn with original tags attached.",
        },
        status: "pending",
      });
    } else {
      setStagedAction({
        actionType: "payment_verify",
        title: "Payment Verification",
        details: {
          orderId: actionOrderId || "Pending Checkout",
          reference: actionField1.trim() || "PAY-BTNX-90421",
          promoCode: actionField2.trim() || "BTNX50",
          notes: actionNotes.trim() || "Please verify transaction status.",
        },
        status: "pending",
      });
    }
    setActivePicker("none");
    setActionField1("");
    setActionField2("");
    setActionNotes("");
    onAddToast("Request card attached to message bar.", "success");
  };

  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = (overrideText !== undefined ? overrideText : inputText).trim();
    const hasAttachments =
      Boolean(stagedOrder) ||
      Boolean(stagedProduct) ||
      Boolean(stagedAction) ||
      stagedImages.length > 0;

    if (!textToSend && !hasAttachments) return;
    if (!activeTicket) return;

    const nowIso = new Date().toISOString();
    const fallbackText =
      textToSend ||
      (stagedOrder
        ? `Sharing Order #${stagedOrder.id} for assistance.`
        : stagedProduct
        ? `Asking about "${stagedProduct.name}".`
        : stagedAction
        ? `Submitted ${stagedAction.title}.`
        : `Attached ${stagedImages.length} ${stagedImages.length === 1 ? "image" : "images"}.`);

    const customerMsg: SupportMessage = {
      id: `msg-${Date.now()}-cust`,
      sender: "customer",
      senderName: clientDisplayName,
      text: fallbackText,
      createdAt: nowIso,
      images: stagedImages.length > 0 ? [...stagedImages] : undefined,
      attachedOrder: stagedOrder,
      attachedProduct: stagedProduct,
      attachedAction: stagedAction,
    };

    const currentOrderAttachment = stagedOrder;
    const currentProductAttachment = stagedProduct;
    const currentActionAttachment = stagedAction;
    const currentImages = [...stagedImages];

    if (overrideText === undefined) setInputText("");
    setStagedOrder(undefined);
    setStagedProduct(undefined);
    setStagedAction(undefined);
    setStagedImages([]);
    setActivePicker("none");

    const updatedTicket: SupportTicket = {
      ...activeTicket,
      orderId: currentOrderAttachment?.id || activeTicket.orderId,
      status: activeTicket.status === "resolved" ? "open" : activeTicket.status,
      updatedAt: nowIso,
      unreadByAdmin: true,
      messages: [...activeTicket.messages, customerMsg],
    };

    await persistTicket(updatedTicket);

    if (updatedTicket.mode === "bot") {
      setTypingResponder("BTNX Concierge Bot");
      const botOutcome = generateBotReply({
        userText: fallbackText,
        attachedOrder: currentOrderAttachment,
        attachedProduct: currentProductAttachment,
        attachedAction: currentActionAttachment,
        images: currentImages,
        availableOrders: displayOrders,
      });

      setTimeout(async () => {
        const replyIso = new Date().toISOString();
        const botMsg: SupportMessage = {
          id: `msg-${Date.now()}-bot`,
          sender: "bot",
          senderName: "BTNX Concierge Bot",
          senderRole: "Automated Concierge",
          text: botOutcome.replyText,
          createdAt: replyIso,
          suggestHumanTransfer: botOutcome.suggestHumanTransfer,
          quickReplies: botOutcome.quickReplies,
        };

        const nextMessages = [...updatedTicket.messages, botMsg];
        let nextMode = updatedTicket.mode;
        let nextStatus = updatedTicket.status;
        let nextAgent = updatedTicket.assignedAgent;

        if (botOutcome.shouldEscalateToHuman) {
          nextMode = "human";
          nextStatus = "human_active";
          nextAgent = "Adaobi N. · Osun Client Care";
          nextMessages.push({
            id: `msg-${Date.now()}-handoff`,
            sender: "system",
            senderName: "System",
            text: "Transferred to Human Customer Care · Adaobi N. (Osogbo Hub)",
            createdAt: replyIso,
          });
        }

        const afterBotTicket: SupportTicket = {
          ...updatedTicket,
          mode: nextMode,
          status: nextStatus,
          assignedAgent: nextAgent,
          updatedAt: replyIso,
          messages: nextMessages,
        };

        await persistTicket(afterBotTicket);
        setTypingResponder(null);
      }, 650);
    } else {
      setTypingResponder("Adaobi N.");
      setTimeout(async () => {
        const replyIso = new Date().toISOString();
        const humanText = generateSimulatedHumanAgentReply({
          customerName: clientDisplayName,
          userText: fallbackText,
          attachedOrder: currentOrderAttachment,
          attachedProduct: currentProductAttachment,
          attachedAction: currentActionAttachment,
          images: currentImages,
        });

        const humanMsg: SupportMessage = {
          id: `msg-${Date.now()}-human`,
          sender: "agent",
          senderName: "Adaobi N.",
          senderRole: "Human Care · Osun",
          text: humanText,
          createdAt: replyIso,
        };

        const afterHumanTicket: SupportTicket = {
          ...updatedTicket,
          status: "human_active",
          updatedAt: replyIso,
          messages: [...updatedTicket.messages, humanMsg],
        };
        await persistTicket(afterHumanTicket);
        setTypingResponder(null);
      }, 1150);
    }
  };

  const catalogOptions = [
    ...cart.map((c) => c.product),
    ...wishlist,
    ...NEW_YEAR_PRODUCTS,
  ]
    .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
    .filter(
      (p) =>
        !productSearch.trim() ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase())
    );

  // ============================================================================
  // PAGE 2: DEDICATED LIVE CHAT PAGE (Simple, Editorial, Clean & Neat)
  // ============================================================================
  if (isChatPageOpen && activeTicket) {
    return (
      <section
        id="customer-service-chat-page"
        className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 flex-1 flex flex-col py-3 sm:py-6"
      >
        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] min-h-[calc(100dvh-82px)] lg:min-h-[calc(100dvh-120px)] max-h-[calc(100dvh-82px)] lg:max-h-[calc(100dvh-120px)] overflow-hidden">
          {/* Clean Single-Row Editorial Chat Header */}
          <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={closeChatPageToHub}
                aria-label="Back to all threads"
                className="h-8 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[10px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Threads</span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] truncate">
                  <span className="text-[#141413] dark:text-[#F3F1EC] font-medium">
                    #{activeTicket.id}
                  </span>
                  <span>·</span>
                  <span
                    className={
                      activeTicket.mode === "human"
                        ? "text-[#966830] dark:text-[#C89B62]"
                        : ""
                    }
                  >
                    {activeTicket.mode === "human"
                      ? activeTicket.assignedAgent || "Human Specialist"
                      : "Bot Concierge"}
                  </span>
                  {activeTicket.orderId && (
                    <>
                      <span>·</span>
                      <a
                        href={`/track?order=${encodeURIComponent(activeTicket.orderId)}`}
                        className="text-[#966830] dark:text-[#C89B62] hover:underline"
                      >
                        #{activeTicket.orderId}
                      </a>
                    </>
                  )}
                </div>

                <h1 className="font-display text-lg sm:text-xl font-medium text-[#141413] dark:text-[#F3F1EC] truncate leading-tight mt-0.5">
                  {activeTicket.subject}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeTicket.mode === "bot" ? (
                <button
                  type="button"
                  onClick={() => handleEscalateToHuman()}
                  id="escalate-human-btn"
                  className="h-8 px-3 bg-[#966830] dark:bg-[#C89B62] text-white dark:text-[#141413] hover:opacity-90 text-[10px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 transition-opacity cursor-pointer whitespace-nowrap"
                >
                  <Headphones className="w-3 h-3 shrink-0" />
                  <span className="sm:hidden">Human</span>
                  <span className="hidden sm:inline">Speak with Human</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSwitchBackToBot}
                    className="h-8 px-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[10px] font-medium uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Bot className="w-3 h-3" />
                    <span>Bot</span>
                  </button>
                  {activeTicket.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={handleMarkResolved}
                      className="h-8 px-2.5 border border-[#141413] dark:border-[#F3F1EC] text-[10px] font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Resolve</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Scrollable Editorial Message Stream */}
          <div className="flex-1 px-3.5 sm:px-6 py-5 space-y-5 overflow-y-auto overscroll-contain bg-[#FAF9F7]/40 dark:bg-[#111110]/40">
            {activeTicket.messages.map((msg) => {
              if (msg.sender === "system") {
                return (
                  <div
                    key={msg.id}
                    className="py-2 border-y border-[#E6E2DA] dark:border-[#2C2A26] text-center"
                  >
                    <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62]">
                      {msg.text.replace(/& Admin Portal/gi, "")}
                    </p>
                  </div>
                );
              }

              const isCustomer = msg.sender === "customer";
              const isHumanAgent = msg.sender === "agent";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isCustomer ? "items-end" : "items-start"
                  } space-y-1.5`}
                >
                  {/* Quiet Metadata Line */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-[#66625B] dark:text-[#A7A299]">
                    <span className="font-medium text-[#141413] dark:text-[#F3F1EC]">
                      {isCustomer ? "You" : msg.senderName}
                    </span>
                    {msg.senderRole && (
                      <>
                        <span>·</span>
                        <span
                          className={
                            isHumanAgent ? "text-[#966830] dark:text-[#C89B62]" : ""
                          }
                        >
                          {msg.senderRole}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span className="tabular-nums">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Crisp Architectural Message Box */}
                  <div
                    className={`max-w-[90%] sm:max-w-lg px-4 py-3 border space-y-3 ${
                      isCustomer
                        ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413] dark:border-[#F3F1EC]"
                        : isHumanAgent
                        ? "bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] border-[#966830]/50 dark:border-[#C89B62]/50"
                        : "bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] border-[#E6E2DA] dark:border-[#2C2A26]"
                    }`}
                  >
                    {/* Attached Order Card */}
                    {msg.attachedOrder && (
                      <div
                        className={`p-2.5 border flex items-center justify-between gap-3 ${
                          isCustomer
                            ? "bg-[#1F1E1B] dark:bg-[#FAF9F7] text-[#F3F1EC] dark:text-[#141413] border-white/15 dark:border-[#E6E2DA]"
                            : "bg-[#FAF9F7] dark:bg-[#141413] text-[#141413] dark:text-[#F3F1EC] border-[#E6E2DA] dark:border-[#2C2A26]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {msg.attachedOrder.firstItemImage && (
                            <div className="w-10 h-12 shrink-0 bg-[#F4F1EC] dark:bg-[#2A2824] overflow-hidden">
                              <GalleryImage
                                src={msg.attachedOrder.firstItemImage}
                                alt={msg.attachedOrder.firstItemName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] truncate">
                              Order #{msg.attachedOrder.id}
                            </p>
                            <p className="text-xs font-medium truncate">
                              {msg.attachedOrder.firstItemName}{" "}
                              {msg.attachedOrder.itemCount > 1
                                ? `+ ${msg.attachedOrder.itemCount - 1} more`
                                : ""}
                            </p>
                            <p className="font-mono text-[11px] opacity-75 tabular-nums">
                              {msg.attachedOrder.status} · {formatNaira(msg.attachedOrder.total)}
                            </p>
                          </div>
                        </div>

                        <a
                          href={`/track?order=${encodeURIComponent(msg.attachedOrder.id)}`}
                          className="h-7 px-2.5 border border-current/25 text-[10px] font-mono uppercase tracking-[0.12em] hover:opacity-75 shrink-0 cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Track</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Attached Product Card */}
                    {msg.attachedProduct && (
                      <div
                        className={`p-2.5 border flex items-center justify-between gap-3 ${
                          isCustomer
                            ? "bg-[#1F1E1B] dark:bg-[#FAF9F7] text-[#F3F1EC] dark:text-[#141413] border-white/15 dark:border-[#E6E2DA]"
                            : "bg-[#FAF9F7] dark:bg-[#141413] text-[#141413] dark:text-[#F3F1EC] border-[#E6E2DA] dark:border-[#2C2A26]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-12 shrink-0 bg-[#F4F1EC] dark:bg-[#2A2824] overflow-hidden">
                            <GalleryImage
                              src={msg.attachedProduct.image}
                              alt={msg.attachedProduct.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] block">
                              {msg.attachedProduct.category}
                            </span>
                            <p className="text-xs font-medium truncate">
                              {msg.attachedProduct.name}
                            </p>
                            <p className="font-mono text-[11px] opacity-75 tabular-nums">
                              {formatNaira(msg.attachedProduct.price)}
                              {msg.attachedProduct.selectedSize
                                ? ` · ${msg.attachedProduct.selectedSize}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const found = NEW_YEAR_PRODUCTS.find(
                              (p) => p.id === msg.attachedProduct?.id
                            );
                            if (found) onOpenProduct(found);
                          }}
                          className="h-7 px-2.5 border border-current/25 text-[10px] font-mono uppercase tracking-[0.12em] hover:opacity-75 shrink-0 cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    )}

                    {/* Attached Service Action Card */}
                    {msg.attachedAction && (
                      <div
                        className={`p-2.5 border space-y-1.5 ${
                          isCustomer
                            ? "bg-[#1F1E1B] dark:bg-[#FAF9F7] text-[#F3F1EC] dark:text-[#141413] border-white/15 dark:border-[#E6E2DA]"
                            : "bg-[#FAF9F7] dark:bg-[#141413] text-[#141413] dark:text-[#F3F1EC] border-[#E6E2DA] dark:border-[#2C2A26]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-current/15 pb-1">
                          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] font-medium">
                            {msg.attachedAction.title}
                          </span>
                          <span className="text-[10px] font-mono uppercase opacity-75">
                            {msg.attachedAction.status === "approved" ? "Approved" : "Logged"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                          {Object.entries(msg.attachedAction.details).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="opacity-65 capitalize">
                                {k.replace(/([A-Z])/g, " $1")}:{" "}
                              </span>
                              <span className="font-mono">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attached Image(s) */}
                    {msg.images && msg.images.length > 0 && (
                      <div
                        className={`grid ${
                          msg.images.length === 1
                            ? "grid-cols-1 max-w-[220px] sm:max-w-xs"
                            : "grid-cols-2 max-w-[260px] sm:max-w-sm"
                        } gap-2`}
                      >
                        {msg.images.map((imgSrc, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setLightboxImage(imgSrc)}
                            className="relative group aspect-[4/3] overflow-hidden border border-current/20 bg-[#F4F1EC] dark:bg-[#22211E] cursor-pointer"
                          >
                            <img
                              src={imgSrc}
                              alt={`Attachment ${i + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1.5 right-1.5 p-1 bg-black/65 text-white">
                              <ZoomIn className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Message Text */}
                    <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>

                    {/* Clean Inline Human Transfer Link on Bot Reply */}
                    {msg.sender === "bot" &&
                      msg.suggestHumanTransfer &&
                      activeTicket.mode === "bot" && (
                        <div className="pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#66625B] dark:text-[#A7A299]">
                            Need personal review?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEscalateToHuman(msg.text.slice(0, 50))}
                            className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Speak with Human →</span>
                          </button>
                        </div>
                      )}
                  </div>

                  {/* Clean Hairline Quick Replies */}
                  {!isCustomer && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full sm:flex-wrap pt-0.5">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr}
                          type="button"
                          onClick={() => {
                            if (
                              qr.toLowerCase().includes("human") ||
                              qr.toLowerCase().includes("specialist")
                            ) {
                              handleEscalateToHuman();
                            } else if (qr.toLowerCase().includes("attach my order")) {
                              setActivePicker("order");
                            } else if (qr.toLowerCase().includes("size exchange")) {
                              setActionType("size_exchange");
                              setActivePicker("action");
                            } else if (qr.toLowerCase().includes("delivery address")) {
                              setActionType("address_update");
                              setActivePicker("action");
                            } else {
                              handleSendMessage(qr);
                            }
                          }}
                          className="h-7 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] text-[#141413] dark:text-[#F3F1EC] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {typingResponder && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#66625B] dark:text-[#A7A299] py-1">
                <RefreshCw className="w-3 h-3 animate-spin text-[#966830] dark:text-[#C89B62]" />
                <span>{typingResponder} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Inline Picker Drawers (Sharp Editorial Styling) */}
          {activePicker === "order" && (
            <div className="p-3.5 sm:p-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] space-y-2.5 max-h-[42vh] overflow-y-auto shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC]">
                  Attach Order
                </span>
                <button
                  type="button"
                  onClick={() => setActivePicker("none")}
                  className="p-1 text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {displayOrders.map((ord) => {
                  const att = orderToSupportAttachment(ord);
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => {
                        setStagedOrder(att);
                        setActivePicker("none");
                      }}
                      className="p-2.5 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-left flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-medium text-[#141413] dark:text-[#F3F1EC]">
                          #{ord.id} · {ord.status}
                        </p>
                        <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] truncate">
                          {att.firstItemName}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-[#141413] dark:text-[#F3F1EC] shrink-0 tabular-nums">
                        {formatNaira(ord.total)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customOrderIdInput}
                  onChange={(e) => setCustomOrderIdInput(e.target.value)}
                  placeholder="Or enter Order ID (e.g. BX-849201)"
                  className="flex-1 h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[16px] sm:text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customOrderIdInput.trim()) return;
                    setStagedOrder({
                      id: customOrderIdInput.trim().toUpperCase(),
                      status: "Confirmed",
                      total: 185000,
                      date: "Recent",
                      itemCount: 1,
                      firstItemName: "BTNX Order Reference",
                      firstItemImage: NEW_YEAR_PRODUCTS[0]?.image,
                    });
                    setCustomOrderIdInput("");
                    setActivePicker("none");
                  }}
                  className="h-9 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                >
                  Attach
                </button>
              </div>
            </div>
          )}

          {activePicker === "product" && (
            <div className="p-3.5 sm:p-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] space-y-2.5 max-h-[42vh] overflow-y-auto shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC]">
                  Attach Garment
                </span>
                <button
                  type="button"
                  onClick={() => setActivePicker("none")}
                  className="p-1 text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#66625B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filter pieces..."
                  className="w-full h-9 pl-8 pr-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[16px] sm:text-xs text-[#141413] dark:text-[#F3F1EC] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catalogOptions.slice(0, 8).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setStagedProduct(productToSupportAttachment(prod));
                      setActivePicker("none");
                    }}
                    className="p-2 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-left flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-9 h-11 shrink-0 bg-[#F4F1EC] dark:bg-[#2A2824] overflow-hidden">
                      <GalleryImage
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                        {prod.name}
                      </p>
                      <p className="font-mono text-[11px] text-[#66625B] dark:text-[#A7A299] tabular-nums">
                        {prod.category} · {formatNaira(prod.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activePicker === "image" && (
            <div className="p-3.5 sm:p-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC]">
                  Attach Photo(s)
                </span>
                <button
                  type="button"
                  onClick={() => setActivePicker("none")}
                  className="p-1 text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="h-9 px-3.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{isUploadingImage ? "Processing..." : "Upload Photo(s)"}</span>
                </button>

                {SAMPLE_ATTACHMENT_IMAGES.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      if (!sample.url) return;
                      setStagedImages((prev) => [...prev, sample.url].slice(0, 4));
                      setActivePicker("none");
                    }}
                    className="h-9 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] text-[#141413] dark:text-[#F3F1EC] cursor-pointer"
                  >
                    + {sample.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activePicker === "action" && (
            <form
              onSubmit={handleStageActionCard}
              className="p-3.5 sm:p-4 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] space-y-2.5 max-h-[45vh] overflow-y-auto shrink-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC]">
                  Service Request Card
                </span>
                <button
                  type="button"
                  onClick={() => setActivePicker("none")}
                  className="p-1 text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: "address_update", label: "Address Update" },
                    { id: "size_exchange", label: "Size Exchange" },
                    { id: "payment_verify", label: "Payment Verify" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setActionType(opt.id)}
                    className={`h-8 px-3 text-[10px] font-medium uppercase tracking-[0.12em] border cursor-pointer whitespace-nowrap ${
                      actionType === opt.id
                        ? "bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] border-[#141413] dark:border-[#F3F1EC]"
                        : "bg-white dark:bg-[#191816] text-[#66625B] dark:text-[#A7A299] border-[#E6E2DA] dark:border-[#2C2A26]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={actionOrderId}
                  onChange={(e) => setActionOrderId(e.target.value)}
                  placeholder="Order ID (e.g. BX-849201)"
                  className="h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[16px] sm:text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
                />
                <input
                  type="text"
                  value={actionField1}
                  onChange={(e) => setActionField1(e.target.value)}
                  placeholder={
                    actionType === "address_update"
                      ? "New Street & City"
                      : actionType === "size_exchange"
                      ? "Garment Name"
                      : "Payment Reference"
                  }
                  className="h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[16px] sm:text-xs text-[#141413] dark:text-[#F3F1EC] outline-none"
                />
                <input
                  type="text"
                  value={actionField2}
                  onChange={(e) => setActionField2(e.target.value)}
                  placeholder={
                    actionType === "address_update"
                      ? "Phone (+234...)"
                      : actionType === "size_exchange"
                      ? "Requested Size (e.g. XL)"
                      : "Promo Code (e.g. BTNX50)"
                  }
                  className="h-9 px-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[16px] sm:text-xs text-[#141413] dark:text-[#F3F1EC] outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-8 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] font-medium uppercase tracking-[0.14em] cursor-pointer"
                >
                  Attach Card
                </button>
              </div>
            </form>
          )}

          {/* Staged Attachments Preview Strip */}
          {(stagedOrder ||
            stagedProduct ||
            stagedAction ||
            stagedImages.length > 0) && (
            <div className="px-3.5 sm:px-6 py-2 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#966830] dark:text-[#C89B62] shrink-0">
                Attached:
              </span>

              {stagedOrder && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[11px] shrink-0">
                  <Package className="w-3 h-3 text-[#966830]" />
                  <span className="font-mono">
                    #{stagedOrder.id} ({formatNaira(stagedOrder.total)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setStagedOrder(undefined)}
                    className="text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {stagedProduct && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[11px] shrink-0">
                  <ShoppingBag className="w-3 h-3 text-[#966830]" />
                  <span className="truncate max-w-[150px]">{stagedProduct.name}</span>
                  <button
                    type="button"
                    onClick={() => setStagedProduct(undefined)}
                    className="text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {stagedAction && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[11px] shrink-0">
                  <FileText className="w-3 h-3 text-[#966830]" />
                  <span>{stagedAction.title}</span>
                  <button
                    type="button"
                    onClick={() => setStagedAction(undefined)}
                    className="text-[#66625B] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {stagedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-10 h-10 shrink-0 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] overflow-hidden"
                >
                  <img
                    src={img}
                    alt="Staged upload"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setStagedImages((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute top-0 right-0 bg-black/75 text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Clean, Non-Chunky Bottom Composer */}
          <div className="px-3.5 sm:px-6 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] space-y-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Minimal Single-Row Attachment Links */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar text-[10px] font-medium uppercase tracking-[0.12em]">
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setActivePicker(activePicker === "order" ? "none" : "order")
                  }
                  className={`inline-flex items-center gap-1 py-1 cursor-pointer whitespace-nowrap transition-colors ${
                    activePicker === "order" || stagedOrder
                      ? "text-[#966830] dark:text-[#C89B62] underline underline-offset-4"
                      : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                  }`}
                >
                  <Package className="w-3 h-3" />
                  <span>Order</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActivePicker(activePicker === "product" ? "none" : "product")
                  }
                  className={`inline-flex items-center gap-1 py-1 cursor-pointer whitespace-nowrap transition-colors ${
                    activePicker === "product" || stagedProduct
                      ? "text-[#966830] dark:text-[#C89B62] underline underline-offset-4"
                      : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                  }`}
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>Product</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActivePicker(activePicker === "image" ? "none" : "image")
                  }
                  className={`inline-flex items-center gap-1 py-1 cursor-pointer whitespace-nowrap transition-colors ${
                    activePicker === "image" || stagedImages.length > 0
                      ? "text-[#966830] dark:text-[#C89B62] underline underline-offset-4"
                      : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>
                    Image(s){stagedImages.length > 0 ? ` (${stagedImages.length})` : ""}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActivePicker(activePicker === "action" ? "none" : "action")
                  }
                  className={`inline-flex items-center gap-1 py-1 cursor-pointer whitespace-nowrap transition-colors ${
                    activePicker === "action" || stagedAction
                      ? "text-[#966830] dark:text-[#C89B62] underline underline-offset-4"
                      : "text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Service</span>
                </button>
              </div>

              {activeTicket.mode === "bot" && (
                <button
                  type="button"
                  onClick={() => handleEscalateToHuman()}
                  className="hidden sm:inline-flex items-center gap-1 py-1 text-[#966830] dark:text-[#C89B62] hover:underline cursor-pointer shrink-0"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Human Agent</span>
                </button>
              )}
            </div>

            {/* Clean Architectural Input + Send Row */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center border border-[#E6E2DA] dark:border-[#2C2A26] focus-within:border-[#141413] dark:focus-within:border-[#F3F1EC] bg-[#FAF9F7] dark:bg-[#141413] transition-colors"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeTicket.mode === "human"
                    ? "Message Adaobi N. (Osun Client Care)..."
                    : "Write a message or type 'human'..."
                }
                className="flex-1 h-10 sm:h-11 px-3.5 bg-transparent text-[16px] sm:text-sm text-[#141413] dark:text-[#F3F1EC] placeholder-[#66625B] dark:placeholder-[#A7A299] outline-none min-w-0"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="h-10 sm:h-11 px-4 sm:px-6 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Lightbox Modal for Attached Images */}
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-2"
            >
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-black/75 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={lightboxImage}
                alt="Support Attachment Full View"
                referrerPolicy="no-referrer"
                className="w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  // ============================================================================
  // PAGE 1: SUPPORT HUB / INBOX PAGE (Threads, Orders & FAQs on Their Own Page)
  // ============================================================================
  return (
    <section
      className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12"
      id="customer-service-page"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Breadcrumb & Editorial Header */}
        <div className="border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299]">
              <a
                href="/"
                className="hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors"
              >
                Storefront
              </a>
              <span>/</span>
              <span className="text-[#966830] dark:text-[#C89B62] font-medium">
                Client Care
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#141413] dark:text-[#F3F1EC]">
              Client Care &amp; Support
            </h1>
            <p className="text-xs sm:text-sm text-[#66625B] dark:text-[#A7A299] max-w-xl leading-relaxed">
              Open a conversation below to chat with our Automated Concierge Bot or connect directly with a Human Specialist at our Osogbo, Osun hub.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === "new_ticket" ? "none" : "new_ticket")}
              className="h-9 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Thread</span>
            </button>

            <a
              href="/track"
              className="h-9 px-4 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-[#141413] dark:text-[#F3F1EC] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Track Order</span>
            </a>
          </div>
        </div>

        {/* Optional New Thread Drawer */}
        {activePicker === "new_ticket" && (
          <div className="p-4 sm:p-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-2.5">
              <h2 className="font-display text-lg sm:text-xl font-medium text-[#141413] dark:text-[#F3F1EC]">
                Start a New Support Thread
              </h2>
              <button
                type="button"
                onClick={() => setActivePicker("none")}
                className="p-1 text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1">
                  Topic
                </label>
                <select
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs text-[#141413] dark:text-[#F3F1EC] outline-none"
                >
                  {SUPPORT_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.12em] text-[#66625B] dark:text-[#A7A299] mb-1">
                  Subject
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Delivery address update for Order #BX-849201"
                    className="flex-1 h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-[16px] sm:text-xs text-[#141413] dark:text-[#F3F1EC] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateNewTicket()}
                    className="h-10 px-4 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer whitespace-nowrap"
                  >
                    Open Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standalone Support Hub Container */}
        <div className="bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] flex flex-col overflow-hidden">
          <div className="grid grid-cols-3 border-b border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413]">
            {(
              [
                { id: "chats", label: `Threads (${tickets.length})` },
                { id: "orders", label: `Orders (${displayOrders.length})` },
                { id: "faq", label: "FAQs & Desk" },
              ] as const
            ).map((tab) => {
              const isSelected = hubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHubTab(tab.id)}
                  className={`py-3.5 px-3 text-[11px] font-medium uppercase tracking-[0.12em] border-b-2 transition-colors cursor-pointer whitespace-nowrap truncate ${
                    isSelected
                      ? "border-[#141413] dark:border-[#F3F1EC] text-[#141413] dark:text-[#F3F1EC] bg-white dark:bg-[#191816]"
                      : "border-transparent text-[#66625B] dark:text-[#A7A299] hover:text-[#141413] dark:hover:text-[#F3F1EC]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {hubTab === "chats" && (
            <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26]">
              {tickets.map((t) => {
                const lastMsg = t.messages[t.messages.length - 1];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openChatPage(t.id)}
                    className="w-full p-4 sm:p-5 text-left transition-colors cursor-pointer flex items-center justify-between gap-4 bg-white dark:bg-[#191816] hover:bg-[#FAF9F7] dark:hover:bg-[#22211E]/60 group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#66625B] dark:text-[#A7A299]">
                        <span className="font-semibold text-[#141413] dark:text-[#F3F1EC]">
                          #{t.id}
                        </span>
                        <span>·</span>
                        <span
                          className={
                            t.mode === "human"
                              ? "text-[#966830] dark:text-[#C89B62] font-medium"
                              : ""
                          }
                        >
                          {t.status === "resolved"
                            ? "Resolved"
                            : t.mode === "human"
                            ? "Human Specialist"
                            : "Bot Concierge"}
                        </span>
                        {t.orderId && (
                          <>
                            <span>·</span>
                            <span>Order #{t.orderId}</span>
                          </>
                        )}
                        <span className="tabular-nums">
                          ·{" "}
                          {new Date(t.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                        {t.subject}
                      </p>

                      {lastMsg && (
                        <p className="text-xs text-[#66625B] dark:text-[#A7A299] line-clamp-1">
                          <span className="font-medium text-[#141413] dark:text-[#F3F1EC]">
                            {lastMsg.sender === "customer"
                              ? "You: "
                              : lastMsg.sender === "bot"
                              ? "Bot: "
                              : lastMsg.sender === "agent"
                              ? "Adaobi: "
                              : ""}
                          </span>
                          {lastMsg.text}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC]">
                      <span className="hidden sm:inline">Open</span>
                      <ChevronRight className="w-4 h-4 text-[#66625B] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}

              <div className="p-4 bg-[#FAF9F7] dark:bg-[#141413]">
                <button
                  type="button"
                  onClick={() => handleCreateNewTicket()}
                  className="w-full h-10 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start Fresh Inquiry</span>
                </button>
              </div>
            </div>
          )}

          {hubTab === "orders" && (
            <div className="p-4 sm:p-5 space-y-4">
              <p className="text-xs text-[#66625B] dark:text-[#A7A299]">
                Select any order below to open your live chat with that order attached.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayOrders.map((ord) => {
                  const att = orderToSupportAttachment(ord);
                  return (
                    <div
                      key={ord.id}
                      className="p-4 border border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-[#141413] dark:text-[#F3F1EC]">
                          #{ord.id}
                        </span>
                        <span className="text-[11px] font-mono text-[#966830] dark:text-[#C89B62] tabular-nums">
                          {ord.status} · {formatNaira(ord.total)}
                        </span>
                      </div>
                      <p className="text-xs text-[#66625B] dark:text-[#A7A299] truncate">
                        {att.firstItemName}{" "}
                        {att.itemCount > 1 ? `+ ${att.itemCount - 1} more` : ""}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setStagedOrder(att);
                            onAddToast(`Order #${ord.id} attached to chat.`, "success");
                            if (activeTicket) {
                              openChatPage(activeTicket.id);
                            } else {
                              handleCreateNewTicket("Order & Delivery Status", undefined, att);
                            }
                          }}
                          className="flex-1 h-8 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[10px] font-medium uppercase tracking-[0.14em] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat About Order</span>
                        </button>
                        <a
                          href={`/track?order=${encodeURIComponent(ord.id)}`}
                          className="h-8 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] text-[10px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] inline-flex items-center justify-center cursor-pointer"
                        >
                          Track
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hubTab === "faq" && (
            <div className="p-4 sm:p-5 space-y-5">
              <div className="divide-y divide-[#E6E2DA] dark:divide-[#2C2A26] border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                {FAQ_LIST.map((item, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div key={item.q} className="py-3">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                      >
                        <span className="text-xs sm:text-sm font-medium text-[#141413] dark:text-[#F3F1EC]">
                          {item.q}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-[#66625B] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#66625B] shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed mt-2">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2.5 text-xs">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#966830] dark:text-[#C89B62] font-medium">
                  Direct Osun &amp; Nationwide Desk
                </p>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                  <span className="text-[#66625B] dark:text-[#A7A299] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("hello@btnx.store", "Support email")}
                    className="font-mono text-[#141413] dark:text-[#F3F1EC] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>hello@btnx.store</span>
                    {copiedField === "Support email" ? (
                      <Check className="w-3 h-3 text-[#966830]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
                  <span className="text-[#66625B] dark:text-[#A7A299] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Dispatch Line
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("+2348104920194", "Dispatch phone")}
                    className="font-mono text-[#141413] dark:text-[#F3F1EC] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+234 810 492 0194</span>
                    {copiedField === "Dispatch phone" ? (
                      <Check className="w-3 h-3 text-[#966830]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#66625B] dark:text-[#A7A299] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Hub Location
                  </span>
                  <span className="text-[#141413] dark:text-[#F3F1EC]">
                    Osogbo, Osun · Mon–Sat
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
