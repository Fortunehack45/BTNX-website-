import { useState, useEffect } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import NewArrivals from "./components/NewArrivals";
import BigSale from "./components/BigSale";
import NewYearCollection from "./components/NewYearCollection";
import Newsletter from "./components/Newsletter";
import Footer from "./components/Footer";
import ProductModal from "./components/ProductModal";
import Shop from "./pages/Shop";
import Promos from "./pages/Promos";
import Saved from "./pages/Saved";
import Bag from "./pages/Bag";
import Notifications from "./pages/Notifications";
import UserProfileModal from "./components/UserProfileModal";
import AuthModal from "./components/AuthModal";
import InvoiceModal from "./components/InvoiceModal";
import Notification, { Toast } from "./components/Notification";
import MobileBottomNav from "./components/MobileBottomNav";
import { Product, CartItem, Order } from "./types";
import { useAuth } from "./context/AuthContext";
import { useNotifications } from "./hooks/useNotifications";
import { db, handleFirestoreError, OperationType } from "./lib/firebase";
import { formatNaira } from "./utils/currency";
import { downloadOrderInvoice } from "./utils/invoice";
import {
  doc,
  getDoc,
  getDocs,
  increment,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  addDoc,
} from "firebase/firestore";

export default function App() {
  const { currentUser, userData, loading } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(
    currentUser?.uid
  );

  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem("btnx_cart") || localStorage.getItem("klamby_cart");
    return savedCart ? JSON.parse(savedCart) : [];
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

  useEffect(() => {
    if (!currentUser) {
      const saved = localStorage.getItem("btnx_orders") || localStorage.getItem("klamby_orders");
      setOrders(saved ? JSON.parse(saved) : []);
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
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.date ? new Date(a.date).getTime() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.date ? new Date(b.date).getTime() : 0;
          return timeB - timeA;
        });

        setOrders(fetchedOrders);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "orders");
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<"profile" | "orders" | "favorites">("profile");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [appliedCode, setAppliedCode] = useState<string>("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    localStorage.setItem("btnx_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("btnx_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (!currentUser) {
      localStorage.setItem("btnx_orders", JSON.stringify(orders));
    }
  }, [orders, currentUser]);

  const clientInfo = {
    name: userData?.name,
    email: currentUser?.email || "",
    phone: userData?.phone,
    shippingStreet: userData?.shippingStreet,
    shippingCity: userData?.shippingCity,
    shippingZip: userData?.shippingZip,
    shippingCountry: userData?.shippingCountry,
  };

  const handleOpenCart = () => {
    setActiveProduct(null);
    setIsProfileOpen(false);
    navigate("/bag");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownloadInvoice = (order: Order) => {
    downloadOrderInvoice(order, clientInfo);
    handleAddToast(`Downloaded Invoice-${order.id}.html.`, "success");
  };

  const handleApplyVoucher = async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return false;

    if (cleanCode === "KLAMBY50" || cleanCode === "BTNX50") {
      setAppliedDiscount(0.5);
      setAppliedCode(cleanCode);
      handleAddToast(`Voucher '${cleanCode}' applied (50% privilege).`, "success");
      return true;
    }

    try {
      const cached = localStorage.getItem("klamby_promo_codes");
      if (cached) {
        const promos = JSON.parse(cached) as Array<{
          code: string;
          discountPercentage: number;
          expiresAt: string;
          isActive?: boolean;
        }>;
        const match = promos.find((p) => p.code.toUpperCase() === cleanCode);
        if (match) {
          if (new Date(match.expiresAt) < new Date()) {
            handleAddToast("This promo code has expired.", "error");
            return false;
          }
          if (match.isActive === false) {
            handleAddToast("This promo code is currently inactive.", "error");
            return false;
          }
          const discountPct = match.discountPercentage || 0;
          setAppliedDiscount(discountPct / 100);
          setAppliedCode(cleanCode);
          handleAddToast(`Voucher '${cleanCode}' applied (${discountPct}% off).`, "success");
          return true;
        }
      }
    } catch (e) {
      console.warn("Failed to check local promos cache", e);
    }

    try {
      const q = query(collection(db, "promoCodes"), where("code", "==", cleanCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        handleAddToast("Invalid voucher code.", "error");
        return false;
      }

      const promoData = querySnapshot.docs[0].data();
      if (promoData.expiresAt && new Date(promoData.expiresAt) < new Date()) {
        handleAddToast("This promo code has expired.", "error");
        return false;
      }
      if (promoData.isActive === false) {
        handleAddToast("This promo code is currently inactive.", "error");
        return false;
      }

      const discountPct = promoData.discountPercentage || 0;
      setAppliedDiscount(discountPct / 100);
      setAppliedCode(cleanCode);
      handleAddToast(`Voucher '${cleanCode}' applied (${discountPct}% off).`, "success");
      return true;
    } catch (err) {
      handleAddToast("Unable to validate voucher code right now.", "error");
      handleFirestoreError(err, OperationType.LIST, "promoCodes");
      return false;
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedDiscount(0);
    setAppliedCode("");
  };

  const handlePlaceOrder = async (newOrder: Order) => {
    if (currentUser) {
      const orderPath = `orders/${newOrder.id}`;
      try {
        const orderData = {
          ...newOrder,
          userId: currentUser.uid,
          userEmail: currentUser.email || "",
          createdAt: new Date(),
        };
        await setDoc(doc(db, "orders", newOrder.id), orderData);

        try {
          await addDoc(collection(db, "notifications"), {
            userId: currentUser.uid,
            title: "Order Confirmed",
            message: `Your order #${newOrder.id} of ${formatNaira(newOrder.total)} was received and is now processing in our atelier.`,
            type: "order_status",
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        } catch (notifErr) {
          handleFirestoreError(notifErr, OperationType.CREATE, "notifications");
        }
      } catch (err) {
        handleAddToast("Failed to save order to cloud database.", "error");
        handleFirestoreError(err, OperationType.CREATE, orderPath);
      }
    } else {
      setOrders((prev) => [newOrder, ...prev]);
    }
  };

  const handleToggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        handleAddToast(`Removed "${product.name}" from saved pieces.`, "info");
        return prev.filter((p) => p.id !== product.id);
      } else {
        handleAddToast(`Saved "${product.name}" to your favorites.`, "success");
        return [product, ...prev];
      }
    });
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

      if (existingIdx > -1) {
        const newCart = [...prevCart];
        newCart[existingIdx] = {
          ...newCart[existingIdx],
          quantity: newCart[existingIdx].quantity + 1,
        };
        return newCart;
      } else {
        return [
          ...prevCart,
          { product, quantity: 1, selectedSize: chosenSize, selectedColor: chosenColor },
        ];
      }
    });

    if (currentUser) {
      const productPath = `products/${product.id}`;
      void (async () => {
        try {
          const prodRef = doc(db, "products", product.id);
          const snap = await getDoc(prodRef);
          if (snap.exists()) {
            await updateDoc(prodRef, { cartCount: increment(1) });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, productPath);
        }
      })();
    }

    handleAddToast(`Added "${product.name}" (${chosenSize} · ${chosenColor}) to bag.`, "success");
  };

  const handleUpdateQuantity = (productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId, size, color);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId &&
        item.selectedSize === size &&
        item.selectedColor === color
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string, size: string, color: string) => {
    const itemToRemove = cart.find(
      (item) =>
        item.product.id === productId &&
        item.selectedSize === size &&
        item.selectedColor === color
    );

    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
          )
      )
    );

    if (itemToRemove && currentUser) {
      const productPath = `products/${itemToRemove.product.id}`;
      void (async () => {
        try {
          const prodRef = doc(db, "products", itemToRemove.product.id);
          const snap = await getDoc(prodRef);
          if (snap.exists()) {
            await updateDoc(prodRef, { cartCount: increment(-1) });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, productPath);
        }
      })();
    }
    if (itemToRemove) {
      handleAddToast(`Removed "${itemToRemove.product.name}" from your bag.`, "info");
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleAddToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      handleRemoveToast(id);
    }, 3500);
  };

  const handleRemoveToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const renderProductDetail = (product: Product) => (
    <ProductModal
      key={product.id}
      product={product}
      cart={cart}
      onClose={() => {
        setActiveProduct(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      onAddToBag={handleAddToBag}
      onUpdateQuantity={handleUpdateQuantity}
      onOpenCart={handleOpenCart}
      onSelectProduct={setActiveProduct}
      isWishlisted={wishlist.some((p) => p.id === product.id)}
      onToggleWishlist={handleToggleWishlist}
      onOpenAuth={() => setIsAuthOpen(true)}
    />
  );

  if (loading) return null;

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="min-h-screen bg-[#FAF9F7] dark:bg-[#111110] font-sans text-[#111110] dark:text-[#F3F1EC] antialiased flex flex-col justify-between selection:bg-[#111110] selection:text-[#FAF9F7] dark:selection:bg-[#F3F1EC] dark:selection:text-[#111110] transition-colors duration-200"
      id="main-layout"
    >
      <Notification toasts={toasts} onClose={handleRemoveToast} />

      <Header
        cart={cart}
        onOpenCart={handleOpenCart}
        onOpenAuth={() => setIsAuthOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCategoryFilter={setCategoryFilter}
        onOpenProfile={(tab) => {
          if (tab === "favorites") {
            setActiveProduct(null);
            navigate("/saved");
            return;
          }
          setActiveProfileTab(tab || "profile");
          setIsProfileOpen(true);
        }}
        onOpenProduct={setActiveProduct}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      <main className="flex-grow">
        <Routes>
          <Route
            path="/"
            element={
              activeProduct ? (
                renderProductDetail(activeProduct)
              ) : (
                <>
                  <Hero onOpenProduct={setActiveProduct} />
                  <NewArrivals onCategoryFilter={setCategoryFilter} />
                  <BigSale onCategoryFilter={setCategoryFilter} />
                  <NewYearCollection
                    cart={cart}
                    categoryFilter={categoryFilter}
                    onCategoryFilter={setCategoryFilter}
                    onResetFilter={() => {
                      setCategoryFilter("");
                      setSearchQuery("");
                    }}
                    onOpenProduct={setActiveProduct}
                    onAddToBag={handleAddToBag}
                    onUpdateQuantity={handleUpdateQuantity}
                    onAddToast={handleAddToast}
                    searchQuery={searchQuery}
                    wishlist={wishlist}
                    onToggleWishlist={handleToggleWishlist}
                  />
                  <Newsletter onAddToast={handleAddToast} />
                </>
              )
            }
          />
          <Route
            path="/shop"
            element={
              activeProduct ? (
                renderProductDetail(activeProduct)
              ) : (
                <Shop
                  cart={cart}
                  onOpenProduct={setActiveProduct}
                  onAddToBag={handleAddToBag}
                  onUpdateQuantity={handleUpdateQuantity}
                  onAddToast={handleAddToast}
                  onOpenCart={handleOpenCart}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  globalSearchQuery={searchQuery}
                />
              )
            }
          />
          <Route
            path="/promos"
            element={
              activeProduct ? (
                renderProductDetail(activeProduct)
              ) : (
                <Promos
                  onApplyPromoToBag={async (code) => {
                    await handleApplyVoucher(code);
                    handleOpenCart();
                  }}
                  onAddToast={handleAddToast}
                  onOpenProduct={setActiveProduct}
                />
              )
            }
          />
          <Route
            path="/saved"
            element={
              activeProduct ? (
                renderProductDetail(activeProduct)
              ) : (
                <Saved
                  wishlist={wishlist}
                  cart={cart}
                  onToggleWishlist={handleToggleWishlist}
                  onOpenProduct={setActiveProduct}
                  onAddToBag={handleAddToBag}
                  onUpdateQuantity={handleUpdateQuantity}
                  onOpenCart={handleOpenCart}
                />
              )
            }
          />
          <Route
            path="/bag"
            element={
              activeProduct ? (
                renderProductDetail(activeProduct)
              ) : (
                <Bag
                  cart={cart}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onClearCart={handleClearCart}
                  onAddToast={handleAddToast}
                  onPlaceOrder={handlePlaceOrder}
                  currentUser={currentUser}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onOpenProduct={setActiveProduct}
                  appliedDiscount={appliedDiscount}
                  appliedCode={appliedCode}
                  onApplyVoucher={handleApplyVoucher}
                  onRemoveVoucher={handleRemoveVoucher}
                  onOpenOrders={() => {
                    setActiveProfileTab("orders");
                    setIsProfileOpen(true);
                  }}
                  onViewInvoice={(order) => setInvoiceOrder(order)}
                  onDownloadInvoice={handleDownloadInvoice}
                />
              )
            }
          />
          <Route
            path="/notifications"
            element={
              activeProduct ? (
                renderProductDetail(activeProduct)
              ) : (
                <Notifications
                  notifications={notifications}
                  unreadCount={unreadCount}
                  currentUser={currentUser}
                  orders={orders}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onViewInvoice={(order) => setInvoiceOrder(order)}
                  onDownloadInvoice={handleDownloadInvoice}
                  onOpenOrders={() => {
                    setActiveProfileTab("orders");
                    setIsProfileOpen(true);
                  }}
                  onApplyPromoToBag={async (code) => {
                    await handleApplyVoucher(code);
                    handleOpenCart();
                  }}
                  onAddToast={handleAddToast}
                />
              )
            }
          />
        </Routes>
      </main>

      <Footer
        onAddToast={handleAddToast}
        onNavigateHome={(sectionId) => {
          setActiveProduct(null);
          if (sectionId) {
            setTimeout(() => {
              document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
            }, 90);
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />

      <AnimatePresence>
        {isAuthOpen && <AuthModal key="auth-modal" isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileOpen && (
          <UserProfileModal
            key="user-profile-modal"
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            orders={orders}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onOpenProduct={(product) => {
              setIsProfileOpen(false);
              setActiveProduct(product);
            }}
            onAddToast={handleAddToast}
            onAddToBag={handleAddToBag}
            onOpenCart={handleOpenCart}
            onViewInvoice={(order) => setInvoiceOrder(order)}
            initialTab={activeProfileTab}
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

      {!isAuthOpen && !invoiceOrder && (
        <MobileBottomNav
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          wishlistCount={wishlist.length}
          isOverlayProfileOpen={isProfileOpen}
          onNavigatePage={() => {
            setActiveProduct(null);
            setIsProfileOpen(false);
          }}
          onResetHome={() => {
            setActiveProduct(null);
            setIsProfileOpen(false);
            setCategoryFilter("");
            setSearchQuery("");
          }}
        />
      )}
    </div>
    </MotionConfig>
  );
}
