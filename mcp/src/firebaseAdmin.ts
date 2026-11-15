import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import type { CustomerRole } from "./auth/types.js";

export const FIREBASE_PROJECT_ID = "expenses-ai-vfx7o";
export const FIRESTORE_DATABASE_ID = "ai-studio-klamby-efc211be-fa31-444f-8359-2e516e0d2638";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

export function hasAdminCredentials(): boolean {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey && serviceAccountKey.trim().length > 10) {
    try {
      JSON.parse(serviceAccountKey);
      return true;
    } catch {
      return false;
    }
  }
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return true;
  }
  return false;
}

export function getFirebaseAdmin(): { app: App; auth: Auth; db: Firestore | null; hasCredentials: boolean } {
  const hasCreds = hasAdminCredentials();
  if (adminApp && adminAuth) {
    return { app: adminApp, auth: adminAuth, db: adminDb, hasCredentials: hasCreds };
  }

  const existing = getApps().find((a) => a.name === "[DEFAULT]");
  if (existing) {
    adminApp = existing;
  } else {
    let credentialOption = undefined;
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey && serviceAccountKey.trim().length > 10) {
      try {
        const parsed = JSON.parse(serviceAccountKey);
        credentialOption = cert(parsed);
      } catch (err) {
        console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", err);
      }
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credentialOption = cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
    }

    adminApp = initializeApp({
      projectId: FIREBASE_PROJECT_ID,
      ...(credentialOption ? { credential: credentialOption } : {}),
    });
  }

  adminAuth = getAuth(adminApp);
  if (hasCreds) {
    try {
      adminDb = getFirestore(adminApp, FIRESTORE_DATABASE_ID);
    } catch (err) {
      console.warn("[Firebase Admin] Firestore init warning:", err);
      adminDb = null;
    }
  } else {
    adminDb = null;
  }

  return { app: adminApp, auth: adminAuth, db: adminDb, hasCredentials: hasCreds };
}

/**
 * Cryptographically verifies a Firebase ID Token using the official Firebase Admin SDK.
 * Never trusts unverified decoded claims. Validates signature, issuer, audience, and expiration.
 */
export async function verifyFirebaseIdToken(
  token: string,
  checkRevoked = false
): Promise<{ uid: string; email?: string; name?: string; role: CustomerRole; emailVerified?: boolean } | null> {
  if (!token || typeof token !== "string" || !token.startsWith("eyJ") || token.split(".").length !== 3) {
    return null;
  }

  try {
    const { auth } = getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(token, checkRevoked);

    // Enforce strict project ID audience and issuer binding
    if (decodedToken.aud !== FIREBASE_PROJECT_ID && decodedToken.firebase?.project_id !== FIREBASE_PROJECT_ID) {
      console.warn(`[Auth] ID token audience mismatch: expected ${FIREBASE_PROJECT_ID}, got ${decodedToken.aud}`);
      return null;
    }

    if (decodedToken.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
      console.warn(`[Auth] ID token issuer mismatch: expected https://securetoken.google.com/${FIREBASE_PROJECT_ID}, got ${decodedToken.iss}`);
      return null;
    }

    if (!decodedToken.sub || typeof decodedToken.sub !== "string" || decodedToken.sub.trim().length === 0) {
      return null;
    }

    const role: CustomerRole =
      decodedToken.admin === true || decodedToken.role === "admin"
        ? "admin"
        : decodedToken.support === true || decodedToken.role === "support"
        ? "support"
        : "customer";

    return {
      uid: decodedToken.sub,
      email: decodedToken.email,
      name: decodedToken.name,
      role,
      emailVerified: decodedToken.email_verified,
    };
  } catch (err: any) {
    console.warn("[Auth] Firebase ID token cryptographic verification rejected:", err?.code || err?.message);
    return null; // Fail-closed
  }
}
