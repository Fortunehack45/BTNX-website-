# Model Context Protocol (MCP) & OAuth 2.1 Technical Guide

## 1. Overview & Protocol Endpoints

The BTNX Remote MCP Server exposes tools, resources, and luxury visual UI cards to external AI clients such as **Claude AI** (Anthropic), **ChatGPT** (OpenAI), and **Cursor IDE**.

### Server Locations
- **Remote Production Server:** `https://btnx-website-mcp.vercel.app/mcp`
- **Local Development Server:** `http://localhost:4000/sse` (Dashboard: `http://localhost:4000/mcp`)

### Protocol Endpoints
| Endpoint | Method | RFC / Standard | Description |
|---|---|---|---|
| `/.well-known/oauth-authorization-server` | `GET` | RFC 8414 | OAuth 2.0 Authorization Server Metadata Discovery. |
| `/.well-known/oauth-protected-resource` | `GET` | RFC 9728 | OAuth 2.0 Protected Resource Metadata Discovery. |
| `/oauth/register` | `POST` | RFC 7591 | Dynamic Client Registration (required by ChatGPT / OpenAI). |
| `/oauth/authorize` | `GET` | RFC 6749 / OAuth 2.1 | Authorization endpoint rendering customer consent form with PKCE support. |
| `/oauth/token` | `POST` | RFC 6749 / RFC 7636 | Token exchange endpoint supporting PKCE S256 verification. |
| `/oauth/revoke` | `POST` | RFC 7009 | Token revocation endpoint. |
| `/mcp` | `GET` | Claude Connector Protocol | Returns 200 OK with `Link: rel="oauth-protected-resource"` and `WWW-Authenticate` headers. |
| `/mcp` | `POST` | Model Context Protocol | JSON-RPC 2.0 endpoint handling `tools/list` and `tools/call`. |
| `/render/:type/:id` | `GET` | BTNX Visual Card API | HTML card rendering for invoices, tracking, and catalog items protected by HMAC tokens. |

---

## 2. Resolving Client Compatibility Issues

### Claude "405 Not Found" Resolution
- **Symptom:** Claude Custom Connector reports: `Connecting to the server: 405 Not found`.
- **Cause:** Claude initiates an HTTP `GET` or `HEAD` probe to test connector health before issuing JSON-RPC requests over `POST`. The MCP server previously returned 405 for any non-POST request to `/mcp`.
- **Resolution:** Added explicit `GET`, `HEAD`, and `OPTIONS` handlers on `/mcp` returning HTTP 200 with standard discovery headers:
  ```http
  HTTP/1.1 200 OK
  Link: <https://btnx-website-mcp.vercel.app/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"
  WWW-Authenticate: Bearer resource_metadata="https://btnx-website-mcp.vercel.app/.well-known/oauth-protected-resource"
  Content-Type: application/json
  ```

### ChatGPT "Couldn't discover OAuth settings" Resolution
- **Symptom:** When connecting to custom MCP or plugins, ChatGPT displays: `Couldn't discover OAuth settings. Check the server URL or enter settings manually`.
- **Cause:** ChatGPT automated OAuth discovery requires:
  1. RFC 8414 metadata at `/.well-known/oauth-authorization-server`.
  2. RFC 7591 Dynamic Client Registration endpoint advertised as `registration_endpoint`.
- **Resolution:** Implemented `POST /oauth/register` (RFC 7591) which accepts client registration requests from ChatGPT and generates a dynamic `client_id` and `client_secret` stored in memory and Firestore.

---

## 3. Customer Authentication in MCP

### Option A: Personal Access Token (PAT)
- Ideal for Claude Custom Connectors and Cursor:
- Generate token on the BTNX user dashboard (`btnx_pat_[hex]`).
- Configure Custom Connector in Claude:
  - **Server URL:** `https://btnx-website-mcp.vercel.app/mcp`
  - **Authentication:** `Bearer token`
  - **Value:** `Bearer btnx_pat_...`

### Option B: OAuth 2.1 with PKCE
- Ideal for ChatGPT Plugins and automated integrations:
- Select **OAuth** authentication in ChatGPT settings.
- The user is redirected to BTNX Luxury Atelier authorization screen:
  - Authenticates with their BTNX customer credentials.
  - Grants consent for the AI client to access order history.
  - Exchanged token binds AI requests to the customer's permanent Firebase UID.

---

## 4. MCP Tools Catalog & Isolation Guarantee

| Tool Name | Scope Required | Verification Guarantee |
|---|---|---|
| `btnx_list_my_orders` | `orders:read` | Returns only orders where `order.userId === customer.uid`. Zero cross-tenant leakage. |
| `btnx_get_invoice` | `invoices:read` | Returns order details and HMAC-signed invoice card link for orders owned by the customer. |
| `btnx_track_order` | `tracking:read` | Returns real courier tracking checkpoints and signed tracking card link for customer's orders. |
| `btnx_list_products` | `catalog:read` | Public access to current atelier catalog and pricing in Naira. |
| `btnx_validate_promo_code` | `promos:read` | Validates promo codes against live Firestore `promoCodes` collection. Zero hardcoded promo fallbacks. |
| `btnx_calculate_body_fit` | `advisor:read` | AI tailor sizing consultant calculating structured fit recommendations based on height and weight. |
| `btnx_place_order` | `orders:write` | Places order on behalf of authenticated customer with verified UID ownership. |
