# BTNX Production Security & Deployment Checklist

## 1. Environment Variables Matrix

The following environment variables are required across the BTNX application ecosystem. Never commit real secrets to source control.

| Variable Name | Required By | Description / Expected Value |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Storefront, Server, MCP | GCP Firebase Project ID (e.g. `expenses-ai-vfx7o`). |
| `FIRESTORE_DATABASE_ID` | Storefront, Server, MCP | Target Firestore database ID (e.g. `ai-studio-klamby-efc211be-fa31-444f-8359-2e516e0d2638`). |
| `FIREBASE_API_KEY` | Storefront, Server, MCP | Web Client Firebase API key. |
| `FIREBASE_ADMIN_EMAIL` | Server, MCP Serverless | Service account or admin user email used for background server administrative operations. |
| `FIREBASE_ADMIN_PASSWORD` | Server, MCP Serverless | Strong secret password for administrative backend worker account. |
| `META_APP_SECRET` | Server (WhatsApp) | Meta App Secret from Meta Developer Dashboard for timing-safe HMAC webhook verification (`x-hub-signature-256`). |
| `WHATSAPP_VERIFY_TOKEN` | Server (WhatsApp) | Random high-entropy token configured in Meta App Dashboard for webhook challenge handshake. |
| `SESSION_SECRET` | Server, MCP | 256-bit cryptographically secure key used to sign temporary HMAC resource tokens (`?sig=...&exp=...`). |
| `MCP_ADMIN_API_KEY` | Server, MCP | Optional high-entropy secret key for server-to-server privileged administrative MCP access (`x-mcp-admin-key`). |
| `GEMINI_API_KEY` | Server | Google Gemini API key for WhatsApp conversational fashion styling and AI fit consultations. |

---

## 2. Git History Credential Cleanup & Revocation

The following legacy credentials were historically present in commits and must be revoked immediately in their respective provider consoles:

1. **Firebase Admin Service Password (`BtnxMcpService2026!`):**
   - Access Firebase Authentication Console -> Users.
   - Locate `mcp-service@btnx.store` (or related service accounts).
   - Rotate the password immediately to a high-entropy string generated with a secure password manager.
   - Update `FIREBASE_ADMIN_PASSWORD` in Vercel and production deployment environment variables.

2. **Master Key (`btnx_mcp_secret_2026`):**
   - Completely deleted from source code and ignored. No system accepts this key.

3. **Meta Verify Token (`btnx_secret_token`):**
   - Configure a new random 32-character string in the Meta Developer Console -> WhatsApp -> Configuration -> Webhook -> Edit Callback URL.
   - Set the corresponding `WHATSAPP_VERIFY_TOKEN` in your server environment variables.

---

## 3. Deployment Checklist

- [ ] **1. Deploy Firestore Security Rules:**
  ```bash
  firebase deploy --only firestore:rules
  ```
  Verify in Firebase Console that rules match [firestore.rules](file:///c:/Users/USER%20PC/Desktop/BTNX/firestore.rules).

- [ ] **2. Deploy Remote MCP Server (Vercel):**
  ```bash
  cd mcp
  vercel --prod
  ```
  Verify environment variables in Vercel Project Settings -> Environment Variables:
  - `FIREBASE_ADMIN_EMAIL`
  - `FIREBASE_ADMIN_PASSWORD`
  - `SESSION_SECRET`

- [ ] **3. Test Claude Connector:**
  - In Claude AI: Settings -> Add Custom Connector.
  - URL: `https://btnx-website-mcp.vercel.app/mcp`
  - Ensure status shows green/connected with no 405 error.

- [ ] **4. Test ChatGPT OAuth Discovery:**
  - In ChatGPT: Explore GPTs / Custom Actions.
  - URL: `https://btnx-website-mcp.vercel.app/mcp`
  - Ensure OAuth discovery completes without "Couldn't discover OAuth settings".

- [ ] **5. Run Automated Security Suite:**
  ```bash
  npm test
  ```
  Ensure all 25 tests pass.
