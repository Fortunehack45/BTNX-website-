import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
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
      setError("Failed to load products from database.");
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
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
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
      setError(`Database Error: ${err.message || 'Failed to save product.'}`);
      handleFirestoreError(
        err,
        editingProduct ? OperationType.UPDATE : OperationType.CREATE,
        editingProduct ? `products/${editingProduct.id}` : 'products'
      );
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
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <header className="flex items-center justify-between border-b border-slate-150 px-6 py-4 bg-slate-50">
              <div>
                <h2 className="text-xl font-display font-bold tracking-widest text-slate-950 uppercase">
                  {editingProduct ? 'Edit Product Details' : 'Add New Product'}
                </h2>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {editingProduct ? `ID: ${editingProduct.id}` : 'Create catalog item'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="bg-rose-50 text-rose-800 p-3.5 rounded-xl border border-rose-100 flex items-start gap-2.5 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Product Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Minimalist Wool Trench"
                    className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-950 transition-colors"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-950 transition-colors"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full text-xs font-mono font-bold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-950 transition-colors"
                  />
                </div>

                {/* Original Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Original Price (Discount Compare)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={e => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                    placeholder="Optional (No sale if empty)"
                    className="w-full text-xs font-mono font-bold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-950 transition-colors"
                  />
                </div>

                {/* Image URL */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Image URL</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={e => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full text-xs font-mono px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-950 transition-colors"
                  />
                  {/* Preset Placeholders */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] font-mono text-slate-400 uppercase mr-1">PRESETS:</span>
                    {IMAGE_PLACEHOLDERS.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setFormData(prev => ({ ...prev, image: preset.url }))}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                          formData.image === preset.url
                            ? 'bg-slate-950 border-slate-950 text-white font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'
                        } transition-colors`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Badge */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Product Badge</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={e => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                    placeholder="e.g. NEW, SALE, LIMITED"
                    className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-950 transition-colors"
                  />
                </div>

                {/* Stock */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="100"
                    className="w-full text-xs font-mono px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-950 transition-colors"
                  />
                </div>
              </div>

              {/* Sizes Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Available Sizes</label>
                <div className="flex flex-wrap gap-2.5">
                  {SIZES_OPTIONS.map(sz => {
                    const active = formData.sizes.includes(sz);
                    return (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => handleCheckboxChange('sizes', sz)}
                        className={`text-xs font-mono font-bold w-10 h-10 border rounded-lg transition-all ${
                          active 
                            ? 'bg-slate-950 border-slate-950 text-white shadow-sm scale-95' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Available Colors</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS_OPTIONS.map(col => {
                    const active = formData.colors.includes(col);
                    return (
                      <button
                        type="button"
                        key={col}
                        onClick={() => handleCheckboxChange('colors', col)}
                        className={`text-xs font-mono font-semibold px-3 py-1.5 border rounded-lg transition-all ${
                          active 
                            ? 'bg-slate-950 border-slate-950 text-white font-bold' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Product Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell clients about this item's material, silhouette, fit, and origin..."
                  rows={3}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-950 transition-colors"
                />
              </div>

              {/* Form Buttons */}
              <footer className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-slate-950 text-white px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider hover:bg-slate-900 shadow"
                >
                  <Save className="w-4 h-4" />
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
