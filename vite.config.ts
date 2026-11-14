import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

const DEFAULT_PUBLIC_ORIGIN =
  'https://ais-pre-kjkltssvs2fz6l45o4su2z-18937950727.europe-west2.run.app';

function resolveDeploymentOrigin(): string {
  const raw =
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    (process.env.APP_URL ? process.env.APP_URL.replace('://ais-dev-', '://ais-pre-') : '') ||
    '';
  if (!raw) return DEFAULT_PUBLIC_ORIGIN;
  const clean = raw.trim().replace(/\/+$/, '');
  return clean.startsWith('http://') || clean.startsWith('https://')
    ? clean
    : `https://${clean}`;
}

function multiPageRootsPlugin() {
  return {
    name: 'multi-page-roots',
    transformIndexHtml(html: string, ctx?: any) {
      const targetOrigin = resolveDeploymentOrigin();
      let transformed =
        !targetOrigin || targetOrigin === DEFAULT_PUBLIC_ORIGIN
          ? html
          : html.replaceAll(DEFAULT_PUBLIC_ORIGIN, targetOrigin);

      const reqUrl = ctx?.originalUrl || ctx?.path || '';
      if (reqUrl.includes('product=')) {
        const match = reqUrl.match(/product=([^&#]+)/);
        const productId = match ? decodeURIComponent(match[1]) : '';
        if (productId) {
          try {
            const dataFile = path.resolve(__dirname, 'src/data.ts');
            if (fs.existsSync(dataFile)) {
              const fileContent = fs.readFileSync(dataFile, 'utf-8');
              const idRegex = new RegExp(`id:\\s*["']${productId}["'][\\s\\S]*?image:\\s*["']([^"']+)["']`);
              const imgMatch = fileContent.match(idRegex);
              const nameRegex = new RegExp(`id:\\s*["']${productId}["'][\\s\\S]*?name:\\s*["']([^"']+)["']`);
              const nameMatch = fileContent.match(nameRegex);
              if (imgMatch && imgMatch[1]) {
                const prodImage = imgMatch[1].startsWith('http')
                  ? imgMatch[1]
                  : `${targetOrigin || ''}${imgMatch[1].startsWith('/') ? '' : '/'}${imgMatch[1]}`;
                const prodName = nameMatch ? nameMatch[1] : 'BTNX Luxury Piece';
                transformed = transformed
                  .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${prodImage}"`)
                  .replace(/<meta property="og:image:secure_url" content="[^"]*"/, `<meta property="og:image:secure_url" content="${prodImage}"`)
                  .replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${prodImage}"`)
                  .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${prodName} — BTNX Store"`)
                  .replace(/<title>[^<]*<\/title>/, `<title>${prodName} — BTNX Store</title>`);
              }
            }
          } catch {}
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
