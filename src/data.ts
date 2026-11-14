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
  alt: "BTNX Store Collection",
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
    title: "Wool Overcoat & Wide Trouser",
    subtitle: "BTNX Collection · Featured Look",
    image: heroGalleryLookbook,
    alt: "BTNX Store Collection",
    productId: "ny-6",
  },
  {
    id: "slide-2",
    lookNumber: "Look 02",
    title: "Royale Cropped Leather Jacket",
    subtitle: "Outerwear · 25% Off",
    image: productRoyaleLeather,
    alt: "Royale Cropped Leather Jacket with zip hardware",
    productId: "ny-6",
  },
  {
    id: "slide-3",
    lookNumber: "Look 03",
    title: "Cropped Space Check Overshirt",
    subtitle: "Womenswear · Brushed Wool Blend",
    image: productCroppedSpace,
    alt: "Cropped Space brushed wool check overshirt",
    productId: "ny-2",
  },
  {
    id: "slide-4",
    lookNumber: "Look 04",
    title: "Birmania Sunt Cotton Crewneck",
    subtitle: "Unisex · 460gsm Heavy Cotton",
    image: productBirmaniaSunt,
    alt: "Birmania Sunt navy raglan crewneck",
    productId: "ny-3",
  },
  {
    id: "slide-5",
    lookNumber: "Look 05",
    title: "Purple Brooklyn Fleece Hoodie",
    subtitle: "Limited Run · Double-Lined Hood",
    image: productPurpleBrooklyn,
    alt: "Purple Brooklyn heavyweight hoodie",
    productId: "ny-1",
  },
  {
    id: "slide-6",
    lookNumber: "Look 06",
    title: "Melburne College Knit Cardigan",
    subtitle: "Knitwear · Horn Button Front",
    image: productMelburneCollege,
    alt: "Melburne College ribbed knit cardigan",
    productId: "ny-5",
  },
];

export const ATELIER_BACKDROP = {
  image: newsletterAtelierBackdrop,
  alt: "BTNX Osun Store",
};

export const NEW_ARRIVALS = [
  {
    id: "arr-1",
    index: "01",
    title: "Under ₦125,000",
    subtitle: "Everyday heavy-cotton staples",
    image: arrivalUnder150k,
    buttonText: "Shop Edit",
    href: "#under-100",
  },
  {
    id: "arr-2",
    index: "02",
    title: "Menswear",
    subtitle: "Wool coats & layered essentials",
    image: arrivalMenswear,
    buttonText: "Shop Edit",
    href: "#men",
  },
  {
    id: "arr-3",
    index: "03",
    title: "Womenswear",
    subtitle: "Tailored coats & relaxed knits",
    image: arrivalWomenswear,
    buttonText: "Shop Edit",
    href: "#women",
  },
];

export const END_YEAR_SALES = [
  {
    id: "sale-1",
    index: "Edit 01",
    title: "The Modern Classic",
    description: "Clean-cut knitwear, monochrome coats, and daily staples.",
    image: campaignModernClassic,
    buttonText: "View Womenswear",
    href: "#modern-classic",
  },
  {
    id: "sale-2",
    index: "Edit 02",
    title: "Heritage Utility",
    description: "Heavy canvas jackets, brushed fleece, and layered outerwear.",
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
      "Heavyweight brushed fleece hoodie in dusty plum. Cut with dropped shoulders, thick ribbed cuffs, a double-lined hood, and a front pocket.",
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
      "Brushed wool-blend check overshirt with a cropped boxy fit, horn buttons, and dual chest pockets. Built to layer easily over tees or knits.",
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
      "Deep navy raglan crewneck knitted from 460gsm loopback organic cotton. Soft inside with sturdy ribbed collars and cuffs.",
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
    badge: "Signature",
    description:
      "Cut-and-sew paneled crewneck made from combed heavyweight cotton jersey in sky blue, chalk white, and heather grey.",
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
      "Ribbed varsity cardigan with contrast trim and horn buttons, shaped for a clean, easy layered fit.",
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
      "Cropped matte vegan-leather moto jacket finished with brushed silver zip hardware, wide lapels, and adjustable waist tabs.",
    sizes: ["S", "M", "L"],
    colors: ["Noir Black", "Deep Espresso", "Oxblood"],
  },
];

export const GALLERY_INDEX_ITEMS = [
  { code: "01", label: "New Drops & Essentials" },
  { code: "02", label: "Fast Nationwide Delivery" },
  { code: "03", label: "50% Off Code: BTNX50" },
];
