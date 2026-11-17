/**
 * BTNX Centralized Security Architecture — Canonical Types
 */

export type AuthMethod =
  | "firebase_id_token"
  | "oauth2_bearer"
  | "personal_access_token"
  | "whatsapp_verified"
  | "session"
  | "admin_key";

export type CustomerRole = "customer" | "admin" | "support";

export const BTNX_SCOPES = {
  CATALOG_READ: "catalog:read",
  ORDERS_READ: "orders:read",
  ORDERS_TRACK: "orders:track",
  INVOICES_READ: "invoices:read",
  SUPPORT_READ: "support:read",
  SUPPORT_MANAGE: "support:manage",
  PROFILE_READ: "profile:read",
  PROFILE_WRITE: "profile:write",
  ADMIN_MANAGE: "admin:manage",
  ALL: "btnx:all",
} as const;

export type BTNXScope = typeof BTNX_SCOPES[keyof typeof BTNX_SCOPES];

/**
 * Canonical Authenticated Principal
 * Trusted server-side representation created exclusively from verified authentication data.
 */
export interface AuthenticatedPrincipal {
  uid: string;
  email?: string;
  name?: string;
  displayName?: string;
  phone?: string;
  shippingAddress?: string;
  role: CustomerRole;
  roles?: string[];
  scopes?: string[];
  authMethod: AuthMethod;
  tokenId?: string;
  sessionId?: string;
  clientId?: string;
  authenticatedAt: number;
}

// Backward-compatible alias for existing services
export type AuthenticatedCustomer = AuthenticatedPrincipal;

export interface AuthorizationResult {
  authorized: boolean;
  status?: number; // 401 or 403
  reason?: string;
  principal?: AuthenticatedPrincipal;
  customer?: AuthenticatedCustomer;
}

export interface PersonalAccessTokenRecord {
  id: string; // Token identifier (e.g. pat_abc123)
  uid: string; // Canonical Firebase UID
  tokenHash: string; // SHA-256 hash of raw token (raw token is NEVER persisted)
  name: string; // Client label e.g. "Claude Desktop", "Automation Script"
  scopes: string[]; // Explicit permissions e.g. ["orders:read", "invoices:read"]
  createdAt: string; // ISO 8601
  expiresAt: string | null; // ISO 8601 or null
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface OAuthClientRecord {
  clientId: string;
  clientSecretHash?: string; // SHA-256 hash of client secret (only for confidential clients)
  clientName: string;
  clientType: "public" | "confidential";
  redirectUris: string[]; // Strict exact URIs allowed for redirects
  scopes: string[]; // Allowed scopes
  createdAt: string;
  revokedAt?: string | null;
}

export interface OAuthCodeRecord {
  codeHash: string; // SHA-256 hash of the authorization code
  uid: string; // Authenticated UID
  email?: string;
  name?: string;
  phone?: string;
  shippingAddress?: string;
  clientId: string;
  redirectUri: string; // Exact registered redirect URI used during authorization
  codeChallenge: string; // S256 code challenge
  codeChallengeMethod: "S256"; // Only S256 permitted in OAuth 2.1
  scopes: string[];
  consumed: boolean; // Single-use consumption flag
  consumedAt?: string | null;
  createdAt: string;
  expiresAt: string; // Short TTL (e.g. 5 minutes)
}

export interface OAuthTokenRecord {
  tokenHash: string; // SHA-256 hash of access token
  refreshTokenHash?: string; // SHA-256 hash of refresh token
  tokenFamilyId?: string; // Family ID for refresh-token rotation & reuse detection
  uid: string; // Canonical Firebase UID
  email?: string;
  name?: string;
  phone?: string;
  shippingAddress?: string;
  clientId: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface WhatsAppIdentityRecord {
  phoneNumber: string; // E.164 format (+234...)
  uid: string; // Canonical Firebase UID
  linkedAt: string;
  verifiedAt: string;
  status: "active" | "revoked";
}

export interface LinkingChallengeRecord {
  challengeId: string;
  uid: string; // Canonical Firebase UID
  codeHash: string; // SHA-256 hash of 6-digit challenge code
  createdAt: string;
  expiresAt: string; // 10 minute TTL
  attempts: number; // Rate-limiting attempts
  consumed?: boolean;
  consumedAt?: string | null;
}

export interface ProcessedWebhookEventRecord {
  eventId: string; // Meta message ID e.g. wamid.HBg...
  processedAt: string;
  status: "success" | "ignored" | "failed";
}
