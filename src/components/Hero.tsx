import { motion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { MARQUEE_ITEMS } from "../data";

export default function Hero() {
  const handleScrollDown = () => {
    const arrivalsSection = document.getElementById("new-arrivals");
    if (arrivalsSection) {
      arrivalsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Duplicate items for endless marquee scroll
  const marqueeElements = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <section id="hero-section" className="relative w-full bg-slate-950 overflow-hidden">
      
      {/* Hero Cover Frame */}
      <div className="relative h-[480px] sm:h-[600px] md:h-[720px] lg:h-[800px] w-full flex items-center justify-center">
        
        {/* Background Image */}
        <div className="absolute inset-0 select-none">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1800"
            alt="BTNX Concept Boutique Store"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
            id="hero-bg-img"
          />
          {/* High Contrast Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/50" />
        </div>

        {/* Big Bold Headline Overlay */}
        <div className="relative z-10 text-center px-4 sm:px-6 md:px-8 max-w-[1440px] mx-auto flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-display text-[55px] sm:text-8xl md:text-[120px] lg:text-[150px] xl:text-[180px] font-extrabold text-white leading-[0.9] tracking-[0.02em] select-none text-shadow-lg"
            id="hero-headline"
          >
            YOUR STYLE IS HERE!
          </motion.h1>
        </div>

        {/* Scroll Down Vertical Indicator */}
        <motion.button
          onClick={handleScrollDown}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="absolute bottom-8 right-6 sm:right-10 md:right-16 z-20 flex flex-col items-center gap-4 text-white hover:opacity-80 transition-opacity cursor-pointer group"
          id="hero-scroll-btn"
        >
          <span className="text-[10px] tracking-[0.3em] font-semibold uppercase [writing-mode:vertical-lr] text-slate-200">
            SCROLL DOWN
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="p-2.5 rounded-full border border-white/40 group-hover:border-white transition-colors"
          >
            <ArrowDown className="w-4 h-4 text-white" />
          </motion.div>
        </motion.button>
      </div>

      {/* Ticker / Marquee Banner */}
      <div 
        className="w-full bg-slate-900 text-white border-t border-b border-slate-800 py-4 overflow-hidden select-none" 
        id="hero-marquee-bar"
      >
        <div className="flex no-scrollbar overflow-x-hidden">
          <div className="animate-marquee flex items-center gap-12 whitespace-nowrap text-sm sm:text-base md:text-lg font-bold tracking-wider uppercase">
            {marqueeElements.map((item, idx) => (
              <span key={idx} className="flex items-center gap-12">
                <span>{item}</span>
                <span className="text-white/40 text-xs font-light">✖</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
