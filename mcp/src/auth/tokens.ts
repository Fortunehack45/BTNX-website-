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

const DEFAULT_SECRET = process.env.SESSION_SECRET || "btnx_default_secure_session_secret_2026";

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
 * RFC 7636 PKCE S256 Challenge Verification.
 */
export function verifyPkce(verifier: string, challenge: string, method: "S256" | "plain" = "S256"): boolean {
  if (!verifier || !challenge) return false;
  if (method === "plain") {
    return verifier === challenge;
  }
  const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(challenge));
}

/**
 * Generates an HMAC-SHA256 signed temporary resource token for invoice/tracking links.
 */
export function generateSignedResourceToken(
  resourceType: string,
  resourceId: string,
  ttlSeconds = 86400,
  secret = DEFAULT_SECRET
): { token: string; expiresAt: number; sig: string; exp: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${resourceType}:${resourceId}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return { token: signature, expiresAt, sig: signature, exp: expiresAt };
}

/**
 * Verifies an HMAC-SHA256 signed temporary resource token.
 * Supports both signatures:
 * 1) verifySignedResourceToken(resourceType, resourceId, signature, expiresAt, secret)
 * 2) verifySignedResourceToken(token, resourceType, resourceId, secret) where token is "sig.exp"
 */
export function verifySignedResourceToken(
  arg1: string,
  arg2: string,
  arg3?: string | number,
  arg4?: number,
  secret = DEFAULT_SECRET
): boolean {
  let resourceType: string;
  let resourceId: string;
  let signature: string;
  let expiresAt: number;

  if (typeof arg3 === "string" && typeof arg4 === "number") {
    // Signature 1: (resourceType, resourceId, signature, expiresAt)
    resourceType = arg1;
    resourceId = arg2;
    signature = arg3;
    expiresAt = arg4;
  } else if (typeof arg3 === "string" && arg4 === undefined) {
    // Signature 2: (tokenString, resourceType, resourceId)
    const token = arg1;
    resourceType = arg2;
    resourceId = arg3;
    const parts = token.split(".");
    signature = parts[0];
    expiresAt = parseInt(parts[1] || "0", 10);
  } else {
    return false;
  }

  if (!signature || !expiresAt) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now > expiresAt) return false; // Expired

  const payload = `${resourceType}:${resourceId}:${expiresAt}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
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
 * Verifies a raw OAuth Bearer access token.
 */
export async function verifyOAuthAccessToken(
  db: Firestore,
  rawAccessToken: string
): Promise<OAuthTokenRecord | null> {
  if (!rawAccessToken || !rawAccessToken.startsWith("btnx_at_")) return null;
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
