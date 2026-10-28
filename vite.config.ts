import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://ts.idicorp.ir",
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const setCookie = proxyRes.headers["set-cookie"];
            if (setCookie) {
              proxyRes.headers["set-cookie"] = setCookie.map((cookie) =>
                cookie.replace(/;\s*Domain=[^;]+/i, ""),
              );
            }
          });
        },
      },
      "/ws": {
        target: "https://ts.idicorp.ir",
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
