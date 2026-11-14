export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  createdAt: string;
  phone?: string;
  birthday?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingZip?: string;
  shippingCountry?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  description: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  collectionId?: string;
  stock?: number;
  cartCount?: number;

  // Custom Product-level Attributes (Editable in Admin)
  fabricAndCare?: string;
  fitDetails?: string;
  deliveryTimeline?: string; // e.g. "2-4 Business Days"
  packagingType?: string;    // e.g. "Cotton Garment Box"
  returnPolicy?: string;     // e.g. "14-Day Free Exchanges"
  shippingFee?: number;      // Specific fee override (or undefined to use store default)
  isFreeShipping?: boolean;  // Mark product as free shipping

  // Hero Carousel Pinning
  isPinnedHero?: boolean;
  heroOrder?: number;
  heroHeadline?: string;
  heroSubheadline?: string;
  heroLookNumber?: string;
  heroImage?: string;
}

export interface StoreShippingSettings {
  defaultShippingFee: number;
  freeShippingThreshold: number;
  isFreeShippingGlobal: boolean;
  defaultDeliveryTimeline: string;
  defaultPackagingType: string;
  defaultReturnPolicy: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

export interface Order {
  id: string;
  userId?: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled" | "Processing" | "In Transit";
  date: string;
  promoCodeId?: string;
  createdAt?: any;
}

export interface PromoCode {
  id: string;
  code: string;
  percentage: number;
  collectionId?: string;
  expiryDate?: string;
}

export interface Collection {
  id: string;
  name: string;
  promoCodeId?: string;
}

export interface Social {
  id: string;
  platform: string;
  url: string;
}

export interface Newsletter {
  id: string;
  email: string;
  subscribedAt: string;
}

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
  avatar?: string;
}


