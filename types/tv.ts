export interface Episode {
  episode: number;
  title: string;
  slug: string;
}

export interface Season {
  season: number;
  episodes: Episode[];
}

export interface TVShow {
  id: string;
  title: string;
  slug: string;
  poster?: string;
  backdrop?: string;
  year?: number;
  description?: string;
  genres?: string[];
  rating?: number;
  seasons: Season[];
}

export type TvShow = TVShow;
export type EpisodeInfo = Episode;
export type SeasonInfo = Season;
