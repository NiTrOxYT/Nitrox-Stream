"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchMovies } from "@/services/search-service";
import { Movie } from "@/types/movie";
import PremiumImage from "./PremiumImage";

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const router = useRouter();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nitrox_recent_searches");
      if (stored) {
        try {
          setRecent(JSON.parse(stored));
        } catch {
          setRecent([]);
        }
      }
    }
  }, [searchOpen]);

  // Save to recent searches
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const cleanTerm = term.trim();
    const updated = [cleanTerm, ...recent.filter((t) => t !== cleanTerm)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("nitrox_recent_searches", JSON.stringify(updated));
  };

  const clearRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecent([]);
    localStorage.removeItem("nitrox_recent_searches");
  };

  // Toggle search shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keyboard navigation inside search results
  useEffect(() => {
    if (!searchOpen) return;

    function handleNav(e: KeyboardEvent) {
      if (results.length === 0) return;
      
      const cols = 5; // 5-column grid layout on desktop
      
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusIdx((prev) => (prev + 1) % results.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusIdx((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((prev) => {
          if (prev === -1) return 0;
          const next = prev + cols;
          return next < results.length ? next : prev;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((prev) => {
          const next = prev - cols;
          return next >= 0 ? next : prev;
        });
      } else if (e.key === "Enter") {
        if (focusIdx >= 0 && focusIdx < results.length) {
          e.preventDefault();
          const targetMovie = results[focusIdx];
          saveRecentSearch(query);
          setSearchOpen(false);
          const href = targetMovie.type === "tv" ? `/tv/${targetMovie.slug}` : `/player/${targetMovie.slug}`;
          router.push(href);
        }
      }
    }

    window.addEventListener("keydown", handleNav);
    return () => window.removeEventListener("keydown", handleNav);
  }, [searchOpen, results, focusIdx, query, router]);

  // Focus inputs
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
      document.body.style.overflow = "hidden";
      setFocusIdx(-1);
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
      setFocusIdx(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMovies(query);
        setResults(data);
        setFocusIdx(-1);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  // Highlight matches in search results
  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="text-accent font-semibold">{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-[56px] bg-[#080808]/75 backdrop-blur-md border-b border-neutral-900/10 z-40">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          
          {/* Logo Brand Treatment */}
          <Link href="/" className="flex items-center gap-2 outline-none group select-none">
            <span className="font-display text-sm font-black tracking-[0.3em] text-white group-hover:text-accent transition-colors duration-200">
              NITROX
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 hover:text-white transition-colors duration-200">
              HOME
            </Link>
            <button 
              onClick={() => setSearchOpen(true)}
              className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 hover:text-white transition-colors duration-200 cursor-pointer outline-none"
            >
              MOVIES
            </button>
            <button 
              onClick={() => setSearchOpen(true)}
              className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 hover:text-white transition-colors duration-200 cursor-pointer outline-none"
            >
              TV SHOWS
            </button>
          </nav>

          {/* Search Trigger Icon */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800/40 text-neutral-400 hover:text-white transition-all duration-150 outline-none cursor-pointer"
              title="Search (Cmd+K or /)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Spotlight Command Palette Overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#080808]/90 backdrop-blur-2xl flex items-start justify-center pt-20 px-4 pb-12 overflow-y-auto animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setSearchOpen(false)}
        >
          {/* Main Raycast / Spotlight Panel */}
          <div
            className="w-full max-w-3xl bg-[#101010] border border-neutral-800/60 rounded-xl shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transform-gpu animate-[scaleIn_0.18s_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Row */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-900">
              <svg className="w-4 h-4 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search movies, TV shows, and series..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm font-medium text-white placeholder-neutral-500"
              />
              <span className="text-[10px] font-bold bg-neutral-900 border border-neutral-800 px-2 py-1 rounded text-neutral-500 select-none">
                ESC
              </span>
            </div>

            {/* Content Display Viewport */}
            <div className="max-h-[50vh] overflow-y-auto premium-scrollbar p-5">
              
              {/* Skeletons Loading View */}
              {loading && (
                <div className="space-y-4">
                  <div className="h-3 w-24 bg-neutral-900 animate-pulse rounded" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="aspect-[2/3] w-full bg-neutral-900 animate-pulse rounded-md" />
                    ))}
                  </div>
                </div>
              )}

              {/* Default Empty View: Recent Searches & Shortcuts */}
              {!loading && !query.trim() && (
                <div className="space-y-6">
                  {recent.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                          Recent Searches
                        </h4>
                        <button
                          onClick={clearRecent}
                          className="text-[10px] font-bold text-neutral-600 hover:text-accent transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {recent.map((term) => (
                          <button
                            key={term}
                            onClick={() => setQuery(term)}
                            className="px-3 py-1.5 text-xs font-medium rounded-full bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800/40 text-neutral-300 transition-colors cursor-pointer outline-none"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                      Spotlight Shortcuts
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-400">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/40 border border-neutral-900">
                        <span>Navigate Results</span>
                        <div className="flex gap-1 font-mono text-[10px] text-neutral-600">
                          <span className="bg-neutral-900 border border-neutral-800 px-1 py-0.5 rounded">↑</span>
                          <span className="bg-neutral-900 border border-neutral-800 px-1 py-0.5 rounded">↓</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/40 border border-neutral-900">
                        <span>Play / Select</span>
                        <span className="bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-neutral-600">ENTER</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results Display Grid */}
              {!loading && results.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                    Titles Found
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {results.map((movie, idx) => {
                      const isFocused = idx === focusIdx;
                      const href = movie.type === "tv" ? `/tv/${movie.slug}` : `/player/${movie.slug}`;
                      
                      return (
                        <div
                          key={movie.id}
                          onClick={() => {
                            saveRecentSearch(query);
                            setSearchOpen(false);
                            router.push(href);
                          }}
                          onMouseEnter={() => setFocusIdx(idx)}
                          className={`group cursor-pointer rounded-md overflow-hidden bg-neutral-950 border transition-all duration-150 transform-gpu relative ${
                            isFocused
                              ? "border-accent scale-[1.03] shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
                              : "border-neutral-900 hover:border-neutral-800"
                          }`}
                        >
                          {/* Image Box */}
                          <div className="relative aspect-[2/3] w-full bg-[#101010]">
                            <PremiumImage
                              src={movie.poster}
                              type="search"
                              title={movie.title}
                            />
                            {/* Focus overlay */}
                            {isFocused && (
                              <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
                            )}
                          </div>

                          {/* Details strip */}
                          <div className="p-2.5 space-y-1">
                            <h5 className="font-display font-bold text-[11px] leading-tight text-white line-clamp-1">
                              {highlightMatch(movie.title, query)}
                            </h5>
                            <div className="flex items-center justify-between text-[9px] text-neutral-500 font-semibold uppercase tracking-wider">
                              <span>{movie.year || "N/A"}</span>
                              <span>{movie.type === "tv" ? "TV" : "Movie"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Query Not Found State */}
              {!loading && query.trim() && results.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <div className="text-neutral-600 text-xl font-semibold font-display">No Results</div>
                  <p className="text-neutral-500 text-xs font-normal">
                    We couldn&rsquo;t find anything matching &ldquo;{query}&rdquo;.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
