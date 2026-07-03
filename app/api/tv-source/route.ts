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

    // Fetch post IDs for all episodes in parallel
    const episodeSlugs: string[] = [];
    for (const season of show.seasons) {
      for (const ep of season.episodes) {
        episodeSlugs.push(ep.slug);
      }
    }

    const postIds = await Promise.all(
      episodeSlugs.map((es) => provider.getEpisodePostId(es))
    );

    // Map postIds back into the response structure
    let idx = 0;
    const seasons = show.seasons.map((season) => ({
      season: season.season,
      episodes: season.episodes.map((ep) => ({
        episode: ep.episode,
        title: ep.title,
        slug: ep.slug,
        postId: postIds[idx++],
      })),
    }));

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
      seasons,
    });
  } catch (err: any) {
    console.error('[tv-source] error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
