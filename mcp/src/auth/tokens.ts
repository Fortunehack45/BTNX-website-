import * as crypto from "crypto";
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  PersonalAccessTokenRecord,
  OAuthTokenRecord,
  OAuthCodeRecord,
} from "./types.js";

export function getSigningSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.RESOURCE_SIGNING_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }
  // Deterministic 256-bit fallback for serverless environments
  const fallback =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VERCEL_PROJECT_ID ||
    process.env.VERCEL_URL ||
    "btnx-secure-production-atelier-secret-key-32bytes-v2";
  return crypto.createHash("sha256").update(fallback).digest("hex");
}

/**
 * Computes deterministic SHA-256 hex digest of any secret token.
 * Tokens are never stored in plaintext in database records.
 */
export function hashToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== "string") return "";
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Generates a cryptographically strong random token with custom prefix.
 */
export function generateSecureToken(prefix = "btnx_tok_", bytes = 32): string {
  return `${prefix}${crypto.randomBytes(bytes).toString("hex")}`;
}

/**
 * Generates a 6-digit cryptographic verification code for account linking.
 */
export function generateNumericCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * RFC 7636 PKCE S256 Challenge Verification. Plaintext method strictly rejected in production.
 */
export function verifyPkce(verifier: string, challenge: string, method: "S256" | "plain" = "S256"): boolean {
  if (!verifier || !challenge) return false;
  if (method === "plain") {
    return false; // Strict RFC 7636 enforcement: plain is rejected
  }
  const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
  const compBuf = Buffer.from(computed);
  const chalBuf = Buffer.from(challenge);
  if (compBuf.length !== chalBuf.length) return false;
  return crypto.timingSafeEqual(compBuf, chalBuf);
}

export interface SignedResourceOptions {
  ttlSeconds?: number;
  secret?: string;
  purpose?: string;
}

/**
 * Generates an HMAC-SHA256 signed temporary resource token for invoice/tracking links.
 */
export function generateSignedResourceToken(
  resourceType: string,
  resourceId: string,
  options?: SignedResourceOptions | number,
  fallbackSecret?: string
): { token: string; expiresAt: number; sig: string; exp: number } {
  let ttlSeconds = 86400;
  let customSecret = fallbackSecret;
  let purpose = "access";

  // Robust argument order normalization (supports both (type, id) and (id, type))
  let actualType = resourceType;
  let actualId = resourceId;
  const KNOWN_TYPES = ["invoice", "track", "support", "product", "order"];
  if (!KNOWN_TYPES.includes(actualType) && KNOWN_TYPES.includes(actualId)) {
    actualType = resourceId;
    actualId = resourceType;
  }

  if (typeof options === "number") {
    ttlSeconds = options;
  } else if (options && typeof options === "object") {
    if (options.ttlSeconds !== undefined) ttlSeconds = options.ttlSeconds;
    if (options.secret !== undefined) customSecret = options.secret;
    if (options.purpose !== undefined) purpose = options.purpose;
  }

  const secret = customSecret || getSigningSecret();
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${actualType}:${actualId}:${expiresAt}:${purpose}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return { token: `${signature}.${expiresAt}`, expiresAt, sig: signature, exp: expiresAt };
}

/**
 * Verifies an HMAC-SHA256 signed temporary resource token using constant-time comparison.
 */
