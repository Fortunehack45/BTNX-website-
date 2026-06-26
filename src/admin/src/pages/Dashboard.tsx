import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Package, Users, ShoppingCart, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0 });

  useEffect(() => {
    try {
      const unsubProducts = onSnapshot(query(collection(db, 'products')), (snap) => {
        setStats(s => ({ ...s, products: snap.size }));
      }, (err) => console.error(err));
      
      const unsubOrders = onSnapshot(query(collection(db, 'orders')), (snap) => {
        setStats(s => ({ ...s, orders: snap.size }));
      }, (err) => console.error(err));
      
      const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
        setStats(s => ({ ...s, users: snap.size }));
      }, (err) => console.error(err));

      return () => {
        unsubProducts();
        unsubOrders();
        unsubUsers();
      };
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your store operations</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={<Package className="w-6 h-6" />} title="Total Products" value={stats.products} />
        <StatCard icon={<ShoppingCart className="w-6 h-6" />} title="Total Orders" value={stats.orders} />
        <StatCard icon={<Users className="w-6 h-6" />} title="Total Users" value={stats.users} />
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          System Setup Status
        </h2>
        <p className="text-slate-600">
          Backend connection initialized successfully via local configuration file.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: number }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
