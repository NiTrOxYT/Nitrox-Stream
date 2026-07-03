'use client';

import { useEffect, useState, useMemo } from 'react';
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
}

interface TvSourceResponse {
  show: ShowInfo;
  seasons: Season[];
}

export default function EpisodePlayer() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const seasonRaw = params.season as string;
  const episodeRaw = params.episode as string;

  const currentSeason = parseInt(seasonRaw.replace(/^s/i, ''), 10);
  const currentEpisode = parseInt(episodeRaw.replace(/^e/i, ''), 10);

  console.log({ params, seasonRaw, episodeRaw, currentSeason, currentEpisode });

  const [show, setShow] = useState<TvSourceResponse | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch show data once (for episode slug lookup + navigation)
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tv-source?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error('Failed to load show');
        const data: TvSourceResponse = await res.json();
        setShow(data);
      } catch {
        setError('Failed to load show data');
      }
    }
    load();
  }, [slug]);

  // Resolve episode when params or show changes
  useEffect(() => {
    if (!show) return;

    const s = show.seasons.find((se) => se.season === currentSeason);
    const ep = s?.episodes.find((e) => e.episode === currentEpisode);
    if (!ep) {
      setError(`Episode S${currentSeason} E${currentEpisode} not found`);
      setResolving(false);
      return;
    }

    setError(null);
    setResolving(true);
    setPlayerUrl(null);

    fetch(`/api/episode-source?slug=${encodeURIComponent(ep.slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to resolve');
        return res.json();
      })
      .then((data) => {
        setPlayerUrl(data.playerUrl);
        setResolving(false);
      })
      .catch((err) => {
        setError(err.message);
        setResolving(false);
      });
  }, [show, currentSeason, currentEpisode]);

  // Flat list of all episodes for prev/next across seasons
  const flatEpisodes = useMemo(() => {
    if (!show) return [];
    const flat: Array<{ season: number; episode: number }> = [];
    for (const s of show.seasons) {
      for (const ep of s.episodes) {
        flat.push({ season: s.season, episode: ep.episode });
      }
    }
    return flat;
  }, [show]);

  const currentIdx = flatEpisodes.findIndex(
    (f) => f.season === currentSeason && f.episode === currentEpisode
  );
  const prev = currentIdx > 0 ? flatEpisodes[currentIdx - 1] : null;
  const next =
    currentIdx >= 0 && currentIdx < flatEpisodes.length - 1
      ? flatEpisodes[currentIdx + 1]
      : null;

  function navigate(season: number, episode: number) {
    router.push(`/watch/${slug}/s${season}/e${episode}`);
  }

  // Current episode title from show data
  const episodeTitle = useMemo(() => {
    if (!show) return null;
    const s = show.seasons.find((se) => se.season === currentSeason);
    return s?.episodes.find((e) => e.episode === currentEpisode)?.title || null;
  }, [show, currentSeason, currentEpisode]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition shrink-0"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-medium truncate">
            {show?.show.title || slug.replace(/-/g, ' ')}
          </h1>
          {episodeTitle && (
            <p className="text-gray-400 text-xs truncate">
              S{currentSeason} E{currentEpisode} — {episodeTitle}
            </p>
          )}
        </div>
      </div>

      {/* Player area */}
      <div className="relative w-full bg-black flex-1 flex items-center justify-center">
        {resolving && (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            <p className="text-gray-400 text-sm">Resolving video source...</p>
          </div>
        )}

        {error && !resolving && (
          <div className="text-center px-4">
            <p className="text-red-400 text-lg mb-2">Playback Error</p>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {playerUrl && (
          <iframe
            src={playerUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            style={{ border: 'none' }}
          />
        )}
      </div>

      {/* Prev / Next bar */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between gap-4 shrink-0">
        <button
          onClick={() => prev && navigate(prev.season, prev.episode)}
          disabled={!prev}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm hover:bg-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <span className="text-gray-300 text-sm truncate px-2">
          S{currentSeason} E{currentEpisode}
          {episodeTitle && ` — ${episodeTitle}`}
        </span>

        <button
          onClick={() => next && navigate(next.season, next.episode)}
          disabled={!next}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm hover:bg-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
