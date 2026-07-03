"use client";

import { useEffect, useState } from "react";
import { searchMovies } from "@/services/search-service";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";
import PremiumImage from "@/components/PremiumImage";
import Link from "next/link";
import HeroBanner, { HeroTitle } from "@/components/HeroBanner";

interface ContinueWatchingItem {
  id: string;
  type: 'movie' | 'tv';
  slug: string;
  title: string;
  poster?: string;
  backdrop?: string;
  season?: number;
  episode?: number;
  progress: number; // percentage, e.g. 45
  duration?: number;
  updatedAt: number;
}

interface EditorialMovie {
  title: string;
  year?: number;
  rating?: number;
  genres?: string[];
  description?: string;
  backdrop?: string;
  slug: string;
}

export default function HomePage() {
  // Hero list carousel state
  const [heroList, setHeroList] = useState<HeroTitle[]>([]);

  // Editorial Spotlight Movie (Middle Banner)
  const [spotlight, setSpotlight] = useState<EditorialMovie>({
    title: "Dune: Part Two",
    year: 2024,
    rating: 8.6,
    genres: ["Adventure", "Sci-Fi"],
    description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future.",
    backdrop: "https://image.tmdb.org/t/p/original/xOMo8BRK7P6jqHDDwZeweBrg7N1.jpg",
    slug: "dune-part-two",
  });

  // Continue Watching List
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);

  // Movie rows state
  const [trending, setTrending] = useState<Movie[]>([]);
  const [scifi, setScifi] = useState<Movie[]>([]);
  const [action, setAction] = useState<Movie[]>([]);
  const [tvShows, setTvShows] = useState<Movie[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Load Continue Watching from local storage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nitrox_continue_watching");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ContinueWatchingItem[];
          // Sort by updatedAt descending
          const sorted = parsed.sort((a, b) => b.updatedAt - a.updatedAt);
          setContinueWatching(sorted);
        } catch {
          setContinueWatching([]);
        }
      }
    }

    // 2. Fetch rows in parallel
    async function loadCatalog() {
      try {
        setLoading(true);
        const [resTrending, resScifi, resAction, resTv] = await Promise.all([
          searchMovies("avatar").catch(() => []),
          searchMovies("dune").catch(() => []),
          searchMovies("marvel").catch(() => []),
          searchMovies("the").catch(() => []),
        ]);

        setTrending(resTrending.slice(0, 10));
        setScifi(resScifi.slice(0, 10));
        setAction(resAction.slice(0, 10));
        setTvShows(resTv.filter(m => m.type === "tv").slice(0, 10));

        // 3. Resolve dynamic hero banner titles in parallel (up to 8 unique titles)
        const candidates = [...resTrending.slice(0, 4), ...resScifi.slice(0, 4)];
        const uniqueCandidates = candidates.filter((item, index, self) => 
          self.findIndex(c => c.slug === item.slug) === index
        ).slice(0, 8);

        const heroTitles = await Promise.all(
          uniqueCandidates.map(async (item) => {
            try {
              const detailRes = await fetch(`/api/movie-source?slug=${encodeURIComponent(item.slug)}`);
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                if (detailData.movie) {
                  return {
                    title: detailData.movie.title,
                    year: detailData.movie.year || item.year,
                    rating: detailData.movie.rating || 7.5,
                    genres: detailData.movie.genres || ["Action", "Adventure"],
                    description: detailData.movie.description || item.description,
                    backdrop: detailData.movie.backdrop || detailData.movie.poster || item.poster,
                    slug: item.slug,
                  };
                }
              }
            } catch (err) {
              // ignore and fallback
            }
            return {
              title: item.title,
              year: item.year,
              rating: 7.5,
              genres: ["Action", "Adventure"],
              description: item.description,
              backdrop: item.poster,
              slug: item.slug,
            };
          })
        );
        setHeroList(heroTitles);

        // 4. Dynamically resolve Editorial Spotlight Movie Details
        if (resScifi.length > 0) {
          const firstScifi = resScifi[0];
          const detailRes = await fetch(`/api/movie-source?slug=${encodeURIComponent(firstScifi.slug)}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData.movie) {
              setSpotlight({
                title: detailData.movie.title,
                year: detailData.movie.year,
                rating: detailData.movie.rating || 8.2,
                genres: detailData.movie.genres || ["Sci-Fi", "Action"],
                description: detailData.movie.description,
                backdrop: detailData.movie.backdrop || detailData.movie.poster || firstScifi.poster,
                slug: firstScifi.slug,
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load catalog rows:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-hidden pb-28">
      
      {/* 1. Cinematic Dynamic Hero Banner */}
      {!loading && heroList.length > 0 ? (
        <HeroBanner titles={heroList} />
      ) : (
        <div className="relative min-h-[75vh] md:min-h-[90vh] bg-[#080808] flex items-center justify-center border-b border-neutral-900/50">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      )}

      {/* Catalog Layout Core */}
      <section className="max-w-7xl mx-auto px-6 space-y-16 -mt-12 relative z-20">
        
        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-16">
            {[...Array(3)].map((_, r) => (
              <div key={r} className="space-y-4">
                <div className="h-4 w-40 bg-neutral-950 animate-pulse rounded" />
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] w-[180px] shrink-0 rounded bg-neutral-950 animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* 2. Continue Watching (Conditional) */}
            {continueWatching.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">
                  Continue Watching
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {continueWatching.map((item) => {
                    const href = item.type === 'tv' 
                      ? `/watch/${item.slug}/s${item.season}/e${item.episode}` 
                      : `/player/${item.slug}`;
                    return (
                      <div key={item.id} className="w-[200px] sm:w-[240px] shrink-0 snap-start">
                        <Link href={href} className="group relative block w-full outline-none">
                          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-[#101010] border border-neutral-900 shadow-md transform-gpu transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
                            <PremiumImage
                              src={item.backdrop || item.poster}
                              type="backdrop"
                              title={item.title}
                              fill
                              className="group-hover:opacity-50"
                            />
                            {/* Gradient mask */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                            
                            {/* Play overlay button */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>

                            {/* Label */}
                            <div className="absolute bottom-3 left-3 right-3 text-left">
                              <h3 className="font-display font-semibold text-xs text-white truncate leading-tight">
                                {item.title}
                              </h3>
                              {item.type === 'tv' && (
                                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                                  Season {item.season} &middot; Episode {item.episode}
                                </p>
                              )}
                            </div>

                            {/* Progress bar line */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
                              <div 
                                className="h-full bg-accent transition-all duration-350" 
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Row 1: Trending Now */}
            {trending.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">
                  Trending Now
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {trending.map((movie) => (
                    <div key={movie.id} className="w-[140px] sm:w-[170px] md:w-[190px] shrink-0 snap-start">
                      <MovieCard movie={movie} showTypeBadge={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Editorial Spotlight Section (Breaks row layout grid pattern) */}
            {spotlight && (
              <section className="relative rounded-lg overflow-hidden border border-neutral-900 bg-gradient-to-r from-[#101010] to-[#080808] grid grid-cols-1 md:grid-cols-2 shadow-[0_16px_40px_rgba(0,0,0,0.5)] transform-gpu select-none">
                
                {/* Visual backdrop */}
                <div className="relative aspect-[16/9] md:aspect-auto w-full h-full min-h-[300px] bg-[#101010] overflow-hidden order-1 md:order-2">
                  <PremiumImage
                    src={spotlight.backdrop}
                    type="backdrop"
                    title={spotlight.title}
                    fill
                  />
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#101010] via-[#101010]/30 to-transparent" />
                </div>

                {/* Metadata details */}
                <div className="p-8 md:p-12 flex flex-col justify-center space-y-4 order-2 md:order-1">
                  <span className="text-[9px] font-bold tracking-[0.25em] text-accent uppercase">
                    EDITORIAL SELECTION
                  </span>
                  
                  <h3 className="font-display text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    {spotlight.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-neutral-400 font-semibold">
                    {spotlight.rating && <span className="text-amber-400">★ {spotlight.rating.toFixed(1)}</span>}
                    {spotlight.rating && <span className="w-1.5 h-1.5 bg-neutral-700 rounded-full" />}
                    {spotlight.year && <span>{spotlight.year}</span>}
                    {spotlight.year && <span className="w-1.5 h-1.5 bg-neutral-700 rounded-full" />}
                    <span className="px-1.5 py-0.2 border border-neutral-800 rounded text-[9px]">DOLBY VISION</span>
                  </div>

                  {spotlight.description && (
                    <p className="text-neutral-400 text-xs md:text-sm leading-relaxed max-w-md font-normal line-clamp-3">
                      {spotlight.description}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Link
                      href={`/player/${spotlight.slug}`}
                      className="bg-white hover:bg-neutral-200 text-black px-5 py-2 rounded font-semibold text-[11px] uppercase tracking-wider flex items-center gap-2 transform-gpu active:scale-95 transition-all duration-150 cursor-pointer"
                    >
                      Play Title
                    </Link>
                    <Link
                      href={`/player/${spotlight.slug}`}
                      className="bg-transparent hover:bg-neutral-900 border border-neutral-800 text-white px-5 py-2 rounded font-semibold text-[11px] uppercase tracking-wider transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* 5. Row 2: Sci-Fi & Fantasy */}
            {scifi.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">
                  Blockbuster Sci-Fi
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {scifi.map((movie) => (
                    <div key={movie.id} className="w-[140px] sm:w-[170px] md:w-[190px] shrink-0 snap-start">
                      <MovieCard movie={movie} showTypeBadge={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Row 3: Action hits */}
            {action.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">
                  Action & Adventure
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {action.map((movie) => (
                    <div key={movie.id} className="w-[140px] sm:w-[170px] md:w-[190px] shrink-0 snap-start">
                      <MovieCard movie={movie} showTypeBadge={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Row 4: Popular TV Series */}
            {tvShows.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400">
                  Popular TV Shows
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {tvShows.map((movie) => (
                    <div key={movie.id} className="w-[140px] sm:w-[170px] md:w-[190px] shrink-0 snap-start">
                      <MovieCard movie={movie} showTypeBadge={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </section>
    </main>
  );
}