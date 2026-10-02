import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    hmr: false,
    // Host preview Freebuff memakai domain *.e2b.app — izinkan agar tidak diblokir
    // oleh proteksi DNS-rebinding Vite. Hanya berlaku untuk dev server.
    allowedHosts: true,
    port: Number(process.env.PORT) || 5173,
  },
});
