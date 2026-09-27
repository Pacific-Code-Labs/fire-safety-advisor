import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 5173, // landing 5173 · app 5174 · admin 5175 (root reboot-server.sh)
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  // Public marketing site only: the app (sokol-app) and the admin console
  // (sokol-admin) are separate apps; no admin or auth code ships here.
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
