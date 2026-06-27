import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users as UsersIcon, ArrowLeft } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Users from './pages/Users';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Products', path: '/products', icon: <Package className="w-5 h-5" /> },
    { name: 'Orders', path: '/orders', icon: <ShoppingCart className="w-5 h-5" /> },
    { name: 'Users', path: '/users', icon: <UsersIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 text-slate-200 flex flex-col hidden md:flex border-r border-slate-900 select-none">
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-900">
          <div className="flex flex-col">
            <span className="text-2xl font-logo-bruno tracking-wider text-white uppercase font-bold">BTNX</span>
            <span className="text-[9px] tracking-[0.2em] font-mono text-slate-400 uppercase font-bold">Admin Panel</span>
          </div>
          <a href="/" className="text-slate-400 hover:text-white transition-colors" title="Back to Store">
            <ArrowLeft className="w-4 h-4" />
          </a>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
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

        <div className="p-4 border-t border-slate-900 text-center">
          <p className="text-[10px] text-slate-500 font-mono tracking-wider">SYSTEM SECURE</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <header className="h-16 md:hidden bg-slate-950 text-white flex items-center justify-between px-4 border-b border-slate-900">
          <div className="flex flex-col">
            <span className="text-xl font-logo-bruno tracking-wider text-white uppercase font-bold">BTNX</span>
            <span className="text-[8px] tracking-[0.2em] font-mono text-slate-400 uppercase font-bold">Admin Panel</span>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`p-2 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-white text-slate-950'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                  title={item.name}
                >
                  {item.icon}
                </Link>
              ))}
            </nav>
            <a href="/" className="text-slate-400 hover:text-white transition-colors" title="Back to Store">
              <ArrowLeft className="w-4 h-4" />
            </a>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-50">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/users" element={<Users />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
