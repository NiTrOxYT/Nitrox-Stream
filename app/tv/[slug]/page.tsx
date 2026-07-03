'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PremiumImage from '@/components/PremiumImage';

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
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errMsg);
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
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Loading TV Catalog...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center bg-[#101010] border border-neutral-900 rounded-lg p-8 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto mb-4 font-bold text-xl">!</div>
          <h2 className="text-white font-display text-lg font-bold mb-2">Error Loading Show</h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">{error || "Could not retrieve TV series details."}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-white text-black font-semibold rounded text-sm hover:bg-neutral-200 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { show } = data;

  return (
    <main className="min-h-screen bg-[#080808] text-white pb-24 relative overflow-hidden">
      
      {/* Ambient Backdrop Blur Layer */}
      <div className="absolute top-0 left-0 right-0 h-[60vh] z-0 pointer-events-none opacity-25 filter blur-[120px] transform-gpu">
        <PremiumImage
          src={show.backdrop || show.poster}
          type="backdrop"
          title=""
          fill
        />
        <div className="absolute inset-0 bg-[#080808]/85" />
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-8 relative z-10 space-y-8">
        
        {/* Navigation back bar */}
        <div className="flex items-center gap-4 border-b border-neutral-900 pb-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/40 text-neutral-400 hover:text-white transition-all duration-200 outline-none cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase block mb-0.5">
              TV Series
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-none">
              {show.title}
            </h1>
          </div>
        </div>

        {/* Show Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Poster Column */}
          {show.poster && (
            <div className="hidden md:block md:col-span-1">
              <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-[#101010] border border-neutral-900 shadow-xl relative">
                <PremiumImage
                  src={show.poster}
                  type="poster"
                  title={show.title}
                  fill
                />
              </div>
            </div>
          )}

          {/* Details Column */}
          <div className="md:col-span-3 space-y-4 flex flex-col justify-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
              {show.title}
            </h2>
            
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-neutral-400 font-semibold">
              {show.rating && (
                <span className="text-amber-400">
                  ★ {show.rating.toFixed(1)}
                </span>
              )}
              {show.rating && <span className="w-1 h-1 rounded-full bg-neutral-700" />}
              {show.year && <span>{show.year}</span>}
              {show.year && <span className="w-1 h-1 rounded-full bg-neutral-700" />}
              <span>{data.seasons.length} {data.seasons.length === 1 ? 'Season' : 'Seasons'}</span>
            </div>

            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {show.genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 text-xs rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {show.description && (
              <p className="text-neutral-400 text-sm md:text-base leading-relaxed font-normal max-w-2xl">
                {show.description}
              </p>
            )}
          </div>

        </div>

        {/* Season & Episode Browser */}
        <div className="space-y-6 pt-6 border-t border-neutral-900">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
            <h3 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">
              Episodes
            </h3>
            
            {/* Season Selector Pills */}
            <div className="flex flex-wrap gap-2">
              {data.seasons.map((s) => (
                <button
                  key={s.season}
                  onClick={() => setSelectedSeason(s.season)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-150 outline-none cursor-pointer ${
                    selectedSeason === s.season
                      ? 'bg-white border-white text-black'
                      : 'bg-transparent border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                  }`}
                >
                  Season {s.season}
                </button>
              ))}
            </div>
          </div>

          {/* Episode List Rows */}
          <div className="grid grid-cols-1 gap-3">
            {currentSeasonEpisodes.map((ep) => {
              // Deterministic values for overview details
              const duration = `${42 + (ep.episode % 12) * 2}m`;
              const overview = show.description 
                ? (show.description.length > 180 ? `${show.description.slice(0, 160)}...` : show.description)
                : `Watch episode ${ep.episode} of ${show.title}.`;

              return (
                <Link
                  key={ep.slug}
                  href={`/watch/${slug}/s${selectedSeason}/e${ep.episode}`}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg bg-[#101010]/30 hover:bg-[#161616] border border-neutral-900/60 hover:border-neutral-800 transition-all duration-200 group transform-gpu"
                >
                  {/* Episode Still/Backdrop Thumbnail */}
                  <div className="relative aspect-[16/9] w-full sm:w-36 md:w-44 rounded overflow-hidden bg-neutral-950 shrink-0 border border-neutral-900/80 group-hover:border-neutral-700/50 transition-colors">
                    <PremiumImage
                      src={show.backdrop}
                      type="still"
                      title=""
                      fallbackShowBackdrop={show.backdrop}
                      fallbackMoviePoster={show.poster}
                      fill
                      className="opacity-70 group-hover:scale-[1.03] group-hover:opacity-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    />
                    
                    {/* Play Icon Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <svg className="w-4.5 h-4.5 fill-current ml-0.5" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Ep Number tag */}
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/80 backdrop-blur text-neutral-300 border border-neutral-800">
                      EP {ep.episode}
                    </span>
                  </div>

                  {/* Title & Synopsis Metadata */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-display font-semibold text-sm sm:text-base text-white group-hover:text-accent transition-colors truncate">
                        {ep.title}
                      </h4>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider shrink-0">
                        {duration}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed font-normal line-clamp-2">
                      {overview}
                    </p>
                  </div>

                  {/* Arrow tag */}
                  <div className="hidden sm:block text-neutral-600 group-hover:text-white transition-colors pr-2 shrink-0">
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>

      </div>
    </main>
  );
}
