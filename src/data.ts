import { Product, NavItem } from "./types";

export const NAVIGATION_ITEMS: NavItem[] = [
  { label: "Home", href: "#", active: true },
  { label: "New", href: "#new-arrivals" },
  { label: "Sale", href: "#end-year-sale" },
  { label: "Collection", href: "#collection" },
  { label: "Shop", href: "#collection" },
];

export const NEW_ARRIVALS = [
  {
    id: "arr-1",
    title: "UNDER $100.00",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800",
    buttonText: "Shop Now",
    buttonStyle: "white",
    href: "#under-100"
  },
  {
    id: "arr-2",
    title: "MAN",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800",
    buttonText: "Shop Now",
    buttonStyle: "transparent",
    href: "#men"
  },
  {
    id: "arr-3",
    title: "WOMAN",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800",
    buttonText: "Shop Now",
    buttonStyle: "transparent",
    href: "#women"
  }
];

export const END_YEAR_SALES = [
  {
    id: "sale-1",
    title: "THE MODERN CLASSIC",
    description: "Go for women's T-shirts, jeans, dresses, sweatshirts or ankle.",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000",
    buttonText: "Shop Now",
    href: "#modern-classic"
  },
  {
    id: "sale-2",
    title: "THE OLD BUT GOLD",
    description: "Go for women's T-shirts, outer, dresses, blouse or knit.",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=1000",
    buttonText: "Shop Now",
    href: "#old-but-gold"
  }
];

export const NEW_YEAR_PRODUCTS: Product[] = [
  {
    id: "ny-1",
    name: "PURPLE BROKLYN",
    category: "Fashion Woman",
    price: 85,
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600",
    badge: "Hot Choice",
    description: "A comfortable, premium fleece hoody sweatshirt in deep pastel purple. Designed with oversized cuffs, a cozy fleece lining, and standard kangaroo pocket for ultimate street style.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Purple", "Lavendar", "Slate"]
  },
  {
    id: "ny-2",
    name: "CROPPED SPACE",
    category: "Fashion Woman",
    price: 78,
    image: "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?q=80&w=600",
    badge: "Trending",
    description: "A lightweight, cropped check plaid overshirt featuring loose drop shoulders and twin front pockets. Styled effortlessly with beige linen trousers.",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige Plaid", "Grey Plaid", "Charcoal"]
  },
  {
    id: "ny-3",
    name: "BIRMANIA SUNT",
    category: "Fashion Woman",
    price: 70,
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=600",
    badge: "Minimalist",
    description: "Monochromatic comfort. This deep slate-blue pullover sweatshirt is tailored for active lounges, crafted from structured organic cotton with ribbed hems.",
    sizes: ["S", "M", "L"],
    colors: ["Deep Navy", "Forest Green", "Oatmeal"]
  },
  {
    id: "ny-4",
    name: "LAYERING ORIGIN",
    category: "Fashion Woman",
    price: 90,
    image: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=600",
    badge: "Unique",
    description: "A multi-tone colorblocked crewneck sweat featuring asymmetrical geometric layers in soft sky blue, chalk white, and light heather grey.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Sky/Cream/Grey", "Terracotta/Sand/Charcoal"]
  },
  {
    id: "ny-5",
    name: "MELBURNE COLLEGE",
    category: "Fashion Woman",
    price: 82,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600",
    badge: "Classic",
    description: "Collegiate heritage-inspired activewear crop paired with cozy shoulder knit cardigans. A signature streetwear aesthetic for dynamic autumn-winter layered layouts.",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Bright Yellow", "Ivory White", "Burgundy"]
  },
  {
    id: "ny-6",
    name: "ROYALE LEATHER",
    category: "Fashion Woman",
    price: 84,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600",
    badge: "Premium",
    description: "A sleek, vegan-leather biker jacket styled with authentic silver hardware accents, diagonal zippers, and a flattering waist-cropped silhouette.",
    sizes: ["S", "M", "L"],
    colors: ["Noir Black", "Deep Espresso", "Vintage Oxblood"]
  }
];

export const MARQUEE_ITEMS = [
  "BTNX Elite Collections",
  "Discount Up to 25%",
  "Best Streetwear in 2026",
  "End Year Sale"
];
