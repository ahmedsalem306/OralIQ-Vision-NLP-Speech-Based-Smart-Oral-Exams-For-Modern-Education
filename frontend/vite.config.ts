import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: isSsrBuild
            ? undefined
            : {
                  output: {
                      manualChunks(id) {
                          if (!id.includes("node_modules")) return undefined;
                          if (id.includes("@mediapipe")) return "vendor-vision";
                          if (id.includes("gsap") || id.includes("/motion/") || id.includes("framer-motion") || id.includes("lenis")) {
                              return "vendor-motion";
                          }
                          if (id.includes("lucide-react")) return "vendor-icons";
                          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) {
                              return "vendor-react";
                          }
                          return undefined;
                      },
                  },
              },
    },
    // Only for the build-time render of the home page (scripts/prerender.mjs): bundle the
    // dependencies into that one-off Node build so it runs without ESM/CommonJS mismatches
    ssr: {
        noExternal: true,
    },
}))
