'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Episode {
  episode: number;
  title: string;
  slug: string;
}

interface Season {
  season: number;
  episodes: Episode[];
}

interface ShowInfo {
  title: string;
  slug: string;
  poster?: string;
  backdrop?: string;
  year?: number;
  description?: string;
  genres?: string[];
  rating?: number;
}

interface TvSourceResponse {
  show: ShowInfo;
  seasons: Season[];
}

export default function TvShowPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TvSourceResponse | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tv-source?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const result: TvSourceResponse = await res.json();
        setData(result);
        if (result.seasons.length > 0) {
          setSelectedSeason(result.seasons[0].season);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const currentSeasonEpisodes =
    data?.seasons.find((s) => s.season === selectedSeason)?.episodes || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full text-center">
          <p className="text-red-400 text-lg mb-2">Error</p>
          <p className="text-gray-400 text-sm mb-6">{error || 'Show not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { show } = data;

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-medium truncate">{show.title}</h1>
        {show.year && <span className="text-gray-500 text-sm hidden sm:inline shrink-0">({show.year})</span>}
      </div>

      {/* Show info */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-6 mb-6">
          {show.poster && (
            <div className="w-32 shrink-0 hidden sm:block">
              <div className="aspect-[2/3] bg-gray-800 rounded-lg" />
            </div>
          )}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">{show.title}</h2>
            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {show.genres.map((g) => (
                  <span key={g} className="px-3 py-1 text-xs rounded-full bg-gray-800 text-gray-300">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {show.description && (
              <p className="text-gray-400 text-sm leading-relaxed">{show.description}</p>
            )}
          </div>
        </div>

        {/* Season selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {data.seasons.map((s) => (
            <button
              key={s.season}
              onClick={() => setSelectedSeason(s.season)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                selectedSeason === s.season
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Season {s.season}
            </button>
          ))}
        </div>

        {/* Episode list */}
        <div className="space-y-2">
          {currentSeasonEpisodes.map((ep) => (
            <button
              key={ep.slug}
              onClick={() => router.push(`/watch/${slug}/s${selectedSeason}/e${ep.episode}`)}
              className="w-full flex items-center gap-4 p-3 rounded-lg transition text-left bg-gray-900 hover:bg-gray-800"
            >
              <span className="text-gray-500 text-sm w-8 shrink-0 text-right">{ep.episode}</span>
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-medium block truncate">{ep.title}</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
