import { NextRequest, NextResponse } from 'next/server';
import { LiveProvider } from '@/lib/provider';
import { resolvePostIdToPlayerUrl, ResolutionError, ResolverContext } from '@/lib/embedHelper';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const provider = new LiveProvider();
    const requestId = Math.random().toString(16).substring(2, 6);
    const context = new ResolverContext(slug, 'tv', requestId);

    context.logStage('Incoming request', 'success', 0);
    context.startTiming('Episode Page Fetch');
    const postId = await provider.getEpisodePostId(slug);
    context.endTiming('Episode Page Fetch');

    if (!postId) {
      return NextResponse.json(
        { error: 'Could not find episode post ID' },
        { status: 404 }
      );
    }

    // Step 2: Resolve post ID to player URL via admin-ajax
    const result = await resolvePostIdToPlayerUrl(postId, {
      type: 'tv',
    }, context);
    const playerUrl = result.playerUrl;

    context.logStage('Final player', 'success', Date.now() - context.startTime);
    context.debug(`Resolved episode ${slug} in ${Date.now() - context.startTime}ms`);

    return NextResponse.json({
      slug,
      postId,
      playerUrl,
      currentProvider: result.currentProvider,
      providers: result.providers,
      meta: result.meta,
    });
  } catch (err: unknown) {
    console.error('[episode-source] error:', err);
    if (err instanceof ResolutionError) {
      return NextResponse.json(
        {
          step: err.step,
          episode: slug,
          providers: err.providers,
        },
        { status: 502 }
      );
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
