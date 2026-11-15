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
import { verifyFirebaseIdToken } from "../firebaseAdmin.js";

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
    const userDoc = await getDoc(doc(db, "users", resolvedUid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      profileName = data.name || profileName;
      profileEmail = data.email || profileEmail;
      profilePhone = data.phone || undefined;
      profileRole = (data.role === "admin" || data.role === "support") ? data.role : "customer";

      if (data.shippingStreet) {
        profileAddress = `${data.shippingStreet}, ${data.shippingCity || "Lagos"}, ${data.shippingCountry || "Nigeria"}`;
      }
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
