import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { END_YEAR_SALES } from "../data";
import GalleryImage from "./GalleryImage";
import {
  galleryContainerVariants,
  galleryCardVariants,
  EDITORIAL_VIEWPORT,
} from "../utils/motion";

interface BigSaleProps {
  onCategoryFilter: (category: string) => void;
}

export default function BigSale({ onCategoryFilter }: BigSaleProps) {
  const handleSaleClick = (title: string) => {
    if (title === "The Modern Classic") {
      onCategoryFilter("Women");
    } else {
      onCategoryFilter("Men");
    }
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="end-year-sale" className="w-full bg-[#FAF9F7] dark:bg-[#111110] border-b border-[#E6E2DA] dark:border-[#2C2A26] transition-colors duration-200">
      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-22">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 mb-10 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
          <div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block mb-2">
              Seasonal Archive
            </span>
            <h2
              id="sale-heading"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.01em] text-balance"
            >
              End of Season Focus
            </h2>
          </div>
          <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-sm leading-relaxed">
            Two distinct wardrobe directions curated from the 2026 studio archives.
          </p>
        </div>

        <motion.div
          id="sale-cards-grid"
          variants={galleryContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={EDITORIAL_VIEWPORT}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10"
        >
          {END_YEAR_SALES.map((sale) => (
            <motion.article
              key={sale.id}
              id={`sale-card-${sale.id}`}
              variants={galleryCardVariants}
              onClick={() => handleSaleClick(sale.title)}
              className="relative min-h-[340px] sm:aspect-[16/10] lg:aspect-[4/3] w-full overflow-hidden cursor-pointer group bg-[#141413] rounded-sm"
            >
              <GalleryImage
                src={sale.image}
                alt={sale.title}
                className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 editorial-scrim-bottom pointer-events-none" />

              <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end text-left">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#E6C08A] mb-1.5">
                  {sale.index}
                </span>
                <h3 className="font-display text-3xl sm:text-4xl font-medium text-white mb-2">
                  {sale.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#E6E2DA]/90 max-w-md mb-5 leading-relaxed">
                  {sale.description}
                </p>
                <button
                  type="button"
                  aria-label={sale.buttonText}
                  className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white border-b border-white/60 pb-1 group-hover:border-white w-fit transition-colors cursor-pointer"
                >
                  <span>{sale.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
