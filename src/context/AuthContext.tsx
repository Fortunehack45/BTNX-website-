import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc } from "firebase/firestore";
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
    let unsubDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (user) {
        const userDocPath = `users/${user.uid}`;
        unsubDoc = onSnapshot(
          doc(db, "users", user.uid),
          async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as User;
              if (
                user.email?.toLowerCase() === "fortunedomination@gmail.com" &&
                user.emailVerified &&
                data.role !== "admin"
              ) {
                try {
                  await updateDoc(doc(db, "users", user.uid), { role: "admin" });
                  data.role = "admin";
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, userDocPath);
                }
              }
              setUserData(data);
            } else {
              setUserData({
                id: user.uid,
                email: user.email || "",
                name: user.displayName || "New User",
                role:
                  user.email?.toLowerCase() === "fortunedomination@gmail.com" && user.emailVerified
                    ? "admin"
                    : "customer",
                createdAt: new Date().toISOString(),
              });
            }
            setLoading(false);
          },
          (error) => {
            setLoading(false);
            handleFirestoreError(error, OperationType.GET, userDocPath);
          }
        );
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userDocPath = `users/${result.user.uid}`;
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, "users", result.user.uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, userDocPath);
    }
    if (userDoc && !userDoc.exists()) {
      const isBootstrapAdmin =
        result.user.email?.toLowerCase() === "fortunedomination@gmail.com" &&
        result.user.emailVerified;
      try {
        await setDoc(doc(db, "users", result.user.uid), {
          id: result.user.uid,
          email: result.user.email || "",
          name: result.user.displayName || "New User",
          role: isBootstrapAdmin ? "admin" : "customer",
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, userDocPath);
      }

      try {
        await addDoc(collection(db, "notifications"), {
          userId: result.user.uid,
          title: "Welcome to BTNX",
          message:
            "Thanks for signing up with BTNX. You'll get updates on new drops, restocks, and seasonal offers here. Use promo code BTNX50 at checkout for 50% off.",
          type: "promo",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, "notifications");
      }
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userDocPath = `users/${result.user.uid}`;
    try {
      await setDoc(doc(db, "users", result.user.uid), {
        id: result.user.uid,
        email,
        name,
        role: "customer",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userDocPath);
    }

    try {
      await addDoc(collection(db, "notifications"), {
        userId: result.user.uid,
        title: "Welcome to BTNX",
        message: `Hi ${name}, thanks for creating your BTNX account. You'll see order updates, restocks, and promo codes right here. Use promo code BTNX50 at checkout for 50% off.`,
        type: "promo",
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "notifications");
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    let actualEmail = email.trim();
    if (
      actualEmail.toLowerCase() === "btnx" ||
      actualEmail.toLowerCase() === "btnx@klamby.com" ||
      actualEmail.toLowerCase() === "btnx@btnx.com"
    ) {
      actualEmail = "btnx@btnx.com";
    }

    await signInWithEmailAndPassword(auth, actualEmail, password);
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
