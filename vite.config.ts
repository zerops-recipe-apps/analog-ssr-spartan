import { defineConfig, type Plugin } from 'vite';
import analog from '@analogjs/platform';
import angular from '@analogjs/vite-plugin-angular';
import nitro from '@analogjs/vite-plugin-nitro';
import tailwindcss from '@tailwindcss/vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

// Analog's Nitro plugin runs the client and SSR Vite builds together and
// shares one Angular plugin instance (`sharedPlugins: true`). Whichever
// build finishes first clears that compiler in `buildEnd`. The other build
// then parses leftover .ts as JavaScript and dies on `export interface`.
function serializeAnalogEnvironmentBuilds(): Plugin {
  return {
    name: 'serialize-analog-environment-builds',
    enforce: 'post',
    configResolved(config) {
      const buildApp = config.builder?.buildApp;
      if (!buildApp) return;

      config.builder.buildApp = async (viteBuilder) => {
        const originalBuild = viteBuilder.build.bind(viteBuilder);
        let tail: Promise<void> = Promise.resolve();
        viteBuilder.build = (environment) => {
          const run = tail.then(() => originalBuild(environment));
          tail = run.then(
            () => undefined,
            () => undefined,
          );
          return run;
        };
        try {
          return await buildApp(viteBuilder);
        } finally {
          viteBuilder.build = originalBuild;
        }
      };
    },
  };
}

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
  plugins: [tailwindcss(), viteTsConfigPaths(), analog(), angular(), nitro(), serializeAnalogEnvironmentBuilds()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
