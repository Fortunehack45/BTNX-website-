import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { ArrowLeft, User, Headphones } from "lucide-react";
import BrandLogo from "../../src/components/BrandLogo";
import Support from "../../src/pages/Support";
import ProductModal from "../../src/components/ProductModal";
import AuthModal from "../../src/components/AuthModal";
import InvoiceModal from "../../src/components/InvoiceModal";
import Notification, { Toast } from "../../src/components/Notification";
import { Product, CartItem, Order } from "../../src/types";
import { useAuth } from "../../src/context/AuthContext";
import { db } from "../../src/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function SupportPortalApp() {
  const [searchParams] = useSearchParams();
  const isChatOpen = Boolean(searchParams.get("chat"));
  const { currentUser, userData } = useAuth();

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("btnx_cart") || localStorage.getItem("klamby_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem("btnx_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!currentUser) {
      try {
        const saved = localStorage.getItem("btnx_orders") || localStorage.getItem("klamby_orders");
        setOrders(saved ? JSON.parse(saved) : []);
      } catch {
        setOrders([]);
      }
      return;
    }

    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Order[];

        fetchedOrders.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis
            ? a.createdAt.toMillis()
            : a.date
            ? new Date(a.date).getTime()
            : 0;
          const timeB = b.createdAt?.toMillis
            ? b.createdAt.toMillis()
            : b.date
            ? new Date(b.date).getTime()
            : 0;
          return timeB - timeA;
        });

        setOrders(fetchedOrders);
      },
      () => {
        // Fallback to local orders if offline
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const handleAddToast = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleRemoveToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddToBag = (product: Product, size?: string, color?: string) => {
    const chosenSize = size || product.sizes?.[0] || "M";
    const chosenColor = color || product.colors?.[0] || "Default";
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === chosenSize &&
          item.selectedColor === chosenColor
      );
      const next =
        existingIdx > -1
          ? prevCart.map((item, idx) =>
              idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
            )
          : [
              ...prevCart,
              {
                product,
                quantity: 1,
                selectedSize: chosenSize,
                selectedColor: chosenColor,
              },
            ];
      try {
        localStorage.setItem("btnx_cart", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    handleAddToast(
      `Added "${product.name}" (${chosenSize} · ${chosenColor}) to bag.`,
      "success"
    );
  };

  const handleToggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists
        ? prev.filter((p) => p.id !== product.id)
        : [product, ...prev];
      try {
        localStorage.setItem("btnx_wishlist", JSON.stringify(next));
      } catch {
        // ignore
      }
      handleAddToast(
        exists
          ? `Removed "${product.name}" from saved pieces.`
          : `Saved "${product.name}" to your favorites.`,
        exists ? "info" : "success"
      );
      return next;
    });
  };

  const clientInfo = {
    name: userData?.name,
    email: currentUser?.email || "",
    phone: userData?.phone,
    shippingStreet: userData?.shippingStreet,
    shippingCity: userData?.shippingCity,
    shippingZip: userData?.shippingZip,
    shippingCountry: userData?.shippingCountry,
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] font-sans text-[#141413] dark:text-[#F3F1EC] antialiased flex flex-col justify-between selection:bg-[#141413] selection:text-[#FAF9F7] dark:selection:bg-[#F3F1EC] dark:selection:text-[#141413] transition-colors duration-200">
        <Notification toasts={toasts} onClose={handleRemoveToast} />

        {/* Dedicated Support Portal Header */}
        <header className="sticky top-0 z-40 w-full m3-haze-bar border-b border-[#E6E2DA] dark:border-[#2C2A26]">
          <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 h-14 lg:h-[68px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <a
                href="/"
                className="flex items-center text-[#141413] dark:text-[#F3F1EC] hover:opacity-75 transition-opacity shrink-0"
                aria-label="BTNX Storefront"
              >
                <BrandLogo className="h-6 sm:h-7 w-auto" />
              </a>
              <span className="h-4 w-[1px] bg-[#E6E2DA] dark:bg-[#2C2A26] hidden sm:inline-block" />
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#66625B] dark:text-[#A7A299] whitespace-nowrap">
                <Headphones className="w-3.5 h-3.5 text-[#966830] dark:text-[#C89B62] shrink-0" />
                <span>Client Care</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {!currentUser && (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="h-9 px-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816] hover:border-[#141413] dark:hover:border-[#F3F1EC] text-[11px] font-medium uppercase tracking-[0.12em] text-[#141413] dark:text-[#F3F1EC] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}

              <a
                href="/"
                className="h-9 px-3.5 bg-[#141413] dark:bg-[#F3F1EC] text-[#FAF9F7] dark:text-[#141413] hover:opacity-90 text-[11px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-1.5 transition-opacity whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Storefront</span>
              </a>
            </div>
          </div>
        </header>

        {/* Main Support Content */}
        <main className={isChatOpen ? "flex-1 flex flex-col" : "flex-grow"}>
          {activeProduct ? (
            <ProductModal
              key={activeProduct.id}
              product={activeProduct}
              cart={cart}
              onClose={() => setActiveProduct(null)}
              onAddToBag={handleAddToBag}
              onOpenCart={() => {
                window.location.href = "/bag";
              }}
              onSelectProduct={(p) => setActiveProduct(p)}
              isWishlisted={wishlist.some((p) => p.id === activeProduct.id)}
              onToggleWishlist={handleToggleWishlist}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          ) : (
            <Support
              orders={orders}
              cart={cart}
              wishlist={wishlist}
              currentUser={currentUser}
              userName={userData?.name}
              userEmail={currentUser?.email || ""}
              onViewInvoice={(order) => setInvoiceOrder(order)}
              onOpenProduct={(product) => setActiveProduct(product)}
              onAddToast={handleAddToast}
            />
          )}
        </main>

        {/* Dedicated Support Portal Footer (shown on Support Hub page) */}
        {!isChatOpen && (
          <footer className="border-t border-[#E6E2DA] dark:border-[#2C2A26] bg-white dark:bg-[#191816]">
            <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#66625B] dark:text-[#A7A299]">
              <div className="flex items-center gap-3">
                <BrandLogo className="h-5 w-auto text-[#141413] dark:text-[#F3F1EC]" />
                <span>© 2026 BTNX Store · Client Care &amp; Concierge</span>
              </div>
              <div className="flex items-center gap-5 uppercase tracking-[0.14em]">
                <a
                  href="/"
                  className="hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors"
                >
                  Storefront
                </a>
                <a
                  href="/track"
                  className="hover:text-[#141413] dark:hover:text-[#F3F1EC] transition-colors"
                >
                  Track Order
                </a>
                <span>Osun · Nationwide</span>
              </div>
            </div>
          </footer>
        )}

        <AnimatePresence>
          {isAuthOpen && (
            <AuthModal
              key="support-auth-modal"
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {invoiceOrder && (
            <InvoiceModal
              key={invoiceOrder.id}
              order={invoiceOrder}
              clientInfo={clientInfo}
              onClose={() => setInvoiceOrder(null)}
              onAddToast={handleAddToast}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
