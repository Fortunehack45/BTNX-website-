import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, addDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { Tag, Plus, Trash2, Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface Promo {
  id: string;
  code: string;
  discountPercentage: number;
  expiresAt: string;
  createdAt: string;
  isActive?: boolean;
}

const DEFAULT_PROMOS: Promo[] = [
  {
    id: 'default-1',
    code: 'KLAMBY50',
    discountPercentage: 50,
    expiresAt: '2027-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: 'default-2',
    code: 'BTNX50',
    discountPercentage: 50,
    expiresAt: '2027-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString(),
    isActive: true
  }
];

export default function Promos() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Helper to load fallback promos from localStorage
  const loadLocalPromos = () => {
    try {
      const cached = localStorage.getItem('klamby_promo_codes');
      if (cached) {
        return JSON.parse(cached) as Promo[];
      }
    } catch (e) {
      console.error("Failed to parse cached promos", e);
    }
    return DEFAULT_PROMOS;
  };

  useEffect(() => {
    // Timeout backup so the UI never hangs if firestore is offline or blocking
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Firestore connection timed out. Loading from cache/local state.");
        const local = loadLocalPromos();
        setPromos(local);
        setOfflineMode(true);
        setLoading(false);
      }
    }, 2000);

    const q = query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, (snap) => {
      clearTimeout(timeoutId);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Promo[];
      
      // If Firestore returned items, we cache them and use them
      if (list.length > 0) {
        setPromos(list);
        localStorage.setItem('klamby_promo_codes', JSON.stringify(list));
      } else {
        // If Firestore is empty, load local/cache values
        const local = loadLocalPromos();
        setPromos(local);
      }
      setOfflineMode(false);
      setLoading(false);
    }, (error) => {
      clearTimeout(timeoutId);
      console.error("Firestore onSnapshot error, falling back to offline mode:", error);
      const local = loadLocalPromos();
      setPromos(local);
      setOfflineMode(true);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discount || !expiresAt) return;
    
    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      alert("Discount must be between 1% and 100%");
      return;
    }

    setSubmitting(true);
    const newPromoId = 'promo_' + Date.now();
    const newPromo: Promo = {
      id: newPromoId,
      code: code.toUpperCase().trim().replace(/\s+/g, ''),
      discountPercentage: discountNum,
      expiresAt: new Date(expiresAt + 'T23:59:59').toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // 1. Save to local storage cache immediately
    const updatedLocal = [newPromo, ...promos.filter(p => p.code !== newPromo.code)];
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

    // 2. Try to save to Firestore
    try {
      await setDoc(doc(db, 'promoCodes', newPromoId), {
        code: newPromo.code,
        discountPercentage: newPromo.discountPercentage,
        expiresAt: newPromo.expiresAt,
        createdAt: newPromo.createdAt,
        isActive: true
      });
      console.log("Promo successfully added to Firestore");
    } catch (err) {
      console.warn("Firestore offline or permissions error. Saved in offline local state:", err);
      setOfflineMode(true);
    }

    setSubmitting(false);
    setIsModalOpen(false);
    setCode('');
    setDiscount('');
    setExpiresAt('');
  };

  const handleToggleActive = async (promo: Promo) => {
    const updatedStatus = promo.isActive === false ? true : false;
    
    // 1. Update local storage and UI immediately
    const updatedLocal = promos.map(p => p.id === promo.id ? { ...p, isActive: updatedStatus } : p);
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

    // 2. Try updating in Firestore
    try {
      if (!promo.id.startsWith('default-')) {
        await setDoc(doc(db, 'promoCodes', promo.id), {
          code: promo.code,
          discountPercentage: promo.discountPercentage,
          expiresAt: promo.expiresAt,
          createdAt: promo.createdAt,
          isActive: updatedStatus
        });
      }
      console.log("Promo status successfully toggled in Firestore");
    } catch (err) {
      console.warn("Could not update status in Firestore. Saved locally:", err);
      setOfflineMode(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this promo code?")) return;
    
    // 1. Update local storage and UI immediately
    const updatedLocal = promos.filter(p => p.id !== id);
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

    // 2. Try deleting from Firestore
    try {
      if (!id.startsWith('default-')) {
        await deleteDoc(doc(db, 'promoCodes', id));
      }
      console.log("Promo successfully deleted from Firestore");
    } catch (err) {
      console.warn("Could not delete from Firestore. Removed locally instead:", err);
      setOfflineMode(true);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset to default promo codes (KLAMBY50, BTNX50)?")) {
      setPromos(DEFAULT_PROMOS);
      localStorage.setItem('klamby_promo_codes', JSON.stringify(DEFAULT_PROMOS));
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-0 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2">
            Promo Codes
            {offlineMode && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-mono normal-case tracking-normal">
                <AlertCircle className="w-3 h-3" /> Offline Backup Active
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 font-mono tracking-wider mt-1">MANAGE DISCOUNT CODES</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors font-display font-medium uppercase text-xs tracking-wider"
            title="Reset to standard codes"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center gap-2 bg-slate-950 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-sm font-display font-medium uppercase text-xs tracking-wider justify-center"
          >
            <Plus className="w-4 h-4" />
            Create Promo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-mono tracking-wider text-slate-500 uppercase">
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Discount</th>
                <th className="p-4 font-medium">Expires At</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                    No promo codes active
                  </td>
                </tr>
              ) : promos.map((promo) => {
                const isExpired = new Date(promo.expiresAt) < new Date();
                return (
                  <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md text-xs tracking-wider">
                        {promo.code}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-900 text-sm">{promo.discountPercentage}% OFF</td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono uppercase tracking-wider text-slate-600 bg-slate-50">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(promo.expiresAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      {isExpired ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 border border-red-100">
                          Expired
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(promo)}
                          type="button"
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all border cursor-pointer hover:scale-105 ${
                            promo.isActive !== false
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle status"
                        >
                          {promo.isActive !== false ? "Active" : "Inactive"}
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-display font-bold uppercase tracking-tight">New Promo Code</h2>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Discount Percentage (%)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  placeholder="e.g. 20"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Expiration Date</label>
                <input
                  type="date"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all font-mono"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-display font-bold uppercase tracking-wider text-xs border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 rounded-xl font-display font-bold uppercase tracking-wider text-xs bg-slate-950 text-white hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

