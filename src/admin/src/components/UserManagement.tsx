import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { User } from "../../../types";

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      setUsers(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">User Management</h2>
      <div className="grid gap-4">
        {users.map(user => (
          <div key={user.id} className="border p-4 rounded">
            <span>{user.name} - {user.email} - {user.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
