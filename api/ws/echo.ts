import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";

const UPSTREAM = "wss://ts.idicorp.ir/ws/echo";

const server = http.createServer((_req, res) => {
  res.statusCode = 404;
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (client, req) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const token = url.searchParams.get("token") ?? "";
  if (token.trim().length === 0) {
    client.close(1008, "Missing token");
    return;
  }
  const upstream = new WebSocket(UPSTREAM, {
    headers: { Authorization: `Bearer ${token}` },
  });
  client.on("message", (data, isBinary) => {
    if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
  });
  upstream.on("message", (data, isBinary) => {
    if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
  });
  const closeBoth = () => {
    try { client.close(); } catch {}
    try { upstream.close(); } catch {}
  };
  client.on("close", closeBoth);
  upstream.on("close", closeBoth);
  client.on("error", closeBoth);
  upstream.on("error", closeBoth);
});

export default server;
' 
filePath=C:\code\idicorp-frontend-challenge\api\ws\echo.ts