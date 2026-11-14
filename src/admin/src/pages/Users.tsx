import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Shield, ShieldAlert, UserCheck, Trash2, Search, CheckCircle2, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  name?: string;
  email?: string;
  role?: 'admin' | 'customer';
  createdAt?: any;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'users')), (snap) => {
      const u = snap.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
      setUsers(u);
      setLoading(false);
    }, (err) => {
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return () => unsub();
  }, []);

  const handleRoleToggle = async (userId: string, currentRole: 'admin' | 'customer') => {
    const nextRole = currentRole === 'admin' ? 'customer' : 'admin';
    if (window.confirm(`Are you sure you want to change this user's role to ${nextRole.toUpperCase()}?`)) {
      setSavingId(userId);
      try {
        await updateDoc(doc(db, 'users', userId), {
          role: nextRole
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      } finally {
        setSavingId(null);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user from the directory? This is irreversible.")) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const cleanSearch = search.toLowerCase();
    return (
      (user.name?.toLowerCase() || '').includes(cleanSearch) ||
      (user.email?.toLowerCase() || '').includes(cleanSearch) ||
      (user.id.toLowerCase()).includes(cleanSearch)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-wider text-slate-950 uppercase">User Directory</h1>
          <p className="text-slate-500 text-sm font-mono tracking-wide uppercase mt-1">Manage Registered Accounts & Privileges</p>
        </div>
      </header>

      {/* Directory Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or directory ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-950 transition-all"
          />
        </div>
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
          Total Registered: {users.length} accounts
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Account ID</th>
                <th className="px-6 py-4">Security Role</th>
                <th className="px-6 py-4">Date Registered</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 font-mono">LOADING USER REGISTRY...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 font-mono">NO USER MATCHES FOUND</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-950 text-white font-mono flex items-center justify-center font-bold text-xs select-none uppercase">
                          {(user.name || 'U').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{user.name || 'Anonymous User'}</p>
                          <p className="text-xs text-slate-500 font-mono">{user.email || 'no-email-recorded'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-400">{user.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide border ${
                        user.role === 'admin' 
                          ? 'bg-slate-950 text-white border-slate-950' 
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {user.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 text-emerald-400" />
                            ADMIN
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            CUSTOMER
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {user.createdAt?.toDate 
                        ? user.createdAt.toDate().toLocaleDateString('en-US', { dateStyle: 'medium' }) 
                        : user.createdAt 
                          ? new Date(user.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })
                          : 'Pre-existing Record'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Role Button */}
                        <button
                          onClick={() => handleRoleToggle(user.id, user.role || 'customer')}
                          disabled={savingId === user.id}
                          className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-950 hover:bg-slate-50 text-slate-600 hover:text-slate-950 transition-all disabled:opacity-50"
                        >
                          {savingId === user.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                          ) : user.role === 'admin' ? (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Demote
                            </>
                          ) : (
                            <>
                              <Shield className="w-3.5 h-3.5" />
                              Promote
                            </>
                          )}
                        </button>
                        
                        {/* Delete User */}
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
