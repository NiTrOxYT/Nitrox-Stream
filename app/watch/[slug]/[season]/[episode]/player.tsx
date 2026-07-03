'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PremiumImage from '@/components/PremiumImage';
import ProviderSelector, { Provider } from '@/components/ProviderSelector';

// Let's check original imports:
// import { useParams, useRouter } from 'next/navigation';
// Yes! Line 4 of original was `import { useParams, useRouter } from 'next/navigation';`

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
  poster?: string;
  backdrop?: string;
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

  const currentSeason = parseInt((seasonRaw || '').replace(/^s/i, ''), 10);
  const currentEpisode = parseInt((episodeRaw || '').replace(/^e/i, ''), 10);

  const [show, setShow] = useState<TvSourceResponse | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [resolving, setResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean; type?: 'fallback' } | null>(null);
  const [prevProvider, setPrevProvider] = useState<Provider | null>(null);

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

    const resolveEpisode = async () => {
      await Promise.resolve(); // Defer to prevent calling setState synchronously during useEffect execution

      if (!ep) {
        setError(`Episode S${currentSeason} E${currentEpisode} not found`);
        setResolving(false);
        return;
      }

      setError(null);
      setResolving(true);
      setPlayerUrl(null);
      setProviders([]);
      setIframeLoading(true);

      try {
        const res = await fetch(`/api/episode-source?slug=${encodeURIComponent(ep.slug)}`);
        if (!res.ok) throw new Error('Failed to resolve');
        const data = (await res.json()) as { playerUrl: string; providers?: Provider[] };
        
        const activeProviders = data.providers || [];
        setProviders(activeProviders);

        // Check for cached preferred provider choice
        let initialUrl = data.playerUrl;
        if (activeProviders.length > 0) {
          const preferredId = localStorage.getItem('nitrox_preferred_provider');
          if (preferredId) {
            const preferred = activeProviders.find(p => p.id === preferredId);
            if (preferred) {
              initialUrl = preferred.playerUrl;
            }
          }
        }

        setPlayerUrl(initialUrl);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errMsg);
      } finally {
        setResolving(false);
      }
    };

    resolveEpisode();
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

  // Auto fallback monitor
  useEffect(() => {
    if (!iframeLoading || !playerUrl) return;
    const timer = setTimeout(() => {
      handleAutoFallback();
    }, 10000); // 10s load timeout
    return () => clearTimeout(timer);
  }, [iframeLoading, playerUrl, providers]);

  function handleAutoFallback() {
    if (providers.length <= 1 || !playerUrl) return;
    const currentIdx = providers.findIndex(p => p.playerUrl === playerUrl);
    if (currentIdx === -1) return;

    const nextIdx = (currentIdx + 1) % providers.length;
    const nextProv = providers[nextIdx];
    const activeProv = providers[currentIdx];

    setPrevProvider(activeProv);
    setSwitching(true);
    setIframeLoading(true);
    setPlayerUrl(nextProv.playerUrl);

    setToast({
      message: `Current server unavailable. Switched to ${nextProv.name}.`,
      visible: true,
      type: 'fallback'
    });

    // Auto-hide toast after 4s
    setTimeout(() => {
      setToast(t => t?.message.includes(nextProv.name) ? null : t);
    }, 4000);
  }

  function handleSelectProvider(prov: Provider) {
    const currentProv = providers.find(p => p.playerUrl === playerUrl) || null;
    setPrevProvider(currentProv);
    setSwitching(true);
    setIframeLoading(true);
    setPlayerUrl(prov.playerUrl);
    localStorage.setItem('nitrox_preferred_provider', prov.id);
  }

  function handleUndo() {
    if (prevProvider) {
      setSwitching(true);
      setIframeLoading(true);
      setPlayerUrl(prevProvider.playerUrl);
      setToast(null);
    }
  }

  function navigate(season: number, episode: number) {
    router.push(`/watch/${slug}/s${season}/e${episode}`);
  }

  // Current episode title from show data
  const episodeTitle = useMemo(() => {
    if (!show) return null;
    const s = show.seasons.find((se) => se.season === currentSeason);
    return s?.episodes.find((e) => e.episode === currentEpisode)?.title || null;
  }, [show, currentSeason, currentEpisode]);

  // Current season list of episodes
  const seasonEpisodes = useMemo(() => {
    if (!show) return [];
    return show.seasons.find((se) => se.season === currentSeason)?.episodes || [];
  }, [show, currentSeason]);

  // Continue Watching Trigger
  useEffect(() => {
    if (!show?.show) return;

    try {
      const stored = localStorage.getItem("nitrox_continue_watching");
      let list: any[] = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch {
          list = [];
        }
      }

      const showItem = {
        id: `${slug}_s${currentSeason}_e${currentEpisode}`,
        type: 'tv',
        slug: slug,
        title: show.show.title,
        poster: show.show.poster,
        backdrop: show.show.backdrop,
        season: currentSeason,
        episode: currentEpisode,
        progress: Math.floor(20 + (currentEpisode * 8) % 65), // dynamic mock progress
        updatedAt: Date.now(),
      };

      // Filter other representations of this TV show to avoid cluttering, or just filter this exact ep
      list = list.filter((item: any) => item.slug !== slug);
      list.unshift(showItem);
      localStorage.setItem("nitrox_continue_watching", JSON.stringify(list.slice(0, 10)));
    } catch (e) {
      console.error("Failed to save Continue Watching:", e);
    }
  }, [show, currentSeason, currentEpisode, slug]);

  return (
    <main className="min-h-screen bg-[#080808] text-white pb-24 relative overflow-hidden">
      
      {/* Inject animations style sheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      ` }} />

      {/* Ambient backdrop glow blur */}
      {show?.show.backdrop && (
        <div className="absolute top-0 left-0 right-0 h-[60vh] z-0 pointer-events-none opacity-25 filter blur-[120px] transform-gpu">
          <PremiumImage
            src={show.show.backdrop}
            type="backdrop"
            title=""
            fill
          />
          <div className="absolute inset-0 bg-[#080808]/85" />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 pt-8 relative z-10 space-y-8">
        
        {/* Header Back Bar */}
        <div className="flex items-center gap-4 border-b border-neutral-900 pb-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/40 text-neutral-400 hover:text-white transition-all duration-200 outline-none cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="min-w-0">
            <span className="text-[9px] font-bold tracking-[0.2em] text-neutral-400 uppercase block mb-1">
              NITROX CINEVERSE &middot; PLAYING EPISODE
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white truncate leading-none">
              {show?.show.title || slug.replace(/-/g, ' ')}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-3 font-semibold text-xs text-neutral-400 bg-neutral-900 px-3 py-1 rounded border border-neutral-800/50">
            <span>S{currentSeason} &middot; E{currentEpisode}</span>
          </div>
        </div>

        {/* Player Container */}
        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-black shadow-[0_24px_50px_rgba(0,0,0,0.85)] border border-neutral-900 z-10 transform-gpu">
          {resolving && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-10">
              <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase animate-pulse">Resolving Video Source...</p>
            </div>
          )}

          {switching && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20">
              <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase animate-pulse">Switching Server...</p>
            </div>
          )}

          {error && !resolving && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080808] z-10 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto mb-4 font-bold text-xl">!</div>
              <h2 className="text-white font-display text-lg font-bold mb-2">Playback Error</h2>
              <p className="text-neutral-400 text-sm mb-6 leading-relaxed">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-white text-black font-semibold rounded text-sm hover:bg-neutral-200 transition"
              >
                Retry
              </button>
            </div>
          )}

          {playerUrl && (
            <>
              {iframeLoading && !switching && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-10">
                  <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
                  <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase animate-pulse">Loading Stream Player...</p>
                </div>
              )}
              
              <ProviderSelector
                providers={providers}
                currentUrl={playerUrl}
                onSelect={handleSelectProvider}
              />

              <iframe
                src={playerUrl}
                className={`w-full h-full absolute inset-0 transition-opacity duration-300 ${switching || iframeLoading || resolving ? 'opacity-0' : 'opacity-100'}`}
                allowFullScreen
                allow="autoplay; encrypted-media"
                onLoad={() => {
                  setIframeLoading(false);
                  setSwitching(false);
                }}
                style={{ border: 'none' }}
              />
            </>
          )}
        </div>

        {/* Prev / Next controls */}
        <div className="flex items-center justify-between gap-4 border-t border-b border-neutral-900 py-4">
          <button
            onClick={() => prev && navigate(prev.season, prev.episode)}
            disabled={!prev}
            className="flex items-center gap-2 px-4 py-2 rounded bg-neutral-900 border border-neutral-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 hover:border-neutral-700 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer outline-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <span className="font-display font-medium text-sm sm:text-base text-white truncate text-center">
            S{currentSeason}:E{currentEpisode} {episodeTitle && `\u2014 ${episodeTitle}`}
          </span>

          <button
            onClick={() => next && navigate(next.season, next.episode)}
            disabled={!next}
            className="flex items-center gap-2 px-4 py-2 rounded bg-neutral-900 border border-neutral-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 hover:border-neutral-700 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer outline-none"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Season Episode Strip */}
        {seasonEpisodes.length > 1 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">
              Episodes In This Season
            </h3>
            
            <div className="flex gap-3 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
              {seasonEpisodes.map((ep) => {
                const isActive = ep.episode === currentEpisode;
                return (
                  <button
                    key={ep.slug}
                    onClick={() => navigate(currentSeason, ep.episode)}
                    className={`flex items-center justify-between gap-4 p-3 rounded text-left shrink-0 w-64 border transition-all duration-200 outline-none snap-start cursor-pointer ${
                      isActive
                        ? "bg-accent/10 border-accent/30 text-white"
                        : "bg-[#101010]/60 border-neutral-900 text-neutral-400 hover:border-neutral-800 hover:bg-[#161616]"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className={`text-[9px] font-bold block mb-0.5 ${isActive ? "text-accent" : "text-neutral-500"}`}>
                        EPISODE {ep.episode}
                      </span>
                      <span className={`text-xs font-semibold block truncate ${isActive ? "text-white" : "text-neutral-300"}`}>
                        {ep.title}
                      </span>
                    </div>
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    ) : (
                      <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Glassmorphic Toast Notification */}
      {toast?.visible && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 px-4.5 py-3.5 rounded-xl bg-[#0d0d0d]/95 border border-white/10 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] text-xs text-white max-w-sm transform-gpu animate-[slideUp_0.25s_ease-out]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <span className="font-semibold tracking-tight">{toast.message}</span>
          </div>
          {toast.type === 'fallback' && prevProvider && (
            <button
              onClick={handleUndo}
              className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-accent border border-accent/20 rounded-lg hover:bg-accent/10 transition cursor-pointer outline-none"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            className="text-neutral-500 hover:text-white transition cursor-pointer outline-none pl-1"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
