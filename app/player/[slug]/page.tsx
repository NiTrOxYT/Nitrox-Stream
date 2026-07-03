'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MovieCard from '@/components/MovieCard';
import { Movie } from '@/types/movie';
import { searchMovies } from '@/services/search-service';

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
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlayerResponse | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  
  // Related recommendations state
  const [related, setRelated] = useState<Movie[]>([]);

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
        setIframeLoading(true);

        // Fetch related movies based on the first genre
        if (result.movie.genres && result.movie.genres.length > 0) {
          const genreQuery = result.movie.genres[0];
          const relatedResults = await searchMovies(genreQuery);
          // Filter out the current movie
          setRelated(relatedResults.filter(m => m.slug !== slug).slice(0, 5));
        } else {
          // Fallback recommendation search
          const fallbackResults = await searchMovies("avatar");
          setRelated(fallbackResults.filter(m => m.slug !== slug).slice(0, 5));
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Resolving Video Source...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center bg-[#101010] border border-neutral-900 rounded-lg p-8 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto mb-4 font-bold text-xl">!</div>
          <h2 className="text-white font-display text-lg font-bold mb-2">Playback Error</h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">{error || "Could not resolve stream source."}</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white text-black font-semibold rounded text-sm hover:bg-neutral-200 transition"
            >
              Retry
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-neutral-900 border border-neutral-800 text-white font-semibold rounded text-sm hover:bg-neutral-800 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { movie } = data;

  return (
    <main className="min-h-screen bg-[#080808] text-white pb-24 relative overflow-hidden">
      
      {/* Ambient Backdrop Blur Layer */}
      {movie.backdrop && (
        <div className="absolute top-0 left-0 right-0 h-[60vh] z-0 pointer-events-none opacity-20 filter blur-[100px] transform-gpu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={movie.backdrop}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#080808]/80" />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 pt-8 relative z-10 space-y-8">
        
        {/* Header / Nav Back Bar */}
        <div className="flex items-center gap-4 border-b border-neutral-900 pb-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/40 text-neutral-400 hover:text-white transition-all duration-200 outline-none"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="min-w-0">
            <span className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase block mb-0.5">
              Playing Movie
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white truncate leading-none">
              {movie.title}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {movie.rating && (
              <span className="px-2.5 py-1 text-xs font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                ★ {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.year && (
              <span className="text-xs font-semibold text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800/50">
                {movie.year}
              </span>
            )}
          </div>
        </div>

        {/* Video Player Frame */}
        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-black shadow-[0_24px_50px_rgba(0,0,0,0.8)] border border-neutral-900 z-10 transform-gpu transition-all">
          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10">
              <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase animate-pulse">Loading Video Stream...</p>
            </div>
          )}
          <iframe
            src={data.playerUrl || ''}
            className="w-full h-full absolute inset-0"
            allowFullScreen
            allow="autoplay; encrypted-media"
            onLoad={() => setIframeLoading(false)}
            style={{ border: 'none' }}
          />
        </div>

        {/* Movie Info & Split Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-neutral-900">
          
          {/* Main Description */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">
              Synopsis
            </h2>
            <p className="text-neutral-300 text-sm md:text-base leading-relaxed font-normal">
              {movie.description || "No synopsis available for this title."}
            </p>
            
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {movie.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 text-xs rounded-full bg-neutral-900 border border-neutral-800/60 text-neutral-300 font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Technical Specs / Side metadata */}
          <div className="space-y-6">
            <div className="p-4 bg-[#101010]/80 backdrop-blur-md rounded-lg border border-neutral-900 space-y-4">
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">
                Specifications
              </h3>
              
              <div className="space-y-3 divide-y divide-neutral-900 text-xs text-neutral-300">
                <div className="flex justify-between py-1.5 first:pt-0">
                  <span className="text-neutral-500">Audio Channels</span>
                  <span className="font-semibold text-white">Stereo / Dolby 5.1</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-neutral-500">Video Quality</span>
                  <span className="font-semibold text-white">4K UHD / 1080p</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-neutral-500">Provider Source</span>
                  <span className="font-semibold text-neutral-400 capitalize">{data.providerUrl.split('//').pop()?.split('/')[0] || "HLS Server"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* More Like This (Recommendations) */}
        {related.length > 0 && (
          <div className="space-y-6 pt-8 border-t border-neutral-900">
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">
              More Like This
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {related.map((movie) => (
                <MovieCard key={movie.id} movie={movie} showTypeBadge={false} />
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
