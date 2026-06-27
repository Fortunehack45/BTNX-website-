import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Mail, Loader2, Trash2 } from 'lucide-react';

interface NewsletterRequest {
  id: string;
  email: string;
  createdAt: string;
}

export default function Newsletters() {
  const [requests, setRequests] = useState<NewsletterRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'newsletters'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NewsletterRequest[];
      setRequests(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this newsletter request?")) return;
    try {
      await deleteDoc(doc(db, 'newsletters', id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-0">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Mail className="w-6 h-6 text-slate-900" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight uppercase">Newsletter Requests</h1>
          <p className="text-sm text-slate-500 font-mono tracking-wider mt-1">SUBSCRIPTION INQUIRIES</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-display">Subscriber List</h2>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-mono font-bold">
            {requests.length} Total
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-mono tracking-wider text-slate-500 uppercase">
                <th className="p-4 font-medium">Email Address</th>
                <th className="p-4 font-medium">Subscribed On</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                    No newsletter requests yet
                  </td>
                </tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{req.email}</td>
                  <td className="p-4 font-mono text-xs text-slate-500">
                    {new Date(req.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(req.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
