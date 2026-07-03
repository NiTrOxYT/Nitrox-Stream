"use client";

import Link from "next/link";
import { Movie } from "@/types/movie";
import PremiumImage from "./PremiumImage";

interface Props {
  movie: Movie;
  showTypeBadge?: boolean;
  isRecommendation?: boolean;
}

export default function MovieCard({ movie, showTypeBadge = true, isRecommendation = false }: Props) {
  const href = movie.type === 'tv' ? `/tv/${movie.slug}` : `/player/${movie.slug}`;

  // Image type parameter for TMDB size mapping
  const imageType = isRecommendation ? 'recommendation' : 'poster';

  return (
    <Link 
      href={href} 
      className="group relative block w-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md transition-transform duration-200"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-[#101010] shadow-sm transform-gpu transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] group-hover:-translate-y-1 group-hover:rotate-[0.6deg] group-hover:shadow-[0_12px_24px_rgba(229,9,20,0.12)]">
        
        {/* Optimized Premium Image */}
        <PremiumImage
          src={movie.poster}
          type={imageType}
          title={movie.title}
          fallbackShowBackdrop={movie.backdrop}
          fallbackMoviePoster={movie.poster}
          fill
          className="group-hover:opacity-40 transition-opacity duration-300"
        />

        {/* Top Badges (always visible) */}
        <div className="absolute top-2 left-2 right-2 flex justify-between pointer-events-none z-10">
          {showTypeBadge && (
            <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-black/60 backdrop-blur-md text-neutral-300 border border-neutral-800/40">
              {movie.type === 'tv' ? 'TV' : 'Movie'}
            </span>
          )}
          {movie.rating && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 backdrop-blur-md text-amber-400 border border-amber-500/30 ml-auto">
              ★ {movie.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Play Icon Fade Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Content Details Overlay (fades in on hover) */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-[#080808]/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-10">
          <h3 className="font-display font-bold text-xs text-white tracking-tight leading-snug line-clamp-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            {movie.title}
          </h3>
          
          <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] delay-75">
            {movie.year && <span>{movie.year}</span>}
            {movie.year && <span className="w-1 h-1 rounded-full bg-neutral-600" />}
            <span>{movie.type || 'movie'}</span>
          </div>
        </div>

      </div>
    </Link>
  );
}
