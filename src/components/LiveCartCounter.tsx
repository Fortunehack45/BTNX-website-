import { useState, useEffect } from "react";

interface LiveCartCounterProps {
  productId: string;
  variant?: "card" | "detail";
}

export default function LiveCartCounter({ productId, variant = "card" }: LiveCartCounterProps) {
  // Deterministic seed generation from productId characters to ensure consistency across re-renders
  const getInitialCount = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Generate an initial count between 6 and 19
    return Math.abs(hash % 14) + 6;
  };

  const [count, setCount] = useState(() => getInitialCount(productId));

  useEffect(() => {
    // Soft random intervals simulating users adding or removing from cart
    const interval = setInterval(() => {
      setCount((prev) => {
        const change = Math.random() > 0.55 ? 1 : -1;
        const nextCount = prev + change;
        // Keep the count between a realistic high-demand range of 4 to 24
        if (nextCount < 4) return 4;
        if (nextCount > 24) return 24;
        return nextCount;
      });
    }, 8000 + Math.random() * 6000); // 8 - 14 seconds

    return () => clearInterval(interval);
  }, []);

  if (variant === "detail") {
    return (
      <div className="flex items-center gap-2.5 bg-rose-50/70 border border-rose-100/50 px-4 py-2.5 rounded-2xl text-xs text-rose-700 font-medium select-none shadow-2xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        <span>
          High Demand: <span className="font-extrabold text-rose-900">{count} people</span> currently have this in their cart.
        </span>
      </div>
    );
  }

  // Card Variant
  return (
    <div 
      className="absolute top-3 right-3 bg-rose-500/90 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-sm flex items-center gap-1.5 backdrop-blur-xs select-none transition-all duration-300"
      title={`${count} people have this in their cart`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
      </span>
      <span>{count} IN CARTS</span>
    </div>
  );
}
