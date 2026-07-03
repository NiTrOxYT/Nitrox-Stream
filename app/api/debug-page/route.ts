import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') || 'avengers-endgame';
  
  try {
    const url = `https://multimovies.watch/movies/${slug}/`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const html = await response.text();
    const pageSize = html.length;

    // Try to find SVID URL
    const svidPatterns = [
      /<iframe[^>]*src=["']([^"']*iqsmartgames\.com\/svid\/[^"']*)["']/i,
      /href=["']([^"']*iqsmartgames\.com\/svid\/[^"']*)["']/i,
      /https?:\/\/pro\.iqsmartgames\.com\/svid\/([a-zA-Z0-9_-]+)/g,
    ];

    const matches: string[] = [];
    for (const pattern of svidPatterns) {
      const found = html.match(pattern);
      if (found) matches.push(found[0] || found[1] || found[0]);
    }

    // Check for "svid" in the middle
    const svidIndex = html.indexOf('iqsmartgames.com/svid/');
    const context = svidIndex >= 0 
      ? html.substring(Math.max(0, svidIndex - 200), Math.min(html.length, svidIndex + 300))
      : 'NOT FOUND';

    const playerSection = html.indexOf('play-box-iframe') >= 0
      ? html.substring(html.indexOf('play-box-iframe'), Math.min(html.length, html.indexOf('play-box-iframe') + 1000))
      : 'NOT FOUND';

    return NextResponse.json({
      pageSize,
      svidFoundAt: svidIndex,
      contextAroundSvid: context,
      playerSectionStart: playerSection.substring(0, 500),
      regexMatches: matches,
      url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}