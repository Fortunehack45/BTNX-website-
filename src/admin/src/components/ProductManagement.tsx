import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Product } from "../../../types";
import { Plus, Trash2, Edit2, X } from "lucide-react";

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [images, setImages] = useState<string[]>([""]);
  const [colors, setColors] = useState("");
  const [sizes, setSizes] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, "products"));
    setProducts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
  };

  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setPrice(product.price);
    setImages(product.images || [""]);
    setColors(product.colors?.join(", ") || "");
    setSizes(product.sizes?.join(", ") || "");
  };

  const saveProduct = async () => {
    const productData = { 
      name, 
      price, 
      images: images.filter(img => img !== ""),
      colors: colors.split(",").map(c => c.trim()).filter(Boolean),
      sizes: sizes.split(",").map(s => s.trim()).filter(Boolean)
    };
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), productData);
      setEditingId(null);
    } else {
      await addDoc(collection(db, "products"), productData);
    }
    setName("");
    setPrice(0);
    setImages([""]);
    setColors("");
    setSizes("");
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-lg">
        <h3 className="font-bold mb-2">{editingId ? "Edit Product" : "Add New Product"}</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="border p-2 w-full mb-2" />
        <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="Price" className="border p-2 w-full mb-2" />
        <input value={colors} onChange={e => setColors(e.target.value)} placeholder="Colors (comma separated)" className="border p-2 w-full mb-2" />
        <input value={sizes} onChange={e => setSizes(e.target.value)} placeholder="Sizes (comma separated)" className="border p-2 w-full mb-2" />
        {images.map((img, i) => (
          <input key={i} value={img} onChange={e => {
            const newImages = [...images];
            newImages[i] = e.target.value;
            setImages(newImages);
          }} placeholder={`Image URL ${i + 1}`} className="border p-2 w-full mb-2" />
        ))}
        {images.length < 10 && <button onClick={() => setImages([...images, ""])} className="text-sm text-blue-600 mb-2">Add Image URL</button>}
        <button onClick={saveProduct} className="bg-slate-900 text-white p-2 w-full rounded">{editingId ? "Save Product" : "Add Product"}</button>
      </div>

      <div className="grid gap-4">
        {products.map(product => (
          <div key={product.id} className="flex justify-between items-center border p-4 rounded">
            <span>{product.name} - ${product.price}</span>
            <div className="flex gap-2">
              <button onClick={() => startEdit(product)} className="text-blue-500"><Edit2 className="w-4 h-4" /></button>
              <button onClick={async () => { await deleteDoc(doc(db, "products", product.id)); fetchProducts(); }} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
