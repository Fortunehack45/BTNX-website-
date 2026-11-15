# BTNX Security Audit & Remediation Report

**Date:** November 2026  
**Auditor:** Principal Application Security & Infrastructure Architect  
**Target Repository:** `Fortunehack45/BTNX-website-`  
**Application:** BTNX Luxury Fashion Atelier (Storefront, Express API Server, Remote MCP Server, WhatsApp Concierge)

---

## Executive Summary

A comprehensive application security and architectural audit was performed on the BTNX Luxury Store codebase. The assessment uncovered critical credential leakages, hardcoded backdoors, client-side privilege escalations, unauthenticated mock fallbacks, and multi-tenant isolation flaws across the Storefront, Express API server, remote Model Context Protocol (MCP) server, and WhatsApp messaging service.

All identified vulnerabilities have been remediated, verified with automated security tests, and rebuilt cleanly across all four workspace packages.

---

## Identified Vulnerabilities & Remediation Matrix

| Vulnerability ID | Classification | Severity | Affected Component | Remediation Status |
|---|---|---|---|---|
| **BTNX-SEC-01** | Hardcoded Service Account Credentials | **CRITICAL** | `mcp/api/mcp.ts` | **RESOLVED**: Extracted to `FIREBASE_ADMIN_EMAIL` & `FIREBASE_ADMIN_PASSWORD` server env vars. |
| **BTNX-SEC-02** | Hardcoded Master Secret Bypass (`btnx_mcp_secret_2026`) | **CRITICAL** | `server/src/mcp.ts`, `services/whatsapp.ts` | **RESOLVED**: Eradicated all fallback secrets; requests require cryptographic validation or fail-closed (401/403). |
| **BTNX-SEC-03** | Plaintext PAT Parsing Backdoor | **HIGH** | `server/src/mcp.ts` | **RESOLVED**: Tokens must be hashed via SHA-256 and matched against Firestore `personal_access_tokens`. |
| **BTNX-SEC-04** | Hardcoded Meta Webhook Verify Token (`btnx_secret_token`) | **HIGH** | `server/src/index.ts` | **RESOLVED**: Removed fallback; requires configured `WHATSAPP_VERIFY_TOKEN` or rejects (403). |
| **BTNX-SEC-05** | Missing Webhook Signature Verification | **HIGH** | `server/src/index.ts` | **RESOLVED**: Implemented timing-safe HMAC-SHA256 verification (`x-hub-signature-256`) against `META_APP_SECRET`. |
| **BTNX-SEC-06** | Hardcoded Promo Codes (`BTNX50`, `KLAMBY50`) | **MEDIUM** | `server/src/mcp.ts`, `mcp/api/mcp.ts`, `server/src/index.ts` | **RESOLVED**: Removed all hardcoded string comparisons; queries Firestore `promoCodes` collection dynamically. |
| **BTNX-SEC-07** | Mock Receipt Fallback on Invalid/Missing Orders | **MEDIUM** | `server/src/index.ts`, `server/src/mcp.ts`, `mcp/api/mcp.ts` | **RESOLVED**: Eliminated fake mock orders (₦185,000, "Amina Bello", `BX-849201`). Returns 404 Not Found or 403 Access Denied. |
| **BTNX-SEC-08** | Insecure Client-Side PAT Generation & Storage | **HIGH** | `src/components/UserProfileModal.tsx` | **RESOLVED**: Delegated PAT creation to server endpoint `/api/user/mcp-token/create`; secret shown only once. |
| **BTNX-SEC-09** | Broad Order & User Profile Firestore Rules | **CRITICAL** | `firestore.rules` | **RESOLVED**: Enforced strict UID ownership checks, immutable `userId`, and locked backend security collections. |
| **BTNX-SEC-10** | Claude 405 & ChatGPT OAuth Discovery Failures | **HIGH** | `mcp/api/mcp.ts` | **RESOLVED**: Implemented RFC 8414 / RFC 9728 discovery, RFC 7591 dynamic client registration, and explicit GET/OPTIONS on `/mcp`. |

---

## Detailed Remediation Actions

### 1. Hardcoded Secret & Credential Eradication
- **Files Modified:** `mcp/api/mcp.ts`, `server/src/mcp.ts`, `server/src/services/whatsapp.ts`, `server/src/index.ts`.
- Removed hardcoded credentials:
  - `mcp-service@btnx.store` / `BtnxMcpService2026!`
  - `btnx_mcp_secret_2026`
  - `btnx_secret_token`
- Created sanitized `.env.example` templates in root, `server/`, and `mcp/`.

### 2. Elimination of Hardcoded Mock Orders & Promo Codes
- Replaced hardcoded promo checks in MCP tools and API routes with live Firestore queries against `promoCodes`.
- Fixed the Claude/ChatGPT AI prompt where the system assistant previously recommended `BTNX50` as an example promo.
- Eradicated default mock receipt fallbacks from `/render/invoice/:orderId` and `/render/track/:orderId`. Nonexistent orders return standard 404 luxury cards; unauthorized users receive 403 Access Denied.

### 3. Server-Side Cryptographic Token Architecture
- Created shared authentication module in `server/src/auth/` and `mcp/src/auth/`:
  - `tokens.ts`: SHA-256 token hashing (`personal_access_tokens`), RFC 7636 PKCE S256 verification, and HMAC-SHA256 signed resource tokens.
  - `accountLinking.ts`: 6-digit cryptographic challenge linking with 10-minute expiration and 3-attempt brute-force protection.
  - `identity.ts`: Canonical context resolution from Firebase ID tokens, hashed PATs, or OAuth bearer tokens.
  - `authorization.ts`: Strong role separation between customers and administrators.

### 4. Firestore Security Hardening
- Rebuilt `firestore.rules` with strict ownership:
  - `orders`: Readable and writable only by the authenticated creator matching `request.auth.uid == resource.data.userId`. Total amount and payment status fields cannot be modified by clients.
  - `users`: User documents locked to `request.auth.uid == userId`. Administrative roles and account linking metadata cannot be self-assigned.
  - System collections (`personal_access_tokens`, `oauth_tokens`, `oauth_codes`, `auth_challenges`, `whatsapp_identities`, `sessions`, `mcpTokens`): Completely closed to direct client read/write (`allow read, write: if false;`).

---

## Verification & Test Results
Automated security test suite (`tests/auth.test.ts`):
- **25 Tests Executed** across 7 suites.
- **Pass Rate:** 100% (25 passed, 0 failed).
- Coverage includes SHA-256 hashing, PKCE verification, HMAC temporary signature validation, customer isolation (preventing Customer A from viewing Customer B's order), E.164 phone normalization, and Meta webhook HMAC signature checks.
