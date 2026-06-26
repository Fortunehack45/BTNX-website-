import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ContentManagement() {
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroBgUrl, setHeroBgUrl] = useState("");
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    const docRef = doc(db, "siteContent", "hero");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setHeroHeadline(data.headline);
      setHeroBgUrl(data.bgUrl);
      setAnnouncements(data.announcements || []);
    }
  };

  const saveHero = async () => {
    await updateDoc(doc(db, "siteContent", "hero"), { headline: heroHeadline, bgUrl: heroBgUrl });
    alert("Hero updated!");
  };

  const saveAnnouncements = async () => {
    await updateDoc(doc(db, "siteContent", "hero"), { announcements });
    alert("Announcements updated!");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Content Management</h2>
      <div className="bg-slate-50 p-4 rounded-lg space-y-4">
        <h3 className="font-bold">Hero Section</h3>
        <input value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} placeholder="Headline" className="border p-2 w-full" />
        <input value={heroBgUrl} onChange={e => setHeroBgUrl(e.target.value)} placeholder="Background Image URL" className="border p-2 w-full" />
        <button onClick={saveHero} className="bg-slate-900 text-white p-2 w-full rounded">Save Hero</button>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg space-y-4">
        <h3 className="font-bold">Announcements</h3>
        {announcements.map((ann, i) => (
          <div key={i} className="flex gap-2">
            <input value={ann} onChange={e => {
              const newAnnouncements = [...announcements];
              newAnnouncements[i] = e.target.value;
              setAnnouncements(newAnnouncements);
            }} className="border p-2 w-full" />
            <button onClick={() => setAnnouncements(announcements.filter((_, idx) => idx !== i))} className="text-red-500">Delete</button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} placeholder="New Announcement" className="border p-2 w-full" />
          <button onClick={() => { setAnnouncements([...announcements, newAnnouncement]); setNewAnnouncement(""); }} className="bg-slate-900 text-white p-2 rounded">Add</button>
        </div>
        <button onClick={saveAnnouncements} className="bg-slate-900 text-white p-2 w-full rounded">Save Announcements</button>
      </div>
    </div>
  );
}
