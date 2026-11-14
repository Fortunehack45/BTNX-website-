import { Product, NavItem } from "./types";

import heroGalleryLookbook from "./assets/images/hero_gallery_lookbook_1794617809161.jpg";
import newsletterAtelierBackdrop from "./assets/images/newsletter_atelier_backdrop_1794617814722.jpg";
import arrivalUnder150k from "./assets/images/arrival_under_150k_1794617809596.jpg";
import arrivalMenswear from "./assets/images/arrival_menswear_1794617809994.jpg";
import arrivalWomenswear from "./assets/images/arrival_womenswear_1794617810666.jpg";
import campaignModernClassic from "./assets/images/campaign_modern_classic_1794617811421.jpg";
import campaignOldButGold from "./assets/images/campaign_old_but_gold_1794617811301.jpg";
import productPurpleBrooklyn from "./assets/images/product_purple_brooklyn_1794617810754.jpg";
import productCroppedSpace from "./assets/images/product_cropped_space_1794617812294.jpg";
import productBirmaniaSunt from "./assets/images/product_birmania_sunt_1794617812300.jpg";
import productLayeringOrigin from "./assets/images/product_layering_origin_1794617814261.jpg";
import productMelburneCollege from "./assets/images/product_melburne_college_1794617814102.jpg";
import productRoyaleLeather from "./assets/images/product_royale_leather_1794617813513.jpg";

export const NAVIGATION_ITEMS: NavItem[] = [
  { label: "Home", href: "/", active: true },
  { label: "New", href: "#new-arrivals" },
  { label: "Collection", href: "#collection" },
  { label: "Shop", href: "/shop" },
  { label: "Promos", href: "/promos" },
];

export const HERO_MEDIA = {
  image: heroGalleryLookbook,
  alt: "BTNX Autumn–Winter Editorial Lookbook in Limestone Gallery",
};

export interface HeroSlide {
  id: string;
  lookNumber: string;
  title: string;
  subtitle: string;
  image: string;
  alt: string;
  productId?: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
    lookNumber: "Look 01",
    title: "Obsidian Wool Overcoat & Draped Trouser",
    subtitle: "Limestone Gallery · Season 04 Opening",
    image: heroGalleryLookbook,
    alt: "BTNX Autumn–Winter Editorial Lookbook in Limestone Gallery",
    productId: "ny-6",
  },
  {
    id: "slide-2",
    lookNumber: "Look 02",
    title: "Royale Leather Cropped Moto",
    subtitle: "Outerwear · 25% Archive Reduction",
    image: productRoyaleLeather,
    alt: "Royale Leather cropped biker silhouette with silver hardware",
    productId: "ny-6",
  },
  {
    id: "slide-3",
    lookNumber: "Look 03",
    title: "Cropped Space Wool Overshirt",
    subtitle: "Womenswear · Brushed Check Tailoring",
    image: productCroppedSpace,
    alt: "Cropped Space brushed wool-blend check overshirt",
    productId: "ny-2",
  },
  {
    id: "slide-4",
    lookNumber: "Look 04",
    title: "Birmania Sunt Loopback Crewneck",
    subtitle: "Unisex · 460gsm Organic Cotton",
    image: productBirmaniaSunt,
    alt: "Birmania Sunt deep slate-navy raglan crewneck",
    productId: "ny-3",
  },
  {
    id: "slide-5",
    lookNumber: "Look 05",
    title: "Purple Brooklyn Heavy Fleece",
    subtitle: "Limited Run · Double-Lined Construction",
    image: productPurpleBrooklyn,
    alt: "Purple Brooklyn structured heavyweight hoodie",
    productId: "ny-1",
  },
  {
    id: "slide-6",
    lookNumber: "Look 06",
    title: "Melburne College Ribbed Cardigan",
    subtitle: "Classic Knitwear · Horn Button Placket",
    image: productMelburneCollege,
    alt: "Melburne College ribbed knit cardigan",
    productId: "ny-5",
  },
];

export const ATELIER_BACKDROP = {
  image: newsletterAtelierBackdrop,
  alt: "BTNX Limestone Atelier Studio",
};

export const NEW_ARRIVALS = [
  {
    id: "arr-1",
    index: "01",
    title: "Under ₦150,000",
    subtitle: "Essential heavy-jersey silhouettes",
    image: arrivalUnder150k,
    buttonText: "Explore Edit",
    href: "#under-100",
  },
  {
    id: "arr-2",
    index: "02",
    title: "Menswear",
    subtitle: "Architectural wool & tailored layers",
    image: arrivalMenswear,
    buttonText: "Explore Edit",
    href: "#men",
  },
  {
    id: "arr-3",
    index: "03",
    title: "Womenswear",
    subtitle: "Draped suiting & studio outerwear",
    image: arrivalWomenswear,
    buttonText: "Explore Edit",
    href: "#women",
  },
];

