import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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

export default defineConfig({
  plugins: [
    {
      name: 'support-og-origin',
      transformIndexHtml(html: string) {
        const targetOrigin = resolveDeploymentOrigin();
        if (!targetOrigin || targetOrigin === DEFAULT_PUBLIC_ORIGIN) return html;
        return html.replaceAll(DEFAULT_PUBLIC_ORIGIN, targetOrigin);
      },
    },
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3002,
    host: '0.0.0.0',
  },
});
