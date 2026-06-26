import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { Social } from "../../../types";

export default function SocialManagement() {
  const [socials, setSocials] = useState<Social[]>([]);

  useEffect(() => {
    fetchSocials();
  }, []);

  const fetchSocials = async () => {
    const querySnapshot = await getDocs(collection(db, "socials"));
    setSocials(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Social)));
  };

  const updateSocial = async (id: string, url: string) => {
    await updateDoc(doc(db, "socials", id), { url });
    fetchSocials();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Social Management</h2>
      <div className="grid gap-4">
        {socials.map(social => (
          <div key={social.id} className="border p-4 rounded flex justify-between items-center">
            <span>{social.platform}</span>
            <input value={social.url} onChange={e => updateSocial(social.id, e.target.value)} className="border p-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
