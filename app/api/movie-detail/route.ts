import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '55dbd31de39fb7e518262bfff6fc29ea';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  try {
    const searchTitle = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(searchTitle)}&api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 3600 } }
    );

    if (!searchRes.ok) throw new Error(`TMDB search failed: ${searchRes.status}`);
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const movie = searchData.results[0];
    const tmdbId = movie.id;

    const detailRes = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 3600 } }
    );

    const detailData = await detailRes.json();
    const imdbId = detailData.imdb_id;

    if (!imdbId) {
      return NextResponse.json({ error: 'No IMDb ID found' }, { status: 404 });
    }

    // Return TMDB ID and IMDb ID — the client can use either
    return NextResponse.json({
      tmdbId,
      imdbId,
      slug,
      title: movie.title,
      year: movie.release_date?.substring(0, 4),
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch movie details' }, { status: 500 });
  }
}
