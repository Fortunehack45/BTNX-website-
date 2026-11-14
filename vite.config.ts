import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function multiPageRootsPlugin() {
  return {
    name: 'multi-page-roots',
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
