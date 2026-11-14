import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { Eye, X, Check, AlertCircle, ShoppingBag, Truck, CheckCircle2, RefreshCw } from 'lucide-react';

interface OrderItem {
  product?: {
    name?: string;
    price?: number;
    image?: string;
    category?: string;
  };
  quantity?: number;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  userId?: string;
  items?: OrderItem[];
  total?: number;
  status?: string;
  createdAt?: any;
  promoCodeId?: string;
}

const STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected order for details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedOrders = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Order[];
      // Sort locally by timestamp or default to newest
      fetchedOrders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setOrders(fetchedOrders);
      setLoading(false);
    }, (err) => {
      setError("Failed to stream orders from database.");
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'orders');
    });

    return () => unsub();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setSavingStatus(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
      // Update selected order in case it is open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setSavingStatus(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-wider text-slate-950 uppercase">Orders</h1>
          <p className="text-slate-500 text-sm font-mono tracking-wide uppercase mt-1">Review & Process Customer Purchases</p>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-100 flex items-center gap-2 text-xs font-mono">
          <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Placement Date</th>
                <th className="px-6 py-4">Customer Directory ID</th>
                <th className="px-6 py-4">Purchased Items</th>
                <th className="px-6 py-4">Amount Paid</th>
                <th className="px-6 py-4">Order Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 font-mono">LOADING ORDER TRANSACTIONS...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 font-mono">NO TRANSACTIONS RECORDED IN SYSTEM</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const itemsCount = order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Order ID */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-slate-950">
                          #{order.id.slice(0, 10).toUpperCase()}...
                        </span>
                      </td>
                      
                      {/* Date */}
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {order.createdAt?.toDate 
                          ? order.createdAt.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) 
                          : 'Recent checkout'}
                      </td>
                      
                      {/* Customer ID */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-600 truncate max-w-[150px] block" title={order.userId}>
                          {order.userId || 'Guest Checkout'}
                        </span>
                      </td>

                      {/* Purchased Items Count */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-slate-400" />
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-950">${order.total?.toFixed(2) || '0.00'}</span>
                      </td>

                      {/* Dynamic Status update */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status || "Pending"}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            disabled={savingStatus === order.id}
                            className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border focus:outline-none transition-all ${
                              savingStatus === order.id ? 'opacity-50' : ''
                            } ${
                              ['Completed', 'Delivered', 'delivered'].includes(order.status || '') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              ['Pending', 'pending'].includes(order.status || '') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              ['Cancelled', 'cancelled'].includes(order.status || '') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {STATUSES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          {savingStatus === order.id && (
                            <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-slate-400 hover:text-slate-950 border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1 text-xs font-mono font-bold uppercase ml-auto"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <header className="flex items-center justify-between border-b border-slate-150 px-6 py-4 bg-slate-50">
              <div>
                <h2 className="text-xl font-display font-bold tracking-widest text-slate-950 uppercase">Order Invoice</h2>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Invoice Ref: #{selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Order Metadata Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 rounded-xl p-4 text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Order Placed On</p>
                  <p className="font-semibold text-slate-800">
                    {selectedOrder.createdAt?.toDate 
                      ? selectedOrder.createdAt.toDate().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'medium' }) 
                      : 'Recent checkout'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Current Status</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedOrder.status || "Pending"}
                      onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                      disabled={savingStatus === selectedOrder.id}
                      className="font-mono font-bold uppercase text-[11px] bg-white border border-slate-200 px-2.5 py-1 rounded focus:outline-none"
                    >
                      {STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1 col-span-2 border-t border-slate-150 pt-3">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Customer ID</p>
                  <p className="font-mono text-slate-700 font-bold truncate">{selectedOrder.userId || 'Guest Client (not registered)'}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Line Items</h3>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.product?.image} 
                          alt={item.product?.name} 
                          className="w-10 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=100&auto=format&fit=crop";
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-950 truncate max-w-xs">{item.product?.name || 'Standard Product'}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.size && (
                              <span className="text-[9px] font-mono bg-slate-100 border border-slate-200 px-1 rounded">SZ: {item.size}</span>
                            )}
                            {item.color && (
                              <span className="text-[9px] font-mono bg-slate-100 border border-slate-200 px-1 rounded">CL: {item.color}</span>
                            )}
                            <span className="text-[9px] font-mono bg-slate-100 border border-slate-200 px-1 rounded">QTY: {item.quantity || 1}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-slate-950">
                          ${((item.product?.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">${item.product?.price || '0.00'} each</p>
                      </div>
                    </div>
                  )) || <p className="text-center text-xs text-slate-400 py-4 font-mono">NO ITEMS ATTACHED TO THIS TRANSACTION</p>}
                </div>
              </div>

              {/* Promo code & Final Bill calculation */}
              <div className="border-t border-slate-150 pt-4 text-xs space-y-2">
                {selectedOrder.promoCodeId && (
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-400">Coupon Discount Used</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[10px] uppercase">
                      {selectedOrder.promoCodeId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-semibold pt-1 border-t border-slate-50">
                  <span className="font-display uppercase tracking-widest text-slate-950 text-base font-bold">Total Bill Paid</span>
                  <span className="font-mono font-bold text-slate-950 text-base">
                    ${selectedOrder.total?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="flex items-center justify-end px-6 py-4 bg-slate-50 border-t border-slate-150">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-slate-950 text-white px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-slate-900 shadow active:scale-95 transition-all"
              >
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
