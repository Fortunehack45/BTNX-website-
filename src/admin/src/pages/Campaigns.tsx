import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { Loader2, Megaphone, Plus, Trash2, RefreshCw, Eye, Info, Send } from 'lucide-react';
import AdminSelect from '../components/AdminSelect';

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState<'announcements' | 'broadcasts'>('announcements');

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

  // 1. Fetch Announcements from siteContent/hero
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
        handleFirestoreError(err, OperationType.GET, 'siteContent/hero');
      }
    };
    fetchAnnouncements();
  }, []);

  // Rotate simulated announcement preview
  useEffect(() => {
    if (announcements.length === 0) return;
    const interval = setInterval(() => {
      setSimulatedIndex((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [announcements]);

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
      setUpdatingAnnouncements(false);
      handleFirestoreError(err, OperationType.WRITE, 'siteContent/hero');
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
      setUpdatingAnnouncements(false);
      handleFirestoreError(err, OperationType.WRITE, 'siteContent/hero');
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
      setUpdatingAnnouncements(false);
      handleFirestoreError(err, OperationType.WRITE, 'siteContent/hero');
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
      setSubmittingBroadcast(false);
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
    }
    setSubmittingBroadcast(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-8 px-4 md:px-0">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2">
            Marketing Campaigns
          </h1>
          <p className="text-sm text-slate-500 font-mono tracking-wider mt-1">MANAGE ROTATING BANNERS AND BROADCAST NOTIFICATIONS</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-display text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'announcements'
              ? 'border-slate-950 text-slate-950 bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
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
          <Send className="w-4 h-4" />
          Campaign Broadcasts
        </button>
      </div>

      {/* Tab 1: Rotating Announcement Bar */}
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
                ROTATE SPEED: 4.5S
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
                <p className="text-xs text-slate-400 font-mono tracking-wider mt-0.5">MANAGE CAROUSEL ROTATION CARDS</p>
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
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer animate-in duration-100"
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

      {/* Tab 2: Broadcasts */}
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
                  <AdminSelect
                    value={broadcastType}
                    onChange={(val) => setBroadcastType(val as any)}
                    options={[
                      { value: "promo", label: "Promo & Discount Offers" },
                      { value: "new_arrival", label: "New Product Arrivals" },
                      { value: "system", label: "Storefront System Alert" },
                    ]}
                    triggerClassName="w-full text-xs font-semibold px-4 py-3 border border-slate-200 rounded-xl bg-white"
                  />
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
              Remember to create the promo code under the "Promo Codes" page first, so customers can apply it successfully in their cart drawers.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
