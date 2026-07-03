// services/search-service.ts
import { Movie } from '@/types/movie';

export async function searchMovies(query: string): Promise<Movie[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}