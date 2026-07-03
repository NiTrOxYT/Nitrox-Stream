import Link from "next/link";
import { Movie } from "@/types/movie";

interface Props {
  movie: Movie;
  showTypeBadge?: boolean;
}

export default function MovieCard({ movie, showTypeBadge = true }: Props) {
  const href = movie.type === 'tv' ? `/tv/${movie.slug}` : `/player/${movie.slug}`;

  // Build a nice fallback text class if no poster
  const hasPoster = !!movie.poster;

  return (
    <Link href={href} className="group relative block w-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md transition-transform duration-200">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-[#101010] shadow-sm transform-gpu transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:-translate-y-1.5 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.5)]">
        
        {/* Poster Image */}
        {hasPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.poster}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-40"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-end p-4 bg-gradient-to-t from-neutral-900 via-neutral-950 to-neutral-900">
            <div className="text-neutral-500 font-mono text-xs uppercase tracking-wider mb-2">
              {movie.type || 'movie'}
            </div>
            <h3 className="font-semibold text-white tracking-tight line-clamp-3">
              {movie.title}
            </h3>
          </div>
        )}

        {/* Badges on top (always visible, top row) */}
        <div className="absolute top-2 left-2 right-2 flex justify-between pointer-events-none z-10">
          {showTypeBadge && (
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-black/60 backdrop-blur-md text-neutral-300 border border-neutral-800">
              {movie.type === 'tv' ? 'TV' : 'Movie'}
            </span>
          )}
          {movie.rating && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 backdrop-blur-md text-amber-400 border border-amber-500/30 ml-auto">
              ★ {movie.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Content Overlay (fades in on hover) */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-[#080808] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <h3 className="font-medium text-sm text-white tracking-tight leading-snug line-clamp-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            {movie.title}
          </h3>
          
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-400 font-medium transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] delay-75">
            {movie.year && <span>{movie.year}</span>}
            {movie.year && <span className="w-1 h-1 rounded-full bg-neutral-600" />}
            <span className="capitalize">{movie.type || 'movie'}</span>
          </div>
        </div>

      </div>
    </Link>
  );
}
