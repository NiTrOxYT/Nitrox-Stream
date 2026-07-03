import type { Movie } from './movie';
import type { TVShow, Season } from './tv';

export interface EmbedSource {
  key: string;
  name: string;
  url: string;
}

export interface AjaxResponse {
  embed_url?: string;
  type?: string;
}

export interface MovieSourceResponse {
  movie: {
    title: string;
    year?: number;
    poster?: string;
    backdrop?: string;
    genres?: string[];
    description?: string;
    rating?: number;
  };
  providerUrl: string;
  playerUrl: string;
}

export interface EpisodeSourceResponse {
  slug: string;
  postId: number;
  playerUrl: string;
}
