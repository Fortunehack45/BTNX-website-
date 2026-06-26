import React, { useState } from "react";
import ProductManagement from "./components/ProductManagement";
import OrderManagement from "./components/OrderManagement";
import UserManagement from "./components/UserManagement";
import PromoCodeManagement from "./components/PromoCodeManagement";
import CollectionManagement from "./components/CollectionManagement";
import SocialManagement from "./components/SocialManagement";
import ContentManagement from "./components/ContentManagement";

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {["products", "orders", "users", "promoCodes", "collections", "socials", "content"].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === tab ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')}
          </button>
        ))}
      </div>
      <div className="bg-white p-6 rounded-xl shadow">
        {activeTab === "products" && <ProductManagement />}
        {activeTab === "orders" && <OrderManagement />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "promoCodes" && <PromoCodeManagement />}
        {activeTab === "collections" && <CollectionManagement />}
        {activeTab === "socials" && <SocialManagement />}
        {activeTab === "content" && <ContentManagement />}
      </div>
    </div>
  );
}
