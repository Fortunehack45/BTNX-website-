import type { IncomingMessage } from "http";
import { Firestore, doc, getDoc } from "firebase/firestore";
import { Auth } from "firebase/auth";
import {
  AuthenticatedCustomer,
  AuthMethod,
  CustomerRole,
} from "./types.js";
import {
  verifyPersonalAccessToken,
  verifyOAuthAccessToken,
} from "./tokens.js";
import { verifyFirebaseIdToken, getFirebaseAdmin } from "../firebaseAdmin.js";

/**
 * Resolves an authenticated customer context from HTTP request headers.
 * Never falls back to IP address, user-agent, or client-provided parameters.
 */
export async function resolveAuthenticatedCustomer(
  req: IncomingMessage & { headers: Record<string, string | string[] | undefined> },
  db: Firestore,
  auth?: Auth
): Promise<AuthenticatedCustomer | null> {
  // 1. Check for Privileged Administrative API Key (Server-to-Server Only)
  const adminApiKey = process.env.MCP_ADMIN_API_KEY;
  const passedAdminKey = (
    req.headers["x-mcp-admin-key"] ||
    req.headers["x-btnx-key"] ||
    ""
  ) as string;

  if (
    adminApiKey &&
    adminApiKey.length >= 16 &&
    passedAdminKey &&
    passedAdminKey === adminApiKey
  ) {
    return {
      uid: "system_admin",
      email: "admin@btnx.store",
      name: "BTNX System Administrator",
      role: "admin",
      authMethod: "personal_access_token",
      authenticatedAt: Date.now(),
    };
  }

  // 2. Extract Bearer Token from Authorization Header
  const rawAuthHeader = String(req.headers["authorization"] || "").trim();
  let bearerToken = "";

  if (rawAuthHeader.toLowerCase().startsWith("bearer ")) {
    bearerToken = rawAuthHeader.slice(7).trim();
  } else if (req.headers["x-api-key"] && typeof req.headers["x-api-key"] === "string") {
    bearerToken = req.headers["x-api-key"].trim();
  }

  if (!bearerToken) {
    return null; // Fail-closed: unauthenticated
  }

  let resolvedUid: string | null = null;
  let authMethod: AuthMethod = "personal_access_token";
  let tokenId: string | undefined = undefined;
  let profileName = "BTNX Customer";
  let profileEmail = "";
  let profilePhone: string | undefined = undefined;
  let profileAddress: string | undefined = undefined;
  let profileRole: CustomerRole = "customer";

  // Case A: Personal Access Token (PAT)
  if (bearerToken.startsWith("btnx_pat_")) {
    const patRecord = await verifyPersonalAccessToken(db, bearerToken);
    if (!patRecord) return null;
    resolvedUid = patRecord.uid;
    authMethod = "personal_access_token";
    tokenId = patRecord.id;
  }
  // Case B: OAuth 2.1 Access Token
  else if (bearerToken.startsWith("btnx_at_")) {
    const oauthRecord = await verifyOAuthAccessToken(db, bearerToken);
    if (!oauthRecord) return null;
    resolvedUid = oauthRecord.uid;
    authMethod = "oauth2_bearer";
    if (oauthRecord.email) profileEmail = oauthRecord.email;
    if (oauthRecord.name) profileName = oauthRecord.name;
    if (oauthRecord.phone) profilePhone = oauthRecord.phone;
    if (oauthRecord.shippingAddress) profileAddress = oauthRecord.shippingAddress;
  }
  // Case C: Standard Firebase ID Token (JWT format: eyJ...)
  else if (bearerToken.startsWith("eyJ") && bearerToken.split(".").length === 3) {
    const verified = await verifyFirebaseIdToken(bearerToken);
    if (!verified) {
      return null; // Reject forged, tampered, expired, or invalid tokens!
    }
    resolvedUid = verified.uid;
    authMethod = "firebase_id_token";
    if (verified.email) profileEmail = verified.email;
    if (verified.name) profileName = verified.name;
    if (verified.role) profileRole = verified.role;
  }

  if (!resolvedUid) {
    return null;
  }

  // 3. Load Canonical Customer Profile from Firestore: users/{uid}
  try {
    let uData: any = null;
    const admin = getFirebaseAdmin();
    if (admin.hasCredentials && admin.db) {
      try {
        const snap = await admin.db.collection("users").doc(resolvedUid).get();
        if (snap.exists) {
          uData = snap.data();
        }
      } catch {}
    }
    if (!uData) {
      try {
        const userDoc = await getDoc(doc(db, "users", resolvedUid));
        if (userDoc.exists()) {
          uData = userDoc.data();
        }
      } catch {}
    }

    if (uData) {
      profileName = uData.name || profileName;
      profileEmail = uData.email || profileEmail;
      profilePhone = uData.phone || uData.whatsappPhone || profilePhone;
      profileRole = (uData.role === "admin" || uData.role === "support") ? uData.role : profileRole;

      if (uData.shippingStreet) {
        profileAddress = `${uData.shippingStreet}${uData.shippingCity ? `, ${uData.shippingCity}` : ""}${uData.shippingState ? `, ${uData.shippingState}` : ""}, Nigeria`;
      } else if (uData.address) {
        profileAddress = uData.address;
      }
    }

    // Fallback: If email or profile info is still empty, look up Firebase Auth user directly
    if (admin.hasCredentials && admin.auth) {
      try {
        const authUser = await admin.auth.getUser(resolvedUid);
        if (authUser) {
          if (authUser.email && !profileEmail) profileEmail = authUser.email;
          if (authUser.displayName && profileName === "BTNX Customer") profileName = authUser.displayName;
          if (authUser.phoneNumber && !profilePhone) profilePhone = authUser.phoneNumber;
        }
      } catch {}
    }

    // Fallback: Check most recent order to discover verified shipping destination, phone, or email
    if ((!profileAddress || !profilePhone || !profileEmail) && resolvedUid) {
      try {
        let orderSnap: any = null;
        if (admin.hasCredentials && admin.db) {
          orderSnap = await admin.db.collection("orders").where("userId", "==", resolvedUid).limit(1).get();
        }
        if (orderSnap && !orderSnap.empty) {
          const ord = orderSnap.docs[0].data();
          if (!profileAddress && ord.shippingAddress) profileAddress = ord.shippingAddress;
          if (!profilePhone && (ord.customerPhone || ord.phone)) profilePhone = ord.customerPhone || ord.phone;
          if (!profileEmail && (ord.customerEmail || ord.userEmail || ord.email)) profileEmail = ord.customerEmail || ord.userEmail || ord.email;
          if (profileName === "BTNX Customer" && ord.customerName) profileName = ord.customerName;
        }
      } catch {}
    }
  } catch (err: any) {
    console.error("[Auth] Profile resolution warning:", err?.message);
  }

  return {
    uid: resolvedUid,
    email: profileEmail,
    name: profileName,
    phone: profilePhone,
    shippingAddress: profileAddress,
    role: profileRole,
    authMethod,
    tokenId,
    authenticatedAt: Date.now(),
  };
}
