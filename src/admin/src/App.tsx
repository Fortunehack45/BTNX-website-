import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users as UsersIcon, ArrowLeft, Lock, Mail, ShieldAlert, LogOut, Loader2, Bell, Tag, Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Promos from './pages/Promos';
import Campaigns from './pages/Campaigns';
import Newsletters from './pages/Newsletters';

function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" />, mobileIcon: <LayoutDashboard className="w-6 h-6" /> },
    { name: 'Products', path: '/products', icon: <Package className="w-5 h-5" />, mobileIcon: <Package className="w-6 h-6" /> },
    { name: 'Orders', path: '/orders', icon: <ShoppingCart className="w-5 h-5" />, mobileIcon: <ShoppingCart className="w-6 h-6" /> },
    { name: 'Users', path: '/users', icon: <UsersIcon className="w-5 h-5" />, mobileIcon: <UsersIcon className="w-6 h-6" /> },
    { name: 'Alerts', path: '/notifications', icon: <Bell className="w-5 h-5" />, mobileIcon: <Bell className="w-6 h-6" /> },
    { name: 'Promos', path: '/promos', icon: <Tag className="w-5 h-5" />, mobileIcon: <Tag className="w-6 h-6" /> },
    { name: 'Campaigns', path: '/campaigns', icon: <Megaphone className="w-5 h-5" />, mobileIcon: <Megaphone className="w-6 h-6" /> },
    { name: 'News', path: '/newsletters', icon: <Mail className="w-5 h-5" />, mobileIcon: <Mail className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans pb-20 md:pb-0">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 text-slate-200 flex flex-col hidden md:flex border-r border-slate-900 select-none">
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-900">
          <div className="flex flex-col">
            <span className="text-3xl font-logo-anton tracking-wider text-white uppercase">BTNX</span>
            <span className="text-[9px] tracking-[0.2em] font-mono text-slate-400 uppercase font-bold">Admin Panel</span>
          </div>
          <a href="/" className="text-slate-400 hover:text-white transition-colors" title="Back to Store">
            <ArrowLeft className="w-4 h-4" />
          </a>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-white text-slate-950 font-medium shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="text-sm font-medium tracking-wide uppercase font-display text-[13px]">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-900 space-y-2">
          <button
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all font-mono tracking-wider uppercase border border-red-950/55"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <p className="text-[9px] text-slate-600 font-mono tracking-wider text-center pt-1">SYSTEM SECURE</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col relative">
        {/* Mobile Header */}
        <header className="h-16 md:hidden bg-slate-950 text-white flex items-center justify-between px-4 border-b border-slate-900 sticky top-0 z-20">
          <div className="flex flex-col">
            <span className="text-2xl font-logo-anton tracking-wider text-white uppercase">BTNX</span>
            <span className="text-[8px] tracking-[0.2em] font-mono text-slate-400 uppercase font-bold">Admin Panel</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onLogout}
              className="p-2 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
            <a href="/" className="text-slate-400 hover:text-white transition-colors p-2" title="Back to Store">
              <ArrowLeft className="w-5 h-5" />
            </a>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-50">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Liquid Glass Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
        <div className="mx-auto max-w-sm pointer-events-auto bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-[2rem] p-2 flex items-center justify-between overflow-x-auto custom-scrollbar gap-1 relative">
          {/* Subtle gradient shine overlay */}
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-white/10 to-white/40 pointer-events-none" />
          
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center min-w-[50px] p-2 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'text-slate-950 bg-white/80 shadow-sm scale-110'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                {item.mobileIcon}
                <span className={`text-[10px] font-display font-bold uppercase mt-1 tracking-wider ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'} transition-all duration-300`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const isBootstrapAdmin =
          firebaseUser.email?.toLowerCase() === 'fortunedomination@gmail.com' &&
          firebaseUser.emailVerified;
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : null;
          if (userData?.role === 'admin' || isBootstrapAdmin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          setIsAdmin(isBootstrapAdmin);
          if (!isBootstrapAdmin) {
            setAuthChecking(false);
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        }
      } else {
        setIsAdmin(null);
      }
      setAuthChecking(false);
    });

    return () => unsub();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter both email/username and password.');
      return;
    }

    setIsSubmitting(true);
    setLoginError('');

    let actualEmail = email.trim();
    if (actualEmail.toLowerCase() === 'btnx' || actualEmail.toLowerCase() === 'btnx@klamby.com' || actualEmail.toLowerCase() === 'btnx@btnx.com') {
      actualEmail = 'btnx@btnx.com';
    }

    try {
      await signInWithEmailAndPassword(auth, actualEmail, password);
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setLoginError('Invalid administrative credentials. Please try again.');
      } else {
        setLoginError(err.message || 'An error occurred during authentication.');
      }
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google authentication failed:", err);
      setLoginError(err.message || 'Google authentication failed.');
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setAuthChecking(true);
    await signOut(auth);
    setUser(null);
    setIsAdmin(null);
    setAuthChecking(false);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
        <span className="text-xs tracking-[0.3em] font-mono text-slate-400 uppercase font-semibold">INITIALIZING SECURE PORTAL</span>
      </div>
    );
  }

  // Render Login Screen if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-8">
            <span className="text-5xl font-logo-anton tracking-wider text-white block">BTNX</span>
            <span className="text-[9px] tracking-[0.3em] font-mono text-slate-400 uppercase font-bold mt-1.5 block">Atelier Admin Entrance</span>
          </div>

          {loginError && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-2xl text-xs text-red-300 flex items-start gap-2.5 font-mono">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1.5">ATELIER USERNAME / EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. btnx"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full text-xs font-semibold pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-600 text-white transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1.5">PASSCODE</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full text-xs font-semibold pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-600 text-white transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-white text-slate-950 hover:bg-slate-200 disabled:opacity-50 font-bold text-xs font-mono tracking-widest uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : "AUTHENTICATE"}
            </button>
          </form>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-800/80"></div>
            <span className="flex-shrink mx-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-slate-800/80"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full py-3 bg-slate-950 border border-slate-800 hover:border-slate-600 disabled:opacity-50 text-slate-200 font-bold text-xs font-mono tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2.5"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            ACCESS VIA GOOGLE
          </button>
          
          <div className="mt-8 text-center">
            <a href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-mono tracking-wider transition-all">
              <ArrowLeft className="w-3.5 h-3.5" />
              RETURN TO BOUTIQUE
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Render Access Denied if logged in but not an admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-xl font-display font-bold text-white tracking-widest uppercase mb-2">ACCESS CONTROL VIOLATION</h2>
          <p className="text-xs font-mono text-slate-400 tracking-wide uppercase leading-relaxed mb-6">
            Your current account credentials <span className="text-slate-200">({user.email})</span> do not possess Administrative clearance for the BTNX Atelier.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-red-950/40 border border-red-900/40 hover:bg-red-900/30 text-red-200 font-bold text-xs font-mono tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              TRY DIFFERENT CREDENTIALS
            </button>
            <a
              href="/"
              className="w-full py-3 bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-300 font-bold text-xs font-mono tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO STOREFRONT
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Render Dashboard
  return (
    <BrowserRouter>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/users" element={<Users />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/promos" element={<Promos />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/newsletters" element={<Newsletters />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
