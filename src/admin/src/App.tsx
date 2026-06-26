import { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Package, Users, ShoppingCart, Activity } from 'lucide-react';

export default function App() {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0 });

  useEffect(() => {
    // Listeners for stats (if permissions allow)
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your store operations</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard icon={<Package className="w-6 h-6" />} title="Products" value={stats.products} />
          <StatCard icon={<ShoppingCart className="w-6 h-6" />} title="Orders" value={stats.orders} />
          <StatCard icon={<Users className="w-6 h-6" />} title="Users" value={stats.users} />
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            System Status
          </h2>
          <p className="text-slate-600">
            Welcome to the new Admin Panel. To connect to your Firebase backend on Vercel, ensure you have set the following environment variables in your Vercel project settings:
          </p>
          <ul className="list-disc pl-5 mt-4 space-y-1 text-sm text-slate-600 font-mono">
            <li>VITE_FIREBASE_API_KEY</li>
            <li>VITE_FIREBASE_AUTH_DOMAIN</li>
            <li>VITE_FIREBASE_PROJECT_ID</li>
            <li>VITE_FIREBASE_STORAGE_BUCKET</li>
            <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
            <li>VITE_FIREBASE_APP_ID</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: number }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
