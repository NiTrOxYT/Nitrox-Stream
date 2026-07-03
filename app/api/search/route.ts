// app/api/search/route.ts
import { NextResponse } from 'next/server';
import { LiveProvider } from '@/lib/provider';

const provider = new LiveProvider();

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  try {
    const movies = await provider.search(q);
    return NextResponse.json(movies);
  } catch (err: unknown) {
    // 500 only if the provider throws – otherwise the client sees an empty array
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/search] failed:', errMsg);
    return NextResponse.json(
      {
        error: 'Failed to fetch search results',
        detail: errMsg,
      },
      { status: 500 }
    );
  }
}