import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { Collection } from "../../../types";

export default function CollectionManagement() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    const querySnapshot = await getDocs(collection(db, "collections"));
    setCollections(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Collection)));
  };

  const addCollection = async () => {
    await addDoc(collection(db, "collections"), { name });
    setName("");
    fetchCollections();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Add New Collection</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Collection Name" className="border p-2 w-full mb-2" />
        <button onClick={addCollection} className="bg-slate-900 text-white p-2 w-full rounded">Add Collection</button>
      </div>

      <div className="grid gap-4">
        {collections.map(col => (
          <div key={col.id} className="flex justify-between items-center border p-4 rounded">
            <span>{col.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
