import { NextRequest, NextResponse } from 'next/server';
import { LiveProvider } from '@/lib/provider';
import { resolveEmbedUrl, ResolutionError, ResolverContext } from '@/lib/embedHelper';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const provider = new LiveProvider();
    const requestId = Math.random().toString(16).substring(2, 6);
    const context = new ResolverContext(slug, 'movie', requestId);

    context.logStage('Incoming request', 'success', 0);
    context.startTiming('Movie Page Fetch');
    const movie = await provider.getMovie(slug);
    context.endTiming('Movie Page Fetch');

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    if (!movie.playerUrl) {
      return NextResponse.json(
        { error: 'No player URL found on movie page' },
        { status: 404 }
      );
    }

    // Resolve embed URL using the unified strategy and health loop
    const result = await resolveEmbedUrl(movie.playerUrl, slug, 'movie', context);
    const playerUrl = result.playerUrl;

    // Extract the raw provider URL from the player wrapper if needed
    let providerUrl = playerUrl;
    if (playerUrl.includes('hlsplayer?url=')) {
      const match = playerUrl.match(/hlsplayer\?url=([^&#]+)/);
      if (match) providerUrl = decodeURIComponent(match[1]);
    }

    context.logStage('Final player', 'success', Date.now() - context.startTime);
    context.debug(`Resolved movie ${slug} in ${Date.now() - context.startTime}ms`);

    return NextResponse.json({
      movie: {
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        backdrop: movie.backdrop,
        genres: movie.genres,
        description: movie.description,
        rating: movie.rating,
      },
      providerUrl,
      playerUrl,
      meta: result.meta,
    });
  } catch (err: unknown) {
    console.error('[movie-source] error:', err);
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
