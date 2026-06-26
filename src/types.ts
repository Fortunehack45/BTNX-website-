export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  createdAt: string;
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

