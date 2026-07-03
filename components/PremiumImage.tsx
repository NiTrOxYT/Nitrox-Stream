"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { getOptimizedImageUrl, ImageType } from "@/lib/image-utils";

interface PremiumImageProps extends Omit<ImageProps, 'src' | 'onError' | 'alt'> {
  src?: string;
  alt?: string;
  type?: ImageType;
  title?: string;
  fallbackStill?: string;
  fallbackSeasonPoster?: string;
  fallbackShowBackdrop?: string;
  fallbackMoviePoster?: string;
}

export default function PremiumImage({
  src,
  type = 'poster',
  title = '',
  fallbackStill,
  fallbackSeasonPoster,
  fallbackShowBackdrop,
  fallbackMoviePoster,
  alt = '',
  className = '',
  fill,
  sizes,
  ...props
}: PremiumImageProps) {
  // Ordered sequence of fallback URLs
  const [fallbackList, setFallbackList] = useState<string[]>([]);
  const [fallbackIdx, setFallbackIdx] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const list: string[] = [];
    
    if (src) list.push(getOptimizedImageUrl(src, type));
    if (fallbackStill) list.push(getOptimizedImageUrl(fallbackStill, 'still'));
    if (fallbackSeasonPoster) list.push(getOptimizedImageUrl(fallbackSeasonPoster, 'poster'));
    if (fallbackShowBackdrop) list.push(getOptimizedImageUrl(fallbackShowBackdrop, 'backdrop'));
    if (fallbackMoviePoster) list.push(getOptimizedImageUrl(fallbackMoviePoster, 'poster'));
    
    // De-duplicate items
    const uniqueList = Array.from(new Set(list));
    
    setFallbackList(uniqueList);
    setFallbackIdx(0);
    setHasError(uniqueList.length === 0);
  }, [src, type, fallbackStill, fallbackSeasonPoster, fallbackShowBackdrop, fallbackMoviePoster]);

  const currentUrl = fallbackList[fallbackIdx];

  const handleImageError = () => {
    if (fallbackIdx + 1 < fallbackList.length) {
      setFallbackIdx(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  if (hasError || !currentUrl) {
    // Premium branded placeholder card
    return (
      <div className={`relative flex flex-col justify-end p-4 bg-gradient-to-tr from-[#101010] via-[#080808] to-[#161616] overflow-hidden rounded-md border border-neutral-900/60 ${className} ${fill ? 'w-full h-full absolute inset-0' : 'w-full h-full'}`}>
        {/* Subtle mesh style background decoration */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.06),transparent_60%)] pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          {/* Custom movie reel symbol */}
          <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-500 block">
            {type === 'still' ? 'EPISODE STILL' : type.toUpperCase()}
          </span>
          <h4 className="font-display font-semibold text-xs text-neutral-300 tracking-tight leading-tight line-clamp-3">
            {title || "Asset Not Available"}
          </h4>
        </div>
      </div>
    );
  }

  // Common sizes config for lazy-loading responsiveness
  const defaultSizes = fill ? (sizes || "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw") : undefined;

  return (
    <Image
      src={currentUrl}
      alt={alt || title || "Movie asset"}
      onError={handleImageError}
      className={`object-cover transition-opacity duration-300 ${className}`}
      fill={fill}
      sizes={defaultSizes}
      unoptimized // TMDB CDN handles compression, next/image handles layouts
      {...props}
    />
  );
}
