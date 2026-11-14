import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Headphones,
  Search,
  Send,
  Package,
  RefreshCw,
  Tag,
  Paperclip,
  ExternalLink,
  MessageSquare,
  Bot,
  UserCheck,
  ArrowLeft,
  LogOut,
  Star,
} from "lucide-react";
import BrandLogo from "../../src/components/BrandLogo";
import { db, auth } from "../../src/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  query,
} from "firebase/firestore";
import {
  SupportTicket,
  SupportMessage,
  SupportAttachmentOrder,
  SupportAttachmentProduct,
  compressImageFile,
} from "../../src/utils/supportStore";
import { formatNaira } from "../../src/utils/currency";
import { Product } from "../../src/types";
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

  // Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Tickets & Chat State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "human" | "open" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Attachment & Chat State
  const [availableProducts, setAvailableProducts] = useState<Product[]>(NEW_YEAR_PRODUCTS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          const role = userDocSnap.exists() ? userDocSnap.data()?.role : null;
          const isBootstrapAdmin =
            user.email?.toLowerCase() === "fortunedomination@gmail.com" ||
            user.email?.toLowerCase() === "btnx@btnx.com";
          const effectiveRole = role || (isBootstrapAdmin ? "admin" : "support");
          setUserRole(effectiveRole);
        } catch {
          const isBootstrapAdmin =
            user.email?.toLowerCase() === "fortunedomination@gmail.com" ||
            user.email?.toLowerCase() === "btnx@btnx.com";
          setUserRole(isBootstrapAdmin ? "admin" : "support");
        }
      } else {
        setUserRole(null);
      }
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  const agentName =
    currentUser?.displayName ||
    authName ||
    currentUser?.email?.split("@")[0] ||
    "Adaobi N. (Care Desk)";

  // Real-time Firestore tickets subscription & local sync
  useEffect(() => {
    if (!currentUser) return;

    try {
      const q = query(collection(db, "supportTickets"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched = snapshot.docs.map((d) => d.data() as SupportTicket);
            fetched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setTickets(fetched);
            try {
              localStorage.setItem("btnx_support_tickets_v1", JSON.stringify(fetched));
            } catch {}
          } else {
            try {
              const local = localStorage.getItem("btnx_support_tickets_v1");
              if (local) setTickets(JSON.parse(local));
            } catch {}
          }
        },
        () => {
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
  }, [currentUser]);

  // Listen to BroadcastChannel for instant zero-latency cross-tab sync with customer chat
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("btnx_support_channel");
    bc.onmessage = (event) => {
      if (event.data?.ticket) {
        const updated = event.data.ticket as SupportTicket;
        setTickets((prev) => {
          const exists = prev.some((t) => t.id === updated.id);
          return exists ? prev.map((t) => (t.id === updated.id ? updated : t)) : [updated, ...prev];
        });
      }
    };
    return () => bc.close();
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
  }, [targetTicketId, tickets, selectedTicketId]);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicketId, tickets]);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  // Clean ticket document for Firestore (strictly removes undefined values)
  const cleanTicketDoc = (ticket: SupportTicket): any => {
    const cleanMessages = (ticket.messages || []).slice(-100).map((m) => {
      const msg: any = {
        id: m.id,
        sender: m.sender,
        senderName: m.senderName || "Support Specialist",
        text: m.text || "",
        createdAt: m.createdAt,
      };
      if (m.senderRole) msg.senderRole = m.senderRole;
      if (m.images && m.images.length > 0) msg.images = m.images;
      if (m.attachedOrder) msg.attachedOrder = m.attachedOrder;
      if (m.attachedProduct) msg.attachedProduct = m.attachedProduct;
      if (m.attachedAction) msg.attachedAction = m.attachedAction;
      if (m.suggestHumanTransfer != null) msg.suggestHumanTransfer = Boolean(m.suggestHumanTransfer);
      if (m.quickReplies && m.quickReplies.length > 0) msg.quickReplies = m.quickReplies;
      return msg;
    });

    const docData: any = {
      id: ticket.id,
      userId: ticket.userId || "guest",
      userEmail: (ticket.userEmail || "guest@btnx.store").slice(0, 250),
      userName: (ticket.userName || "BTNX Client").slice(0, 115),
      subject: (ticket.subject || "Client Care Inquiry").slice(0, 195),
      topic: (ticket.topic || "General Store Inquiry").slice(0, 115),
      status: ticket.status,
      mode: ticket.mode,
      messages: cleanMessages,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      unreadByAdmin: Boolean(ticket.unreadByAdmin),
    };

    if (ticket.orderId) docData.orderId = ticket.orderId.slice(0, 120);
    if (ticket.assignedAgent) docData.assignedAgent = ticket.assignedAgent.slice(0, 115);
    if (ticket.unreadByCustomer != null) docData.unreadByCustomer = Boolean(ticket.unreadByCustomer);
    if (ticket.rating != null) docData.rating = Number(ticket.rating);
    if (ticket.feedbackComment) docData.feedbackComment = ticket.feedbackComment.slice(0, 500);
    if (ticket.feedbackSubmittedAt) docData.feedbackSubmittedAt = ticket.feedbackSubmittedAt;

    return docData;
  };

  // Broadcast helper
  const broadcastTicketUpdate = (ticket: SupportTicket) => {
    try {
      const localRaw = localStorage.getItem("btnx_support_tickets_v1");
      const list = localRaw ? JSON.parse(localRaw) : [];
      const nextList = list.some((t: any) => t.id === ticket.id)
        ? list.map((t: any) => (t.id === ticket.id ? ticket : t))
        : [ticket, ...list];
      localStorage.setItem("btnx_support_tickets_v1", JSON.stringify(nextList));
      window.dispatchEvent(new CustomEvent("btnx-support-updated"));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("btnx_support_channel");
        bc.postMessage({ type: "ticket_update", ticket });
        bc.close();
      }
    } catch {}
  };

  // Staff Authentication Handlers
  const handleSupportAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) return;
    setIsSubmittingAuth(true);
    setAuthError("");

    try {
      if (authMode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        const nameToUse = authName.trim() || authEmail.split("@")[0];
        await setDoc(doc(db, "users", cred.user.uid), {
          id: cred.user.uid,
          email: authEmail.trim(),
          name: nameToUse,
          role: "support",
          createdAt: new Date().toISOString(),
        });
        setUserRole("support");
        showToast("Support staff account created successfully.");
      } else {
        const cred = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        const role = snap.exists() ? snap.data()?.role : null;
        if (role === "customer") {
          setAuthError("Access Denied: Customer accounts cannot access the Support Staff desk. Customers should use /support.");
          await signOut(auth);
          return;
        }
        setUserRole(role || "support");
        showToast("Signed in to Support Desk.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Check your credentials.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Filtered queue items
  const filteredTickets = tickets.filter((t) => {
    if (filterMode === "human") return t.mode === "human" || t.status === "pending_human";
    if (filterMode === "open") return t.status === "open" || t.status === "pending_human";
    if (filterMode === "resolved") return t.status === "resolved";
    return true;
  }).filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      t.userName?.toLowerCase().includes(q) ||
      t.userEmail?.toLowerCase().includes(q) ||
      t.orderId?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.topic?.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  const humanPendingCount = tickets.filter(
    (t) => (t.mode === "human" || t.status === "pending_human") && t.status !== "resolved"
  ).length;

  // Dispatch agent reply into customer thread
  const handleSendAgentReply = async (
    customText?: string,
    attachment?: {
      order?: SupportAttachmentOrder;
      product?: SupportAttachmentProduct;
      images?: string[];
    }
  ) => {
    const textToSend = (customText !== undefined ? customText : replyText).trim();
    if (!textToSend && !attachment) return;
    if (!selectedTicket) return;

    setIsSending(true);

    const newMsg: SupportMessage = {
      id: `msg-${Date.now()}-agent`,
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
    setSelectedTicketId(updatedTicket.id);
    setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
    setReplyText("");

    broadcastTicketUpdate(updatedTicket);

    // Sync to Firestore
    try {
      await setDoc(doc(db, "supportTickets", updatedTicket.id), cleanTicketDoc(updatedTicket), { merge: true });
      showToast("Reply delivered to client thread.");
    } catch {
      showToast("Saved locally and broadcasted to shopper.");
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async (newStatus: "open" | "human_active" | "resolved") => {
    if (!selectedTicket) return;
    const nowIso = new Date().toISOString();
    const sysMsg: SupportMessage = {
      id: `msg-${Date.now()}-sys`,
      sender: "system",
      senderName: "System",
      text: newStatus === "resolved"
        ? `Ticket #${selectedTicket.id} marked as resolved by ${agentName}.`
        : `Ticket #${selectedTicket.id} reopened by ${agentName}.`,
      createdAt: nowIso,
    };
    const updated: SupportTicket = {
      ...selectedTicket,
      status: newStatus,
      updatedAt: nowIso,
      messages: [...selectedTicket.messages, sysMsg],
    };
    setSelectedTicketId(updated.id);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    broadcastTicketUpdate(updated);

    try {
      await setDoc(doc(db, "supportTickets", updated.id), cleanTicketDoc(updated), { merge: true });
      showToast(`Ticket #${updated.id} marked as ${newStatus}.`);
    } catch {}
  };

  // Rock-solid TAKE OVER from bot
  const handleToggleMode = async (newMode: "human" | "bot") => {
    if (!selectedTicket) return;
    const nowIso = new Date().toISOString();
    const isTakingOver = newMode === "human";

    const sysMsg: SupportMessage = {
      id: `msg-${Date.now()}-sys`,
      sender: "system",
      senderName: "System",
      text: isTakingOver
        ? `${agentName} (Human Support Specialist) has taken over this conversation. The automated bot is now paused.`
        : "Conversation transferred back to Virtual Support Assistant.",
      createdAt: nowIso,
    };

    const updated: SupportTicket = {
      ...selectedTicket,
      mode: newMode,
      status: isTakingOver ? "human_active" : "open",
      assignedAgent: isTakingOver ? agentName : undefined,
      updatedAt: nowIso,
      messages: [...selectedTicket.messages, sysMsg],
    };

    setSelectedTicketId(updated.id);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    broadcastTicketUpdate(updated);

    try {
      await setDoc(doc(db, "supportTickets", updated.id), cleanTicketDoc(updated), { merge: true });
      showToast(isTakingOver ? "You have taken over. Bot is paused." : "Transferred to bot.");
    } catch (err: any) {
      showToast("Updated locally.");
    }
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

  // Loading Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-5 h-5 animate-spin text-[#966830] dark:text-[#C89B62] mb-3" />
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#66625B] dark:text-[#A7A299]">
          Verifying Support Staff Credentials...
        </p>
      </div>
    );
  }

  // Support Staff Authentication Gate
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] text-[#141413] dark:text-[#F3F1EC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-7 sm:p-9 space-y-6 shadow-[0_24px_60px_-15px_rgba(20,20,19,0.18)]">
          <div className="space-y-2 text-center border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-5">
            <div className="flex justify-center text-[#141413] dark:text-[#F3F1EC]">
              <BrandLogo className="h-8 w-auto" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62]">
              Osogbo Desk · Client Care Console
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-medium">
              {authMode === "login" ? "Support Staff Sign In" : "Register Support Staff"}
            </h1>
            <p className="text-xs text-[#66625B] dark:text-[#A7A299] leading-relaxed">
              Authorized access for BTNX Customer Service Specialists to triage live shopper threads, process order updates, and manage customer tickets.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 border border-[#E5484D] bg-[#FDF2F2] dark:bg-[#2A1616] text-[#E5484D] text-xs">
              {authError}
            </div>
          )}

          <form onSubmit={handleSupportAuth} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                  Full Name / Agent Alias
                </label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. Adaobi N."
                  className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs text-[#141413] dark:text-[#F3F1EC] outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                Staff Email Address
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="support@btnx.store"
                className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs font-mono text-[#141413] dark:text-[#F3F1EC] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full h-10 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.14em] cursor-pointer hover:opacity-90 transition-opacity"
            >
              {isSubmittingAuth
                ? "Verifying..."
                : authMode === "login"
                ? "Sign In to Support Console"
                : "Create Staff Account"}
            </button>
          </form>

          <div className="pt-2 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
              className="text-[#966830] dark:text-[#C89B62] underline cursor-pointer text-[11px]"
            >
              {authMode === "login"
                ? "New support specialist? Register here"
                : "Already registered? Sign in"}
            </button>
            <a href="/" className="text-[#66625B] dark:text-[#A7A299] hover:underline text-[11px]">
              Back to Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Main Support Staff Desk Console
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
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-[#66625B] dark:text-[#A7A299] text-[11px]">Specialist:</span>
            <span className="font-mono text-xs font-medium bg-[#FAF9F7] dark:bg-[#141413] px-2 py-1 border border-[#E6E2DA] dark:border-[#2C2A26]">
              {agentName} {userRole ? `(${userRole.toUpperCase()})` : ""}
            </span>
          </div>

          <a
            href="/"
            className="h-8 px-3 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Storefront</span>
          </a>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="h-8 px-3 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] text-[11px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 transition-opacity whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
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
                        {t.userName}
                      </span>
                      <span className="text-[#66625B] dark:text-[#A7A299]">
                        {new Date(t.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[#141413] dark:text-[#F3F1EC] truncate">
                      {t.subject || t.topic}
                    </p>

                    <p className="text-[11px] text-[#66625B] dark:text-[#A7A299] line-clamp-1">
                      {lastMsg ? lastMsg.text : "No messages yet"}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded-xs uppercase tracking-wider text-[9px] ${
                            needsHuman
                              ? "bg-[#FDF2F2] text-[#E5484D] dark:bg-[#2A1616]"
                              : "bg-[#F4EFE6] text-[#966830] dark:bg-[#2A241A] dark:text-[#C89B62]"
                          }`}
                        >
                          {needsHuman ? "Human Agent Handling" : "Bot Active"}
                        </span>
                        {t.status === "resolved" && (
                          <span className="px-1.5 py-0.5 bg-[#EBF5EE] text-[#1D7A46] dark:bg-[#132A1C] dark:text-[#67E28E] rounded-xs uppercase tracking-wider text-[9px]">
                            Resolved
                          </span>
                        )}
                        {t.rating && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FAF3EA] dark:bg-[#2C2318] text-[#966830] dark:text-[#C89B62] rounded-xs text-[9px] font-mono font-medium">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>{t.rating}.0</span>
                          </span>
                        )}
                      </div>
                      {t.orderId && (
                        <span className="text-[#66625B] dark:text-[#A7A299]">
                          #{t.orderId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: LIVE CHAT & CONVERSATION THREAD (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] flex flex-col h-[calc(100vh-100px)] overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Active Ticket Header */}
              <div className="p-3.5 border-b border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between gap-3 bg-[#FAF9F7] dark:bg-[#141413]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-xs text-[#141413] dark:text-[#F3F1EC] truncate">
                      {selectedTicket.userName}
                    </h2>
                    <span className="text-[10px] font-mono text-[#66625B]">
                      (#{selectedTicket.id})
                    </span>
                  </div>
                  <p className="text-[11px] text-[#966830] dark:text-[#C89B62] truncate">
                    Topic: {selectedTicket.topic}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedTicket.rating && (
                    <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF3EA] dark:bg-[#2C2318] text-[#966830] dark:text-[#C89B62] border border-[#E6D4BE] dark:border-[#4A3925] rounded-xs text-[10px] font-mono font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{selectedTicket.rating}/5 Rated</span>
                    </div>
                  )}
                  {selectedTicket.mode === "bot" ? (
                    <button
                      type="button"
                      onClick={() => handleToggleMode("human")}
                      className="h-7 px-2.5 bg-[#966830] text-white text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer hover:opacity-90"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Take Over</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleMode("bot")}
                      className="h-7 px-2 border border-[#E6E2DA] dark:border-[#2C2A26] text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer hover:border-[#141413] dark:hover:border-[#F3F1EC]"
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
                  const isSystem = m.sender === "system";

                  if (isSystem) {
                    return (
                      <div key={m.id} className="text-center my-2">
                        <span className="px-2.5 py-1 bg-[#E6E2DA]/50 dark:bg-[#2C2A26]/50 text-[10px] font-mono text-[#66625B] dark:text-[#A7A299] rounded-xs">
                          {m.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#66625B] dark:text-[#A7A299] mb-1">
                        <span>
                          {isAgent ? `Staff · ${m.senderName}` : isCustomer ? m.senderName : "Virtual Assistant"}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] p-3 text-xs leading-relaxed space-y-2 ${
                          isAgent
                            ? "bg-[#141413] text-[#FAF9F7] dark:bg-[#F3F1EC] dark:text-[#141413]"
                            : "bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] text-[#141413] dark:text-[#F3F1EC]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>

                        {/* Attached Images */}
                        {m.images && m.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {m.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt="Attachment"
                                className="w-20 h-20 object-cover border border-[#E6E2DA] dark:border-[#2C2A26] cursor-pointer"
                                onClick={() => window.open(img, "_blank")}
                              />
                            ))}
                          </div>
                        )}

                        {/* Attached Order Card */}
                        {m.attachedOrder && (
                          <div className="p-2 border border-current/20 bg-black/5 dark:bg-white/5 space-y-1 text-[11px] font-mono">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">Order #{m.attachedOrder.id}</span>
                              <span>{formatNaira(m.attachedOrder.total)}</span>
                            </div>
                            <p className="text-[10px] opacity-80">{m.attachedOrder.firstItemName}</p>
                          </div>
                        )}

                        {/* Attached Product Card */}
                        {m.attachedProduct && (
                          <div className="p-2 border border-current/20 bg-black/5 dark:bg-white/5 flex items-center gap-2">
                            <img
                              src={m.attachedProduct.image}
                              alt={m.attachedProduct.name}
                              className="w-10 h-10 object-cover shrink-0"
                            />
                            <div className="min-w-0 text-[11px]">
                              <p className="font-medium truncate">{m.attachedProduct.name}</p>
                              <p className="font-mono text-[10px]">{formatNaira(m.attachedProduct.price)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Fast Canned Replies */}
              <div className="p-2 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-[#FAF9F7] dark:bg-[#141413] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {CANNED_REPLIES.map((cr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendAgentReply(cr.text)}
                    className="h-6 px-2.5 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#966830] text-[10px] whitespace-nowrap cursor-pointer text-[#141413] dark:text-[#F3F1EC]"
                  >
                    {cr.label}
                  </button>
                ))}
              </div>

              {/* Agent Reply Composer */}
              <div className="p-3 border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#66625B]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1 hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                      title="Attach photo"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    {selectedTicket.orderId && (
                      <button
                        type="button"
                        onClick={() => {
                          const orderAttachment: SupportAttachmentOrder = {
                            id: selectedTicket.orderId || "",
                            status: "In Transit",
                            total: 120000,
                            date: "Recent Order",
                            itemCount: 1,
                            firstItemName: "BTNX Contemporary Piece",
                          };
                          handleSendAgentReply(
                            `Verified Order #${selectedTicket.orderId}. Logistics status is active on dispatch board.`,
                            { order: orderAttachment }
                          );
                        }}
                        className="p-1 hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                        title="Attach order card"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const prod = availableProducts[0] || NEW_YEAR_PRODUCTS[0];
                        if (!prod) return;
                        const productAttachment: SupportAttachmentProduct = {
                          id: prod.id,
                          name: prod.name,
                          price: prod.price,
                          image: prod.image,
                          category: prod.category,
                        };
                        handleSendAgentReply(
                          `Here is a recommended piece from our collection: ${prod.name} (${formatNaira(prod.price)}).`,
                          { product: productAttachment }
                        );
                      }}
                      className="p-1 hover:text-[#141413] dark:hover:text-[#F3F1EC] cursor-pointer"
                      title="Recommend signature garment piece"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAttachImage}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <span className="text-[10px] font-mono">Replying as {agentName}</span>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAgentReply();
                      }
                    }}
                    placeholder={`Reply to ${selectedTicket.userName} as support specialist...`}
                    className="flex-1 p-2.5 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] text-xs outline-none resize-none"
                  />
                  <button
                    type="button"
                    disabled={isSending || !replyText.trim()}
                    onClick={() => handleSendAgentReply()}
                    className="w-12 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[#66625B]">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              <p>Select a customer support thread from the queue.</p>
            </div>
          )}
        </div>

        {/* COLUMN 3: CUSTOMER & ORDER DOSSIER (3 Cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-[#191816] border border-[#E6E2DA] dark:border-[#2C2A26] p-4 h-[calc(100vh-100px)] overflow-y-auto space-y-5">
          {selectedTicket ? (
            <>
              {/* Client Profile Card */}
              <div className="space-y-2 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62]">
                  Client Profile
                </span>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-[#141413] dark:text-[#F3F1EC]">
                    {selectedTicket.userName}
                  </h3>
                  <p className="text-xs text-[#66625B] dark:text-[#A7A299] font-mono">
                    {selectedTicket.userEmail}
                  </p>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="space-y-2.5 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62]">
                  Ticket Dossier
                </span>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#66625B]">Reference:</span>
                    <span className="font-mono font-medium">#{selectedTicket.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66625B]">Handling:</span>
                    <span>
                      {selectedTicket.mode === "human" ? "Human Agent Handling" : "Automated Virtual Assistant"}
                    </span>
                  </div>
                  {selectedTicket.orderId && (
                    <div className="flex justify-between">
                      <span className="text-[#66625B]">Order ID:</span>
                      <a
                        href={`/track?order=${encodeURIComponent(selectedTicket.orderId)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#966830] dark:text-[#C89B62] underline inline-flex items-center gap-1"
                      >
                        <span>#{selectedTicket.orderId}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#66625B]">Created:</span>
                    <span>
                      {new Date(selectedTicket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client Rating & Review Dossier */}
              <div className="space-y-2 border-b border-[#E6E2DA] dark:border-[#2C2A26] pb-4">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62]">
                  Client Rating &amp; Review
                </span>
                {selectedTicket.rating ? (
                  <div className="p-3 bg-[#FAF9F7] dark:bg-[#141413] border border-[#E6E2DA] dark:border-[#2C2A26] space-y-2 rounded-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[#966830] dark:text-[#C89B62]">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= (selectedTicket.rating || 5)
                                ? "fill-[#966830] dark:fill-[#C89B62]"
                                : "text-[#D1CBC1] dark:text-[#3E3A33]"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#141413] dark:text-[#F3F1EC]">
                        {selectedTicket.rating}.0 / 5
                      </span>
                    </div>
                    {selectedTicket.feedbackComment && (
                      <p className="text-xs text-[#66625B] dark:text-[#A7A299] italic leading-relaxed">
                        "{selectedTicket.feedbackComment}"
                      </p>
                    )}
                    {selectedTicket.feedbackSubmittedAt && (
                      <span className="block text-[10px] text-[#8C877D] font-mono">
                        Logged {new Date(selectedTicket.feedbackSubmittedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-[#FAF9F7]/70 dark:bg-[#141413]/70 border border-dashed border-[#E6E2DA] dark:border-[#2C2A26] text-center space-y-1.5 rounded-xs">
                    <p className="text-[11px] text-[#66625B] dark:text-[#A7A299]">
                      Awaiting client post-support review.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSendAgentReply("We would appreciate your feedback! You can leave a quick rating on this conversation using the review card.")}
                      className="text-[10px] text-[#966830] dark:text-[#C89B62] font-mono uppercase tracking-wider hover:underline cursor-pointer"
                    >
                      Prompt Client for Rating
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions for Staff */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62]">
                  Quick Actions
                </span>
                <div className="space-y-2 text-xs">
                  <a
                    href={`/render/support/${selectedTicket.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full h-8 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <span>View Visual Card</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {selectedTicket.orderId && (
                    <a
                      href={`/render/track/${selectedTicket.orderId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-8 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <span>Track Shipment</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-[#66625B] text-center pt-8">No ticket selected.</p>
          )}
        </div>
      </div>
    </div>
  );
}
