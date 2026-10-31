import type { VercelRequest, VercelResponse } from '@vercel/node';

const UPSTREAM_BASE = 'https://ts.idicorp.ir';

function stripUpstreamCookieDomain(setCookie: string): string {
  return setCookie.replace(/;\s*Domain=[^;]*/gi, '');
}

function forwardHeaders(req: VercelRequest, upstreamHeaders: Headers) {
  const headersToForward = ['authorization', 'cookie', 'content-type', 'accept', 'origin', 'user-agent', 'accept-language'];
  for (const name of headersToForward) {
    const value = req.headers[name];
    if (value) {
      if (Array.isArray(value)) {
        upstreamHeaders.set(name, value.join(', '));
      } else {
        upstreamHeaders.set(name, value);
      }
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathParts = Array.isArray(req.query['path']) ? req.query['path'] as string[] : (req.query['path'] ? [req.query['path'] as string] : []);
    const path = '/' + pathParts.join('/');
    const url = req.url || '';
    const queryIndex = url.indexOf('?');
    const queryString = queryIndex >= 0 ? url.substring(queryIndex) : '';
    const finalUrl = UPSTREAM_BASE + path + queryString;

    const upstreamHeaders = new Headers();
    forwardHeaders(req, upstreamHeaders);
    const method = req.method || 'GET';
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const fetchOptions: RequestInit = { method, headers: upstreamHeaders, redirect: 'follow' };
    if (hasBody) {
      const body: any = (req as any).body;
      if (Buffer.isBuffer(body)) {
        fetchOptions.body = body as any;
      } else if (typeof body === 'string') {
        fetchOptions.body = body;
      } else if (body !== undefined && body !== null) {
        const contentType = String(req.headers['content-type'] || '');
        if (contentType.includes('application/json')) {
          fetchOptions.body = JSON.stringify(body);
        } else {
          fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
        }
      }
    }
    const upstreamResponse = await fetch(finalUrl, fetchOptions);
    res.status(upstreamResponse.status);
    const setCookies: string[] = [];
    upstreamResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'set-cookie') {
        setCookies.push(stripUpstreamCookieDomain(value));
      } else if (!(lowerKey === 'transfer-encoding' || lowerKey === 'connection' || lowerKey === 'keep-alive' || lowerKey === 'proxy-authenticate' || lowerKey === 'proxy-authorization' || lowerKey === 'te' || lowerKey === 'trailer' || lowerKey === 'upgrade')) {
        res.setHeader(key, value);
      }
    });
    if (setCookies.length > 0) {
      res.setHeader('Set-Cookie', setCookies);
    }
    if (!res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
    if (upstreamResponse.body) {
      const reader = (upstreamResponse.body as ReadableStream<Uint8Array>).getReader();
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          res.write(Buffer.from(result.value));
        }
      } finally {
        reader.releaseLock();
      }
    }
    res.end();
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(502).json({ error: 'Bad Gateway' });
  }
}
