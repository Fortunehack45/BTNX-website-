# BTNX Luxury Atelier & Storefront

A modern luxury streetwear and tailoring e-commerce platform built with React, TypeScript, Tailwind CSS, Motion, and Firebase. BTNX features an editorial-grade storefront, an administrative management console, a dedicated customer support staff desk, a full-featured WhatsApp conversational commerce bot, and a Model Context Protocol (MCP) server for AI assistants like Claude, Cursor, and ChatGPT.

---

## Architecture Overview

```
BTNX-website/
├── src/                  # Main Storefront & Integrated Portals
│   ├── components/       # Editorial UI (Hero, ProductModal, Header, Bag, etc.)
│   ├── pages/            # Shop, Bag, TrackOrder, Support, AdminPortal
│   └── data.ts           # Product catalog definitions & editorial lookbook
├── admin/                # Dedicated Admin Portal Sub-App (/admin)
├── support/              # Dedicated Customer Support Staff Desk (/support-staff)
├── server/               # Express API & WhatsApp Webhook Server (Port 4000)
│   ├── src/ui/           # Standalone visual HTML renderers (Product Cards, Invoices, Stepper)
│   └── src/services/     # WhatsApp Business API webhook & conversational engine
├── mcp/                  # BTNX Model Context Protocol (MCP) Server
│   └── src/              # 10 tools for Claude Desktop, Cursor, and ChatGPT
└── public/               # Static assets & brand imagery
```

---

## Features

1. **Editorial Storefront**:
   - Ultra-responsive, high-fashion layout with fluid dark/light luxury modes.
   - Live synchronization with the administrative inventory and catalog.
   - Pinned Hero lookbook carousel configured directly from the admin panel.
   - Dynamic OpenGraph and Twitter social link previews with real product imagery.
   - Client Care portal with live order attachment, status tracking, and inquiry history.

2. **Admin Portal (`/admin`)**:
   - Complete product management: price, stock, category, sizes, colors, and badges.
   - Granular garment specifications: **Fabric & Care**, **Fit & Wash Instructions**, **Delivery Timeline**, **Packaging Spec**, and **Return Policy**.
   - Shipping controls: Free shipping eligibility toggle and custom per-item delivery fee overrides.
   - Hero lookbook pinning and visual sorting.
   - Customer service ticket triage console with live human agent reply capabilities.

3. **Customer Support Staff Desk (`/support-staff`)**:
   - Dedicated dashboard for human support specialists.
   - Real-time inquiry queue with live thread status (Open, Escalated, Resolved).
   - Instant reply dispatch directly into customer threads.

4. **WhatsApp Conversational Bot**:
   - Real-time order tracking (`track <order_id>`).
   - Visual interactive garment dossier cards (`card <product_id>`).
   - Official digital invoices with verified stamps (`invoice <order_id>`).
   - Direct support ticket creation (`support: <message>`).

5. **Model Context Protocol (MCP) Server**:
   - Compatible with Claude Desktop, Cursor, and ChatGPT.
   - Tools for checking promo codes (`BTNX50`), calculating orders, recommending fits, creating orders, tracking shipments, and generating luxury HTML widgets.

---

## Quick Start (Run Locally)

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### 1. Install Dependencies
```bash
# Install root storefront dependencies
npm install

# Install server dependencies
npm install --prefix server

# Install MCP server dependencies
npm install --prefix mcp
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Start Development Servers
Run the storefront and backend concurrently:
```bash
# Terminal 1: Storefront (Vite)
npm run dev

# Terminal 2: API & WhatsApp Server (Express)
npm run dev:api

# Terminal 3 (Optional): Build and run MCP Server
npm run build:mcp
npm run dev:mcp
```

- **Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Support Staff Desk**: [http://localhost:3000/support-staff](http://localhost:3000/support-staff)
- **API & Visual Renderer**: [http://localhost:4000](http://localhost:4000)

---

## How to Deploy Everything

### 1. Deploy the Frontend (Storefront, Admin & Support)

The frontend is a multi-page Vite single-page application (SPA). It can be deployed to **Vercel**, **Netlify**, or **Firebase Hosting**.

#### Option A: Deploy to Vercel (Recommended)
1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your `BTNX-website` repository.
4. Set the build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. The included `vercel.json` automatically handles routing for:
   - `/` -> Storefront
   - `/admin` -> Admin Portal
   - `/support-staff` -> Customer Support Desk
6. Click **Deploy**.

#### Option B: Deploy to Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

---

### 2. Deploy the Backend & WhatsApp Webhook Server (`server/`)

The API server powers WhatsApp webhooks and renders visual standalone cards (`/render/*`). It can be hosted on **Render**, **Railway**, **Fly.io**, or any cloud VPS.

#### Deploying on Render / Railway:
1. Create a new **Web Service** pointing to your repository.
2. Configure the service settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Add Environment Variables:
   - `PORT`: `4000` (or leave default assigned by platform)
   - `WHATSAPP_TOKEN`: Meta WhatsApp Cloud API access token
   - `WHATSAPP_VERIFY_TOKEN`: Your custom webhook verification token
   - `PHONE_NUMBER_ID`: Your Meta WhatsApp Business Phone Number ID
   - `STORE_URL`: Your deployed frontend domain (e.g. `https://btnx.store`)
4. Copy the public URL provided by the host (e.g., `https://btnx-api.onrender.com`).

#### Configuring the WhatsApp Business Webhook:
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/).
2. Select your WhatsApp app -> **Configuration**.
3. Set **Callback URL** to: `https://your-api-domain.com/api/whatsapp/webhook`
4. Set **Verify Token** to the value of your `WHATSAPP_VERIFY_TOKEN`.
5. Under Webhook Fields, subscribe to **`messages`**.

---

### 3. Deploy & Connect the MCP Server (`mcp/`)

The MCP server allows Claude, Cursor, and other AI agents to browse products, check order status, create orders, and render UI cards.

#### Build the MCP Server:
```bash
npm run build --prefix mcp
```

#### Connect to Claude Desktop:
Edit your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the BTNX server:
```json
{
  "mcpServers": {
    "btnx-store": {
      "command": "node",
      "args": [
        "C:/path/to/BTNX/mcp/dist/index.js"
      ],
      "env": {
        "STORE_API_URL": "http://localhost:4000"
      }
    }
  }
}
```

#### Connect to Cursor:
Go to **Cursor Settings** -> **Features** -> **MCP**, click **Add New MCP Server**:
- **Type**: `command`
- **Name**: `btnx-store`
- **Command**: `node /absolute/path/to/BTNX/mcp/dist/index.js`

---

## License
Private and proprietary. All rights reserved by BTNX Atelier.
