import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, Edit, X, Save, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  description: string;
  sizes?: string[];
  colors?: string[];
  stock?: number;
}

const CATEGORIES = ["Outerwear", "Tops", "Bottoms", "Accessories", "Knitwear", "Footwear"];
const SIZES_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS_OPTIONS = ["Black", "White", "Grey", "Cream", "Olive", "Navy", "Beige", "Charcoal"];

// Premium visual placeholders for easy product creation
const IMAGE_PLACEHOLDERS = [
  { label: "Black Premium Coat", url: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=600&auto=format&fit=crop" },
  { label: "Leather Jacket Classic", url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop" },
  { label: "Minimalist Knit Hoodie", url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=600&auto=format&fit=crop" },
  { label: "Tailored Trousers", url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop" },
  { label: "Wool Scarf Beige", url: "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=600&auto=format&fit=crop" }
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    category: CATEGORIES[0],
    price: '',
    originalPrice: '',
    image: '',
    badge: '',
    description: '',
    sizes: [] as string[],
    colors: [] as string[],
    stock: '100'
  });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'products')), (snap) => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      setProducts(prods);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Failed to load products from database.");
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: CATEGORIES[0],
      price: '',
      originalPrice: '',
      image: IMAGE_PLACEHOLDERS[0].url, // default placeholder
      badge: '',
      description: '',
      sizes: ['S', 'M', 'L'],
      colors: ['Black', 'Grey'],
      stock: '100'
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      category: product.category || CATEGORIES[0],
      price: product.price?.toString() || '',
      originalPrice: product.originalPrice?.toString() || '',
      image: product.image || '',
      badge: product.badge || '',
      description: product.description || '',
      sizes: product.sizes || [],
      colors: product.colors || [],
      stock: product.stock?.toString() || '100'
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleCheckboxChange = (field: 'sizes' | 'colors', value: string) => {
    setFormData(prev => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        console.error(err);
        alert("Failed to delete product from database.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!formData.name.trim()) {
      setError("Product Name is required.");
      return;
    }
    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Please enter a valid price greater than 0.");
      return;
    }
    if (!formData.image.trim()) {
      setError("Please enter an image URL.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      price: parsedPrice,
      originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
      image: formData.image.trim(),
      badge: formData.badge.trim() || null,
      description: formData.description.trim(),
      sizes: formData.sizes,
      colors: formData.colors,
      stock: parseInt(formData.stock) || 0
    };

    try {
      if (editingProduct) {
        // Update
        await updateDoc(doc(db, 'products', editingProduct.id), payload as any);
      } else {
        // Create
        await addDoc(collection(db, 'products'), payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(`Database Error: ${err.message || 'Failed to save product.'}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-wider text-slate-950 uppercase">Products</h1>
          <p className="text-slate-500 text-sm font-mono tracking-wide uppercase mt-1">Manage Store Catalog & Inventory</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-slate-950 text-white px-5 py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-wider hover:bg-slate-900 active:scale-95 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </header>

      {/* Product List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-mono uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Sizes / Colors</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 font-mono">LOADING PRODUCT CATALOG...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 font-mono">NO PRODUCTS REGISTERED IN STORE</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-12 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=100&auto=format&fit=crop";
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950 truncate max-w-xs">{product.name || 'Unnamed'}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate max-w-xs">{product.id}</p>
                          {product.badge && (
                            <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-slate-900 text-white">
                              {product.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-950">${product.price?.toFixed(2) || '0.00'}</span>
                        {product.originalPrice && (
                          <span className="font-mono text-[11px] text-slate-400 line-through">${product.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-xs font-bold ${
                        (product.stock || 0) <= 5 ? 'text-rose-600' : 'text-slate-700'
                      }`}>
                        {product.stock ?? 100} units
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {product.category || 'Fashion'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[9px] font-mono text-slate-400 uppercase mr-1">SZ:</span>
                          {product.sizes?.map(s => (
                            <span key={s} className="text-[9px] font-mono font-bold bg-slate-50 border border-slate-200 px-1 rounded">{s}</span>
                          )) || <span className="text-[9px] text-slate-400">none</span>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[9px] font-mono text-slate-400 uppercase mr-1">CL:</span>
                          {product.colors?.map(c => (
                            <span key={c} className="text-[9px] font-mono font-bold bg-slate-50 border border-slate-200 px-1 rounded">{c}</span>
                          )) || <span className="text-[9px] text-slate-400">none</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-slate-400 hover:text-slate-950 border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded-lg transition-all"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Product"
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

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <header className="flex items-center justify-between border-b border-slate-100 px-8 py-5 bg-slate-50/50">
              <div>
                <span className="text-[9px] font-bold font-mono text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">Atelier Catalog System</span>
                <h2 className="text-2xl font-display font-bold tracking-wider text-slate-950 uppercase mt-1">
                  {editingProduct ? 'Modify Boutique Piece' : 'Introduce New Creation'}
                </h2>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                  {editingProduct ? `Bespoke Identifier: ${editingProduct.id}` : 'Populate store list & configure metadata'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-8">
              {error && (
                <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-100 flex items-start gap-3 text-xs font-mono mb-6">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Grid Wrapper */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Form Controls */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* General Block */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-100 pb-2">1. Essential details</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Product Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Product Title</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Vintage Leather Trench"
                          className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition-colors bg-slate-50/50 focus:bg-white"
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Collection Segment</label>
                        <select
                          value={formData.category}
                          onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-950 transition-colors"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Badge */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Launch Badge</label>
                        <input
                          type="text"
                          value={formData.badge}
                          onChange={e => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                          placeholder="e.g. NEW, 15% OFF, LIMITED"
                          className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition-colors bg-slate-50/50 focus:bg-white"
                        />
                      </div>

                      {/* Stock */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Stock Availability</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formData.stock}
                          onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                          placeholder="100"
                          className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition-colors bg-slate-50/50 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Block */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-100 pb-2">2. Pricing Structure</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Price */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Listing Price ($ USD)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">$</span>
                          <input
                            type="number"
                            required
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="0.00"
                            className="w-full text-xs font-mono font-bold pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition-colors bg-slate-50/50 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Original Price */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Original / Compare Price ($ USD)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">$</span>
                          <input
                            type="number"
                            step="0.01;any"
                            min="0"
                            value={formData.originalPrice}
                            onChange={e => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                            placeholder="No discount if empty"
                            className="w-full text-xs font-mono font-bold pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition-colors bg-slate-50/50 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Styling & Image Block */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-100 pb-2">3. Visual Asset</h3>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Image Asset URL</label>
                      <input
                        type="url"
                        required
                        value={formData.image}
                        onChange={e => setFormData(prev => ({ ...prev, image: e.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition-colors bg-slate-50/50 focus:bg-white"
                      />
                      
                      {/* Presets Grid */}
                      <div className="pt-1.5 space-y-2">
                        <div className="flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">Premium Presets</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {IMAGE_PLACEHOLDERS.map((preset, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setFormData(prev => ({ ...prev, image: preset.url }))}
                              className={`text-[9px] font-mono px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                                formData.image === preset.url
                                  ? 'bg-slate-950 border-slate-950 text-white font-bold shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sizes & Colors Selection */}
                  <div className="space-y-4 pt-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-100 pb-2">4. Sizes & Palette</h3>
                    
                    {/* Sizes Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">Available Sizes</label>
                      <div className="flex flex-wrap gap-2">
                        {SIZES_OPTIONS.map(sz => {
                          const active = formData.sizes.includes(sz);
                          return (
                            <button
                              type="button"
                              key={sz}
                              onClick={() => handleCheckboxChange('sizes', sz)}
                              className={`text-xs font-mono font-bold w-10 h-10 border rounded-xl transition-all active:scale-90 ${
                                active 
                                  ? 'bg-slate-950 border-slate-950 text-white shadow-md scale-95' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-white'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Colors Selection */}
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">Color Segment Palette</label>
                      <div className="flex flex-wrap gap-1.5">
                        {COLORS_OPTIONS.map(col => {
                          const active = formData.colors.includes(col);
                          return (
                            <button
                              type="button"
                              key={col}
                              onClick={() => handleCheckboxChange('colors', col)}
                              className={`text-xs font-mono font-semibold px-3 py-1.5 border rounded-xl transition-all active:scale-95 ${
                                active 
                                  ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-white'
                              }`}
                            >
                              {col}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5 pt-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-950 border-b border-slate-100 pb-2">5. Creative Pitch</h3>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g. A masterful, double-breasted outerwear staple crafted in warm premium virgin wool. Features wide lapels, structured tailoring shoulders, and detailed horn buttons."
                      rows={4}
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 transition-colors bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                </div>

                {/* Right Column: Live Storefront Card Preview */}
                <div className="lg:col-span-5 flex flex-col justify-start">
                  <div className="sticky top-6 bg-slate-50 border border-slate-150 rounded-2xl p-6 select-none space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">Live Storefront Card Preview</h4>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>

                    {/* Premium Product Card Preview */}
                    <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-md group relative max-w-sm mx-auto">
                      
                      {/* Badge Tag */}
                      {(formData.badge || (formData.originalPrice && Number(formData.originalPrice) > Number(formData.price))) && (
                        <span className="absolute top-4 left-4 z-10 bg-slate-950 text-white text-[9px] font-bold font-mono uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                          {formData.badge || 'SALE'}
                        </span>
                      )}

                      {/* Card Image */}
                      <div className="aspect-[4/5] w-full bg-[#f6f6f6] flex items-center justify-center overflow-hidden relative">
                        {formData.image ? (
                          <img 
                            src={formData.image} 
                            alt="Boutique Piece" 
                            className="w-full h-full object-cover object-center transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=600";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300 p-8 text-center space-y-2">
                            <ImageIcon className="w-12 h-12 stroke-[1.5]" />
                            <span className="text-[10px] font-mono uppercase tracking-wider">Asset URL Missing</span>
                          </div>
                        )}
                      </div>

                      {/* Card Details */}
                      <div className="p-5 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold font-mono tracking-widest text-slate-400 uppercase">
                              {formData.category ? `BTNX — ${formData.category}` : "BTNX ATELIER"}
                            </span>
                            <h3 className="text-sm font-semibold text-slate-900 tracking-tight mt-0.5 line-clamp-1">
                              {formData.name || "Untitled Creation"}
                            </h3>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="flex items-baseline gap-2.5 pt-1">
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            ${formData.price ? Number(formData.price).toFixed(2) : "0.00"}
                          </span>
                          {formData.originalPrice && Number(formData.originalPrice) > Number(formData.price) && (
                            <span className="text-xs text-slate-400 font-mono line-through decoration-slate-300">
                              ${Number(formData.originalPrice).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Sizes list preview inside card */}
                        {formData.sizes && formData.sizes.length > 0 && (
                          <div className="pt-2 flex items-center gap-1">
                            <span className="text-[8px] font-bold font-mono text-slate-400 uppercase">Sizes:</span>
                            <div className="flex gap-1 flex-wrap">
                              {formData.sizes.map(sz => (
                                <span key={sz} className="text-[8px] font-bold font-mono bg-slate-50 text-slate-600 px-1 rounded border border-slate-100">
                                  {sz}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Colors list preview inside card */}
                        {formData.colors && formData.colors.length > 0 && (
                          <div className="pt-1 flex items-center gap-1">
                            <span className="text-[8px] font-bold font-mono text-slate-400 uppercase">Colors:</span>
                            <div className="flex gap-1 flex-wrap">
                              {formData.colors.map(col => (
                                <span key={col} className="text-[8px] font-bold font-mono bg-indigo-50/50 text-indigo-700 px-1 rounded border border-indigo-100">
                                  {col}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Stock warning */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
                          <span>Store Segment</span>
                          <span className={`${Number(formData.stock) <= 5 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}`}>
                            {formData.stock ? `${formData.stock} Items Stocked` : "0 Out of Stock"}
                          </span>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Buttons */}
              <footer className="flex items-center justify-end gap-3 border-t border-slate-150 pt-6 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-600 hover:text-slate-950 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-slate-950 text-white px-6 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-slate-900 shadow active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {editingProduct ? 'Save Changes' : 'Publish Product'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
