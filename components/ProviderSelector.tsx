'use client';

import { useState, useEffect, useRef } from 'react';

export interface Provider {
  id: string;
  name: string;
  playerUrl: string;
  validated: boolean;
  responseTime: number;
  priority: number;
}

interface ProviderSelectorProps {
  providers: Provider[];
  currentUrl: string;
  onSelect: (provider: Provider) => void;
}

export default function ProviderSelector({ providers, currentUrl, onSelect }: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!providers || providers.length <= 1) {
    return null;
  }

  function getSpeedLabel(responseTime: number): string {
    if (responseTime < 200) return 'Fastest';
    if (responseTime < 350) return 'Stable';
    if (responseTime < 500) return 'Backup';
    return 'Experimental';
  }

  return (
    <div className="absolute top-4 right-4 z-30" ref={containerRef}>
      {/* Server trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#101010]/80 hover:bg-[#161616]/95 backdrop-blur-md border border-white/10 text-white/90 text-[10px] font-bold uppercase tracking-wider shadow-lg hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer outline-none focus:ring-1 focus:ring-accent"
      >
        <span className="text-accent animate-pulse">⚡</span>
        Server
      </button>

      {/* Floating Menu dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0d0d0d]/90 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl p-2.5 transition-all duration-200 transform origin-top-right transform-gpu animate-[fadeIn_0.2s_ease-out]"
        >
          <div className="text-[9px] font-bold tracking-[0.2em] text-neutral-500 uppercase px-3 py-1.5 mb-1.5 border-b border-white/5">
            Available Servers
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto premium-scrollbar">
            {providers.map((prov) => {
              const isCurrent = prov.playerUrl === currentUrl;
              const label = getSpeedLabel(prov.responseTime);

              return (
                <button
                  key={prov.id}
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => {
                    onSelect(prov);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer outline-none group border ${
                    isCurrent
                      ? 'bg-white/5 border-white/10 text-white'
                      : 'border-transparent hover:bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-xs font-bold tracking-tight">{prov.name}</span>
                    </div>
                    <span className="text-[9px] font-semibold text-neutral-500 mt-1 ml-3.5">
                      {label} &middot; {prov.responseTime} ms
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="text-[9px] font-bold tracking-widest text-accent uppercase flex items-center gap-1">
                      <span>✓</span>
                      <span>Current</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
