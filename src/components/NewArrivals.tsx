import { motion } from "motion/react";
import { NEW_ARRIVALS } from "../data";

interface NewArrivalsProps {
  onCategoryFilter: (category: string) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function NewArrivals({ onCategoryFilter, onAddToast }: NewArrivalsProps) {
  const handleArrivalClick = (title: string, href: string) => {
    onAddToast(`Exploring ${title} Arrivals`, "success");
    
    if (title.includes("UNDER")) {
      onCategoryFilter("under-100");
    } else if (title === "MAN") {
      onCategoryFilter("Men");
    } else if (title === "WOMAN") {
      onCategoryFilter("Women");
    }

    const collectionSection = document.getElementById("collection");
    if (collectionSection) {
      collectionSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="new-arrivals" className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-24">
      
      {/* Section Header */}
      <div className="mb-10">
        <h2 
          className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-wider uppercase select-none"
          id="arrivals-heading"
        >
          NEW ARRIVALS
        </h2>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8" id="arrivals-grid">
        {NEW_ARRIVALS.map((arrival) => (
          <motion.div
            key={arrival.id}
            whileHover={{ y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative h-[480px] sm:h-[540px] md:h-[600px] rounded-3xl overflow-hidden shadow-md group cursor-pointer border border-slate-100"
            onClick={() => handleArrivalClick(arrival.title, arrival.href)}
            id={`arrival-card-${arrival.id}`}
          >
            {/* Background Image */}
            <img
              src={arrival.image}
              alt={arrival.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              referrerPolicy="no-referrer"
            />

            {/* Dark Bottom Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300" />

            {/* Title and CTA Overlay */}
            <div className="absolute bottom-10 left-10 right-10 flex flex-col items-start">
              <h3 
                className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-wide mb-5 leading-none select-none"
              >
                {arrival.title}
              </h3>
              
              {arrival.buttonStyle === "white" ? (
                <button
                  className="px-6 py-2.5 bg-white text-slate-900 font-semibold text-sm rounded-full tracking-wider hover:bg-slate-100 active:scale-95 transition-all duration-200"
                  aria-label={`Shop ${arrival.title}`}
                >
                  {arrival.buttonText}
                </button>
              ) : (
                <button
                  className="px-6 py-2.5 bg-transparent text-white border border-white/60 hover:border-white font-semibold text-sm rounded-full tracking-wider hover:bg-white/10 active:scale-95 transition-all duration-200"
                  aria-label={`Shop ${arrival.title}`}
                >
                  {arrival.buttonText}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
