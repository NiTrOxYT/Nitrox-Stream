import { NextRequest, NextResponse } from 'next/server';
import { LiveProvider } from '@/lib/provider';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const provider = new LiveProvider();
    const show = await provider.getTvShow(slug);

    if (!show) {
      return NextResponse.json({ error: 'TV show not found' }, { status: 404 });
    }

    return NextResponse.json({
      show: {
        title: show.title,
        slug: show.slug,
        poster: show.poster,
        backdrop: show.backdrop,
        year: show.year,
        description: show.description,
        genres: show.genres,
        rating: show.rating,
      },
      seasons: show.seasons.map((season) => ({
        season: season.season,
        episodes: season.episodes.map((ep) => ({
          episode: ep.episode,
          title: ep.title,
          slug: ep.slug,
        })),
      })),
    });
  } catch (err: unknown) {
    console.error('[tv-source] error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
