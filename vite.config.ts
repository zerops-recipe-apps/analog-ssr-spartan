import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import angular from '@analogjs/vite-plugin-angular';
import nitro from '@analogjs/vite-plugin-nitro';
import tailwindcss from '@tailwindcss/vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  build: {
    target: ['es2020'],
  },
  resolve: {
    mainFields: ['module'],
  },
  ssr: {
    noExternal: ['@spartan-ng/**'],
  },
  // tailwindcss() must run before analog() so the Angular/Vite template
  // transform sees Tailwind's generated utility classes already resolved.
  plugins: [tailwindcss(), viteTsConfigPaths(), analog(), angular(), nitro()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
