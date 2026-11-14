import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { NEW_ARRIVALS } from "../data";
import GalleryImage from "./GalleryImage";
import {
  galleryContainerVariants,
  galleryCardVariants,
  EDITORIAL_VIEWPORT,
} from "../utils/motion";

interface NewArrivalsProps {
  onCategoryFilter: (category: string) => void;
}

export default function NewArrivals({ onCategoryFilter }: NewArrivalsProps) {
  const handleArrivalClick = (title: string) => {
    if (title.includes("Under")) {
      onCategoryFilter("under-100");
    } else if (title === "Menswear") {
      onCategoryFilter("Men");
    } else if (title === "Womenswear") {
      onCategoryFilter("Women");
    }

    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="new-arrivals" className="w-full bg-white dark:bg-[#191816] border-b border-[#E6E2DA] dark:border-[#2C2A26] transition-colors duration-200">
      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-22">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 mb-10 border-b border-[#E6E2DA] dark:border-[#2C2A26]">
          <div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#966830] dark:text-[#C89B62] font-medium block mb-2">
              Curated Edits
            </span>
            <h2
              id="arrivals-heading"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#141413] dark:text-[#F3F1EC] tracking-[-0.01em] text-balance"
            >
              New Arrivals
            </h2>
          </div>
          <p className="text-sm text-[#66625B] dark:text-[#A7A299] max-w-sm leading-relaxed">
            Seasonal studies in proportion, clean drape, and heavyweight cotton jersey.
          </p>
        </div>

        {/* 3-Column Editorial Gallery */}
        <motion.div
          id="arrivals-grid"
          variants={galleryContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={EDITORIAL_VIEWPORT}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10"
        >
          {NEW_ARRIVALS.map((arrival) => (
            <motion.article
              key={arrival.id}
              id={`arrival-card-${arrival.id}`}
              variants={galleryCardVariants}
              onClick={() => handleArrivalClick(arrival.title)}
              className="group cursor-pointer flex flex-col"
            >
              <div className="aspect-[3/4] w-full overflow-hidden bg-[#F4F1EC] dark:bg-[#22211E] rounded-sm mb-5">
                <GalleryImage
                  src={arrival.image}
                  alt={arrival.title}
                  className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                />
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-[#966830] dark:text-[#C89B62] tabular-nums block mb-1">
                    {arrival.index}
                  </span>
                  <h3 className="font-display text-2xl md:text-xl xl:text-[28px] font-medium text-[#141413] dark:text-[#F3F1EC]">
                    {arrival.title}
                  </h3>
                  <p className="text-xs text-[#66625B] dark:text-[#A7A299] mt-1">{arrival.subtitle}</p>
                </div>

                <span
                  aria-label={`Explore ${arrival.title}`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#141413] dark:text-[#F3F1EC] group-hover:text-[#966830] dark:group-hover:text-[#C89B62] transition-colors shrink-0 pb-0.5 border-b border-transparent group-hover:border-[#966830] dark:group-hover:border-[#C89B62]"
                >
                  <span>{arrival.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
