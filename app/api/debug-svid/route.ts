import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import type { AjaxResponse } from '@/types/api';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BASE = 'https://multimovies.watch';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') || '';

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const url = `${BASE}/movies/${slug}/`;

  try {
    const response = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!response.ok) {
      return NextResponse.json({ slug, success: false, error: `HTTP ${response.status}` });
    }

    const html = await response.text();

    // Extract post ID
    const postIdMatch = html.match(/<link\s+rel=["']shortlink["']\s+href=["'][^'"]*\?p=(\d+)/i);
    const postId = postIdMatch ? postIdMatch[1] : null;

    let playerUrl: string | null = null;
    let method: string | null = null;
    let error: string | null = null;

    // Method 1: WordPress post ID + admin-ajax
    if (postId) {
      try {
        const formData = new URLSearchParams();
        formData.append('action', 'doo_player_ajax');
        formData.append('post', postId);
        formData.append('nume', '1');
        formData.append('type', 'movie');

        const epResp = await fetch(`${BASE}/wp-admin/admin-ajax.php`, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });

        if (epResp.ok) {
          const epData = await epResp.json() as AjaxResponse;
          const embedUrl: string | undefined = epData.embed_url;
          if (embedUrl) {
            const fileId = embedUrl.split('/').pop() || '';
            playerUrl = `https://pro.iqsmartgames.com/svid/${fileId}`;
            method = 'wp-post-id';
          }
        }
      } catch (e: unknown) {
        error = e instanceof Error ? e.message : String(e);
      }
    }

    // Save HTML on failure
    let savedHtml = false;
    let htmlPath: string | null = null;
    if (!playerUrl) {
      const debugDir = path.join(process.cwd(), 'public', 'debug-html');
      const filePath = path.join(debugDir, `${slug}.html`);
      fs.writeFileSync(filePath, html, 'utf-8');
      savedHtml = true;
      htmlPath = `/debug-html/${slug}.html`;
    }

    return NextResponse.json({
      slug,
      url,
      success: playerUrl !== null,
      method,
      postId,
      playerUrl,
      savedHtml,
      htmlPath,
      error,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ slug, success: false, error: errMsg });
  }
}
