import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
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
    transformIndexHtml(html: string) {
      const targetOrigin = resolveDeploymentOrigin();
      if (!targetOrigin || targetOrigin === DEFAULT_PUBLIC_ORIGIN) return html;
      return html.replaceAll(DEFAULT_PUBLIC_ORIGIN, targetOrigin);
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        const url = req.url || '';
        const pathname = url.split('?')[0];
        const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
        if (!pathname.includes('.')) {
          if (pathname === '/admin' || pathname.startsWith('/admin/')) {
            req.url = `/admin/index.html${query}`;
          } else if (pathname === '/support' || pathname.startsWith('/support/')) {
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
