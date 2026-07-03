import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, deleteDoc, getDoc, setDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { Tag, Plus, Trash2, Calendar, Loader2, AlertCircle, RefreshCw, Megaphone, Percent, Sparkles, Layers, Send, Check, Copy, Sliders, Eye, Info, Volume2 } from 'lucide-react';

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

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState<'promo-codes' | 'announcements' | 'bulk-generator' | 'broadcasts'>('promo-codes');
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  // Single Promo Form State
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('');
  const [promoExpiresAt, setPromoExpiresAt] = useState('');
  const [submittingPromo, setSubmittingPromo] = useState(false);

  // Bulk Generator State
  const [bulkPrefix, setBulkPrefix] = useState('SALE');
  const [bulkDiscount, setBulkDiscount] = useState('20');
  const [bulkExpiresAt, setBulkExpiresAt] = useState('');
  const [bulkQuantity, setBulkQuantity] = useState('5');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Announcement State (Rotating announcements in siteContent/hero)
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [updatingAnnouncements, setUpdatingAnnouncements] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [simulatedIndex, setSimulatedIndex] = useState(0);

  // Broadcast Notification State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'promo' | 'new_arrival' | 'system'>('promo');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState({ success: false, message: '' });

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

  // 1. Fetch Promos from Firestore
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loadingPromos) {
        console.warn("Firestore promos timed out. Falling back to local cache.");
        const local = loadLocalPromos();
        setPromos(local);
        setOfflineMode(true);
        setLoadingPromos(false);
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
      setLoadingPromos(false);
    }, (error) => {
      clearTimeout(timeoutId);
      console.error("Firestore loading error:", error);
      const local = loadLocalPromos();
      setPromos(local);
      setOfflineMode(true);
      setLoadingPromos(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, []);

  // 2. Fetch Announcements from siteContent/hero
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const docRef = doc(db, 'siteContent', 'hero');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAnnouncements(docSnap.data().announcements || []);
        } else {
          // Default announcements if none exist
          setAnnouncements([
            "COMPLIMENTARY SHIPPING ON ALL BESPOKE ORDERS OVER $200",
            "USE CODE BTNX50 IN YOUR CART FOR AN EXCLUSIVE 50% OFF",
            "NEW CURATED SUMMER ESSENTIALS COLLECTION IS NOW ONLINE"
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
      }
    };
    fetchAnnouncements();
  }, []);

  // Rotate simulated announcement preview
  useEffect(() => {
    if (announcements.length === 0) return;
    const interval = setInterval(() => {
      setSimulatedIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [announcements]);

  // Copy helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Create single promo
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoDiscount || !promoExpiresAt) return;

    const discountNum = Number(promoDiscount);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      alert("Discount percentage must be between 1 and 100.");
      return;
    }

    setSubmittingPromo(true);
    const newPromoId = 'promo_' + Date.now();
    const cleanCode = promoCode.toUpperCase().trim().replace(/\s+/g, '');

    const newPromo: Promo = {
      id: newPromoId,
      code: cleanCode,
      discountPercentage: discountNum,
      expiresAt: new Date(promoExpiresAt + 'T23:59:59').toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // Optimistic UI updates
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
      console.warn("Saved locally. Firestore write failed:", err);
      setOfflineMode(true);
    }

    setSubmittingPromo(false);
    setIsPromoModalOpen(false);
    setPromoCode('');
    setPromoDiscount('');
    setPromoExpiresAt('');
  };

  // Toggle promo active
  const handleTogglePromoActive = async (promo: Promo) => {
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
      console.warn("Could not update in Firestore. Saved locally:", err);
      setOfflineMode(true);
    }
  };

  // Delete promo
  const handleDeletePromo = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this promo code?")) return;

    const updatedLocal = promos.filter(p => p.id !== id);
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

    try {
      if (!id.startsWith('default-')) {
        await deleteDoc(doc(db, 'promoCodes', id));
      }
    } catch (err) {
      console.warn("Could not delete from Firestore. Removed locally:", err);
      setOfflineMode(true);
    }
  };

  // Reset to default promos
  const handleResetPromoDefaults = () => {
    if (window.confirm("Reset promo codes to system defaults (KLAMBY50, BTNX50)?")) {
      setPromos(DEFAULT_PROMOS);
      localStorage.setItem('klamby_promo_codes', JSON.stringify(DEFAULT_PROMOS));
    }
  };

  // Bulk Promo Code Generator
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

    // Helper to generate 4-character random alphanumeric suffix
    const makeSuffix = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O or 1/I to prevent confusion
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

    // Save to local cache first
    const updatedLocal = [...newPromosToInsert, ...promos];
    setPromos(updatedLocal);
    localStorage.setItem('klamby_promo_codes', JSON.stringify(updatedLocal));

    // Upload to Firestore in parallel
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
      console.warn("Some codes could not be sent to Firestore, but they are stored in local backup.", err);
      setBulkSuccessMsg(`Generated ${qty} codes successfully (stored in local offline cache).`);
      setGeneratedCodes(newGenerated);
      setOfflineMode(true);
    }

    setBulkSubmitting(false);
  };

  // Add rotating announcement banner
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;

    setUpdatingAnnouncements(true);
    setAnnouncementMsg('');

    const updated = [...announcements, newAnnouncement.toUpperCase().trim()];
    setAnnouncements(updated);

    try {
      await setDoc(doc(db, 'siteContent', 'hero'), {
        announcements: updated
      }, { merge: true });
      setAnnouncementMsg("Rotating banners updated successfully on the storefront!");
      setNewAnnouncement('');
    } catch (err) {
      console.error("Failed to save announcement:", err);
      setAnnouncementMsg("Error saving banner. Check internet or permissions.");
    }
    setUpdatingAnnouncements(false);
  };

  // Delete rotating announcement banner
  const handleDeleteAnnouncement = async (indexToDelete: number) => {
    setUpdatingAnnouncements(true);
    setAnnouncementMsg('');

    const updated = announcements.filter((_, idx) => idx !== indexToDelete);
    setAnnouncements(updated);

    try {
      await setDoc(doc(db, 'siteContent', 'hero'), {
        announcements: updated
      }, { merge: true });
      setAnnouncementMsg("Rotating banner deleted successfully!");
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      setAnnouncementMsg("Failed to update banners in database.");
    }
    setUpdatingAnnouncements(false);
  };

  // Reset Announcements
  const handleResetAnnouncements = async () => {
    if (!window.confirm("Reset rotating announcement bar to defaults?")) return;
    setUpdatingAnnouncements(true);
    const defaults = [
      "COMPLIMENTARY SHIPPING ON ALL BESPOKE ORDERS OVER $200",
      "USE CODE BTNX50 IN YOUR CART FOR AN EXCLUSIVE 50% OFF",
      "NEW CURATED SUMMER ESSENTIALS COLLECTION IS NOW ONLINE"
    ];
    setAnnouncements(defaults);
    try {
      await setDoc(doc(db, 'siteContent', 'hero'), {
        announcements: defaults
      }, { merge: true });
      setAnnouncementMsg("Banners successfully restored to system defaults.");
    } catch (err) {
      console.error(err);
    }
    setUpdatingAnnouncements(false);
  };

  // Broadcast campaign alert
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setSubmittingBroadcast(true);
    setBroadcastStatus({ success: false, message: '' });

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: 'broadcast',
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: broadcastType,
        createdAt: new Date().toISOString(),
        readBy: []
      });

      setBroadcastStatus({
        success: true,
        message: `Successfully broadcasted campaign notification! All customers will view this inside their account alerts.`
      });

      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err) {
      console.error("Failed to broadcast notification:", err);
      setBroadcastStatus({
        success: false,
        message: "Failed to broadcast. Please verify Firestore credentials."
      });
    }
    setSubmittingBroadcast(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-8 px-4 md:px-0">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2">
            Marketing & Campaigns
            {offlineMode && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-mono normal-case tracking-normal">
                <AlertCircle className="w-3 h-3" /> Offline Backup Active
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 font-mono tracking-wider mt-1">MANAGE DISCOUNT CODES, BANNERS, AND BROADCASTS</p>
        </div>
        
        {activeTab === 'promo-codes' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleResetPromoDefaults}
              className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors font-display font-medium uppercase text-xs tracking-wider"
              title="Reset to default codes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={() => setIsPromoModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center gap-2 bg-slate-950 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-sm font-display font-medium uppercase text-xs tracking-wider justify-center"
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
          onClick={() => setActiveTab('promo-codes')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-display text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'promo-codes'
              ? 'border-slate-950 text-slate-950 bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          Promo Codes
        </button>

        <button
          onClick={() => setActiveTab('bulk-generator')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-display text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'bulk-generator'
              ? 'border-slate-950 text-slate-950 bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Bulk Code Gen
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-display text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'announcements'
              ? 'border-slate-950 text-slate-950 bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          Rotating Announcement Bar
        </button>

        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-display text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'broadcasts'
              ? 'border-slate-950 text-slate-950 bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Campaign Broadcasts
        </button>
      </div>

      {/* Tab 1: Promo Codes Table */}
      {activeTab === 'promo-codes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                  <th className="p-4 font-bold">Code</th>
                  <th className="p-4 font-bold">Discount Value</th>
                  <th className="p-4 font-bold">Expiration Limit</th>
                  <th className="p-4 font-bold">Campaign Status</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-mono text-xs uppercase tracking-widest">
                      No active promotion codes found. Create one to begin.
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
                            onClick={() => handleTogglePromoActive(promo)}
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
                          onClick={() => handleDeletePromo(promo.id)}
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

      {/* Tab 2: Bulk Generator */}
      {activeTab === 'bulk-generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Generator panel */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-slate-800" />
              Generator Console
            </h2>
            <p className="text-xs text-slate-400 font-mono tracking-wider mb-6">CREATE BATCH DISCOUNTS IN SECONDS</p>

            <form onSubmit={handleBulkGenerate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Code Prefix</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. VIP, SUMMER"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono uppercase text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Alphanumeric prefix. Suffixes are randomized.</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Discount value (%)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xs font-mono text-slate-400">%</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    placeholder="20"
                    value={bulkDiscount}
                    onChange={(e) => setBulkDiscount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Batch Quantity</label>
                <select
                  value={bulkQuantity}
                  onChange={(e) => setBulkQuantity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-xs font-medium"
                >
                  <option value="5">Generate 5 Promo Codes</option>
                  <option value="10">Generate 10 Promo Codes</option>
                  <option value="25">Generate 25 Promo Codes</option>
                  <option value="50">Generate 50 Promo Codes</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expiry Limit</label>
                <input
                  type="date"
                  required
                  value={bulkExpiresAt}
                  onChange={(e) => setBulkExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={bulkSubmitting}
                className="w-full h-11 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-[10px] tracking-widest rounded-xl uppercase transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {bulkSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading Batch...</span>
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

          {/* Results panel */}
          <div className="lg:col-span-2 bg-slate-50/60 p-6 rounded-2xl border border-slate-200/60 flex flex-col min-h-[400px]">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 mb-1">
              Generated Batch Codes
            </h2>
            <p className="text-xs text-slate-400 font-mono tracking-wider mb-6">VIEW OR COPY GENERATED VALUES</p>

            {bulkSuccessMsg && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold">
                {bulkSuccessMsg}
              </div>
            )}

            {generatedCodes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-dashed border-slate-200">
                <Layers className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">No batch codes generated yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-normal font-medium">Configure options on the left and tap "Run Generator" to insert bulk promo vouchers directly to Firestore.</p>
              </div>
            ) : (
              <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 overflow-y-auto max-h-[350px] custom-scrollbar">
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
                        title="Copy Code"
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

      {/* Tab 3: Rotating Announcement Bar */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Live Simulator View */}
          <div className="lg:col-span-full bg-slate-950 p-6 rounded-3xl border border-slate-900 shadow-lg text-white select-none">
            <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
              <span className="text-[9px] tracking-[0.2em] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                Live Storefront Announcement Simulator
              </span>
              <span className="bg-slate-900 border border-slate-800 text-[8px] font-mono tracking-widest text-emerald-400 px-2 py-0.5 rounded">
                ROTATE SPEED: 5S
              </span>
            </div>

            {/* Simulated Banner Container */}
            <div className="h-10 bg-slate-900 rounded-lg border border-slate-850 flex items-center justify-center relative overflow-hidden px-4">
              {announcements.length === 0 ? (
                <p className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">NO ANNOUNCEMENTS CONFIGURED - ANNOUNCEMENT BAR HIDDEN</p>
              ) : (
                <div className="text-center animate-pulse">
                  <p className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold text-slate-100 text-center">
                    {announcements[simulatedIndex]}
                  </p>
                </div>
              )}
            </div>
            <p className="text-[9px] text-slate-500 font-mono mt-3 leading-normal">
              * The rotating announcement banner sits at the absolute top of the consumer boutique interface. Changes made below reflect live instantly for all visiting buyers.
            </p>
          </div>

          {/* Announcement Editor List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900">
                  Configure Announcement Slides
                </h2>
                <p className="text-xs text-slate-400 font-mono tracking-wider mt-0.5">MANAGE COROUSEL ROTATION CARDS</p>
              </div>
              <button
                type="button"
                onClick={handleResetAnnouncements}
                className="text-[10px] font-mono font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>

            {announcementMsg && (
              <div className="mb-4 p-3 bg-slate-950 border border-slate-900 text-white rounded-xl text-[11px] font-mono tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                {announcementMsg}
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {announcements.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-400">No active banners. Add one below!</p>
                </div>
              ) : announcements.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-xl group hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-mono font-extrabold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      SLIDE {idx + 1}
                    </span>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed uppercase select-all">
                      {item}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteAnnouncement(idx)}
                    disabled={updatingAnnouncements}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* New Announcement Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 mb-1">
                Add New Banner Slide
              </h2>
              <p className="text-xs text-slate-400 font-mono tracking-wider mb-6 font-medium">INSERT INTO ROTATION STREAM</p>

              <form onSubmit={handleAddAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Banner Title / Message</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. COMPLIMENTARY SHIPPING ON ALL BESPOKE PIECES FOR THE NEXT 48 HOURS..."
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    className="w-full text-xs font-semibold p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 resize-none uppercase font-mono shadow-3xs"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block leading-normal font-medium">Banners are automatically styled uppercase. Use clear, concise statements under 80 characters for optimal display width.</span>
                </div>

                <button
                  type="submit"
                  disabled={updatingAnnouncements || !newAnnouncement.trim()}
                  className="w-full h-11 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-[10px] tracking-widest rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {updatingAnnouncements ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Insert Slide</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Broadcasts */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Broadcast form */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-3xs">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 mb-1 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-slate-800" />
              Compose Broadcast Campaign
            </h2>
            <p className="text-xs text-slate-400 font-mono tracking-wider mb-8">DISPATCH STOREWIDE LIVE NOTIFICATIONS TO USERS</p>

            {broadcastStatus.message && (
              <div className={`mb-6 p-4 rounded-xl text-xs font-medium border ${
                broadcastStatus.success 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}>
                {broadcastStatus.message}
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Campaign Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Atelier Summer Release"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full text-xs font-medium px-4 py-3 border border-slate-200 focus:border-slate-900 focus:outline-none rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Campaign Category</label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as any)}
                    className="w-full text-xs font-semibold px-4 py-3 border border-slate-200 focus:border-slate-900 focus:outline-none rounded-xl bg-white"
                  >
                    <option value="promo">Promo & Discount Offers</option>
                    <option value="new_arrival">New Product Arrivals</option>
                    <option value="system">Storefront System Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notification Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell clients about the campaign, the new collection, or the voucher code..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full text-xs font-medium p-4 border border-slate-200 focus:border-slate-900 focus:outline-none rounded-xl resize-none shadow-3xs"
                />
                <span className="text-[10px] text-slate-400 mt-2 block font-medium leading-normal">
                  * Sending a broadcast notification writes directly to the `notifications` collection with a broadcast flag. Every customer will receive it instantly in their vault.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                  className="px-6 h-12 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-[10px] tracking-widest rounded-xl uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {submittingBroadcast ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Campaign</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick guide */}
          <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-3xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-600" />
                Broadcast Dispatcher Guide
              </h3>
              <ul className="space-y-4 text-[11px] font-medium text-slate-500 leading-relaxed list-disc list-inside">
                <li>
                  <span className="font-extrabold text-slate-700">Immediate Delivery</span>: Dispatches alerts instantly without requiring user page reload.
                </li>
                <li>
                  <span className="font-extrabold text-slate-700">Global Coverage</span>: Broadcasts reach 100% of currently registered or future client vaults.
                </li>
                <li>
                  <span className="font-extrabold text-slate-700">Category Tags</span>: Align with standard notification colors so users identify the purpose immediately.
                </li>
              </ul>
            </div>

            <div className="mt-8 border-t border-slate-200/80 pt-4 text-[10px] font-mono text-slate-400">
              <span className="uppercase font-bold block text-slate-500 mb-1">PROMOTION CODE INTEGRATION:</span>
              Remember to create the promo code under the "Promo Codes" tab before broadcasting it, so customers can apply it successfully in their cart drawers.
            </div>
          </div>
        </div>
      )}

      {/* New Promo Code Dialog/Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm select-none">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2.5">
              <Tag className="w-5 h-5 text-slate-800" />
              <h2 className="text-base font-extrabold uppercase tracking-widest">New Promo Code</h2>
            </div>
            
            <form onSubmit={handleCreatePromo} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Promo Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER50"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
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
                  value={promoDiscount}
                  onChange={(e) => setPromoDiscount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expiration Date</label>
                <input
                  type="date"
                  required
                  value={promoExpiresAt}
                  onChange={(e) => setPromoExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 font-mono text-xs"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-display font-bold uppercase tracking-wider text-[10px] border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPromo}
                  className="flex-1 px-4 py-3 rounded-xl font-display font-bold uppercase tracking-wider text-[10px] bg-slate-950 text-white hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                >
                  {submittingPromo && <Loader2 className="w-4 h-4 animate-spin" />}
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
