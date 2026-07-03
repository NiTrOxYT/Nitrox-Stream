import { NextRequest, NextResponse } from 'next/server';

/**
 * Rewrite /_next/ resource paths within HTML attributes (src, href, srcset, url()).
 * Does NOT touch JavaScript string literals or RSC flight data inline scripts,
 * because naive regex replacement can corrupt escape sequences (e.g. \/_next\/).
 * Those are handled by the injected DOM patch script (appendChild/insertBefore).
 */
function rewriteAttributeUrls(html: string, vidlinkOrigin: string, serverOrigin: string): string {
  const proxyAsset = (path: string) =>
    `${serverOrigin}/api/proxy-asset?url=${encodeURIComponent(`${vidlinkOrigin}${path}`)}`;

  // 1. Rewrite /_next/ paths in src, href, srcset attributes
  html = html.replace(
    /(src|href|srcset)=(["'])(\/_next\/[^"']*)\2/gi,
    (_, attr, q, path) => `${attr}=${q}${proxyAsset(path)}${q}`
  );

  // 2. Rewrite /_next/ paths in url() references (inline CSS, style attributes)
  html = html.replace(
    /url\((['"]?)(\/_next\/[^'")\s]*)\1\)/gi,
    (_, q, path) => `url('${proxyAsset(path)}')`
  );

  // 3. Remove Cloudflare RUM <script> tags (explicit src version)
  html = html.replace(
    /<script[^>]*src=["'][^"']*\/cdn-cgi\/[^"']*["'][^>]*>[\s\S]*?<\/script>/gi,
    ''
  );

  return html;
}

function stripAds(html: string): string {
  html = html.replace(/<iframe[^>]*src=["'][^"']*bvlpjsmfnlxlw\.space[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/<a[^>]*href=["'][^"']*bvlpjsmfnlxlw\.space[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
  html = html.replace(/<script[^>]*src=["'][^"']*bvlpjsmfnlxlw[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(
    /<script[^>]*>[\s\S]*?(bvlpjsmfnlxlw|ad\/visit|popunder|popup)[\s\S]*?<\/script>/gi,
    ''
  );
  return html;
}

function buildPatchScript(serverOrigin: string, vidlinkOrigin: string): string {
  return `<script>
(function(){
  var proxy = '${serverOrigin}/api/proxy-asset?url=';
  var origin = '${vidlinkOrigin}';

  // Exclude our own proxy endpoint, /cdn-cgi/ (Cloudflare RUM), and blob/data URLs
  function shouldProxy(url) {
    if (typeof url !== 'string') return false;
    if (url.indexOf(proxy) === 0) return false;
    if (url.indexOf('/api/proxy-asset') !== -1) return false;
    if (url.indexOf('/cdn-cgi/') !== -1) return false;
    if (url.indexOf('blob:') === 0 || url.indexOf('data:') === 0) return false;
    if (url.indexOf(origin) === 0) return true;
    if (url.indexOf('/_next/') !== -1) return true;
    if (url.indexOf('vidlink.pro') !== -1 && url.indexOf(proxy) === -1) return true;
    return false;
  }

  function toProxy(url) {
    if (typeof url !== 'string') return url;
    if (url.indexOf('/_next/') === 0) return proxy + encodeURIComponent(origin + url);
    if (url.indexOf(origin) === 0) return proxy + encodeURIComponent(url);
    if (url.indexOf('vidlink.pro') !== -1 && url.indexOf(proxy) === -1) return proxy + encodeURIComponent(url);
    return url;
  }

  // Patch fetch — excludes our own proxy URLs
  var __fetch = window.fetch;
  window.fetch = function(url, init) {
    if (shouldProxy(url)) {
      return __fetch(toProxy(url), init);
    }
    if (url && typeof url === 'object' && url.url && typeof url.url === 'string') {
      if (shouldProxy(url.url)) {
        var proxied = toProxy(url.url);
        return __fetch(proxied, url);
      }
    }
    return __fetch(url, init);
  };

  // Patch XMLHttpRequest
  var __open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (shouldProxy(url)) {
      arguments[1] = toProxy(url);
    }
    return __open.apply(this, arguments);
  };

  function proxyElement(el) {
    try {
      if (!el || !el.getAttribute) return;
      var tag = el.tagName;
      if (tag === 'LINK') {
        var href = el.getAttribute('href') || '';
        if (shouldProxy(href)) {
          el.setAttribute('href', toProxy(href));
        }
      } else if (tag === 'SCRIPT' || tag === 'IMG') {
        var src = el.getAttribute('src') || '';
        if (shouldProxy(src)) {
          el.setAttribute('src', toProxy(src));
        }
      }
    } catch(e) {}
  }

  // Intercept appendChild and insertBefore to catch dynamically created resource elements
  var origAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child) {
    proxyElement(child);
    return origAppendChild.call(this, child);
  };

  var origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(child, ref) {
    proxyElement(child);
    return origInsertBefore.call(this, child, ref);
  };
})();
</script>`;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const vidlinkOrigin = new URL(decodedUrl).origin;
    const serverOrigin = new URL(request.url).origin;

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://vidlink.pro/',
    };

    // Forward cookies from browser to upstream (for session continuity)
    const browserCookies = request.headers.get('cookie');
    if (browserCookies) {
      upstreamHeaders['Cookie'] = browserCookies;
    }

    const response = await fetch(decodedUrl, { headers: upstreamHeaders });

    let html = await response.text();

    // 1. Strip ads
    html = stripAds(html);

    // 2. Rewrite /_next/ URLs in HTML attributes only (not in JS strings / RSC flight data)
    html = rewriteAttributeUrls(html, vidlinkOrigin, serverOrigin);

    // 3. Inject patch script at the beginning of <head> (before RSC flight scripts)
    const patchScript = buildPatchScript(serverOrigin, vidlinkOrigin);
    html = html.replace('<head>', `<head>${patchScript}`);

    // Build response headers — forward Set-Cookie from upstream (strip Domain)
    const respHeaders = new Headers();
    respHeaders.set('Content-Type', 'text/html; charset=utf-8');
    respHeaders.set('X-Frame-Options', 'ALLOWALL');
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Cache-Control', 'no-cache');
    const upstreamCookies = response.headers.getSetCookie?.() || [];
    for (const cookie of upstreamCookies) {
      respHeaders.append('Set-Cookie', cookie.replace(/;\s*Domain\s*=[^;]+/i, ''));
    }

    return new NextResponse(html, { headers: respHeaders });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy player', details: error.message },
      { status: 500 }
    );
  }
}
