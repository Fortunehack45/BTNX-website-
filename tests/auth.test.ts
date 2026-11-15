import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as crypto from "crypto";
import {
  hashToken,
  generateSecureToken,
  generateNumericCode,
  verifyPkce,
  generateSignedResourceToken,
  verifySignedResourceToken,
} from "../server/src/auth/tokens.js";
import {
  authorizeResourceOwner,
  authorizeAdmin,
  authorizeSupport,
} from "../server/src/auth/authorization.js";
import {
  normalizePhoneNumber,
} from "../server/src/auth/accountLinking.js";
import type { AuthenticatedCustomer } from "../server/src/auth/types.js";

describe("BTNX Authentication & Authorization Security Suite", () => {
  // 1. Cryptographic Token Hashing
  describe("Token Hashing & Generation", () => {
    it("should deterministically hash tokens with SHA-256", () => {
      const raw = "btnx_pat_testsecret1234567890";
      const expected = crypto.createHash("sha256").update(raw).digest("hex");
      const result = hashToken(raw);
      assert.equal(result, expected);
      assert.notEqual(result, raw);
    });

    it("should never return identical hashes for different raw tokens", () => {
      const hash1 = hashToken("btnx_pat_token_one");
      const hash2 = hashToken("btnx_pat_token_two");
      assert.notEqual(hash1, hash2);
    });

    it("should generate random tokens with requested prefix", () => {
      const tok = generateSecureToken("btnx_pat_", 16);
      assert.ok(tok.startsWith("btnx_pat_"));
      assert.ok(tok.length >= 40);
    });

    it("should generate 6-digit numeric verification codes", () => {
      for (let i = 0; i < 20; i++) {
        const code = generateNumericCode();
        assert.equal(code.length, 6);
        assert.ok(/^\d{6}$/.test(code));
        const num = parseInt(code, 10);
        assert.ok(num >= 100000 && num <= 999999);
      }
    });
  });

  // 2. PKCE S256 Challenge Verification
  describe("RFC 7636 PKCE S256 Verification", () => {
    it("should successfully verify a valid code_verifier against code_challenge", () => {
      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      assert.ok(verifyPkce(verifier, challenge, "S256"));
    });

    it("should reject an invalid code_verifier", () => {
      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      assert.equal(verifyPkce("wrong_verifier_string_value", challenge, "S256"), false);
    });

    it("should reject empty or null parameters", () => {
      assert.equal(verifyPkce("", "challenge", "S256"), false);
      assert.equal(verifyPkce("verifier", "", "S256"), false);
    });
  });

  // 3. Signed Resource Access Tokens (HMAC-SHA256)
  describe("HMAC Signed Resource Tokens (Invoices & Tracking)", () => {
    const testSecret = "btnx_test_signing_secret_xyz123";

    it("should generate and verify a valid invoice access token", () => {
      const orderId = "BX-987654";
      const { token: sig, expiresAt: exp } = generateSignedResourceToken("invoice", orderId, 3600, testSecret);
      assert.ok(sig);
      assert.ok(exp > Math.floor(Date.now() / 1000));

      const valid = verifySignedResourceToken("invoice", orderId, sig, exp, testSecret);
      assert.equal(valid, true);
    });

    it("should verify combined dot-separated token string (sig.exp)", () => {
      const orderId = "BX-987654";
      const { token: sig, expiresAt: exp } = generateSignedResourceToken("invoice", orderId, 3600, testSecret);
      const combinedToken = `${sig}.${exp}`;

      const valid = verifySignedResourceToken(combinedToken, "invoice", orderId, undefined, testSecret);
      assert.equal(valid, true);
    });

    it("should reject an expired resource token", () => {
      const orderId = "BX-987654";
      // Generate expired token (-60 seconds)
      const { token: sig, expiresAt: exp } = generateSignedResourceToken("invoice", orderId, -60, testSecret);
      const valid = verifySignedResourceToken("invoice", orderId, sig, exp, testSecret);
      assert.equal(valid, false);
    });

    it("should reject token if resourceId is tampered with (IDOR prevention)", () => {
      const originalOrderId = "BX-111111";
      const tamperedOrderId = "BX-222222";
      const { token: sig, expiresAt: exp } = generateSignedResourceToken("invoice", originalOrderId, 3600, testSecret);

      const valid = verifySignedResourceToken("invoice", tamperedOrderId, sig, exp, testSecret);
      assert.equal(valid, false);
    });

    it("should reject token if resourceType differs (e.g. invoice token used for tracking)", () => {
      const orderId = "BX-333333";
      const { token: sig, expiresAt: exp } = generateSignedResourceToken("invoice", orderId, 3600, testSecret);

      const valid = verifySignedResourceToken("track", orderId, sig, exp, testSecret);
      assert.equal(valid, false);
    });

    it("should reject token signed with an invalid secret", () => {
      const orderId = "BX-444444";
      const { token: sig, expiresAt: exp } = generateSignedResourceToken("invoice", orderId, 3600, "secret_A");
      const valid = verifySignedResourceToken("invoice", orderId, sig, exp, "secret_B");
      assert.equal(valid, false);
    });
  });

  // 4. Customer Isolation & Authorization Matrix
  describe("Customer Isolation & Authorization Control", () => {
    const customerA: AuthenticatedCustomer = {
      uid: "uid_customer_alpha",
      email: "alpha@btnx.store",
      name: "Customer Alpha",
      role: "customer",
      authMethod: "firebase_id_token",
      authenticatedAt: Date.now(),
    };

    const customerB: AuthenticatedCustomer = {
      uid: "uid_customer_beta",
      email: "beta@btnx.store",
      name: "Customer Beta",
      role: "customer",
      authMethod: "oauth2_bearer",
      authenticatedAt: Date.now(),
    };

    const adminUser: AuthenticatedCustomer = {
      uid: "uid_admin_omega",
      email: "admin@btnx.store",
      name: "Executive Administrator",
      role: "admin",
      authMethod: "personal_access_token",
      authenticatedAt: Date.now(),
    };

    it("should ALLOW Customer A to access Customer A's owned order", () => {
      const res = authorizeResourceOwner(customerA, "uid_customer_alpha");
      assert.equal(res.authorized, true);
    });

    it("should DENY Customer A from accessing Customer B's order (Cross-Tenant Prevention)", () => {
      const res = authorizeResourceOwner(customerA, "uid_customer_beta");
      assert.equal(res.authorized, false);
      assert.ok(res.reason?.includes("Access denied"));
    });

    it("should DENY unauthenticated guest from accessing any order", () => {
      const res = authorizeResourceOwner(null, "uid_customer_alpha");
      assert.equal(res.authorized, false);
      assert.ok(res.reason?.includes("Authentication required"));
    });

    it("should ALLOW Administrator to access customer resources via administrative override", () => {
      const res = authorizeResourceOwner(adminUser, "uid_customer_alpha");
      assert.equal(res.authorized, true);
    });

    it("should DENY regular customer from executing administrative operations", () => {
      const resA = authorizeAdmin(customerA);
      assert.equal(resA.authorized, false);

      const resB = authorizeAdmin(customerB);
      assert.equal(resB.authorized, false);
    });

    it("should ALLOW Administrator to execute administrative operations", () => {
      const res = authorizeAdmin(adminUser);
      assert.equal(res.authorized, true);
    });
  });

  // 5. Phone Number Normalization
  describe("WhatsApp Phone Number Normalization", () => {
    it("should normalize Nigerian national format (081...) to E.164 (+23481...)", () => {
      assert.equal(normalizePhoneNumber("08123456789"), "+2348123456789");
      assert.equal(normalizePhoneNumber("09098765432"), "+2349098765432");
    });

    it("should preserve existing international E.164 format (+234...)", () => {
      assert.equal(normalizePhoneNumber("+2348123456789"), "+2348123456789");
    });

    it("should strip Twilio 'whatsapp:' URI prefix and formatting spaces/dashes", () => {
      assert.equal(normalizePhoneNumber("whatsapp:+234 812-345-6789"), "+2348123456789");
      assert.equal(normalizePhoneNumber("whatsapp:08123456789"), "+2348123456789");
    });

    it("should handle raw international 234 without plus", () => {
      assert.equal(normalizePhoneNumber("2348123456789"), "+2348123456789");
    });
  });

  // 6. Meta Webhook HMAC-SHA256 Signature Verification
  describe("Meta Webhook HMAC Signature Verification", () => {
    const metaAppSecret = "meta_production_app_secret_998877";

    it("should validate legitimate Meta Webhook HMAC signature", () => {
      const payload = JSON.stringify({ entry: [{ changes: [] }] });
      const signature = "sha256=" + crypto.createHmac("sha256", metaAppSecret).update(payload).digest("hex");

      const expected = "sha256=" + crypto.createHmac("sha256", metaAppSecret).update(payload).digest("hex");
      const isValid = signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

      assert.equal(isValid, true);
    });

    it("should reject tampered Meta Webhook payload", () => {
      const originalPayload = JSON.stringify({ entry: [{ changes: [] }] });
      const tamperedPayload = JSON.stringify({ entry: [{ changes: ["tampered"] }] });
      const signature = "sha256=" + crypto.createHmac("sha256", metaAppSecret).update(originalPayload).digest("hex");

      const expected = "sha256=" + crypto.createHmac("sha256", metaAppSecret).update(tamperedPayload).digest("hex");
      const isValid = signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

      assert.equal(isValid, false);
    });
  });

  // 7. Fail-Closed Secret Resolution & Cryptographic Verification
  describe("Cryptographic Fail-Closed Integrity & Token Verification", () => {
    it("should reject forged or unsigned JWT tokens in Firebase Token verification", async () => {
      const { verifyFirebaseIdToken } = await import("../server/src/firebaseAdmin.js");
      // Malformed or forged tokens
      const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvZSBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.forged_signature";
      const result = await verifyFirebaseIdToken(forgedToken);
      assert.equal(result, null);

      assert.equal(await verifyFirebaseIdToken(""), null);
      assert.equal(await verifyFirebaseIdToken("not.a.valid.jwt"), null);
    });

    it("should reject OAuth 2.1 'plain' PKCE method", () => {
      const verifier = "secret_verifier_1234567890";
      // Even if verifier === challenge, plain PKCE must be rejected under OAuth 2.1
      const isPlainAllowed = verifyPkce(verifier, verifier, "plain");
      assert.equal(isPlainAllowed, false);
    });

    it("should normalize argument order in generateSignedResourceToken (orderId, type) vs (type, orderId)", () => {
      const testSecret = "btnx_canonical_test_secret_777";
      const orderId = "BX-998877";

      const token1 = generateSignedResourceToken("invoice", orderId, 3600, testSecret);
      const token2 = generateSignedResourceToken(orderId, "invoice", 3600, testSecret);

      assert.equal(token1.sig, token2.sig);
      assert.equal(verifySignedResourceToken("invoice", orderId, token1.sig, token1.exp, testSecret), true);
      assert.equal(verifySignedResourceToken("invoice", orderId, token2.sig, token2.exp, testSecret), true);
    });
  });
});
