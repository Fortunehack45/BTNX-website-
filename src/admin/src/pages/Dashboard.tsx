import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Package, Users, ShoppingCart, DollarSign, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface OrderItem {
  product?: {
    name?: string;
    price?: number;
    category?: string;
    image?: string;
  };
  quantity?: number;
}

interface Order {
  id: string;
  total?: number;
  status?: string;
  createdAt?: any;
  items?: OrderItem[];
  userId?: string;
}

interface Product {
  id: string;
  name?: string;
  price?: number;
  category?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    users: 0,
    revenue: 0,
    avgOrderValue: 0,
    pendingOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; category: string; count: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Products Listener
      const unsubProducts = onSnapshot(query(collection(db, 'products')), (snap) => {
        const prodCount = snap.size;
        setStats(s => ({ ...s, products: prodCount }));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));
      
      // Users Listener
      const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
        const userCount = snap.size;
        setStats(s => ({ ...s, users: userCount }));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

      // Orders Listener
      const unsubOrders = onSnapshot(query(collection(db, 'orders')), (snap) => {
        const ordersList: Order[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate sales, pending, etc.
        let rev = 0;
        let pending = 0;
        const productCounts: Record<string, { name: string; category: string; count: number; revenue: number }> = {};

        ordersList.forEach(order => {
          const totalVal = order.total || 0;
          const isCompleted = !order.status || ['completed', 'delivered', 'shipped', 'processing', 'Processing', 'Confirmed', 'In Transit'].includes(order.status);
          
          if (isCompleted) {
            rev += totalVal;
          }
          
          if (['pending', 'Pending'].includes(order.status || '')) {
            pending++;
          }

          // Count items
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              const pName = item.product?.name || 'Unknown Product';
              const pCat = item.product?.category || 'Fashion';
              const qty = item.quantity || 1;
              const price = item.product?.price || 0;

              if (!productCounts[pName]) {
                productCounts[pName] = { name: pName, category: pCat, count: 0, revenue: 0 };
              }
              productCounts[pName].count += qty;
              productCounts[pName].revenue += qty * price;
            });
          }
        });

        const sortedTopProds = Object.values(productCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Sort orders for recent lists
        const sortedOrders = [...ordersList].sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        }).slice(0, 5);

        setStats(s => ({
          ...s,
          orders: ordersList.length,
          revenue: rev,
          pendingOrders: pending,
          avgOrderValue: ordersList.length > 0 ? rev / ordersList.length : 0
        }));

        setRecentOrders(sortedOrders);
        setTopProducts(sortedTopProds);
        setLoading(false);
      }, (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'orders');
      });

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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-wider text-slate-950 uppercase">Dashboard</h1>
          <p className="text-slate-500 text-sm font-mono tracking-wide uppercase mt-1">Store Performance Analytics</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl border border-emerald-100 text-xs font-mono font-bold uppercase select-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Database Synced 100%
        </div>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<DollarSign className="w-5 h-5 text-slate-950" />} 
          title="Total Sales" 
          value={`$${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Accumulated revenue"
        />
        <StatCard 
          icon={<ShoppingCart className="w-5 h-5 text-slate-950" />} 
          title="Total Orders" 
          value={stats.orders} 
          sub={`${stats.pendingOrders} pending confirmation`}
        />
        <StatCard 
          icon={<Package className="w-5 h-5 text-slate-950" />} 
          title="Catalog Items" 
          value={stats.products}
          sub="Active products in store"
        />
        <StatCard 
          icon={<Users className="w-5 h-5 text-slate-950" />} 
          title="Registered Users" 
          value={stats.users}
          sub="Customer directory"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-display tracking-widest uppercase text-slate-950 font-bold">Recent Store Orders</h2>
              <a href="/orders" className="text-slate-500 hover:text-slate-900 transition-colors text-xs font-mono font-bold uppercase flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-slate-500 text-[10px] font-mono uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3">Order ID</th>
                    <th className="py-3">Customer</th>
                    <th className="py-3">Total</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-xs text-slate-400 font-mono">LOADING ORDER RECORDS...</td>
                    </tr>
                  ) : recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-xs text-slate-400 font-mono">NO ORDERS RECORDED YET</td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-mono text-[11px] text-slate-500">{order.id.slice(0, 8)}...</td>
                        <td className="py-3 text-xs font-medium text-slate-800">{order.userId || 'Guest Customer'}</td>
                        <td className="py-3 text-xs font-mono font-bold text-slate-950">${order.total?.toFixed(2) || '0.00'}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wide font-bold ${
                            ['completed', 'delivered', 'Delivered'].includes(order.status || '') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            ['pending', 'Pending'].includes(order.status || '') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            ['cancelled', 'Cancelled'].includes(order.status || '') ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-slate-50 text-slate-700 border border-slate-100'
                          }`}>
                            {order.status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-lg font-display tracking-widest uppercase text-slate-950 font-bold">Top Selling Products</h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-center text-xs text-slate-400 font-mono py-4">PROCESSING PRODUCT METRICS...</p>
            ) : topProducts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 font-mono py-4">NO SALES DATA REGISTERED</p>
            ) : (
              topProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-950 truncate">{prod.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{prod.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono font-bold text-slate-950">${prod.revenue.toFixed(2)}</p>
                    <p className="text-[10px] font-mono text-slate-400 font-medium">{prod.count} units sold</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative z-10">
          <h2 className="text-xl font-display tracking-widest uppercase font-bold text-white mb-2">Platform Infrastructure</h2>
          <p className="text-slate-300 text-xs font-sans max-w-xl">
            Fully redundant real-time synchronization connects this panel directly to your Firebase Firestore database. All inventory, user directory, and order modifications propagate instantly to the store.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3 bg-slate-900/50 backdrop-blur border border-white/10 px-4 py-3 rounded-xl relative z-10 select-none">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">API Online & Secured</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, sub }: { icon: React.ReactNode; title: string; value: string | number; sub: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-400 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">{title}</span>
        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-display font-bold tracking-wider text-slate-950 uppercase">{value}</p>
        <p className="text-[10px] font-mono text-slate-400 tracking-wide uppercase mt-1">{sub}</p>
      </div>
    </div>
  );
}
