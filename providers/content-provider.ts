import { Movie } from "@/types/movie";

export interface ContentProvider {
  search(query: string): Promise<Movie[]>;

  getMovie(slug: string): Promise<Movie | null>;
}