export function verifySignedResourceToken(
  arg1: string,
  arg2: string,
  arg3?: string | number | { expiresAt?: number; secret?: string; purpose?: string },
  arg4?: number,
  customSecret?: string
): boolean {
  try {
    let resourceType: string;
    let resourceId: string;
    let signature: string;
    let expiresAt: number;
    let secret = customSecret || getSigningSecret();
    let purpose = "access";

    if (typeof arg3 === "string" && typeof arg4 === "number") {
      resourceType = arg1;
      resourceId = arg2;
      signature = arg3.includes(".") ? arg3.split(".")[0] : arg3;
      expiresAt = arg4;
    } else if (typeof arg3 === "string" && arg4 === undefined) {
      const token = arg1;
      resourceType = arg2;
      resourceId = arg3;
      const parts = token.split(".");
      signature = parts[0];
      expiresAt = parseInt(parts[1] || "0", 10);
    } else if (typeof arg3 === "object") {
      signature = arg1;
      resourceType = arg2;
      resourceId = typeof arg4 === "string" ? arg4 : "";
      expiresAt = arg3.expiresAt || 0;
      if (arg3.secret) secret = arg3.secret;
      if (arg3.purpose) purpose = arg3.purpose;
    } else {
      return false;
    }

    const KNOWN_TYPES = ["invoice", "track", "support", "product", "order"];
    if (!KNOWN_TYPES.includes(resourceType) && KNOWN_TYPES.includes(resourceId)) {
      const temp = resourceType;
      resourceType = resourceId;
      resourceId = temp;
    }

    if (!signature || !expiresAt || signature.length !== 64) return false;
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) return false;

    const payloadWithPurpose = `${resourceType}:${resourceId}:${expiresAt}:${purpose}`;
    const payloadLegacy = `${resourceType}:${resourceId}:${expiresAt}`;

    const expectedWithPurpose = crypto.createHmac("sha256", secret).update(payloadWithPurpose).digest("hex");
    const expectedLegacy = crypto.createHmac("sha256", secret).update(payloadLegacy).digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf1 = Buffer.from(expectedWithPurpose, "hex");
    const expBuf2 = Buffer.from(expectedLegacy, "hex");

    if (sigBuf.length === expBuf1.length && crypto.timingSafeEqual(sigBuf, expBuf1)) {
      return true;
    }
    if (sigBuf.length === expBuf2.length && crypto.timingSafeEqual(sigBuf, expBuf2)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Personal Access Token (PAT) Operations
// ----------------------------------------------------------------------------

/**
 * Lists all non-revoked PATs belonging to a specific customer UID.
 */
export async function listPersonalAccessTokens(
  db: Firestore,
  uid: string
): Promise<Array<Omit<PersonalAccessTokenRecord, "tokenHash"> & { maskedToken: string }>> {
  try {
    const q = query(
      collection(db, "personal_access_tokens"),
      where("uid", "==", uid)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data() as PersonalAccessTokenRecord;
        return {
          id: data.id,
          uid: data.uid,
          name: data.name,
          scopes: data.scopes,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          lastUsedAt: data.lastUsedAt,
          revokedAt: data.revokedAt,
          maskedToken: "btnx_pat_••••••••" + data.id.slice(-4),
        };
      })
      .filter((t) => t.revokedAt == null);
  } catch (err: any) {
    console.error("[Auth] List PATs error:", err?.message);
    return [];
  }
}

/**
 * Creates and securely stores a hashed PAT. Returns the RAW token ONCE for customer display.
 */
export async function createPersonalAccessToken(
  db: Firestore,
  uid: string,
  name: string,
  scopes: string[] = ["orders:read", "invoices:read", "tracking:read"],
  ttlDays = 365
): Promise<{ rawToken: string; record: PersonalAccessTokenRecord }> {
  const rawToken = generateSecureToken("btnx_pat_", 24);
  const tokenHash = hashToken(rawToken);
  const tokenId = `pat_${crypto.randomBytes(12).toString("hex")}`;
  const now = new Date();
  const expiresAt = ttlDays > 0 ? new Date(now.getTime() + ttlDays * 86400000).toISOString() : null;

  const record: PersonalAccessTokenRecord = {
    id: tokenId,
    uid,
    tokenHash,
    name: name.trim().slice(0, 100),
    scopes,
    createdAt: now.toISOString(),
    expiresAt,
    lastUsedAt: null,
    revokedAt: null,
  };

  await setDoc(doc(db, "personal_access_tokens", tokenId), record);

  return { rawToken, record };
}

/**
 * Validates a raw PAT against Firestore. Updates lastUsedAt asynchronously.
 */
export async function verifyPersonalAccessToken(
  db: Firestore,
  rawToken: string
): Promise<PersonalAccessTokenRecord | null> {
  if (!rawToken || !rawToken.startsWith("btnx_pat_")) return null;
  const targetHash = hashToken(rawToken);

  try {
    const q = query(
      collection(db, "personal_access_tokens"),
      where("tokenHash", "==", targetHash)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const record = snap.docs[0].data() as PersonalAccessTokenRecord;

    // Check revocation
    if (record.revokedAt != null) return null;

    // Check expiration
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return null;
    }

    // Touch lastUsedAt without blocking
    updateDoc(snap.docs[0].ref, { lastUsedAt: new Date().toISOString() }).catch(() => {});

    return record;
  } catch (err: any) {
    console.error("[Auth] PAT verification error:", err?.message);
    return null;
  }
}

/**
 * Revokes a personal access token by ID.
 */
export async function revokePersonalAccessToken(
  db: Firestore,
  uid: string,
  tokenId: string
): Promise<boolean> {
  try {
    const ref = doc(db, "personal_access_tokens", tokenId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data() as PersonalAccessTokenRecord;
    if (data.uid !== uid) return false; // Must be owner

    await updateDoc(ref, { revokedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// OAuth 2.1 Token Operations
// ----------------------------------------------------------------------------

/**
 * Stores hashed OAuth access and refresh tokens.
 */
export async function storeOAuthTokens(
  db: Firestore,
  accessToken: string,
  refreshToken: string,
  uid: string,
  email: string,
  name: string,
  clientId: string,
  scopes: string[] = ["openid", "profile", "orders"],
  accessTtlSeconds = 2592000 // 30 days
): Promise<void> {
  const tokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + accessTtlSeconds * 1000).toISOString();

  const record: OAuthTokenRecord = {
    tokenHash,
    refreshTokenHash,
    uid,
    email,
    name,
    clientId,
    scopes,
    createdAt: now.toISOString(),
    expiresAt,
    revokedAt: null,
  };

  await setDoc(doc(db, "oauth_tokens", tokenHash), record);
}

/**
 * Creates a cryptographically signed, stateless OAuth 2.1 authorization code.
 * Resilient across distributed serverless instances.
 */
export function createSignedOAuthCode(codeRecord: {
  code?: string;
  uid: string;
  email: string;
  name?: string;
  shippingAddress?: string;
  phone?: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: string;
}): string {
  const secret = getSigningSecret();
  const payload = {
    uid: codeRecord.uid,
    email: codeRecord.email,
    name: codeRecord.name || "BTNX Customer",
    shippingAddress: codeRecord.shippingAddress || "Nigeria",
    phone: codeRecord.phone || "N/A",
    clientId: codeRecord.clientId,
    redirectUri: codeRecord.redirectUri,
    codeChallenge: codeRecord.codeChallenge || "",
    codeChallengeMethod: codeRecord.codeChallengeMethod || "S256",
    expiresAt: codeRecord.expiresAt,
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`btnx_oauth_code:${data}`).digest("base64url");
  return `btnx_code_${data}.${sig}`;
}

/**
 * Cryptographically verifies a signed OAuth 2.1 authorization code.
 */
export function verifySignedOAuthCode(code: string): OAuthCodeRecord | null {
  if (!code || typeof code !== "string" || !code.startsWith("btnx_code_")) return null;
  const raw = code.slice("btnx_code_".length);
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const secret = getSigningSecret();
  const expectedSig = crypto.createHmac("sha256", secret).update(`btnx_oauth_code:${data}`).digest("base64url");
  const expBuf = Buffer.from(expectedSig);
  const sigBuf = Buffer.from(sig);
  if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return {
      codeHash: hashToken(code),
      clientId: payload.clientId,
      redirectUri: payload.redirectUri,
      uid: payload.uid,
      email: payload.email,
      name: payload.name,
      scopes: ["openid", "profile", "email", "orders"],
      codeChallenge: payload.codeChallenge,
      codeChallengeMethod: "S256",
      consumed: false,
      consumedAt: null,
      createdAt: new Date().toISOString(),
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a cryptographically signed, stateless OAuth 2.1 access token.
 */
export function createSignedOAuthAccessToken(tokenRecord: {
  uid: string;
  email: string;
  name?: string;
  shippingAddress?: string;
  phone?: string;
  clientId: string;
  scopes?: string[];
  role?: string;
  expiresAt?: string;
}): string {
  const secret = getSigningSecret();
  const exp = tokenRecord.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    uid: tokenRecord.uid,
    email: tokenRecord.email,
    name: tokenRecord.name || "BTNX Customer",
    shippingAddress: tokenRecord.shippingAddress || "Nigeria",
    phone: tokenRecord.phone || "N/A",
    clientId: tokenRecord.clientId,
    scopes: tokenRecord.scopes || ["openid", "profile", "email", "orders"],
    role: tokenRecord.role || "customer",
    expiresAt: exp,
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`btnx_oauth_token:${data}`).digest("base64url");
  return `btnx_at_${data}.${sig}`;
}

/**
 * Creates a cryptographically signed, stateless session token.
 */
export function createSignedSessionToken(sessionData: any): string {
  const secret = getSigningSecret();
  const payload = {
    ...sessionData,
    expiresAt: sessionData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`btnx_session:${data}`).digest("base64url");
  return `btnx_sess_${data}.${sig}`;
}

/**
 * Verifies a cryptographically signed, stateless session token.
 */
export function verifySignedSessionToken(token: string): any | null {
  if (!token || typeof token !== "string" || !token.startsWith("btnx_sess_")) return null;
  const raw = token.slice("btnx_sess_".length);
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const secret = getSigningSecret();
  const expectedSig = crypto.createHmac("sha256", secret).update(`btnx_session:${data}`).digest("base64url");
  const expBuf = Buffer.from(expectedSig);
  const sigBuf = Buffer.from(sig);
  if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verifies a raw OAuth Bearer access token.
 * Supports both cryptographically signed stateless tokens and stored database tokens.
 */
export async function verifyOAuthAccessToken(
  db: Firestore,
  rawAccessToken: string
): Promise<OAuthTokenRecord | null> {
  if (!rawAccessToken || !rawAccessToken.startsWith("btnx_at_")) return null;

  // 1. Check for cryptographically signed stateless access token
  if (rawAccessToken.includes(".")) {
    const raw = rawAccessToken.slice("btnx_at_".length);
    const parts = raw.split(".");
    if (parts.length === 2) {
      const [data, sig] = parts;
      const secret = getSigningSecret();
      const expectedSig = crypto.createHmac("sha256", secret).update(`btnx_oauth_token:${data}`).digest("base64url");
      const expBuf = Buffer.from(expectedSig);
      const sigBuf = Buffer.from(sig);
      if (expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf)) {
        try {
          const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
          if (!payload.expiresAt || new Date(payload.expiresAt).getTime() >= Date.now()) {
            // Check revocation in database if possible
            const tokenHash = hashToken(rawAccessToken);
            try {
              const snap = await getDoc(doc(db, "oauth_tokens", tokenHash));
              if (snap.exists()) {
                const rec = snap.data() as OAuthTokenRecord;
                if (rec.revokedAt != null) return null;
              }
            } catch {}

            return {
              tokenHash,
              refreshTokenHash: "",
              clientId: payload.clientId || "mcp_client",
              uid: payload.uid,
              email: payload.email,
              name: payload.name || "BTNX Customer",
              scopes: payload.scopes || ["openid", "profile", "email", "orders"],
              createdAt: payload.createdAt || new Date().toISOString(),
              expiresAt: payload.expiresAt,
              revokedAt: null,
            };
          }
        } catch {}
      }
    }
  }

  // 2. Fall back to hashed database record lookup
  const tokenHash = hashToken(rawAccessToken);
  try {
    const snap = await getDoc(doc(db, "oauth_tokens", tokenHash));
    if (!snap.exists()) return null;

    const record = snap.data() as OAuthTokenRecord;
    if (record.revokedAt != null) return null;
    if (new Date(record.expiresAt).getTime() < Date.now()) return null;

    return record;
  } catch (err: any) {
    console.error("[Auth] OAuth token verification error:", err?.message);
    return null;
  }
}

/**
 * Revokes an OAuth token (RFC 7009).
 */
export async function revokeOAuthToken(
  db: Firestore,
  rawToken: string
): Promise<boolean> {
  const tokenHash = hashToken(rawToken);
  try {
    const ref = doc(db, "oauth_tokens", tokenHash);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { revokedAt: new Date().toISOString() });
      return true;
    }
  } catch {}
  return false;
}
