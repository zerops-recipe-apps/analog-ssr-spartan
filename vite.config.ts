import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
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
  plugins: [tailwindcss(), viteTsConfigPaths(), analog()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
