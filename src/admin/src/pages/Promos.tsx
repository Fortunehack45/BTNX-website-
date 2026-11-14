import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { Tag, Plus, Trash2, Calendar, Loader2, AlertCircle, RefreshCw, Percent, Sparkles, Layers, Check, Copy } from 'lucide-react';
import AdminSelect from '../components/AdminSelect';

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
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  // Single Promo Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk Generator State
  const [bulkPrefix, setBulkPrefix] = useState('SALE');
  const [bulkDiscount, setBulkDiscount] = useState('20');
  const [bulkExpiresAt, setBulkExpiresAt] = useState('');
  const [bulkQuantity, setBulkQuantity] = useState('5');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Copy status helper
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load fallback promos
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
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Firestore promos timed out. Falling back to local cache.");
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
      
      if (list.length > 0) {
        setPromos(list);
        localStorage.setItem('klamby_promo_codes', JSON.stringify(list));
      } else {
        const local = loadLocalPromos();
        setPromos(local);
      }
      setOfflineMode(false);
      setLoading(false);
    }, (error) => {
      clearTimeout(timeoutId);
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'promoCodes');
    });

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, []);

  const handleCopyCode = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedCode(val);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discount || !expiresAt) return;

    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      alert("Discount percentage must be between 1 and 100.");
      return;
    }

    setSubmitting(true);
    const newPromoId = 'promo_' + Date.now();
    const cleanCode = code.toUpperCase().trim().replace(/\s+/g, '');

    const newPromo: Promo = {
      id: newPromoId,
      code: cleanCode,
      discountPercentage: discountNum,
      expiresAt: new Date(expiresAt + 'T23:59:59').toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const updatedLocal = [newPromo, ...promos.filter(p => p.code !== cleanCode)];
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

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
      setSubmitting(false);
      handleFirestoreError(err, OperationType.CREATE, `promoCodes/${newPromoId}`);
    }

    setSubmitting(false);
    setIsModalOpen(false);
    setCode('');
    setDiscount('');
    setExpiresAt('');
  };

  const handleToggleActive = async (promo: Promo) => {
    const updatedStatus = promo.isActive === false ? true : false;
    const updatedLocal = promos.map(p => p.id === promo.id ? { ...p, isActive: updatedStatus } : p);
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

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
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `promoCodes/${promo.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this promo code?")) return;

    const updatedLocal = promos.filter(p => p.id !== id);
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

    try {
      if (!id.startsWith('default-')) {
        await deleteDoc(doc(db, 'promoCodes', id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `promoCodes/${id}`);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset promo codes to system defaults (KLAMBY50, BTNX50)?")) {
      setPromos(DEFAULT_PROMOS);
      localStorage.setItem('klamby_promo_codes', JSON.stringify(DEFAULT_PROMOS));
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(bulkQuantity);
    const pct = Number(bulkDiscount);

    if (isNaN(qty) || qty < 1 || qty > 50) {
      alert("Please generate between 1 and 50 codes at a time.");
      return;
    }
    if (isNaN(pct) || pct < 1 || pct > 100) {
      alert("Discount percentage must be between 1 and 100.");
      return;
    }
    if (!bulkExpiresAt) {
      alert("Please select an expiration date.");
      return;
    }

    setBulkSubmitting(true);
    setBulkSuccessMsg('');
    const newGenerated: string[] = [];
    const newPromosToInsert: Promo[] = [];

    const makeSuffix = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let res = '';
      for (let i = 0; i < 4; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    };

    const cleanPrefix = bulkPrefix.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

    for (let i = 0; i < qty; i++) {
      const uniqueCode = `${cleanPrefix ? cleanPrefix + '-' : ''}${makeSuffix()}`;
      const promoId = 'promo_bulk_' + Date.now() + '_' + i;
      const promoObj: Promo = {
        id: promoId,
        code: uniqueCode,
        discountPercentage: pct,
        expiresAt: new Date(bulkExpiresAt + 'T23:59:59').toISOString(),
        createdAt: new Date().toISOString(),
        isActive: true
      };

      newGenerated.push(uniqueCode);
      newPromosToInsert.push(promoObj);
    }

    const updatedLocal = [...newPromosToInsert, ...promos];
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

    try {
      await Promise.all(
        newPromosToInsert.map(p =>
          setDoc(doc(db, 'promoCodes', p.id), {
            code: p.code,
            discountPercentage: p.discountPercentage,
            expiresAt: p.expiresAt,
            createdAt: p.createdAt,
            isActive: true
          })
        )
      );
      setBulkSuccessMsg(`Successfully generated and uploaded ${qty} codes to the system.`);
      setGeneratedCodes(newGenerated);
    } catch (err) {
      setBulkSubmitting(false);
      handleFirestoreError(err, OperationType.WRITE, 'promoCodes');
    }

    setBulkSubmitting(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-8 px-4 md:px-0">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2">
            Promo & Vouchers
            {offlineMode && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-mono normal-case tracking-normal">
                <AlertCircle className="w-3 h-3" /> Offline Backup Active
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 font-mono tracking-wider mt-1">CONFIG CODES, DISCOUNTS AND BULK CAMPAIGNS</p>
        </div>
        
        {activeTab === 'individual' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors font-display font-medium uppercase text-xs tracking-wider"
              title="Reset to default codes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center gap-2 bg-slate-950 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-sm font-display font-medium uppercase text-xs tracking-wider justify-center cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Promo
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-display text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'individual'
              ? 'border-slate-950 text-slate-950 bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          Promo Codes List
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-display text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'bulk'
              ? 'border-slate-950 text-slate-950 bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Bulk Code Generator
        </button>
      </div>

      {/* Tab 1: Promo List */}
      {activeTab === 'individual' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                  <th className="p-4 font-bold">Code</th>
                  <th className="p-4 font-bold">Discount Percentage</th>
                  <th className="p-4 font-bold">Expiration Date</th>
                  <th className="p-4 font-bold">Campaign Status</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-mono text-xs uppercase tracking-widest">
                      No active promo codes.
                    </td>
                  </tr>
                ) : promos.map((promo) => {
                  const isExpired = new Date(promo.expiresAt) < new Date();
                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-slate-900 bg-slate-100/80 text-xs px-2.5 py-1 rounded-md border border-slate-200/50 tracking-wider">
                            {promo.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(promo.code)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Copy Code"
                          >
                            {copiedCode === promo.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900 text-sm">
                        <span className="inline-flex items-center gap-1 text-slate-950 font-display">
                          <Percent className="w-3.5 h-3.5 text-slate-400" />
                          {promo.discountPercentage}% OFF
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-100">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(promo.expiresAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        {isExpired ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                            Expired
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(promo)}
                            type="button"
                            className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border cursor-pointer hover:scale-105 ${
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
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete code"
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
      )}

      {/* Tab 2: Bulk generator */}
      {activeTab === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-slate-800" />
              Bulk Generator
            </h2>
            <p className="text-xs text-slate-400 font-mono tracking-wider mb-6">CREATE BATCH VOUCHERS IN SECONDS</p>

            <form onSubmit={handleBulkGenerate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Code Prefix</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. SUMMER"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 font-mono uppercase text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Discount Value (%)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  placeholder="20"
                  value={bulkDiscount}
                  onChange={(e) => setBulkDiscount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                <AdminSelect
                  value={bulkQuantity}
                  onChange={(val) => setBulkQuantity(val)}
                  options={[
                    { value: "5", label: "Generate 5 Promo Codes" },
                    { value: "10", label: "Generate 10 Promo Codes" },
                    { value: "25", label: "Generate 25 Promo Codes" },
                    { value: "50", label: "Generate 50 Promo Codes" },
                  ]}
                  triggerClassName="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expiration Date</label>
                <input
                  type="date"
                  required
                  value={bulkExpiresAt}
                  onChange={(e) => setBulkExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={bulkSubmitting}
                className="w-full h-11 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-[10px] tracking-widest rounded-xl uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {bulkSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Generator</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-50/60 p-6 rounded-2xl border border-slate-200/65 flex flex-col min-h-[400px]">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 mb-1">
              Generated Batch Codes
            </h2>
            <p className="text-xs text-slate-400 font-mono tracking-wider mb-6">VIEW OR COPY BATCH OUTPUTS</p>

            {bulkSuccessMsg && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold">
                {bulkSuccessMsg}
              </div>
            )}

            {generatedCodes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-dashed border-slate-200">
                <Layers className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">No batch codes generated yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-normal font-medium">Configure options on the left and tap "Run Generator" to insert bulk codes instantly.</p>
              </div>
            ) : (
              <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 overflow-y-auto max-h-[350px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {generatedCodes.map((code) => (
                    <div 
                      key={code} 
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-lg group hover:border-slate-300 transition-colors"
                    >
                      <span className="font-mono text-xs font-bold text-slate-800">{code}</span>
                      <button
                        onClick={() => handleCopyCode(code)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                      >
                        {copiedCode === code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Promo Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <Tag className="w-5 h-5 text-slate-800" />
              <h2 className="text-base font-extrabold uppercase tracking-widest">New Promo Code</h2>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Promo Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 font-mono text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Discount Percentage (%)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  placeholder="e.g. 20"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expiration Date</label>
                <input
                  type="date"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 font-mono text-xs"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-display font-bold uppercase tracking-wider text-[10px] border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 rounded-xl font-display font-bold uppercase tracking-wider text-[10px] bg-slate-950 text-white hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
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
