import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { User } from "../types";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
          if (user.email === 'fortunedomination@gmail.com' && data.role !== 'admin') {
            await updateDoc(doc(db, "users", user.uid), { role: 'admin' });
            data.role = 'admin';
          }
          setUserData(data);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userDoc = await getDoc(doc(db, "users", result.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", result.user.uid), {
        id: result.user.uid,
        email: result.user.email,
        name: result.user.displayName || "New User",
        role: result.user.email?.toLowerCase() === "fortunedomination@gmail.com" ? "admin" : "customer",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", result.user.uid), {
        id: result.user.uid,
        email,
        name,
        role: email.toLowerCase() === "fortunedomination@gmail.com" ? "admin" : "customer",
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    let actualEmail = email.trim();
    if (actualEmail.toLowerCase() === 'btnx' || actualEmail.toLowerCase() === 'btnx@klamby.com') {
      actualEmail = 'btnx@klamby.com';
    }
    
    try {
      await signInWithEmailAndPassword(auth, actualEmail, password);
    } catch (error: any) {
      if (actualEmail === 'btnx@klamby.com' && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
        try {
          const result = await createUserWithEmailAndPassword(auth, actualEmail, password);
          await setDoc(doc(db, "users", result.user.uid), {
            id: result.user.uid,
            email: actualEmail,
            name: "Btnx Admin",
            role: "admin",
            createdAt: new Date().toISOString(),
          });
        } catch (createError: any) {
          if (createError.code === 'auth/email-already-in-use') {
            throw error;
          } else {
            throw createError;
          }
        }
      } else {
        throw error;
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