export const END_YEAR_SALES = [
  {
    id: "sale-1",
    index: "Archive 01",
    title: "The Modern Classic",
    description: "Tailored knitwear, monochrome coats, and structured everyday staples.",
    image: campaignModernClassic,
    buttonText: "View Womenswear",
    href: "#modern-classic",
  },
  {
    id: "sale-2",
    index: "Archive 02",
    title: "Heritage Utility",
    description: "Heavyweight canvas outerwear, organic fleece, and modular layers.",
    image: campaignOldButGold,
    buttonText: "View Menswear",
    href: "#old-but-gold",
  },
];

export const NEW_YEAR_PRODUCTS: Product[] = [
  {
    id: "ny-1",
    name: "Purple Brooklyn",
    category: "Womenswear · Fleece",
    price: 85,
    image: productPurpleBrooklyn,
    images: [productPurpleBrooklyn, arrivalUnder150k, campaignOldButGold],
    badge: "Limited Run",
    description:
      "A structured heavyweight fleece hoodie in dusty plum. Engineered with dropped shoulders, deep ribbed cuffs, a double-lined hood, and a clean kangaroo pocket.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Dusty Plum", "Lavender", "Slate"],
  },
  {
    id: "ny-2",
    name: "Cropped Space",
    category: "Womenswear · Outerwear",
    price: 78,
    originalPrice: 98,
    image: productCroppedSpace,
    images: [productCroppedSpace, arrivalWomenswear, campaignModernClassic],
    badge: "New Season",
    description:
      "A brushed wool-blend cropped check overshirt featuring relaxed shoulders, horn buttons, and twin chest flap pockets. Balanced proportions for high-waisted tailoring.",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige Plaid", "Grey Plaid", "Charcoal"],
  },
  {
    id: "ny-3",
    name: "Birmania Sunt",
    category: "Unisex · Knitwear",
    price: 70,
    originalPrice: 88,
    image: productBirmaniaSunt,
    images: [productBirmaniaSunt, arrivalMenswear, arrivalUnder150k],
    badge: "Core Essential",
    description:
      "Monochromatic poise in 460gsm organic loopback cotton. This deep slate-navy raglan crewneck holds a sculptural drape with wide ribbed trims.",
    sizes: ["S", "M", "L"],
    colors: ["Deep Navy", "Forest Green", "Oatmeal"],
  },
  {
    id: "ny-4",
    name: "Layering Origin",
    category: "Womenswear · Jersey",
    price: 90,
    image: productLayeringOrigin,
    images: [productLayeringOrigin, arrivalUnder150k, productPurpleBrooklyn],
    badge: "Atelier Cut",
    description:
      "An asymmetrical paneled crewneck crafted from combed heavyweight cotton jersey in sky blue, chalk white, and heather grey.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Sky / Chalk / Grey", "Sand / Charcoal"],
  },
  {
    id: "ny-5",
    name: "Melburne College",
    category: "Womenswear · Knitwear",
    price: 82,
    image: productMelburneCollege,
    images: [productMelburneCollege, campaignModernClassic, arrivalWomenswear],
    badge: "Classic",
    description:
      "Heritage-inspired ribbed knit cardigan with contrast tipping and horn button placket, tailored to layer cleanly over cropped knits and pleated trousers.",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Deep Navy", "Ivory White", "Burgundy"],
  },
  {
    id: "ny-6",
    name: "Royale Leather",
    category: "Outerwear · Leather",
    price: 84,
    originalPrice: 112,
    image: productRoyaleLeather,
    images: [productRoyaleLeather, heroGalleryLookbook, campaignOldButGold],
    badge: "Signature",
    description:
      "A supple vegan-leather cropped moto jacket finished with brushed silver asymmetrical zip hardware, crisp notch lapels, and structured waist tabs.",
    sizes: ["S", "M", "L"],
    colors: ["Noir Black", "Deep Espresso", "Oxblood"],
  },
];

export const GALLERY_INDEX_ITEMS = [
  { code: "01", label: "Autumn–Winter 2026 Release" },
  { code: "02", label: "Complimentary Express Dispatch" },
  { code: "03", label: "Private Code: BTNX50" },
];
