import Link from "next/link";
import { Movie } from "@/types/movie";



interface Props {
  movie: Movie;
}

export default function MovieCard({ movie }: Props) {
  return (
    <Link href={`/player/${movie.slug}`}>

      <div className="bg-neutral-900 rounded-xl overflow-hidden hover:scale-105 transition cursor-pointer">

        <div className="aspect-[2/3] bg-neutral-800" />

        <div className="p-3">

          <h2 className="font-semibold line-clamp-1">
            {movie.title}
          </h2>

          <p className="text-sm text-neutral-400">
            {movie.year}
          </p>

        </div>

      </div>

    </Link>
  );
}