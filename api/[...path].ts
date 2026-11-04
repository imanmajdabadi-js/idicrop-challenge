import type { VercelRequest, VercelResponse } from "@vercel/node";

const UPSTREAM = "https://ts.idicorp.ir";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const upstreamUrl = new URL(req.url ?? "/", UPSTREAM);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const method = req.method ?? "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : req;

  const upstream = await fetch(upstreamUrl.toString(), {
    method,
    headers,
    body: body as BodyInit | undefined,
    // @ts-expect-error duplex
    duplex: "half",
  });

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    if (key.toLowerCase() === "transfer-encoding") return;
    if (key.toLowerCase() === "content-encoding") return;
    res.setHeader(key, value);
  });
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    res.setHeader(
      "set-cookie",
      setCookies.map((c) => c.replace(/;\s*Domain=[^;]+/i, "")),
    );
  }

  if (!upstream.body) {
    res.end();
    return;
  }
  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
' 
filePath=C:\code\idicorp-frontend-challenge\api\[...path].ts