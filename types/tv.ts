export interface EpisodeInfo {
  episode: number;
  title: string;
  slug: string;
}

export interface SeasonInfo {
  season: number;
  episodes: EpisodeInfo[];
}

export interface TvShow {
  id: string;
  title: string;
  slug: string;
  poster?: string;
  backdrop?: string;
  year?: number;
  description?: string;
  genres?: string[];
  rating?: number;
  seasons: SeasonInfo[];
}
