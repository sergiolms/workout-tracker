import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';

// Component previews run independently from vinext, Cloudflare and Firebase.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
});
