'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PremiumImage from './PremiumImage';

export interface HeroTitle {
  title: string;
  year?: number;
  rating?: number;
  genres?: string[];
  description?: string;
  backdrop?: string;
  slug: string;
}

interface HeroBannerProps {
  titles: HeroTitle[];
}

export default function HeroBanner({ titles }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile viewport on mount
  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const media = window.matchMedia('(max-width: 768px)');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // Parallax tracking
  useEffect(() => {
    if (isMobile) return;

    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    }

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [titles.length]);

  // Smooth rotation timer
  useEffect(() => {
    if (titles.length <= 1) return;

    const interval = setInterval(() => {
      // Pause if hovered, tab hidden, or search input is focused
      const isHidden = document.hidden;
      const isSearchActive = document.activeElement && 
        document.activeElement.tagName === 'INPUT' && 
        document.activeElement.getAttribute('placeholder')?.toLowerCase().includes('search');

      if (isHovered || isHidden || isSearchActive) {
        return;
      }

      setProgress((p) => {
        if (p >= 100) {
          triggerSlideChange((activeIndex + 1) % titles.length);
          return 0;
        }
        return p + 1.25; // updates every 100ms => ~8s full cycle (100 / (1.25 * 10) = 8s)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeIndex, isHovered, titles.length]);

  function triggerSlideChange(nextIdx: number) {
    setAnimating(true);
    setTimeout(() => {
      setActiveIndex(nextIdx);
      setProgress(0);
      setAnimating(false);
    }, 300); // sync with fade transition duration
  }

  function handleNext() {
    triggerSlideChange((activeIndex + 1) % titles.length);
  }

  function handlePrev() {
    triggerSlideChange((activeIndex - 1 + titles.length) % titles.length);
  }

  if (!titles || titles.length === 0) {
    return (
      <div className="relative min-h-[85vh] bg-[#080808] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const activeTitle = titles[activeIndex];

  // Parallax transform style
  const parallaxStyle = !isMobile
    ? {
        transform: `translate3d(${mousePos.x * -15}px, ${mousePos.y * -15}px, 0) scale(1.04)`,
        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }
    : {};

  return (
    <section
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
      className="relative min-h-[75vh] md:min-h-[90vh] flex items-end justify-start pb-16 md:pb-28 w-full select-none overflow-hidden"
    >
      {/* Background Backdrops Container */}
      <div className="absolute inset-0 z-0 overflow-hidden transform-gpu" style={parallaxStyle}>
        {titles.map((title, index) => {
          const isActive = index === activeIndex;
          const isPreload = index === (activeIndex + 1) % titles.length;
          
          if (!isActive && !isPreload) return null;

          return (
            <div
              key={title.slug}
              className={`absolute inset-0 transition-opacity duration-800 cubic-bezier(0.16, 1, 0.3, 1) transform-gpu ${
                isActive ? 'opacity-70 md:opacity-65 z-10' : 'opacity-0 z-0'
              }`}
            >
              <PremiumImage
                src={title.backdrop || ''}
                type="backdrop"
                title={title.title}
                fill
                priority={isActive || isPreload}
                className="scale-105 filter contrast-[1.05] brightness-[0.85]"
              />
            </div>
          );
        })}

        {/* Ambient Dark Cinematic Gradients & Noise Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/30 to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/5 to-transparent z-20 pointer-events-none" />
        
        {/* Cinematic film noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none z-20" 
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
      </div>

      {/* Floating Manual Navigation Arrows */}
      <div className={`absolute inset-y-0 left-0 items-center justify-center w-16 z-30 hidden md:flex transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer outline-none focus:ring-1 focus:ring-accent"
        >
          ←
        </button>
      </div>
      <div className={`absolute inset-y-0 right-0 items-center justify-center w-16 z-30 hidden md:flex transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer outline-none focus:ring-1 focus:ring-accent"
        >
          →
        </button>
      </div>

      {/* Text Details & Metadata */}
      <div className="relative z-30 max-w-7xl mx-auto px-6 w-full">
        <div className="max-w-xl md:max-w-2xl space-y-4 md:space-y-5">
          {/* Subtle Logo Prefix */}
          <div className={`flex items-center gap-1.5 select-none transition-all duration-700 transform-gpu ${animating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
            <span className="font-display text-[9px] font-extrabold tracking-[0.25em] text-accent">NITROX</span>
            <span className="font-display text-[9px] font-light tracking-[0.35em] text-neutral-400">CINEVERSE PREMIERE</span>
          </div>

          {/* Title */}
          <h1
            className={`font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1] transition-all duration-700 delay-75 transform-gpu ${
              animating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            {activeTitle.title}
          </h1>

          {/* Meta details bar */}
          <div
            className={`flex flex-wrap items-center gap-3 text-xs text-neutral-300 font-semibold transition-all duration-700 delay-150 transform-gpu ${
              animating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            {activeTitle.rating && (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                ★ {activeTitle.rating.toFixed(1)}
              </span>
            )}
            {activeTitle.rating && <span className="w-1 h-1 rounded-full bg-neutral-700" />}
            {activeTitle.year && <span>{activeTitle.year}</span>}
            {activeTitle.year && <span className="w-1 h-1 rounded-full bg-neutral-700" />}
            
            <span className="px-2 py-0.5 text-[9px] font-bold border border-white/20 rounded text-neutral-300 uppercase tracking-widest bg-white/5 backdrop-blur-sm">
              UHD 4K
            </span>

            <span className="px-2 py-0.5 text-[9px] font-bold border border-accent/20 rounded text-accent uppercase tracking-widest bg-accent/5 backdrop-blur-sm">
              Validated Stream
            </span>
          </div>

          {/* Overview Description */}
          {activeTitle.description && (
            <p
              className={`text-neutral-300 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 max-w-xl font-normal transition-all duration-700 delay-200 transform-gpu ${
                animating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
              }`}
            >
              {activeTitle.description}
            </p>
          )}

          {/* Genres Tags list */}
          {activeTitle.genres && activeTitle.genres.length > 0 && (
            <div
              className={`flex flex-wrap gap-1.5 transition-all duration-700 delay-250 transform-gpu ${
                animating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
              }`}
            >
              {activeTitle.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-0.5 text-[10px] rounded-full bg-neutral-900/60 border border-neutral-800/40 text-neutral-400 font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Actions Buttons */}
          <div
            className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 transition-all duration-700 delay-300 transform-gpu ${
              animating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            <Link
              href={`/player/${activeTitle.slug}`}
              className="bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transform-gpu active:scale-95 transition-all duration-150 shadow-lg cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Now
            </Link>
            
            <Link
              href={`/player/${activeTitle.slug}`}
              className="bg-neutral-950/80 hover:bg-neutral-900 backdrop-blur border border-white/10 text-white px-6 py-2.5 rounded font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transform-gpu active:scale-95 transition-all duration-150"
            >
              More Info
            </Link>
          </div>
        </div>
      </div>

      {/* Progress & Slide Count Indicator */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col items-end gap-2">
        {/* Count Label */}
        <span className="text-[10px] font-mono tracking-widest text-neutral-400 bg-black/40 backdrop-blur-sm border border-white/5 px-2.5 py-1 rounded-md">
          {String(activeIndex + 1).padStart(2, '0')} / {String(titles.length).padStart(2, '0')}
        </span>
        
        {/* Animated Progress bar */}
        <div className="w-24 h-[2px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
