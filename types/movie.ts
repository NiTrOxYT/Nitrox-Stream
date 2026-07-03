// lib/types/movie.ts
export interface Movie {
  id: string;          // the numeric key from the API (e.g. "41901")
  title: string;       // movie / show title
  slug: string;        // part of the URL – used for routing (e.g. "avatar-the-last-airbender")
  poster?: string;     // image URL (w92)
  backdrop?: string;   // larger image – optional
  year?: number;       // release year
  description?: string;
  genres?: string[];
  rating?: number;     // IMDb rating (float)
  playerUrl?: string;  // iframe src for the player (if we fetch the detail page)
}