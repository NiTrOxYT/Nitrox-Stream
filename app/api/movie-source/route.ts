import { NextRequest, NextResponse } from 'next/server';
import { LiveProvider } from '@/lib/provider';
import { getEmbedSources } from '@/lib/embedHelper';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const provider = new LiveProvider();
    const movie = await provider.getMovie(slug);

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    if (!movie.playerUrl) {
      return NextResponse.json(
        { error: 'No player URL found on movie page' },
        { status: 404 }
      );
    }

    const svidMatch = movie.playerUrl.match(/\/svid\/([a-zA-Z0-9_-]+)/);
    const svidToken = svidMatch ? svidMatch[1] : null;

    if (!svidToken) {
      return NextResponse.json({ error: 'Invalid player URL format' }, { status: 500 });
    }

    // Step 1: Get provider sources from embedhelper.php
    const sources = await getEmbedSources(svidToken);
    if (sources.length === 0) {
      return NextResponse.json({ error: 'No video sources found' }, { status: 500 });
    }

    // Step 2: Pass the raw provider URL to hlsplayer — do NOT decrypt.
    // hlsplayer internally resolves the provider URL to the final HLS stream,
    // using the same RPM API + AES decryption, but from its own IP range
    // which has access to the hotlink-protected HLS servers.
    const providerUrl = sources[0].url;
    const playerUrl = `https://plyr.technocosmos.surf/hlsplayer?url=${encodeURIComponent(providerUrl)}`;

    console.log({
      providerUrl,
      playerUrl,
    });

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
    });
  } catch (err: unknown) {
    console.error('[movie-source] error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
