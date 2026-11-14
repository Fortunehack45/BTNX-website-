import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, doc, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Bell, Plus, Trash2, Tag, Truck, Sparkles, Megaphone, Search, X, Loader2, Info } from 'lucide-react';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order_status' | 'promo' | 'new_arrival' | 'system';
  createdAt: string;
  readBy?: string[];
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'order_status' | 'promo' | 'new_arrival' | 'system'>('promo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });

    return () => unsub();
  }, []);

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      setError("Please fill out both the title and message fields.");
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: 'broadcast', // Sent to all users
        title: title.trim(),
        message: message.trim(),
        type,
        createdAt: new Date().toISOString(),
        readBy: []
      });

      setTitle('');
      setMessage('');
      setType('promo');
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit broadcast.");
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    if (window.confirm("Are you sure you want to delete this notification? It will be removed from all users' dashboards immediately.")) {
      try {
        await deleteDoc(doc(db, 'notifications', notifId));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `notifications/${notifId}`);
      }
    }
  };

  const filteredNotifs = notifications.filter(notif => {
    const cleanSearch = search.toLowerCase();
    return (
      notif.title.toLowerCase().includes(cleanSearch) ||
      notif.message.toLowerCase().includes(cleanSearch) ||
      notif.type.toLowerCase().includes(cleanSearch)
    );
  });

  const getIcon = (notifType: string) => {
    switch (notifType) {
      case 'order_status':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'promo':
        return <Tag className="w-5 h-5 text-amber-600" />;
      case 'new_arrival':
        return <Sparkles className="w-5 h-5 text-emerald-600" />;
      default:
        return <Megaphone className="w-5 h-5 text-slate-600" />;
    }
  };

  const getColorClass = (notifType: string) => {
    switch (notifType) {
      case 'order_status':
        return 'bg-blue-50 border-blue-100 text-blue-800';
      case 'promo':
        return 'bg-amber-50 border-amber-100 text-amber-800';
      case 'new_arrival':
        return 'bg-emerald-50 border-emerald-100 text-emerald-800';
      default:
        return 'bg-slate-50 border-slate-100 text-slate-800';
    }
  };

  // Stats calculations
  const totalBroadcasts = notifications.filter(n => n.userId === 'broadcast').length;
  const promoCount = notifications.filter(n => n.type === 'promo').length;
  const arrivalsCount = notifications.filter(n => n.type === 'new_arrival').length;
  const systemCount = notifications.filter(n => n.type === 'system').length;

  return (
    <div className="space-y-8 select-none">
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">NOTIFICATIONS HUB</h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">Broadcast promotional alerts and system campaigns</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-950 text-white hover:bg-slate-800 transition-all font-mono text-xs font-bold tracking-widest uppercase rounded-xl shadow-md cursor-pointer border-0 shrink-0"
        >
          <Plus className="w-4 h-4" />
          BROADCAST ALERT
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">TOTAL CAMPAIGNS</p>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">{totalBroadcasts}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">PROMO OFFERS</p>
          <p className="text-2xl font-black text-amber-600 mt-2 font-mono">{promoCount}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">NEW ARRIVALS</p>
          <p className="text-2xl font-black text-emerald-600 mt-2 font-mono">{arrivalsCount}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">SYSTEM BROADCASTS</p>
          <p className="text-2xl font-black text-slate-600 mt-2 font-mono">{systemCount}</p>
        </div>
      </div>

      {/* Main Content: Notifications List */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-wider uppercase font-mono">Transmission Log</h2>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800 transition-all font-mono"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-2" />
            STREAMING LOGS...
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-mono text-xs">
            <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            NO NOTIFICATIONS FOUND IN LOG
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">CHANNEL</th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">TITLE & MESSAGE</th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">TARGET</th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">SENT TIME</th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotifs.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase font-mono border ${getColorClass(notif.type)}`}>
                        {getIcon(notif.type)}
                        {notif.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-xs font-bold text-slate-900 mb-1">{notif.title}</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed break-words">{notif.message}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[11px] font-bold font-mono text-slate-600 uppercase tracking-widest">
                        {notif.userId === 'broadcast' ? '📍 Broadcast' : '👤 Private User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[11px] font-bold font-mono text-slate-400">
                        {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteNotification(notif.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer border-0 bg-transparent"
                        title="Delete Broadcast"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Broadcast Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-100 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4.5 top-4.5 p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-display font-black text-slate-900 tracking-wider uppercase mb-1">COMPOSE BROADCAST</h2>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">Transmit active notifications to client terminals</p>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <Info className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateNotification} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1.5">BROADCAST TYPE</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('promo')}
                    className={`px-3 py-2.5 rounded-xl border text-[11px] font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all ${
                      type === 'promo'
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Promo
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('new_arrival')}
                    className={`px-3 py-2.5 rounded-xl border text-[11px] font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all ${
                      type === 'new_arrival'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    New In
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('system')}
                    className={`px-3 py-2.5 rounded-xl border text-[11px] font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all ${
                      type === 'system'
                        ? 'bg-slate-100 border-slate-300 text-slate-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    System
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1.5">ALERT TITLE</label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive Archive Clearance"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={submitting}
                  className="w-full text-xs font-semibold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1.5">CAMPAIGN MESSAGE</label>
                <textarea
                  placeholder="e.g. Premium handcrafted knitwear and archive outerwear silhouettes are now up to 50% off."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={submitting}
                  rows={4}
                  className="w-full text-xs font-semibold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-slate-800 transition-all font-mono resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="w-1/2 py-3 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-50 font-mono text-xs font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer bg-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 bg-slate-950 hover:bg-slate-800 text-white disabled:opacity-50 font-mono text-xs font-bold tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-0 shadow-md"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "TRANSMIT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
