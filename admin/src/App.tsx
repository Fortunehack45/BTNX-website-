import React from "react";

export default function AdminApp() {
  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">Products</div>
        <div className="bg-white p-6 rounded-xl shadow">Orders</div>
        <div className="bg-white p-6 rounded-xl shadow">Users</div>
        <div className="bg-white p-6 rounded-xl shadow">Promo Codes</div>
      </div>
    </div>
  );
}
