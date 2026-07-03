"use client";

import { useEffect, useState } from "react";
import { searchMovies } from "@/services/search-service";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";
import Link from "next/link";

interface FeaturedMovie {
  title: string;
  year?: number;
  rating?: number;
  genres?: string[];
  description?: string;
  backdrop?: string;
  slug: string;
}

export default function HomePage() {
  // Hero Movie State
  const [featured, setFeatured] = useState<FeaturedMovie>({
    title: "Avatar: The Way of Water",
    year: 2022,
    rating: 7.6,
    genres: ["Action", "Adventure", "Sci-Fi"],
    description: "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Na'vi race to protect their home.",
    backdrop: "https://image.tmdb.org/t/p/original/ytdebEE0ndYLSTEctPgh8e0vaBs.jpg",
    slug: "avatar-the-way-of-water",
  });

  // Movie rows state
  const [trending, setTrending] = useState<Movie[]>([]);
  const [scifi, setScifi] = useState<Movie[]>([]);
  const [action, setAction] = useState<Movie[]>([]);
  const [tvShows, setTvShows] = useState<Movie[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        // Fetch in parallel using the existing searchMovies service
        const [resTrending, resScifi, resAction, resTv] = await Promise.all([
          searchMovies("avatar").catch(() => []),
          searchMovies("star").catch(() => []),
          searchMovies("marvel").catch(() => []),
          searchMovies("the").catch(() => []),
        ]);

        setTrending(resTrending.slice(0, 10));
        setScifi(resScifi.slice(0, 10));
        setAction(resAction.slice(0, 10));
        setTvShows(resTv.filter(m => m.type === "tv").slice(0, 10));

        // Dynamically grab first available movie details to set as featured backdrop if possible
        if (resTrending.length > 0) {
          const firstMovie = resTrending[0];
          const detailRes = await fetch(`/api/movie-source?slug=${encodeURIComponent(firstMovie.slug)}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData.movie) {
              setFeatured({
                title: detailData.movie.title,
                year: detailData.movie.year,
                rating: detailData.movie.rating || 7.8,
                genres: detailData.movie.genres || ["Sci-Fi", "Adventure"],
                description: detailData.movie.description,
                backdrop: detailData.movie.poster || firstMovie.poster, // fall back to poster
                slug: firstMovie.slug,
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
    <main className="min-h-screen bg-[#080808] text-white overflow-hidden pb-24">
      {/* Cinematic Hero */}
      <section className="relative min-h-[80vh] md:min-h-[90vh] flex items-end justify-start pb-16 md:pb-24 w-full">
        {/* Backdrop Visual */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featured.backdrop || "https://image.tmdb.org/t/p/original/ytdebEE0ndYLSTEctPgh8e0vaBs.jpg"}
            alt={featured.title}
            className="w-full h-full object-cover object-center opacity-75 transform-gpu scale-100 transition-opacity duration-1000"
          />
          {/* Dark gradients framing the hero */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/10 to-transparent" />
        </div>

        {/* Hero Metadata & Title Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl">
            {/* Tagline/Type Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-[0.2em] uppercase rounded bg-accent/20 text-accent border border-accent/30 mb-4">
              Featured Movie
            </span>

            {/* Title */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-4 leading-[1.1] max-w-xl">
              {featured.title}
            </h1>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-neutral-300 font-medium mb-4">
              {featured.rating && (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  ★ {featured.rating.toFixed(1)}
                </span>
              )}
              {featured.rating && <span className="w-1 h-1 rounded-full bg-neutral-600" />}
              {featured.year && <span>{featured.year}</span>}
              {featured.year && <span className="w-1 h-1 rounded-full bg-neutral-600" />}
              <span className="px-1.5 py-0.2 text-[10px] font-bold border border-neutral-700 rounded text-neutral-400">
                4K Ultra HD
              </span>
            </div>

            {/* Genres */}
            {featured.genres && featured.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {featured.genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs bg-neutral-900/60 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-800/40 text-neutral-300"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {featured.description && (
              <p className="text-neutral-300 text-sm md:text-base leading-relaxed mb-8 line-clamp-3 max-w-lg font-normal">
                {featured.description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={`/player/${featured.slug}`}
                className="bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded font-semibold text-sm flex items-center gap-2 transform-gpu active:scale-95 transition-all duration-150 shadow-lg"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play Movie
              </Link>
              
              <Link
                href={`/player/${featured.slug}`}
                className="bg-neutral-800/80 hover:bg-neutral-700/85 backdrop-blur text-white px-6 py-2.5 rounded font-semibold text-sm flex items-center gap-2 transform-gpu active:scale-95 transition-all duration-150 border border-neutral-700/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                More Info
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Rows */}
      <section className="max-w-7xl mx-auto px-6 space-y-12 -mt-10 relative z-20">
        
        {/* Loading Indicator */}
        {loading && (
          <div className="space-y-12">
            {[...Array(3)].map((_, r) => (
              <div key={r} className="space-y-4">
                <div className="h-4 w-40 bg-[#101010] animate-pulse rounded" />
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] w-[180px] shrink-0 rounded bg-[#101010] animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* Row 1: Trending Now */}
            {trending.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">
                  Trending Now
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {trending.map((movie) => (
                    <div key={movie.id} className="w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start">
                      <MovieCard movie={movie} showTypeBadge={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 2: Blockbuster Sci-Fi */}
            {scifi.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">
                  Blockbuster Sci-Fi
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {scifi.map((movie) => (
                    <div key={movie.id} className="w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start">
                      <MovieCard movie={movie} showTypeBadge={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 3: Action Hits */}
            {action.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">
                  Action & Adventure
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {action.map((movie) => (
                    <div key={movie.id} className="w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start">
                      <MovieCard movie={movie} showTypeBadge={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 4: TV Series */}
            {tvShows.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">
                  Popular TV Shows
                </h2>
                <div className="flex gap-4 overflow-x-auto premium-scrollbar pb-4 snap-x snap-mandatory">
                  {tvShows.map((movie) => (
                    <div key={movie.id} className="w-[150px] sm:w-[180px] md:w-[200px] shrink-0 snap-start">
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