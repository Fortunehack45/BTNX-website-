import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { HERO_SLIDES, NEW_YEAR_PRODUCTS, GALLERY_INDEX_ITEMS } from "../data";
import { Product } from "../types";
import GalleryImage from "./GalleryImage";

interface HeroProps {
  onOpenProduct?: (product: Product) => void;
}

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({
    x: direction >= 0 ? 32 : -32,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? -24 : 24,
    opacity: 0,
  }),
};

export default function Hero({ onOpenProduct }: HeroProps) {
  const navigate = useNavigate();
  const [[activeIndex, direction], setSlide] = useState<[number, number]>([0, 1]);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const totalSlides = HERO_SLIDES.length;
  const currentSlide = HERO_SLIDES[activeIndex];

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const timer = setInterval(() => {
      setSlide(([prev]) => [(prev + 1) % totalSlides, 1]);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, totalSlides]);

  const handlePrev = () => {
    setSlide(([prev]) => [(prev - 1 + totalSlides) % totalSlides, -1]);
  };

  const handleNext = () => {
    setSlide(([prev]) => [(prev + 1) % totalSlides, 1]);
  };

  const handleGoTo = (targetIdx: number) => {
    setSlide(([prev]) => {
      if (targetIdx === prev) return [prev, direction];
      return [targetIdx, targetIdx > prev ? 1 : -1];
    });
  };

  const handleInspectSlide = () => {
    if (currentSlide.productId && onOpenProduct) {
      const target = NEW_YEAR_PRODUCTS.find((p) => p.id === currentSlide.productId);
      if (target) {
        onOpenProduct(target);
        return;
      }
    }
    navigate("/shop");
  };

  const handleScrollToCollection = () => {
    document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero-section"
      className="w-full bg-[#FAF9F7] dark:bg-[#111110] border-b border-[#E6E2DA] dark:border-[#2C2A26] transition-colors duration-200"
    >
      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 py-7 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-stretch">
          {/* Left Editorial Column */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-7 sm:gap-10 py-1 lg:py-6">
            <div className="flex items-center gap-3 text-xs text-[#66625B] dark:text-[#A7A299]">
              <span className="uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium">
                Season 04
              </span>
              <span aria-hidden="true">·</span>
              <span className="uppercase tracking-[0.14em]">Autumn–Winter Lookbook</span>
            </div>

            <div className="space-y-5 sm:space-y-6 my-auto">
              <h1
                id="hero-headline"
                className="font-display text-[clamp(2.4rem,4.8vw,4.6rem)] font-medium leading-[1.03] tracking-[-0.015em] text-[#141413] dark:text-[#F3F1EC] text-balance"
              >
                Tailored streetwear in{" "}
                <em className="italic font-normal text-[#966830] dark:text-[#C89B62]">architectural</em>{" "}
                form.
              </h1>

              <p className="text-[15px] sm:text-base text-[#66625B] dark:text-[#A7A299] leading-[1.68] max-w-md">
                Heavyweight organic cottons, structured wool outerwear, and restrained silhouettes crafted for quiet, everyday permanence.
              </p>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 sm:gap-6 pt-2">
                <button
                  onClick={handleScrollToCollection}
                  id="hero-explore-btn"
                  className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#141413] text-[#FAF9F7] hover:bg-[#2B2A28] dark:bg-[#F3F1EC] dark:text-[#141413] dark:hover:bg-[#E2DFD7] text-xs font-medium uppercase tracking-[0.15em] transition-colors flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer rounded-sm"
                >
                  <span>Explore Collection</span>
                </button>

                <Link
                  to="/shop"
                  className="min-h-[44px] inline-flex items-center justify-center sm:justify-start text-xs font-medium uppercase tracking-[0.15em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] sm:border-b sm:border-[#141413] dark:sm:border-[#F3F1EC] sm:hover:border-[#966830] dark:sm:hover:border-[#C89B62] sm:pb-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Browse Catalog</span>
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex items-center text-xs text-[#66625B] dark:text-[#A7A299]">
              <span>Lagos Atelier · Worldwide Dispatch</span>
            </div>
          </div>

          {/* Right Studio Lookbook Slide Frame */}
          <div className="lg:col-span-7">
            <div
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
                setIsPaused(true);
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current !== null) {
                  const delta = e.changedTouches[0].clientX - touchStartX.current;
                  if (Math.abs(delta) > 40) {
                    if (delta < 0) handleNext();
                    else handlePrev();
                  }
                }
                touchStartX.current = null;
                setIsPaused(false);
              }}
              className="relative h-[360px] sm:h-[490px] lg:h-[600px] bg-[#F4F1EC] dark:bg-[#22211E] overflow-hidden rounded-sm group select-none"
            >
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentSlide.id}
                  custom={direction}
                  variants={SLIDE_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  onClick={handleInspectSlide}
                  className="absolute inset-0 cursor-pointer will-change-transform"
                >
                  <GalleryImage
                    src={currentSlide.image}
                    alt={currentSlide.alt}
                    id="hero-bg-img"
                    className="w-full h-full object-cover object-center"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Full-height multi-stop eased scrim so fade has zero visible edge line */}
              <div className="absolute inset-0 editorial-scrim-bottom pointer-events-none" />

              {/* Flanking Minimal Edge Arrows */}
              {totalSlides > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrev();
                    }}
                    aria-label="Previous lookbook slide"
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#141413]/28 hover:bg-[#141413]/55 text-white border border-white/20 backdrop-blur-[4px] flex items-center justify-center transition-all duration-200 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[1.75]" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    aria-label="Next lookbook slide"
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#141413]/28 hover:bg-[#141413]/55 text-white border border-white/20 backdrop-blur-[4px] flex items-center justify-center transition-all duration-200 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[1.75]" />
                  </button>
                </>
              )}

              {/* Bottom Editorial Caption & Containerless Indicators */}
              <div className="absolute inset-x-0 bottom-0 z-10 px-5 pt-4 pb-11 sm:p-7 flex items-end justify-between gap-4 pointer-events-none">
                <button
                  type="button"
                  onClick={handleInspectSlide}
                  className="text-left group/cap min-w-0 flex-1 sm:pr-28 cursor-pointer pointer-events-auto"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-[#E6C08A] font-medium drop-shadow-xs">
                        {currentSlide.lookNumber} · {currentSlide.subtitle}
                      </p>
                      <p className="font-display text-xl sm:text-2xl text-white tracking-wide truncate mt-0.5 group-hover/cap:underline underline-offset-4 drop-shadow-xs">
                        {currentSlide.title}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </button>
              </div>

              {/* Bare Editorial Dots (No Container Box) */}
              {totalSlides > 1 && (
                <div
                  className="absolute bottom-3.5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-7 sm:bottom-7 z-10 flex items-center gap-2"
                  aria-label="Lookbook slide indicators"
                >
                  {HERO_SLIDES.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoTo(idx);
                      }}
                      aria-label={`View ${slide.lookNumber}`}
                      aria-current={idx === activeIndex ? "true" : undefined}
                      className="p-1 cursor-pointer flex items-center justify-center"
                    >
                      <span
                        className={`block w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          idx === activeIndex
                            ? "bg-white scale-125"
                            : "bg-white/40 hover:bg-white/75"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clean 3-Column Atelier Strip below the split */}
        <div
          id="hero-marquee-bar"
          className="mt-8 sm:mt-10 pt-6 sm:pt-7 border-t border-[#E6E2DA] dark:border-[#2C2A26] grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
        >
          {GALLERY_INDEX_ITEMS.map((item) => (
            <div key={item.code} className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-[#966830] dark:text-[#C89B62] tabular-nums">{item.code}.</span>
              <span className="text-xs font-medium tracking-[0.08em] text-[#141413] dark:text-[#F3F1EC] uppercase">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
