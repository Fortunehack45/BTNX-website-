import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Product } from "../types";

interface SeoManagerProps {
  activeProduct: Product | null;
}

interface RouteMeta {
  title: string;
  description: string;
  robots: string;
}

const DEFAULT_META: RouteMeta = {
  title: "BTNX — Fashion & Everyday Clothing Store",
  description:
    "Welcome to BTNX Store. Shop quality clothing, clean everyday fits, and standout pieces for men and women in Osun with nationwide delivery.",
  robots: "index, follow",
};

const ROUTE_META: Record<string, RouteMeta> = {
  "/": DEFAULT_META,
  "/shop": {
    title: "Shop All Pieces — BTNX Store",
    description:
      "Browse the full BTNX Store collection across menswear, womenswear, and everyday essentials with nationwide delivery.",
    robots: "index, follow",
  },
  "/promos": {
    title: "Promo Codes & Seasonal Sale — BTNX Store",
    description:
      "Check active BTNX Store promo codes, seasonal offers, and markdowns on eligible outerwear, knitwear, and fleece.",
    robots: "index, follow",
  },
  "/saved": {
    title: "Wishlist — BTNX Store",
    description: "View your saved BTNX Store pieces and move favorites straight to your shopping bag.",
    robots: "noindex, nofollow",
  },
  "/bag": {
    title: "Shopping Bag — BTNX Store",
    description: "Review your selected BTNX Store items, apply promo codes, and complete checkout.",
    robots: "noindex, nofollow",
  },
  "/notifications": {
    title: "Notifications — BTNX Store",
    description: "Order updates, shipping confirmations, and seasonal promo alerts for your BTNX Store account.",
    robots: "noindex, nofollow",
  },
  "/track": {
    title: "Track Your Order — BTNX Store",
    description:
      "Track your BTNX Store shipment in real time from our Osun dispatch center to your delivery address nationwide.",
    robots: "index, follow",
  },
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function SeoManager({ activeProduct }: SeoManagerProps) {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname || "/";
    const routeMeta = ROUTE_META[pathname] || DEFAULT_META;
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${pathname}`;
    const previewImageUrl = `${origin}/btnx-og-preview.jpg`;

    const title = activeProduct
      ? `${activeProduct.name} — BTNX Store`
      : routeMeta.title;
    const description = activeProduct?.description
      ? activeProduct.description.slice(0, 158)
      : routeMeta.description;
    const robots = activeProduct ? "index, follow" : routeMeta.robots;

    document.title = title;
    upsertLink("canonical", canonicalUrl);
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", previewImageUrl);
    upsertMeta("property", "og:image:secure_url", previewImageUrl);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", previewImageUrl);

    const existingProductLd = document.getElementById("btnx-product-jsonld");
    if (activeProduct) {
      const ldEl =
        existingProductLd ||
        (() => {
          const s = document.createElement("script");
          s.id = "btnx-product-jsonld";
          s.type = "application/ld+json";
          document.head.appendChild(s);
          return s;
        })();

      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: activeProduct.name,
        description: activeProduct.description || description,
        category: activeProduct.category,
        image: activeProduct.image ? [activeProduct.image] : [previewImageUrl],
        brand: {
          "@type": "Brand",
          name: "BTNX",
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "NGN",
          price: Math.round((activeProduct.price || 0) * 1500),
          availability: "https://schema.org/InStock",
          url: canonicalUrl,
        },
      };
      ldEl.textContent = JSON.stringify(productSchema);
    } else if (existingProductLd) {
      existingProductLd.remove();
    }
  }, [location.pathname, activeProduct]);

  return null;
}
