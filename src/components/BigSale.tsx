import { motion } from "motion/react";
import { END_YEAR_SALES } from "../data";

interface BigSaleProps {
  onCategoryFilter: (category: string) => void;
  onAddToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function BigSale({ onCategoryFilter, onAddToast }: BigSaleProps) {
  const handleSaleClick = (title: string) => {
    onAddToast(`Navigating to ${title} catalog`, "success");
    
    if (title === "THE MODERN CLASSIC") {
      onCategoryFilter("Women");
    } else {
      onCategoryFilter("Men");
    }

    const collectionSection = document.getElementById("collection");
    if (collectionSection) {
      collectionSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="end-year-sale" className="bg-white max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-16">
      
      {/* Section Title */}
      <div className="mb-10 flex items-center gap-3">
        <h2 
          className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-wider uppercase select-none"
          id="sale-heading"
        >
          END YEAR BIG SALE
        </h2>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="sale-cards-grid">
        {END_YEAR_SALES.map((sale) => (
          <motion.div
            key={sale.id}
            whileHover={{ scale: 0.99 }}
            transition={{ duration: 0.4 }}
            className="relative h-[480px] sm:h-[560px] md:h-[620px] rounded-3xl overflow-hidden shadow-lg cursor-pointer group"
            onClick={() => handleSaleClick(sale.title)}
            id={`sale-card-${sale.id}`}
          >
            {/* Image */}
            <img
              src={sale.image}
              alt={sale.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-[1200ms] ease-out"
              referrerPolicy="no-referrer"
            />

            {/* Dark contrast filter overlay */}
            <div className="absolute inset-0 bg-black/45 group-hover:bg-black/40 transition-colors duration-300" />

            {/* Content centered or aligned beautifully */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 sm:p-12">
              <motion.h3 
                className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-widest uppercase mb-4 leading-tight drop-shadow-md select-none"
              >
                {sale.title}
              </motion.h3>
              
              <p 
                className="font-sans text-sm sm:text-base text-slate-200 max-w-sm mb-8 font-light leading-relaxed tracking-wide drop-shadow-sm select-none"
              >
                {sale.description}
              </p>

              <button
                className="px-8 py-3 bg-transparent text-white border border-white/70 hover:border-white font-semibold text-sm rounded-full tracking-widest hover:bg-white/10 active:scale-95 transition-all duration-200"
                aria-label={sale.buttonText}
              >
                {sale.buttonText.toUpperCase()}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
