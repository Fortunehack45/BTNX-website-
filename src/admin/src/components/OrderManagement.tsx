import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { Order } from "../../../types";

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const querySnapshot = await getDocs(collection(db, "orders"));
    setOrders(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
  };

  const updateStatus = async (orderId: string, status: Order["status"]) => {
    await updateDoc(doc(db, "orders", orderId), { status });
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Order Management</h2>
      <div className="grid gap-4">
        {orders.map(order => (
          <div key={order.id} className="border p-4 rounded flex justify-between items-center">
            <span>Order #{order.id} - ${order.total} - {order.status}</span>
            <select value={order.status} onChange={e => updateStatus(order.id, e.target.value as Order["status"])}>
              {["pending", "confirmed", "shipped", "delivered", "cancelled"].map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
