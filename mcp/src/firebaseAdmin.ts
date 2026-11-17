import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as crypto from "crypto";
import type { CustomerRole } from "./auth/types.js";

export const FIREBASE_PROJECT_ID = "expenses-ai-vfx7o";
export const FIRESTORE_DATABASE_ID = "ai-studio-klamby-efc211be-fa31-444f-8359-2e516e0d2638";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function parseServiceAccountJson(raw?: string): any | null {
  if (!raw || raw.trim().length < 10) return null;
  const str = raw.trim();
  try {
    return JSON.parse(str);
  } catch {}
  try {
    const decoded = Buffer.from(str, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {}
  return null;
}

export function hasAdminCredentials(): boolean {
  const possibleKeys = [
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    process.env.FIREBASE_SERVICE_ACCOUNT,
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    process.env.SERVICE_ACCOUNT_KEY,
    process.env.FIREBASE_ADMIN_CREDENTIALS,
  ];
  for (const k of possibleKeys) {
    if (k && parseServiceAccountJson(k)) return true;
  }
  if (
    process.env.FIREBASE_PRIVATE_KEY &&
    (process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL_ADDRESS)
  ) {
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
    const possibleKeys = [
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      process.env.FIREBASE_SERVICE_ACCOUNT,
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      process.env.SERVICE_ACCOUNT_KEY,
      process.env.FIREBASE_ADMIN_CREDENTIALS,
    ];
    let parsedKey: any = null;
    for (const k of possibleKeys) {
      parsedKey = parseServiceAccountJson(k);
      if (parsedKey) break;
    }

    if (parsedKey) {
      credentialOption = cert(parsedKey);
    } else if (
      process.env.FIREBASE_PRIVATE_KEY &&
      (process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL_ADDRESS)
    ) {
      credentialOption = cert({
        projectId: process.env.FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID,
        clientEmail: (process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL_ADDRESS)!,
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

let googleCertsCache: { keys: Record<string, string>; expiresAt: number } | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (googleCertsCache && googleCertsCache.expiresAt > now) {
    return googleCertsCache.keys;
  }
  try {
    const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
    if (!res.ok) throw new Error(`Google cert fetch failed with status ${res.status}`);
    const keys = (await res.json()) as Record<string, string>;
    googleCertsCache = { keys, expiresAt: now + 3600 * 1000 };
    return keys;
  } catch (err) {
    if (googleCertsCache) return googleCertsCache.keys;
    throw err;
  }
}

/**
 * Cryptographically verifies a Firebase ID Token using either the official Firebase Admin SDK
 * or Google's public x509 certificates (RFC 7519 / Google OpenID Connect standard).
 * Never trusts unverified decoded claims. Validates signature, issuer, audience, and expiration.
 */
export async function verifyFirebaseIdToken(
  token: string,
  checkRevoked = false
): Promise<{ uid: string; email?: string; name?: string; role: CustomerRole; emailVerified?: boolean } | null> {
  if (!token || typeof token !== "string" || !token.startsWith("eyJ") || token.split(".").length !== 3) {
    return null;
  }

  // 1. Try Firebase Admin SDK if admin credentials are affirmatively configured
  if (hasAdminCredentials()) {
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
      console.warn("[Auth] Admin verifyIdToken fell through to public cert verification:", err?.code || err?.message);
    }
  }

  // 2. Cryptographic verification using Google's public x509 certificates
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));

    if (header.alg !== "RS256" || !header.kid) {
      return null;
    }

    const certs = await getGooglePublicCerts();
    const cert = certs[header.kid];
    if (!cert) {
      return null;
    }

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    const isValidSig = verifier.verify(cert, Buffer.from(sigB64, "base64url"));
    if (!isValidSig) {
      console.warn("[Auth] Firebase ID token cryptographic signature invalid");
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    // Expiration check (with 60s clock skew tolerance)
    if (typeof payload.exp !== "number" || payload.exp < nowSec - 60) {
      console.warn("[Auth] Firebase ID token expired");
      return null;
    }
    // Issued in the past (with 60s clock skew tolerance)
    if (typeof payload.iat !== "number" || payload.iat > nowSec + 60) {
      console.warn("[Auth] Firebase ID token future iat");
      return null;
    }
    // Audience check
    if (payload.aud !== FIREBASE_PROJECT_ID) {
      console.warn("[Auth] Firebase ID token aud mismatch");
      return null;
    }
    // Issuer check
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
      console.warn("[Auth] Firebase ID token iss mismatch");
      return null;
    }
    // Subject (UID) check
    if (!payload.sub || typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
      return null;
    }

    const role: CustomerRole =
      payload.admin === true || payload.role === "admin"
        ? "admin"
        : payload.support === true || payload.role === "support"
        ? "support"
        : "customer";

    return {
      uid: payload.sub,
      email: payload.email,
      name: payload.name,
      role,
      emailVerified: payload.email_verified,
    };
  } catch (err: any) {
    console.warn("[Auth] Public JWKS ID token verification error:", err?.message || err);
    return null;
  }
}
