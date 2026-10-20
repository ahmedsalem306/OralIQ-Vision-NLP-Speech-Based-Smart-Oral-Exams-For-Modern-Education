import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    // Only for the build-time render of the home page (scripts/prerender.mjs): bundle the
    // dependencies into that one-off Node build so it runs without ESM/CommonJS mismatches
    ssr: {
        noExternal: true,
    },
})
