import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true, // Fail if port 5173 is not available
  },
  plugins: [
    electron([
      {
        // Main process entry point
        entry: 'src/main.ts',
        vite: {
          build: {
            outDir: 'dist',
            rollupOptions: {
              external: ['electron']
            }
          }
        },
        onstart(args) {
          // Notify the renderer process to reload when the main process restarts
          args.reload();
        }
      },
      {
        // Preload script entry point
        entry: 'src/preload.ts',
        onstart(args) {
          // Notify the renderer process to reload when the preload script restarts
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        // Tool worker entry point
        entry: 'src/tool-worker.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  // Renderer process build config
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
  },
  clearScreen: false,
});
