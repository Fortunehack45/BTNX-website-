import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import NewArrivals from "./components/NewArrivals";
import BigSale from "./components/BigSale";
import NewYearCollection from "./components/NewYearCollection";
import Newsletter from "./components/Newsletter";
import Footer from "./components/Footer";
import ProductModal from "./components/ProductModal";
import CartDrawer from "./components/CartDrawer";
import UserProfileModal, { DEFAULT_MOCK_ORDERS } from "./components/UserProfileModal";
import AuthModal from "./components/AuthModal";
import Notification, { Toast } from "./components/Notification";
import { Product, CartItem, Order } from "./types";
import { useAuth } from "./context/AuthContext";
import { db } from "./lib/firebase";
import { doc, increment, updateDoc, collection, query, where, onSnapshot, setDoc } from "firebase/firestore";

export default function App() {
  const { currentUser, loading } = useAuth();
  // Load initial cart state from localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem("btnx_cart") || localStorage.getItem("klamby_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Load initial orders state
  const [orders, setOrders] = useState<Order[]>([]);

  // Stream orders from Firestore or load from localStorage
  useEffect(() => {
    if (!currentUser) {
      const saved = localStorage.getItem("btnx_orders") || localStorage.getItem("klamby_orders");
      setOrders(saved ? JSON.parse(saved) : []);
      return;
    }

    // Stream orders from Firestore in real-time
    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Sort orders by timestamp / date (newest first)
      fetchedOrders.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.date ? new Date(b.date).getTime() : 0);
        return timeB - timeA;
      });

      setOrders(fetchedOrders);
    }, (error) => {
      console.error("Error streaming customer orders:", error);
    });

    return unsubscribe;
  }, [currentUser]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<"profile" | "orders">("profile");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Synchronize cart state with localStorage
  useEffect(() => {
    localStorage.setItem("btnx_cart", JSON.stringify(cart));
  }, [cart]);

  // Synchronize orders state with localStorage only when guest
  useEffect(() => {
    if (!currentUser) {
      localStorage.setItem("btnx_orders", JSON.stringify(orders));
    }
  }, [orders, currentUser]);

  const handlePlaceOrder = async (newOrder: Order) => {
    if (currentUser) {
      try {
        const orderData = {
          ...newOrder,
          userId: currentUser.uid,
          userEmail: currentUser.email || "",
          createdAt: new Date(),
        };
        await setDoc(doc(db, "orders", newOrder.id), orderData);
      } catch (err) {
        console.error("Failed to save order to Firestore:", err);
        handleAddToast("Failed to save order to cloud database.", "error");
      }
    } else {
      setOrders((prev) => [newOrder, ...prev]);
    }
  };

  // Handle addition of items to shopping cart
  const handleAddToBag = (product: Product, size?: string, color?: string) => {
    const chosenSize = size || product.sizes?.[0] || "M";
    const chosenColor = color || product.colors?.[0] || "Default";

    setCart((prevCart) => {
      // Check if item with same configuration already exists in cart
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
      try {
        updateDoc(doc(db, "products", product.id), {
          cartCount: increment(1)
        });
      } catch (err) {
        console.error("Failed to update cart count", err);
      }
    }

    handleAddToast(`Added "${product.name}" (${chosenSize} / ${chosenColor}) to your bag!`, "success");
  };

  // Adjust item quantities inside cart drawer
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

  // Delete a specific configured item from cart
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
      try {
        updateDoc(doc(db, "products", itemToRemove.product.id), {
          cartCount: increment(-1)
        });
      } catch (err) {
        console.error("Failed to update cart count", err);
      }
      handleAddToast(`Removed "${itemToRemove.product.name}" from your bag`, "info");
    } else if (itemToRemove) {
      handleAddToast(`Removed "${itemToRemove.product.name}" from your bag`, "info");
    }
  };

  // Reset entire shopping cart post-checkout
  const handleClearCart = () => {
    setCart([]);
  };

  // Trigger toast notifications
  const handleAddToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      handleRemoveToast(id);
    }, 3500);
  };

  const handleRemoveToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) return null;


  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 antialiased flex flex-col justify-between selection:bg-slate-900 selection:text-white" id="main-layout">
      
      {/* Toast Alert Drawer */}
      <Notification toasts={toasts} onClose={handleRemoveToast} />

      {/* Primary Header/Nav Navigation */}
      <Header
        cart={cart}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddToast={handleAddToast}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        onOpenProfile={(tab) => {
          setActiveProfileTab(tab || "profile");
          setIsProfileOpen(true);
        }}
        onOpenProduct={setActiveProduct}
      />

      {/* Main Content Layout */}
      <main className="flex-grow">
        
        {/* Giant Hero Banner Section */}
        <Hero />

        {/* 3-Column New Arrivals Collection Section */}
        <NewArrivals
          onCategoryFilter={setCategoryFilter}
          onAddToast={handleAddToast}
        />

        {/* Double Wide Big Seasonal Sales Section */}
        <BigSale
          onCategoryFilter={setCategoryFilter}
          onAddToast={handleAddToast}
        />

        {/* Masonry-Style Interactive Collections Area */}
        <NewYearCollection
          categoryFilter={categoryFilter}
          onResetFilter={() => setCategoryFilter("")}
          onOpenProduct={setActiveProduct}
          onAddToBag={handleAddToBag}
          onAddToast={handleAddToast}
          searchQuery={searchQuery}
        />

        {/* Cityscape Streetwear Newsletter Form */}
        <Newsletter onAddToast={handleAddToast} />

      </main>

      {/* Editorial Footer */}
      <Footer />

      {/* Floating sliding Shopping Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onAddToast={handleAddToast}
        onPlaceOrder={handlePlaceOrder}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Detailed Product Quick View Dialog Overlay */}
      {activeProduct && (
        <ProductModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onAddToBag={handleAddToBag}
          onSelectProduct={setActiveProduct}
        />
      )}

      {isAuthOpen && (
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      )}
      
      {/* User Profile and Order History Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <UserProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            orders={orders}
            onAddToast={handleAddToast}
            onAddToBag={handleAddToBag}
            onOpenCart={() => setIsCartOpen(true)}
            initialTab={activeProfileTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
