import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { PromoCode } from "../../../types";
import { Trash2 } from "lucide-react";

export default function PromoCodeManagement() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [code, setCode] = useState("");
  const [percentage, setPercentage] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    const querySnapshot = await getDocs(collection(db, "promoCodes"));
    setPromoCodes(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PromoCode)));
  };

  const addPromoCode = async () => {
    await addDoc(collection(db, "promoCodes"), { code, percentage, expiryDate });
    setCode("");
    setPercentage(0);
    setExpiryDate("");
    fetchPromoCodes();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Add New Promo Code</h3>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code" className="border p-2 w-full mb-2" />
        <input type="number" value={percentage} onChange={e => setPercentage(Number(e.target.value))} placeholder="Percentage" className="border p-2 w-full mb-2" />
        <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="border p-2 w-full mb-2" />
        <button onClick={addPromoCode} className="bg-slate-900 text-white p-2 w-full rounded">Add Promo Code</button>
      </div>

      <div className="grid gap-4">
        {promoCodes.map(pc => (
          <div key={pc.id} className="flex justify-between items-center border p-4 rounded">
            <span>{pc.code} - {pc.percentage}% (Expires: {pc.expiryDate})</span>
            <button onClick={async () => { await deleteDoc(doc(db, "promoCodes", pc.id)); fetchPromoCodes(); }} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
