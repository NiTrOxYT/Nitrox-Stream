import { NextRequest, NextResponse } from 'next/server';
import { LiveProvider } from '@/lib/provider';
import { resolvePostIdToPlayerUrl } from '@/lib/embedHelper';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const provider = new LiveProvider();

    // Step 1: Fetch episode page and extract post ID
    const postId = await provider.getEpisodePostId(slug);
    if (!postId) {
      return NextResponse.json(
        { error: 'Could not find episode post ID' },
        { status: 404 }
      );
    }

    // Step 2: Resolve post ID to player URL via admin-ajax
    const playerUrl = await resolvePostIdToPlayerUrl(postId, {
      type: 'tv',
    });

    console.log({
      slug,
      postId,
      playerUrl,
    });

    return NextResponse.json({
      slug,
      postId,
      playerUrl,
    });
  } catch (err: any) {
    console.error('[episode-source] error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
