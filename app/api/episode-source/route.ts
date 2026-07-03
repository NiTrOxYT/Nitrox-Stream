import { NextRequest, NextResponse } from 'next/server';
import { resolvePostIdToPlayerUrl } from '@/lib/embedHelper';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const nume = request.nextUrl.searchParams.get('nume') || '1';

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: 'id must be a number' }, { status: 400 });
  }

  try {
    const playerUrl = await resolvePostIdToPlayerUrl(postId, {
      type: 'tv',
      nume,
    });

    console.log({
      postId,
      nume,
      playerUrl,
    });

    return NextResponse.json({
      postId,
      nume: parseInt(nume, 10),
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
