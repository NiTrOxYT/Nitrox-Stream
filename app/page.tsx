"use client";

import { useState } from "react";
import { searchMovies } from "@/services/search-service";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
  setLoading(true);

  try {
    console.log("Searching:", query);

    const result = await searchMovies(query);

    console.log("Result:", result);

    setMovies(result);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="min-h-screen bg-neutral-950 text-white">

      <div className="max-w-5xl mx-auto px-6 py-20">

        <h1 className="text-6xl font-bold text-center">
          Nitrox Stream
        </h1>

        <p className="text-center text-neutral-400 mt-4">
          Search Movies & TV Shows
        </p>

        <div className="flex gap-3 mt-10">

          <input
            className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-5 py-4 outline-none"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button
            onClick={handleSearch}
            className="bg-blue-600 rounded-xl px-8"
          >
            Search
          </button>

        </div>

        {loading && (
          <p className="mt-8 text-neutral-400">
            Searching...
          </p>
        )}

        <p className="text-green-400 mt-6">
  Movies found: {movies.length}
</p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-10">

          {movies.map(movie => (
            <MovieCard
              key={movie.id}
              movie={movie}
            />
          ))}

        </div>

      </div>

    </main>
  );
}