export type AuthMethod =
  | "firebase_id_token"
  | "oauth2_bearer"
  | "personal_access_token"
  | "whatsapp_verified";

export type CustomerRole = "customer" | "admin" | "support";

export interface AuthenticatedCustomer {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  shippingAddress?: string;
  role: CustomerRole;
  authMethod: AuthMethod;
  tokenId?: string;
  authenticatedAt: number;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  customer?: AuthenticatedCustomer;
}

export interface PersonalAccessTokenRecord {
  id: string; // Token ID / identifier
  uid: string; // Canonical Firebase UID
  tokenHash: string; // SHA-256 hash of raw token
  name: string; // Description e.g. "Cursor Desktop", "ChatGPT Personal"
  scopes: string[]; // Allowed scopes e.g. ["orders:read", "invoices:read"]
  createdAt: string; // ISO 8601
  expiresAt: string | null; // ISO 8601 or null (infinite/long-lived)
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface OAuthTokenRecord {
  tokenHash: string; // SHA-256 hash of access token
  refreshTokenHash?: string; // SHA-256 hash of refresh token
  uid: string; // Canonical Firebase UID
  email: string;
  name: string;
  clientId: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface OAuthCodeRecord {
  codeHash: string; // SHA-256 hash of authorization code
  uid: string;
  email: string;
  name: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256" | "plain";
  createdAt: string;
  expiresAt: string; // 5 minute TTL
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
  uid: string;
  codeHash: string; // SHA-256 hash of 6-digit code
  createdAt: string;
  expiresAt: string; // 10 minute TTL
  attempts: number; // Rate-limiting attempts
}
