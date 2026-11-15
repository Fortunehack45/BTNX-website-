import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { HERO_SLIDES, NEW_YEAR_PRODUCTS, GALLERY_INDEX_ITEMS, HeroSlide, LOCAL_PRODUCT_IMAGES, HERO_MEDIA } from "../data";
import { Product } from "../types";
import GalleryImage from "./GalleryImage";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface HeroProps {
  onOpenProduct?: (product: Product) => void;
  products?: Product[];
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

export default function Hero({ onOpenProduct, products }: HeroProps) {
  const navigate = useNavigate();
  const [[activeIndex, direction], setSlide] = useState<[number, number]>([0, 1]);
  const [isPaused, setIsPaused] = useState(false);

  const getPinnedSlides = (sourceProducts?: Product[]): { slides: HeroSlide[]; map: Record<string, Product> } => {
    const list = sourceProducts || [];
    const pinned = list.filter((p) => Boolean(p.isPinnedHero));
    if (pinned.length === 0) {
      if (sourceProducts && sourceProducts.length === 0) {
        return {
          slides: [
            {
              id: "slide-empty",
              lookNumber: "Atelier",
              title: "Collection In Preparation",
              subtitle: "BTNX Store · Nationwide Delivery",
              image: HERO_MEDIA.image,
              alt: "BTNX Collection",
            }
          ],
          map: {}
        };
      }
      return { slides: HERO_SLIDES, map: {} };
    }
    pinned.sort((a, b) => (a.heroOrder ?? 0) - (b.heroOrder ?? 0));
    const dynamicSlides: HeroSlide[] = pinned.map((prod, idx) => {
      const localFallback = prod.id ? LOCAL_PRODUCT_IMAGES[prod.id] : undefined;
      const slideImg = (prod.heroImage && !prod.heroImage.includes("/og/"))
        ? prod.heroImage
        : ((prod.image && !prod.image.includes("/og/")) ? prod.image : (localFallback || prod.heroImage || prod.image));

      return {
        id: `hero-pinned-${prod.id}`,
        lookNumber: prod.heroLookNumber || `Look 0${idx + 1}`,
        title: prod.heroHeadline || prod.name,
        subtitle: prod.heroSubheadline || `${prod.category} · Featured Look`,
        image: slideImg,
        alt: prod.name,
        productId: prod.id,
      };
    });
    const map: Record<string, Product> = {};
    pinned.forEach((p) => {
      map[p.id] = p;
    });
    return { slides: dynamicSlides, map };
  };

  const initialPinned = getPinnedSlides(products);
  const [slides, setSlides] = useState<HeroSlide[]>(initialPinned.slides);
  const [pinnedProductsMap, setPinnedProductsMap] = useState<Record<string, Product>>(initialPinned.map);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (products && products.length > 0) {
      const res = getPinnedSlides(products);
      if (res.slides.length > 0 && res.slides !== HERO_SLIDES) {
        setSlides(res.slides);
        setPinnedProductsMap(res.map);
      }
    }
  }, [products]);

  useEffect(() => {
    try {
      const q = query(collection(db, "products"), where("isPinnedHero", "==", true));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Product[];
            const res = getPinnedSlides(fetched);
            setPinnedProductsMap(res.map);
            setSlides(res.slides);
            setSlide([0, 1]);
          } else if (products && products.length > 0) {
            const res = getPinnedSlides(products);
            setSlides(res.slides);
            setPinnedProductsMap(res.map);
          } else {
            setSlides(HERO_SLIDES);
          }
        },
        () => {
          // If firestore fails or offline, use local products or default lookbook slides
          if (products && products.length > 0) {
            const res = getPinnedSlides(products);
            setSlides(res.slides);
            setPinnedProductsMap(res.map);
          } else {
            setSlides(HERO_SLIDES);
          }
        }
      );
      return () => unsubscribe();
    } catch {
      if (products && products.length > 0) {
        const res = getPinnedSlides(products);
        setSlides(res.slides);
        setPinnedProductsMap(res.map);
      } else {
        setSlides(HERO_SLIDES);
      }
    }
  }, [products]);

  const totalSlides = slides.length;
  const currentSlide = slides[activeIndex] || slides[0] || HERO_SLIDES[0];

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
      const target =
        pinnedProductsMap[currentSlide.productId] ||
        products?.find((p) => p.id === currentSlide.productId) ||
        NEW_YEAR_PRODUCTS.find((p) => p.id === currentSlide.productId);
      if (target) {
        onOpenProduct(target);
        return;
      }
    }
    navigate("/shop");
  };

  const handleScrollToCollection = () => {
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero-section"
      className="w-full bg-[#FAF9F7] dark:bg-[#111110] border-b border-[#E6E2DA] dark:border-[#2C2A26] transition-colors duration-200"
    >
      <div className="w-full max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-6 pt-8 pb-10 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-stretch">
          {/* Left Editorial Column */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-7 sm:gap-10 pb-1 lg:pb-6">
            <div className="flex items-center gap-2.5 text-xs text-[#66625B] dark:text-[#A7A299] whitespace-nowrap">
              <span className="uppercase tracking-[0.16em] text-[#966830] dark:text-[#C89B62] font-medium">
                BTNX Store
              </span>
              <span aria-hidden="true">·</span>
              <span className="uppercase tracking-[0.14em]">Official Collection</span>
            </div>

            <div className="space-y-5 sm:space-y-6 my-auto">
              <h1
                id="hero-headline"
                className="font-display text-[clamp(2.4rem,4.8vw,4.6rem)] font-medium leading-[1.03] tracking-[-0.015em] text-[#141413] dark:text-[#F3F1EC] text-balance"
              >
                Everyday style,{" "}
                <em className="italic font-normal text-[#966830] dark:text-[#C89B62]">done right.</em>
              </h1>

              <p className="text-[15px] sm:text-base text-[#66625B] dark:text-[#A7A299] leading-[1.68] max-w-md">
                Welcome to BTNX. Quality clothing, clean fits, and standout pieces made to keep you looking sharp wherever you go.
              </p>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-3 sm:gap-5 pt-2">
                <button
                  onClick={handleScrollToCollection}
                  id="hero-explore-btn"
                  className="min-h-[46px] sm:min-h-[48px] px-4 sm:px-8 py-3 sm:py-3.5 bg-[#141413] text-[#FAF9F7] hover:bg-[#2B2A28] dark:bg-[#F3F1EC] dark:text-[#141413] dark:hover:bg-[#E2DFD7] text-[11px] sm:text-xs font-medium uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer rounded-sm"
                >
                  <span>Explore Collection</span>
                </button>

                <Link
                  to="/shop"
                  className="min-h-[46px] sm:min-h-[48px] px-4 sm:px-6 py-3 sm:py-3.5 border border-[#E6E2DA] dark:border-[#2C2A26] hover:border-[#141413] dark:hover:border-[#F3F1EC] bg-white/75 dark:bg-[#191816] inline-flex items-center justify-center text-[11px] sm:text-xs font-medium uppercase tracking-[0.12em] sm:tracking-[0.15em] text-[#141413] dark:text-[#F3F1EC] hover:text-[#966830] dark:hover:text-[#C89B62] transition-colors whitespace-nowrap shrink-0 rounded-sm"
                >
                  <span>Browse Catalog</span>
                </Link>
              </div>
            </div>

            <div className="pt-5 sm:pt-6 border-t border-[#E6E2DA] dark:border-[#2C2A26] flex items-center justify-between gap-2 text-xs text-[#66625B] dark:text-[#A7A299]">
              <span className="whitespace-nowrap">Osun Store · Nationwide Delivery</span>
              <span className="font-mono text-[11px] text-[#966830] dark:text-[#C89B62] whitespace-nowrap">
                Code: BTNX50
              </span>
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
                    fallbackSrc={currentSlide.productId ? LOCAL_PRODUCT_IMAGES[currentSlide.productId] : undefined}
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
                  {slides.map((slide, idx) => (
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

        {/* Clean 3-Column Store Highlights Strip below the split */}
        <div
          id="hero-marquee-bar"
          className="mt-8 sm:mt-10 pt-6 sm:pt-7 border-t border-[#E6E2DA] dark:border-[#2C2A26] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6"
        >
          {GALLERY_INDEX_ITEMS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                if (item.code === "01") {
                  document.getElementById("new-arrivals")?.scrollIntoView({ behavior: "smooth" });
                } else if (item.code === "02") {
                  navigate("/shop");
                } else {
                  navigate("/promos");
                }
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
            >
              <span className="font-mono text-xs text-[#966830] dark:text-[#C89B62] tabular-nums shrink-0">
                {item.code}.
              </span>
              <span className="text-[11px] sm:text-xs font-medium tracking-[0.06em] sm:tracking-[0.08em] text-[#141413] dark:text-[#F3F1EC] group-hover:text-[#966830] dark:group-hover:text-[#C89B62] transition-colors uppercase whitespace-nowrap truncate">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
