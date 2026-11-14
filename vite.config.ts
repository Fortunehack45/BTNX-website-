import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

const PRODUCT_METADATA: Record<string, { name: string; category: string; price: string }> = {
  'ny-1': { name: 'Purple Brooklyn Hoodie', category: 'Womenswear · Fleece', price: '₦85,000' },
  'ny-2': { name: 'Cropped Space Overshirt', category: 'Womenswear · Outerwear', price: '₦78,000' },
  'ny-3': { name: 'Birmania Sunt Knitwear', category: 'Unisex · Knitwear', price: '₦70,000' },
  'ny-4': { name: 'Layering Origin Crewneck', category: 'Womenswear · Jersey', price: '₦90,000' },
  'ny-5': { name: 'Melburne College Cardigan', category: 'Womenswear · Knitwear', price: '₦82,000' },
  'ny-6': { name: 'Royale Leather Blouson', category: 'Outerwear · Leather', price: '₦84,000' },
  '1': { name: 'Purple Brooklyn Hoodie', category: 'Womenswear · Fleece', price: '₦85,000' },
  '2': { name: 'Cropped Space Overshirt', category: 'Womenswear · Outerwear', price: '₦78,000' },
  '3': { name: 'Birmania Sunt Knitwear', category: 'Unisex · Knitwear', price: '₦70,000' },
  '4': { name: 'Layering Origin Crewneck', category: 'Womenswear · Jersey', price: '₦90,000' },
  '5': { name: 'Melburne College Cardigan', category: 'Womenswear · Knitwear', price: '₦82,000' },
  '6': { name: 'Royale Leather Blouson', category: 'Outerwear · Leather', price: '₦84,000' },
};

function resolveDeploymentOrigin(reqHost?: string): string {
  const envUrl =
    process.env.SITE_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    '';
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
  }
  if (reqHost) {
    const proto = reqHost.includes('localhost') || reqHost.includes('127.0.0.1') ? 'http' : 'https';
    return `${proto}://${reqHost}`;
  }
  return '';
}

function multiPageRootsPlugin() {
  return {
    name: 'multi-page-roots',
    transformIndexHtml(html: string, ctx?: any) {
      const reqHost = ctx?.req?.headers?.host || '';
      const targetOrigin = resolveDeploymentOrigin(reqHost);

      let transformed = html;
      if (targetOrigin) {
        transformed = transformed.replace(
          /content="\/btnx-og-preview\.jpg"/g,
          `content="${targetOrigin}/btnx-og-preview.jpg"`
        );
      }

      const reqUrl = ctx?.originalUrl || ctx?.path || ctx?.req?.url || '';
      let productId = '';
      if (reqUrl.includes('product=')) {
        const match = reqUrl.match(/product=([^&#]+)/);
        if (match) productId = decodeURIComponent(match[1]);
      } else {
        const match = reqUrl.match(/\/(?:product|p)\/([^/?#]+)/);
        if (match) productId = decodeURIComponent(match[1]);
      }

      if (productId) {
        const cleanId = productId.startsWith('ny-') ? productId : `ny-${productId}`;
        const prod = PRODUCT_METADATA[cleanId] || PRODUCT_METADATA[productId];
        if (prod) {
          const ogImgPath = `/og/${cleanId}.jpg`;
          const fullImgUrl = targetOrigin ? `${targetOrigin}${ogImgPath}` : ogImgPath;
          const pageTitle = `${prod.name} — BTNX Store`;
          const pageDesc = `${prod.price} · ${prod.category}. Official BTNX piece with fast nationwide delivery from Osun.`;

          transformed = transformed
            .replace(/<title>[^<]*<\/title>/, `<title>${pageTitle}</title>`)
            .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${pageTitle}"`)
            .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${pageTitle}"`)
            .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${pageDesc}"`)
            .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${pageDesc}"`)
            .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${pageDesc}"`)
            .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${fullImgUrl}"`)
            .replace(/<meta property="og:image:secure_url" content="[^"]*"/, `<meta property="og:image:secure_url" content="${fullImgUrl}"`)
            .replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${fullImgUrl}"`)
            .replace(/<link rel="image_src" href="[^"]*"/, `<link rel="image_src" href="${fullImgUrl}"`);
        }
      }
      return transformed;
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        const url = req.url || '';
        const pathname = url.split('?')[0];
        const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
        if (!pathname.includes('.')) {
          if (pathname === '/admin' || pathname.startsWith('/admin/')) {
            req.url = `/admin/index.html${query}`;
          } else if (pathname === '/support-staff' || pathname.startsWith('/support-staff') || pathname === '/support/staff' || pathname.startsWith('/support/staff')) {
            req.url = `/support/index.html${query}`;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [multiPageRootsPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin/index.html'),
          support: path.resolve(__dirname, 'support/index.html'),
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
