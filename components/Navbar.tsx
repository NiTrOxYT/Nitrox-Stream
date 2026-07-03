"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchMovies } from "@/services/search-service";
import { Movie } from "@/types/movie";
import MovieCard from "./MovieCard";

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Toggle search shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

  // Debounced search trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMovies(query);
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[64px] bg-[#080808]/75 backdrop-blur-md border-b border-neutral-900/30 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 outline-none group">
            <span className="font-display text-xl font-bold tracking-[0.15em] text-white group-hover:text-accent transition-colors duration-200">
              NITROX
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-xs font-semibold tracking-widest uppercase text-neutral-400 hover:text-white transition-colors duration-200">
              HOME
            </Link>
            <button 
              onClick={() => { setSearchOpen(true); }}
              className="text-xs font-semibold tracking-widest uppercase text-neutral-400 hover:text-white transition-colors duration-200"
            >
              MOVIES
            </button>
            <button 
              onClick={() => { setSearchOpen(true); }}
              className="text-xs font-semibold tracking-widest uppercase text-neutral-400 hover:text-white transition-colors duration-200"
            >
              TV SHOWS
            </button>
          </nav>

          {/* Action button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/40 text-neutral-400 hover:text-white transition-all duration-200 outline-none"
              title="Search (Cmd+K or /)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Search Overlay */}
      {searchOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 bg-[#080808]/98 backdrop-blur-2xl overflow-y-auto pt-24 px-6 pb-20 transition-all duration-300 transform-gpu"
        >
          <div className="max-w-5xl mx-auto">
            {/* Header / Input controls */}
            <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex-1 flex items-center gap-3">
                <svg className="w-5 h-5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type titles, years, genres..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xl font-display text-white placeholder-neutral-500 font-medium"
                />
              </div>

              {/* Close button */}
              <button
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider"
              >
                Close <span className="text-[10px] bg-neutral-800 px-1 py-0.5 rounded text-neutral-500">ESC</span>
              </button>
            </div>

            {/* Results section */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6 mt-12">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse aspect-[2/3] rounded-md bg-[#101010]" />
                ))}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="mt-12">
                <p className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-6">
                  Search Results ({results.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                  {results.map((movie) => (
                    <div key={movie.id} onClick={() => setSearchOpen(false)}>
                      <MovieCard movie={movie} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <div className="text-center py-20">
                <p className="text-neutral-500 text-sm font-medium">No titles found for &ldquo;{query}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
