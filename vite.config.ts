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
        configure: (proxy) => {
          // /ws/echo authenticates the upgrade request with an Authorization header, which
          // browsers cannot set on a WebSocket. The client passes `?token=` and it becomes a header here.
          proxy.on('proxyReqWs', (proxyReq, req) => {
            const token = new URL(req.url ?? '', 'http://localhost').searchParams.get('token');

            if (token) {
              proxyReq.setHeader('Authorization', `Bearer ${token}`);
            }
          });
        },
      },
    },
  },
});