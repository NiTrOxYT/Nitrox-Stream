import Link from "next/link";
import { Movie } from "@/types/movie";

interface Props {
  movie: Movie;
}

export default function MovieCard({ movie }: Props) {
  const href = movie.type === 'tv' ? `/tv/${movie.slug}` : `/player/${movie.slug}`;

  return (
    <Link href={href}>
      <div className="bg-neutral-900 rounded-xl overflow-hidden hover:scale-105 transition cursor-pointer relative">
        {movie.type === 'tv' && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-xs font-semibold bg-blue-600 rounded">
            TV
          </span>
        )}
        <div className="aspect-[2/3] bg-neutral-800" />
        <div className="p-3">
          <h2 className="font-semibold line-clamp-1">{movie.title}</h2>
          <p className="text-sm text-neutral-400">{movie.year}</p>
        </div>
      </div>
    </Link>
  );
}
