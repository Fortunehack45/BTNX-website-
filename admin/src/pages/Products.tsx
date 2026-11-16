import { useState, useEffect, useRef } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, Edit, Save, ArrowLeft } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

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
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const delCached = localStorage.getItem("btnx_deleted_product_ids");
      const deletedIds: string[] = delCached ? JSON.parse(delCached) : [];
      const cached = localStorage.getItem("btnx_cloud_products");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p: Product) => !deletedIds.includes(p.id));
        }
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dedicated Full-Page Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const formSubmitRef = useRef<HTMLButtonElement>(null);

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
    // Load local cached products first
    try {
      const delCached = localStorage.getItem("btnx_deleted_product_ids");
      const deletedIds: string[] = delCached ? JSON.parse(delCached) : [];
      const cached = localStorage.getItem("btnx_cloud_products");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed.filter((p: Product) => !deletedIds.includes(p.id)));
          setLoading(false);
        }
      }
    } catch {}

    const unsub = onSnapshot(query(collection(db, 'products')), (snap) => {
      const delCached = localStorage.getItem("btnx_deleted_product_ids");
      const deletedIds: string[] = delCached ? JSON.parse(delCached) : [];
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      const validProds = prods.filter(p => !deletedIds.includes(p.id));
      setProducts(prev => {
        const map = new Map<string, Product>();
        try {
          const cached = localStorage.getItem("btnx_cloud_products");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              parsed
                .filter((p: Product) => !deletedIds.includes(p.id))
                .forEach((p: Product) => map.set(p.id, p));
            }
          }
        } catch {}
        prev
          .filter(p => !deletedIds.includes(p.id))
          .forEach(p => map.set(p.id, p));
        validProds.forEach(p => map.set(p.id, { ...map.get(p.id), ...p }));
        const merged = Array.from(map.values()).filter(p => !deletedIds.includes(p.id));
        try {
          localStorage.setItem("btnx_cloud_products", JSON.stringify(merged));
        } catch {}
        return merged;
      });
      setLoading(false);
    }, (err) => {
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'products');
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
      image: IMAGE_PLACEHOLDERS[0].url,
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
    if (window.confirm("Are you sure you want to permanently delete this product?")) {
      const currentDeleted: string[] = (() => {
        try {
          const raw = localStorage.getItem("btnx_deleted_product_ids");
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const nextDeleted = currentDeleted.includes(id) ? currentDeleted : [...currentDeleted, id];
      try {
        localStorage.setItem("btnx_deleted_product_ids", JSON.stringify(nextDeleted));
      } catch {}

      setProducts(prev => {
        const next = prev.filter(p => p.id !== id);
        try {
          localStorage.setItem("btnx_cloud_products", JSON.stringify(next));
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("btnx_products_updated"));
        } catch {}
        return next;
      });
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
      try {
        await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {}
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

    const prodId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    const payload: Product = {
      id: prodId,
      name: formData.name.trim(),
      category: formData.category,
      price: parsedPrice,
      originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
      image: formData.image.trim(),
      badge: formData.badge.trim() || undefined,
      description: formData.description.trim(),
      sizes: formData.sizes,
      colors: formData.colors,
      stock: parseInt(formData.stock) || 0
    };

    // Un-delete if previously deleted
    try {
      const delRaw = localStorage.getItem("btnx_deleted_product_ids");
      if (delRaw) {
        const delParsed: string[] = JSON.parse(delRaw);
        if (delParsed.includes(prodId)) {
          const nextDel = delParsed.filter(id => id !== prodId);
          localStorage.setItem("btnx_deleted_product_ids", JSON.stringify(nextDel));
        }
      }
    } catch {}

    setProducts(prev => {
      const exists = prev.some(p => p.id === prodId);
      const next = exists ? prev.map(p => p.id === prodId ? payload : p) : [payload, ...prev];
      try {
        localStorage.setItem("btnx_cloud_products", JSON.stringify(next));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("btnx_products_updated"));
      } catch {}
      return next;
    });

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', prodId), payload as any);
      } else {
        await setDoc(doc(db, 'products', prodId), payload as any);
      }
    } catch {}

    try {
      await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}

    setIsModalOpen(false);
    setEditingProduct(null);
  };

  if (isModalOpen) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
          <div>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
              className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 hover:text-slate-950 mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Products Catalog</span>
            </button>
            <h1 className="text-3xl font-display font-extrabold tracking-wider text-slate-950 uppercase">
              {editingProduct ? `Edit Piece: ${editingProduct.name}` : 'Add New Garment Piece'}
            </h1>
            <p className="text-slate-500 text-xs font-mono tracking-wide uppercase mt-1">
              {editingProduct ? `SKU / Document ID: ${editingProduct.id}` : 'Configure specifications, sizing, imagery and stock levels'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => formSubmitRef.current?.click()}
              className="flex items-center gap-2 bg-slate-950 text-white px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-slate-900 shadow transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingProduct ? 'Save Changes' : 'Publish Product'}</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-mono rounded-xl">
            {error}
          </div>
        )}

        {/* Dedicated Full-Page Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <button ref={formSubmitRef} type="submit" className="hidden" aria-hidden="true" />
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
                01. Core Product Identity &amp; Pricing
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Purple Brooklyn Heavyweight Fleece Hoodie"
                  className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Collection Category
                </label>
                <CustomSelect
                  value={formData.category}
                  onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                  options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                  ariaLabel="Collection Category"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Stock Units Available
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="45"
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Price ($ USD / ₦ Equivalent) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Compare Price (Original / Slash Price)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={e => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                  placeholder="Optional"
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 transition-colors"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Editorial Badge Tag
                </label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={e => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                  placeholder="e.g. NEW RELEASE, LIMITED, 20% OFF"
                  className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
                02. Lookbook Image &amp; Presets
              </h2>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Main Image URL *
              </label>
              <input
                type="url"
                value={formData.image}
                onChange={e => setFormData(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://images.unsplash.com/..."
                className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 transition-colors"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">PRESET PALETTE:</span>
                {IMAGE_PLACEHOLDERS.map((preset, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setFormData(prev => ({ ...prev, image: preset.url }))}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border cursor-pointer ${
                      formData.image === preset.url
                        ? 'bg-slate-950 border-slate-950 text-white font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'
                    } transition-colors`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {formData.image && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-16 h-20 object-cover rounded-lg border border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=100&auto=format&fit=crop";
                    }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Live Image Preview</span>
                    <p className="text-[10px] font-mono text-slate-400 truncate max-w-md">{formData.image}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
                03. Available Sizes &amp; Colorways
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Sizes ({formData.sizes.length} Selected)
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {SIZES_OPTIONS.map(sz => {
                    const active = formData.sizes.includes(sz);
                    return (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => handleCheckboxChange('sizes', sz)}
                        className={`text-xs font-mono font-bold w-11 h-11 border rounded-xl transition-all cursor-pointer ${
                          active 
                            ? 'bg-slate-950 border-slate-950 text-white shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Colorways ({formData.colors.length} Selected)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS_OPTIONS.map(col => {
                    const active = formData.colors.includes(col);
                    return (
                      <button
                        type="button"
                        key={col}
                        onClick={() => handleCheckboxChange('colors', col)}
                        className={`text-xs font-mono font-semibold px-3.5 py-2 border rounded-xl transition-all cursor-pointer ${
                          active 
                            ? 'bg-slate-950 border-slate-950 text-white font-bold shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
                04. Description &amp; Story
              </h2>
            </div>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell clients about this item's material, silhouette, fit, and origin..."
              rows={4}
              className="w-full text-xs px-3.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-950 transition-colors leading-relaxed"
            />
          </div>

          {/* Bottom Persistent Bar */}
          <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 pt-6 gap-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
              className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 hover:text-slate-950 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Return to Products Catalog</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProduct(null);
                }}
                className="px-5 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-slate-950 text-white px-6 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider hover:bg-slate-900 shadow transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
              </button>
            </div>
          </footer>
        </form>
      </div>
    );
  }

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
    </div>
  );
}
