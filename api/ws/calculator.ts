import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";

const UPSTREAM = "wss://ts.idicorp.ir/ws/calculator";

const server = http.createServer((_req, res) => {
  res.statusCode = 404;
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (client) => {
  const upstream = new WebSocket(UPSTREAM);
  const pending: Array<{ data: WebSocket.RawData; isBinary: boolean }> = [];
  upstream.on("open", () => {
    while (pending.length > 0) {
      const item = pending.shift();
      if (item) upstream.send(item.data, { binary: item.isBinary });
    }
  });
  client.on("message", (data, isBinary) => {
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(data, { binary: isBinary });
    } else if (upstream.readyState === WebSocket.CONNECTING) {
      pending.push({ data, isBinary });
    }
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
