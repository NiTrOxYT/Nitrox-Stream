'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface MovieInfo {
  title: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  genres?: string[];
  description?: string;
  rating?: number;
}

interface PlayerResponse {
  movie: MovieInfo;
  providerUrl: string;
  playerUrl: string;
}

export default function PlayerPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlayerResponse | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/movie-source?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const result: PlayerResponse = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
        <p className="text-gray-400">Resolving video source...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <p className="text-red-400 text-lg mb-2">Playback Error</p>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="text-gray-400 hover:text-white transition shrink-0"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-medium truncate">{data?.movie.title}</h1>
        {data?.movie.year && (
          <span className="text-gray-500 text-sm hidden sm:inline shrink-0">({data.movie.year})</span>
        )}
        {data?.movie.rating && (
          <span className="text-yellow-500 text-sm shrink-0 ml-auto">
            ★ {data.movie.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Video player - iframe */}
      <div className="relative w-full bg-black" style={{ aspectRatio: '16 / 9' }}>
        {iframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
          </div>
        )}
        <iframe
          src={data?.playerUrl || ''}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media"
          onLoad={() => setIframeLoading(false)}
          style={{ border: 'none' }}
        />
      </div>

      {/* Movie info */}
      {data?.movie && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {data.movie.genres && data.movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.movie.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 text-xs rounded-full bg-gray-800 text-gray-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {data.movie.description && (
            <p className="text-gray-400 text-sm leading-relaxed">
              {data.movie.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
