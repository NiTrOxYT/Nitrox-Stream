import { NextRequest, NextResponse } from 'next/server';

function rewriteCssUrls(css: string, sourceOrigin: string, serverOrigin: string, cssUrl?: string): string {
  const proxyAsset = (path: string) =>
    `${serverOrigin}/api/proxy-asset?url=${encodeURIComponent(path)}`;

  let cssBase: string | undefined;
  if (cssUrl) {
    try {
      const cssUri = new URL(cssUrl);
      const dir = cssUri.pathname.substring(0, cssUri.pathname.lastIndexOf('/') + 1);
      cssBase = cssUri.origin + dir;
    } catch { /* ignore */ }
  }

  return css.replace(
    /url\((['"]?)([^'")\s]+)\1\)/gi,
    (match, q, path) => {
      if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
        return match;
      }
      if (path.startsWith('//')) {
        return `url('${proxyAsset('https:' + path)}')`;
      }
      if (path.startsWith('/')) {
        return `url('${proxyAsset(sourceOrigin + path)}')`;
      }
      if (cssBase) {
        const resolved = new URL(path, cssBase).href;
        return `url('${proxyAsset(resolved)}')`;
      }
      return match;
    }
  );
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function stripDomain(cookie: string): string {
  return cookie.replace(/;\s*Domain\s*=[^;]+/i, '');
}

function buildResponseHeaders(response: Response, serverOrigin: string, contentType: string): Headers {
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Cache-Control', 'public, max-age=86400');

  // Forward Set-Cookie from upstream (strip Domain so it applies to our origin)
  const upstreamCookies = response.headers.getSetCookie?.() || [];
  for (const cookie of upstreamCookies) {
    headers.append('Set-Cookie', stripDomain(cookie));
  }

  return headers;
}

async function proxyRequest(request: NextRequest, method: string) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    // Build upstream headers
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': UA,
      'Referer': 'https://vidlink.pro/',
    };

    // Forward Content-Type for request body
    const ct = request.headers.get('content-type');
    if (ct) {
      upstreamHeaders['Content-Type'] = ct;
    }

    // Forward cookies from the original request to the upstream
    const cookies = request.headers.get('cookie');
    if (cookies) {
      upstreamHeaders['Cookie'] = cookies;
    }

    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      body = await request.text();
    }

    const response = await fetch(decodedUrl, {
      method,
      headers: upstreamHeaders,
      body,
    });

    if (!response.ok) {
      const respHeaders = new Headers();
      respHeaders.set('Access-Control-Allow-Origin', '*');
      const upstreamCookies = response.headers.getSetCookie?.() || [];
      for (const cookie of upstreamCookies) {
        respHeaders.append('Set-Cookie', stripDomain(cookie));
      }
      return new NextResponse(response.statusText, { status: response.status, headers: respHeaders });
    }

    const serverOrigin = new URL(request.url).origin;
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // For CSS, rewrite internal url() references
    if (contentType.includes('css') || contentType.includes('stylesheet')) {
      const sourceOrigin = new URL(decodedUrl).origin;
      const text = await response.text();
      const rewritten = rewriteCssUrls(text, sourceOrigin, serverOrigin, decodedUrl);
      return new NextResponse(rewritten, {
        status: 200,
        headers: buildResponseHeaders(response, serverOrigin, contentType),
      });
    }

    const buf = await response.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: buildResponseHeaders(response, serverOrigin, contentType),
    });
  } catch (error: any) {
    console.error('Asset proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy asset', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, 'DELETE');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
